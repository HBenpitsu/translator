import {Bot} from '../main.js';
import {Events} from 'discord.js';

export function register(bot: Bot){
    bot.client.on(Events.ThreadCreate, ()=> {

    })
    bot.client.on(Events.ThreadDelete, () => {

    })
    bot.client.on(Events.ThreadUpdate, () => {
        
    })
};