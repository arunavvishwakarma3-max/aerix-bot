import { createServer } from 'node:http';
import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import config from './config.js';
import logger from './utils/logger.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { connect } from './database/database.js';
import { MusicPlayer } from './utils/musicPlayer.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User],
});

client.config = config;
client.commands = new Collection();
client.cooldowns = new Collection();
client.antinuke = new Collection();
client.music = new MusicPlayer(client);

await connect();

await loadCommands(client);
await loadEvents(client);

if (!config.token) {
  logger.error('No bot token provided. Set BOT_TOKEN in .env file or config.js');
  process.exit(1);
}

client.login(config.token).catch(error => {
  logger.error('Bot login failed:', error.message);
  process.exit(1);
});

const port = process.env.PORT || 3000;
createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('AERIX bot is running');
}).listen(port, () => {
  logger.info(`Health server listening on port ${port}`);
});

process.on('unhandledRejection', (error) => {
  if (error?.code === 10062) return;
  logger.error('Unhandled rejection:', error?.message || error);
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error?.message || error);
});
