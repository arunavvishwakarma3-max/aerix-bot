import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REST, Routes } from 'discord.js';
import config from './config.js';
import logger from './utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const commands = [];
const commandsPath = path.resolve(__dirname, 'commands');

async function loadCommands(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await loadCommands(fullPath);
    } else if (entry.name.endsWith('.js')) {
      try {
        const command = await import(pathToFileURL(fullPath).href);
        if (command.default?.data) {
          commands.push(command.default.data.toJSON());
        }
      } catch (err) {
        logger.error(`Failed to load command ${fullPath}: ${err.message}`);
      }
    }
  }
}

await loadCommands(commandsPath);

logger.info(`Loaded ${commands.length} commands for deployment`);

const rest = new REST({ version: '10' }).setToken(config.token);

try {
  logger.info('Deploying commands...');

  if (config.guildId) {
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands },
    );
    logger.success(`Deployed ${commands.length} commands to guild ${config.guildId}`);
  } else {
    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands },
    );
    logger.success(`Deployed ${commands.length} commands globally`);
  }
} catch (error) {
  logger.error('Deploy failed:', error);
}
