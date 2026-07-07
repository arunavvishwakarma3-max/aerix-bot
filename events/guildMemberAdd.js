import Guild from '../models/Guild.js';
import { createEmbed } from '../utils/embed.js';
import config from '../config.js';

export default {
  name: 'guildMemberAdd',
  async execute(member) {
    if (member.user.bot) return;

    let guildData;
    try { guildData = await Guild.findOne({ guildId: member.guild.id }); } catch {}
    if (!guildData?.welcomeEnabled || !guildData.welcomeChannel) return;

    const channel = member.guild.channels.cache.get(guildData.welcomeChannel);
    if (!channel) return;

    const message = guildData.welcomeMessage
      .replace(/{member}/g, member.toString())
      .replace(/{server}/g, member.guild.name)
      .replace(/{username}/g, member.user.username)
      .replace(/{tag}/g, member.user.tag)
      .replace(/{count}/g, member.guild.memberCount);

    if (guildData.welcomeImage) {
      try {
        const { createWelcomeImage } = await import('../utils/canvas.js');
        const image = await createWelcomeImage(member);
        const embed = createEmbed({
          title: 'Welcome to the server!',
          description: message,
          color: config.colors.success,
          image: 'attachment://welcome.png',
          footer: `Member #${member.guild.memberCount}`,
        });
        await channel.send({ embeds: [embed], files: [{ attachment: image, name: 'welcome.png' }] });
        return;
      } catch {}
    }

    const embed = createEmbed({
      title: `${config.emoji.star} Welcome!`,
      description: message,
      color: config.colors.gold,
      thumbnail: member.user.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Member Count', value: String(member.guild.memberCount), inline: true },
      ],
    });
    await channel.send({ embeds: [embed] });

    // Auto-assign muted role
    if (guildData.mutedRole && member.communicationDisabledUntil) {
      const mutedRole = member.guild.roles.cache.get(guildData.mutedRole);
      if (mutedRole) {
        try { await member.roles.add(mutedRole); } catch {}
      }
    }
  },
};
