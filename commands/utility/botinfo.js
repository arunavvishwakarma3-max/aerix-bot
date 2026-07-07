import { SlashCommandBuilder, version } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';
import os from 'node:os';

export default {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('View detailed bot information and statistics'),
  category: 'utility',
  async execute(interaction, client) {
    const totalUsers = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    const totalChannels = client.guilds.cache.reduce((a, g) => a + g.channels.cache.size, 0);
    const totalCategories = [...new Set(client.commands.map(c => c.category || 'other'))].length;
    const uptimeDays = Math.floor(client.uptime / 86400000);
    const uptimeHours = Math.floor((client.uptime % 86400000) / 3600000);
    const uptimeMins = Math.floor((client.uptime % 3600000) / 60000);
    const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

    const embed = createEmbed({
      title: `${client.user.username} — Premium Bot`,
      thumbnail: client.user.displayAvatarURL({ size: 4096 }),
      color: config.colors.blurple,
      fields: [
        { name: 'General', value: [
          `**Developer:** <@${config.ownerId || 'Unknown'}>`,
          `**Library:** discord.js v${version}`,
          `**Node.js:** ${process.version}`,
          `**Platform:** ${os.platform()} ${os.release()}`,
        ].join('\n'), inline: false },
        { name: 'Statistics', value: [
          `**Servers:** ${client.guilds.cache.size.toLocaleString()}`,
          `**Users:** ${totalUsers.toLocaleString()}`,
          `**Channels:** ${totalChannels.toLocaleString()}`,
          `**Commands:** ${client.commands.size} (${totalCategories} categories)`,
        ].join('\n'), inline: true },
        { name: 'System', value: [
          `**Uptime:** ${uptimeDays}d ${uptimeHours}h ${uptimeMins}m`,
          `**RAM Usage:** ${memoryUsage} MB`,
          `**CPU:** ${os.cpus()[0]?.model || 'Unknown'}`,
          `**Ping:** ${client.ws.ping}ms`,
        ].join('\n'), inline: true },
      ],
      footer: `ID: ${client.user.id}`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
