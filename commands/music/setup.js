import { SlashCommandBuilder, ChannelType, PermissionsBitField } from 'discord.js';
import Guild from '../../models/Guild.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('music-setup')
    .setDescription('Configure music system settings')
    .addChannelOption(opt => opt.setName('channel').setDescription('Dedicated music text channel for now-playing panel').addChannelTypes(ChannelType.GuildText))
    .addRoleOption(opt => opt.setName('djrole').setDescription('DJ role (bypasses vote-skip, etc.)'))
    .addIntegerOption(opt => opt.setName('volume').setDescription('Default volume (0-100)').setMinValue(0).setMaxValue(100)),
  permissions: [PermissionsBitField.Flags.ManageGuild],
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const djRole = interaction.options.getRole('djrole');
    const volume = interaction.options.getInteger('volume');
    const update = {};

    if (channel) update.musicChannel = channel.id;
    if (djRole) update.musicDjRole = djRole.id;
    if (volume !== null) update.musicDefaultVolume = volume;

    if (Object.keys(update).length > 0) {
      await Guild.findOneAndUpdate({ guildId: interaction.guild.id }, update, { upsert: true });
    }

    const fields = [];
    if (channel) fields.push({ name: 'Music Channel', value: channel.toString(), inline: true });
    if (djRole) fields.push({ name: 'DJ Role', value: djRole.toString(), inline: true });
    if (volume !== null) fields.push({ name: 'Default Volume', value: `${volume}%`, inline: true });

    const embed = createEmbed({
      title: `${config.emoji.music || '🎵'} Music Setup`,
      description: fields.length ? 'Music system configured.' : 'No changes made. Use options to configure.',
      color: config.colors.success,
      fields,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
