import ytdl from '@distube/ytdl-core';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
} from '@discordjs/voice';
import { EmbedBuilder } from 'discord.js';
import config from '../config.js';
import logger from './logger.js';

export class YtdlFallback {
  constructor(client) {
    this.client = client;
    this.queues = new Map();
  }

  getQueue(guildId) {
    let queue = this.queues.get(guildId);
    if (!queue) {
      queue = {
        songs: [],
        originalSongs: [],
        playing: false,
        paused: false,
        player: null,
        connection: null,
        loop: 'off',
        volume: config.music.defaultVolume / 100,
        currentSong: null,
        textChannel: null,
        voiceChannel: null,
        leaveTimeout: null,
        panelMessageId: null,
        panelChannelId: null,
      };
      this.queues.set(guildId, queue);
    }
    return queue;
  }

  async search(query) {
    const searchUrl = query.match(/^https?:\/\//) ? query : `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

    if (query.match(/^https?:\/\//)) {
      const info = await ytdl.getInfo(query);
      return [{
        title: info.videoDetails.title,
        url: info.videoDetails.video_url,
        duration: this.formatDuration(parseInt(info.videoDetails.lengthSeconds) * 1000),
        length: parseInt(info.videoDetails.lengthSeconds) * 1000,
        thumbnail: info.videoDetails.thumbnails.pop()?.url || `https://i.ytimg.com/vi/${info.videoDetails.videoId}/default.jpg`,
        author: info.videoDetails.author.name,
      }];
    }

    const results = await ytdl.search(query, { limit: 5 });
    return results.map(v => ({
      title: v.name,
      url: v.url,
      duration: this.formatDuration(v.duration * 1000),
      length: v.duration * 1000,
      thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.id}/default.jpg`,
      author: v.uploader?.name || 'Unknown',
    }));
  }

  async play(guildId, query, interaction) {
    const queue = this.getQueue(guildId);
    const vc = interaction.member.voice.channel;
    if (!vc) {
      await interaction.reply({ embeds: [this.embed({ color: config.colors.error, description: `${config.emoji.cross} You must be in a voice channel.` })], ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const results = await this.search(query);
      if (!results.length) {
        await interaction.editReply({ embeds: [this.embed({ color: config.colors.error, description: `${config.emoji.cross} No results found.` })] });
        return;
      }

      const song = {
        ...results[0],
        requestedBy: interaction.user.id,
      };

      queue.songs.push(song);
      this.syncLoopState(queue);

      if (!queue.connection) {
        const voiceConnection = joinVoiceChannel({
          channelId: vc.id,
          guildId: guildId,
          shardId: 0,
          adapterCreator: vc.guild.voiceAdapterCreator,
        });

        try {
          await entersState(voiceConnection, VoiceConnectionStatus.Ready, 20_000);
        } catch {
          voiceConnection.destroy();
          throw new Error('Failed to join voice channel');
        }

        queue.connection = voiceConnection;
        queue.player = createAudioPlayer();
        queue.voiceChannel = vc;
        voiceConnection.subscribe(queue.player);
        this.setupPlayerEvents(guildId);
      } else {
        this.cancelLeave(guildId);
      }
      queue.textChannel = interaction.channel;

      await interaction.editReply({ embeds: [this.embed({ color: config.colors.success, description: `${config.emoji.music} Added **${song.title}** (direct YouTube)` })] });

      if (!queue.playing) await this.playNext(guildId);
    } catch (err) {
      logger.error('[YtdlFallback] Play error:', err.message);
      await interaction.editReply({ embeds: [this.embed({ color: config.colors.error, description: `${config.emoji.cross} Error: ${err.message}` })] });
    }
  }

  setupPlayerEvents(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue?.player || queue._eventsAttached) return;
    queue._eventsAttached = true;

    queue.player.on(AudioPlayerStatus.Idle, () => {
      this.playNext(guildId);
    });

    queue.player.on('error', (err) => {
      logger.error(`[YtdlFallback] Player error in ${guildId}:`, err.message);
      this.sendPanelError(guildId, `Playback error: ${err.message}`);
      this.playNext(guildId);
    });

    queue.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(queue.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(queue.connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        this.leave(guildId);
      }
    });
  }

  async playNext(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue) return;

    if (queue.loop === 'song' && queue.currentSong) {
      queue.songs.unshift({ ...queue.currentSong });
    }

    if (!queue.songs.length) {
      if (queue.loop === 'queue' && queue.originalSongs.length > 0) {
        queue.songs = queue.originalSongs.map(s => ({ ...s }));
        if (!queue.songs.length) {
          queue.playing = false;
          queue.currentSong = null;
          this.sendPanel(guildId);
          this.scheduleLeave(guildId);
          return;
        }
      } else {
        queue.playing = false;
        queue.currentSong = null;
        this.sendPanel(guildId);
        this.scheduleLeave(guildId);
        return;
      }
    }

    const song = queue.songs.shift();
    queue.currentSong = song;
    queue.playing = true;
    queue.paused = false;

    try {
      const stream = ytdl(song.url, {
        filter: 'audioonly',
        highWaterMark: 1 << 25,
        quality: 'highestaudio',
        dlChunkSize: 0,
      });

      const resource = createAudioResource(stream, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
      });

      resource.volume.setVolume(queue.volume);
      queue.player.play(resource);
      this.cancelLeave(guildId);
      this.sendPanel(guildId);
    } catch (err) {
      logger.error(`[YtdlFallback] PlayNext error in ${guildId}:`, err.message);
      queue.playing = false;
      queue.currentSong = null;
      this.playNext(guildId);
    }
  }

  scheduleLeave(guildId, delay = 60000) {
    const queue = this.queues.get(guildId);
    if (!queue) return;
    this.cancelLeave(guildId);
    queue.leaveTimeout = setTimeout(() => {
      const ch = queue.textChannel;
      if (ch) ch.send({ embeds: [this.embed({ color: config.colors.info, description: `${config.emoji.music} Left voice channel due to inactivity.` })] }).catch(() => {});
      this.leave(guildId);
    }, delay);
  }

  cancelLeave(guildId) {
    const queue = this.queues.get(guildId);
    if (queue?.leaveTimeout) {
      clearTimeout(queue.leaveTimeout);
      queue.leaveTimeout = null;
    }
  }

  async sendPanel(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue) return;

    const embed = this.buildPanelEmbed(queue);
    if (!embed) {
      await this.deletePanel(queue);
      return;
    }

    const ch = queue.textChannel;
    if (!ch) return;

    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('music-pause').setEmoji(queue.paused ? '▶️' : '⏸️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music-skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music-stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('music-loop').setEmoji('🔁').setStyle(queue.loop !== 'off' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music-shuffle').setEmoji('🔀').setStyle(ButtonStyle.Secondary),
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('music-vdown').setEmoji('🔉').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music-vup').setEmoji('🔊').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music-queue').setEmoji('📜').setStyle(ButtonStyle.Primary),
    );

    if (queue.panelMessageId) {
      try {
        const msg = await ch.messages.fetch(queue.panelMessageId).catch(() => null);
        if (msg) {
          await msg.edit({ embeds: [embed], components: [row1, row2] }).catch(() => {});
          return;
        }
      } catch {}
    }

    const msg = await ch.send({ embeds: [embed], components: [row1, row2] }).catch(() => {});
    if (msg) {
      queue.panelMessageId = msg.id;
      queue.panelChannelId = msg.channel.id;
    }
  }

  async deletePanel(queue) {
    if (!queue.panelMessageId) return;
    try {
      const ch = await queue.textChannel?.client.channels.fetch(queue.panelChannelId).catch(() => null);
      if (ch) {
        const msg = await ch.messages.fetch(queue.panelMessageId).catch(() => null);
        if (msg) await msg.delete().catch(() => {});
      }
    } catch {}
    queue.panelMessageId = null;
    queue.panelChannelId = null;
  }

  async sendPanelError(guildId, errorMessage) {
    const queue = this.queues.get(guildId);
    if (!queue?.textChannel) return;
    queue.textChannel.send({ embeds: [this.embed({ color: config.colors.error, description: `${config.emoji.cross} ${errorMessage}` })] }).catch(() => {});
  }

  buildPanelEmbed(queue) {
    if (!queue.playing || !queue.currentSong) {
      return new EmbedBuilder()
        .setColor(config.colors.dark)
        .setDescription(`${config.emoji.music} **Queue finished**\nUse \`/play\` to add more songs.`)
        .setTimestamp();
    }

    const song = queue.currentSong;
    const pauseState = queue.paused ? '⏸️ **PAUSED**' : '▶️ **PLAYING**';
    const loopIcons = { off: 'Off', song: '🔂 Song', queue: '🔁 Queue' };

    return new EmbedBuilder()
      .setColor(config.colors.blurple)
      .setAuthor({ name: 'Now Playing (Direct)', iconURL: this.client.user.displayAvatarURL() })
      .setTitle(song.title)
      .setURL(song.url)
      .setThumbnail(song.thumbnail)
      .addFields(
        { name: 'Duration', value: song.duration || 'Unknown', inline: true },
        { name: 'Requested by', value: `<@${song.requestedBy}>`, inline: true },
        { name: 'Queue', value: `${queue.songs.length} songs`, inline: true },
        { name: 'Status', value: pauseState, inline: true },
        { name: 'Loop', value: loopIcons[queue.loop] || 'Off', inline: true },
        { name: 'Volume', value: `${Math.round(queue.volume * 100)}%`, inline: true },
      )
      .setFooter({ text: `AERIX • Music (Direct YouTube)` })
      .setTimestamp();
  }

  embed(opts) {
    const e = new EmbedBuilder().setColor(opts.color || config.colors.primary).setTimestamp();
    if (opts.title) e.setTitle(opts.title);
    if (opts.description) e.setDescription(opts.description);
    if (opts.fields) e.addFields(opts.fields);
    return e;
  }

  async skip(guildId) {
    const queue = this.queues.get(guildId);
    if (queue?.player) {
      queue.player.stop();
    }
  }

  async stop(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue) return;
    queue.songs = [];
    queue.originalSongs = [];
    queue.playing = false;
    queue.currentSong = null;
    await this.deletePanel(queue);
    if (queue.player) {
      queue.player.stop();
    }
    this.leave(guildId);
  }

  leave(guildId) {
    const queue = this.queues.get(guildId);
    if (queue) {
      this.cancelLeave(guildId);
      if (queue.connection) {
        queue.connection.destroy();
      }
      this.queues.delete(guildId);
    }
  }

  destroy() {
    for (const [guildId] of this.queues) {
      this.leave(guildId);
    }
  }

  async togglePause(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue?.player) return;
    if (queue.paused) {
      queue.player.unpause();
    } else {
      queue.player.pause();
    }
    queue.paused = !queue.paused;
    this.sendPanel(guildId);
  }

