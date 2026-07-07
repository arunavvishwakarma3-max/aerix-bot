import { SlashCommandBuilder } from 'discord.js';
import Guild from '../../models/Guild.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Set the auto-role for new members')
    .addRoleOption(opt => opt.setName('role').setDescription('Role to auto-assign').setRequired(true)),
  category: 'roles',
  permissions: ['Administrator'],
  async execute(interaction) {
    const role = interaction.options.getRole('role');
    if (role.managed || role.id === interaction.guild.roles.everyone.id) {
      return interaction.reply({ embeds: [createEmbed({ color: config.colors.error, description: `${config.emoji.cross || '❌'} Cannot auto-assign that role.` })], ephemeral: true });
    }
    await Guild.findOneAndUpdate({ guildId: interaction.guild.id }, { autorole: role.id }, { upsert: true });
    await interaction.reply({ embeds: [createEmbed({ color: config.colors.success, description: `${config.emoji.check || '✅'} Autorole set to ${role}. New members will get this role.` })] });
  },
};
