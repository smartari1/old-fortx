
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Simple Leaflet icon fix without importing image files
import L from 'leaflet';

// Fix default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

import {
  Shield, Users, AlertTriangle, Camera, MapPin as MapPinIcon, Settings,
  Eye, Edit3, Trash2, Plus, Activity, Clock, X, Layers, Search, Compass, Target, Maximize, Minimize
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// Map manager component with enhanced drawing support
const MapManager = ({ 
  onMapClick, 
  onPolygonDrawn,
  isDrawing, 
  drawingType = 'point',
  setMapInstance 
}) => {
  const map = useMap();
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [isDrawingActive, setIsDrawingActive] = useState(false);

  useEffect(() => {
    if (map && setMapInstance) {
      setMapInstance(map);
    }
  }, [map, setMapInstance]);

  useMapEvents({
    click: (e) => {
      // Check if any marker was clicked, if so, don't trigger map click for drawing
      // This is important to prevent map clicks when interacting with draggable pins or other markers
      if (e.originalEvent && e.originalEvent.target && e.originalEvent.target.closest('.leaflet-marker-icon')) {
          return; // Do nothing if a marker was clicked
      }
      
      if (!isDrawing || !e || !e.latlng) return;

      // Prevent default map popup behavior when drawing
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();

      if (drawingType === 'point') {
        // For point drawing, just call onMapClick
        onMapClick(e.latlng);
      } else if (drawingType === 'polygon') {
        // For polygon drawing, collect points
        const newPoint = { latitude: e.latlng.lat, longitude: e.latlng.lng };
        
        if (!isDrawingActive) {
          // Start drawing
          setDrawingPoints([newPoint]);
          setIsDrawingActive(true);
        } else {
          // Continue drawing
          const updatedPoints = [...drawingPoints, newPoint];
          setDrawingPoints(updatedPoints);
          
          // Check if polygon should be completed (minimum 3 points and close to first point)
          if (updatedPoints.length >= 3) {
            const firstPoint = updatedPoints[0];
            const distance = Math.sqrt(
              Math.pow(e.latlng.lat - firstPoint.latitude, 2) + 
              Math.pow(e.latlng.lng - firstPoint.longitude, 2)
            );
            
            // If clicked close to first point, complete polygon
            // The 0.001 tolerance is an approximation for closing a polygon.
            // For more precise real-world distance, use L.latLng().distanceTo()
            if (distance < 0.001) { 
              onPolygonDrawn(updatedPoints);
              setDrawingPoints([]);
              setIsDrawingActive(false);
            }
          }
        }
      }
    },
    dblclick: (e) => {
      // Double click to complete polygon
      // Prevent map zoom on double click when in drawing mode is handled in MapContainer props
      if (isDrawing && drawingType === 'polygon' && drawingPoints.length >= 3) {
        e.originalEvent.preventDefault();
        e.originalEvent.stopPropagation();
        onPolygonDrawn(drawingPoints);
        setDrawingPoints([]);
        setIsDrawingActive(false);
      }
    }
  });

  // Reset drawing when isDrawing becomes false
  useEffect(() => {
    if (!isDrawing) {
      setDrawingPoints([]);
      setIsDrawingActive(false);
    }
  }, [isDrawing]);

  // Render temporary drawing points
  return (
    <>
      {drawingPoints.map((point, index) => (
        <Marker
          key={`drawing-point-${index}`}
          position={[point.latitude, point.longitude]}
          icon={L.divIcon({
            html: `<div style="
              width: 8px;
              height: 8px;
              background-color: #ef4444;
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>`,
            className: 'drawing-point-icon',
            iconSize: [8, 8],
            iconAnchor: [4, 4]
          })}
        />
      ))}
      
      {drawingPoints.length > 1 && (
        <Polyline
          positions={drawingPoints.map(p => [p.latitude, p.longitude])}
          pathOptions={{
            color: '#ef4444',
            weight: 2,
            dashArray: '5, 5'
          }}
        />
      )}
    </>
  );
};

// Enhanced feature renderer with hierarchy support
const FeatureRenderer = ({ features = [], onFeatureClick, isDrawingMode = false, onPinDragEnd }) => {
  if (!Array.isArray(features)) {
    return null;
  }

  return (
    <>
      {features.map((feature, index) => {
        // Safety checks
        if (!feature || typeof feature !== 'object') {
          return null;
        }

        const featureId = feature.id || `feature-${index}`;
        const geometry = feature.geometry || {};
        const coordinates = geometry.coordinates;
        
        if (!coordinates || !Array.isArray(coordinates)) {
          return null;
        }

        const featureProperties = feature.properties || {};
        
        const handleClick = (e) => {
          // Don't handle feature clicks when in drawing mode
          if (isDrawingMode) {
            e.originalEvent.preventDefault();
            e.originalEvent.stopPropagation();
            return;
          }
          
          if (onFeatureClick && featureId !== 'current-drawing' && featureId !== 'parent-boundary-highlight') {
            onFeatureClick(featureId, featureProperties);
          }
        };

        // Create custom icon with hierarchy-aware sizing for generic points
        const color = (featureProperties.color && typeof featureProperties.color === 'string') 
          ? featureProperties.color 
          : '#3B82F6';

        const hierarchyLevel = featureProperties.hierarchy_level || 1;
        const iconSize = Math.max(16, 24 - (hierarchyLevel * 2)); // Smaller icons for deeper hierarchy

        const customIcon = L.divIcon({
          html: `<div style="
            width: ${iconSize}px;
            height: ${iconSize}px;
            background-color: ${color};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            opacity: ${featureProperties.type === 'parent-highlight' ? '0.7' : '1'};
            ${isDrawingMode ? 'pointer-events: none;' : ''}
          "></div>`,
          className: 'custom-map-icon',
          iconSize: [iconSize, iconSize],
          iconAnchor: [iconSize / 2, iconSize / 2]
        });

        if (geometry.type === 'Point' && coordinates.length >= 2) {
          const lat = coordinates[1];
          const lng = coordinates[0];
          
          // Validate coordinates
          if (typeof lat !== 'number' || typeof lng !== 'number' || 
              isNaN(lat) || isNaN(lng) || 
              lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return null;
          }

          // Special styling for pinned locations
          if (featureProperties.type === 'pinned-location') {
            const pinIcon = L.divIcon({
              html: `<div style="
                width: 24px;
                height: 32px;
                background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAyNCAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDlDOSAxNC4yNSAxMiAyMiAxMiAyMkMxMiAyMiAxOSAxNC4yNSAxOSA5QzE5IDUuMTMgMTUuODcgMiAxMiAyWiIgZmlsbD0iIzEwYjk4MSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSI5IiByPSIzIiBmaWxsPSIjZmZmZmZmIi8+Cjwvc3ZnPgo=') no-repeat center;
                background-size: contain;
              "></div>`,
              className: 'custom-pin-icon',
              iconSize: [24, 32],
              iconAnchor: [12, 32]
            });

            return (
              <Marker
                key={featureId}
                position={[lat, lng]}
                icon={pinIcon}
                draggable={true} // Make the pin draggable
                eventHandlers={{
                  click: handleClick,
                  dragend: (e) => {
                    if (onPinDragEnd) {
                      const newLatLng = e.target.getLatLng();
                      onPinDragEnd(featureId, newLatLng.lat, newLatLng.lng);
                    }
                  }
                }}
              >
                {!isDrawingMode && (
                  <Popup>
                    <div style={{ direction: 'rtl', textAlign: 'right' }}>
                      <h4 className="font-bold text-green-700 flex items-center gap-1">
                        <MapPinIcon className="w-4 h-4" />
                        {featureProperties.title || 'מיקום נבחר'}
                      </h4>
                      {featureProperties.description && (
                        <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          {featureProperties.description}
                        </p>
                      )}
                      <p style={{ fontSize: '10px', color: '#10b981', marginTop: '4px' }}>
                        📍 מיקום מדויק שנבחר
                      </p>
                    </div>
                  </Popup>
                )}
              </Marker>
            );
          } else { // Handle general point features
            return (
              <Marker
                key={featureId}
                position={[lat, lng]}
                icon={customIcon}
                eventHandlers={{
                  click: handleClick
                }}
              >
                {!isDrawingMode && (
                  <Popup>
                    <div style={{ direction: 'rtl', textAlign: 'right' }}>
                      <h4>{featureProperties.title || 'מיקום ללא שם'}</h4>
                      {featureProperties.description && (
                        <p style={{ fontSize: '12px', color: '#666' }}>{featureProperties.description}</p>
                      )}
                      {featureProperties.type && (
                        <p style={{ fontSize: '10px', color: '#999' }}>
                          סוג: {featureProperties.type}
                        </p>
                      )}
                    </div>
                  </Popup>
                )}
              </Marker>
            );
          }
        }

        if (geometry.type === 'Polygon' && 
            coordinates && 
            Array.isArray(coordinates) && 
            coordinates.length > 0 && 
            Array.isArray(coordinates[0])) {
          
          try {
            const polygonCoords = coordinates[0]
              .filter(coord => Array.isArray(coord) && coord.length >= 2)
              .map(coord => {
                const lat = coord[1];
                const lng = coord[0];
                // Validate each coordinate
                if (typeof lat !== 'number' || typeof lng !== 'number' || 
                    isNaN(lat) || isNaN(lng) || 
                    lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                  return null;
                }
                return [lat, lng];
              })
              .filter(coord => coord !== null);

            if (polygonCoords.length < 3) {
              return null; // Need at least 3 points for a polygon
            }

            // Enhanced styling based on hierarchy and type
            const fillOpacity = featureProperties.type === 'parent-highlight' ? 0.1 : 0.2;
            const weight = Math.max(1, 4 - hierarchyLevel); // Thicker borders for higher hierarchy

            return (
              <Polygon
                key={featureId}
                positions={polygonCoords}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: fillOpacity,
                  weight: weight,
                  opacity: featureProperties.type === 'parent-highlight' ? 0.8 : 1,
                  dashArray: featureProperties.type === 'parent-highlight' ? '10, 10' : undefined,
                  interactive: !isDrawingMode // Disable interaction when drawing
                }}
                eventHandlers={{
                  click: handleClick
                }}
              >
                {!isDrawingMode && (
                  <Popup>
                    <div style={{ direction: 'rtl', textAlign: 'right' }}>
                      <h4>{featureProperties.title || 'אזור ללא שם'}</h4>
                      {featureProperties.description && (
                        <p style={{ fontSize: '12px', color: '#666' }}>{featureProperties.description}</p>
                      )}
                      {featureProperties.type && featureProperties.type !== 'parent-highlight' && (
                        <p style={{ fontSize: '10px', color: '#999' }}>
                          סוג: {featureProperties.type}
                        </p>
                      )}
                    </div>
                  </Popup>
                )}
              </Polygon>
            );
          } catch (error) {
            console.warn('Error rendering polygon:', error);
            return null;
          }
        }

        return null;
      })}
    </>
  );
};

