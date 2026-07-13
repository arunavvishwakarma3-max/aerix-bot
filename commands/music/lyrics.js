import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

const LYRICS_PER_PAGE = 12;

async function fetchLyrics(songName) {
  try {
    const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(songName)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    const best = data.find(t => t.syncedLyrics) || data[0];
    const plain = best.plainLyrics || best.syncedLyrics?.replace(/\[\d{2}:\d{2}\.\d{2}\]\s*/g, '') || '';
    if (!plain) return null;
    return {
      title: best.trackName || songName,
      artist: best.artistName || 'Unknown',
      album: best.albumName || '',
      lyrics: plain,
    };
  } catch {
    return null;
  }
}

function buildLyricsEmbed(song, page, totalPages) {
  const lines = song.lyrics.split('\n');
  const start = page * LYRICS_PER_PAGE;
  const pageLines = lines.slice(start, start + LYRICS_PER_PAGE);
  const content = pageLines.join('\n') || '*No lyrics on this page.*';

  const progressBar = totalPages > 1
    ? `${'━'.repeat(Math.round((page + 1) / totalPages * 15))}${'░'.repeat(15 - Math.round((page + 1) / totalPages * 15))} ${page + 1}/${totalPages}`
    : '';

  return createEmbed({
    title: `${config.emoji.music} ${song.title}`,
    description: `**${song.artist}**${song.album ? ` • ${song.album}` : ''}\n\n${content}\n\n${progressBar}`,
    color: config.colors.blurple,
    footer: `AERIX • Lyrics`,
  });
}

function buildButtons(page, totalPages) {
  const prev = new ButtonBuilder()
    .setCustomId('lyrics-prev')
    .setEmoji('◀️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page === 0);

  const next = new ButtonBuilder()
    .setCustomId('lyrics-next')
    .setEmoji('▶️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page >= totalPages - 1);

  return new ActionRowBuilder().addComponents(prev, next);
}

export const lyricsStore = new Map();

const LYRICS_TTL = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [userId, state] of lyricsStore) {
    if (now - state.createdAt > LYRICS_TTL) {
      lyricsStore.delete(userId);
    }
  }
}, 60_000);

export default {
  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Get lyrics for a song')
    .addStringOption(opt =>
      opt.setName('song').setDescription('Song name (leave empty for now playing)').setRequired(false),
    ),

  async execute(interaction, client) {
    const query = interaction.options.getString('song');

    let songName = query;
    if (!songName) {
      const queue = client.music.getQueueList(interaction.guild.id);
      if (queue?.currentSong) {
        songName = queue.currentSong.title;
      } else {
        return interaction.reply({
          embeds: [createEmbed({ color: config.colors.warning, description: `${config.emoji.warning} Nothing is playing. Provide a song name: \`/lyrics song:Blinding Lights\`` })],
          ephemeral: true,
        });
      }
    }

    await interaction.deferReply();

    const song = await fetchLyrics(songName);
    if (!song) {
      return interaction.editReply({
        embeds: [createEmbed({ color: config.colors.error, description: `${config.emoji.cross} No lyrics found for **${songName}**.` })],
      });
    }

    const lines = song.lyrics.split('\n');
    const totalPages = Math.ceil(lines.length / LYRICS_PER_PAGE);
    const page = 0;

    lyricsStore.set(interaction.user.id, { song, page, totalPages, messageId: null, createdAt: Date.now() });

    const embed = buildLyricsEmbed(song, page, totalPages);
    const buttons = buildButtons(page, totalPages);

    const reply = await interaction.editReply({ embeds: [embed], components: totalPages > 1 ? [buttons] : [] });
    lyricsStore.get(interaction.user.id).messageId = reply.id;
  },
};
