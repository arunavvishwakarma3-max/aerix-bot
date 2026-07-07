import { EmbedBuilder } from 'discord.js';
import config from '../config.js';

export function createEmbed(options = {}) {
  const embed = new EmbedBuilder()
    .setColor(options.color ?? config.colors.primary)
    .setTimestamp();

  if (options.title) embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.fields) embed.addFields(options.fields);
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);
  if (options.url) embed.setURL(options.url);
  if (options.footer) {
    embed.setFooter({ text: options.footer, iconURL: options.footerIcon || undefined });
  }
  if (options.author) {
    embed.setAuthor({ name: options.author, iconURL: options.authorIcon || undefined });
  }

  return embed;
}

export function panelEmbed(options = {}) {
  const embed = new EmbedBuilder()
    .setColor(options.color ?? config.colors.primary)
    .setTimestamp();

  if (options.title) embed.setTitle(`\`\`\`${options.title}\`\`\``);
  if (options.description) embed.setDescription(options.description);
  if (options.fields) embed.addFields(options.fields);
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);
  if (options.footer) {
    embed.setFooter({ text: options.footer, iconURL: options.footerIcon || undefined });
  }
  if (options.author) {
    embed.setAuthor({ name: options.author, iconURL: options.authorIcon || undefined });
  }

  return embed;
}

export function successEmbed(description, title) {
  return createEmbed({
    title: title || 'Success',
    description: `${config.emoji.check} ${description}`,
    color: config.colors.success,
  });
}

export function errorEmbed(description, title) {
  return createEmbed({
    title: title || 'Error',
    description: `${config.emoji.cross} ${description}`,
    color: config.colors.error,
  });
}

export function warningEmbed(description, title) {
  return createEmbed({
    title: title || 'Warning',
    description: `${config.emoji.warning} ${description}`,
    color: config.colors.warning,
  });
}

export function infoEmbed(description, title) {
  return createEmbed({
    title: title || 'Information',
    description: `${config.emoji.info} ${description}`,
    color: config.colors.info,
  });
}
