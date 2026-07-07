import { SlashCommandBuilder } from 'discord.js';
import Guild from '../../models/Guild.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rewards')
    .setDescription('Manage level rewards')
    .addSubcommand(sub => sub.setName('add').setDescription('Add a level reward').addIntegerOption(opt => opt.setName('level').setDescription('Level required').setMinValue(1).setRequired(true)).addRoleOption(opt => opt.setName('role').setDescription('Role to reward').setRequired(true)))
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove a level reward').addIntegerOption(opt => opt.setName('level').setDescription('Level of reward to remove').setMinValue(1).setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('List all level rewards')),
  category: 'leveling',
  permissions: ['Administrator'],
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildData = await Guild.findOne({ guildId: interaction.guild.id }) || new Guild({ guildId: interaction.guild.id });
    const rewards = guildData.levelRewards || [];

    if (sub === 'add') {
      const level = interaction.options.getInteger('level');
      const role = interaction.options.getRole('role');
      if (rewards.some(r => r.level === level)) {
        return interaction.reply({ embeds: [createEmbed({ color: config.colors.error, description: `${config.emoji.cross || '❌'} Reward for level ${level} already exists.` })], ephemeral: true });
      }
      rewards.push({ level, roleId: role.id });
      await Guild.findOneAndUpdate({ guildId: interaction.guild.id }, { levelRewards: rewards }, { upsert: true });
      await interaction.reply({ embeds: [createEmbed({ color: config.colors.success, description: `${config.emoji.check || '✅'} Added ${role} as level ${level} reward.` })] });
    }

    if (sub === 'remove') {
      const level = interaction.options.getInteger('level');
      const idx = rewards.findIndex(r => r.level === level);
      if (idx === -1) return interaction.reply({ embeds: [createEmbed({ color: config.colors.error, description: `${config.emoji.cross || '❌'} No reward for level ${level}.` })], ephemeral: true });
      rewards.splice(idx, 1);
      await Guild.findOneAndUpdate({ guildId: interaction.guild.id }, { levelRewards: rewards }, { upsert: true });
      await interaction.reply({ embeds: [createEmbed({ color: config.colors.success, description: `${config.emoji.check || '✅'} Removed level ${level} reward.` })] });
    }

    if (sub === 'list') {
      if (!rewards.length) return interaction.reply({ embeds: [createEmbed({ color: config.colors.info, description: `${config.emoji.info || 'ℹ️'} No rewards configured.` })] });
      const embed = createEmbed({
        title: `${config.emoji.level || '📊'} Level Rewards`,
        description: rewards.sort((a, b) => a.level - b.level).map(r => `**Level ${r.level}** \u2192 <@&${r.roleId}>`).join('\n'),
        color: config.colors.blurple,
      });
      await interaction.reply({ embeds: [embed] });
    }
  },
};
