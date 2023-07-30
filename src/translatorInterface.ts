import deepl from 'deepl-node';
import dotenv from 'dotenv';
dotenv.config();
const deepl_translator_client = new deepl.Translator(process.env.DEEPL_API_KEY);
import google from '@google-cloud/translate';
const {TranslationServiceClient} = google.v3;
const google_translator_client = new TranslationServiceClient();
import moment from 'moment';

/**
 * @param from-language-code
 * @param into-language-code
 * 
 * @return translated text or string:"translation failed"
 */
async function translate_with_deepl(text: string, from: string, to: string): Promise<string>{
    //'en' cannot be accepted by deepl_translator_client.translateText.
    if (to=="en"){to="en-GB"};

    try {
        const result = await deepl_translator_client.translateText(text, from as deepl.SourceLanguageCode, to as deepl.TargetLanguageCode);
        return result.text;
    } catch (error) {
        console.error(error);
        return "translation failed";
    }
};


/**
 * @param from-language-code
 * @param into-language-code
 * 
 * @return translated text or string: "translation failed"
 */
async function translate_with_google(text:string , from:string , to:string): Promise<string>{
    const req={
        parent: google_translator_client.locationPath(process.env.GOOGLE_PRODUCT_ID,process.env.GOOGLE_LOCATION),
        contents: [text],
        mimeType: "text/plain",
        sourceLanguageCode: from,
        targetLanguageCode: to
    }
    
    let res;
    try{
        res = await google_translator_client.translateText(req);
    } catch (error) {
        console.error(error);
        return "translation failed";
    }

    //when translated text is not provided, return "translation failed".
    if (typeof res[0].translations?.length === "undefined"){
        return "translation failed";
    }
    if (typeof res[0].translations[0].translatedText === "string"){
        return res[0].translations[0].translatedText;
    } else {
        return "translation failed";
    }
}

export async function translate(text:string, from:string, to:string, model:string = "google"): Promise<string>{
    switch(model){
        case 'deepl':return translate_with_deepl(text, from, to);
        case 'google':return translate_with_google(text, from, to);
        default: return 'translation failed(unknow model)';
    }
}

export {
    translate_with_deepl as deepl,
    translate_with_google as google
};