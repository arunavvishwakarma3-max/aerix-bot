import { SlashCommandBuilder, ChannelType } from 'discord.js';
import Guild from '../../models/Guild.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setgoodbye')
    .setDescription('Configure goodbye messages')
    .addChannelOption(opt => opt.setName('channel').setDescription('Goodbye channel').addChannelTypes(ChannelType.GuildText))
    .addStringOption(opt => opt.setName('message').setDescription('Goodbye message ({member}, {server}, {username}, {tag}, {count})'))
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable/disable goodbye messages')),
  permissions: ['Administrator'],
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message');
    const enabled = interaction.options.getBoolean('enabled');

    const update = {};
    if (channel) update.goodbyeChannel = channel.id;
    if (message) update.goodbyeMessage = message;
    if (enabled !== null) update.goodbyeEnabled = enabled;

    await Guild.findOneAndUpdate({ guildId: interaction.guild.id }, update, { upsert: true });

    const embed = createEmbed({
      title: 'Goodbye Settings Updated',
      description: [
        channel ? `Channel: ${channel}` : null,
        message ? `Message: \`${message}\`` : null,
        enabled !== null ? `Enabled: ${enabled ? '✅ Yes' : '❌ No'}` : null,
      ].filter(Boolean).join('\n'),
      color: config.colors.success,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
