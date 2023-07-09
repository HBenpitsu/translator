#!/usr/local/bin/node

/////////////////////////////////////////initialization.//////////////////////////////////////////////////////////////////
const {Client,Events,Message,BaseChannel,TextChannel,GatewayIntentBits,WebhookClient,WebhookClientDataURL, Base} =require('discord.js');
require('dotenv').configDotenv();
const deepl = require('deepl-node');
const translator = new deepl.Translator(process.env.DEEPL_API_KEY);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const client=new Client({intents:[
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent
]});

const SUPORTTED_LANGUAGES=["ja","fi","en-GB"]

/**
 * @param {BaseChannel} channel  */
async function get_cooperational_channels( channel ){
    // return channels which are supossed to be sent translated messages.
    return {
        'ja' : await client.channels.fetch(process.env.JapaneseChannelID),
        'fi' : await client.channels.fetch(process.env.FinnishChannelID),
        'en-GB' : await client.channels.fetch(process.env.EnglishChannelID)
    };
}

/**@param {BaseChannel} channel  */
async function get_channel_role( channel ){
    // return the role of the channel: e.g. "ja","fi","en-GB",or something
    cooperational_channels = await get_cooperational_channels( channel )
    for ( i=0 ; i < SUPORTTED_LANGUAGES.length; i++){
        if (cooperational_channels[SUPORTTED_LANGUAGES[i]] == channel) {
            return SUPORTTED_LANGUAGES[i]
        };
    };
}

/**
 * @param {string} origin - language
 * @param {string} into - language  
 * @param {string} text  */

async function get_translated_text( text , origin, into){
    if (text){
        let result = await translator.translateText(text, origin, into);
        return result.text
    } else {
        return ''
    }
}

/**@param {Message} message  */
async function send_translated_message( message ){
    //console.log(message);
    let cooperational_channels = await get_cooperational_channels(message.channel);
    let posted_lang = await get_channel_role(message.channel);
    let target_languages = SUPORTTED_LANGUAGES.filter(elm => elm != posted_lang);

    target_languages.forEach( async elem => {
        let target_channel = cooperational_channels[elem];
        let webhooks = await target_channel.fetchWebhooks();
        await webhooks.first().send({
            content: await get_translated_text(message.content, null, elem),
            username: message.member.displayName,
            avatarURL: message.author.avatarURL({dynamic: true}),
            files: Array.from(message.attachments.values())
        });
    });
}

/**@param {Message} message  */
function is_match_ignore_rule( message ){
    return message.content.startsWith('/') || message.author.bot
}

client.on(Events.MessageCreate,async message=>{
    if ( ! is_match_ignore_rule(message) ) {
        await send_translated_message(message);
    }
});

client.once(Events.ClientReady,async client=>{
    console.log('got ready at:',client.readyAt);
});

client.login(process.env.TOKEN);
