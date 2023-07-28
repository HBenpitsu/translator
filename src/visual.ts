import {Message,EmbedBuilder} from 'discord.js';
import { MessageBunch, EmbedBunch } from './databunch.js';

export class embeds_generators{
    /**refered_messagebunch should be resolved */
    public static reference_embed(refered_messagebunch:MessageBunch):EmbedBunch{
        if (!refered_messagebunch.vaild){
            console.error("There was attemps to generate reference embed for invaild message bunch");
            return new EmbedBunch([],[])
        }
        const embeds = []
        for (let lang of refered_messagebunch.langs) {
            let refered_message = refered_messagebunch.message(lang)

            const embed = new EmbedBuilder();
            embed.setAuthor(
                {
                    name: "reply_to:" + refered_messagebunch.origin()!.author.username,
                    url: refered_message!.url,
                    iconURL: refered_message!.author.avatarURL() || undefined
                }
            )
            embed.setColor([25,25,25])
            embed.setDescription(refered_message!.content)

            embeds.push(embed)
        }

        return new EmbedBunch(refered_messagebunch.langs,embeds);
    }
}