import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Role management commands')
    .addSubcommand(sub => sub.setName('add').setDescription('Add a role to a user').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)).addRoleOption(opt => opt.setName('role').setDescription('Role to add').setRequired(true)))
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove a role from a user').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)).addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true)))
    .addSubcommand(sub => sub.setName('create').setDescription('Create a new role').addStringOption(opt => opt.setName('name').setDescription('Role name').setRequired(true)).addStringOption(opt => opt.setName('color').setDescription('Hex color (e.g., #FF0000)')))
    .addSubcommand(sub => sub.setName('delete').setDescription('Delete a role').addRoleOption(opt => opt.setName('role').setDescription('Role to delete').setRequired(true)))
    .addSubcommand(sub => sub.setName('members').setDescription('List members with a role').addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true)))
    .addSubcommand(sub => sub.setName('color').setDescription('Change role color').addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true)).addStringOption(opt => opt.setName('color').setDescription('Hex color').setRequired(true))),
  category: 'roles',
  permissions: ['ManageRoles'],
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const user = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');
      const member = await interaction.guild.members.fetch(user.id);
      if (member.roles.cache.has(role.id)) return interaction.reply({ embeds: [createEmbed({ color: config.colors.warning, description: `${config.emoji.warning || '⚠️'} ${user} already has ${role}.` })], ephemeral: true });
      await member.roles.add(role);
      await interaction.reply({ embeds: [createEmbed({ color: config.colors.success, description: `${config.emoji.check || '✅'} Added ${role} to ${user}.` })] });
    }

    if (sub === 'remove') {
      const user = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');
      const member = await interaction.guild.members.fetch(user.id);
      if (!member.roles.cache.has(role.id)) return interaction.reply({ embeds: [createEmbed({ color: config.colors.warning, description: `${config.emoji.warning || '⚠️'} ${user} doesn't have ${role}.` })], ephemeral: true });
      await member.roles.remove(role);
      await interaction.reply({ embeds: [createEmbed({ color: config.colors.success, description: `${config.emoji.check || '✅'} Removed ${role} from ${user}.` })] });
    }

    if (sub === 'create') {
      const name = interaction.options.getString('name');
      const color = interaction.options.getString('color') || '#5865F2';
      const role = await interaction.guild.roles.create({ name, color, reason: `Created by ${interaction.user.tag}` });
      await interaction.reply({ embeds: [createEmbed({ color: config.colors.success, description: `${config.emoji.check || '✅'} Created role ${role}.` })] });
    }

    if (sub === 'delete') {
      const role = interaction.options.getRole('role');
      if (role.managed || role.id === interaction.guild.roles.everyone.id) {
        return interaction.reply({ embeds: [createEmbed({ color: config.colors.error, description: `${config.emoji.cross || '❌'} Cannot delete that role.` })], ephemeral: true });
      }
      await role.delete(`Deleted by ${interaction.user.tag}`);
      await interaction.reply({ embeds: [createEmbed({ color: config.colors.success, description: `${config.emoji.check || '✅'} Deleted role ${role.name}.` })] });
    }

    if (sub === 'members') {
      const role = interaction.options.getRole('role');
      const members = role.members.map(m => `<@${m.id}>`).join(', ') || 'None';
      await interaction.reply({ embeds: [createEmbed({ title: `Members with ${role.name}`, description: members.slice(0, 4000), color: role.color || config.colors.blurple })] });
    }

    if (sub === 'color') {
      const role = interaction.options.getRole('role');
      const color = interaction.options.getString('color').replace('#', '');
      if (!/^[0-9a-fA-F]{6}$/.test(color)) return interaction.reply({ embeds: [createEmbed({ color: config.colors.error, description: `${config.emoji.cross || '❌'} Invalid hex color.` })], ephemeral: true });
      await role.setColor(parseInt(color, 16));
      await interaction.reply({ embeds: [createEmbed({ color: parseInt(color, 16), description: `${config.emoji.check || '✅'} Changed ${role.name}'s color.` })] });
    }
  },
};
