import { initViewerExtensions, clearCache, waitForPropertyDb } from './viewer-extensions.js';

async function getAccessToken(callback) {
    try {
        const resp = await fetch('/api/auth/token');
        if (!resp.ok)
            throw new Error(await resp.text());
        const { access_token, expires_in } = await resp.json();
        callback(access_token, expires_in);
    } catch (err) {
        alert('Could not obtain access token. See console for more details.');
        console.error(err);        
    }
}

export function initViewer(container) {
    return new Promise(function (resolve, reject) {
        Autodesk.Viewing.FeatureFlags.set('DS_ENDPOINTS', true);
        Autodesk.Viewing.Initializer({ env: 'AutodeskProduction', getAccessToken }, function () {
            const config = {
                extensions: ['Autodesk.DocumentBrowser']
            };
            const viewer = new Autodesk.Viewing.GuiViewer3D(container, config);
            viewer.start();
            viewer.setTheme('light-theme');
            
            // Initialize viewer extensions
            initViewerExtensions(viewer);
            
            resolve(viewer);
        });
    });
}

export function loadModel(viewer, urn) {
    // Clear the cache when loading a new model
    clearCache();
    
    function onDocumentLoadSuccess(doc) {
        const viewable = doc.getRoot().getDefaultGeometry();
        
        // Set up event listener for object tree created (when properties are ready)
        const onObjectTreeCreated = () => {
            console.log('Object tree created, checking if properties are ready...');
            
            // Remove the event listener to prevent multiple calls
            viewer.removeEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, onObjectTreeCreated);
            
            // Wait for property database to be ready
            waitForPropertyDb(viewer).then(() => {
                console.log('Property database ready, notifying modules');
                // Now notify modules to reapply colors
                import('./ha-toilet.js').then(module => {
                    if (module.onModelLoaded) {
                        module.onModelLoaded();
                    }
                });
                import('./ha-coffee.js').then(module => {
                    if (module.onModelLoaded) {
                        module.onModelLoaded();
                    }
                });
            });
        };
        
        viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, onObjectTreeCreated);
        
        // Load the document node
        viewer.loadDocumentNode(doc, viewable);
    }
    
    function onDocumentLoadFailure(code, message) {
        alert('Could not load model. See console for more details.');
        console.error(message);
    }

    Autodesk.Viewing.Document.load('urn:' + urn, onDocumentLoadSuccess, onDocumentLoadFailure);
}