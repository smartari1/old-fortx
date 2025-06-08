import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
// leaflet.css is imported in Layout.js, which should be sufficient.
// We will rely on the CSS to correctly point to the marker images.

// --- REMOVED ---
// import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
// import markerIcon from 'leaflet/dist/images/marker-icon.png';
// import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// --- REMOVED ---
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: markerIcon2x,
//   iconUrl: markerIcon,
//   shadowUrl: markerShadow,
// });
// It's important that Leaflet's CSS can find its images.
// This usually means the 'images' folder from 'leaflet/dist' needs to be accessible
// in the built public assets, typically at a path like '/images' or similar,
// relative to where the CSS is served or how its URLs are resolved.

// A common fix for projects where Webpack (or similar bundlers) don't handle
// Leaflet's default icon paths correctly is to re-configure L.Icon.Default.
// However, if the platform itself has a standard way of handling static assets from node_modules,
// relying on the default (post-CSS load) might work if those assets are copied correctly.
// Let's try resetting the prototype _getIconUrl, which sometimes helps if it was previously deleted by mistake,
// though generally, not touching L.Icon.Default and letting the CSS do its job is cleaner if assets are served correctly.

// Ensure the default prototype method is intact if it was accidentally deleted previously by other attempts.
// This line is usually part of a fix when trying to MANUALLY override paths,
// but if we are relying on CSS, we should ensure Leaflet's original logic isn't broken.
// For now, let's ensure it's NOT deleted:
// (No specific action here if we haven't deleted it in this version of the code)

// If icons are still broken, the issue is that the image files (marker-icon.png, etc.)
// are not being served from a location that leaflet.css expects.
// The platform (base44) would need to ensure that on build,
// 'node_modules/leaflet/dist/images' is copied to a public path
// and that the CSS URLs resolve correctly.


const MapComponent = ({ locations = [], center = [31.7683, 35.2137], zoom = 8, onMapClick, selectedLocationId }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView(center, zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current);

      if (onMapClick) {
        mapInstanceRef.current.on('click', (e) => {
          onMapClick(e.latlng);
        });
      }
    }
    // Cleanup map instance on component unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center, zoom, onMapClick]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      // Clear existing markers
      Object.values(markersRef.current).forEach(marker => marker.remove());
      markersRef.current = {};

      // Add new markers
      locations.forEach(location => {
        if (location.coordinates && typeof location.coordinates.latitude === 'number' && typeof location.coordinates.longitude === 'number') {
          const marker = L.marker([location.coordinates.latitude, location.coordinates.longitude])
            .addTo(mapInstanceRef.current)
            .bindPopup(`<b>${location.name}</b><br/>${location.type || 'מיקום'}`);
          
          markersRef.current[location.id] = marker;
        }
      });
    }
  }, [locations]);

  // Effect to fly to selected location from external trigger or initial load
   useEffect(() => {
    if (mapInstanceRef.current && selectedLocationId) {
      const location = locations.find(loc => loc.id === selectedLocationId);
      if (location && location.coordinates && typeof location.coordinates.latitude === 'number' && typeof location.coordinates.longitude === 'number') {
        mapInstanceRef.current.flyTo([location.coordinates.latitude, location.coordinates.longitude], 15, {
          animate: true,
          duration: 1
        });
         if (markersRef.current[selectedLocationId]) {
          markersRef.current[selectedLocationId].openPopup();
        }
      }
    }
  }, [selectedLocationId, locations, mapInstanceRef.current]);


  return <div ref={mapRef} style={{ height: '400px', width: '100%' }} className="rounded-xl shadow-lg border clay-card bg-white" />;
};

export default MapComponent;