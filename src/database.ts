import mysql from 'mysql2/promise';
import {MessageBunch,ChannelBunch} from './databunch.js';
import { InviteStageInstance } from 'discord.js';
import {Bot} from './main.js';
import moment from 'moment';

export const task = {
    delete: 0
}

export class DatabaseInterface {
    private bot: Bot;
    private host: string;
    private user: string;
    private password: string;
    private database: string;
    private pool: mysql.Pool;
    private _channelbunch_cache: ChannelBunch[];
    public channelbunch_cache_limit:number = 16;

    constructor(bot:Bot ,host: string, user: string, password: string, database: string) {
        this.bot = bot;
        this.host = host;
        this.user = user;
        this.password = password;
        this.database = database;
        this.pool = mysql.createPool({
            connectionLimit: 32,
            host: this.host,
            user: this.user,
            password: this.password,
            database: this.database,
            supportBigNumbers: true
        });
        this._channelbunch_cache = [];
    };

    /**
     * messagebunch needs to be resolved beforehand*/
    public async registerMessage(messagebunch: MessageBunch){
        if(!messagebunch.solved || !messagebunch.vaild){
            console.log("failed to register message because givenmessagebunch was unsolved or invaild:",messagebunch);
            return;
        }
        const connection = await this.pool.getConnection()
        await connection.beginTransaction()

        //decide bunch_id
        var query = `SELECT IFNULL(MIN(bunch_id+1),0) AS next_bunch_id FROM messages WHERE (bunch_id+1) NOT IN (SELECT bunch_id FROM messages);`
        var [data]= await connection.query(query);
         //type check
        if (!(data instanceof Array)){throw new Error(`something unexpected happened on attemp to ${query}`)};
        if ( 'next_bunch_id' in data[0]){
            var next_bunch_id = data[0].next_bunch_id
        } else {
           throw new Error(`something unexpected happened on attemp to ${query}`)
        }

        //send query
        var query = `
            INSERT INTO messages (bunch_id, chl_id, msg_id, lang, original, expiration) VALUES `;
        var values = [];
        for (let i=0; i<messagebunch.ids.length;i++){
            values.push(`(
                ${next_bunch_id},
                ${messagebunch.messages![i]!.channelId},
                ${messagebunch.ids[i]},
                '${messagebunch.langs[i]}',
                ${Number(messagebunch.original[i])},
                '${moment().add(2,'d').format("YYYY-MM-DD")}'
            )`);
        }
        query += values.join(",") + ";";
        await connection.query(query);
        await connection.commit()
        connection.release()

        return;
    }

    /**@return message bunch */
    public async message_bunch_of(channelid:string, messageid: string): Promise<MessageBunch>{
        // get channel bunch
        const channel_bunch = await this.channel_bunch_of(channelid)

        
        //send query
        const connection = await this.pool.getConnection()
        const query = `SELECT msg_id,lang,original FROM messages WHERE bunch_id=(SELECT bunch_id FROM messages WHERE chl_id=${channelid} AND msg_id=${messageid});`
         var [data] = await connection.query(query);
         connection.release();

         //type check
         if (!(data instanceof Array)){throw new Error(`something unexpected happened on attemp to ${query}`)};
         const msg_id=[];
         const lang=[];
         const original=[];
         for (let recode of data) {
             if ("msg_id" in recode && "lang" in recode && "original" in recode){
                 msg_id.push(String(recode.msg_id));
                 lang.push(recode.lang);
                 original.push(Boolean(recode.original))
             } else {
                throw new Error(`something unexpected happened on attemp to ${query}`)
             }
         }
         
         //Generate MessageBunch Instance
         const messagebunch = new MessageBunch(channel_bunch, lang, msg_id, original);
         return messagebunch;
    }
    public async delete_message_bunch(channelId:string, messageId:string){
        const connection = await this.pool.getConnection()
        await connection.beginTransaction()

        //decide bunch_id
        var query = `SELECT bunch_id FROM messages WHERE chl_id=${channelId} AND msg_id=${messageId} LIMIT 1;`
        var [data]= await connection.query(query);
        //type check
        if (!(data instanceof Array)){throw new Error(`something unexpected happened on attemp to ${query}`)};
        if (data.length < 1){
            console.error("unexisting message bunch was attempted to delete.");
            return;
        };
        if ( 'bunch_id' in data[0]){
            var bunch_id = data[0].bunch_id;
        } else {
        throw new Error(`something unexpected happened on attemp to ${query}`);
        };
        //delete message bunch
        var query = `DELETE FROM messages WHERE bunch_id=${bunch_id}`;
        await connection.query(query);
        await connection.commit();
        connection.release();
    }
    public async register_task(task_id:number, channelId:string, messageId:string){
        const connection = await this.pool.getConnection()
        await connection.query(`INSERT INTO taskbuffer VALUES (${task_id},${channelId},${messageId})`)
        connection.release()
    }
    public async task_processing(task_id:number, channelId:string, messageId:string){
        const connection = await this.pool.getConnection()
        const query = `SELECT FROM taskbuffer WHERE task_id=${task_id} AND IDENTIFIER_1=${channelId} AND IDENTIFIER_2=${messageId}`
        const [data] = await connection.query(query)
        connection.release()
        if (!(data instanceof Array)){throw new Error(`something unexpected happened on attemp to ${query}`)};
        if (data.length>0){
            return true;
        } else {
            return false;
        }
    }
    public async done_task(task_id:number, channelId:string, messageId:string){
        const connection = await this.pool.getConnection()
        await connection.query(`DELETE FROM taskbuffer WHERE task_id=${task_id} AND IDENTIFIER_1=${channelId} AND IDENTIFIER_2=${messageId}`)
        connection.release()
    }

