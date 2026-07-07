import { SlashCommandBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import Guild from '../../models/Guild.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription('Set up the ticket system')
    .addChannelOption(opt => opt.setName('category').setDescription('Category for tickets').setRequired(true).addChannelTypes(ChannelType.GuildCategory))
    .addRoleOption(opt => opt.setName('support-role').setDescription('Role that can see tickets').setRequired(true))
    .addChannelOption(opt => opt.setName('log-channel').setDescription('Channel for ticket logs').setRequired(false).addChannelTypes(ChannelType.GuildText))
    .addStringOption(opt => opt.setName('message').setDescription('Custom ticket message').setRequired(false)),
  permissions: ['Administrator'],
  async execute(interaction) {
    const category = interaction.options.getChannel('category');
    const supportRole = interaction.options.getRole('support-role');
    const logChannel = interaction.options.getChannel('log-channel');
    const message = interaction.options.getString('message') || 'Please describe your issue and a staff member will assist you.';

    await interaction.deferReply();

    // Create ticket creation channel
    const ticketChannel = await interaction.guild.channels.create({
      name: 'create-ticket',
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone.id, allow: ['ViewChannel', 'ReadMessageHistory'] },
        { id: interaction.client.user.id, allow: ['SendMessages', 'ManageMessages', 'ReadMessageHistory'] },
      ],
    });

    // Premium ticket panel embed
    const panelEmbed = new EmbedBuilder()
      .setTitle(`${config.emoji.ticket} Support Ticket System`)
      .setDescription(message)
      .setColor(config.colors.navy)
      .addFields(
        { name: 'How it works', value: 'Click the button below to create a ticket. A private channel will be created where you can discuss with staff.', inline: false },
        { name: 'Guidelines', value: '• Do not create multiple tickets for the same issue\n• Be respectful to staff members\n• Close your ticket when resolved', inline: false },
      )
      .setFooter({ text: `${interaction.guild.name} • Ticket System`, iconURL: interaction.guild.iconURL() })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket-create')
        .setLabel('Create Ticket')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🎫'),
    );

    await ticketChannel.send({ embeds: [panelEmbed], components: [row] });

    // Save to database
    await Guild.findOneAndUpdate(
      { guildId: interaction.guild.id },
      {
        ticketCategory: category.id,
        ticketChannel: ticketChannel.id,
        ticketRole: supportRole.id,
        ticketLogChannel: logChannel?.id || null,
        ticketMessage: message,
      },
      { upsert: true },
    );

    const embed = createEmbed({
      title: `${config.emoji.check} Ticket System Online`,
      description: [
        `**Category:** ${category}`,
        `**Support Role:** ${supportRole}`,
        `**Panel Channel:** ${ticketChannel}`,
        logChannel ? `**Log Channel:** ${logChannel}` : null,
      ].filter(Boolean).join('\n'),
      color: config.colors.success,
      footer: 'Members can now create tickets',
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
