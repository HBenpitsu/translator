import {Message,BaseChannel,TextChannel,Channel, EmbedBuilder} from 'discord.js';
import {Bot} from './main.js';

export async function fetch(solver:Bot, message:Message ): Promise<MessageBunch>{
    const message_bunch = await solver.database.message_bunch_of(message.channelId, message.id);
    message_bunch.resolve(solver);
    return message_bunch 
}

export async function bunch_up(solver:Bot, messages: Message[]): Promise<MessageBunch>{
    if (messages.length < 1){//check consistency
        return new MessageBunch(new ChannelBunch([],[]),[],[],[]);
    }

    const channels = await solver.database.channel_bunch_of(messages[0].channelId)
    if(channels.langs.length == 0){// if ChannelBunch is vaild or not
        return new MessageBunch(new ChannelBunch([],[]),[],[],[]);
    }

    const langs = []
    const ids = []
    const original = []
    for (let i = 0; i < messages.length; i++) {
        let lang = channels.lang(messages[i].channelId);
        if (typeof lang == 'undefined') {//if all messages belong to the same message bunch
            return new MessageBunch(new ChannelBunch([],[]),[],[],[]);
        };
        langs.push(lang);
        ids.push(messages[i].id);
        original.push(!messages[i].author.bot);
    }
    const messagebunch = new MessageBunch(channels, langs, ids, original);//construct message bunch

    messagebunch.messages = messages;//override messagebunch state
    messagebunch.solved = true;
    messagebunch.vaild = true;
    
    return messagebunch
}

class GeneralBunch<T>{
    readonly langs: string[];
    readonly values: T[];

    constructor(langs:string[], values:any[]){
        this.langs = langs;
        this.values = values;
    }

    public lang(value: T){
        for (let i = 0; i < this.langs.length; i++) {
            if (this.values[i]==value){
                return this.langs[i];
            };  
        };
    };

    public value(lang: string): T|undefined{
        for (let i = 0; i < this.langs.length; i++) {
            if (this.langs[i] == lang){
                return this.values[i];
            };    
        }
    };
}

export class EmbedBunch extends GeneralBunch<EmbedBuilder> {
    public embed(lang: string): EmbedBuilder[]{
        for (let i = 0; i < this.langs.length; i++) {
            if (this.langs[i] == lang){
                return [this.values[i]];
            };    
        }
        return [];
    }
}

export class ChannelBunch{
    readonly langs: string[];
    readonly ids: string[];
    readonly length: number;
    public channels: Channel[]|undefined;
    public solved: boolean;
    public vaild: boolean|undefined;
    /**
     * channels undefined       undefined   Channel[]
     * solved   false           true        true
     * vaild    undefined       false       true
     */
    
    constructor(langs:string[] ,ids:string[]){
        this.solved = false;

        this.langs = langs;
        this.ids = ids;
        
        //consistency check
        if(this.langs.length != this.ids.length){
            this.vaild = false;
            console.error("ChannelBunch was marked as invaild because langs.length != ids.length:",this);
        }

        this.length = langs.length;
    };

    public async resolve(solver:Bot): Promise<ChannelBunch> {
        //skip double resolution
        if (this.solved) {return this;}
        this.solved = true;

        //fetch Channel object
        const promise_buffer = []
        for (let id of this.ids){
            promise_buffer.push(solver.client.channels.fetch(id))
        }
        const res = await Promise.all(promise_buffer);

        //type check
        if (res.includes(null)){
            this.vaild = false;
            console.error("ChannelBunch was marked as invaild:",this);
        }else{
            this.channels = res as Channel[];
            this.vaild = true;
        }
    
        return this;
    };

    public lang(id:string ): string|undefined{
        for (let i=0; i<this.ids.length; i++){
            if (this.ids[i] == id) {
                return this.langs[i]//corresponds to id in ids
            }
        }
    };

    /**need to resolve Channelbunch before execute this method */
    public channel(lang:string ): Channel|undefined{
        if(!this.solved || !this.vaild){//resolution check
            console.error("`channel` of invalid or unsolved ChannelBunch was called:",this);
            return;
        }

        for (let i=0; i<this.langs.length; i++){
            if (this.langs[i] == lang) {
                return this.channels![i]//corresponds to lang in langs
            }
        }
    };
}

export class MessageBunch{
    readonly langs: string[];
    readonly ids: string[];
    readonly original: boolean[];
    readonly channels: ChannelBunch;
    readonly length: number;
    public messages: Message[]|undefined;
    public solved: boolean;
    public vaild: boolean|undefined;
    /**
     * messages undefined       undefined   Channel[]
     * solved   false           true        true
     * vaild    undefined       false       true
     */

    constructor(channels:ChannelBunch ,langs:string[] ,ids:string[] ,original:boolean[] ){
        this.solved = false;

        if(channels.solved && !channels.vaild){//consistency check
            console.error("MessageBunch was marked as invaild because passed channels were invaild:",this);
            this.vaild=false
        };
        this.channels = channels;

        this.langs = langs;
        this.ids = ids;
        this.original = original;
        
        if(channels.length != langs.length || langs.length != ids.length || ids.length != original.length){//consistency check
            this.vaild = false;
            console.error("ChannelBunch was marked as invaild because channels.length, langs.length, ids.length and original.length aren't the same:",this);
        }
        
        this.length = langs.length;
    };

    public async resolve(solver:Bot): Promise<MessageBunch>{
        await this.channels.resolve(solver)//prepare to resolve messages
        
        if(this.solved){return this;}//skip double resolution
        this.solved = true;
        this.vaild = true;

        if (!this.channels.vaild){//consistency check
            console.error("MessageBunch was marked as invaild because passed channels were invaild:",this);
            this.vaild=false;
            return this;
        }

        const promise_buffer = []//type check/fetch message Object
        for (let lang of this.langs){
            const channel = this.channels.channel(lang)!
            if ('messages' in channel){
                promise_buffer.push(channel.messages.fetch(this.ids[this.langs.indexOf(lang)]));
            } else {
                console.error("MessageBunch resolution was failded bacause the `channel` did not have an attribute, messages:",this);
                this.vaild=false;
            }
        }
        this.messages = await Promise.all(promise_buffer);

        return this;
    };

    /**need to resolve Messagebunch before execute this method. */
    public origin(): Message|undefined{
        if(!this.solved || !this.vaild){//resolution check
            console.error("`origin` of invalid or unsolved MessageBunch was called:",this);
            return;
        }

        for (let i=0; i<this.original.length; i++){
            if (this.original[i]){
                return this.messages![i];//corresponds to true in original
            }
        }
    };

    public lang(id:string ): string|undefined{
        for (let i=0; i<this.ids.length; i++){
            if (this.ids[i] == id) {
                return this.langs[i];//corresponds to id in ids
            }
        }
    };

    public message(lang:string ): Message|undefined{
        if(!this.solved || !this.vaild){//resolution check
            console.error("`message` of invalid or unsolved ChannelBunch was called:",this);
            return;
        }

        for (let i=0; i<this.langs.length; i++){
            if (this.langs[i] == lang) {
                return this.messages![i]//corresponds to lang in langs
            }
        }
    };
}
