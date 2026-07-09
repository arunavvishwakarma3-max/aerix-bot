import { ActivityType, EmbedBuilder } from 'discord.js';
import { loadGiveaways } from '../utils/giveawayManager.js';
import logger from '../utils/logger.js';
import config from '../config.js';

const startupLog = new Set();

export default {
  name: 'ready',
  once: true,
  async execute(client) {
    const totalUsers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
    const cmdCount = client.commands.size;
    const categories = [...new Set([...client.commands.values()].map(c => c.category))].length;
    const synced = client.guilds.cache.size;

    logger.success(`Logged in as ${client.user.tag}`);
    logger.info(`✦ ${synced} servers  ✦ ${totalUsers} users  ✦ ${cmdCount} commands  ✦ ${categories} categories`);

    const presenceMessages = [
      `${synced} servers protected`,
      `${cmdCount} advanced commands`,
      `/help — explore Aerix`,
      `✦ ${totalUsers} users tracked ✦`,
      `Anti-Nuke • AutoMod • Security`,
      `arunavvishwakarma3-max.github.io/aerix-bot`,
    ];
    let presenceIndex = 0;
    client.user.setPresence({
      activities: [{ name: presenceMessages[0], type: ActivityType.Watching }],
      status: 'online',
    });
    setInterval(() => {
      presenceIndex = (presenceIndex + 1) % presenceMessages.length;
      client.user.setPresence({
        activities: [{ name: presenceMessages[presenceIndex], type: ActivityType.Watching }],
        status: 'online',
      });
    }, 30000);

    const commandData = [...client.commands.values()].map(c => c.data.toJSON());
    const totalCmds = commandData.length;
    try {
      if (client.config.guildId) {
        const guild = client.guilds.cache.get(client.config.guildId);
        if (guild) {
          const batch = commandData.slice(0, 100);
          await guild.commands.set(batch);
          if (totalCmds > 100) logger.warn(`Guild registration limited to 100/${totalCmds} commands (Discord limit)`);
        }
      }
      if (client.application) {
        const batch = commandData.slice(0, 100);
        await client.application.commands.set(batch);
        if (totalCmds > 100) logger.warn(`Global registration limited to 100/${totalCmds} commands. Verify your bot to unlock 200 command slots.`);
      }
      logger.success(`Registered ${Math.min(totalCmds, 100)} slash commands (${totalCmds} total available)`);
    } catch (error) {
      logger.error('Failed to register slash commands:', error.message);
    }

    try {
      await loadGiveaways(client);
    } catch (error) {
      logger.warn('Could not load giveaways');
    }

    if (client.config.guildId && !startupLog.has(client.config.guildId)) {
      startupLog.add(client.config.guildId);
      const guild = client.guilds.cache.get(client.config.guildId);
      if (guild) {
        const channel = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased?.() && c.permissionsFor(client.user)?.has('SendMessages'));
        if (channel) {
          const embed = new EmbedBuilder()
            .setTitle(`${config.emoji.shield} AERIX System Online`)
            .setDescription([
              `\`\`\`diff`,
              `+ ${client.user.tag} fully operational`,
              `+ Security systems armed`,
              `+ ${cmdCount} modules loaded`,
              `\`\`\``,
            ].join('\n'))
            .addFields(
              { name: `${config.emoji.globe} Servers`, value: `${synced}`, inline: true },
              { name: `${config.emoji.member} Users`, value: `${totalUsers}`, inline: true },
              { name: `${config.emoji.terminal} Commands`, value: `${cmdCount}`, inline: true },
              { name: `${config.emoji.dashboard} Categories`, value: `${categories}`, inline: true },
              { name: `${config.emoji.ping} Latency`, value: `${client.ws.ping}ms`, inline: true },
              { name: `${config.emoji.shield} Anti-Nuke`, value: '`ARMED`', inline: true },
            )
            .setColor(config.colors.cyber)
            .setTimestamp()
            .setFooter({ text: 'AERIX • Next-Gen Security', iconURL: client.user.displayAvatarURL() });
          channel.send({ embeds: [embed] }).catch(() => {});
        }
      }
    }
  },
};
