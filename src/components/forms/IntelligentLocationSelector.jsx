import React, { useState, useEffect } from 'react';
import { Location } from '@/api/entities';
import { CustomDataRecord } from '@/api/entities';
import { CustomDataType } from '@/api/entities';
import { InvokeLLM } from '@/api/integrations';
import {
  MapPin, 
  Search, 
  Loader2, 
  X, 
  Navigation, 
  Target,
  Building,
  Home,
  Grid,
  Box,
  Users,
  Shield,
  AlertCircle,
  Info,
  ExternalLink
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import GoogleAddressSelector from '@/components/forms/GoogleAddressSelector';
import EnhancedMapComponent from '@/components/locations/EnhancedMapComponent';

const IntelligentLocationSelector = ({
  value,
  onChange,
  placeholder = "בחר מיקום האירוע",
  disabled = false,
  className = "",
  showNearbyResources = true
}) => {
  const [locations, setLocations] = useState([]);
  const [customDataTypes, setCustomDataTypes] = useState([]);
  const [customDataRecords, setCustomDataRecords] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [nearbyResources, setNearbyResources] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mapFeatures, setMapFeatures] = useState([]);
  const [mapCenter, setMapCenter] = useState([31.6996, 35.1127]);

  const locationTypeLabels = {
    'site': 'אתר',
    'area': 'אזור',
    'subarea': 'תת-אזור',
    'room': 'חדר',
    'equipment_point': 'נקודת ציוד',
    'checkpoint': 'נקודת ביקורת'
  };

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [locationsData, dataTypesData, recordsData] = await Promise.all([
          Location.list(),
          CustomDataType.list(),
          CustomDataRecord.list()
        ]);
        
        setLocations(locationsData || []);
        setCustomDataTypes(dataTypesData || []);
        setCustomDataRecords(recordsData || []);
      } catch (error) {
        console.error('Error loading location data:', error);
      }
    };
    loadData();
  }, []);

  // Check if a point is inside a polygon using ray casting algorithm
  const isPointInPolygon = (point, polygon) => {
    const { latitude: x, longitude: y } = point;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].latitude;
      const yi = polygon[i].longitude;
      const xj = polygon[j].latitude;
      const yj = polygon[j].longitude;
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  };

  // Find the most specific location that contains the given coordinates
  const findContainingLocation = (coordinates) => {
    if (!coordinates || !locations.length) return null;

    const containingLocations = locations.filter(location => {
      if (location.boundary_points && location.boundary_points.length >= 3) {
        return isPointInPolygon(coordinates, location.boundary_points);
      }
      return false;
    });

    if (containingLocations.length === 0) return null;

    // Sort by hierarchy level - most specific first (room > subarea > area > site)
    const hierarchyOrder = { 'room': 4, 'equipment_point': 4, 'checkpoint': 4, 'subarea': 3, 'area': 2, 'site': 1 };
    
    containingLocations.sort((a, b) => {
      const aLevel = hierarchyOrder[a.type] || 0;
      const bLevel = hierarchyOrder[b.type] || 0;
      return bLevel - aLevel; // Descending order
    });

    return containingLocations[0];
  };

  // Find nearby resources within a radius
  const findNearbyResources = (coordinates, radiusMeters = 100) => {
    if (!coordinates || !customDataRecords.length) return [];

    const nearby = [];
    
    customDataRecords.forEach(record => {
      const dataType = customDataTypes.find(dt => dt.slug === record.custom_data_type_slug);
      if (!dataType || !dataType.spatial_config?.is_spatial) return;

      const location = getRecordLocation(record, dataType);
      if (!location) return;

      const distance = calculateDistance(coordinates, location);
      if (distance <= radiusMeters) {
        nearby.push({
          record,
          dataType,
          location,
          distance: Math.round(distance)
        });
      }
    });

    // Sort by distance
    nearby.sort((a, b) => a.distance - b.distance);
    return nearby.slice(0, 10); // Limit to 10 closest
  };

  // Get location from custom data record
  const getRecordLocation = (record, dataType) => {
    if (!dataType.main_location_field_id || !record.data[dataType.main_location_field_id]) return null;
    
    const locData = record.data[dataType.main_location_field_id];
    if (locData && typeof locData.latitude === 'number' && typeof locData.longitude === 'number') {
      return { latitude: locData.latitude, longitude: locData.longitude };
    }
    return null;
  };

  // Calculate distance between two coordinates in meters
  const calculateDistance = (coord1, coord2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = coord1.latitude * Math.PI/180;
    const φ2 = coord2.latitude * Math.PI/180;
    const Δφ = (coord2.latitude - coord1.latitude) * Math.PI/180;
    const Δλ = (coord2.longitude - coord1.longitude) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  // Get display name for custom data record
  const getRecordDisplayName = (record, dataType) => {
    if (dataType.display_name_field_id && record.data[dataType.display_name_field_id]) {
      return record.data[dataType.display_name_field_id];
    }
    
    const commonFields = ['name', 'title', 'identifier', 'label'];
    for (const field of commonFields) {
      if (record.data[field]) return record.data[field];
    }
    
    return `${dataType.name} #${record.id.substring(0, 6)}`;
  };

  // Enhanced address selection with location mapping
  const handleAddressSelection = async (addressData) => {
    if (!addressData || !addressData.latitude || !addressData.longitude) return;

    setIsAnalyzing(true);
    
    try {
      const coordinates = {
        latitude: addressData.latitude,
        longitude: addressData.longitude
      };

      // Find containing location
      const containingLocation = findContainingLocation(coordinates);
      
      // Find nearby resources
      const nearby = findNearbyResources(coordinates, 150); // 150 meter radius
      setNearbyResources(nearby);

      // Create location object
      const locationResult = {
        coordinates,
        address: addressData.formatted_address,
        location_id: containingLocation?.id || null,
        location_name: containingLocation?.name || null,
        location_type: containingLocation?.type || null,
        location_hierarchy: containingLocation ? getLocationHierarchy(containingLocation) : null,
        nearby_resources_count: nearby.length
      };

      setSelectedLocation(locationResult);
      
      // Update map
      setMapCenter([coordinates.latitude, coordinates.longitude]);
      updateMapFeatures(locationResult, containingLocation, nearby);
      
      // Call parent onChange
      onChange(locationResult);

    } catch (error) {
      console.error('Error analyzing location:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Get location hierarchy path
  const getLocationHierarchy = (location) => {
    const hierarchy = [location];
    let current = location;
    
    while (current.parent_id) {
      const parent = locations.find(l => l.id === current.parent_id);
      if (parent) {
        hierarchy.unshift(parent);
        current = parent;
      } else {
        break;
      }
    }
    
    return hierarchy;
  };

  // Update map features
  const updateMapFeatures = (locationResult, containingLocation, nearbyResources) => {
    const features = [];

    // Add the selected point
    features.push({
      id: 'selected-location',
      geometry: {
        type: 'Point',
        coordinates: [locationResult.coordinates.longitude, locationResult.coordinates.latitude]
      },
      properties: {
        title: 'מיקום האירוע',
        description: locationResult.address,
        color: '#EF4444',
        type: 'incident_location'
      }
    });

    // Add containing location boundary if exists
    if (containingLocation && containingLocation.boundary_points && containingLocation.boundary_points.length > 0) {
      features.push({
        id: `containing-location-${containingLocation.id}`,
        geometry: {
          type: 'Polygon',
          coordinates: [containingLocation.boundary_points.map(p => [p.longitude, p.latitude])]
        },
        properties: {
          title: containingLocation.name,
          description: `${locationTypeLabels[containingLocation.type]} מכיל`,
          color: '#10B981',
          type: 'containing_location'
        }
      });
    }

    // Add nearby resources
    nearbyResources.forEach((nearby, index) => {
      if (nearby.location) {
        features.push({
          id: `nearby-${nearby.record.id}`,
          geometry: {
            type: 'Point',
            coordinates: [nearby.location.longitude, nearby.location.latitude]
          },
          properties: {
            title: getRecordDisplayName(nearby.record, nearby.dataType),
            description: `${nearby.dataType.name} - ${nearby.distance}מ'`,
            color: nearby.dataType.spatial_config?.map_color || '#3B82F6',
            type: 'nearby_resource'
          }
        });
      }
    });

    setMapFeatures(features);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedLocation(null);
    setNearbyResources([]);
    setMapFeatures([]);
    onChange(null);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Address Input */}
      <div>
        <GoogleAddressSelector
          value={selectedLocation ? {
            formatted_address: selectedLocation.address,
            latitude: selectedLocation.coordinates.latitude,
            longitude: selectedLocation.coordinates.longitude
          } : null}
          onChange={handleAddressSelection}
          placeholder={placeholder}
          disabled={disabled || isAnalyzing}
        />
        
        {isAnalyzing && (
          <div className="flex items-center gap-2 mt-2 text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">מנתח מיקום ומחפש משאבים קרובים...</span>
          </div>
        )}
      </div>

      {/* Location Analysis Results */}
      {selectedLocation && (
        <div className="space-y-4">
          {/* Location Hierarchy */}
          <Card className="clay-card bg-green-50 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building className="w-4 h-4 text-green-600" />
                מיקום פיזי במערכת
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedLocation.location_id ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700">
                      {locationTypeLabels[selectedLocation.location_type]}
                    </Badge>
                    <span className="font-medium">{selectedLocation.location_name}</span>
                  </div>
                  
                  {selectedLocation.location_hierarchy && selectedLocation.location_hierarchy.length > 1 && (
                    <div className="text-sm text-green-600">
                      <strong>מסלול:</strong> {selectedLocation.location_hierarchy.map(loc => loc.name).join(' → ')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-orange-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">המיקום אינו נמצא בתוך אף אזור מוגדר במערכת</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Nearby Resources */}
          {showNearbyResources && nearbyResources.length > 0 && (
            <Card className="clay-card bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  משאבים קרובים ({nearbyResources.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-48">
                  <div className="space-y-2">
                    {nearbyResources.map((nearby, index) => {
                      const IconComponent = nearby.dataType.icon ? 
                        ({ Users, Shield, Box, MapPin: MapPin }[nearby.dataType.icon] || Target) : Target;
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4" style={{ color: nearby.dataType.spatial_config?.map_color }} />
                            <div>
                              <span className="text-sm font-medium">{getRecordDisplayName(nearby.record, nearby.dataType)}</span>
                              <div className="text-xs text-gray-500">{nearby.dataType.name}</div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {nearby.distance}מ'
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Mini Map */}
          <Card className="clay-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-600" />
                מפת מיקום
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="h-48 rounded border overflow-hidden">
                <EnhancedMapComponent
                  features={mapFeatures}
                  center={mapCenter}
                  zoom={17}
                  showSearch={false}
                />
              </div>
            </CardContent>
          </Card>

          {/* Clear Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={clearSelection}
            className="w-full text-red-600 border-red-200 hover:bg-red-50"
          >
            <X className="w-4 h-4 mr-2" />
            נקה מיקום
          </Button>
        </div>
      )}
    </div>
  );
};

export default IntelligentLocationSelector;