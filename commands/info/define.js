import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';
import axios from 'axios';

export default {
  data: new SlashCommandBuilder()
    .setName('define')
    .setDescription('Look up a word definition')
    .addStringOption(opt => opt.setName('word').setDescription('Word to define').setRequired(true)),
  category: 'info',
  async execute(interaction) {
    const word = interaction.options.getString('word');
    await interaction.deferReply();
    try {
      const { data } = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      const entry = data[0];
      const meanings = entry.meanings.slice(0, 3).map(m =>
        `**${m.partOfSpeech}:** ${m.definitions[0]?.definition || 'N/A'}${m.definitions[0]?.example ? `\n*"${m.definitions[0].example}"*` : ''}`
      ).join('\n\n');
      const embed = createEmbed({
        title: `${config.emoji.search} ${entry.word}`,
        description: meanings || 'No definitions found.',
        color: config.colors.blurple,
        fields: entry.phonetics?.[0]?.text ? [{ name: 'Pronunciation', value: entry.phonetics[0].text, inline: true }] : [],
        footer: 'Dictionary API',
      });
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({ embeds: [createEmbed({ color: config.colors.error, description: `${config.emoji.cross} Word not found.` })] });
    }
  },
};
