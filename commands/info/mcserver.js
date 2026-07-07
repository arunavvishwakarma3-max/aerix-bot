import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';
import axios from 'axios';

export default {
  data: new SlashCommandBuilder()
    .setName('mcserver')
    .setDescription('Check Minecraft server status')
    .addStringOption(opt => opt.setName('server').setDescription('Server IP:Port').setRequired(true)),
  category: 'info',
  async execute(interaction) {
    const server = interaction.options.getString('server');
    await interaction.deferReply();
    try {
      const { data } = await axios.get(`https://api.mcsrvstat.us/3/${encodeURIComponent(server)}`);
      const embed = createEmbed({
        title: `${config.emoji.info} Minecraft Server — ${server}`,
        color: data.online ? config.colors.success : config.colors.error,
        fields: [
          { name: 'Status', value: data.online ? '✅ Online' : '❌ Offline', inline: true },
          { name: 'Players', value: data.players ? `${data.players.online}/${data.players.max}` : 'N/A', inline: true },
          { name: 'Version', value: data.version || 'N/A', inline: true },
          { name: 'MOTD', value: data.motd?.clean?.join(' ')?.slice(0, 1024) || 'N/A' },
        ],
        footer: 'mcsrvstat.us',
      });
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({ embeds: [createEmbed({ color: config.colors.error, description: `${config.emoji.cross} Could not query server.` })] });
    }
  },
};
