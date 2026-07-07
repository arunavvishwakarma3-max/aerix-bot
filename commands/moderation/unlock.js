import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a channel')
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel to unlock')),
  permissions: [PermissionsBitField.Flags.ManageChannels],
  botPermissions: [PermissionsBitField.Flags.ManageChannels],
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    await channel.permissionOverwrites.create(interaction.guild.roles.everyone, { SendMessages: null });

    const embed = createEmbed({
      title: 'Channel Unlocked',
      description: `${channel} has been unlocked.`,
      color: config.colors.success,
    });
    await interaction.reply({ embeds: [embed] });
  },
};
