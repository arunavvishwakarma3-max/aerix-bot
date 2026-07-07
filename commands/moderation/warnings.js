import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import User from '../../models/User.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a user')
    .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(true)),
  permissions: [PermissionsBitField.Flags.ModerateMembers],
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const userData = await User.findOne({ userId: user.id, guildId: interaction.guild.id });

    if (!userData?.warnings?.length) {
      return interaction.reply({ content: `${user.tag} has no warnings.`, ephemeral: true });
    }

    const active = userData.warnings.filter(w => w.active);
    const fields = active.map((w, i) => ({
      name: `Warning #${i + 1}`,
      value: `**Reason:** ${w.reason}\n**Moderator:** <@${w.moderatorId}>\n**Date:** <t:${Math.floor(new Date(w.date).getTime() / 1000)}:R>`,
      inline: true,
    }));

    const embed = createEmbed({
      title: `Warnings for ${user.tag}`,
      description: `Total active warnings: ${active.length}`,
      fields,
      color: config.colors.warning,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
