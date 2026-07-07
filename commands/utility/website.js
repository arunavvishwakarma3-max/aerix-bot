import { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('website')
    .setDescription('Get the official AERIX website link'),
  category: 'utility',
  async execute(interaction) {
    const embed = createEmbed({
      title: `${config.emoji.globe} AERIX Website`,
      description: 'Visit the official AERIX website for features, info, and more.',
      color: config.colors.cyber,
      fields: [
        { name: 'Link', value: '[aerix.bot](https://arunavvishwakarma3-max.github.io/aerix-bot)' },
      ],
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Visit Website')
        .setStyle(ButtonStyle.Link)
        .setURL('https://arunavvishwakarma3-max.github.io/aerix-bot'),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
