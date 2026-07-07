import { PermissionsBitField } from 'discord.js';
import { getCommand, checkCooldown } from '../handlers/commandHandler.js';
import { createEmbed } from '../utils/embed.js';
import { handleButton } from '../utils/buttonHandler.js';
import { handleModal } from '../utils/modalHandler.js';
import { handleSelectMenu } from '../utils/selectMenuHandler.js';
import config from '../config.js';
import logger from '../utils/logger.js';

export default {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      // Slash Commands
      if (interaction.isChatInputCommand()) {
        const command = getCommand(interaction.commandName);
        if (!command) return;

        // Permission checks
        if (command.permissions) {
          const missing = command.permissions.filter(
            perm => !interaction.member.permissions.has(perm)
          );
          if (missing.length > 0) {
            return interaction.reply({
              embeds: [createEmbed({
                color: config.colors.error,
                description: `${config.emoji.cross} You need: \`${missing.join(', ')}\``,
              })],
              ephemeral: true,
            });
          }
        }

        if (command.botPermissions) {
          const missing = command.botPermissions.filter(
            perm => !interaction.guild.members.me.permissions.has(perm)
          );
          if (missing.length > 0) {
            return interaction.reply({
              embeds: [createEmbed({
                color: config.colors.error,
                description: `${config.emoji.cross} I need: \`${missing.join(', ')}\``,
              })],
              ephemeral: true,
            });
          }
        }

        // Cooldown
        const cooldownTime = checkCooldown(interaction.user.id, command.data.name);
        if (cooldownTime) {
          return interaction.reply({
            embeds: [createEmbed({
              color: config.colors.warning,
              description: `${config.emoji.warning} Wait ${Math.ceil(cooldownTime / 1000)}s before using \`/${command.data.name}\` again.`,
            })],
            ephemeral: true,
          });
        }

        await command.execute(interaction, client);
        logger.command(`${interaction.user.tag} used /${command.data.name}`);
        return;
      }

      // Buttons
      if (interaction.isButton()) {
        await handleButton(interaction, client);
        return;
      }

      // Modals
      if (interaction.isModalSubmit()) {
        await handleModal(interaction, client);
        return;
      }

      // Select Menus
      if (interaction.isStringSelectMenu() || interaction.isChannelSelectMenu()) {
        await handleSelectMenu(interaction, client);
        return;
      }

      // Autocomplete
      if (interaction.isAutocomplete()) {
        const command = getCommand(interaction.commandName);
        if (command?.autocomplete) {
          await command.autocomplete(interaction, client);
          return;
        }
        const focused = interaction.options.getFocused();
        const available = [];
        await interaction.respond(available);
        return;
      }

    } catch (error) {
      logger.error('Interaction error:', error);
      const errorMsg = `${config.emoji.cross} An error occurred.`;
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMsg, ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: errorMsg, ephemeral: true }).catch(() => {});
      }
    }
  },
};
