import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import Guild from '../../models/Guild.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('reactionroles')
    .setDescription('Manage reaction roles')
    .addSubcommand(sub => sub.setName('setup').setDescription('Create a reaction role panel')
      .addStringOption(opt => opt.setName('title').setDescription('Panel title').setRequired(true))
      .addStringOption(opt => opt.setName('description').setDescription('Panel description').setRequired(true)))
    .addSubcommand(sub => sub.setName('add').setDescription('Add a role to the panel')
      .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
      .addStringOption(opt => opt.setName('emoji').setDescription('Emoji for the button').setRequired(true))
      .addStringOption(opt => opt.setName('label').setDescription('Button label')))
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove a role from the panel')
      .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('List reaction roles')),
  permissions: ['Administrator'],
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'setup') {
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(0x5865F2)
        .setFooter({ text: 'React below to get roles!' });

      const msg = await interaction.channel.send({ embeds: [embed] });
      await Guild.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { $push: { reactionRoles: { messageId: msg.id, channelId: interaction.channel.id } } },
        { upsert: true },
      );

      await interaction.reply({ content: `Reaction role panel created! Use \`/reactionroles add\` to add roles.`, ephemeral: true });
    }

    if (sub === 'add') {
      const role = interaction.options.getRole('role');
      const emoji = interaction.options.getString('emoji');
      const label = interaction.options.getString('label') || role.name;

      const guildData = await Guild.findOne({ guildId: interaction.guild.id });
      if (!guildData?.reactionRoles?.length) {
        return interaction.reply({ content: 'Create a panel first with `/reactionroles setup`.', ephemeral: true });
      }

      const lastPanel = guildData.reactionRoles[guildData.reactionRoles.length - 1];
      const channel = interaction.guild.channels.cache.get(lastPanel.channelId);
      if (!channel) return interaction.reply({ content: 'Panel channel not found.', ephemeral: true });

      const message = await channel.messages.fetch(lastPanel.messageId).catch(() => null);
      if (!message) return interaction.reply({ content: 'Panel message not found.', ephemeral: true });

      // Update the panel message with the new role button
      const existingButtons = message.components[0]?.components || [];
      const newButton = new ButtonBuilder().setCustomId(`rr-${role.id}`).setLabel(label).setStyle(ButtonStyle.Secondary);

      if (emoji.match(/<?(a)?:?\w+:(\d{17,22})>/)) {
        newButton.setEmoji(emoji);
      } else {
        newButton.setEmoji(emoji);
      }

      const row = new ActionRowBuilder().addComponents(...existingButtons, newButton);
      await message.edit({ components: row });

      await Guild.findOneAndUpdate(
        { guildId: interaction.guild.id, 'reactionRoles.messageId': lastPanel.messageId },
        { $push: { 'reactionRoles.$.roles': { roleId: role.id, emoji, label } } },
      );

      await interaction.reply({ content: `Added ${role} to the reaction panel.`, ephemeral: true });
    }

    if (sub === 'remove') {
      const role = interaction.options.getRole('role');
      const guildData = await Guild.findOne({ guildId: interaction.guild.id });
      if (!guildData?.reactionRoles?.length) {
        return interaction.reply({ content: 'No reaction roles configured.', ephemeral: true });
      }

      await Guild.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { $pull: { 'reactionRoles.$[].roles': { roleId: role.id } } },
      );

      await interaction.reply({ content: `Removed ${role} from reaction panels.`, ephemeral: true });
    }

    if (sub === 'list') {
      const guildData = await Guild.findOne({ guildId: interaction.guild.id });
      if (!guildData?.reactionRoles?.length) {
        return interaction.reply({ content: 'No reaction roles configured.', ephemeral: true });
      }

      const lines = guildData.reactionRoles.map(r => {
        const roles = r.roles?.map(rr => `<@&${rr.roleId}>`).join(', ') || 'No roles';
        return `• <#${r.channelId}> | [Message](https://discord.com/channels/${interaction.guild.id}/${r.channelId}/${r.messageId})\nRoles: ${roles}`;
      });

      const embed = createEmbed({
        title: 'Reaction Roles',
        description: lines.join('\n\n'),
        color: config.colors.primary,
      });

      await interaction.reply({ embeds: [embed] });
    }
  },
};
