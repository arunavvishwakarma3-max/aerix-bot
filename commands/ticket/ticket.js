import { SlashCommandBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import Ticket from '../../models/Ticket.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket management commands')
    .addSubcommand(sub => sub.setName('add').setDescription('Add a user to the ticket').addUserOption(opt => opt.setName('user').setDescription('User to add').setRequired(true)))
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove a user from the ticket').addUserOption(opt => opt.setName('user').setDescription('User to remove').setRequired(true)))
    .addSubcommand(sub => sub.setName('rename').setDescription('Rename the ticket').addStringOption(opt => opt.setName('name').setDescription('New name').setRequired(true)))
    .addSubcommand(sub => sub.setName('close').setDescription('Close the ticket'))
    .addSubcommand(sub => sub.setName('claim').setDescription('Claim the ticket')),
  async execute(interaction) {
    const ticket = await Ticket.findOne({ channelId: interaction.channelId, status: 'open' });
    if (!ticket) return interaction.reply({ content: 'This is not an active ticket channel.', ephemeral: true });

    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const user = interaction.options.getUser('user');
      await interaction.channel.permissionOverwrites.create(user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
      await interaction.reply({ content: `Added ${user} to the ticket.` });
    }

    if (sub === 'remove') {
      const user = interaction.options.getUser('user');
      await interaction.channel.permissionOverwrites.delete(user.id).catch(() => {});
      await interaction.reply({ content: `Removed ${user} from the ticket.` });
    }

    if (sub === 'rename') {
      const name = interaction.options.getString('name');
      await interaction.channel.setName(`ticket-${name.replace(/\s+/g, '-')}`);
      await interaction.reply({ content: `Renamed ticket to \`ticket-${name.replace(/\s+/g, '-')}\`.` });
    }

    if (sub === 'close') {
      if (!interaction.member.permissions.has('ManageGuild') && interaction.user.id !== ticket.userId) {
        return interaction.reply({ content: 'You cannot close this ticket.', ephemeral: true });
      }
      ticket.status = 'closed';
      ticket.closedBy = interaction.user.id;
      ticket.closedAt = new Date();
      await ticket.save();

      await interaction.reply({ embeds: [createEmbed({ title: 'Ticket Closed', description: `Closed by ${interaction.user.tag}`, color: config.colors.error })] });
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }

    if (sub === 'claim') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({ content: 'Only staff can claim tickets.', ephemeral: true });
      }
      ticket.claimedBy = interaction.user.id;
      await ticket.save();
      await interaction.reply({ content: `Ticket claimed by ${interaction.user}.` });
    }
  },
};
