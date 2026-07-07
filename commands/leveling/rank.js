import { SlashCommandBuilder } from 'discord.js';
import User from '../../models/User.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Check your or another user\'s XP rank')
    .addUserOption(opt => opt.setName('user').setDescription('User to check')),
  category: 'leveling',
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    let userData = await User.findOne({ userId: target.id, guildId: interaction.guild.id });
    if (!userData) userData = new User({ userId: target.id, guildId: interaction.guild.id });

    const xpNeeded = Math.floor(config.levels.baseLevelXp * Math.pow(config.levels.levelXpMultiplier, (userData.level || 1) - 1));
    const progress = Math.min((userData.xp || 0) / xpNeeded * 100, 100);
    const barLen = 15;
    const filled = Math.round((progress / 100) * barLen);
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(Math.max(0, barLen - filled));

    const allUsers = await User.find({ guildId: interaction.guild.id }).sort({ level: -1, xp: -1 }).lean();
    const rank = allUsers.findIndex(u => u.userId === target.id) + 1;

    const embed = createEmbed({
      title: `${config.emoji.level || '📊'} ${target.username}'s Rank`,
      thumbnail: target.displayAvatarURL(),
      color: config.colors.blurple,
      fields: [
        { name: 'Level', value: `${userData.level || 1}`, inline: true },
        { name: 'Rank', value: rank > 0 ? `#${rank}` : 'N/A', inline: true },
        { name: 'XP', value: `${(userData.xp || 0).toLocaleString()} / ${xpNeeded.toLocaleString()}`, inline: false },
        { name: 'Progress', value: `\`\`\`${bar}\`\`\` ${progress.toFixed(1)}%`, inline: false },
        { name: 'Total XP', value: `${(userData.totalXp || 0).toLocaleString()}`, inline: true },
        { name: 'Voice Time', value: `${Math.floor((userData.voiceTime || 0) / 60)}h ${(userData.voiceTime || 0) % 60}m`, inline: true },
      ],
    });
    await interaction.reply({ embeds: [embed] });
  },
};
