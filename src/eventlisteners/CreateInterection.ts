import {Bot} from '../main.js';
import {Events} from 'discord.js';

export function register(bot: Bot){
    bot.client.on(Events.InteractionCreate, async interaction => {
        console.log("Interaction was created:",interaction);
        if (!interaction.isChatInputCommand()) return;
    
        const command = bot.slashcommands.get(interaction.commandName);
    
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }
    
        try {
            await command.execute(bot, interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
    });
};