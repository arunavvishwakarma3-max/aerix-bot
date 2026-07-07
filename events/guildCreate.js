import { EmbedBuilder } from 'discord.js';
import logger from '../utils/logger.js';
import config from '../config.js';

export default {
  name: 'guildCreate',
  async execute(guild, client) {
    logger.info(`Joined guild: ${guild.name} (${guild.id})`);

    const commandData = [...client.commands.values()].map(c => c.data.toJSON());
    const batch = commandData.slice(0, 100);
    await guild.commands.set(batch).catch(() => {});
    if (commandData.length > 100) {
      logger.warn(`[guildCreate] ${guild.name}: Only deployed first 100/${commandData.length} commands`);
    }

    const systemChannel = guild.systemChannel;
    if (systemChannel) {
      const embed = new EmbedBuilder()
        .setTitle(`${config.emoji.shield} AERIX Online`)
        .setDescription([
          `Thanks for inviting **AERIX**!`,
          '',
          `I'm armed with **${commandData.length} advanced modules** to protect and manage your server.`,
          '',
          `**${config.emoji.terminal} Quick Start:**`,
          `\`/setup\` — Launch the setup wizard`,
          `\`/help\` — Browse all commands`,
          `\`/antinuke\` — Configure security`,
          '',
          `Let's get started!`,
        ].join('\n'))
        .setColor(config.colors.cyber)
        .setFooter({ text: 'AERIX • Next-Gen Security', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      systemChannel.send({ embeds: [embed] }).catch(() => null);
    }
  },
};
