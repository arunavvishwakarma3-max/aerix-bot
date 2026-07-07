import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embed.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get user information')
    .addUserOption(opt => opt.setName('user').setDescription('User')),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild.members.cache.get(user.id);

    const roles = member?.roles.cache.filter(r => r.id !== interaction.guild.id).sort((a, b) => b.position - a.position);

    const embed = createEmbed({
      title: `${user.username}'s Information`,
      thumbnail: user.displayAvatarURL({ dynamic: true, size: 512 }),
      color: member?.displayHexColor || config.colors.primary,
      fields: [
        { name: 'Username', value: user.tag, inline: true },
        { name: 'ID', value: user.id, inline: true },
        { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true },
        { name: 'Joined Server', value: member?.joinedAt ? `<t:${Math.floor(member.joinedAt / 1000)}:R>` : 'Unknown', inline: true },
        { name: 'Registered', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Roles', value: roles?.size ? roles.map(r => r.toString()).join(', ').slice(0, 1024) : 'None' },
      ],
    });

    await interaction.reply({ embeds: [embed] });
  },
};
