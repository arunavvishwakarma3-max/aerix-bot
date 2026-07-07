import { SlashCommandBuilder, ChannelType } from 'discord.js';
import Guild from '../../models/Guild.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure auto-moderation')
    .addSubcommand(sub => sub.setName('toggle').setDescription('Enable/disable automod').addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true)))
    .addSubcommand(sub => sub.setName('caps').setDescription('Configure caps protection').addBooleanOption(opt => opt.setName('enabled').setDescription('Enable/disable').setRequired(true)).addIntegerOption(opt => opt.setName('limit').setDescription('Caps percentage limit (0-100)').setMinValue(0).setMaxValue(100)))
    .addSubcommand(sub => sub.setName('links').setDescription('Configure link protection').addBooleanOption(opt => opt.setName('enabled').setDescription('Enable/disable').setRequired(true)).addStringOption(opt => opt.setName('whitelist').setDescription('Comma-separated whitelisted domains')))
    .addSubcommand(sub => sub.setName('badwords').setDescription('Manage banned words').addStringOption(opt => opt.setName('action').setDescription('Add or remove').setRequired(true).addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' })).addStringOption(opt => opt.setName('word').setDescription('Word to add/remove').setRequired(true)))
    .addSubcommand(sub => sub.setName('log').setDescription('Set automod log channel').addChannelOption(opt => opt.setName('channel').setDescription('Log channel').addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(sub => sub.setName('settings').setDescription('View automod settings')),
  permissions: ['Administrator'],
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const update = {};
    let description = '';

    if (sub === 'toggle') {
      update.automodEnabled = interaction.options.getBoolean('enabled');
      description = `AutoMod ${update.automodEnabled ? '✅ Enabled' : '❌ Disabled'}`;
    }

    if (sub === 'caps') {
      update.automodCapsEnabled = interaction.options.getBoolean('enabled');
      const limit = interaction.options.getInteger('limit');
      if (limit !== null) update.automodCapsLimit = limit;
      description = `Caps protection ${update.automodCapsEnabled ? '✅ Enabled' : '❌ Disabled'}`;
      if (limit !== null) description += ` (Limit: ${limit}%)`;
    }

    if (sub === 'links') {
      update.automodLinksEnabled = interaction.options.getBoolean('enabled');
      const whitelist = interaction.options.getString('whitelist');
      if (whitelist) update.automodLinksWhitelist = whitelist.split(',').map(s => s.trim());
      description = `Link protection ${update.automodLinksEnabled ? '✅ Enabled' : '❌ Disabled'}`;
    }

    if (sub === 'badwords') {
      const action = interaction.options.getString('action');
      const word = interaction.options.getString('word').toLowerCase();

      const guildData = await Guild.findOne({ guildId: interaction.guild.id });
      const badWords = guildData?.automodBadWords || [];

      if (action === 'add') {
        if (badWords.includes(word)) return interaction.reply({ content: 'Word already in list.', ephemeral: true });
        badWords.push(word);
        description = `Added \`${word}\` to bad words.`;
      } else {
        const idx = badWords.indexOf(word);
        if (idx === -1) return interaction.reply({ content: 'Word not in list.', ephemeral: true });
        badWords.splice(idx, 1);
        description = `Removed \`${word}\` from bad words.`;
      }
      update.automodBadWords = badWords;
    }

    if (sub === 'log') {
      const channel = interaction.options.getChannel('channel');
      update.automodLogChannel = channel?.id || null;
      description = channel ? `Log channel set to ${channel}` : 'Log channel cleared';
    }

    if (sub === 'settings') {
      const guildData = await Guild.findOne({ guildId: interaction.guild.id });
      if (!guildData) return interaction.reply({ content: 'No settings configured yet.', ephemeral: true });

      const embed = createEmbed({
        title: 'AutoMod Settings',
        color: config.colors.primary,
        fields: [
          { name: 'Enabled', value: guildData.automodEnabled ? '✅ Yes' : '❌ No', inline: true },
          { name: 'Caps Protection', value: guildData.automodCapsEnabled ? `✅ (${guildData.automodCapsLimit || 70}%)` : '❌', inline: true },
          { name: 'Link Protection', value: guildData.automodLinksEnabled ? '✅' : '❌', inline: true },
          { name: 'Bad Words', value: guildData.automodBadWords?.length ? guildData.automodBadWords.map(w => `\`${w}\``).join(', ').slice(0, 1024) : 'None' },
          { name: 'Max Mentions', value: String(guildData.automodMaxMentions || 5), inline: true },
          { name: 'Log Channel', value: guildData.automodLogChannel ? `<#${guildData.automodLogChannel}>` : 'Not set', inline: true },
        ],
      });

      return interaction.reply({ embeds: [embed] });
    }

    if (Object.keys(update).length > 0) {
      await Guild.findOneAndUpdate({ guildId: interaction.guild.id }, update, { upsert: true });
    }

    const embed = createEmbed({
      title: 'AutoMod Updated',
      description,
      color: config.colors.success,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
