import { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed } from './embed.js';
import config from '../config.js';

const categoryEmojis = {
  admin: '🛠️', anime: '🎌', automod: '🛡️', config: '⚙️', economy: '💰',
  fun: '🎮', games: '🎲', giveaway: '🎉', images: '🖼️', info: 'ℹ️',
  leveling: '📊', logging: '📝', management: '👑', moderation: '🔨',
  music: '🎵', nsfw: '🔞', owner: '👑', 'reaction-roles': '🎭',
  roles: '👤', social: '💬', text: '📝', ticket: '🎫', tournament: '🏆',
  utility: '🔧', voice: '🔊', welcome: '👋',
};

const categoryDescriptions = {
  admin: 'Server setup & configuration tools',
  automod: 'Automated content filtering & protection',
  config: 'Server-wide bot settings & preferences',
  economy: 'Virtual currency & economic systems',
  giveaway: 'Prize giveaways & winner management',
  info: 'Real-time data lookups & information',
  leveling: 'XP, ranks & level-up rewards',
  logging: 'Server activity tracking & audit logs',
  management: 'Advanced server management tools',
  moderation: 'Member punishment & server control',
  music: 'High-quality music playback',
  'reaction-roles': 'Self-assignable role menus',
  roles: 'Role management & assignment',
  ticket: 'Private support ticket system',
  tournament: 'Competitive bracket tournaments',
  utility: 'General purpose utility commands',
  welcome: 'Custom join/leave message system',
};

export async function handleSelectMenu(interaction, client) {
  if (interaction.customId === 'help-select') {
    const category = interaction.values[0];
    const commands = [...client.commands.values()].filter(c => c.category === category);
    const catEmoji = categoryEmojis[category] || '📁';
    const catName = category.charAt(0).toUpperCase() + category.slice(1);
    const desc = categoryDescriptions[category] || '';

    const embed = createEmbed({
      title: `${catEmoji} ${catName} Module`,
      description: [
        `\`\`\`${desc}\`\`\``,
        '',
        commands.map(c => `\`/${c.data.name}\` — ${c.data.description}`).join('\n') || 'No commands available',
      ].join('\n'),
      color: config.colors.cyber,
      footer: 'AERIX • Use /help command: for details',
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help-select')
      .setPlaceholder('🔍 Select another module...')
      .addOptions(
        [...new Set([...client.commands.values()].map(c => c.category))].filter(Boolean).sort().map(cat => ({
          label: `${categoryEmojis[cat] || '📁'} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
          value: cat,
          description: `${[...client.commands.values()].filter(c => c.category === cat).length} commands`,
        })),
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const quickLinks = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Support')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/RppzN9DyX')
        .setEmoji('🆘'),
      new ButtonBuilder()
        .setLabel('Invite')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`)
        .setEmoji('📨'),
    );

    await interaction.update({ embeds: [embed], components: [row, quickLinks] });
    return;
  }
}
