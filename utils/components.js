import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function row(...components) {
  return new ActionRowBuilder().addComponents(components);
}

export function button(id, label, style = ButtonStyle.Secondary, emoji) {
  const b = new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
  if (emoji) b.setEmoji(emoji);
  return b;
}

export function primaryButton(id, label, emoji) {
  return button(id, label, ButtonStyle.Primary, emoji);
}

export function successButton(id, label, emoji) {
  return button(id, label, ButtonStyle.Success, emoji);
}

export function dangerButton(id, label, emoji) {
  return button(id, label, ButtonStyle.Danger, emoji);
}

export function linkButton(url, label, emoji) {
  const b = new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(url);
  if (emoji) b.setEmoji(emoji);
  return b;
}

export function confirmCancelRow(confirmId = 'confirm-yes', cancelId = 'confirm-no') {
  return row(
    successButton(confirmId, 'Confirm', '✅'),
    dangerButton(cancelId, 'Cancel', '❌'),
  );
}
