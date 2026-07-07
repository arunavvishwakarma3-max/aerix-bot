import { handleRoleCreate } from '../handlers/antiNukeHandler.js';

export default {
  name: 'roleCreate',
  async execute(role) {
    await handleRoleCreate(role);
  },
};
