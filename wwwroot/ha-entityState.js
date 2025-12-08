// Central entity state management for Home Assistant
let msgIdCounter = 2; // Start at 2 since we used 1 for subscription
let entityStates = {};
let ws = null;
let isAuthenticated = false;
let stateCallbacks = {};
let updateCallbacks = {};

let HA_WS_URL = null;
let WS_ACCESS_TOKEN = null;

function log(message, type = 'info') {
    const time = new Date().toLocaleTimeString();
    if (type === 'error') {
        console.error(`[${time}]`, message);
    } else if (type === 'success') {
        console.log(`[${time}] ✓`, message);
    } else {
        console.log(`[${time}]`, message);
    }
}

export function getEntityState(entityId, callback) {
    if (!ws || ws.readyState !== WebSocket.OPEN || !isAuthenticated) {
        log("Cannot get state: not connected or not authenticated.", "error");
        if (callback) callback(null);
        return;
    }

    const msgId = msgIdCounter++;
    const payload = {
        id: msgId,
        type: "get_states"
    };

    stateCallbacks[msgId] = { entityId, callback };
    ws.send(JSON.stringify(payload));
    log("Requesting all states...", "info");
}

export function registerUpdateCallback(entityId, callback) {
    if (!updateCallbacks[entityId]) {
        updateCallbacks[entityId] = [];
    }
    updateCallbacks[entityId].push(callback);
}

function handleStateUpdate(msg) {
    // Handle response to get_states
    if (msg.type === 'result' && msg.success && Array.isArray(msg.result)) {
        msg.result.forEach(entity => {
            entityStates[entity.entity_id] = entity.state;
        });
        
        // Check if there's a callback waiting for this response
        if (stateCallbacks[msg.id]) {
            const { entityId, callback } = stateCallbacks[msg.id];
            const state = entityStates[entityId];
            if (callback) callback(state);
            delete stateCallbacks[msg.id];
            log(`State for ${entityId}: ${state}`, "info");
        }
    }
    
    // Handle state_changed events
    if (msg.type === 'event' && msg.event && msg.event.event_type === 'state_changed') {
        const entityId = msg.event.data.entity_id;
        const newState = msg.event.data.new_state.state;
        entityStates[entityId] = newState;
        log(`State updated: ${entityId} = ${newState}`, "info");
        
        // Trigger all registered callbacks for this entity
        if (updateCallbacks[entityId]) {
            updateCallbacks[entityId].forEach(callback => callback(newState));
        }
    }
}

let onAuthenticatedCallback = null;

async function loadConfig() {
    try {
        const resp = await fetch('/api/auth/ha-config');
        if (!resp.ok) {
            log(`Failed to load Home Assistant config: ${resp.status} ${resp.statusText}`, 'error');
            return false;
        }
        const config = await resp.json();
        HA_WS_URL = config.ws_url;
        WS_ACCESS_TOKEN = config.access_token;
        log('Home Assistant configuration loaded', 'success');
        return true;
    } catch (err) {
        log('Failed to load Home Assistant config: ' + err.message, 'error');
        return false;
    }
}

export async function connect(onConnect, onDisconnect, onAuthenticated) {
    if (ws) {
        log('Already connected or connecting...', 'info');
        return;
    }

    // Load config if not already loaded
    if (!HA_WS_URL || !WS_ACCESS_TOKEN) {
        const loaded = await loadConfig();
        if (!loaded) {
            log('Cannot connect: failed to load configuration', 'error');
            return;
        }
    }

    onAuthenticatedCallback = onAuthenticated;

    log('Connecting to Home Assistant...', 'info');
    ws = new WebSocket(HA_WS_URL);

    ws.onopen = () => {
        log('Connected to Home Assistant', 'success');
        if (onConnect) onConnect();
    };

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        
        // Log all messages to console
        console.log('RECV:', msg);

        handleStateUpdate(msg);

        if (msg.type === 'auth_required') {
            log('Authenticating...', 'info');
            ws.send(JSON.stringify({
                type: 'auth',
                access_token: WS_ACCESS_TOKEN
            }));
        }

        if (msg.type === 'auth_ok') {
            isAuthenticated = true;
            log('Authenticated successfully', 'success');
            log('Subscribing to state_changed events...', 'info');
            ws.send(JSON.stringify({
                id: 1,
                type: 'subscribe_events',
                event_type: 'state_changed'
            }));
            
            // Notify that authentication is complete
            if (onAuthenticatedCallback) {
                onAuthenticatedCallback();
            }
        }

        if (msg.type === 'auth_invalid') {
            log('Authentication failed!', 'error');
        }
    };

    ws.onclose = (event) => {
        log(`Connection closed: ${event.code} ${event.reason || ''}`, 'info');
        isAuthenticated = false;
        ws = null;
        if (onDisconnect) onDisconnect();
    };

    ws.onerror = (error) => {
        log('WebSocket Error: ' + error.message, 'error');
    };
}

export function disconnect() {
    if (ws) {
        log('Disconnecting...', 'info');
        ws.close();
        ws = null;
        isAuthenticated = false;
    }
}

export function isConnected() {
    return ws !== null && ws.readyState === WebSocket.OPEN && isAuthenticated;
}