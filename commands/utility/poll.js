import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll')
    .addStringOption(opt => opt.setName('question').setDescription('Poll question').setRequired(true))
    .addStringOption(opt => opt.setName('options').setDescription('Comma-separated options (max 5)'))
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel to post in')),
  permissions: ['ManageGuild'],
  async execute(interaction) {
    const question = interaction.options.getString('question');
    const optionsStr = interaction.options.getString('options');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    const options = optionsStr ? optionsStr.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5) : ['Yes', 'No'];
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

    const embed = createEmbed({
      title: '📊 Poll',
      description: `**${question}**\n\n${options.map((opt, i) => `${emojis[i]} ${opt}`).join('\n')}`,
      color: config.colors.primary,
      footer: `Poll by ${interaction.user.tag}`,
    });

    const row = new ActionRowBuilder().addComponents(
      options.map((_, i) =>
        new ButtonBuilder().setCustomId(`poll-${i}`).setLabel(emojis[i]).setStyle(ButtonStyle.Secondary),
      ),
    );

    const msg = await channel.send({ embeds: [embed], components: [row] });
    for (let i = 0; i < options.length; i++) {
      await msg.react(emojis[i]);
    }

    if (channel.id !== interaction.channel.id) {
      await interaction.reply({ content: `Poll created in ${channel}`, ephemeral: true });
    } else {
      await interaction.reply({ content: '✅', ephemeral: true });
    }
  },
};
