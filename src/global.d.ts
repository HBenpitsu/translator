declare namespace NodeJS {
    interface ProcessEnv {
            readonly TOKEN: string;
            readonly APPLICATIONID: string;
            readonly PUBLICKEY: string;
            
            readonly DEEPL_API_KEY: string;
            readonly GOOGLE_APPLICATION_CREDENTIALS: string;
            readonly GOOGLE_PRODUCT_ID: string;
            readonly GOOGLE_LOCATION: string;
            
            readonly MYSQL_HOST: string;
            readonly MYSQL_USER: string;
            readonly MYSQL_DATABASE: string;
            readonly MYSQL_PASSWORD: string;

            readonly JapaneseChannelID: string;
            readonly FinnishChannelID: string;
            readonly EnglishChannelID: string;
        }
}