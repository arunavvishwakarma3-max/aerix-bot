import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription('Reload all commands (Owner only)')
    .addStringOption(opt => opt.setName('token').setDescription('Confirmation token').setRequired(true)),
  async execute(interaction, client) {
    if (interaction.user.id !== client.config.ownerId) {
      return interaction.reply({ content: 'Only the bot owner can reload commands.', ephemeral: true });
    }

    if (interaction.options.getString('token') !== 'confirm') {
      return interaction.reply({ content: 'Please provide the token: `confirm`.', ephemeral: true });
    }

    client.commands.clear();
    const { loadCommands } = await import('../../handlers/commandHandler.js');
    await loadCommands(client);

    await interaction.reply({ content: `Reloaded ${client.commands.size} commands.`, ephemeral: true });
  },
};
