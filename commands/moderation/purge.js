import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete messages in bulk')
    .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)),
  permissions: [PermissionsBitField.Flags.ManageMessages],
  botPermissions: [PermissionsBitField.Flags.ManageMessages],
  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const messages = await interaction.channel.messages.fetch({ limit: amount });
    await interaction.channel.bulkDelete(messages, true);
    await interaction.reply({ content: `Deleted ${messages.size} messages.`, ephemeral: true });
  },
  async messageRun(message, args) {
    const amount = parseInt(args[0], 10);
    if (!amount || amount < 1 || amount > 100) return message.reply('Use **!purge <amount>** (1-100).');
    const messages = await message.channel.messages.fetch({ limit: amount });
    await message.channel.bulkDelete(messages, true);
    const reply = await message.reply(`Deleted ${messages.size} messages.`);
    setTimeout(() => reply.delete().catch(() => {}), 5000);
  },
};
