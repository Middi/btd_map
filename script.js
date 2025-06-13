// Configuration
const CONFIG = {
    PLANE_ICON_SIZE: [32, 32],
    CITY_ZOOM_LEVEL: 7,
    FLIGHT_ZOOM_LEVEL: 4,
    DEST_ZOOM_LEVEL: 6,
    DEFAULT_LOCATION: [51.505, -0.09],
    DEFAULT_ZOOM: 2,
    BASE_FLIGHT_DURATION: 15000, // Base duration for animation (ms)
    PHASES: {
        ZOOM_TO_ORIGIN: 1200,
        PRE_FLIGHT_DELAY: 1000,
        FLIGHT: 15000,
        ZOOM_TO_DESTINATION: 2000
    }
};

// Global variables
let map, planeMarker, originMarker, destinationMarker, routeLine;
let currentRoute = [], sampledRoute = [];
let animationStartTime, animationFrameId;
let currentSpeed = 5; // Default speed (1-10)
const cityCache = new Map();

// Function to create a city label
function createCityLabel(latLng, text) {
  const label = L.divIcon({
    html: `<div class="city-label">${text}</div>`,
    className: '',
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });

  return L.marker(latLng, {
    icon: label,
    interactive: false,
    zIndexOffset: 1000
  });
}

// Initialize the map
function initMap() {
  // Map initialization code here
  map = L.map('map').setView([51.505, -0.09], 2);

  // Add tile layer (using OpenStreetMap)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  // Add grid overlay
  const gridOverlay = L.DomUtil.create('div', 'grid-overlay');
  map.getPanes().mapPane.appendChild(gridOverlay);

  // Update grid size on move/zoom
  const updateGrid = () => {
    const size = map.getSize();
    gridOverlay.style.width = size.x + 'px';
    gridOverlay.style.height = size.y + 'px';
  };

  map.on('moveend', updateGrid);
  map.on('resize', updateGrid);
  updateGrid();

  // Add dark tile layer
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(map);

  // Add London marker
  const londonMarker = L.marker(CONFIG.DEFAULT_LOCATION, {
    interactive: false
  });

  // Create custom marker with label
  const londonDiv = L.DomUtil.create('div', 'london-marker');
  londonDiv.textContent = 'LONDON';
  londonMarker.setIcon(L.divIcon({
    html: londonDiv,
    className: '',
    iconSize: [60, 30],
    iconAnchor: [30, 15],
    popupAnchor: [0, -10]
  }));

  londonMarker.addTo(map);

  // Create plane marker with custom icon
  const planeIcon = L.divIcon({
    html: '<img src="black-plane.png" class="plane-icon" style="width: 40px; height: 40px; transform-origin: center;">',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    className: 'plane-marker',
    popupAnchor: [0, -20]
  });

  planeMarker = L.marker(CONFIG.DEFAULT_LOCATION, {
    icon: planeIcon,
    zIndexOffset: 1000,
    rotationAngle: 0,
    rotationOrigin: 'center center'
  }).addTo(map);
}

