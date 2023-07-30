import { Bot } from "../main.js";
import { Events } from "discord.js";

export function register(bot: Bot){
    bot.client.on(Events.MessageReactionAdd, (reaction) => {
        console.log("reaction added:",reaction);
    })
    bot.client.on(Events.MessageReactionRemove, (reaction) => {
        console.log("reaction removed",reaction);
    })
}