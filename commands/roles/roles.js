import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('roles')
    .setDescription('List all roles in the server'),
  category: 'roles',
  async execute(interaction) {
    const roles = interaction.guild.roles.cache.sort((a, b) => b.position - a.position).filter(r => r.id !== interaction.guild.roles.everyone.id);
    const embed = createEmbed({
      title: `${config.emoji.list || '📋'} Server Roles (${roles.size})`,
      description: roles.map(r => `${r})`).join('\n').slice(0, 4000) || 'No roles.',
      color: config.colors.blurple,
    });
    await interaction.reply({ embeds: [embed] });
  },
};
