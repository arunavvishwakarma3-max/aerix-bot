import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import logger from '../utils/logger.js';

const commands = new Map();
const cooldowns = new Map();

export async function loadCommands(client) {
  const commandsPath = path.resolve('./commands');
  if (!fs.existsSync(commandsPath)) return;

  const categories = fs.readdirSync(commandsPath, { withFileTypes: true }).filter(d => d.isDirectory());
  for (const category of categories) {
    const files = fs.readdirSync(path.join(commandsPath, category.name)).filter(f => f.endsWith('.js'));
    for (const file of files) {
      try {
        const filePath = path.join(commandsPath, category.name, file);
        const cmdModule = await import(pathToFileURL(filePath).href);
        const command = cmdModule.default;
        if (!command?.data?.name || !command.execute) continue;
        command.category = category.name;
        commands.set(command.data.name, command);
      } catch (error) {
        logger.error(`Failed to load command ${category.name}/${file}:`, error.message);
      }
    }
  }

  client.commands = commands;
  logger.success(`Loaded ${commands.size} commands`);
}

export function getCommand(name) {
  return commands.get(name);
}

export function checkCooldown(userId, commandName) {
  if (!cooldowns.has(userId)) cooldowns.set(userId, new Map());
  const userCooldowns = cooldowns.get(userId);
  const command = commands.get(commandName);
  if (!command?.cooldown) return false;
  const now = Date.now();
  const cooldownAmount = command.cooldown * 1000;
  if (userCooldowns.has(commandName)) {
    const expiration = userCooldowns.get(commandName) + cooldownAmount;
    if (now < expiration) return expiration - now;
  }
  userCooldowns.set(commandName, now);
  setTimeout(() => userCooldowns.delete(commandName), cooldownAmount);
  return false;
}

export { commands };
