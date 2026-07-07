import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Get a user\'s avatar')
    .addUserOption(opt => opt.setName('user').setDescription('User')),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const avatar = user.displayAvatarURL({ dynamic: true, size: 4096 });

    const embed = createEmbed({
      title: `${user.username}'s Avatar`,
      image: avatar,
      color: config.colors.primary,
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Open in Browser').setStyle(ButtonStyle.Link).setURL(avatar),
      new ButtonBuilder().setLabel('PNG').setStyle(ButtonStyle.Link).setURL(user.displayAvatarURL({ extension: 'png', size: 4096 })),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
