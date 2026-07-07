import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import logger from '../utils/logger.js';

export async function loadEvents(client) {
  const eventsPath = path.resolve('./events');
  if (!fs.existsSync(eventsPath)) return;

  const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
  for (const file of eventFiles) {
    try {
      const filePath = path.join(eventsPath, file);
      const eventModule = await import(pathToFileURL(filePath).href);
      const event = eventModule.default;
      if (!event?.name || !event.execute) continue;
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
    } catch (error) {
      logger.error(`Failed to load event ${file}:`, error.message);
    }
  }

  logger.success(`Loaded ${eventFiles.length} events`);
}
