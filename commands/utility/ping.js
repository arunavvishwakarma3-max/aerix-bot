import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),
  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const wsPing = interaction.client.ws.ping;
    const apiPing = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(`🏓 **Pong!**\nAPI Latency: **${apiPing}ms**\nWebSocket: **${wsPing}ms**`);
  },
};
