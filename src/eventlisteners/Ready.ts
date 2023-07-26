import {Bot} from '../main.js';
import {Events} from 'discord.js';

export function register(bot: Bot){
    bot.client.once(Events.ClientReady,() => {
        console.log('get ready at:',bot.client.readyAt);
    })
};