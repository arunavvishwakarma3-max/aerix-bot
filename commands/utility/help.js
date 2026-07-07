import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

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

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Explore all Aerix commands & features')
    .addStringOption(opt => opt.setName('command').setDescription('Get detailed info for a specific command'))
    .addStringOption(opt => opt.setName('category').setDescription('Browse commands by category')
      .addChoices(
        { name: 'Admin', value: 'admin' },
        { name: 'AutoMod', value: 'automod' },
        { name: 'Config', value: 'config' },
        { name: 'Economy', value: 'economy' },
        { name: 'Giveaway', value: 'giveaway' },
        { name: 'Info', value: 'info' },
        { name: 'Leveling', value: 'leveling' },
        { name: 'Logging', value: 'logging' },
        { name: 'Management', value: 'management' },
        { name: 'Moderation', value: 'moderation' },
        { name: 'Music', value: 'music' },
        { name: 'Reaction Roles', value: 'reaction-roles' },
        { name: 'Roles', value: 'roles' },
        { name: 'Ticket', value: 'ticket' },
        { name: 'Tournament', value: 'tournament' },
        { name: 'Utility', value: 'utility' },
        { name: 'Welcome', value: 'welcome' },
        { name: 'Fun', value: 'fun' },
      )),
  async execute(interaction, client) {
    const specificCommand = interaction.options.getString('command');
    const categoryFilter = interaction.options.getString('category');

    if (specificCommand) {
      const cmd = client.commands.get(specificCommand.toLowerCase());
      if (!cmd) {
        return interaction.reply({
          embeds: [createEmbed({
            title: `${config.emoji.cross} Command Not Found`,
            description: `\`/${specificCommand}\` was not found. Use \`/help\` to browse all commands.`,
            color: config.colors.error,
            footer: 'AERIX • Next-Gen Security',
          })],
          ephemeral: true,
        });
      }
      const cat = cmd.category || 'other';
      const catEmoji = categoryEmojis[cat] || '📁';
      const embed = createEmbed({
        title: `${catEmoji} /${cmd.data.name}`,
        description: [
          `\`\`\`${cmd.data.description || 'No description provided.'}\`\`\``,
          '',
          `**${config.emoji.dashboard} Category:** ${catEmoji} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
          `**${config.emoji.time} Cooldown:** ${cmd.cooldown ? `⏱️ ${cmd.cooldown}s` : '⚡ None'}`,
          `**${config.emoji.mod} Permissions:** ${cmd.permissions?.length ? cmd.permissions.map(p => `\`${p}\``).join(', ') : 'None required'}`,
        ].join('\n'),
        color: config.colors.cyber,
        footer: `AERIX • /${cmd.data.name}`,
        thumbnail: client.user.displayAvatarURL(),
      });
      return interaction.reply({ embeds: [embed] });
    }

    const categories = {};
    for (const [name, cmd] of client.commands) {
      const cat = cmd.category || 'other';
      if (categoryFilter && cat !== categoryFilter) continue;
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(name);
    }

    const sortedCats = Object.keys(categories).sort();
    const totalCmds = Object.values(categories).flat().length;

    if (categoryFilter) {
      const catEmoji = categoryEmojis[categoryFilter] || '📁';
      const catName = categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1);
      const cmds = categories[categoryFilter];
      const desc = categoryDescriptions[categoryFilter] || '';
      const embed = createEmbed({
        title: `${catEmoji} ${catName} Module`,
        description: [
          `\`\`\`${desc}\`\`\``,
          '',
          cmds.map(c => `\`/${c}\``).join(' '),
        ].join('\n'),
        color: config.colors.cyber,
        footer: `${totalCmds} commands • ${sortedCats.length} categories`,
        thumbnail: client.user.displayAvatarURL(),
      });
      return interaction.reply({ embeds: [embed] });
    }

    const totalCommands = client.commands.size;
    const totalCategories = sortedCats.length;

    const embed = createEmbed({
      title: `${config.emoji.shield} AERIX — Command Center`,
      description: [
        `\`\`\`diff`,
        `+ System: ONLINE`,
        `+ Modules: ${totalCategories}`,
        `+ Commands: ${totalCommands}`,
        `\`\`\``,
        '',
        `**${config.emoji.terminal} OVERVIEW**`,
        `AERIX is armed with **${totalCommands} premium commands** across **${totalCategories} categories**.`,
        `Use the menu below to explore each module, or run \`/help command:\` for details on a specific command.`,
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'),
      color: config.colors.cyber,
      fields: sortedCats.map(cat => ({
        name: `${categoryEmojis[cat] || '📁'} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
        value: `\`${categories[cat].length}\` cmds • ${categoryDescriptions[cat] || ''}`,
        inline: true,
      })),
      footer: `AERIX • ${totalCommands} Modules Armed`,
      timestamp: true,
      thumbnail: client.user.displayAvatarURL(),
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help-select')
      .setPlaceholder('🔍 Select a module to explore...')
      .addOptions(
        sortedCats.map(cat => ({
          label: `${categoryEmojis[cat] || '📁'} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
          value: cat,
          description: `${categories[cat].length} commands • ${categoryDescriptions[cat] || ''}`.slice(0, 100),
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
      new ButtonBuilder()
        .setLabel('Dashboard')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/RppzN9DyX')
        .setEmoji('📊'),
    );

    await interaction.reply({ embeds: [embed], components: [row, quickLinks] });
  },
};