const EnhancedMapComponent = ({
  features = [],
  users = [],
  center = [31.6996, 35.1127],
  zoom = 14,
  onFeatureClick,
  onMapClick,
  onPolygonDrawn,
  isAdminMode = false,
  showSearch = true,
  selectedFeatureId,
  showUsers = false,
  isDrawingMode = false,
  drawingType = 'point',
  onPinDragEnd // Added new prop for draggable pins
}) => {
  const [mapInstance, setMapInstance] = useState(null);
  const [mapSearchTerm, setMapSearchTerm] = useState('');

  // Handler for when a draggable pin is dropped
  const handlePinDragEnd = (featureId, lat, lng) => {
    console.log(`Pin ${featureId} dragged to: [${lat}, ${lng}]`);
    // If a callback is provided from the parent, invoke it
    if (onPinDragEnd) {
      onPinDragEnd(featureId, lat, lng);
    }
  };

  const handleMapSearch = () => {
    if (!mapSearchTerm || !mapSearchTerm.trim() || !mapInstance) return;
    
    try {
      const searchTermLower = mapSearchTerm.toLowerCase();
      const foundFeature = features.find(f => {
        if (!f || !f.properties) return false;
        const title = f.properties.title || '';
        const description = f.properties.description || '';
        return title.toLowerCase().includes(searchTermLower) ||
               description.toLowerCase().includes(searchTermLower);
      });

      if (foundFeature && 
          foundFeature.geometry && 
          foundFeature.geometry.type === 'Point' && 
          foundFeature.geometry.coordinates &&
          foundFeature.geometry.coordinates.length >= 2) {
        
        const lat = foundFeature.geometry.coordinates[1];
        const lng = foundFeature.geometry.coordinates[0];
        
        if (typeof lat === 'number' && typeof lng === 'number' && 
            !isNaN(lat) && !isNaN(lng)) {
          
          const coords = [lat, lng];
          mapInstance.setView(coords, Math.max(mapInstance.getZoom(), 16));
          
          if (onFeatureClick) {
            onFeatureClick(foundFeature.id, foundFeature.properties);
          }
        }
      } else {
        alert(`לא נמצאו תוצאות עבור "${mapSearchTerm}"`);
      }
    } catch (error) {
      console.error('Error in map search:', error);
      alert('שגיאה בחיפוש במפה');
    }
  };

  const zoomToFeatures = () => {
    if (!mapInstance || !Array.isArray(features) || features.length === 0) return;
    
    try {
      const bounds = L.latLngBounds();
      let hasValidCoords = false;

      features.forEach(feature => {
        if (feature && 
            feature.geometry && 
            feature.geometry.type === 'Point' && 
            feature.geometry.coordinates && 
            feature.geometry.coordinates.length >= 2) {
          
          const lat = feature.geometry.coordinates[1];
          const lng = feature.geometry.coordinates[0];
          
          if (typeof lat === 'number' && typeof lng === 'number' && 
              !isNaN(lat) && !isNaN(lng) && 
              lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            
            bounds.extend([lat, lng]);
            hasValidCoords = true;
          }
        }
      });

      if (hasValidCoords && bounds.isValid()) {
        mapInstance.fitBounds(bounds, { padding: [30, 30] });
      }
    } catch (error) {
      console.error('Error zooming to features:', error);
    }
  };

  // Create user markers with safety checks
  const userMarkers = useMemo(() => {
    if (!showUsers || !Array.isArray(users)) return [];
    
    const statusColorMap = {
      'available': '#10b981',
      'on_patrol': '#3b82f6',  
      'on_break': '#f59e0b',
      'responding_to_incident': '#ef4444',
      'unavailable': '#6b7280',
      'offline': '#374151'
    };
    
    return users.filter(user => {
      if (!user || !user.current_location) return false;
      const lat = user.current_location.latitude;
      const lng = user.current_location.longitude;
      return typeof lat === 'number' && typeof lng === 'number' && 
             !isNaN(lat) && !isNaN(lng) &&
             lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }).map((user, index) => {
      const userId = user.id || `user-${index}`;
      const color = statusColorMap[user.current_status] || '#3B82F6';
      
      const userIcon = L.divIcon({
        html: `<div style="
          width: 20px;
          height: 20px;
          background-color: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        className: 'custom-user-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      return (
        <Marker
          key={userId}
          position={[user.current_location.latitude, user.current_location.longitude]}
          icon={userIcon}
        >
          <Popup>
            <div style={{ direction: 'rtl', textAlign: 'right' }}>
              <h3>{user.full_name || 'משתמש ללא שם'}</h3>
              <p style={{ fontSize: '12px', color: '#666' }}>
                <strong>תפקיד:</strong> {(Array.isArray(user.roles) ? user.roles.join(', ') : user.roles) || 'לא הוגדר'}
              </p>
              <p style={{ fontSize: '12px', color: '#666' }}>
                <strong>סטטוס:</strong> {user.current_status || 'לא ידוע'}
              </p>
            </div>
          </Popup>
        </Marker>
      );
    });
  }, [users, showUsers]);

  // Validate center coordinates
  const validCenter = useMemo(() => {
    if (Array.isArray(center) && center.length >= 2) {
      const lat = center[0];
      const lng = center[1];
      if (typeof lat === 'number' && typeof lng === 'number' && 
          !isNaN(lat) && !isNaN(lng) &&
          lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return center;
      }
    }
    return [31.6996, 35.1127]; // Default to Jerusalem
  }, [center]);

  const validZoom = typeof zoom === 'number' && zoom >= 1 && zoom <= 18 ? zoom : 14;

  return (
    <div className="relative h-full w-full flex flex-col clay-card">
      {showSearch && (
        <div className="p-2 bg-white/80 backdrop-blur-sm shadow-sm rounded-t-lg flex gap-2 items-center border-b">
          <Input
            type="text"
            placeholder="חפש מיקום או ישות..."
            value={mapSearchTerm}
            onChange={(e) => setMapSearchTerm(e.target.value || '')}
            onKeyPress={(e) => e.key === 'Enter' && handleMapSearch()}
            className="clay-input text-sm flex-grow"
          />
          <Button size="sm" onClick={handleMapSearch} className="clay-button">
            <Search className="w-4 h-4 mr-1" /> חיפוש
          </Button>
          <Button size="sm" variant="outline" onClick={zoomToFeatures} className="clay-button" title="הצג הכל">
            <Maximize className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      <div className="flex-grow w-full rounded-b-lg shadow-lg border bg-white">
        <MapContainer
          center={validCenter}
          zoom={validZoom}
          style={{ height: '100%', width: '100%' }}
          className="rounded-lg"
          zoomControl={true}
          doubleClickZoom={!isDrawingMode} // Disable double click zoom when drawing
        >
          <MapManager
            onMapClick={onMapClick}
            onPolygonDrawn={onPolygonDrawn}
            isDrawing={isDrawingMode}
            drawingType={drawingType}
            setMapInstance={setMapInstance}
          />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FeatureRenderer
            features={features}
            onFeatureClick={onFeatureClick}
            isDrawingMode={isDrawingMode}
            onPinDragEnd={onPinDragEnd || handlePinDragEnd} // Pass the new handler
          />

          {userMarkers}
        </MapContainer>
      </div>
    </div>
  );
};

export default EnhancedMapComponent;