    public async registerChannelBunchCache(channelbunch: ChannelBunch){
        this._channelbunch_cache.push(channelbunch)
        if(this._channelbunch_cache.length > this.channelbunch_cache_limit){
            this._channelbunch_cache.shift();
        }
    }    
    
    public lookupChannelBunchCashe(channelId: string): false|ChannelBunch{
        for (let channelbunch of this._channelbunch_cache) {
            if (channelId in channelbunch.ids){
                return channelbunch
            }
        }
        return false;
    }

    public async registerChannel(channelbunch: ChannelBunch){
        const connection = await this.pool.getConnection()
        await connection.beginTransaction()

        //decide bunch_id
        var query = `SELECT IFNULL(MIN(bunch_id+1),0) AS next_bunch_id FROM channels WHERE (bunch_id+1) NOT IN (SELECT bunch_id FROM channels);`
        var [data]=await connection.query(query);
         //type check
        if (!(data instanceof Array)){throw new Error(`something unexpected happened on attemp to ${query}`)};
        if ( 'next_bunch_id' in data[0]){
            var next_bunch_id = data[0].next_bunch_id
        } else {
           throw new Error(`something unexpected happened on attemp to ${query}`)
        }

        //send query
        var query = `INSERT INTO channels(bunch_id, chl_id, lang) VALUES `;
        var values = [];
        for (let i=0; i<channelbunch.ids.length;i++){
            values.push(`(
                ${next_bunch_id},
                ${channelbunch.ids[i]},
                ${channelbunch.langs[i]}
            )`);
        }
        query += values.join(",") + ";";
        await connection.query(query);
        await connection.commit()
        connection.release()
    }

    /**@return channel bunch */
    public async channel_bunch_of(channelid: string): Promise<ChannelBunch>{
        //look into chace
        const cache_responce = this.lookupChannelBunchCashe(channelid);
        if (cache_responce !== false){
            return cache_responce;
        }

        
        //send query
        const connection = await this.pool.getConnection()
        const query = `SELECT chl_id,lang FROM channels WHERE bunch_id=(SELECT bunch_id FROM channels WHERE chl_id=${channelid});`
        var [data] = await connection.query(query)
        connection.release()

        //type check
        if (!(data instanceof Array)){throw new Error(`something unexpected happened on attemp to ${query}`)};

        const chl_id:string[] = [];
        const lang:string[] = [];
        for (let recode of data) {
            if ("chl_id" in recode && "lang" in recode){
                chl_id.push(String(recode.chl_id));
                lang.push(recode.lang);
            } else {
                throw new Error(`something unexpected happened on attemp to ${query}`)
            }
        }
        
        //Generate ChannelBunch Instance
        const channelbunch = new ChannelBunch(lang, chl_id);
        this.registerChannelBunchCache(channelbunch);
        return channelbunch;
    }
}
