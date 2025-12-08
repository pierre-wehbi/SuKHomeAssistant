const { HA_WS_URL, WS_ACCESS_TOKEN } = require('../config.js');

const service = module.exports = {};

service.getConfig = () => {
    if (!HA_WS_URL || !WS_ACCESS_TOKEN) {
        throw new Error('Home Assistant configuration is missing. Please check your .env file.');
    }
    return {
        ws_url: HA_WS_URL,
        access_token: WS_ACCESS_TOKEN
    };
};

service.getWebSocketUrl = () => HA_WS_URL;

service.getAccessToken = () => WS_ACCESS_TOKEN;