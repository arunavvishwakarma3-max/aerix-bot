import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('joinroles')
    .setDescription('View and toggle self-assignable roles'),
  category: 'roles',
  async execute(interaction) {
    const roles = interaction.guild.roles.cache.sort((a, b) => b.position - a.position).filter(r => r.id !== interaction.guild.roles.everyone.id && !r.managed).first(25);
    if (!roles.length) return interaction.reply({ embeds: [createEmbed({ color: config.colors.info, description: `${config.emoji.info || 'ℹ️'} No roles available.` })] });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('joinroles-select')
      .setPlaceholder('Select a role to toggle')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(roles.map(r => ({
        label: r.name,
        value: r.id,
        description: `${r.members.size} members`,
        emoji: r.unicodeEmoji || undefined,
      })));

    const row = new ActionRowBuilder().addComponents(selectMenu);
    await interaction.reply({ embeds: [createEmbed({ title: `${config.emoji.list || '📋'} Self-Assignable Roles`, description: 'Select a role to add or remove it from yourself.', color: config.colors.blurple })], components: [row] });
  },
};
