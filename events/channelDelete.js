import { handleChannelDelete } from '../handlers/antiNukeHandler.js';

export default {
  name: 'channelDelete',
  async execute(channel) {
    await handleChannelDelete(channel);
  },
};
