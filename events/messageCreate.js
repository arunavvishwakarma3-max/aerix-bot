import Guild from '../models/Guild.js';
import User from '../models/User.js';
import { createEmbed } from '../utils/embed.js';
import config from '../config.js';
import logger from '../utils/logger.js';

export default {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;

    if (message.mentions.has(client.user) && (message.content.trim() === `<@${client.user.id}>` || message.content.trim() === `<@!${client.user.id}>`)) {
      const categories = {};
      for (const [, cmd] of client.commands) {
        const cat = cmd.category || 'other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(cmd.data.name);
      }
      const sortedCats = Object.keys(categories).sort();
      const totalCmds = client.commands.size;

      const categoryEmojis = {
        admin: '🛠️', anime: '🎌', automod: '🛡️', config: '⚙️', economy: '💰',
        fun: '🎮', games: '🎲', giveaway: '🎉', images: '🖼️', info: 'ℹ️',
        leveling: '📊', logging: '📝', management: '👑', moderation: '🔨',
        music: '🎵', nsfw: '🔞', owner: '👑', 'reaction-roles': '🎭',
        roles: '👤', social: '💬', text: '📝', ticket: '🎫', tournament: '🏆',
        utility: '🔧', voice: '🔊', welcome: '👋',
      };

      const embed = createEmbed({
        title: `${config.emoji.shield} ${client.user.username} — Command Center`,
        description: [
          `\`\`\`diff`,
          `+ System: ONLINE`,
          `+ Modules: ${sortedCats.length}`,
          `+ Commands: ${totalCmds}`,
          `\`\`\``,
          '',
          `Use \`/help\` to explore all features.`,
        ].join('\n'),
        color: config.colors.cyber,
        fields: sortedCats.map(cat => ({
          name: `${categoryEmojis[cat] || '📁'} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
          value: `${categories[cat].length} commands`,
          inline: true,
        })),
        footer: `AERIX • /help for details`,
        thumbnail: client.user.displayAvatarURL(),
      });

      await message.reply({ embeds: [embed] });
      return;
    }

    let prefix = config.prefix;
    try {
      const guildData = await Guild.findOne({ guildId: message.guild.id });
      prefix = guildData?.prefix || config.prefix;

      if (!message.content.startsWith(prefix) && guildData?.levelingEnabled !== false) {
        const userData = await User.findOne({ userId: message.author.id, guildId: message.guild.id });
        if (userData) {
          const now = Date.now();
          const cooldown = config.levels.xpCooldown;
          if (!userData.lastXp || now - userData.lastXp.getTime() > cooldown) {
            const xpGain = Math.floor(Math.random() * 10) + config.levels.xpPerMessage;
            userData.xp += xpGain;
            userData.totalXp = (userData.totalXp || 0) + xpGain;
            userData.lastXp = new Date(now);

            const xpNeeded = Math.floor(config.levels.baseLevelXp * Math.pow(config.levels.levelXpMultiplier, userData.level - 1));
            if (userData.xp >= xpNeeded) {
              userData.level += 1;
              userData.xp = 0;

              const lvlMsg = guildData?.levelUpMessage || config.levels.levelUpMessage;
              const replacements = { '{member}': `<@${message.author.id}>`, '{level}': userData.level, '{user}': message.author.username, '{server}': message.guild.name };
              let finalMsg = lvlMsg;
              for (const [key, val] of Object.entries(replacements)) finalMsg = finalMsg.replaceAll(key, val);

              if (guildData?.levelUpChannel) {
                const ch = message.guild.channels.cache.get(guildData.levelUpChannel);
                if (ch) ch.send({ content: finalMsg }).catch(() => {});
              } else {
                message.channel.send({ content: finalMsg }).catch(() => {});
              }
            }
            await userData.save();
          }
        } else {
          await new User({ userId: message.author.id, guildId: message.guild.id }).save();
        }
      }
    } catch {}

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    const command = client.commands.get(commandName) || [...client.commands.values()].find(cmd => cmd.data?.aliases?.includes(commandName));
    if (!command || !command.messageRun) return;

    if (command.permissions) {
      const missing = command.permissions.filter(perm => !message.member.permissions.has(perm));
      if (missing.length > 0) {
        return message.reply({ embeds: [createEmbed({ color: config.colors.error, description: `${config.emoji.cross} You need: \`${missing.join(', ')}\`` })] });
      }
    }

    try {
      await command.messageRun(message, args, client);
      logger.command(`${message.author.tag} used ${prefix}${commandName}`);
    } catch (error) {
      logger.error('Prefix command error:', error);
      message.reply({ content: `${config.emoji.error} An error occurred executing that command.` }).catch(() => {});
    }
  },
};
