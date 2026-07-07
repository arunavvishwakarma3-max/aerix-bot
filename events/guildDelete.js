export default {
  name: 'guildDelete',
  async execute(guild) {
    console.log(`Removed from guild: ${guild.name} (${guild.id})`);
  },
};
