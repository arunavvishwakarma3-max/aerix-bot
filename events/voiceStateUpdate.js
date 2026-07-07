import User from '../models/User.js';

export default {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    try {
      const userId = newState.member?.id || oldState.member?.id;
      const guildId = newState.guild?.id || oldState.guild?.id;
      if (!userId || !guildId) return;

      let userData = await User.findOne({ userId, guildId });
      if (!userData) {
        userData = new User({ userId, guildId });
      }

      if (!oldState.channelId && newState.channelId) {
        userData.joinedVoiceAt = new Date();
        await userData.save();
        return;
      }

      if (oldState.channelId && !newState.channelId && userData.joinedVoiceAt) {
        const duration = (Date.now() - userData.joinedVoiceAt.getTime()) / 60000;
        if (duration >= 1) userData.voiceTime += Math.floor(duration);
        userData.joinedVoiceAt = null;
        await userData.save();
        return;
      }

      if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        if (userData.joinedVoiceAt) {
          const duration = (Date.now() - userData.joinedVoiceAt.getTime()) / 60000;
          if (duration >= 1) userData.voiceTime += Math.floor(duration);
          userData.joinedVoiceAt = new Date();
          await userData.save();
        }
      }
    } catch {}
  },
};
