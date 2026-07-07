import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } from 'discord.js';
import Tournament from '../../models/Tournament.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('tournament')
    .setDescription('MCPE Asia Tournament Management')
    .addSubcommand(sub => sub.setName('create').setDescription('Create a new tournament')
      .addStringOption(opt => opt.setName('name').setDescription('Tournament name').setRequired(true))
      .addStringOption(opt => opt.setName('mode').setDescription('Game mode').setRequired(true)
        .addChoices(
          { name: 'Bedwars', value: 'Bedwars' },
          { name: 'Skywars', value: 'Skywars' },
          { name: 'UHC', value: 'UHC' },
          { name: 'PvP', value: 'PvP' },
          { name: 'CPVP', value: 'CPVP' },
          { name: 'Custom', value: 'Custom' },
        ))
      .addIntegerOption(opt => opt.setName('teams').setDescription('Max teams (2-64)').setRequired(true).setMinValue(2).setMaxValue(64))
      .addIntegerOption(opt => opt.setName('team-size').setDescription('Players per team (1-5)').setMinValue(1).setMaxValue(5).setRequired(true)))
    .addSubcommand(sub => sub.setName('register').setDescription('Register a team for a tournament')
      .addStringOption(opt => opt.setName('tournament').setDescription('Tournament name').setRequired(true).setAutocomplete(true))
      .addStringOption(opt => opt.setName('team-name').setDescription('Team name').setRequired(true))
      .addStringOption(opt => opt.setName('captain-ign').setDescription('Captain IGN').setRequired(true))
      .addStringOption(opt => opt.setName('members').setDescription('Comma-separated member IGNs')))
    .addSubcommand(sub => sub.setName('start').setDescription('Start tournament and generate bracket')
      .addStringOption(opt => opt.setName('tournament').setDescription('Tournament name').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('bracket').setDescription('View tournament bracket')
      .addStringOption(opt => opt.setName('tournament').setDescription('Tournament name').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('match').setDescription('Report match result')
      .addStringOption(opt => opt.setName('tournament').setDescription('Tournament name').setRequired(true).setAutocomplete(true))
      .addIntegerOption(opt => opt.setName('round').setDescription('Round number').setRequired(true).setMinValue(1))
      .addIntegerOption(opt => opt.setName('match').setDescription('Match index').setRequired(true).setMinValue(0))
      .addStringOption(opt => opt.setName('winner').setDescription('Winning team name').setRequired(true))
      .addIntegerOption(opt => opt.setName('score1').setDescription('Team 1 score').setRequired(true))
      .addIntegerOption(opt => opt.setName('score2').setDescription('Team 2 score').setRequired(true)))
    .addSubcommand(sub => sub.setName('teams').setDescription('List registered teams')
      .addStringOption(opt => opt.setName('tournament').setDescription('Tournament name').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('delete').setDescription('Delete a tournament')
      .addStringOption(opt => opt.setName('tournament').setDescription('Tournament name').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('checkin').setDescription('Toggle check-in for tournament')
      .addStringOption(opt => opt.setName('tournament').setDescription('Tournament name').setRequired(true).setAutocomplete(true))),
  permissions: ['ManageGuild'],
  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      const name = interaction.options.getString('name');
      const mode = interaction.options.getString('mode');
      const maxTeams = interaction.options.getInteger('teams');
      const teamSize = interaction.options.getInteger('team-size');

      const existing = await Tournament.findOne({ guildId: interaction.guild.id, name, status: { $ne: 'completed' } });
      if (existing) return interaction.reply({ content: 'A tournament with that name already exists.', ephemeral: true });

      if (maxTeams & (maxTeams - 1) !== 0) {
        return interaction.reply({ content: 'Team count must be a power of 2 (2, 4, 8, 16, 32, 64).', ephemeral: true });
      }

      const category = await interaction.guild.channels.create({
        name: `tournament-${name.toLowerCase().replace(/\s+/g, '-')}`,
        type: ChannelType.GuildCategory,
      });

      const infoChannel = await interaction.guild.channels.create({
        name: 'tournament-info',
        type: ChannelType.GuildText,
        parent: category.id,
      });

      const embed = createEmbed({
        title: `🏆 ${name} — MCPE Asia Tournament`,
        description: `**Game Mode:** ${mode}\n**Max Teams:** ${maxTeams}\n**Team Size:** ${teamSize}\n**Status:** 📝 Registration`,
        color: 0x9B59B6,
        fields: [
          { name: 'How to Register', value: `Use \`/tournament register\` with your team name and captain IGN.` },
          { name: 'Registered Teams', value: '0/' + maxTeams },
        ],
        footer: 'MCPE Asia Tournaments',
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tournament-register').setLabel('Register').setStyle(ButtonStyle.Success).setEmoji('📝'),
        new ButtonBuilder().setCustomId('tournament-bracket').setLabel('Bracket').setStyle(ButtonStyle.Primary).setEmoji('🏆'),
      );

      const msg = await infoChannel.send({ embeds: [embed], components: [row] });

      const tournament = new Tournament({
        guildId: interaction.guild.id,
        name,
        gameMode: mode,
        teamSize,
        maxTeams,
        hosterId: interaction.user.id,
        channelId: infoChannel.id,
        messageId: msg.id,
      });

      await tournament.save();

      await interaction.reply({
        embeds: [createEmbed({ title: 'Tournament Created!', description: `**${name}** created in ${category}.`, color: config.colors.success })],
      });
    }

    if (sub === 'register') {
      const tournamentName = interaction.options.getString('tournament');
      const teamName = interaction.options.getString('team-name');
      const captainIgn = interaction.options.getString('captain-ign');
      const membersStr = interaction.options.getString('members');

      const tournament = await Tournament.findOne({ guildId: interaction.guild.id, name: tournamentName, status: 'registration' });
      if (!tournament) return interaction.reply({ content: 'Tournament not found or registration closed.', ephemeral: true });

      if (tournament.teams.length >= tournament.maxTeams) {
        return interaction.reply({ content: 'Tournament is full!', ephemeral: true });
      }

      if (tournament.teams.some(t => t.name.toLowerCase() === teamName.toLowerCase())) {
        return interaction.reply({ content: 'Team name already taken.', ephemeral: true });
      }

      const members = membersStr ? membersStr.split(',').map(s => s.trim()).filter(Boolean).slice(0, tournament.teamSize - 1) : [];

      tournament.teams.push({
        name: teamName,
        captainId: interaction.user.id,
        captainIgn,
        membersIgn: members,
        seed: tournament.teams.length + 1,
      });

      await tournament.save();
      await updateTournamentMessage(client, tournament);

      await interaction.reply({
        embeds: [createEmbed({
          title: 'Team Registered!',
          description: `**${teamName}** registered for **${tournament.name}**!\nCaptain: ${captainIgn}\nMembers: ${members.length ? members.join(', ') : 'None'}`,
          color: config.colors.success,
        })],
      });
    }

    if (sub === 'start') {
      const tournamentName = interaction.options.getString('tournament');
      const tournament = await Tournament.findOne({ guildId: interaction.guild.id, name: tournamentName, status: 'registration' });
      if (!tournament) return interaction.reply({ content: 'Tournament not found or already started.', ephemeral: true });

      const teams = tournament.teams;
      const totalTeams = teams.length;

      // Find next power of 2
      let bracketSize = 2;
      while (bracketSize < totalTeams) bracketSize *= 2;

      // Add byes for missing teams
      while (teams.length < bracketSize) {
        teams.push({ name: 'BYE', captainId: '', captainIgn: '', members: [], seed: teams.length + 1 });
      }

      // Shuffle for random seeding
      const shuffled = [...teams].sort(() => Math.random() - 0.5);
      tournament.teams = shuffled;

      // Generate bracket
      const bracket = [];
      const rounds = Math.log2(bracketSize);

      for (let round = 1; round <= rounds; round++) {
        const matchesInRound = bracketSize / Math.pow(2, round);
        for (let i = 0; i < matchesInRound; i++) {
          bracket.push({
            round,
            matchIndex: i,
            team1: null,
            team2: null,
            winner: null,
            status: 'pending',
          });
        }
      }

      // Fill first round
      const firstRoundMatches = bracket.filter(m => m.round === 1);
      for (let i = 0; i < firstRoundMatches.length; i++) {
        if (shuffled[i * 2]) firstRoundMatches[i].team1 = shuffled[i * 2].name;
        if (shuffled[i * 2 + 1]) firstRoundMatches[i].team2 = shuffled[i * 2 + 1].name;
        if (shuffled[i * 2]?.name === 'BYE') {
          firstRoundMatches[i].winner = shuffled[i * 2 + 1]?.name || 'BYE';
          firstRoundMatches[i].status = 'completed';
        } else if (shuffled[i * 2 + 1]?.name === 'BYE') {
          firstRoundMatches[i].winner = shuffled[i * 2].name;
          firstRoundMatches[i].status = 'completed';
        }
      }

      tournament.bracket = bracket;
      tournament.status = 'in_progress';
      tournament.startedAt = new Date();
      await tournament.save();

      await updateTournamentMessage(client, tournament);

      await interaction.reply({
        embeds: [createEmbed({
          title: 'Tournament Started!',
          description: `**${tournament.name}** has begun! ${totalTeams} teams competing. Use \`/tournament bracket\` to view.`,
          color: config.colors.success,
        })],
      });
    }

    if (sub === 'bracket') {
      const tournamentName = interaction.options.getString('tournament');
      const tournament = await Tournament.findOne({ guildId: interaction.guild.id, name: tournamentName });
      if (!tournament) return interaction.reply({ content: 'Tournament not found.', ephemeral: true });

      if (!tournament.bracket.length) {
        return interaction.reply({ content: 'Bracket not yet generated. Start the tournament first.', ephemeral: true });
      }

      const rounds = [...new Set(tournament.bracket.map(m => m.round))].sort();
      let description = '';

      for (const round of rounds) {
        const matches = tournament.bracket.filter(m => m.round === round);
        description += `\n**Round ${round}:**\n`;
        for (const match of matches) {
          const t1 = match.team1 || 'TBD';
          const t2 = match.team2 || 'TBD';
          const winner = match.winner ? ` → 🏆 ${match.winner}` : '';
          const status = match.status === 'completed' ? winner : ` (${match.status === 'in_progress' ? '🔴 Live' : '⏳ Pending'})`;
          description += `${t1} vs ${t2}${status}\n`;
        }
      }

      const embed = createEmbed({
        title: `🏆 ${tournament.name} — Bracket`,
        description: description.slice(0, 4000),
        color: 0x9B59B6,
        fields: [
          { name: 'Game Mode', value: tournament.gameMode, inline: true },
          { name: 'Teams', value: `${tournament.teams.filter(t => t.name !== 'BYE').length}/${tournament.maxTeams}`, inline: true },
          { name: 'Status', value: tournament.status === 'in_progress' ? '🔴 In Progress' : tournament.status === 'completed' ? '✅ Completed' : '📝 Registration', inline: true },
        ],
        footer: 'MCPE Asia Tournaments',
      });

      await interaction.reply({ embeds: [embed] });
    }

    if (sub === 'match') {
      const tournamentName = interaction.options.getString('tournament');
      const round = interaction.options.getInteger('round');
      const matchIndex = interaction.options.getInteger('match');
      const winner = interaction.options.getString('winner');
      const score1 = interaction.options.getInteger('score1');
      const score2 = interaction.options.getInteger('score2');

      const tournament = await Tournament.findOne({ guildId: interaction.guild.id, name: tournamentName, status: 'in_progress' });
      if (!tournament) return interaction.reply({ content: 'Tournament not found or not in progress.', ephemeral: true });

      const match = tournament.bracket.find(m => m.round === round && m.matchIndex === matchIndex);
      if (!match) return interaction.reply({ content: 'Match not found.', ephemeral: true });
      if (match.status === 'completed') return interaction.reply({ content: 'Match already completed.', ephemeral: true });

      match.winner = winner;
      match.score1 = score1;
      match.score2 = score2;
      match.status = 'completed';
      match.reporterId = interaction.user.id;

      // Advance winner to next round
      const nextRound = round + 1;
      const nextMatchIndex = Math.floor(matchIndex / 2);
      const nextMatch = tournament.bracket.find(m => m.round === nextRound && m.matchIndex === nextMatchIndex);

      if (nextMatch) {
        if (matchIndex % 2 === 0) {
          nextMatch.team1 = winner;
        } else {
          nextMatch.team2 = winner;
        }

        // Check if next match has both teams (auto-complete BYE)
        if (nextMatch.team1 === 'BYE' && nextMatch.team2) {
          nextMatch.winner = nextMatch.team2;
          nextMatch.status = 'completed';
        } else if (nextMatch.team2 === 'BYE' && nextMatch.team1) {
          nextMatch.winner = nextMatch.team1;
          nextMatch.status = 'completed';
        }
      }

      // Check if tournament is over
      const lastRound = Math.max(...tournament.bracket.map(m => m.round));
      if (round === lastRound) {
        tournament.status = 'completed';
        tournament.endedAt = new Date();
      }

      await tournament.save();
      await updateTournamentMessage(client, tournament);

      await interaction.reply({
        embeds: [createEmbed({
          title: 'Match Result Recorded',
          description: `**${match.team1}** ${score1} — ${score2} **${match.team2}**\nWinner: **${winner}**`,
          color: config.colors.success,
        })],
      });

      // Announce in channel
      const channel = interaction.guild.channels.cache.get(tournament.channelId);
      if (channel) {
        channel.send({
          embeds: [createEmbed({
            title: `Match Result — Round ${round}`,
            description: `**${match.team1}** ${score1} — ${score2} **${match.team2}**\n🏆 **${winner}** advances!`,
            color: 0x9B59B6,
          })],
        }).catch(() => {});
      }
    }

    if (sub === 'teams') {
      const tournamentName = interaction.options.getString('tournament');
      const tournament = await Tournament.findOne({ guildId: interaction.guild.id, name: tournamentName });
      if (!tournament) return interaction.reply({ content: 'Tournament not found.', ephemeral: true });

      const realTeams = tournament.teams.filter(t => t.name !== 'BYE');
      if (!realTeams.length) return interaction.reply({ content: 'No teams registered yet.', ephemeral: true });

      const lines = realTeams.map((t, i) =>
        `**#${i + 1}** ${t.name} — Captain: ${t.captainIgn} (${t.membersIgn.length ? `Members: ${t.membersIgn.join(', ')}` : 'Solo'})`
      );

      const embed = createEmbed({
        title: `Teams — ${tournament.name}`,
        description: lines.join('\n').slice(0, 4000),
        color: 0x9B59B6,
        fields: [
          { name: 'Total', value: `${realTeams.length}/${tournament.maxTeams}`, inline: true },
          { name: 'Status', value: tournament.status, inline: true },
        ],
      });

      await interaction.reply({ embeds: [embed] });
    }

    if (sub === 'delete') {
      const tournamentName = interaction.options.getString('tournament');
      const tournament = await Tournament.findOne({ guildId: interaction.guild.id, name: tournamentName });
      if (!tournament) return interaction.reply({ content: 'Tournament not found.', ephemeral: true });

      // Clean up category
      const category = interaction.guild.channels.cache.find(c => c.name === `tournament-${tournament.name.toLowerCase().replace(/\s+/g, '-')}`);
      if (category) {
        for (const [, ch] of category.children.cache) {
          await ch.delete().catch(() => {});
        }
        await category.delete().catch(() => {});
      }

      await Tournament.deleteOne({ _id: tournament._id });

      await interaction.reply({ content: `Tournament **${tournamentName}** deleted.`, ephemeral: true });
    }

    if (sub === 'checkin') {
      const tournamentName = interaction.options.getString('tournament');
      const tournament = await Tournament.findOne({ guildId: interaction.guild.id, name: tournamentName, status: 'registration' });
      if (!tournament) return interaction.reply({ content: 'Tournament not found or already started.', ephemeral: true });

      tournament.checkInEnabled = !tournament.checkInEnabled;
      if (tournament.checkInEnabled) {
        tournament.checkInTime = new Date();
      }
      await tournament.save();
      await updateTournamentMessage(client, tournament);

      await interaction.reply({
        content: `Check-in ${tournament.checkInEnabled ? '✅ Enabled' : '❌ Disabled'} for **${tournament.name}**.`,
        ephemeral: true,
      });
    }
  },
};

async function updateTournamentMessage(client, tournament) {
  try {
    const guild = client.guilds.cache.get(tournament.guildId);
    if (!guild) return;
    const channel = guild.channels.cache.get(tournament.channelId);
    if (!channel) return;
    const message = await channel.messages.fetch(tournament.messageId).catch(() => null);
    if (!message) return;

    const realTeams = tournament.teams.filter(t => t.name !== 'BYE');
    const hasBracket = tournament.bracket.length > 0;

    const embed = createEmbed({
      title: `🏆 ${tournament.name} — MCPE Asia Tournament`,
      description: `**Game Mode:** ${tournament.gameMode}\n**Team Size:** ${tournament.teamSize}\n**Status:** ${tournament.status === 'registration' ? '📝 Registration' : tournament.status === 'in_progress' ? '🔴 In Progress' : '✅ Completed'}`,
      color: 0x9B59B6,
      fields: [
        { name: 'Registered Teams', value: `${realTeams.length}/${tournament.maxTeams}`, inline: true },
        { name: 'Check-in', value: tournament.checkInEnabled ? '✅ Open' : '❌ Closed', inline: true },
        { name: 'Bracket', value: hasBracket ? '✅ Generated' : '❌ Not started', inline: true },
      ],
      footer: 'MCPE Asia Tournaments',
    });

    await message.edit({ embeds: [embed] });
  } catch {}
}
