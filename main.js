#!/usr/local/bin/node

/////////////////////////////////////////initialization.//////////////////////////////////////////////////////////////////
const {Client,Events,Message,BaseChannel,TextChannel,GatewayIntentBits,WebhookClient,WebhookClientDataURL, Base} =require('discord.js');
require('dotenv').configDotenv();
const deepl = require('deepl-node');
const deepl_translator_client = new deepl.Translator(process.env.DEEPL_API_KEY);
const {TranslationServiceClient} = require("@google-cloud/translate").v3;
const google_translator_client = new TranslationServiceClient();
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
    return {
        'ja' : await client.channels.fetch(process.env.JapaneseChannelID),
        'fi' : await client.channels.fetch(process.env.FinnishChannelID),
        'en' : await client.channels.fetch(process.env.EnglishChannelID)
    };
}

/**@param {BaseChannel} channel  */
async function get_channel_role( channel ){
    // return the role of the channel: e.g. "ja","fi","en",or something
    correspond_channels = await get_correspond_channels( channel )
    for (const elem of SUPORTTED_LANGUAGES) {
        if( correspond_channels[elem] == channel) {
            return elem
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
        deepl_version = await deepl_translator(text, origin, into)
        google_version = await google_translator(text, origin, into)
        return "deepl: " + deepl_version + "\n" + "google: " + google_version
    } else {
        return ''
    }
}

/**@param {Message} message  */
async function send_translated_message( message ){
    //console.log(message);
    let correspond_channels = await get_correspond_channels(message.channel);
    let posted_lang = await get_channel_role(message.channel);
    let target_languages = SUPORTTED_LANGUAGES.filter(elm => elm != posted_lang);

    for ( elem of target_languages ) {
        let target_channel = correspond_channels[elem];
        let webhooks = await target_channel.fetchWebhooks();
        await webhooks.first().send({
            content: await get_translated_text(message.content, posted_lang, elem),
            username: message.member.displayName,
            avatarURL: message.author.avatarURL({dynamic: true}),
            files: Array.from(message.attachments.values())
        });
    };
}

/**@param {Message} message  */
function is_match_ignore_rule( message ){
    return message.content.startsWith('/') || message.author.bot
}

client.on(Events.MessageCreate,async message=>{
    try{
        if ( ! is_match_ignore_rule(message) ) {
            await send_translated_message(message);
        }
    } catch (e) {
        console.error(e);
    }
});

client.once(Events.ClientReady,async client=>{
    console.log('got ready at:',client.readyAt);
});

client.login(process.env.TOKEN);
