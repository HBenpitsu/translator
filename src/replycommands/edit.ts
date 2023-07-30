import { Bot } from "../main.js";
import { Message } from "discord.js";
import { MessageBunch,EmbedBunch } from "../databunch.js";
import { embeds_generators } from "../visual.js";
import { get_refered_messagebunch,attempt_to_edit } from "../fundamental.js";

async function execute(bot:Bot, reference:Message, command:Message){
    //interpret command
    const content = command.content.slice("/edit ".length)

    const refered_messagebunch = await bot.database.message_bunch_of(reference.channelId,reference.id)
    if (!refered_messagebunch) {return;}
    await refered_messagebunch.resolve(bot)
    if (!refered_messagebunch.vaild){return;}

    //coordinate addtional information
    let reference_refered_embeds = new EmbedBunch([], []);
    const reference_refered_messagebunch = await get_refered_messagebunch(bot, refered_messagebunch.origin()!);
    if (reference_refered_messagebunch) {
        reference_refered_embeds = embeds_generators.reference_embed(reference_refered_messagebunch)!
    }

    //edit
    await attempt_to_edit(reference,{
        content: content,
        username: refered_messagebunch.origin()!.member!.displayName,
        avatarURL: refered_messagebunch.origin()!.author.avatarURL()!,
        files: Array.from(refered_messagebunch.origin()!.attachments.values()),
        embeds: reference_refered_embeds.embed(refered_messagebunch.lang(reference.id)!)
    })

    if(command.deletable){command.delete()}
}

export function register(bot:Bot){
    bot.replycommands.push({name:"edit",execute:execute})
}