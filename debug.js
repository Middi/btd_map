// Debug utilities
window.debug = {
    // Check if an image exists at the given URL
    checkImage: function(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    },
    
    // Print all map layers for debugging
    printMapLayers: function() {
        if (!window.map) {
            console.log('Map not initialized');
            return;
        }
        console.log('=== Map Layers ===');
        Object.entries(map._layers).forEach(([id, layer]) => {
            console.log(`Layer ${id}:`, layer);
        });
    },
    
    // Print plane marker state
    printPlaneState: function() {
        if (!window.planeMarker) {
            console.log('Plane marker not initialized');
            return;
        }
        console.log('=== Plane Marker ===');
        console.log('Position:', planeMarker.getLatLng());
        console.log('Opacity:', planeMarker.getOpacity());
        console.log('Element:', planeMarker.getElement());
    }
};

// Add debug functions to the window
window.checkImage = window.debug.checkImage;
window.printMapLayers = window.debug.printMapLayers;
window.printPlaneState = window.debug.printPlaneState;
