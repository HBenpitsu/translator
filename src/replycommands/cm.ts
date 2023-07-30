import { MessageBunch,EmbedBunch } from "../databunch.js";
import { Bot } from "../main.js";
import { Message } from "discord.js";
import { attempt_to_edit,retranslate,get_refered_messagebunch } from "../fundamental.js";
import { translate } from "../translatorInterface.js";
import { embeds_generators } from "../visual.js";

async function execute(bot:Bot,reference:Message,command:Message){
    //interpret command
    const command_option = command.content.split(" ")
    if (command_option.length < 2){command.reply("command execution failed because no argument passed.")}

    retranslate(bot,reference,command_option[1])

    if(command.deletable){command.delete()}
}

export function register(bot:Bot){
    bot.replycommands.push({name:"cm",execute:execute})
}