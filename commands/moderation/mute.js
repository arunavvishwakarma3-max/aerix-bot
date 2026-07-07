import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a member')
    .addUserOption(opt => opt.setName('user').setDescription('User to mute').setRequired(true))
    .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(true).setMinValue(1))
    .addStringOption(opt => opt.setName('reason').setDescription('Mute reason')),
  permissions: [PermissionsBitField.Flags.ModerateMembers],
  botPermissions: [PermissionsBitField.Flags.ModerateMembers],
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = interaction.guild.members.cache.get(user.id);
    if (!member) return interaction.reply({ content: 'User not in server.', ephemeral: true });

    await member.timeout(duration * 60 * 1000, reason);

    const embed = createEmbed({
      title: 'Member Muted',
      color: config.colors.warning,
      fields: [
        { name: 'User', value: user.tag, inline: true },
        { name: 'Duration', value: `${duration} minute(s)`, inline: true },
        { name: 'Reason', value: reason },
      ],
    });

    await interaction.reply({ embeds: [embed] });
  },
};
