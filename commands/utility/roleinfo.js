import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Get role information')
    .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true)),
  async execute(interaction) {
    const role = interaction.options.getRole('role');

    const embed = createEmbed({
      title: role.name,
      color: role.hexColor || '#000000',
      fields: [
        { name: 'ID', value: role.id, inline: true },
        { name: 'Color', value: role.hexColor.toUpperCase(), inline: true },
        { name: 'Position', value: String(role.position), inline: true },
        { name: 'Members', value: String(role.members.size), inline: true },
        { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
        { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
        { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>` },
      ],
    });

    await interaction.reply({ embeds: [embed] });
  },
};
