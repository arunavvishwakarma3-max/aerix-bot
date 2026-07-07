import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set playback volume')
    .addIntegerOption(opt => opt.setName('level').setDescription('Volume level (0-100)').setRequired(true).setMinValue(0).setMaxValue(100)),
  async execute(interaction, client) {
    const level = interaction.options.getInteger('level');
    client.music.setVolume(interaction.guild.id, level);
    await interaction.reply({ embeds: [createEmbed({ color: config.colors.success, description: `${config.emoji.music || '🎵'} Volume set to **${level}%**.` })] });
  },
};
