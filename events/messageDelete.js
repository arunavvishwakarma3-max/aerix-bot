import Guild from '../models/Guild.js';
import { createEmbed } from '../utils/embed.js';

const snipeCache = new Map();

export default {
  name: 'messageDelete',
  async execute(message) {
    if (message.author?.bot || !message.guild) return;

    const snipeData = {
      content: message.content || '*Embed/System*',
      author: message.author.tag,
      authorId: message.author.id,
      authorAvatar: message.author.displayAvatarURL({ dynamic: true }),
      channel: message.channel.id,
      deletedAt: Date.now(),
      attachments: message.attachments?.first()?.url || null,
    };

    if (!snipeCache.has(message.guild.id)) snipeCache.set(message.guild.id, new Map());
    snipeCache.get(message.guild.id).set(message.channel.id, snipeData);

    // Log
    let guildData;
    try { guildData = await Guild.findOne({ guildId: message.guild.id }); } catch {}
    if (!guildData?.logChannel || !guildData.logEvents?.includes('messageDelete')) return;

    const logChannel = message.guild.channels.cache.get(guildData.logChannel);
    if (!logChannel) return;

    const embed = createEmbed({
      title: 'Message Deleted',
      color: 0xED4245,
      fields: [
        { name: 'Author', value: message.author.tag, inline: true },
        { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
        { name: 'Content', value: message.content?.slice(0, 1024) || '*No content*' },
      ],
      footer: `Author ID: ${message.author.id}`,
    });

    if (message.attachments?.first()) embed.setImage(message.attachments.first().url);
    await logChannel.send({ embeds: [embed] }).catch(() => {});
  },
};

export { snipeCache };
