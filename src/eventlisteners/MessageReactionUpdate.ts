import { Bot } from "../main.js";
import { Events } from "discord.js";

export function register(bot: Bot){
    bot.client.on(Events.MessageReactionAdd, () => {
        
    })
    bot.client.on(Events.MessageReactionRemove, () => {
        
    })
}