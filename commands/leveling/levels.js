import { SlashCommandBuilder } from 'discord.js';
import User from '../../models/User.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('levels')
    .setDescription('View the level leaderboard'),
  category: 'leveling',
  async execute(interaction) {
    await interaction.deferReply();
    const users = await User.find({ guildId: interaction.guild.id }).sort({ level: -1, xp: -1 }).limit(10).lean();
    if (!users.length) return interaction.editReply({ embeds: [createEmbed({ color: config.colors.info, description: `${config.emoji.info || 'ℹ️'} No data yet.` })] });

    const medalEmojis = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
    const lines = users.map((u, i) => {
      const member = interaction.guild.members.cache.get(u.userId);
      const name = member?.user?.username || u.userId;
      return `${medalEmojis[i] || `#${i + 1}`} **${name}** — Level ${u.level || 1} (${(u.xp || 0).toLocaleString()} XP)`;
    });

    const embed = createEmbed({
      title: `${config.emoji.level || '📊'} Level Leaderboard`,
      description: lines.join('\n'),
      color: config.colors.blurple,
      footer: interaction.guild.name,
    });
    await interaction.editReply({ embeds: [embed] });
  },
};
