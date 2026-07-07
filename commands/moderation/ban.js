import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(opt => opt.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Ban reason'))
    .addIntegerOption(opt => opt.setName('days').setDescription('Delete messages from (days)').setMinValue(0).setMaxValue(7)),
  permissions: [PermissionsBitField.Flags.BanMembers],
  botPermissions: [PermissionsBitField.Flags.BanMembers],
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const days = interaction.options.getInteger('days') || 0;

    if (!user) return interaction.reply({ content: 'User not found.', ephemeral: true });

    const member = interaction.guild.members.cache.get(user.id);
    if (member && member.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ content: 'You cannot ban this user due to role hierarchy.', ephemeral: true });
    }

    await interaction.guild.members.ban(user, { reason, deleteMessageSeconds: days * 86400 });

    const embed = createEmbed({
      title: 'Member Banned',
      color: config.colors.error,
      fields: [
        { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Reason', value: reason },
        { name: 'Deleted Messages', value: `Last ${days} day(s)` },
      ],
    });

    await interaction.reply({ embeds: [embed] });
  },
  async messageRun(message, args) {
    if (args.length < 1) return message.reply('Usage: !ban <user> [reason]');
    const user = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
    if (!user) return message.reply('User not found.');
    const reason = args.slice(1).join(' ') || 'No reason';
    const member = message.guild.members.cache.get(user.id);
    if (member?.bannable) {
      await message.guild.members.ban(user, { reason });
      await message.reply(`Banned ${user.tag} | Reason: ${reason}`);
    } else {
      await message.reply('I cannot ban that user.');
    }
  },
};
