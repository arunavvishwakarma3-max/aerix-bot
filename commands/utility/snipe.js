import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('snipe')
    .setDescription('View the last deleted message'),
  async execute(interaction) {
    const { snipeCache } = await import('../../events/messageDelete.js');
    const cache = snipeCache.get(interaction.guild.id);
    if (!cache) return interaction.reply({ content: 'No deleted messages found.', ephemeral: true });

    const snipeData = cache.get(interaction.channel.id);
    if (!snipeData) return interaction.reply({ content: 'No deleted messages in this channel.', ephemeral: true });

    const embed = createEmbed({
      author: snipeData.author,
      authorIcon: snipeData.authorAvatar,
      description: snipeData.content,
      color: 0xED4245,
      footer: `Deleted <t:${Math.floor(snipeData.deletedAt / 1000)}:R>`,
    });

    if (snipeData.attachments) embed.setImage(snipeData.attachments);

    await interaction.reply({ embeds: [embed] });
  },
};