// Set up event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Set up speed control
  const speedSlider = document.getElementById('speed-slider');
  const speedValue = document.getElementById('speed-value');

  // Initialize speed display
  if (speedSlider && speedValue) {
    speedValue.textContent = `${currentSpeed}x`;

    // Handle speed slider changes
    speedSlider.addEventListener('input', (e) => {
      currentSpeed = parseInt(e.target.value);
      speedValue.textContent = `${currentSpeed}x`;
    });
    const destinationInput = document.getElementById("destination").value.trim();
    if (!originInput || !destinationInput) return alert("Enter origin and destination");
  
    clearRoute();
  
    const origin = await geocodeCity(originInput);
    const destination = await geocodeCity(destinationInput);
    if (!origin || !destination) return alert("City not found");
    
    try {
      // Just use the start and end points for a great circle route
      currentRoute = [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng]
      ];
      
      // Add markers and labels at start and end points
      originMarker = L.circleMarker(currentRoute[0], { 
        radius: 5, 
        fillColor: "#3498db", 
        color: "#fff", 
        weight: 1.5,
        fillOpacity: 1
      }).addTo(map);
      
      destinationMarker = L.circleMarker(currentRoute[1], { 
        radius: 5, 
        fillColor: "#3498db", 
        color: "#fff", 
        weight: 1.5,
        fillOpacity: 1
      }).addTo(map);
      
      // Add city labels
      originLabel = createCityLabel(currentRoute[0], originInput.toUpperCase());
      destinationLabel = createCityLabel(currentRoute[1], destinationInput.toUpperCase());
      originLabel.addTo(map);
      destinationLabel.addTo(map);
      
      // Generate great circle route
      generateSampledRoute();
      
      // Position plane at start
      planeMarker.setLatLng(currentRoute[0]);
      
      // Zoom to start point
      map.flyTo(currentRoute[0], CONFIG.CITY_ZOOM_LEVEL, {
        animate: true,
        duration: CONFIG.PHASES.ZOOM_TO_ORIGIN / 1000
      });
      
      // After zooming to start, fit the bounds and start animation
      setTimeout(() => {
        map.fitBounds(L.latLngBounds(currentRoute), {
          padding: [80, 80],
          animate: true,
          duration: 1.2
        });
        
        // Small delay before starting the animation
        setTimeout(() => {
          animationStartTime = null;
          requestAnimationFrame(animatePlane);
        }, 200);
        
      }, CONFIG.PHASES.PRE_FLIGHT_DELAY + CONFIG.PHASES.ZOOM_TO_ORIGIN);
      
    } catch (error) {
      console.error('Error generating route:', error);
      alert('Error generating the route. Please try again.');
    }
  }
  
  function clearRoute() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    [originMarker, destinationMarker, routeLine, originLabel, destinationLabel].forEach(m => m && map.removeLayer(m));
    currentRoute = [];
    sampledRoute = [];
  }
  
  async function geocodeCity(name) {
    if (cityCache.has(name)) return cityCache.get(name);
    const res = await fetch("https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(name));
    const data = await res.json();
    if (!data.length) return null;
    const coords = { lat: +data[0].lat, lng: +data[0].lon };
    cityCache.set(name, coords);
    return coords;
  }
  
  // 🌐 Generate points along a great circle arc
  function generateSampledRoute() {
    sampledRoute = [];
    
    if (currentRoute.length < 2) return;
    
    const start = currentRoute[0];
    const end = currentRoute[currentRoute.length - 1];
    const totalPoints = 100; // Number of points for smooth curve
    
    // Convert to radians
    const lat1 = start[0] * Math.PI / 180;
    const lon1 = start[1] * Math.PI / 180;
    const lat2 = end[0] * Math.PI / 180;
    const lon2 = end[1] * Math.PI / 180;
    
    // Calculate great circle distance
    const d = 2 * Math.asin(
      Math.sqrt(
        Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon1 - lon2) / 2), 2)
      )
    );
    
    // Generate points along the great circle
    for (let i = 0; i <= totalPoints; i++) {
      const f = i / totalPoints;
      const A = Math.sin((1 - f) * d) / Math.sin(d);
      const B = Math.sin(f * d) / Math.sin(d);
      
      // Calculate intermediate point
      const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
      const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
      const z = A * Math.sin(lat1) + B * Math.sin(lat2);
      
      const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
      const lon = Math.atan2(y, x);
      
      // Convert back to degrees and add to route
      sampledRoute.push(L.latLng([
        lat * 180 / Math.PI,
        lon * 180 / Math.PI
      ]));
    }
    
    // Update the route line to show the great circle
    if (routeLine) {
      map.removeLayer(routeLine);
    }
    
    // Create the route line with white dashed style
    routeLine = L.polyline(sampledRoute, {
      color: '#ffffff',
      weight: 2,
      opacity: 0.9,
      dashArray: '5, 5',
      lineCap: 'round',
      lineJoin: 'round',
      className: 'route-line'
    }).addTo(map);
  }
  
  // Fallback to straight line if routing fails
  function fallbackToStraightLine(origin, destination) {
    currentRoute = [[origin.lat, origin.lng], [destination.lat, destination.lng]];
    originMarker = L.circleMarker(currentRoute[0], { 
      radius: 5, 
      fillColor: "#3498db", 
      color: "#fff", 
      weight: 1.5,
      fillOpacity: 1 
    }).addTo(map);
    
    destinationMarker = L.circleMarker(currentRoute[1], { 
      radius: 5, 
      fillColor: "#3498db", 
      color: "#fff", 
      weight: 1.5,
      fillOpacity: 1 
    }).addTo(map);
  
    routeLine = L.polyline(currentRoute, {
      color: '#ffffff',
      weight: 2,
      opacity: 0.9,
      dashArray: '5, 5',
      lineCap: 'round',
      lineJoin: 'round',
      className: 'route-line'
    }).addTo(map);
    
    planeMarker.setLatLng(currentRoute[0]);
    
    map.flyTo(currentRoute[0], CONFIG.CITY_ZOOM_LEVEL, {
      animate: true,
      duration: CONFIG.PHASES.ZOOM_TO_ORIGIN / 1000
    });
    
    setTimeout(() => {
      map.fitBounds(routeLine.getBounds(), {
        padding: [80, 80],
        animate: true,
        duration: 1.2
      });
      
      animationStartTime = null;
      requestAnimationFrame(animatePlane);
    }, CONFIG.PHASES.PRE_FLIGHT_DELAY + CONFIG.PHASES.ZOOM_TO_ORIGIN);
  }
  
  function calculateBearing(start, end) {
    // Convert latitude and longitude from degrees to radians
    const startLat = start.lat * (Math.PI / 180);
    const startLng = start.lng * (Math.PI / 180);
    const endLat = end.lat * (Math.PI / 180);
    const endLng = end.lng * (Math.PI / 180);

    // Calculate the bearing using the Haversine formula
    const y = Math.sin(endLng - startLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) - 
              Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
    
    // Convert to degrees and normalize to 0-360
    let bearing = Math.atan2(y, x) * (180 / Math.PI);
    bearing = (bearing + 360) % 360;
    
    // Adjust for the plane's initial orientation (pointing east/right)
    // Since our plane icon points right by default, we need to subtract 90 degrees
    // to make it point north when bearing is 0
    bearing = (bearing - 90 + 360) % 360;
    
    return bearing;
  }
  
  // ✈️ Animate along pre-sampled points with smooth rotation
  let hasStartedMoving = false;
  let orientationStartTime = null;
  
  function animatePlane(timestamp) {
    if (!animationStartTime) {
      animationStartTime = timestamp;
      orientationStartTime = timestamp;
      
      // Set initial position
      const startPos = sampledRoute[0];
      planeMarker.setLatLng(startPos);
      
      // Calculate initial bearing
      const nextPos = sampledRoute[1] || startPos;
      const initialBearing = calculateBearing(
        { lat: startPos.lat, lng: startPos.lng },
        { lat: nextPos.lat, lng: nextPos.lng }
      );
      
      // Set initial rotation
      const planeEl = planeMarker.getElement();
      if (planeEl) {
        const planeIconEl = planeEl.querySelector('img') || 
                         planeEl.querySelector('.plane-icon') ||
                         planeEl.querySelector('div');
        if (planeIconEl) {
          planeIconEl.style.transition = 'transform 0.5s ease-out';
          planeIconEl.style.transform = `rotate(${initialBearing}deg)`;
          planeIconEl.style.transformOrigin = 'center center';
          planeIconEl.style.willChange = 'transform';
        }
      }
      
      // Continue to next frame
      animationFrameId = requestAnimationFrame(animatePlane);
      return;
    }
    
    // Check if we're still in the orientation phase (first second)
    if (!hasStartedMoving) {
      const orientationElapsed = timestamp - orientationStartTime;
      if (orientationElapsed < 1000) { // 1 second orientation
        animationFrameId = requestAnimationFrame(animatePlane);
        return;
      }
      hasStartedMoving = true;
      animationStartTime = timestamp - 1000; // Adjust start time for smooth transition
    }
    
    // Calculate elapsed time since movement started (excluding orientation time)
    const elapsed = timestamp - animationStartTime;
    
    // Adjust duration based on speed (inverse relationship: higher speed = shorter duration)
    // Speed ranges from 1-10, duration ranges from 2x to 0.2x of base duration
    const speedFactor = 1.8 - (currentSpeed * 0.16); // 1.8 - (1*0.16) = 1.64x at min speed, 1.8 - (10*0.16) = 0.2x at max speed
    const baseDuration = CONFIG.BASE_FLIGHT_DURATION * speedFactor;
    const duration = baseDuration - 1000; // Adjust for orientation time
    
    // Ensure we have valid elapsed time and duration
    if (duration <= 0) {
      console.error('Invalid animation duration');
      return;
    }
    
    const progress = Math.min(elapsed / duration, 1);
    
    // Use easing for smoother animation
    const easeInOutCubic = t => t < 0.5 
      ? 4 * t * t * t 
      : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    
    const easedProgress = easeInOutCubic(progress);
    const index = Math.min(
      Math.floor(easedProgress * (sampledRoute.length - 1)), 
      sampledRoute.length - 2 // Ensure we don't go out of bounds
    );
    
    const nextIndex = index + 1;
    const pos = sampledRoute[index];
    const nextPos = sampledRoute[nextIndex];
    
    if (!pos || !nextPos) return;
    
    // Calculate the bearing to the next point
    const currentPoint = { lat: pos.lat, lng: pos.lng };
    const nextPoint = { lat: nextPos.lat, lng: nextPos.lng };
    
    // Get the bearing in degrees (0 = north, 90 = east, etc.)
    const bearing = calculateBearing(currentPoint, nextPoint);
    
    // Update plane position
    planeMarker.setLatLng(pos);
    
    // Update plane rotation
    const planeEl = planeMarker.getElement();
    if (planeEl) {
      // Get the plane's icon element
      const planeIconEl = planeEl.querySelector('img') || 
                         planeEl.querySelector('.plane-icon') ||
                         planeEl.querySelector('div');
      
      if (planeIconEl) {
        // Apply rotation with smooth transition
        planeIconEl.style.transition = 'transform 0.2s ease-out';
        planeIconEl.style.transform = `rotate(${bearing}deg)`;
        planeIconEl.style.transformOrigin = 'center center';
        planeIconEl.style.willChange = 'transform';
        planeIconEl.style.display = 'block';
      }
    }
    
    // Start zooming in during the last 20% of the journey
    if (progress > 0.8) {
      const zoomProgress = (progress - 0.8) * 5; // Scale to 0-1 for the last 20%
      const targetZoom = CONFIG.DEST_ZOOM_LEVEL;
      const currentZoom = map.getZoom();
      
      if (currentZoom < targetZoom) {
        // Smoothly interpolate between current zoom and target zoom
        const newZoom = currentZoom + (targetZoom - currentZoom) * 0.1;
        map.setView([pos.lat, pos.lng], newZoom, {
          animate: false
        });
      } else {
        // Just update the center if we're at or past target zoom
        map.setView([pos.lat, pos.lng], targetZoom, {
          animate: false
        });
      }
    }
    
    // Continue animation if not finished
    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animatePlane);
    }
  }
  