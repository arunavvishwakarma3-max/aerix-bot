import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Get server information'),
  async execute(interaction) {
    const guild = interaction.guild;
    const owner = await guild.fetchOwner();
    const channels = guild.channels.cache;
    const textChannels = channels.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = channels.filter(c => c.type === ChannelType.GuildVoice).size;

    const embed = createEmbed({
      title: guild.name,
      thumbnail: guild.iconURL({ dynamic: true, size: 512 }),
      color: config.colors.primary,
      fields: [
        { name: 'Owner', value: owner.user.tag, inline: true },
        { name: 'ID', value: guild.id, inline: true },
        { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Members', value: guild.memberCount.toLocaleString(), inline: true },
        { name: 'Channels', value: `💬 ${textChannels} | 🔊 ${voiceChannels}`, inline: true },
        { name: 'Roles', value: String(guild.roles.cache.size), inline: true },
        { name: 'Boosts', value: `${guild.premiumSubscriptionCount || 0} (Level ${guild.premiumTier})`, inline: true },
      ],
      footer: `Shard: ${guild.shardId}`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
