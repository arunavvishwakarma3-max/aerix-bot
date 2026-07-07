import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';
import axios from 'axios';

export default {
  data: new SlashCommandBuilder()
    .setName('github')
    .setDescription('Get GitHub repository information')
    .addStringOption(opt => opt.setName('repo').setDescription('Repository (e.g., owner/repo)').setRequired(true)),
  category: 'info',
  async execute(interaction) {
    const repo = interaction.options.getString('repo');
    await interaction.deferReply();
    try {
      const { data } = await axios.get(`https://api.github.com/repos/${repo}`);
      const embed = createEmbed({
        title: `${config.emoji.github} ${data.full_name}`,
        url: data.html_url,
        description: data.description || 'No description',
        color: config.colors.blurple,
        thumbnail: data.owner?.avatar_url,
        fields: [
          { name: 'Stars', value: `⭐ ${data.stargazers_count?.toLocaleString() || 0}`, inline: true },
          { name: 'Forks', value: `🍴 ${data.forks_count?.toLocaleString() || 0}`, inline: true },
          { name: 'Issues', value: `⚠️ ${data.open_issues_count || 0}`, inline: true },
          { name: 'Language', value: data.language || 'N/A', inline: true },
          { name: 'License', value: data.license?.spdx_id || 'N/A', inline: true },
          { name: 'Watchers', value: `👁️ ${data.subscribers_count || 0}`, inline: true },
        ],
        footer: `Created: ${new Date(data.created_at).toLocaleDateString()}`,
      });
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({ embeds: [createEmbed({ color: config.colors.error, description: `${config.emoji.cross} Repository not found.` })] });
    }
  },
};
