import {Bot} from '../main.js';
import {Events} from 'discord.js';

export function register(bot: Bot){
    bot.client.on(Events.ThreadCreate, (thread)=> {
        console.log("thread created:",thread)
    })
    bot.client.on(Events.ThreadDelete, (thread) => {
        console.log("thread deleted")

    })
    bot.client.on(Events.ThreadUpdate, (thread) => {
        console.log("thread updated")
    })
};