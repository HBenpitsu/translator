#!/usr/local/bin/node

/////////////////////////////////////////initialization.//////////////////////////////////////////////////////////////////
const {Client,Events,Message,BaseChannel,EmbedBuilder,TextChannel,GatewayIntentBits,WebhookClient,WebhookClientDataURL, Base, resolveColor} =require('discord.js');
require('dotenv').configDotenv();
const deepl = require('deepl-node');
const deepl_translator_client = new deepl.Translator(process.env.DEEPL_API_KEY);
const {TranslationServiceClient} = require("@google-cloud/translate").v3;
const google_translator_client = new TranslationServiceClient();
const mysql=require('mysql2/promise');
const moment=require('moment');
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

let db_connection;
async function establish_dbconnection(){
    db_connection = await mysql.createConnection({
        host: "localhost",
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        supportBigNumbers: true
});
};

//prepare bot client
const client=new Client({intents:[
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent
]});

const SUPORTTED_LANGUAGES=["ja","fi","en"]

/**
 * @param {BaseChannel} channel  */
async function get_correspond_channels( channel ){
    // return channels which are supossed to be sent translated messages.
    let [ja,fi,en] = await Promise.all(
        [
            client.channels.fetch(process.env.JapaneseChannelID),
            client.channels.fetch(process.env.FinnishChannelID),
            client.channels.fetch(process.env.EnglishChannelID)
        ]
    )
    return {
        'ja' : ja,
        'fi' : fi,
        'en' : en 
    };
}

/**@param {BaseChannel} channel  */
async function get_channel_language( channel ){
    // return the role of the channel: e.g. "ja","fi","en",or something
    const correspond_channels = await get_correspond_channels( channel )
    for (let lang of SUPORTTED_LANGUAGES) {
        if( correspond_channels[lang] == channel) {
            return lang
        };
    };
}

async function deepl_translator( text, origin, into){
    if (into=="en"){
        into = "en-GB"
    }
    let result = await deepl_translator_client.translateText(text, origin, into);
    return result.text;
}

async function google_translator(text, origin, into){
    const req={
        parent: google_translator_client.locationPath(process.env.GOOGLE_PRODUCT_ID,process.env.GOOGLE_LOCATION),
        contents: [text],
        mimeType: "text/plain",
        sourceLanguageCode: origin,
        targetLanguageCode: into
    }
    const res = await google_translator_client.translateText(req);
    return res[0].translations[0].translatedText;
}

/**
 * @param {string} origin - language
 * @param {string} into - language  
 * @param {string} text  */
async function get_translated_text( text , origin, into){
    if (text){
        let [deepl_version,google_version] = await Promise.all([deepl_translator(text, origin, into),google_translator(text, origin, into)]);
        return "deepl: " + deepl_version + "\n" + "google: " + google_version
    } else {
        return ''
    }
}

/**
 * @param {string} original_lang
 * @param {Message} original_message 
 * @param {string} translated_lang
 * @param {Message} translated_message   
 */
async function register_message_to_database(original_message,original_lang,translated_message,translated_lang){
    db_connection.execute(`INSERT INTO messages VALUE (
        ${original_message.channel.id},
        ${original_message.id},
        '${original_lang}',
        ${translated_message.id},
        '${translated_lang}',
        '${moment().add(2,'d').format("YYYY-MM-DD")}
    ')`)
};
/**
 * @param {Message} message 
 * @return {Object}
 */
