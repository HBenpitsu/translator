#!/usr/local/bin/node

import {Client,Collection,SlashCommandBuilder,Events,Message,BaseChannel,EmbedBuilder,GatewayIntentBits, Interaction, CommandInteraction} from 'discord.js';
import {readdir} from 'fs/promises';

import dotenv from 'dotenv';
dotenv.config({"path": "../.env"});

import {DatabaseInterface} from './database.js';
import { MessageBunch } from './databunch.js';
export class Bot{
    private token: string;
    public client: Client;
    public database: DatabaseInterface;
    public slashcommands: Collection<
        string,
        {
            data:Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">,
            execute: (bot:Bot,interaction:CommandInteraction)=>void
        }
    >;
    public taskbuffer:string[]=[];

    public replycommands: {
        name:string, 
        execute:(bot:Bot, refered_message: Message, command_message: Message)=>void
    }[];

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
            this,
            mysql_host,
            mysql_user,
            mysql_password,
            mysql_database
        );
        this.slashcommands = new Collection();
        this.replycommands = [];
    }

    /**register modules defined in external files which match to `dir_path/*`.
     * all modules should have a member:register
     * all registers take Bot(this) as an argument.*/
    private async register(dir_path: string): Promise<void>{
        const files = await readdir(`${dir_path}`);
        var promise_buffer = []
        for (let file of files){
            if (file.endsWith('.js')){
                promise_buffer.push(
                    import(
                        `${dir_path}/${file}`
                    ).then(
                        module => {module.register(this)}
                    ).catch(
                        e => {console.error(e);}
                    )
                )
            };
        };
        await Promise.all(promise_buffer)
    }

    /**initialize and run the bot. */
    public async run(): Promise<void>{
        await Promise.all([
            this.register('./eventlisteners'),
            this.register('./slashcommands'),
            this.register('./replycommands')
            ]
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