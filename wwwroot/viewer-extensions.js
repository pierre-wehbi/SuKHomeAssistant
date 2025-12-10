let currentViewer = null;
let roomElementsCache = {};

/**
 * Initialize the viewer extensions with a viewer instance
 */
export function initViewerExtensions(viewer) {
    currentViewer = viewer;
    console.log('Viewer extensions initialized');
}

/**
 * Clear cache when a new model is loaded
 */
export function clearCache() {
    roomElementsCache = {};
    console.log('Viewer cache cleared');
}

/**
 * Wait for property database to be ready
 * @param {Autodesk.Viewing.Viewer3D} viewer - The viewer instance
 * @returns {Promise<void>}
 */
export function waitForPropertyDb(viewer) {
    return new Promise((resolve) => {
        const model = viewer?.model || currentViewer?.model;
        
        if (!model) {
            console.warn('No model loaded');
            resolve();
            return;
        }
        
        // Check if property database is already loaded
        const propertyDb = model.getPropertyDb();
        if (propertyDb) {
            console.log('Property database already available');
            resolve();
            return;
        }
        
        // Wait for property database to load
        const checkPropertyDb = () => {
            const pdb = model.getPropertyDb();
            if (pdb) {
                console.log('Property database now available');
                resolve();
            } else {
                // Check again after a short delay
                requestAnimationFrame(checkPropertyDb);
            }
        };
        
        checkPropertyDb();
    });
}

/**
 * Find elements by property name and value
 * @param {string} propertyName - The property name to search for (e.g., 'ha-Room')
 * @param {string} propertyValue - The property value to match (e.g., 'WC')
 * @param {boolean} useCache - Whether to use cached results (default: true)
 * @returns {Promise<number[]>} Array of dbIds matching the criteria
 */
export async function findElementsByProperty(propertyName, propertyValue, useCache = true) {
    const cacheKey = `${propertyName}:${propertyValue}`;
    
    if (useCache && roomElementsCache[cacheKey]) {
        console.log(`Using cached elements for ${propertyName}="${propertyValue}"`);
        return roomElementsCache[cacheKey];
    }

    if (!currentViewer || !currentViewer.model) {
        console.warn('Viewer or model not ready');
        return [];
    }

    const model = currentViewer.model;
    const tree = model.getInstanceTree();
    
    if (!tree) {
        console.warn('Model tree not available');
        return [];
    }

    // Get all dbIds in the model
    const allDbIds = [];
    tree.enumNodeChildren(tree.getRootId(), (dbId) => {
        allDbIds.push(dbId);
    }, true);

    console.log(`Searching through ${allDbIds.length} elements for ${propertyName}="${propertyValue}"...`);

    return new Promise((resolve) => {
        model.getBulkProperties(allDbIds, { propFilter: [propertyName] }, (results) => {
            const elementIds = results
                .filter(result => {
                    const prop = result.properties.find(p => 
                        p.displayName === propertyName || p.attributeName === propertyName
                    );
                    return prop && prop.displayValue === propertyValue;
                })
                .map(result => result.dbId);

            console.log(`Found ${elementIds.length} elements for ${propertyName}="${propertyValue}"`);
            
            if (useCache) {
                roomElementsCache[cacheKey] = elementIds;
            }
            
            resolve(elementIds);
        }, (error) => {
            console.error('Error querying bulk properties:', error);
            resolve([]);
        });
    });
}

/**
 * Apply theming color to specific elements
 * @param {number[]} dbIds - Array of element dbIds
 * @param {THREE.Vector4} color - Color to apply (r, g, b, a)
 */
export function applyColorToElements(dbIds, color) {
    if (!currentViewer) {
        console.warn('Viewer not ready');
        return;
    }

    dbIds.forEach(dbId => {
        currentViewer.setThemingColor(dbId, color);
    });

    console.log(`Applied color to ${dbIds.length} elements`);
}

/**
 * Clear theming color from specific elements
 * @param {number[]} dbIds - Array of element dbIds
 */
export function clearColorFromElements(dbIds) {
    if (!currentViewer) {
        console.warn('Viewer not ready');
        return;
    }

    dbIds.forEach(dbId => {
        currentViewer.setThemingColor(dbId, null);
    });

    console.log(`Cleared color from ${dbIds.length} elements`);
}

/**
 * Apply color to elements matching a property criteria
 * @param {string} propertyName - Property name to search
 * @param {string} propertyValue - Property value to match
 * @param {THREE.Vector4} color - Color to apply
 */
export async function applyColorByProperty(propertyName, propertyValue, color) {
    const elementIds = await findElementsByProperty(propertyName, propertyValue);
    
    if (elementIds.length === 0) {
        console.warn(`No elements found for ${propertyName}="${propertyValue}"`);
        return;
    }

    applyColorToElements(elementIds, color);
}

/**
 * Clear color from elements matching a property criteria
 * @param {string} propertyName - Property name to search
 * @param {string} propertyValue - Property value to match
 */
export async function clearColorByProperty(propertyName, propertyValue) {
    const elementIds = await findElementsByProperty(propertyName, propertyValue);
    
    if (elementIds.length === 0) {
        console.warn(`No elements found for ${propertyName}="${propertyValue}"`);
        return;
    }

    clearColorFromElements(elementIds);
}

/**
 * Clear all theming colors in the viewer
 */
export function clearAllColors() {
    if (!currentViewer) {
        console.warn('Viewer not ready');
        return;
    }
    currentViewer.clearThemingColors();
    console.log('Cleared all theming colors');
}

/**
 * Get the current viewer instance
 */
export function getViewer() {
    return currentViewer;
}