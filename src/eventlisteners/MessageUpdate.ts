import {Bot} from '../main.js';
import {Events} from 'discord.js';

export function register(bot: Bot){
    bot.client.on(Events.MessageDelete, message => {

    })
    bot.client.on(Events.MessageUpdate, (oldmsg, newmsg)=>{

    })
};