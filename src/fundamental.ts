import { Bot } from "./main.js";
import { MessageBunch, EmbedBunch, fetch } from "./databunch.js";
import { Message,TextChannel,Webhook,WebhookMessageCreateOptions } from "discord.js";
import { translate } from "./translatorInterface.js";
import { embeds_generators } from "./visual.js";

export async function send_message_with_webhhok(channel:TextChannel, options:WebhookMessageCreateOptions): Promise<undefined | Message>{
    const webhook = (await channel.fetchWebhooks()).first();
    if (typeof webhook == 'undefined'){
        console.error("there was no webhook client in the channel:",channel);
        return;
    } else {
        return await webhook.send(options);
    }
}

/**message bunch auto resolve*/
export async function get_refered_messagebunch(bot:Bot ,message: Message): Promise<MessageBunch|undefined>{
    if(message.reference){
        let refered_messagebunch = await fetch(bot, await message.fetchReference())
        if(refered_messagebunch.vaild){
            return refered_messagebunch;
        }
    }
}

export async function attempt_to_edit(message:Message, options:WebhookMessageCreateOptions) {
    if (message.webhookId){
        const webhook = await message.fetchWebhook();
        webhook.editMessage(message, options)
    };
};
export async function retranslate(bot:Bot,target:Message,model:string="google"){
    //translate newly
    const target_messagebunch = await fetch(bot, target);
    if (!target_messagebunch.vaild){return;}
    const translated_text = await translate(
        target_messagebunch.origin()!.content, 
        target_messagebunch.lang(target_messagebunch.origin()!.id)!, 
        target_messagebunch.lang(target.id)!,
        model
    )

    //coordinate addtional information
    let target_refered_embeds = new EmbedBunch([], []);
    const target_refered_messagebunch = await get_refered_messagebunch(bot, target_messagebunch.origin()!);
    if (target_refered_messagebunch) {
        target_refered_embeds = embeds_generators.reference_embed(target_refered_messagebunch)!
    }

    //edit
    await attempt_to_edit(target,{
        content: translated_text,
        username: target_messagebunch.origin()!.member!.displayName,
        avatarURL: target_messagebunch.origin()!.author.avatarURL()!,
        files: Array.from(target_messagebunch.origin()!.attachments.values()),
        embeds: target_refered_embeds.embed(target_messagebunch.lang(target.id)!)
    })
}