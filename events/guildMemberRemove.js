import Guild from '../models/Guild.js';
import { createEmbed } from '../utils/embed.js';
import config from '../config.js';

export default {
  name: 'guildMemberRemove',
  async execute(member) {
    if (member.user.bot) return;

    let guildData;
    try { guildData = await Guild.findOne({ guildId: member.guild.id }); } catch {}
    if (!guildData?.goodbyeEnabled || !guildData.goodbyeChannel) return;

    const channel = member.guild.channels.cache.get(guildData.goodbyeChannel);
    if (!channel) return;

    const message = guildData.goodbyeMessage
      .replace(/{member}/g, member.user.username)
      .replace(/{server}/g, member.guild.name)
      .replace(/{username}/g, member.user.username)
      .replace(/{tag}/g, member.user.tag)
      .replace(/{count}/g, member.guild.memberCount);

    const embed = createEmbed({
      title: `${config.emoji.warning} Goodbye!`,
      description: message,
      color: config.colors.warning,
      thumbnail: member.user.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: 'Joined Server', value: member.joinedAt ? `<t:${Math.floor(member.joinedAt / 1000)}:R>` : 'Unknown', inline: true },
        { name: 'Member Count', value: String(member.guild.memberCount), inline: true },
      ],
    });
    await channel.send({ embeds: [embed] });
  },
};
