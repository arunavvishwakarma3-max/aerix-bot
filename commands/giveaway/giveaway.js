import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import ms from 'ms';
import Giveaway from '../../models/Giveaway.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Manage giveaways')
    .addSubcommand(sub => sub.setName('start').setDescription('Start a giveaway')
      .addStringOption(opt => opt.setName('prize').setDescription('Prize').setRequired(true))
      .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g., 10m, 1h, 1d)').setRequired(true))
      .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setMinValue(1).setMaxValue(10))
      .addStringOption(opt => opt.setName('description').setDescription('Giveaway description'))
      .addRoleOption(opt => opt.setName('required-role').setDescription('Required role to enter')))
    .addSubcommand(sub => sub.setName('end').setDescription('End a giveaway').addStringOption(opt => opt.setName('message-id').setDescription('Message ID').setRequired(true)))
    .addSubcommand(sub => sub.setName('reroll').setDescription('Reroll a giveaway').addStringOption(opt => opt.setName('message-id').setDescription('Message ID').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('List active giveaways')),
  permissions: ['ManageGuild'],
  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const prize = interaction.options.getString('prize');
      const durationStr = interaction.options.getString('duration');
      const durationMs = ms(durationStr);
      const winnerCount = interaction.options.getInteger('winners') || 1;
      const description = interaction.options.getString('description') || '';
      const requiredRole = interaction.options.getRole('required-role');

      if (!durationMs) return interaction.reply({ content: 'Invalid duration. Use format: 10m, 1h, 1d, etc.', ephemeral: true });

      const endTime = new Date(Date.now() + durationMs);

      const embed = new EmbedBuilder()
        .setTitle(`🎉 Giveaway: ${prize}`)
        .setDescription(`${description}\n\n**Hosted by:** ${interaction.user}\n**Winners:** ${winnerCount}\n**Ends:** <t:${Math.floor(endTime.getTime() / 1000)}:R>${requiredRole ? `\n**Required Role:** ${requiredRole}` : ''}`)
        .setColor(0xf1c40f)
        .setFooter({ text: 'Click the button to enter!' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('giveaway-enter').setLabel('Enter').setStyle(ButtonStyle.Success).setEmoji('🎉'),
      );

      const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

      const giveaway = new Giveaway({
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,
        messageId: msg.id,
        prize,
        description,
        winnerCount,
        endTime,
        hosterId: interaction.user.id,
        requiredRole: requiredRole?.id || null,
      });

      await giveaway.save();

      setTimeout(async () => {
        const { endGiveaway } = await import('../../utils/giveawayManager.js');
        await endGiveaway(client, giveaway);
      }, durationMs);
    }

    if (sub === 'end') {
      const messageId = interaction.options.getString('message-id');
      const giveaway = await Giveaway.findOne({ messageId, ended: false });
      if (!giveaway) return interaction.reply({ content: 'Giveaway not found or already ended.', ephemeral: true });

      giveaway.endTime = new Date();
      await giveaway.save();

      const { endGiveaway } = await import('../../utils/giveawayManager.js');
      await endGiveaway(client, giveaway);
      await interaction.reply({ content: 'Giveaway ended.', ephemeral: true });
    }

    if (sub === 'reroll') {
      const messageId = interaction.options.getString('message-id');
      const giveaway = await Giveaway.findOne({ messageId, ended: true });
      if (!giveaway) return interaction.reply({ content: 'Giveaway not found or still active.', ephemeral: true });

      const validEntrants = giveaway.entrants.filter(id => !giveaway.winners.includes(id));
      if (!validEntrants.length) return interaction.reply({ content: 'No valid entrants to reroll.', ephemeral: true });

      const newWinner = validEntrants[Math.floor(Math.random() * validEntrants.length)];
      giveaway.winners.push(newWinner);
      await giveaway.save();

      await interaction.reply({ content: `🎉 New winner: <@${newWinner}>!` });
    }

    if (sub === 'list') {
      const giveaways = await Giveaway.find({ guildId: interaction.guild.id, ended: false });
      if (!giveaways.length) return interaction.reply({ content: 'No active giveaways.', ephemeral: true });

      const lines = giveaways.map(g =>
        `• **${g.prize}** — <#${g.channelId}> — Ends <t:${Math.floor(g.endTime.getTime() / 1000)}:R>`
      );

      const embed = createEmbed({
        title: 'Active Giveaways',
        description: lines.join('\n'),
        color: config.colors.primary,
      });

      await interaction.reply({ embeds: [embed] });
    }
  },
};
