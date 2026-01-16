import { getEntityState, registerUpdateCallback, isConnected } from './ha-entityState.js';
import { applyColorByProperty, clearColorByProperty, getViewer } from './viewer-extensions.js';

// Coffee machine configuration
const COFFEE_MACHINE = {
    id: 'coffee',
    sensor: 'sensor.steckdose_kaffemaschine_power',
    roomProperty: 'ha-Room',
    roomValue: 'Coffee Machine',
    label: 'Coffee Machine',
    powerThreshold: 50, // Consider in use if power > 50W
    idleTimeout: 15000 // 15 seconds of low power before marking as free
};

let coffeeStatusElement = null;
let coffeeState = null;
let idleTimer = null;
let lastHighPowerTime = null;

export function initCoffee(statusElement) {
    coffeeStatusElement = statusElement;
    
    registerUpdateCallback(COFFEE_MACHINE.sensor, (state) => {
        handlePowerUpdate(state);
    });
}

export function loadCoffeeState() {
    if (isConnected()) {
        getEntityState(COFFEE_MACHINE.sensor, (state) => {
            handlePowerUpdate(state);
        });
    }
}

function handlePowerUpdate(powerState) {
    const powerValue = parseFloat(powerState);
    
    if (powerValue > COFFEE_MACHINE.powerThreshold) {
        // High power detected - machine is actively brewing/heating
        lastHighPowerTime = Date.now();
        
        // Clear any pending idle timer
        if (idleTimer) {
            clearTimeout(idleTimer);
            idleTimer = null;
        }
        
        // Set to in use if not already
        if (coffeeState !== 'in_use') {
            coffeeState = 'in_use';
            updateCoffeeStatus();
            applyCoffeeColoring('in_use');
            console.log(`Coffee machine in use: ${powerValue}W`);
        }
    } else {
        // Low power - but only mark as free after sustained low power
        if (coffeeState === 'in_use') {
            // Start idle timer if not already running
            if (!idleTimer) {
                console.log(`Low power detected (${powerValue}W), starting idle timer...`);
                idleTimer = setTimeout(() => {
                    coffeeState = 'free';
                    updateCoffeeStatus();
                    applyCoffeeColoring('free');
                    console.log(`Coffee machine free after ${COFFEE_MACHINE.idleTimeout}ms idle`);
                    idleTimer = null;
                }, COFFEE_MACHINE.idleTimeout);
            }
        } else if (coffeeState === null) {
            // Initial state - immediately set to free
            coffeeState = 'free';
            updateCoffeeStatus();
            applyCoffeeColoring('free');
            console.log(`Coffee machine initial state: free (${powerValue}W)`);
        }
    }
}

function updateCoffeeStatus() {
    if (!coffeeStatusElement) return;
    
    if (coffeeState === 'in_use') {
        coffeeStatusElement.innerHTML = `☕ ${COFFEE_MACHINE.label}: <span style="color: #f44336; font-weight: bold;">IN USE</span>`;
    } else if (coffeeState === 'free') {
        coffeeStatusElement.innerHTML = `✅ ${COFFEE_MACHINE.label}: <span style="color: #4caf50; font-weight: bold;">FREE</span>`;
    } else {
        coffeeStatusElement.innerHTML = `${COFFEE_MACHINE.label}: <span style="color: #999;">Unknown</span>`;
    }
    
    coffeeStatusElement.style.fontSize = '18px';
}

async function applyCoffeeColoring(state) {
    const viewer = getViewer();
    if (!viewer || !viewer.model) {
        console.warn('Viewer or model not ready, coloring will be applied when model loads');
        return;
    }

    if (state === 'in_use') {
        const redColor = new THREE.Vector4(1, 0, 0, 1);
        await applyColorByProperty(COFFEE_MACHINE.roomProperty, COFFEE_MACHINE.roomValue, redColor);
        console.log(`Applied red coloring to ${COFFEE_MACHINE.label}`);
    } else if (state === 'free') {
        const greenColor = new THREE.Vector4(0, 1, 0, 1);
        await applyColorByProperty(COFFEE_MACHINE.roomProperty, COFFEE_MACHINE.roomValue, greenColor);
        console.log(`Applied green coloring to ${COFFEE_MACHINE.label}`);
    } else {
        await clearColorByProperty(COFFEE_MACHINE.roomProperty, COFFEE_MACHINE.roomValue);
        console.log(`Cleared coloring for ${COFFEE_MACHINE.label}`);
    }
}

export function resetCoffeeStatus() {
    if (!coffeeStatusElement) return;
    
    if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
    }
    
    coffeeState = null;
    lastHighPowerTime = null;
    clearColorByProperty(COFFEE_MACHINE.roomProperty, COFFEE_MACHINE.roomValue);
    updateCoffeeStatus();
}

export function onModelLoaded() {
    if (coffeeState !== null) {
        console.log(`Model loaded, reapplying ${COFFEE_MACHINE.label} coloring for state:`, coffeeState);
        applyCoffeeColoring(coffeeState);
    }
}