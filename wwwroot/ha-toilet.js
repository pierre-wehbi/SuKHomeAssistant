import { getEntityState, registerUpdateCallback, isConnected } from './ha-entityState.js';
import { applyColorByProperty, clearColorByProperty } from './viewer-extensions.js';

// Toilet occupancy management
const OCCUPANCY_SENSOR = 'binary_sensor.preasenzmelder_1_occupancy';
const ROOM_PROPERTY = 'ha-Room';
const ROOM_VALUE = 'WC';

let occupancyStatusElement = null;

export function initToilet(statusElement) {
    occupancyStatusElement = statusElement;
    
    // Register for state updates
    registerUpdateCallback(OCCUPANCY_SENSOR, (state) => {
        updateToiletStatus(state);
        applyToiletColoring(state);
    });
}

export function loadToiletState() {
    if (isConnected()) {
        getEntityState(OCCUPANCY_SENSOR, (state) => {
            updateToiletStatus(state);
            applyToiletColoring(state);
        });
    }
}

function updateToiletStatus(state) {
    if (!occupancyStatusElement) return;
    
    if (state === 'on') {
        occupancyStatusElement.textContent = '🚽 OCCUPIED';
        occupancyStatusElement.style.color = '#f44336';
        occupancyStatusElement.style.fontWeight = 'bold';
        occupancyStatusElement.style.fontSize = '28px';
    } else if (state === 'off') {
        occupancyStatusElement.textContent = '✅ FREE';
        occupancyStatusElement.style.color = '#4caf50';
        occupancyStatusElement.style.fontWeight = 'bold';
        occupancyStatusElement.style.fontSize = '28px';
    } else {
        occupancyStatusElement.textContent = 'Unknown';
        occupancyStatusElement.style.color = '#999';
        occupancyStatusElement.style.fontWeight = 'normal';
        occupancyStatusElement.style.fontSize = '24px';
    }
}

async function applyToiletColoring(state) {
    if (state === 'on') {
        // Occupied - color WC room elements red
        const redColor = new THREE.Vector4(1, 0, 0, 1);
        await applyColorByProperty(ROOM_PROPERTY, ROOM_VALUE, redColor);
        console.log('Applied red coloring to WC room');
    } else {
        // Free or unknown - clear WC room coloring
        await clearColorByProperty(ROOM_PROPERTY, ROOM_VALUE);
        console.log('Cleared WC room coloring');
    }
}

export function resetToiletStatus() {
    if (!occupancyStatusElement) return;
    updateToiletStatus(null);
    clearColorByProperty(ROOM_PROPERTY, ROOM_VALUE);
}