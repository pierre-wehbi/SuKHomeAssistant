const { APS_HUB_ID, APS_PROJECT_ID, APS_ITEM_ID } = require('../config.js');

const service = module.exports = {};

service.getModelConfig = () => {
    if (!APS_HUB_ID || !APS_PROJECT_ID || !APS_ITEM_ID) {
        throw new Error('Model configuration is missing. Please check your .env file.');
    }
    return {
        hub_id: APS_HUB_ID,
        project_id: APS_PROJECT_ID,
        item_id: APS_ITEM_ID
    };
};