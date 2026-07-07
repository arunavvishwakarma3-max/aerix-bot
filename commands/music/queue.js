import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('View the current music queue'),
  async execute(interaction, client) {
    const queue = client.music.getQueueList(interaction.guild.id);
    if (!queue || (!queue.songs.length && !queue.currentSong)) {
      return interaction.reply({ embeds: [createEmbed({ color: config.colors.info, description: `${config.emoji.music || '🎵'} Queue is empty.` })], ephemeral: true });
    }

    const songList = queue.songs.slice(0, 20).map((s, i) => `**${i + 1}.** [${s.title}](${s.url}) — \`${s.duration || 'Unknown'}\``).join('\n');
    const nowPlaying = queue.currentSong ? `**[${queue.currentSong.title}](${queue.currentSong.url})** — \`${queue.currentSong.duration || 'Unknown'}\`` : 'None';

    const embed = createEmbed({
      title: `${config.emoji.music || '🎵'} Music Queue`,
      color: config.colors.blurple,
      fields: [
        { name: 'Now Playing', value: nowPlaying },
        { name: `Up Next (${queue.songs.length} songs)`, value: songList || 'None' },
      ],
      footer: `Loop: ${queue.loop} | Volume: ${Math.round(queue.volume * 100)}%`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
