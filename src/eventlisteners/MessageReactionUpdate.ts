import { Bot } from "../main.js";
import { Events } from "discord.js";
import { BooleanBunch, fetch } from "../databunch.js";

export function register(bot: Bot){
    bot.client.on(Events.MessageReactionAdd, async (reaction) => {
        console.log("reaction added:",reaction);
        if (reaction.message.partial) { return; }
        const [messagebunch,users]=await Promise.all([
            fetch(bot, reaction.message),
            reaction.users.fetch()
        ]) 
        let only_bot = true;//if the reaction is added by real user
        for (let user of users.values()){
            only_bot &&= user.bot
        }
        if (only_bot){return;}
        const original_msg_lang = messagebunch.lang(reaction.message.id)
        for (let lang of messagebunch.langs){
            if (lang==original_msg_lang){continue;};
            let target = messagebunch.message(lang);
            if (target){
                target.react(reaction.emoji);
            }
        }
    })
    bot.client.on(Events.MessageReactionRemove, async (reaction) => {
        console.log("reaction removed",reaction);
        if (reaction.message.partial){return;}

        const messagebunch=await fetch(bot, reaction.message)

        var promise_buffer = []
        for (let lang of messagebunch.langs){
            promise_buffer.push(
                (async()=>{//check existance other than bot user
                    let user_reaction_existance = false;
                    const messagereaction = messagebunch.message(lang)!.reactions.cache.get(reaction.emoji.name!);
                    if(messagereaction){
                        const reacted_users = await messagereaction.users.fetch()
                        for (let user of reacted_users.values()){
                            user_reaction_existance ||= !user.bot
                        };
                        if (!user_reaction_existance){
                            messagereaction.remove()//remove all reactions this bot mirrored on the way
                        };
                    };
                    return user_reaction_existance;
                })()
            );
        };
        const user_reaction_existance_prebunch=await Promise.all(promise_buffer)
        const user_reaction_existance_bunch=new BooleanBunch(messagebunch.langs, user_reaction_existance_prebunch)

        for (let lang of user_reaction_existance_bunch.langs){
            if (user_reaction_existance_bunch.value(lang)){//exist
                for (let lang_for_process of user_reaction_existance_bunch.lang_ot(lang)){//add reactions
                    messagebunch.message(lang_for_process)!.react(reaction.emoji)
                }
            }
        }
    });
};