import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';
import axios from 'axios';

export default {
  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('Get weather information for a city')
    .addStringOption(opt => opt.setName('city').setDescription('City name').setRequired(true)),
  category: 'info',
  async execute(interaction) {
    const city = interaction.options.getString('city');
    await interaction.deferReply();
    try {
      const { data } = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
      const curr = data.current_condition[0];
      const embed = createEmbed({
        title: `${config.emoji.info} Weather — ${data.nearest_area[0]?.areaName[0]?.value || city}`,
        description: `${curr.weatherDesc[0]?.value} | ${curr.temp_C}°C (${curr.temp_F}°F)`,
        color: config.colors.blurple,
        fields: [
          { name: 'Humidity', value: `${curr.humidity}%`, inline: true },
          { name: 'Wind', value: `${curr.windspeedKmph} km/h`, inline: true },
          { name: 'Feels Like', value: `${curr.FeelsLikeC}°C`, inline: true },
          { name: 'UV Index', value: curr.uvIndex || 'N/A', inline: true },
          { name: 'Visibility', value: `${curr.visibility} km`, inline: true },
          { name: 'Pressure', value: `${curr.pressure} hPa`, inline: true },
        ],
        footer: 'wttr.in',
      });
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({ embeds: [createEmbed({ color: config.colors.error, description: `${config.emoji.cross} City not found.` })] });
    }
  },
};
