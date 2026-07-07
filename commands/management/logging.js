import { SlashCommandBuilder, ChannelType } from 'discord.js';
import Guild from '../../models/Guild.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('logging')
    .setDescription('Configure logging')
    .addChannelOption(opt => opt.setName('channel').setDescription('Log channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addStringOption(opt => opt.setName('events').setDescription('Comma-separated events to log (messageDelete, memberJoin, memberLeave, channelCreate, channelDelete)')),
  permissions: ['Administrator'],
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const events = interaction.options.getString('events');
    const eventsList = events ? events.split(',').map(s => s.trim()) : ['messageDelete', 'memberJoin', 'memberLeave'];

    await Guild.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { logChannel: channel.id, logEvents: eventsList },
      { upsert: true },
    );

    const embed = createEmbed({
      title: 'Logging Configured',
      description: `Channel: ${channel}\nEvents: ${eventsList.map(e => `\`${e}\``).join(', ')}`,
      color: config.colors.success,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
