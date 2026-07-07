import { handleGuildBanAdd } from '../handlers/antiNukeHandler.js';

export default {
  name: 'guildBanAdd',
  async execute(ban) {
    await handleGuildBanAdd(ban);
  },
};
