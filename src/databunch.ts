import {Message,BaseChannel} from 'discord.js';

export class ChannelBunch{
    public roles: string[];
    public ids: string[];
    public channels: BaseChannel[]|undefined;
    
    constructor(roles?:string[]|undefined ,ids?:string[]|undefined){
        if (typeof roles == 'undefined'){roles = []}
        if (typeof ids == 'undefined'){ids = []}
        this.roles = roles;
        this.ids = ids;
    };
    public async resolve_ids(){/*imprement me*/};
    public async gather_ids(){/*imprement me*/};
    public role(id:string ){/*imprement me*/};
    public channel(role:string ){/*imprement me*/};
}

export class MessageBunch{
    public roles: string[]|undefined;
    public ids: string[];
    public messages: Message[]|undefined;
    
    constructor(ids:string[] ){
        this.ids = ids;
    };
    public async resolve_ids(){/*imprement me*/};
    public async gather_ids(){/*imprement me*/};
    public author(){/*imprement me*/};
    public role(id:string ){/*imprement me*/};
    public message(role:string ){/*imprement me*/};
}