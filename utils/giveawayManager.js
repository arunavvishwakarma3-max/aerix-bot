import { EmbedBuilder } from 'discord.js';
import Giveaway from '../models/Giveaway.js';
import config from '../config.js';
import logger from './logger.js';

export async function loadGiveaways(client) {
  const giveaways = await Giveaway.find({ ended: false });
  for (const giveaway of giveaways) {
    const timeLeft = giveaway.endTime.getTime() - Date.now();
    if (timeLeft <= 0) {
      await endGiveaway(client, giveaway);
    } else {
      setTimeout(() => endGiveaway(client, giveaway), timeLeft);
    }
  }
  logger.success(`Loaded ${giveaways.length} active giveaways`);
}

export async function endGiveaway(client, giveaway) {
  try {
    const guild = client.guilds.cache.get(giveaway.guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(giveaway.channelId);
    if (!channel) return;

    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (!message) return;

    const validEntrants = giveaway.entrants.filter(id => {
      const member = guild.members.cache.get(id);
      if (!member) return false;
      if (giveaway.requiredRole && !member.roles.cache.has(giveaway.requiredRole)) return false;
      return true;
    });

    let winners = [];
    if (validEntrants.length > 0) {
      const shuffled = [...validEntrants].sort(() => Math.random() - 0.5);
      winners = shuffled.slice(0, giveaway.winnerCount);
    }

    giveaway.ended = true;
    giveaway.winners = winners;
    await giveaway.save();

    const embed = EmbedBuilder.from(message.embeds[0])
      .setColor(config.colors.error)
      .setFooter({ text: 'Giveaway ended' });

    await message.edit({ embeds: [embed], components: [] });

    const winnerText = winners.length > 0
      ? winners.map(id => `<@${id}>`).join(', ')
      : 'No valid entrants';

    await channel.send(`🎉 **Giveaway ended!** Winners: ${winnerText}\nPrize: **${giveaway.prize}**`);
  } catch (error) {
    logger.error('Error ending giveaway:', error);
  }
}
