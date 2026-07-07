import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';
import axios from 'axios';

export default {
  data: new SlashCommandBuilder()
    .setName('crypto')
    .setDescription('Get cryptocurrency price')
    .addStringOption(opt => opt.setName('coin').setDescription('Coin symbol (e.g., BTC, ETH)').setRequired(true)),
  category: 'info',
  async execute(interaction) {
    const coin = interaction.options.getString('coin').toUpperCase();
    await interaction.deferReply();
    try {
      const { data } = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd&include_24hr_change=true`);
      const info = data[coin.toLowerCase()];
      if (!info) return interaction.editReply({ embeds: [createEmbed({ color: config.colors.error, description: `${config.emoji.cross} Coin not found.` })] });
      const change = info.usd_24h_change;
      const changeStr = change >= 0 ? `📈 +${change.toFixed(2)}%` : `📉 ${change.toFixed(2)}%`;
      const embed = createEmbed({
        title: `${config.emoji.info} ${coin} Price`,
        description: `**$${info.usd?.toLocaleString() || 'N/A'}**`,
        color: change >= 0 ? config.colors.success : config.colors.error,
        fields: [
          { name: '24h Change', value: changeStr, inline: true },
        ],
        footer: 'CoinGecko',
      });
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({ embeds: [createEmbed({ color: config.colors.error, description: `${config.emoji.cross} API error.` })] });
    }
  },
};
