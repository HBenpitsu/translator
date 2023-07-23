CREATE DATABASE discord_translator_bot;
USE discord_translator_bot;
CREATE TABLE messages (original_chl_id BIGINT UNSIGNED, original_msg_id BIGINT UNSIGNED,original_lang CHAR(2),translated_msg_id BIGINT UNSIGNED,translated_lang CHAR(2), expiration DATE);
SET GLOBAL event_scheduler=ON;
CREATE EVENT clean_messages_table ON SCHEDULE EVERY 1 DAY DO DELETE FROM messages WHERE expiration < CURRENT_DATE();
CREATE USER 'discord-translator-bot'@'localhost' IDENTIFIED BY 'password';
GRANT INSERT ON discord_translator_bot.messages TO 'discord-translator-bot'@'localhost';
GRANT SELECT ON discord_translator_bot.messages TO 'discord-translator-bot'@'localhost';
Flush Privileges;