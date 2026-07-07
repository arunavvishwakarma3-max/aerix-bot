import { SlashCommandBuilder, ChannelType, PermissionsBitField } from 'discord.js';
import Guild from '../../models/Guild.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('Configure Anti-Nuke protection system')
    .addSubcommand(sub => sub
      .setName('toggle')
      .setDescription('Enable or disable anti-nuke')
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('limits')
      .setDescription('Set rate limits for anti-nuke')
      .addIntegerOption(opt => opt.setName('bans').setDescription('Max bans per minute (default: 3)').setMinValue(1).setMaxValue(20))
      .addIntegerOption(opt => opt.setName('kicks').setDescription('Max kicks per minute (default: 3)').setMinValue(1).setMaxValue(20))
      .addIntegerOption(opt => opt.setName('channels').setDescription('Max channel deletions per minute (default: 2)').setMinValue(1).setMaxValue(20))
      .addIntegerOption(opt => opt.setName('roles').setDescription('Max role deletions per minute (default: 2)').setMinValue(1).setMaxValue(20)))
    .addSubcommand(sub => sub
      .setName('action')
      .setDescription('Set punishment action when limit exceeded')
      .addStringOption(opt => opt.setName('action').setDescription('Punishment action').setRequired(true)
        .addChoices({ name: 'Ban', value: 'ban' }, { name: 'Kick', value: 'kick' })))
    .addSubcommand(sub => sub
      .setName('whitelist')
      .setDescription('Add/remove whitelisted users or roles')
      .addStringOption(opt => opt.setName('type').setDescription('Whitelist type').setRequired(true)
        .addChoices({ name: 'User', value: 'user' }, { name: 'Role', value: 'role' }))
      .addStringOption(opt => opt.setName('action').setDescription('Add or remove').setRequired(true)
        .addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }))
      .addUserOption(opt => opt.setName('user').setDescription('User (if type is user)'))
      .addRoleOption(opt => opt.setName('role').setDescription('Role (if type is role)')))
    .addSubcommand(sub => sub
      .setName('log')
      .setDescription('Set anti-nuke log channel')
      .addChannelOption(opt => opt.setName('channel').setDescription('Log channel').addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(sub => sub
      .setName('stats')
      .setDescription('View anti-nuke configuration & status')),
  permissions: [PermissionsBitField.Flags.Administrator],
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildData = await Guild.findOne({ guildId: interaction.guild.id }) || new Guild({ guildId: interaction.guild.id });
    let antiSettings = guildData.antinukeSettings || {};

    if (sub === 'toggle') {
      const enabled = interaction.options.getBoolean('enabled');
      antiSettings.enabled = enabled;
      await Guild.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { antinukeSettings: antiSettings },
        { upsert: true },
      );
      const embed = createEmbed({
        title: `${config.emoji.shield} Anti-Nuke ${enabled ? 'Armed' : 'Disarmed'}`,
        description: `Anti-Nuke protection has been **${enabled ? 'ACTIVATED' : 'DEACTIVATED'}**.`,
        color: enabled ? config.colors.success : config.colors.error,
        footer: 'AERIX • Security Systems',
      });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'limits') {
      const bans = interaction.options.getInteger('bans');
      const kicks = interaction.options.getInteger('kicks');
      const channels = interaction.options.getInteger('channels');
      const roles = interaction.options.getInteger('roles');
      if (bans) antiSettings.maxBansPerMinute = bans;
      if (kicks) antiSettings.maxKicksPerMinute = kicks;
      if (channels) antiSettings.maxChannelDeletesPerMinute = channels;
      if (roles) antiSettings.maxRoleDeletesPerMinute = roles;
      await Guild.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { antinukeSettings: antiSettings },
        { upsert: true },
      );
      const embed = createEmbed({
        title: `${config.emoji.shield} Anti-Nuke Limits Updated`,
        color: config.colors.cyber,
        fields: [
          { name: 'Max Bans/min', value: `\`${antiSettings.maxBansPerMinute ?? config.antinuke.maxBansPerMinute}\``, inline: true },
          { name: 'Max Kicks/min', value: `\`${antiSettings.maxKicksPerMinute ?? config.antinuke.maxKicksPerMinute}\``, inline: true },
          { name: 'Max Channel Deletes/min', value: `\`${antiSettings.maxChannelDeletesPerMinute ?? config.antinuke.maxChannelDeletesPerMinute}\``, inline: true },
          { name: 'Max Role Deletes/min', value: `\`${antiSettings.maxRoleDeletesPerMinute ?? config.antinuke.maxRoleDeletesPerMinute}\``, inline: true },
        ],
        footer: 'AERIX • Security Systems',
      });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'action') {
      const action = interaction.options.getString('action');
      antiSettings.punishAction = action;
      await Guild.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { antinukeSettings: antiSettings },
        { upsert: true },
      );
      const embed = createEmbed({
        title: `${config.emoji.shield} Punishment Set`,
        description: `Violators will now be **${action.toUpperCase()}ED**.`,
        color: config.colors.cyber,
        footer: 'AERIX • Security Systems',
      });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'whitelist') {
      const type = interaction.options.getString('type');
      const action = interaction.options.getString('action');
      const user = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');

      if (type === 'user' && !user) return interaction.reply({ content: 'Please provide a user.', ephemeral: true });
      if (type === 'role' && !role) return interaction.reply({ content: 'Please provide a role.', ephemeral: true });

      if (!antiSettings.whitelistedUsers) antiSettings.whitelistedUsers = [];
      if (!antiSettings.whitelistedRoles) antiSettings.whitelistedRoles = [];

      let target, list, listName;
      if (type === 'user') {
        target = user.id;
        list = antiSettings.whitelistedUsers;
        listName = 'Users';
      } else {
        target = role.id;
        list = antiSettings.whitelistedRoles;
        listName = 'Roles';
      }

      if (action === 'add') {
        if (list.includes(target)) return interaction.reply({ content: 'Already whitelisted.', ephemeral: true });
        list.push(target);
      } else {
        const idx = list.indexOf(target);
        if (idx === -1) return interaction.reply({ content: 'Not in whitelist.', ephemeral: true });
        list.splice(idx, 1);
      }

      await Guild.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { antinukeSettings: antiSettings },
        { upsert: true },
      );

      const embed = createEmbed({
        title: `${config.emoji.check} Whitelist Updated`,
        description: `${type === 'user' ? user.tag : role.name} has been **${action === 'add' ? 'added to' : 'removed from'}** the whitelist.`,
        color: config.colors.cyber,
        footer: 'AERIX • Security Systems',
      });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'log') {
      const channel = interaction.options.getChannel('channel');
      antiSettings.logChannel = channel?.id || null;
      await Guild.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { antinukeSettings: antiSettings },
        { upsert: true },
      );
      const embed = createEmbed({
        title: `${config.emoji.shield} Log Channel Set`,
        description: channel ? `Anti-Nuke logs will be sent to ${channel}.` : 'Log channel cleared.',
        color: config.colors.cyber,
        footer: 'AERIX • Security Systems',
      });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'stats') {
      const isEnabled = antiSettings.enabled ?? config.antinuke.enabled;
      const status = isEnabled ? `${config.emoji.check} ARMED` : `${config.emoji.cross} DISARMED`;
      const embed = createEmbed({
        title: `${config.emoji.shield} Anti-Nuke Control Panel`,
        description: [
          `\`\`\`diff`,
          `${isEnabled ? '+ SYSTEM: ACTIVE' : '- SYSTEM: DISABLED'}`,
          `${antiSettings.punishAction ? `+ Punishment: ${antiSettings.punishAction.toUpperCase()}` : '+ Punishment: BAN'}`,
          `\`\`\``,
        ].join('\n'),
        color: isEnabled ? config.colors.success : config.colors.error,
        fields: [
          { name: 'Status', value: status, inline: true },
          { name: 'Punishment', value: `\`${(antiSettings.punishAction || config.antinuke.punishAction).toUpperCase()}\``, inline: true },
          { name: 'Log Channel', value: antiSettings.logChannel ? `<#${antiSettings.logChannel}>` : 'Not set', inline: true },
          { name: 'Max Bans/min', value: `\`${antiSettings.maxBansPerMinute ?? config.antinuke.maxBansPerMinute}\``, inline: true },
          { name: 'Max Kicks/min', value: `\`${antiSettings.maxKicksPerMinute ?? config.antinuke.maxKicksPerMinute}\``, inline: true },
          { name: 'Max Channel Deletes/min', value: `\`${antiSettings.maxChannelDeletesPerMinute ?? config.antinuke.maxChannelDeletesPerMinute}\``, inline: true },
          { name: 'Max Role Deletes/min', value: `\`${antiSettings.maxRoleDeletesPerMinute ?? config.antinuke.maxRoleDeletesPerMinute}\``, inline: true },
          { name: 'Whitelisted Users', value: antiSettings.whitelistedUsers?.length ? antiSettings.whitelistedUsers.map(id => `<@${id}>`).join(', ') : 'None', inline: true },
          { name: 'Whitelisted Roles', value: antiSettings.whitelistedRoles?.length ? antiSettings.whitelistedRoles.map(id => `<@&${id}>`).join(', ') : 'None', inline: true },
        ],
        footer: 'AERIX • Security Systems',
        timestamp: true,
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
      });
      return interaction.reply({ embeds: [embed] });
    }
  },
};
