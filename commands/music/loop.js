import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set loop mode')
    .addStringOption(opt => opt.setName('mode').setDescription('Loop mode').setRequired(true)
      .addChoices(
        { name: 'Off', value: 'off' },
        { name: 'Song', value: 'song' },
        { name: 'Queue', value: 'queue' },
      )),
  async execute(interaction, client) {
    const mode = interaction.options.getString('mode');
    client.music.setLoop(interaction.guild.id, mode);
    await interaction.reply({ embeds: [createEmbed({ color: config.colors.success, description: `${config.emoji.music || '🎵'} Loop set to **${mode}**.` })] });
  },
};
