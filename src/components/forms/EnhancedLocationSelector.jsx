
import React, { useState, useEffect } from 'react';
import { Location } from '@/api/entities';
import { MapPin, ChevronDown, ChevronRight, Target, Building, Home, Grid, Box } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import EnhancedMapComponent from '@/components/locations/EnhancedMapComponent';

const EnhancedLocationSelector = ({
  value,
  onChange,
  placeholder = "בחר מיקום",
  disabled = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [locations, setLocations] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Map states for pin placement
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [mapCenter, setMapCenter] = useState([31.6996, 35.1127]);
  const [mapZoom, setMapZoom] = useState(14);
  const [pinnedPoint, setPinnedPoint] = useState(null);
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [mapFeatures, setMapFeatures] = useState([]); // NEW: State to hold map features for EnhancedMapComponent

  const locationTypes = {
    'site': { label: 'אתר', icon: Building },
    'area': { label: 'אזור', icon: Target },
    'subarea': { label: 'תת-אזור', icon: Grid },
    'room': { label: 'חדר', icon: Home },
    'equipment_point': { label: 'נקודת ציוד', icon: Box },
    'checkpoint': { label: 'נקודת ביקורת', icon: MapPin }
  };

  // Load locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const locationsData = await Location.list();
        setLocations(locationsData || []);
        
        // Auto-expand root nodes
        const rootNodes = (locationsData || []).filter(loc => !loc.parent_id);
        setExpandedNodes(new Set(rootNodes.map(loc => loc.id)));
      } catch (error) {
        console.error('Error loading locations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchLocations();
    }
  }, [isOpen]);

  // Parse current value and set initial states for map and selection
  useEffect(() => {
    let currentSelectedLoc = null;
    let currentPinnedPoint = null;

    if (value && typeof value === 'object') {
        if (value.location_id) {
            currentSelectedLoc = locations.find(l => l.id === value.location_id);
        }
        if (value.coordinates) { // Old format for coordinates object {latitude, longitude}
            currentPinnedPoint = value.coordinates;
        } else if (value.latitude && value.longitude) { // New flat format for coordinates
            currentPinnedPoint = { latitude: value.latitude, longitude: value.longitude };
        }
    }

    setSelectedLocation(currentSelectedLoc);
    setPinnedPoint(currentPinnedPoint);

    // Update map features based on selected location and pinned point
    const newFeatures = [];
    if (currentSelectedLoc) {
        if (currentSelectedLoc.boundary_points && currentSelectedLoc.boundary_points.length > 0) {
            newFeatures.push({
                id: `boundary-${currentSelectedLoc.id}`,
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [currentSelectedLoc.boundary_points.map(p => [p.longitude, p.latitude])]
                },
                properties: {
                    title: currentSelectedLoc.name,
                    description: locationTypes[currentSelectedLoc.type]?.label || currentSelectedLoc.type,
                    color: '#3b82f6',
                    type: 'location-boundary'
                }
            });
            // Center map on the location's boundary if selected loc has it
            const firstPoint = currentSelectedLoc.boundary_points[0];
            setMapCenter([firstPoint.latitude, firstPoint.longitude]);
            setMapZoom(16);
        } else if (currentSelectedLoc.coordinates) { // If location itself has a point
            newFeatures.push({
                id: `point-${currentSelectedLoc.id}`,
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [currentSelectedLoc.coordinates.longitude, currentSelectedLoc.coordinates.latitude]
                },
                properties: {
                    title: currentSelectedLoc.name,
                    description: locationTypes[currentSelectedLoc.type]?.label || currentSelectedLoc.type,
                    color: '#3b82f6',
                    type: 'location-point'
                }
            });
            setMapCenter([currentSelectedLoc.coordinates.latitude, currentSelectedLoc.coordinates.longitude]);
            setMapZoom(16);
        }
    }

    if (currentPinnedPoint) {
        newFeatures.push({
            id: 'pinned-location',
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [currentPinnedPoint.longitude, currentPinnedPoint.latitude]
            },
            properties: {
                title: 'המיקום שנבחר',
                description: 'הנקודה המדויקת שנבחרה',
                type: 'pinned-location',
                color: '#ef4444',
                isDraggable: true // Allow dragging for the manually placed pin
            }
        });
        // If there's a pinned point, make sure map is centered around it, unless location boundary is present
        if (!currentSelectedLoc || !currentSelectedLoc.boundary_points || currentSelectedLoc.boundary_points.length === 0) {
            setMapCenter([currentPinnedPoint.latitude, currentPinnedPoint.longitude]);
            setMapZoom(16);
        }
    }

    setMapFeatures(newFeatures);

  }, [value, locations]); // Depend on 'value' and 'locations' for initial setup

  // Build location tree
  const buildLocationTree = (locations, parentId = null) => {
    return locations
      .filter(loc => loc.parent_id === parentId)
      .map(location => ({
        ...location,
        children: buildLocationTree(locations, location.id)
      }));
  };

  const locationTree = buildLocationTree(locations);

  // Filter locations based on search
  const filteredTree = locationTree.filter(location =>
    searchTerm === '' || location.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle node expansion
  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      return newExpanded;
    });
  };

  // Handle location selection from the tree
  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setPinnedPoint(null); // Reset pinned point when a new location is selected

    let initialFeatures = [];

    // If location has boundaries, show map for pin placement
    if (location.boundary_points && location.boundary_points.length > 0) {
      // Center map on the location's boundary
      const firstPoint = location.boundary_points[0];
      setMapCenter([firstPoint.latitude, firstPoint.longitude]);
      setMapZoom(16);
      setShowMapDialog(true);
      setIsPlacingPin(true);

      // Add boundary to initial map features
      initialFeatures.push({
        id: `boundary-${location.id}`,
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [location.boundary_points.map(p => [p.longitude, p.latitude])]
        },
        properties: {
          title: location.name,
          description: locationTypes[location.type]?.label || location.type,
          color: '#3b82f6',
          type: 'location-boundary'
        }
      });

    } else if (location.coordinates) {
      // For point locations, use the location's coordinates directly
      // No need to show map for pin placement, just use its coordinates
      const finalValue = {
        location_id: location.id,
        location_name: location.name,
        latitude: location.coordinates.latitude, // Flat structure
        longitude: location.coordinates.longitude, // Flat structure
        address: location.policy || ''
      };
      onChange(finalValue);
      setIsOpen(false);
      setShowMapDialog(false);

      // Set initial map features if this location has coordinates but no boundary
      initialFeatures.push({
          id: `point-${location.id}`,
          type: 'Feature',
          geometry: {
              type: 'Point',
              coordinates: [location.coordinates.longitude, location.coordinates.latitude]
          },
          properties: {
              title: location.name,
              description: locationTypes[location.type]?.label || location.type,
              color: '#3b82f6',
              type: 'location-point'
          }
      });
      setMapCenter([location.coordinates.latitude, location.coordinates.longitude]);
      setMapZoom(16);

    } else {
      // For locations without specific coordinates or boundaries, just save the location reference
      const finalValue = {
        location_id: location.id,
        location_name: location.name,
        address: location.policy || ''
      };
      onChange(finalValue);
      setIsOpen(false);
      setShowMapDialog(false);
    }

    setMapFeatures(initialFeatures); // Update map features immediately after selection
  };

  // Handle map click for pin placement
  const handleMapClick = (latlng) => {
    if (!isPlacingPin || !selectedLocation) return;
    
    const newCoordinates = {
      latitude: latlng.lat,
      longitude: latlng.lng
    };
    
    setPinnedPoint(newCoordinates);
    setIsPlacingPin(false);
    
    // Update the location result with the pinned coordinates for display purposes within the component
    const updatedSelectedLocation = {
      ...selectedLocation,
      coordinates: newCoordinates // Keep this for internal logic/display
    };
    setSelectedLocation(updatedSelectedLocation);
    
    // Update map features to show the pin and selected location's boundary/point
    const currentFeatures = [];
    
    // Add the selected location's boundary/point if it exists
    if (selectedLocation.boundary_points && selectedLocation.boundary_points.length > 0) {
      currentFeatures.push({
        id: `boundary-${selectedLocation.id}`,
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [selectedLocation.boundary_points.map(p => [p.longitude, p.latitude])]
        },
        properties: {
          title: selectedLocation.name,
          description: locationTypes[selectedLocation.type]?.label || selectedLocation.type,
          color: '#3b82f6',
          type: 'location-boundary'
        }
      });
    } else if (selectedLocation.coordinates) {
        currentFeatures.push({
            id: `point-${selectedLocation.id}`,
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [selectedLocation.coordinates.longitude, selectedLocation.coordinates.latitude]
            },
            properties: {
                title: selectedLocation.name,
                description: locationTypes[selectedLocation.type]?.label || selectedLocation.type,
                color: '#3b82f6',
                type: 'location-point'
            }
        });
    }

    // Add the newly pinned point
    currentFeatures.push({
      id: 'pinned-location',
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [latlng.lng, latlng.lat]
      },
      properties: {
        title: 'מיקום נבחר',
        description: `ב${selectedLocation.name}`,
        color: '#ef4444',
        type: 'pinned-location',
        isDraggable: true // Make the pinned point draggable
      }
    });
    
    setMapFeatures(currentFeatures);
    
    // Return the final location data in the correct format for custom data records
    const finalLocationData = {
      latitude: newCoordinates.latitude,
      longitude: newCoordinates.longitude,
      location_id: selectedLocation.id,
      location_name: selectedLocation.name,
      address: selectedLocation.policy || selectedLocation.name
    };
    
    onChange(finalLocationData);
  };

  // Helper function to check if point is in polygon (kept, though not directly used in outlined handleMapClick)
  const isPointInPolygon = (point, polygon) => {
    const { lat, lng } = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].longitude;
      const yi = polygon[i].latitude;
      const xj = polygon[j].longitude;
      const yj = polygon[j].latitude;

      if (((yi > lat) !== (yj > lat)) &&
          (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  };

  // Handle pin drag end
  const handlePinDragEnd = (featureId, lat, lng) => {
    if (featureId === 'pinned-location') {
      const newCoordinates = { latitude: lat, longitude: lng };
      setPinnedPoint(newCoordinates);
      
      const updatedSelectedLocation = {
        ...selectedLocation,
        coordinates: newCoordinates
      };
      
      setSelectedLocation(updatedSelectedLocation);
      
      // Return updated data
      const finalLocationData = {
        latitude: newCoordinates.latitude,
        longitude: newCoordinates.longitude,
        location_id: selectedLocation.id,
        location_name: selectedLocation.name,
        address: selectedLocation.policy || selectedLocation.name
      };
      
      onChange(finalLocationData);
    }
  };

  // Render tree node
  const renderTreeNode = (location, level = 0) => {
    const hasChildren = location.children && location.children.length > 0;
    const isExpanded = expandedNodes.has(location.id);
    const isSelected = selectedLocation?.id === location.id;
    const TypeIcon = locationTypes[location.type]?.icon || MapPin;

    return (
      <div key={location.id} className="select-none">
        <div
          className={`flex items-center p-2 cursor-pointer hover:bg-gray-50 rounded-md ${
            isSelected ? 'bg-primary-50 border-l-4 border-primary-500' : ''
          }`}
          style={{ marginRight: `${level * 20}px` }}
          onClick={() => handleLocationSelect(location)}
        >
          <div className="flex items-center flex-1 gap-2">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(location.id);
                }}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-6" />}

            <TypeIcon className="w-4 h-4 text-gray-600" />
            <span className="font-medium text-sm">{location.name}</span>
            
            {locationTypes[location.type] && (
              <Badge variant="outline" className="text-xs">
                {locationTypes[location.type].label}
              </Badge>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {location.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Display current value
  const displayValue = () => {
    if (!value) {
      return (
        <div className="flex items-center gap-2 text-gray-500">
          <MapPin className="w-4 h-4" />
          <span>{placeholder}</span>
        </div>
      );
    }
    
    // Handle both old format (object with location_name) and new format (coordinates)
    if (typeof value === 'object') {
      if (value.location_name || value.location_id) {
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1">
              <span className="font-medium">{value.location_name || 'מיקום נבחר'}</span>
              {(value.latitude && value.longitude) && (
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-500">
                    {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      }
      
      // Handle coordinate-only format
      if (value.latitude && value.longitude) {
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <span className="font-medium">מיקום GPS</span>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-xs text-gray-500">
                  {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
                </span>
              </div>
            </div>
          </div>
        );
      }
    }
    
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <MapPin className="w-4 h-4" />
        <span>מיקום לא חוקי</span>
      </div>
    );
  };

  return (
    <>
      {/* Main selector button */}
      <Button
        variant="outline"
        className={`w-full justify-start h-auto py-3 ${className}`}
        onClick={() => setIsOpen(true)}
        disabled={disabled}
      >
        {displayValue()}
      </Button>

      {/* Location selection dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>בחר מיקום</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              placeholder="חפש מיקום..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <ScrollArea className="h-80">
              {loading ? (
                <div className="text-center py-4">טוען מיקומים...</div>
              ) : filteredTree.length > 0 ? (
                filteredTree.map(location => renderTreeNode(location))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  לא נמצאו מיקומים
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Map dialog for pin placement */}
      <Dialog open={showMapDialog} onOpenChange={setShowMapDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              בחר מיקום מדויק ב{selectedLocation?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {isPlacingPin && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-medium text-blue-700">
                    לחץ על המפה כדי לנעוץ סיכה במיקום המדויק
                  </span>
                </div>
                <p className="text-sm text-blue-600">
                  בחר נקודה על המפה.
                </p>
              </div>
            )}

            {pinnedPoint && !isPlacingPin && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <span className="font-medium text-green-700">מיקום נבחר בהצלחה</span>
                      <p className="text-sm text-green-600">
                        קואורדינטות: {pinnedPoint.latitude.toFixed(6)}, {pinnedPoint.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPlacingPin(true)}
                    className="text-blue-600 border-blue-200"
                  >
                    <Target className="w-4 h-4 mr-1" />
                    הזז סיכה
                  </Button>
                </div>
              </div>
            )}
            
            <div className="h-96 rounded-lg overflow-hidden border">
              <EnhancedMapComponent
                features={mapFeatures}
                center={mapCenter}
                zoom={mapZoom}
                onMapClick={handleMapClick}
                onPinDragEnd={handlePinDragEnd}
                showSearch={false}
                isDrawingMode={isPlacingPin}
                drawingType="point"
              />
            </div>
          </div>
          
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setShowMapDialog(false);
                setIsPlacingPin(false);
                // When cancelling, we don't clear the pinnedPoint to allow user to return to same state
              }}
            >
              בטל
            </Button>
            
            <div className="flex gap-2">
              {selectedLocation && !selectedLocation.boundary_points && (
                <Button
                  variant="outline"
                  onClick={() => {
                    // For locations without boundaries, use the location directly
                    const finalValue = {
                      location_id: selectedLocation.id,
                      location_name: selectedLocation.name,
                      // Pass coordinates if they exist, otherwise omit
                      ...(selectedLocation.coordinates && {
                          latitude: selectedLocation.coordinates.latitude,
                          longitude: selectedLocation.coordinates.longitude
                      }),
                      address: selectedLocation.policy || ''
                    };
                    onChange(finalValue);
                    setShowMapDialog(false);
                    setIsOpen(false);
                  }}
                >
                  השתמש במיקום כללי
                </Button>
              )}
              
              {pinnedPoint && !isPlacingPin && (
                <Button
                  onClick={() => {
                    const finalValue = {
                      location_id: selectedLocation.id,
                      location_name: selectedLocation.name,
                      latitude: pinnedPoint.latitude, // Flat structure
                      longitude: pinnedPoint.longitude, // Flat structure
                      address: selectedLocation.policy || ''
                    };
                    onChange(finalValue);
                    setShowMapDialog(false);
                    setIsOpen(false);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  שמור מיקום
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedLocationSelector;
