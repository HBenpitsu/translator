import { MessageBunch } from '../databunch.js';
import { retranslate } from '../fundamental.js';
import {Bot} from '../main.js';
import {Events, TextChannel} from 'discord.js';

export function register(bot: Bot){
    
    bot.client.on(Events.MessageDelete, async message => {
        console.log("Message was deleted:",message);
        const messagebunch = await bot.database.message_bunch_of(message.channelId, message.id);
        if (messagebunch.length==0){return;}//if deleted message has translated correspondant or not
        
        //prevent double processing
        bot.database.delete_message_bunch(message.channelId, message.id);

        await messagebunch.resolve(bot)

        const promise_buffer = [];
        for (let lang of messagebunch.langs){
            const message = messagebunch.message(lang)
            if(message){
                if(message.deletable){
                    promise_buffer.push(message.delete())
                }else if('fetchWebhooks' in message.channel){
                    const webhook = (await message.channel.fetchWebhooks()).first();
                    if(webhook){
                        promise_buffer.push(webhook.deleteMessage(message));
                    }
                }
            };
        };
        await Promise.all([promise_buffer])
    })

    bot.client.on(Events.MessageUpdate, async (oldmsg, newmsg)=>{
        console.log("Message was updated:",oldmsg,"=>",newmsg)
        const messagebunch=await bot.database.message_bunch_of(oldmsg.channelId,oldmsg.id);
        if (oldmsg.author && oldmsg.author.bot){return;}//if edited message is original one or not
        if (messagebunch.length==0){return;}//if edited message has translated correspondant or not
        await messagebunch.resolve(bot)
        for (let lang of messagebunch.langs){
            let target = messagebunch.message(lang);
            if (target && target != messagebunch.origin()){
                retranslate(bot, target)
            }
        }
    })
};