  async pause(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue?.player || queue.paused) return;
    queue.player.pause();
    queue.paused = true;
    this.sendPanel(guildId);
  }

  async resume(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue?.player || !queue.paused) return;
    queue.player.unpause();
    queue.paused = false;
    this.sendPanel(guildId);
  }

  async setVolume(guildId, vol) {
    const queue = this.queues.get(guildId);
    if (!queue) return;
    queue.volume = Math.max(0, Math.min(2, vol / 100));
    if (queue.player?.state?.status === AudioPlayerStatus.Playing) {
      const resource = queue.player.state.resource;
      if (resource?.volume) {
        resource.volume.setVolume(queue.volume);
      }
    }
    this.sendPanel(guildId);
  }

  adjustVolume(guildId, delta) {
    const queue = this.queues.get(guildId);
    if (!queue) return;
    const newVol = Math.round(queue.volume * 100) + delta;
    this.setVolume(guildId, Math.max(0, Math.min(200, newVol)));
  }

  toggleLoop(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue) return;
    const modes = ['off', 'song', 'queue'];
    const idx = modes.indexOf(queue.loop);
    queue.loop = modes[(idx + 1) % modes.length];
    this.syncLoopState(queue);
    this.sendPanel(guildId);
  }

  setLoop(guildId, mode) {
    const queue = this.queues.get(guildId);
    if (!queue || !['off', 'song', 'queue'].includes(mode)) return;
    queue.loop = mode;
    this.syncLoopState(queue);
    this.sendPanel(guildId);
  }

  syncLoopState(queue) {
    if (queue.loop === 'queue' && queue.originalSongs.length === 0) {
      queue.originalSongs = queue.songs.map(s => ({ ...s }));
    }
    if (queue.loop === 'off') queue.originalSongs = [];
  }

  shuffle(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue || queue.songs.length < 2) return;
    for (let i = queue.songs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue.songs[i], queue.songs[j]] = [queue.songs[j], queue.songs[i]];
    }
    this.sendPanel(guildId);
  }

  getQueueList(guildId) {
    return this.queues.get(guildId) || null;
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours) return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  }
}
