import {Bot} from '../main.js';
import {Events,Message,Channel,WebhookMessageCreateOptions,TextChannel,Attachment,EmbedBuilder, resolveColor} from 'discord.js';
import { ChannelBunch, EmbedBunch, MessageBunch, bunch_up } from '../databunch.js';
import { translate } from '../translatorInterface.js';
import { embeds_generators } from '../visual.js';

async function send_message_with_webhhok(channel:TextChannel, options:WebhookMessageCreateOptions): Promise<undefined | Message>{
    const webhook = (await channel.fetchWebhooks()).first();
    if (typeof webhook == 'undefined'){
        console.error("there was no webhook client in the channel:",channel);
        return;
    } else {
        return await webhook.send(options);
    }
}


/**message bunch auto resolve*/
async function get_refered_messagebunch(bot:Bot ,message: Message): Promise<MessageBunch|null>{
    if(message.reference){
        let refered_messagebunch = await bot.database.message_bunch_of(message.reference.channelId,message.reference.messageId!)
        await refered_messagebunch.resolve(bot)
        if(refered_messagebunch.vaild){
            return refered_messagebunch;
        }
    }
    return null;
}

async function send_translated_message(bot:Bot, message: Message){

    const channelbunch =  await bot.database.channel_bunch_of(message.channelId)
    await channelbunch.resolve(bot);
    
    //if this message should be translated or not
    if (!channelbunch.vaild || channelbunch.length == 0){
        return;
    };

    //coordinate addtional information
    let refered_embeds = new EmbedBunch([], []);
    const refered_messagebunch = await get_refered_messagebunch(bot, message);
    if (refered_messagebunch) {
        refered_embeds = embeds_generators.reference_embed(refered_messagebunch)!
    }

    //send message
    var promise_buffer = [];
    const original_language = channelbunch.lang(message.channelId);
    for (let lang of channelbunch.langs){
        if (lang == original_language){continue;};
        promise_buffer.push(
            translate(message.content, original_language!, lang)
            .then((text) => {
                return send_message_with_webhhok(
                    channelbunch.channel(lang) as TextChannel,
                    {
                        content: text,
                        username: message.member!.displayName,
                        avatarURL: message.author.avatarURL()!,
                        files: Array.from(message.attachments.values()),
                        embeds: refered_embeds.embed(lang)
                    }
                )
            })
        );
    };


    const sent_messages = await Promise.all(promise_buffer);
    const messages = [message]

    //typecheck
    for (let msg of sent_messages){
        if (typeof msg == 'undefined'){
            console.error(`one or more message was failed to be sent. MessageBunch of ${message.content} won't be registered to database.`);
            return;
        } else {
            messages.push(msg)
        }
    }

    //register to database
    const messagebunch = await bunch_up(bot,messages);
    bot.database.registerMessage(messagebunch);

}

function  is_match_ignore_rule(message:Message ): boolean{
    return message.content.startsWith('/') || message.author.bot
}

export function register(bot: Bot){
    bot.client.on(Events.MessageCreate, async (message) => {
        try{//pass through an error
            if ( ! is_match_ignore_rule(message) ) {
                await send_translated_message(bot,message);
            }
        } catch (e) {
            console.error(e);
        }
    }) 
}