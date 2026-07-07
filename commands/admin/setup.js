import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import Guild from '../../models/Guild.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Launch the AERIX server setup wizard'),
  category: 'admin',
  permissions: ['Administrator'],
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle(`${config.emoji.shield} AERIX — Server Setup Wizard`)
      .setDescription([
        `\`\`\`diff`,
        `+ Configure your server with AERIX`,
        `+ Select a module below to begin`,
        `\`\`\``,
        '',
        `${config.emoji.settings} **Available Modules**`,
        '',
      ].join('\n'))
      .setColor(config.colors.cyber)
      .addFields(
        { name: `${config.emoji.text} │ Welcome`, value: 'Custom join/goodbye messages with images', inline: true },
        { name: `${config.emoji.ticket} │ Tickets`, value: 'Private support ticket system', inline: true },
        { name: `${config.emoji.shield} │ AutoMod`, value: 'AI-powered content filtering', inline: true },
        { name: `${config.emoji.level} │ Leveling`, value: 'XP, ranks & role rewards', inline: true },
        { name: `${config.emoji.stats} │ Logging`, value: 'Complete audit log system', inline: true },
      )
      .setFooter({ text: 'AERIX • Setup Wizard', iconURL: interaction.guild.iconURL() })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('setup-welcome').setLabel('Welcome').setStyle(ButtonStyle.Success).setEmoji('👋'),
      new ButtonBuilder().setCustomId('setup-tickets').setLabel('Tickets').setStyle(ButtonStyle.Primary).setEmoji('🎫'),
      new ButtonBuilder().setCustomId('setup-automod').setLabel('AutoMod').setStyle(ButtonStyle.Danger).setEmoji('🛡️'),
      new ButtonBuilder().setCustomId('setup-leveling').setLabel('Leveling').setStyle(ButtonStyle.Secondary).setEmoji('📊'),
      new ButtonBuilder().setCustomId('setup-logging').setLabel('Logging').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
    );

    const supportRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Documentation')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/RppzN9DyX')
        .setEmoji('📖'),
      new ButtonBuilder()
        .setCustomId('setup-antinuke')
        .setLabel('Anti-Nuke')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔐'),
    );

    await interaction.reply({ embeds: [embed], components: [row, supportRow] });
  },
};
