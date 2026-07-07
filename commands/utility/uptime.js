import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Check bot uptime'),
  async execute(interaction) {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const embed = createEmbed({
      title: 'Bot Uptime',
      description: `🟢 **${days}d ${hours}h ${minutes}m ${seconds}s**`,
      color: config.colors.success,
      fields: [
        { name: 'Started', value: `<t:${Math.floor(Date.now() / 1000 - uptime)}:R>`, inline: true },
        { name: 'Ping', value: `${interaction.client.ws.ping}ms`, inline: true },
      ],
    });

    await interaction.reply({ embeds: [embed] });
  },
};
