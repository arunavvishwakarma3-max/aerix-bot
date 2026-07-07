import { handleChannelCreate } from '../handlers/antiNukeHandler.js';

export default {
  name: 'channelCreate',
  async execute(channel) {
    await handleChannelCreate(channel);
  },
};
