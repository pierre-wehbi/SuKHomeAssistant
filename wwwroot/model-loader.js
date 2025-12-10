export async function loadConfiguredModel(viewer) {
    try {
        // Fetch model configuration from server
        const configResp = await fetch('/api/auth/model-config');
        if (!configResp.ok) {
            throw new Error(`Failed to load model config: ${configResp.status} ${configResp.statusText}`);
        }
        const modelConfig = await configResp.json();
        
        // Fetch the latest version of the specified item
        const versionsResp = await fetch(
            `/api/hubs/${modelConfig.hub_id}/projects/${modelConfig.project_id}/contents/${modelConfig.item_id}/versions`
        );
        
        if (!versionsResp.ok) {
            throw new Error(`Failed to fetch versions: ${versionsResp.status} ${versionsResp.statusText}`);
        }
        
        const versions = await versionsResp.json();
        
        if (versions.length === 0) {
            throw new Error('No versions found for the specified item');
        }
        
        // Load the first version (latest)
        const { loadModel } = await import('./viewer.js');
        await loadModel(viewer, Autodesk.Viewing.toUrlSafeBase64(versions[0].id));
        
        return {
            success: true,
            version: versions[0]
        };
    } catch (err) {
        console.error('Failed to load configured model:', err);
        alert(`Could not load model: ${err.message}\nPlease check your .env configuration.`);
        return {
            success: false,
            error: err.message
        };
    }
}