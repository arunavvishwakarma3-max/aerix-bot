import { SlashCommandBuilder, ChannelType, EmbedBuilder } from 'discord.js';
import Guild from '../../models/Guild.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setwelcome')
    .setDescription('Configure welcome messages')
    .addChannelOption(opt => opt.setName('channel').setDescription('Welcome channel').addChannelTypes(ChannelType.GuildText))
    .addStringOption(opt => opt.setName('message').setDescription('Welcome message ({member}, {server}, {username}, {tag}, {count})'))
    .addBooleanOption(opt => opt.setName('image').setDescription('Enable welcome image (requires canvas package)'))
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable/disable welcome messages')),
  permissions: ['Administrator'],
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message');
    const image = interaction.options.getBoolean('image');
    const enabled = interaction.options.getBoolean('enabled');

    const update = {};
    if (channel) update.welcomeChannel = channel.id;
    if (message) update.welcomeMessage = message;
    if (image !== null) update.welcomeImage = image;
    if (enabled !== null) update.welcomeEnabled = enabled;

    await Guild.findOneAndUpdate({ guildId: interaction.guild.id }, update, { upsert: true });

    const embed = createEmbed({
      title: 'Welcome Settings Updated',
      description: [
        channel ? `Channel: ${channel}` : null,
        message ? `Message: \`${message}\`` : null,
        image !== null ? `Image: ${image ? '✅ Enabled' : '❌ Disabled'}` : null,
        enabled !== null ? `Enabled: ${enabled ? '✅ Yes' : '❌ No'}` : null,
      ].filter(Boolean).join('\n'),
      color: config.colors.success,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
