import { PermissionFlagsBits } from 'discord.js';

export const Permissions = {
  ADMIN: PermissionFlagsBits.Administrator,
  MANAGE_GUILD: PermissionFlagsBits.ManageGuild,
  MANAGE_MESSAGES: PermissionFlagsBits.ManageMessages,
  MANAGE_ROLES: PermissionFlagsBits.ManageRoles,
  MANAGE_CHANNELS: PermissionFlagsBits.ManageChannels,
  KICK_MEMBERS: PermissionFlagsBits.KickMembers,
  BAN_MEMBERS: PermissionFlagsBits.BanMembers,
  MODERATE_MEMBERS: PermissionFlagsBits.ModerateMembers,
};

export function hasPermission(member, permission) {
  return member.permissions.has(permission);
}

export function hasAnyPermission(member, perms) {
  return perms.some((perm) => member.permissions.has(perm));
}
