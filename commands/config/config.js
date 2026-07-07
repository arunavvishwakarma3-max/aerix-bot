import { SlashCommandBuilder, ChannelType } from 'discord.js';
import Guild from '../../models/Guild.js';
import { createEmbed, successEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Server configuration settings')
    .addSubcommand(sub => sub.setName('view').setDescription('View all server settings'))
    .addSubcommand(sub => sub.setName('prefix').setDescription('Set custom prefix').addStringOption(opt => opt.setName('prefix').setDescription('New prefix').setRequired(true)))
    .addSubcommand(sub => sub.setName('autorole').setDescription('Set auto-role for new members').addRoleOption(opt => opt.setName('role').setDescription('Role to assign on join')))
    .addSubcommand(sub => sub.setName('membercount').setDescription('Set member count channel').addChannelOption(opt => opt.setName('channel').setDescription('Channel name').addChannelTypes(ChannelType.GuildVoice)))
    .addSubcommand(sub => sub.setName('muterole').setDescription('Set muted role').addRoleOption(opt => opt.setName('role').setDescription('Muted role'))),
  category: 'config',
  permissions: ['Administrator'],
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildData = await Guild.findOne({ guildId: interaction.guild.id }) || new Guild({ guildId: interaction.guild.id });
    const update = {};

    if (sub === 'view') {
      const embed = createEmbed({
        title: `${config.emoji.settings} Server Configuration`,
        color: config.colors.blurple,
        fields: [
          { name: 'Prefix', value: `\`${guildData.prefix || config.prefix}\``, inline: true },
          { name: 'Autorole', value: guildData.autorole ? `<@&${guildData.autorole}>` : 'Not set', inline: true },
          { name: 'Muted Role', value: guildData.mutedRole ? `<@&${guildData.mutedRole}>` : 'Not set', inline: true },
          { name: 'Leveling', value: guildData.levelingEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Economy', value: guildData.economyEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'AutoMod', value: guildData.automodEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Log Channel', value: guildData.logChannel ? `<#${guildData.logChannel}>` : 'Not set', inline: true },
          { name: 'Welcome', value: guildData.welcomeEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Goodbye', value: guildData.goodbyeEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
        ],
        footer: `${interaction.guild.name} • Use /config <setting> to change`,
      });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'prefix') {
      update.prefix = interaction.options.getString('prefix');
      await interaction.reply({ embeds: [successEmbed(`Prefix changed to \`${update.prefix}\``)] });
    }

    if (sub === 'autorole') {
      const role = interaction.options.getRole('role');
      update.autorole = role?.id || null;
      await interaction.reply({ embeds: [successEmbed(role ? `Autorole set to ${role}` : 'Autorole removed')] });
    }

    if (sub === 'membercount') {
      update.memberCountChannel = interaction.options.getChannel('channel')?.id || null;
      const ch = interaction.options.getChannel('channel');
      await interaction.reply({ embeds: [successEmbed(ch ? `Member count channel set to ${ch}` : 'Member count channel removed')] });
    }

    if (sub === 'muterole') {
      const role = interaction.options.getRole('role');
      update.mutedRole = role?.id || null;
      await interaction.reply({ embeds: [successEmbed(role ? `Muted role set to ${role}` : 'Muted role removed')] });
    }

    await Guild.findOneAndUpdate({ guildId: interaction.guild.id }, update, { upsert: true });
  },
};
