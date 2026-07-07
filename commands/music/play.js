import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or playlist from YouTube')
    .addStringOption(opt => opt.setName('query').setDescription('Song name or URL').setRequired(true)),
  async execute(interaction, client) {
    const query = interaction.options.getString('query');
    await client.music.play(interaction.guild.id, query, interaction);
  },
};
