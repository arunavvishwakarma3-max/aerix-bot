import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playback and clear the queue'),
  async execute(interaction, client) {
    const queue = client.music.getQueueList(interaction.guild.id);
    if (!queue || !queue.playing) {
      return interaction.reply({ embeds: [createEmbed({ color: config.colors.error, description: `${config.emoji.cross || '❌'} Nothing is playing.` })], ephemeral: true });
    }
    if (!queue.voiceChannel || interaction.member.voice.channelId !== queue.voiceChannel.id) {
      return interaction.reply({ embeds: [createEmbed({ color: config.colors.error, description: `${config.emoji.cross || '❌'} You must be in the same voice channel as the bot.` })], ephemeral: true });
    }
    client.music.stop(interaction.guild.id);
    await interaction.reply({ embeds: [createEmbed({ color: config.colors.error, description: `${config.emoji.music || '🎵'} Stopped and left voice channel.` })] });
  },
};
