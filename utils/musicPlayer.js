import { Shoukaku, Connectors } from 'shoukaku';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import config from '../config.js';
import logger from './logger.js';

export class MusicPlayer {
  constructor(client) {
    this.client = client;
    this.queues = new Map();
    this.shoukaku = new Shoukaku(
      new Connectors.DiscordJS(client),
      config.lavalink.nodes.map(n => ({
        name: n.name,
        url: `${n.host}:${n.port}`,
        auth: n.auth,
        secure: n.secure || false,
      })),
      {
        moveOnDisconnect: false,
        resume: true,
        resumeTimeout: 30,
        reconnectTries: 5,
        reconnectInterval: 5,
        restTimeout: 15000,
      }
    );

    this.shoukaku.on('ready', (name) => logger.info(`Lavalink node "${name}" ready`));
    this.shoukaku.on('error', (name, err) => logger.error(`Lavalink node "${name}" error: ${err.message}`));
    this.shoukaku.on('close', (name, code, reason) => logger.warn(`Lavalink node "${name}" closed: ${code} ${reason}`));
    this.shoukaku.on('debug', (name, msg) => logger.debug(`[${name}] ${msg}`));
    this.shoukaku.on('connecting', (name) => logger.info(`Lavalink node "${name}" connecting...`));
    this.shoukaku.on('disconnect', (name, moved) => logger.warn(`Lavalink node "${name}" disconnected (moved: ${moved})`));
    this.shoukaku.on('reconnecting', (name, attempt) => logger.info(`Lavalink node "${name}" reconnecting (attempt ${attempt})...`));
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

  getNode() {
    const nodes = [...this.shoukaku.nodes.values()].filter(n => n.state === 1);
    return nodes.sort((a, b) => a.penalties - b.penalties)[0] ?? null;
  }

  async join(channel) {
    return this.shoukaku.joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      shardId: 0,
      deaf: true,
    });
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
      const search = query.match(/^https?:\/\//) ? query : `ytsearch:${query}`;
      const node = this.getNode();
      if (!node) throw new Error('No Lavalink nodes available');
      const result = await node.rest.resolve(search);

      if (!result || result.loadType === 'empty' || result.loadType === 'error') {
        await interaction.editReply({ embeds: [this.embed({ color: config.colors.error, description: `${config.emoji.cross} No results found.` })] });
        return;
      }

      const tracks = Array.isArray(result.data) ? result.data : result.data?.tracks ?? [result.data].filter(Boolean);

      if (!tracks.length) {
        await interaction.editReply({ embeds: [this.embed({ color: config.colors.error, description: `${config.emoji.cross} No results found.` })] });
        return;
      }

      if (result.loadType === 'playlist') {
        for (const track of tracks) {
          queue.songs.push({
            title: track.info.title,
            uri: track.info.uri,
            duration: this.formatDuration(track.info.length),
            length: track.info.length,
            thumbnail: `https://i.ytimg.com/vi/${track.info.identifier}/default.jpg`,
            author: track.info.author,
            requestedBy: interaction.user.id,
            track: track.encoded,
          });
        }
        if (queue.loop === 'queue' && queue.originalSongs.length === 0) {
          queue.originalSongs = queue.songs.map(s => ({ ...s }));
        }
        await interaction.editReply({ embeds: [this.embed({ color: config.colors.success, description: `${config.emoji.music} Added **${tracks.length}** songs from playlist` })] });
        if (!queue.playing) await this.playNext(guildId);
        return;
      }

      const track = tracks[0];
      const song = {
        title: track.info.title,
        uri: track.info.uri,
        duration: this.formatDuration(track.info.length),
        length: track.info.length,
        thumbnail: `https://i.ytimg.com/vi/${track.info.identifier}/default.jpg`,
        author: track.info.author,
        requestedBy: interaction.user.id,
        track: track.encoded,
      };

      queue.songs.push(song);
      if (queue.loop === 'queue' && queue.originalSongs.length === 0) {
        queue.originalSongs = queue.songs.map(s => ({ ...s }));
      }

      if (!queue.player || !queue.connection) {
        queue.player = await this.join(vc);
        queue.voiceChannel = vc;
        queue.connection = true;
        this.setupPlayerEvents(guildId);
      } else {
        this.cancelLeave(guildId);
      }
      queue.textChannel = interaction.channel;

      await interaction.editReply({ embeds: [this.embed({ color: config.colors.success, description: `${config.emoji.music} Added **${song.title}**` })] });

      if (!queue.playing) await this.playNext(guildId);
    } catch (err) {
      await interaction.editReply({ embeds: [this.embed({ color: config.colors.error, description: `${config.emoji.cross} Error: ${err.message}` })] });
      logger.error('Play error:', err.message);
    }
  }

  setupPlayerEvents(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue?.player) return;

    queue.player.on('start', () => {
      queue.playing = true;
      queue.paused = false;
      this.sendPanel(guildId);
    });

    queue.player.on('end', (data) => {
      if (data.reason === 'replaced') return;
      this.playNext(guildId);
    });

    queue.player.on('stuck', () => {
      this.playNext(guildId);
    });

    queue.player.on('closed', () => {
      this.leave(guildId);
    });

    queue.player.on('error', (err) => {
      logger.error(`Player error in ${guildId}:`, err.message);
      this.sendPanelError(guildId, `Playback error: ${err.message}`);
      this.playNext(guildId);
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
      if (!queue.player) {
        queue.playing = false;
        return;
      }
      await queue.player.playTrack({ track: { encoded: song.track } });
      await queue.player.setGlobalVolume(Math.round(queue.volume * 100));
      this.cancelLeave(guildId);
    } catch (err) {
      logger.error(`PlayNext error in ${guildId}:`, err.message);
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
      .setAuthor({ name: 'Now Playing', iconURL: this.client.user.displayAvatarURL() })
      .setTitle(song.title)
      .setURL(song.uri)
      .setThumbnail(song.thumbnail)
      .addFields(
        { name: 'Duration', value: song.duration || 'Unknown', inline: true },
        { name: 'Requested by', value: `<@${song.requestedBy}>`, inline: true },
        { name: 'Queue', value: `${queue.songs.length} songs`, inline: true },
        { name: 'Status', value: pauseState, inline: true },
        { name: 'Loop', value: loopIcons[queue.loop] || 'Off', inline: true },
        { name: 'Volume', value: `${Math.round(queue.volume * 100)}%`, inline: true },
      )
      .setFooter({ text: `AERIX • Music` })
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
      await queue.player.stopTrack();
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
      await queue.player.stopTrack();
    }
    this.leave(guildId);
  }

  leave(guildId) {
    const queue = this.queues.get(guildId);
    if (queue) {
      this.cancelLeave(guildId);
      if (queue.player) {
        this.shoukaku.leaveVoiceChannel(guildId);
        queue.player.clean();
      }
      this.queues.delete(guildId);
    }
  }

  async togglePause(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue?.player) return;
    await queue.player.setPaused(!queue.paused);
    queue.paused = !queue.paused;
    this.sendPanel(guildId);
  }

  async setVolume(guildId, vol) {
    const queue = this.queues.get(guildId);
    if (!queue?.player) return;
    queue.volume = Math.max(0, Math.min(2, vol / 100));
    await queue.player.setGlobalVolume(Math.round(queue.volume * 100));
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
