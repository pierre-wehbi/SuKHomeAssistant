import { getEntityState, registerUpdateCallback, isConnected } from './ha-entityState.js';
import { applyColorByProperty, clearColorByProperty, getViewer } from './viewer-extensions.js';

// Toilet configurations
const TOILETS = [
    {
        id: 'men',
        sensor: 'binary_sensor.riegelkontakt_herren_contact',
        roomProperty: 'ha-Room',
        roomValue: 'WC-Men',
        label: 'Men\'s Toilet'
    },
    {
        id: 'women',
        sensor: 'binary_sensor.riegelkontakt_damen_contact',
        roomProperty: 'ha-Room',
        roomValue: 'WC-Women',
        label: 'Women\'s Toilet'
    }
];

let occupancyStatusElement = null;
let toiletStates = {};

export function initToilet(statusElement) {
    occupancyStatusElement = statusElement;
    
    // Register for state updates for all toilets
    TOILETS.forEach(toilet => {
        toiletStates[toilet.id] = null;
        registerUpdateCallback(toilet.sensor, (state) => {
            toiletStates[toilet.id] = state;
            updateToiletStatus();
            applyToiletColoring(toilet, state);
        });
    });
}

export function loadToiletState() {
    if (isConnected()) {
        TOILETS.forEach(toilet => {
            getEntityState(toilet.sensor, (state) => {
                toiletStates[toilet.id] = state;
                updateToiletStatus();
                applyToiletColoring(toilet, state);
            });
        });
    }
}

function updateToiletStatus() {
    if (!occupancyStatusElement) return;
    
    // Create status display for all toilets
    const statuses = TOILETS.map(toilet => {
        const state = toiletStates[toilet.id];
        if (state === 'on') {
            return `🚽 ${toilet.label}: <span style="color: #f44336; font-weight: bold;">OCCUPIED</span>`;
        } else if (state === 'off') {
            return `✅ ${toilet.label}: <span style="color: #4caf50; font-weight: bold;">FREE</span>`;
        } else {
            return `${toilet.label}: <span style="color: #999;">Unknown</span>`;
        }
    });
    
    occupancyStatusElement.innerHTML = statuses.join('<br>');
    occupancyStatusElement.style.fontSize = '18px';
}

async function applyToiletColoring(toilet, state) {
    const viewer = getViewer();
    if (!viewer || !viewer.model) {
        console.warn('Viewer or model not ready, coloring will be applied when model loads');
        return;
    }

    if (state === 'on') {
        // Occupied - color room elements red
        const redColor = new THREE.Vector4(1, 0, 0, 1);
        await applyColorByProperty(toilet.roomProperty, toilet.roomValue, redColor);
        console.log(`Applied red coloring to ${toilet.label}`);
    } else if (state === 'off') {
        // Free - color room elements green
        const greenColor = new THREE.Vector4(0, 1, 0, 1);
        await applyColorByProperty(toilet.roomProperty, toilet.roomValue, greenColor);
        console.log(`Applied green coloring to ${toilet.label}`);
    } else {
        // Unknown - clear room coloring
        await clearColorByProperty(toilet.roomProperty, toilet.roomValue);
        console.log(`Cleared coloring for ${toilet.label}`);
    }
}

export function resetToiletStatus() {
    if (!occupancyStatusElement) return;
    
    // Reset all toilet states
    TOILETS.forEach(toilet => {
        toiletStates[toilet.id] = null;
        clearColorByProperty(toilet.roomProperty, toilet.roomValue);
    });
    
    updateToiletStatus();
}

// Re-apply coloring when a new model is loaded
export function onModelLoaded() {
    TOILETS.forEach(toilet => {
        const state = toiletStates[toilet.id];
        if (state !== null) {
            console.log(`Model loaded, reapplying ${toilet.label} coloring for state:`, state);
            applyToiletColoring(toilet, state);
        }
    });
}