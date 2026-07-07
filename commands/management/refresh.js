import { SlashCommandBuilder, PermissionsBitField, REST, Routes } from 'discord.js';
import logger from '../../utils/logger.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('refresh')
    .setDescription('Full system refresh — reloads everything (Owner only)')
    .addStringOption(opt =>
      opt.setName('token')
        .setDescription('Type "yes" to confirm refresh')
        .setRequired(true)),
  category: 'management',
  permissions: [PermissionsBitField.Flags.Administrator],
  async execute(interaction, client) {
    if (interaction.user.id !== client.config.ownerId) {
      return interaction.reply({ content: `${config.emoji.cross} Only the bot owner can run this command.`, ephemeral: true });
    }

    if (interaction.options.getString('token') !== 'yes') {
      return interaction.reply({ content: `${config.emoji.warning} Type \`yes\` as the token to confirm refresh.`, ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const results = [];
    const startTime = Date.now();

    // 1. Clear all caches
    try {
      client.cooldowns.clear();
      client.antinuke?.clear();
      const { snipeCache } = await import('../../events/messageDelete.js');
      if (snipeCache) snipeCache.clear();
      results.push({ name: 'Cache Clear', status: 'OK', detail: 'Cooldowns, anti-nuke, snipe cleared' });
    } catch (e) {
      results.push({ name: 'Cache Clear', status: 'FAIL', detail: e.message });
    }

    // 2. Reload commands
    try {
      client.commands.clear();
      const { loadCommands } = await import('../../handlers/commandHandler.js');
      await loadCommands(client);
      results.push({ name: 'Commands Reload', status: 'OK', detail: `${client.commands.size} commands loaded` });
    } catch (e) {
      results.push({ name: 'Commands Reload', status: 'FAIL', detail: e.message });
    }

    // 3. Reload events
    try {
      const { loadEvents } = await import('../../handlers/eventHandler.js');
      client.removeAllListeners();
      await loadEvents(client);
      results.push({ name: 'Events Reload', status: 'OK', detail: 'All events re-registered' });
    } catch (e) {
      results.push({ name: 'Events Reload', status: 'FAIL', detail: e.message });
    }

    // 4. Re-deploy slash commands
    try {
      const commandData = [...client.commands.values()].map(c => c.data.toJSON());
      const rest = new REST({ version: '10' }).setToken(client.config.token);
      if (client.config.guildId) {
        await rest.put(
          Routes.applicationGuildCommands(client.config.clientId, client.config.guildId),
          { body: commandData.slice(0, 100) },
        );
      }
      await rest.put(
        Routes.applicationCommands(client.config.clientId),
        { body: commandData.slice(0, 100) },
      );
      results.push({ name: 'Slash Deploy', status: 'OK', detail: `${Math.min(commandData.length, 100)} commands deployed` });
    } catch (e) {
      results.push({ name: 'Slash Deploy', status: 'FAIL', detail: e.message });
    }

    // 5. Reconnect database
    try {
      const { connect } = await import('../../database/database.js');
      await connect();
      results.push({ name: 'Database', status: 'OK', detail: 'SQLite reconnected' });
    } catch (e) {
      results.push({ name: 'Database', status: 'FAIL', detail: e.message });
    }

    // 6. Reload giveaways
    try {
      const { loadGiveaways } = await import('../../utils/giveawayManager.js');
      await loadGiveaways(client);
      results.push({ name: 'Giveaways', status: 'OK', detail: 'Giveaway timers restarted' });
    } catch (e) {
      results.push({ name: 'Giveaways', status: 'FAIL', detail: e.message });
    }

    // 7. Update presence
    try {
      const totalUsers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
      const cmdCount = client.commands.size;
      const synced = client.guilds.cache.size;
      client.user.setPresence({
        activities: [{ name: `${synced} servers • /help` }],
        status: 'online',
      });
      results.push({ name: 'Presence', status: 'OK', detail: `Online — ${synced} servers` });
    } catch (e) {
      results.push({ name: 'Presence', status: 'FAIL', detail: e.message });
    }

    // 8. Memory check
    try {
      const mem = process.memoryUsage();
      const memMb = (mem.heapUsed / 1024 / 1024).toFixed(1);
      results.push({ name: 'Memory', status: 'OK', detail: `${memMb} MB used` });
    } catch (e) {
      results.push({ name: 'Memory', status: 'FAIL', detail: e.message });
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const failed = results.filter(r => r.status === 'FAIL').length;
    const totalStatus = failed === 0 ? `${config.emoji.check} All Systems Operational` : `${config.emoji.warning} ${failed} module(s) failed`;

    const { createEmbed } = await import('../../utils/embed.js');
    const embed = createEmbed({
      title: `${config.emoji.terminal} AERIX — System Refresh Complete`,
      description: [
        `\`\`\`diff`,
        `${failed === 0 ? '+ All modules refreshed successfully' : `! ${failed} module(s) failed`}`,
        `+ Duration: ${elapsed}s`,
        `\`\`\``,
      ].join('\n'),
      color: failed === 0 ? config.colors.success : config.colors.warning,
      fields: results.map(r => ({
        name: `${r.status === 'OK' ? config.emoji.check : config.emoji.cross} ${r.name}`,
        value: `\`${r.detail}\``,
        inline: true,
      })),
      footer: `AERIX • Refresh ${elapsed}s`,
      timestamp: true,
    });

    await interaction.editReply({ embeds: [embed] });
    logger.success(`System refresh completed in ${elapsed}s — ${results.length} modules, ${failed} failed`);
  },
};
