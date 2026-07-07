import { createEmbed } from './embed.js';
import Guild from '../models/Guild.js';
import config from '../config.js';

export async function handleModal(interaction, client) {
  // === SETUP WIZARD MODALS ===
  if (interaction.customId === 'setup-welcome-modal') {
    const channelId = interaction.fields.getTextInputValue('setup-welcome-channel');
    const message = interaction.fields.getTextInputValue('setup-welcome-message');

    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) return interaction.reply({ content: `${config.emoji.cross} Invalid channel ID.`, ephemeral: true });

    await Guild.findOneAndUpdate(
      { guildId: interaction.guild.id },
      {
        welcomeEnabled: true,
        welcomeChannel: channelId,
        welcomeMessage: message,
      },
      { upsert: true },
    );

    const embed = createEmbed({
      title: `${config.emoji.check} Welcome System Configured`,
      description: `Welcome messages will be sent to ${channel}.`,
      color: config.colors.success,
      footer: 'AERIX • Welcome System',
    });
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (interaction.customId === 'setup-tickets-modal') {
    const categoryId = interaction.fields.getTextInputValue('setup-tickets-category');
    const roleId = interaction.fields.getTextInputValue('setup-tickets-role');

    const category = interaction.guild.channels.cache.get(categoryId);
    if (!category || category.type !== 4) return interaction.reply({ content: `${config.emoji.cross} Invalid category ID.`, ephemeral: true });
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) return interaction.reply({ content: `${config.emoji.cross} Invalid role ID.`, ephemeral: true });

    const ticketChannel = await interaction.guild.channels.create({
      name: 'create-ticket',
      type: 0,
      parent: categoryId,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone.id, allow: ['ViewChannel', 'ReadMessageHistory'] },
        { id: client.user.id, allow: ['SendMessages', 'ManageMessages', 'ReadMessageHistory'] },
      ],
    });

    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
    const panelEmbed = new EmbedBuilder()
      .setTitle(`${config.emoji.ticket} Support Ticket System`)
      .setDescription('Click the button below to create a ticket. A private channel will be created where you can discuss with staff.')
      .setColor(config.colors.navy)
      .addFields(
        { name: 'Guidelines', value: '• Do not create multiple tickets for the same issue\n• Be respectful to staff members\n• Close your ticket when resolved' },
      )
      .setFooter({ text: 'AERIX • Ticket System' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket-create')
        .setLabel('Create Ticket')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🎫'),
    );

    await ticketChannel.send({ embeds: [panelEmbed], components: [row] });

    await Guild.findOneAndUpdate(
      { guildId: interaction.guild.id },
      {
        ticketCategory: categoryId,
        ticketChannel: ticketChannel.id,
        ticketRole: roleId,
      },
      { upsert: true },
    );

    const embed = createEmbed({
      title: `${config.emoji.check} Ticket System Online`,
      description: `**Category:** ${category}\n**Support Role:** ${role}\n**Panel:** ${ticketChannel}`,
      color: config.colors.success,
      footer: 'AERIX • Ticket System',
    });
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (interaction.customId === 'setup-logging-modal') {
    const channelId = interaction.fields.getTextInputValue('setup-logging-channel');
    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) return interaction.reply({ content: `${config.emoji.cross} Invalid channel ID.`, ephemeral: true });

    await Guild.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { logChannel: channelId },
      { upsert: true },
    );

    const embed = createEmbed({
      title: `${config.emoji.check} Logging Configured`,
      description: `Server logs will be sent to ${channel}.`,
      color: config.colors.success,
      footer: 'AERIX • Logging System',
    });
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  // === TOURNAMENT REGISTRATION MODAL ===
  if (interaction.customId === 'tournament-register-modal') {
    const teamName = interaction.fields.getTextInputValue('tournament-team-name');
    const captainIgn = interaction.fields.getTextInputValue('tournament-captain-ign');
    const membersStr = interaction.fields.getTextInputValue('tournament-members');

    const Tournament = (await import('../models/Tournament.js')).default;
    const tournament = await Tournament.findOne({
      guildId: interaction.guild.id,
      status: 'registration',
      channelId: interaction.channelId,
    });

    if (!tournament) return interaction.reply({ content: `${config.emoji.cross} Tournament not found or registration closed.`, ephemeral: true });

    if (tournament.teams.some(t => t.name.toLowerCase() === teamName.toLowerCase())) {
      return interaction.reply({ content: `${config.emoji.cross} Team name already taken.`, ephemeral: true });
    }

    if (tournament.teams.length >= tournament.maxTeams) {
      return interaction.reply({ content: `${config.emoji.cross} Tournament is full!`, ephemeral: true });
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

    const embed = createEmbed({
      title: `${config.emoji.check} Team Registered`,
      description: `**${teamName}** registered for **${tournament.name}**\nCaptain: ${captainIgn}\nMembers: ${members.length ? members.join(', ') : 'None'}`,
      color: config.colors.success,
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });

    const guild = interaction.client.guilds.cache.get(tournament.guildId);
    if (guild) {
      const channel = guild.channels.cache.get(tournament.channelId);
      if (channel) {
        try {
          const message = await channel.messages.fetch(tournament.messageId);
          const realTeams = tournament.teams.filter(t => t.name !== 'BYE');
          const updatedEmbed = createEmbed({
            title: `🏆 ${tournament.name}`,
            description: `**Game Mode:** ${tournament.gameMode}\n**Team Size:** ${tournament.teamSize}\n**Status:** 📝 Registration`,
            color: config.colors.primary,
            fields: [
              { name: 'Registered Teams', value: `${realTeams.length}/${tournament.maxTeams}`, inline: true },
              { name: 'Check-in', value: tournament.checkInEnabled ? `${config.emoji.check} Open` : `${config.emoji.cross} Closed`, inline: true },
            ],
            footer: tournament.name,
          });
          await message.edit({ embeds: [updatedEmbed] });
        } catch {}
      }
    }
  }
}
