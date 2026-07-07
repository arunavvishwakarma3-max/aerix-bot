import Guild from '../models/Guild.js';
import logger from '../utils/logger.js';
import config from '../config.js';

const actionLog = new Map();
const WHITELIST_CHECK_INTERVAL = 60000;

function getLog(guildId) {
  if (!actionLog.has(guildId)) actionLog.set(guildId, new Map());
  return actionLog.get(guildId);
}

function getCount(guildId, actionType) {
  const log = getLog(guildId);
  const now = Date.now();
  const window = 60000;
  if (!log.has(actionType)) log.set(actionType, []);
  const timestamps = log.get(actionType).filter(t => now - t < window);
  log.set(actionType, timestamps);
  return timestamps.length;
}

function addAction(guildId, actionType) {
  const log = getLog(guildId);
  if (!log.has(actionType)) log.set(actionType, []);
  log.get(actionType).push(Date.now());
}

function isWhitelisted(member) {
  if (!member) return false;
  const antiCfg = config.antinuke;
  if (antiCfg.whitelistedUsers.includes(member.id)) return true;
  if (member.roles?.cache?.some(r => antiCfg.whitelistedRoles.includes(r.id))) return true;
  return false;
}

async function getGuildSettings(guildId) {
  try {
    const guildData = await Guild.findOne({ guildId });
    if (guildData?.antinukeSettings) return guildData.antinukeSettings;
  } catch {}
  return {};
}

async function handleAction(guild, actionType, executor, target) {
  if (!guild || !executor) return;
  if (executor.id === guild.ownerId) return;
  if (isWhitelisted(executor)) return;

  const settings = await getGuildSettings(guild.id);
  const limits = {
    ban: settings.maxBansPerMinute ?? config.antinuke.maxBansPerMinute,
    kick: settings.maxKicksPerMinute ?? config.antinuke.maxKicksPerMinute,
    channelDelete: settings.maxChannelDeletesPerMinute ?? config.antinuke.maxChannelDeletesPerMinute,
    channelCreate: settings.maxChannelCreatesPerMinute ?? config.antinuke.maxChannelCreatesPerMinute,
    roleDelete: settings.maxRoleDeletesPerMinute ?? config.antinuke.maxRoleDeletesPerMinute,
    roleCreate: settings.maxRoleCreatesPerMinute ?? config.antinuke.maxRoleCreatesPerMinute,
  };

  const enabled = settings.enabled ?? config.antinuke.enabled;
  if (!enabled) return;

  addAction(guild.id, actionType);
  const count = getCount(guild.id, actionType);
  const limit = limits[actionType] || 3;

  if (count > limit) {
    const punishAction = settings.punishAction || config.antinuke.punishAction;
    const logChannelId = settings.logChannel || config.antinuke.logChannel;

    if (logChannelId) {
      const logChannel = guild.channels.cache.get(logChannelId);
      if (logChannel) {
        const { createEmbed } = await import('../utils/embed.js');
        const embed = createEmbed({
          title: `${config.emoji.shield} Anti-Nuke Triggered`,
          color: config.colors.error,
          fields: [
            { name: 'User', value: `${executor.tag} (${executor.id})`, inline: true },
            { name: 'Action', value: actionType, inline: true },
            { name: 'Count', value: `${count}/${limit} per min`, inline: true },
            { name: 'Punishment', value: punishAction.toUpperCase(), inline: true },
            { name: 'Target', value: target || 'N/A', inline: true },
          ],
          timestamp: true,
          footer: 'AERIX • Anti-Nuke System',
        });
        logChannel.send({ embeds: [embed] }).catch(() => {});
      }
    }

    try {
      const member = await guild.members.fetch(executor.id).catch(() => null);
      if (member && member.bannable) {
        if (punishAction === 'ban') {
          await member.ban({ reason: `[AERIX Anti-Nuke] Rate limit exceeded: ${actionType} (${count}/${limit})` });
        } else if (punishAction === 'kick') {
          await member.kick(`[AERIX Anti-Nuke] Rate limit exceeded: ${actionType} (${count}/${limit})`);
        }
      }
    } catch (error) {
      logger.warn(`Anti-nuke failed to punish ${executor.tag}: ${error.message}`);
    }
  }
}

export async function handleGuildBanAdd(ban) {
  await handleAction(ban.guild, 'ban', ban.user);
}

export async function handleGuildBanRemove(ban) {
  if (!ban.guild) return;
  const auditLogs = await ban.guild.fetchAuditLogs({ type: 23, limit: 1 }).catch(() => null);
  if (!auditLogs || !auditLogs.entries.first()) return;
  const { executor, target } = auditLogs.entries.first();
  if (target.id !== ban.user.id) return;
  await handleAction(ban.guild, 'unban', executor, ban.user.tag);
}

export async function handleChannelDelete(channel) {
  if (!channel.guild) return;
  const auditLogs = await channel.guild.fetchAuditLogs({ type: 12, limit: 1 }).catch(() => null);
  if (!auditLogs || !auditLogs.entries.first()) return;
  const { executor } = auditLogs.entries.first();
  await handleAction(channel.guild, 'channelDelete', executor, channel.name);
}

export async function handleChannelCreate(channel) {
  if (!channel.guild) return;
  const auditLogs = await channel.guild.fetchAuditLogs({ type: 10, limit: 1 }).catch(() => null);
  if (!auditLogs || !auditLogs.entries.first()) return;
  const { executor } = auditLogs.entries.first();
  await handleAction(channel.guild, 'channelCreate', executor, channel.name);
}

export async function handleRoleDelete(role) {
  if (!role.guild) return;
  const auditLogs = await role.guild.fetchAuditLogs({ type: 32, limit: 1 }).catch(() => null);
  if (!auditLogs || !auditLogs.entries.first()) return;
  const { executor } = auditLogs.entries.first();
  await handleAction(role.guild, 'roleDelete', executor, role.name);
}

export async function handleRoleCreate(role) {
  if (!role.guild) return;
  const auditLogs = await role.guild.fetchAuditLogs({ type: 30, limit: 1 }).catch(() => null);
  if (!auditLogs || !auditLogs.entries.first()) return;
  const { executor } = auditLogs.entries.first();
  await handleAction(role.guild, 'roleCreate', executor, role.name);
}

export async function handleGuildMemberKick(member) {
  if (!member.guild) return;
  const auditLogs = await member.guild.fetchAuditLogs({ type: 20, limit: 1 }).catch(() => null);
  if (!auditLogs || !auditLogs.entries.first()) return;
  const { executor, target } = auditLogs.entries.first();
  if (target.id !== member.id) return;
  await handleAction(member.guild, 'kick', executor, member.user.tag);
}
