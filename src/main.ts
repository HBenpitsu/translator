import {Client,Events,Message,BaseChannel,EmbedBuilder,GatewayIntentBits} from 'discord.js';
import {readdir} from 'fs/promises';

import dotenv from 'dotenv';
dotenv.config({"path": "../.env"});

import {google,deepl} from './translatorInterface.js';
import { DatabaseInterface, MessageData, ChannelData } from './database.js';
import { Extension } from 'typescript';

export class Bot{
    private token: string;
    public client: Client;
    public database: DatabaseInterface;

    constructor(token: string,mysql_host: string,mysql_user: string,mysql_password: string,mysql_database: string) {
        this.token = token;
        this.client = new Client(
            {
                intents:[
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildMessages,
                    GatewayIntentBits.GuildMessageReactions,
                    GatewayIntentBits.MessageContent
                ]
            }
        );
        this.database = new DatabaseInterface(
            mysql_host,
            mysql_user,
            mysql_password,
            mysql_database
        );
    }

    /**register modules defined in external files which match to `dir_path/*`.
     * all modules should have a member:register
     * all registers take Bot(this) as an argument.*/
    private async register(dir_path: string): Promise<void>{
        const files = await readdir(`${dir_path}`);
        const promise_buffer = []
        for (let file of files){
            if (file.endsWith('.js')){
                promise_buffer.push(
                    import(`${dir_path}/${file}`)
                )
            }
        }
        const modules = await Promise.all(promise_buffer)
        for (let module of modules){
            module.register(this)
        }
    }

    /**initialize and run the bot. */
    public async run(): Promise<void>{
        await Promise.all([
            this.register('./eventlisteners'),
            this.register('./slashcommands'),
             this.database.init()]
        );
        
        this.client.login(this.token);
    }
}

const bot = new Bot(
    process.env.TOKEN,
    process.env.MYSQL_HOST,
    process.env.MYSQL_USER,
    process.env.MYSQL_PASSWORD,
    process.env.MYSQL_DATABASE
);
bot.run();