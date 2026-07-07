import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import User from '../../models/User.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption(opt => opt.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Warning reason').setRequired(true)),
  permissions: [PermissionsBitField.Flags.ModerateMembers],
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    let userData = await User.findOne({ userId: user.id, guildId: interaction.guild.id });
    if (!userData) userData = new User({ userId: user.id, guildId: interaction.guild.id });

    userData.warnings.push({
      moderatorId: interaction.user.id,
      reason,
      date: new Date(),
      active: true,
    });

    await userData.save();

    const embed = createEmbed({
      title: 'Member Warned',
      color: config.colors.warning,
      fields: [
        { name: 'User', value: user.tag, inline: true },
        { name: 'Warnings', value: String(userData.warnings.filter(w => w.active).length), inline: true },
        { name: 'Reason', value: reason },
      ],
    });

    await interaction.reply({ embeds: [embed] });
    try {
      await user.send(`You were warned in **${interaction.guild.name}**: ${reason}`);
    } catch {}
  },
};
