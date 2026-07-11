import { EmbedBuilder, ActionRowBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle } from 'discord.js';
import { row, primaryButton, successButton, dangerButton, button } from './components.js';
import { createEmbed } from './embed.js';
import { lyricsStore, default as lyricsCommand } from '../commands/music/lyrics.js';
import Ticket from '../models/Ticket.js';
import Guild from '../models/Guild.js';
import config from '../config.js';

export async function handleButton(interaction, client) {
  const { customId } = interaction;

  // === SETUP WIZARD BUTTONS ===
  if (customId === 'setup-welcome') {
    const modal = new ModalBuilder()
      .setCustomId('setup-welcome-modal')
      .setTitle('Welcome System Setup');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('setup-welcome-channel')
          .setLabel('Welcome Channel ID')
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('setup-welcome-message')
          .setLabel('Welcome Message')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Welcome {member} to {server}!')
          .setRequired(true),
      ),
    );
    await interaction.showModal(modal);
    return;
  }

  if (customId === 'setup-tickets') {
    const modal = new ModalBuilder()
      .setCustomId('setup-tickets-modal')
      .setTitle('Ticket System Setup');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('setup-tickets-category')
          .setLabel('Category ID for tickets')
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('setup-tickets-role')
          .setLabel('Support Role ID')
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
    );
    await interaction.showModal(modal);
    return;
  }

  if (customId === 'setup-automod') {
    await Guild.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { automodEnabled: true },
      { upsert: true },
    );
    const embed = createEmbed({
      title: `${config.emoji.shield} AutoMod Armed`,
      description: 'Auto-moderation has been enabled with default settings.\nUse `/automod` to customize.',
      color: config.colors.success,
      footer: 'AERIX • Security Systems',
    });
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (customId === 'setup-leveling') {
    await Guild.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { levelingEnabled: true },
      { upsert: true },
    );
    const embed = createEmbed({
      title: `${config.emoji.level} Leveling Activated`,
      description: 'XP & leveling system is now enabled.\nUse `/levels` for configuration.',
      color: config.colors.success,
      footer: 'AERIX • Leveling System',
    });
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (customId === 'setup-logging') {
    const modal = new ModalBuilder()
      .setCustomId('setup-logging-modal')
      .setTitle('Logging Setup');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('setup-logging-channel')
          .setLabel('Log Channel ID')
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
    );
    await interaction.showModal(modal);
    return;
  }

  // === TICKET BUTTONS ===
  if (customId === 'ticket-create') {
    await interaction.deferReply({ ephemeral: true });

    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
    if (!guildData?.ticketCategory) {
      return interaction.editReply({ content: `${config.emoji.warning} Ticket system not set up. Ask an admin to run \`/ticket-setup\`.` });
    }

    const existingTickets = await Ticket.find({ guildId: interaction.guild.id, userId: interaction.user.id, status: 'open' });
    if (existingTickets.length >= config.tickets.maxTicketsPerUser) {
      return interaction.editReply({ content: `${config.emoji.warning} You already have ${existingTickets.length} open tickets. Max allowed: ${config.tickets.maxTicketsPerUser}.` });
    }

    const count = await Ticket.countDocuments({ guildId: interaction.guild.id });
    const category = interaction.guild.channels.cache.get(guildData.ticketCategory);
    if (!category) return interaction.editReply({ content: `${config.emoji.error} Ticket category not found.` });

    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${count + 1}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone.id, deny: ['ViewChannel'] },
        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
        { id: guildData.ticketRole, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
      ],
    });

    await Ticket.create({
      guildId: interaction.guild.id,
      channelId: ticketChannel.id,
      userId: interaction.user.id,
      ticketId: count + 1,
    });

    const embed = createEmbed({
      title: `${config.emoji.ticket} Ticket #${count + 1}`,
      description: guildData.ticketMessage || 'Support will be with you shortly.\nDescribe your issue below.',
      color: config.colors.navy,
    });

    await ticketChannel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [embed],
      components: [
        row(
          dangerButton('ticket-close', 'Close', '🔒'),
          primaryButton('ticket-claim', 'Claim', '👋'),
        ),
      ],
    });
    return interaction.editReply({ content: `${config.emoji.check} Ticket created: <#${ticketChannel.id}>` });
  }

  if (customId === 'ticket-close') {
    const ticket = await Ticket.findOne({ guildId: interaction.guild.id, channelId: interaction.channelId, status: 'open' });
    if (!ticket) return interaction.reply({ content: `${config.emoji.error} This is not an active ticket.`, ephemeral: true });
    const guildDoc = await Guild.findOne({ guildId: interaction.guild.id });
    const supportRole = guildDoc?.ticketRole;
    const canClose = interaction.member.permissions.has('ManageGuild') || (supportRole && interaction.member.roles.cache.has(supportRole)) || interaction.user.id === ticket.userId;
    if (!canClose) {
      return interaction.reply({ content: `${config.emoji.error} You cannot close this ticket.`, ephemeral: true });
    }

    ticket.status = 'closed';
    ticket.closedBy = interaction.user.id;
    ticket.closedAt = new Date();
    await ticket.save();

    const embed = createEmbed({
      title: 'Ticket Closed',
      description: `This ticket has been closed by ${interaction.user.tag}.`,
      color: config.colors.error,
    });

    await interaction.reply({ embeds: [embed] });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  }

  if (customId === 'ticket-claim') {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: `${config.emoji.error} Only staff can claim tickets.`, ephemeral: true });
    }
    const ticket = await Ticket.findOne({ guildId: interaction.guild.id, channelId: interaction.channelId, status: 'open' });
    if (!ticket) return interaction.reply({ content: `${config.emoji.error} Ticket not found.`, ephemeral: true });
    ticket.claimedBy = interaction.user.id;
    await ticket.save();
    return interaction.reply({ content: `${config.emoji.check} Ticket claimed by ${interaction.user}.` });
  }

  // === GIVEAWAY BUTTON ===
  if (customId === 'giveaway-enter') {
    const giveaway = await (await import('../models/Giveaway.js')).default.findOne({
      messageId: interaction.message.id,
      ended: false,
    });
    if (!giveaway) return interaction.reply({ content: `${config.emoji.error} This giveaway is not active.`, ephemeral: true });

    if (giveaway.requiredRole && !interaction.member.roles.cache.has(giveaway.requiredRole)) {
      return interaction.reply({ content: `${config.emoji.warning} You need <@&${giveaway.requiredRole}> to enter this giveaway.`, ephemeral: true });
    }

    if (giveaway.entrants.includes(interaction.user.id)) {
      giveaway.entrants = giveaway.entrants.filter(id => id !== interaction.user.id);
      await giveaway.save();
      return interaction.reply({ content: `${config.emoji.check} You left the giveaway.`, ephemeral: true });
    }

    giveaway.entrants.push(interaction.user.id);
    await giveaway.save();
    return interaction.reply({ content: `${config.emoji.check} You entered the giveaway!`, ephemeral: true });
  }

  // === POLL BUTTONS ===
  if (customId.startsWith('poll-')) {
    const index = parseInt(customId.split('-')[1]);
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
    if (index >= 0 && index < emojis.length) {
      await interaction.reply({ content: `You voted ${emojis[index]}!`, ephemeral: true });
    }
    return;
  }

  // === TOURNAMENT BUTTONS ===
  if (customId === 'tournament-register') {
    const tournament = await (await import('../models/Tournament.js')).default.findOne({
      guildId: interaction.guild.id, channelId: interaction.channelId, status: 'registration',
    });
    if (!tournament) return interaction.reply({ content: `${config.emoji.error} No active tournament in this channel.`, ephemeral: true });

    const modal = new ModalBuilder()
      .setCustomId('tournament-register-modal')
      .setTitle('Register for Tournament');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('tournament-team-name').setLabel('Team Name').setStyle(TextInputStyle.Short).setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('tournament-captain-ign').setLabel('Your IGN').setStyle(TextInputStyle.Short).setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('tournament-members').setLabel(`Team Members (comma-separated, max ${tournament.teamSize - 1})`).setStyle(TextInputStyle.Paragraph).setRequired(false),
      ),
    );

    await interaction.showModal(modal);
    return;
  }

  if (customId === 'tournament-bracket') {
    const tournament = await (await import('../models/Tournament.js')).default.findOne({
      guildId: interaction.guild.id, channelId: interaction.channelId,
    });
    if (!tournament) return interaction.reply({ content: `${config.emoji.error} No tournament found.`, ephemeral: true });

    if (!tournament.bracket.length) {
      return interaction.reply({ content: `${config.emoji.warning} Bracket not yet generated. Tournament not started.`, ephemeral: true });
    }

    const rounds = [...new Set(tournament.bracket.map(m => m.round))].sort();
    let description = '';
    for (const round of rounds) {
      const matches = tournament.bracket.filter(m => m.round === round);
      description += `\n**Round ${round}:**\n`;
      for (const match of matches) {
        const t1 = match.team1 || 'TBD';
        const t2 = match.team2 || 'TBD';
        const status = match.status === 'completed' ? ` → 🏆 ${match.winner}` : ` (${match.status === 'in_progress' ? '🔴 Live' : '⏳ Pending'})`;
        description += `${t1} vs ${t2}${status}\n`;
      }
    }

    const embed = createEmbed({
      title: `${config.emoji.trophy} ${tournament.name} — Bracket`,
      description: description.slice(0, 4000),
      color: config.colors.gold,
      footer: 'Tournament Bracket',
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  // === MUSIC BUTTONS ===
  if (customId.startsWith('music-')) {
    const action = customId.slice(6);
    const player = client.music;
    const guildId = interaction.guild.id;
    const queue = player.getQueueList(guildId);

    if (!queue && action !== 'queue') {
      return interaction.reply({ content: 'No music is playing.', ephemeral: true });
    }

    const ack = () => interaction.deferUpdate().catch(() => {});

    switch (action) {
      case 'pause':
        player.togglePause(guildId);
        ack();
        break;
      case 'skip':
        player.skip(guildId);
        ack();
        break;
      case 'stop':
        if (interaction.message.id === queue?.panelMessageId) {
          await interaction.update({ embeds: [createEmbed({ color: config.colors.error, description: `${config.emoji.music || '🎵'} Stopped and left.` })], components: [] });
        }
        player.stop(guildId);
        break;
      case 'loop':
        player.toggleLoop(guildId);
        ack();
        break;
      case 'shuffle':
        player.shuffle(guildId);
        ack();
        break;
      case 'vdown':
        player.adjustVolume(guildId, -10);
        ack();
        break;
      case 'vup':
        player.adjustVolume(guildId, 10);
        ack();
        break;
      case 'queue':
        const q = player.getQueueList(guildId);
        if (!q || (!q.songs.length && !q.currentSong)) {
          return interaction.reply({ embeds: [createEmbed({ color: config.colors.info, description: `${config.emoji.music || '🎵'} Queue is empty.` })], ephemeral: true });
        }
        const songList = q.songs.slice(0, 20).map((s, i) => `**${i + 1}.** [${s.title}](${s.uri || s.url}) — \`${s.duration || 'Unknown'}\``).join('\n');
        const nowPlaying = q.currentSong ? `**[${q.currentSong.title}](${q.currentSong.uri || q.currentSong.url})** — \`${q.currentSong.duration || 'Unknown'}\`` : 'None';
        return interaction.reply({
          embeds: [createEmbed({
            title: `${config.emoji.music || '🎵'} Music Queue`,
            color: config.colors.blurple,
            fields: [
              { name: 'Now Playing', value: nowPlaying },
              { name: `Up Next (${q.songs.length} songs)`, value: songList || 'None' },
            ],
            footer: `Loop: ${q.loop} | Volume: ${Math.round(q.volume * 100)}%`,
          })],
          ephemeral: true,
        });
    }
  }

  // === REACTION ROLE BUTTON ===
  if (customId.startsWith('rr-')) {
    const roleId = customId.slice(3);
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) return interaction.reply({ content: `${config.emoji.error} Role not found.`, ephemeral: true });

    if (interaction.member.roles.cache.has(roleId)) {
      await interaction.member.roles.remove(role);
      return interaction.reply({ content: `${config.emoji.check} Removed ${role.name}.`, ephemeral: true });
    }
    await interaction.member.roles.add(role);
    return interaction.reply({ content: `${config.emoji.check} Added ${role.name}.`, ephemeral: true });
  }

  // === LYRICS BUTTONS ===
  if (customId.startsWith('lyrics-')) {
    const state = lyricsStore.get(interaction.user.id);
    if (!state) return interaction.reply({ content: `${config.emoji.error} Lyrics expired. Run \`/lyrics\` again.`, ephemeral: true });

    const action = customId.slice(7);
    if (action === 'prev' && state.page > 0) state.page--;
    else if (action === 'next' && state.page < state.totalPages - 1) state.page++;
    else return interaction.deferUpdate();

    const { song, page, totalPages } = state;
    const lines = song.lyrics.split('\n');
    const LYRICS_PER_PAGE = 12;
    const start = page * LYRICS_PER_PAGE;
    const pageLines = lines.slice(start, start + LYRICS_PER_PAGE);
    const content = pageLines.join('\n') || '*No lyrics on this page.*';

    const progressBar = `${'━'.repeat(Math.round((page + 1) / totalPages * 15))}${'░'.repeat(15 - Math.round((page + 1) / totalPages * 15))} ${page + 1}/${totalPages}`;

    const embed = createEmbed({
      title: `${config.emoji.music} ${song.title}`,
      description: `**${song.artist}**${song.album ? ` • ${song.album}` : ''}\n\n${content}\n\n${progressBar}`,
      color: config.colors.blurple,
      footer: 'AERIX • Lyrics',
    });

    const prev = new ButtonBuilder().setCustomId('lyrics-prev').setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(page === 0);
    const next = new ButtonBuilder().setCustomId('lyrics-next').setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1);
    const buttons = new ActionRowBuilder().addComponents(prev, next);

    await interaction.update({ embeds: [embed], components: totalPages > 1 ? [buttons] : [] });
  }
}
