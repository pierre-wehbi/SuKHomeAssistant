import { connect, disconnect } from './ha-entityState.js';
import { initLight, loadLightState, resetLightStatus } from './ha-light.js';
import { initToilet, loadToiletState, resetToiletStatus } from './ha-toilet.js';

export function initHomeAssistant() {
    const statusEl = document.getElementById('ha-connection-status');
    const toggleBtn = document.getElementById('toggle-ha-panel');
    const haPanel = document.getElementById('ha-panel');
    const preview = document.getElementById('preview');
    
    const occupancyStatusEl = document.getElementById('occupancyStatus');
    const lightStatusEl = document.getElementById('lightStatus');
    
    // Initialize toilet and light modules
    initToilet(occupancyStatusEl);
    initLight(lightStatusEl);
    
    // Panel toggle functionality
    toggleBtn.addEventListener('click', () => {
        haPanel.classList.toggle('collapsed');
        preview.classList.toggle('expanded');
        toggleBtn.textContent = haPanel.classList.contains('collapsed') ? '▶' : '◀';
    });
    
    // Disconnect when page unloads
    window.addEventListener('beforeunload', () => {
        disconnect();
    });
    
    // Auto-connect on initialization
    console.log('Auto-connecting to Home Assistant...');
    connect(onConnected, onDisconnected, onAuthenticated);
    
    function onAuthenticated() {
        console.log('Loading initial states...');
        loadToiletState();
        loadLightState();
    }
    
    function onConnected() {
        statusEl.textContent = 'Connected';
        statusEl.className = 'status connected';
    }
    
    function onDisconnected() {
        statusEl.textContent = 'Disconnected';
        statusEl.className = 'status disconnected';
        
        resetToiletStatus();
        resetLightStatus();
    }
}