import { getEntityState, registerUpdateCallback, isConnected } from './ha-entityState.js';

// Light management
const LIGHT_ENTITY = 'light.kloschild_h';
let lightStatusElement = null;

export function initLight(statusElement) {
    lightStatusElement = statusElement;
    
    // Register for state updates
    registerUpdateCallback(LIGHT_ENTITY, (state) => {
        updateLightStatus(state);
    });
}

export function loadLightState() {
    if (isConnected()) {
        getEntityState(LIGHT_ENTITY, (state) => {
            updateLightStatus(state);
        });
    }
}

function updateLightStatus(state) {
    if (!lightStatusElement) return;
    
    if (state === 'on') {
        lightStatusElement.textContent = '💡 ON';
        lightStatusElement.style.color = '#ffc107';
        lightStatusElement.style.fontWeight = 'bold';
        lightStatusElement.style.fontSize = '28px';
    } else if (state === 'off') {
        lightStatusElement.textContent = '💡 OFF';
        lightStatusElement.style.color = '#9e9e9e';
        lightStatusElement.style.fontWeight = 'bold';
        lightStatusElement.style.fontSize = '28px';
    } else {
        lightStatusElement.textContent = 'Unknown';
        lightStatusElement.style.color = '#999';
        lightStatusElement.style.fontWeight = 'normal';
        lightStatusElement.style.fontSize = '24px';
    }
}

export function resetLightStatus() {
    if (!lightStatusElement) return;
    updateLightStatus(null);
}