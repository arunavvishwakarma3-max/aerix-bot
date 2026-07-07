import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Send a welcome embed to a channel')
    .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').setRequired(true))
    .addStringOption(opt => opt.setName('message').setDescription('Welcome message').setRequired(true)),
  permissions: ['ManageGuild'],
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message');

    const embed = new EmbedBuilder()
      .setTitle('Welcome!')
      .setDescription(message)
      .setColor(0x57f287);

    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: `Welcome message sent in ${channel}.`, ephemeral: true });
  },
};
