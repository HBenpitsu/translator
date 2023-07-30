import { SlashCommandBuilder,CommandInteraction } from "discord.js";
import { Bot } from "../main.js";

export const data = new SlashCommandBuilder()
        .setName('ping')
        .setDescription("send pong")

export async function execute(bot:Bot, interaction:CommandInteraction){
    //interaction.deferReply();
    console.log(interaction)
    interaction.reply('pong');
}

export function register(bot:Bot){
    bot.slashcommands.set(data.name, {data:data, execute:execute});
}