async function get_correspond_messages( message ){
    const correspond_channel_ids = Object.values(await get_correspond_channels(message.channel)).map(x => x.id);
    const[original, _1] = await db_connection.execute(`
        SELECT original_msg_id,original_lang FROM messages
        WHERE
            (
                original_chl_id IN (${correspond_channel_ids.join()})
            ) AND (
                translated_msg_id=${message.id}
            );
    `);
    if (original.length > 0) {
        var original_msg_id = String(original[0].original_msg_id);
        var original_lang = original[0].original_lang;
    } else {
        var original_msg_id = message.id;
        var original_lang = await get_channel_language(message.channel);
    };
    const [translated_raw, _2] = await db_connection.execute(`
        SELECT translated_msg_id,translated_lang FROM messages
        WHERE
            (
                original_chl_id IN (${correspond_channel_ids.join()})
            ) AND (
                original_msg_id=${original_msg_id}
            );
    `);
    const response_buffer = [
        {
            id: String(original_msg_id),
            lang: original_lang,
            original: true
        }
    ];
    for (const row of translated_raw) {
        response_buffer.push(
            {
                id: String(row.translated_msg_id),
                lang: row.translated_lang,
                original: false
            }
        )
    };
    return response_buffer;
}

async function get_refered_message_id( message,language ){
    if (message.reference){
        const correspond_messages = await get_correspond_messages(
            await message.channel.messages.fetch(message.reference.messageId)
        )
        for (let correspond_message of correspond_messages) {
            if (correspond_message.lang == language){
                return correspond_message.id
            };
        };
    } else {
        return;
    };
}

async function generate_reference_embed(message, lang){
    const [msg_id,correspond_channels] = await Promise.all([get_refered_message_id(message, lang),get_correspond_channels(message.channel)])
    if (typeof msg_id == 'string') {
        const refered_message = await correspond_channels[lang].messages.fetch(msg_id);
        const embed = new EmbedBuilder();
        
        if (refered_message.author.bot) {
            username = refered_message.author.username
        } else {
            username = refered_message.member.nickname
        }

        embed.setAuthor(
            {
                name: "reply_to:" + username,
                url: refered_message.url,
                iconURL: refered_message.author.avatarURL({dynamic: true})
            }
        )
        embed.setColor([25,25,25])
        embed.setTitle(refered_message.content)
        return embed;
    }
}

function generate_original_message_embed(message){
    const embed = new EmbedBuilder();
    embed.setTitle("original")
    embed.setURL(message.url)
    return embed
}

async function generate_embeds(message, lang){
    const response_buffer = [];
    const reference_embed = await generate_reference_embed(message, lang)
    if (typeof reference_embed !== 'undefined') {
        response_buffer.push(reference_embed)
    };
    return response_buffer;
}

/**@param {Message} message  */
async function send_translated_message( message ){
    const [correspond_channels,posted_lang] = await Promise.all([get_correspond_channels(message.channel),get_channel_language(message.channel)]);
    const target_languages = SUPORTTED_LANGUAGES.filter(elm => elm != posted_lang);
    if (typeof posted_lang == 'string'){
        for (const lang of target_languages ) {
            let target_channel = correspond_channels[lang];
            Promise.all(
                [
                    target_channel.fetchWebhooks(),
                    get_translated_text(message.content, posted_lang, lang),
                    generate_embeds(message, lang)
                ]
            ).then(([webhooks,content,embeds])=>{
                    return webhooks.first().send({
                        content: content,
                        username: message.member.nickname,
                        avatarURL: message.author.avatarURL({dynamic: true}),
                        files: Array.from(message.attachments.values()),
                        embeds: embeds
                    });
            }).then(sent_msg => {
                register_message_to_database(message,posted_lang,sent_msg,lang)
            });
        };
    };
}

/**@param {Message} message  */
function is_match_ignore_rule( message ){
    return message.content.startsWith('/') || message.author.bot
}

client.on(Events.MessageCreate,async message=>{
    try{//pass through an error
        if ( ! is_match_ignore_rule(message) ) {
            send_translated_message(message);
        }
    } catch (e) {
        console.error(e);
    }
});

client.once(Events.ClientReady,async client=>{
    console.log('got ready at:',client.readyAt);
});

//RUN
async function main(){
    await establish_dbconnection()
    client.login(process.env.TOKEN);
}
main()