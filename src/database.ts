import mysql from 'mysql2/promise';
import {MessageBunch,ChannelBunch} from './databunch.js';

export class DatabaseInterface {
    private host: string;
    private user: string;
    private password: string;
    private database: string;
    public connection: mysql.Connection | undefined = undefined;

    constructor(host: string, user: string, password: string, database: string) {
        this.host = host;
        this.user = user;
        this.password = password;
        this.database = database;
    };

    public async init(): Promise<DatabaseInterface>{
        this.connection = await mysql.createConnection({
            host: this.host,
            user: this.user,
            password: this.password,
            database: this.database,
            supportBigNumbers: true
        });
        return this
    };
}

export class MessageData extends DatabaseInterface{

    /**@return if register succeeded. */
    public async register(message_bunch: MessageBunch): Promise<boolean>{
        return true;
    }

    /**@return message bunch */
    public async resolve(messageid: string): Promise<MessageBunch | undefined>{
        return ;
    }
}

export class ChannelData extends DatabaseInterface{
    /**@return if register succeeded. */
    public async register(channelbunch: ChannelBunch): Promise<boolean>{
        return true;
    }

    /**@return message bunch */
    public async resolve(channelid: string): Promise<ChannelBunch | undefined>{
        return ;
    }
}