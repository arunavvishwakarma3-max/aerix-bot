import { handleRoleDelete } from '../handlers/antiNukeHandler.js';

export default {
  name: 'roleDelete',
  async execute(role) {
    await handleRoleDelete(role);
  },
};
