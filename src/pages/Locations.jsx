
import React, { useState, useEffect, useCallback } from 'react';
import { Location } from '@/api/entities';
import { CustomDataRecord } from '@/api/entities';
import { CustomDataType } from '@/api/entities';
import { User } from '@/api/entities';
import {
  Building,
  MapPin,
  Plus,
  Search,
  Edit3,
  Trash2,
  Eye,
  Home,
  Target,
  Navigation,
  Settings,
  Filter,
  MoreVertical,
  Move,
  Merge,
  Info,
  AlertTriangle,
  Save,
  X,
  ChevronRight,
  ChevronDown,
  Layers,
  Grid,
  Box,
  Users as UsersIcon
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import EnhancedMapComponent from '@/components/locations/EnhancedMapComponent';

export default function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    parent_id: '',
    description: '',
    coordinates: null,
    boundary_points: [],
    security_level: 'public',
    access_requirements: {
      requires_escort: false,
      requires_authorization: false,
      authorized_roles: [],
      access_hours: {
        always_accessible: true
      }
    }
  });

  // Map states
  const [mapCenter, setMapCenter] = useState([31.6996, 35.1127]);
  const [mapZoom, setMapZoom] = useState(14);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawnPolygon, setDrawnPolygon] = useState(null);

  // Resource data
  const [resourcesInLocation, setResourcesInLocation] = useState([]);
  const [allCustomDataTypes, setAllCustomDataTypes] = useState([]);

  const locationTypes = [
    { value: 'site', label: 'אתר', icon: Building, isArea: true },
    { value: 'area', label: 'אזור', icon: Target, isArea: true },
    { value: 'subarea', label: 'תת-אזור', icon: Grid, isArea: true },
    { value: 'room', label: 'חדר', icon: Home, isArea: false },
    { value: 'equipment_point', label: 'נקודת ציוד', icon: Box, isArea: false },
    { value: 'checkpoint', label: 'נקודת ביקורת', icon: MapPin, isArea: false }
  ];

  const securityLevels = [
    { value: 'public', label: 'ציבורי', color: 'bg-green-100 text-green-800' },
    { value: 'restricted', label: 'מוגבל', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'confidential', label: 'סודי', color: 'bg-orange-100 text-orange-800' },
    { value: 'top_secret', label: 'סודי ביותר', color: 'bg-red-100 text-red-800' }
  ];

  // Load data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [locationsData, dataTypesData] = await Promise.all([
          Location.list(),
          CustomDataType.list()
        ]);

        setLocations(locationsData || []);
        setAllCustomDataTypes(dataTypesData || []);

        // Auto-expand root level nodes
        const rootNodes = (locationsData || []).filter(loc => !loc.parent_id);
        setExpandedNodes(new Set(rootNodes.map(loc => loc.id)));

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Build location tree
  const buildLocationTree = useCallback((locations, parentId = null) => {
    return locations
      .filter(loc => loc.parent_id === parentId)
      .map(location => ({
        ...location,
        children: buildLocationTree(locations, location.id)
      }));
  }, []);

  const locationTree = buildLocationTree(locations);

  // Filter locations based on search
  const filteredTree = locationTree.filter(location =>
    searchTerm === '' || location.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper function to check if point is inside polygon
  const isPointInPolygon = (point, polygon) => {
    const { lat, lng } = point;
    let inside = false;

    if (!polygon || polygon.length < 3) return false;

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

  // Check if a point/location is within bounds of selected location
  const isLocationInBounds = (recordLocation, boundaryLocation) => {
    if (boundaryLocation.boundary_points && boundaryLocation.boundary_points.length > 0) {
      if (recordLocation.point) {
        return isPointInPolygon({ lat: recordLocation.point.latitude, lng: recordLocation.point.longitude }, boundaryLocation.boundary_points);
      }
      return false;
    } else if (boundaryLocation.coordinates) {
      if (recordLocation.point) {
        const distance = Math.sqrt(
          Math.pow(recordLocation.point.latitude - boundaryLocation.coordinates.latitude, 2) +
          Math.pow(recordLocation.point.longitude - boundaryLocation.coordinates.longitude, 2)
        );
        return distance < 0.01; // Simple proximity check for point-based locations
      }
      return false;
    }
    return false;
  };

  // Handle location selection
  const handleLocationSelect = async (location) => {
    setSelectedLocation(location);

    // Center map on location
    if (location.coordinates) {
      setMapCenter([location.coordinates.latitude, location.coordinates.longitude]);
      setMapZoom(16);
    } else if (location.boundary_points && location.boundary_points.length > 0) {
      const firstPoint = location.boundary_points[0];
      setMapCenter([firstPoint.latitude, firstPoint.longitude]);
      setMapZoom(15);
    }

    // Load resources in this location
    try {
      const resourcePromises = allCustomDataTypes
        .filter(dt => dt.spatial_config?.is_spatial || dt.main_location_field_id)
        .map(async (dataType) => {
          const records = await CustomDataRecord.filter({
            custom_data_type_slug: dataType.slug
          });
          return records.filter(record =>
            (record.location && isLocationInBounds(record.location, location)) ||
            (dataType.main_location_field_id && record.data?.[dataType.main_location_field_id] === `loc_${location.id}`)
          ).map(record => ({
            ...record,
            dataType: dataType
          }));
        });

      const allResources = await Promise.all(resourcePromises);
      setResourcesInLocation(allResources.flat());
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setSaving(true);

      const dataToSend = {
        name: formData.name,
        type: formData.type,
        parent_id: formData.parent_id === '' ? null : formData.parent_id,
        policy: formData.description,
        coordinates: formData.coordinates,
        boundary_points: drawnPolygon || formData.boundary_points,
        security_level: formData.security_level,
        access_requirements: formData.access_requirements
      };

      let savedLocation;
      if (editingLocation) {
        savedLocation = await Location.update(editingLocation.id, dataToSend);
      } else {
        savedLocation = await Location.create(dataToSend);
      }

      // Refresh locations
      const updatedLocations = await Location.list();
      setLocations(updatedLocations);

      // Clean up old location references in other entities
      await cleanupLocationReferences(updatedLocations);

      setShowLocationForm(false);
      setEditingLocation(null);
      resetForm();

    } catch (error) {
      console.error('Error saving location:', error);
      alert(`שגיאה בשמירת המיקום: ${error.message || error}`);
    } finally {
      setSaving(false);
    }
  };

  // Clean up location references in other entities
  const cleanupLocationReferences = async (validLocations) => {
    try {
      const validLocationIds = new Set(validLocations.map(loc => `loc_${loc.id}`));

      const allDataTypes = await CustomDataType.list();

      for (const dataType of allDataTypes) {
        if (dataType.spatial_config?.is_spatial || dataType.main_location_field_id) {
          const records = await CustomDataRecord.filter({
            custom_data_type_slug: dataType.slug
          });

          for (const record of records) {
            let needsUpdate = false;
            const updatedData = { ...record.data };

            Object.keys(updatedData).forEach(key => {
              if (typeof updatedData[key] === 'string' &&
                  updatedData[key].startsWith('loc_') &&
                  !validLocationIds.has(updatedData[key])) {
                updatedData[key] = null;
                needsUpdate = true;
              }
            });

            if (needsUpdate) {
              await CustomDataRecord.update(record.id, { data: updatedData });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up location references:', error);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      parent_id: '',
      description: '',
      coordinates: null,
      boundary_points: [],
      security_level: 'public',
      access_requirements: {
        requires_escort: false,
        requires_authorization: false,
        authorized_roles: [],
        access_hours: {
          always_accessible: true
        }
      }
    });
    setDrawnPolygon(null);
    setIsDrawingMode(false);
  };

  // Handle location creation
  const handleCreateLocation = (parentLocation = null) => {
    setEditingLocation(null);
    setFormData({
      ...formData,
      parent_id: parentLocation?.id || ''
    });
    setShowLocationForm(true);
  };

  // Handle location editing
  const handleEditLocation = (location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name || '',
      type: location.type || '',
      parent_id: location.parent_id || '',
      description: location.policy || '',
      coordinates: location.coordinates || null,
      boundary_points: location.boundary_points || [],
      security_level: location.security_level || 'public',
      access_requirements: location.access_requirements || {
        requires_escort: false,
        requires_authorization: false,
        authorized_roles: [],
        access_hours: {
          always_accessible: true
        }
      }
    });
    setDrawnPolygon(location.boundary_points || null);
    setIsDrawingMode(false);
    setShowLocationForm(true);
  };

  // Handle location deletion with cleanup
  const handleDeleteLocation = async (locationToDelete) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את "${locationToDelete.name}"?
      פעולה זו תמחק גם את כל תתי-המיקומים שלו.`)) return;

    try {
      // Find all descendants of the location to delete
      const getDescendants = (locId) => {
        const children = locations.filter(loc => loc.parent_id === locId);
        return [...children, ...children.flatMap(child => getDescendants(child.id))];
      };

      const descendants = getDescendants(locationToDelete.id);
      const locationsToRemove = [locationToDelete, ...descendants];

      // Delete all identified locations, starting from children to avoid foreign key issues
      for (const loc of locationsToRemove.reverse()) {
        await Location.delete(loc.id);
      }

      // Refresh and cleanup
      const updatedLocations = await Location.list();
      setLocations(updatedLocations);
      await cleanupLocationReferences(updatedLocations);

      if (selectedLocation?.id === locationToDelete.id || descendants.some(d => d.id === selectedLocation?.id)) {
        setSelectedLocation(null);
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      alert(`שגיאה במחיקת המיקום: ${error.message || error}`);
    }
  };

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

  // Render location tree node
  const renderTreeNode = (location, level = 0) => {
    if (!location) return null;

    const hasChildren = location.children && location.children.length > 0;
    const isExpanded = expandedNodes && expandedNodes.has(location.id);
    const isSelected = selectedLocation?.id === location.id;
    const TypeIcon = locationTypes.find(t => t.value === location.type)?.icon || MapPin;

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

            {location.security_level && location.security_level !== 'public' && (
              <Badge className={securityLevels.find(s => s.value === location.security_level)?.color}>
                {securityLevels.find(s => s.value === location.security_level)?.label}
              </Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleCreateLocation(location)}>
                <Plus className="w-4 h-4 mr-2" />
                הוסף תת-מיקום
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditLocation(location)}>
                <Edit3 className="w-4 h-4 mr-2" />
                ערוך
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDeleteLocation(location)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                מחק
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {location.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Enhanced map click handler that respects hierarchy
  const handleMapClick = (latlng) => {
    if (!isDrawingMode || !formData.type) return;

    const typeConfig = locationTypes.find(t => t.value === formData.type);
    if (!typeConfig) return;

    if (!typeConfig.isArea) {
      // For point-based locations, just set the coordinates
      setFormData(prev => ({
        ...prev,
        coordinates: {
          latitude: latlng.lat,
          longitude: latlng.lng
        }
      }));
      setIsDrawingMode(false);
    }
  };

  // Enhanced polygon drawing - allow all drawing but warn if outside parent
  const handlePolygonDrawn = (polygonPoints) => {
    if (!isDrawingMode || !formData.type) return;

    const typeConfig = locationTypes.find(t => t.value === formData.type);
    if (!typeConfig || !typeConfig.isArea) return;

    // Always allow the polygon to be drawn
    setDrawnPolygon(polygonPoints);
    setFormData(prev => ({
      ...prev,
      boundary_points: polygonPoints,
      coordinates: null
    }));
    setIsDrawingMode(false);

    // Check if it's within parent boundaries and show warning if not
    if (formData.parent_id) {
      const parentLocation = locations.find(l => l.id === formData.parent_id);
      if (parentLocation && parentLocation.boundary_points && parentLocation.boundary_points.length > 0) {
        const allPointsInside = polygonPoints.every(point =>
          isPointInPolygon(
            { lat: point.latitude, lng: point.longitude },
            parentLocation.boundary_points
          )
        );

        if (!allPointsInside) {
          // Show warning but don't prevent saving
          setTimeout(() => {
            alert('שים לב: האזור שציירת חורג חלקית מגבולות המיקום ההורה. זה עדיין יישמר, אבל וודא שזה מה שהתכוונת אליו.');
          }, 500);
        }
      }
    }
  };

  // Get available parent locations based on hierarchy rules
  const getAvailableParentLocations = () => {
    if (!formData.type) return [];

    const typeHierarchy = {
      'site': [],
      'area': ['site'],
      'subarea': ['area'],
      'room': ['subarea'],
      'equipment_point': ['room', 'subarea', 'area'],
      'checkpoint': ['room', 'subarea', 'area', 'site']
    };

    const allowedParentTypes = typeHierarchy[formData.type] || [];

    return locations.filter(location =>
      allowedParentTypes.includes(location.type) &&
      location.id !== editingLocation?.id
    );
  };

  // Get hierarchy level for styling on map
  const getHierarchyLevel = (location) => {
    const levels = { 'site': 1, 'area': 2, 'subarea': 3, 'room': 4, 'equipment_point': 5, 'checkpoint': 5 };
    return levels[location.type] || 1;
  };

  // Create features for map with enhanced hierarchy visualization
  const mapFeatures = locations.map(location => {
    const typeDefinition = locationTypes.find(t => t.value === location.type);
    const isSelected = selectedLocation?.id === location.id;
    const isParentOfSelected = selectedLocation && selectedLocation.parent_id === location.id;
    const isChildOfSelected = selectedLocation && location.parent_id === selectedLocation.id;

    let color = '#3b82f6';
    if (isSelected) color = '#ef4444';
    else if (isParentOfSelected) color = '#10b981';
    else if (isChildOfSelected) color = '#f59e0b';

    if (typeDefinition?.isArea && location.boundary_points && location.boundary_points.length > 0) {
      return {
        id: location.id,
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [location.boundary_points.map(p => [p.longitude, p.latitude])]
        },
        properties: {
          title: location.name,
          description: location.policy || '',
          type: location.type,
          color: color,
          isPolygon: true,
          hierarchy_level: getHierarchyLevel(location)
        }
      };
    } else if (location.coordinates) {
      return {
        id: location.id,
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [location.coordinates.longitude, location.coordinates.latitude]
        },
        properties: {
          title: location.name,
          description: location.policy || '',
          type: location.type,
          color: color,
          isPolygon: false,
          hierarchy_level: getHierarchyLevel(location)
        }
      };
    }
    return null;
  }).filter(Boolean);

  // Add currently drawn polygon to map features
  if (drawnPolygon && drawnPolygon.length > 0) {
    let polygonColor = '#8B008B'; // Purple for new drawing

    // Check if it's within parent boundaries for visual feedback
    if (formData.parent_id) {
      const parentLocation = locations.find(l => l.id === formData.parent_id);
      if (parentLocation && parentLocation.boundary_points && parentLocation.boundary_points.length > 0) {
        const allPointsInside = drawnPolygon.every(point =>
          isPointInPolygon(
            { lat: point.latitude, lng: point.longitude },
            parentLocation.boundary_points
          )
        );
        
        // Green if inside, orange if partially outside (but still allow)
        polygonColor = allPointsInside ? '#10b981' : '#f59e0b';
      }
    }

    mapFeatures.push({
      id: 'current-drawing',
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [drawnPolygon.map(p => [p.longitude, p.latitude])]
      },
      properties: {
        title: 'אזור חדש',
        description: 'נמצא בציור',
        type: 'drawing',
        color: polygonColor,
        isPolygon: true
      }
    });
  }

  // Add currently selected coordinate point
  if (formData.coordinates && isDrawingMode && !locationTypes.find(t => t.value === formData.type)?.isArea) {
    let pointColor = '#FFA500'; // Orange for new point

    // Check if point is within parent boundaries for visual feedback
    if (formData.parent_id) {
      const parentLocation = locations.find(l => l.id === formData.parent_id);
      if (parentLocation && parentLocation.boundary_points && parentLocation.boundary_points.length > 0) {
        const isValid = isPointInPolygon(
          { lat: formData.coordinates.latitude, lng: formData.coordinates.longitude },
          parentLocation.boundary_points
        );
        pointColor = isValid ? '#10b981' : '#f59e0b'; // Green if inside, orange if outside
      }
    }

    mapFeatures.push({
      id: 'current-point',
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [formData.coordinates.longitude, formData.coordinates.latitude]
      },
      properties: {
        title: 'נקודה חדשה',
        description: 'נקודה שנבחרה',
        type: 'drawing-point',
        color: pointColor,
        isPolygon: false
      }
    });
  }

  // Show parent boundaries when in drawing mode with lower opacity
  if (isDrawingMode && formData.parent_id) {
    const parentLocation = locations.find(l => l.id === formData.parent_id);
    if (parentLocation && parentLocation.boundary_points && parentLocation.boundary_points.length > 0) {
      mapFeatures.push({
        id: 'parent-boundary-highlight',
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [parentLocation.boundary_points.map(p => [p.longitude, p.latitude])]
        },
        properties: {
          title: `גבול הורה: ${parentLocation.name}`,
          description: 'מומלץ לצייר בתוך הגבול הזה',
          type: 'parent-highlight',
          color: '#10b981',
          isPolygon: true,
          opacity: 0.2 // Lower opacity so it doesn't interfere
        }
      });
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50" dir="rtl">
      {/* Left Sidebar - Location Tree */}
      <div className="w-80 bg-white border-l shadow-lg flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Building className="w-6 h-6 text-primary-600" />
              ניהול מיקומים
            </h2>
            <Button onClick={() => handleCreateLocation()} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              הוסף
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="חפש מיקום..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredTree.length > 0 ? (
              filteredTree.map(location => renderTreeNode(location))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>לא נמצאו מיקומים</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Center - Map */}
      <div className="flex-1 relative">
        <EnhancedMapComponent
          features={mapFeatures}
          center={mapCenter}
          zoom={mapZoom}
          onFeatureClick={(featureId) => {
            const location = locations.find(l => l.id === featureId);
            if (location) handleLocationSelect(location);
          }}
          onMapClick={handleMapClick}
          onPolygonDrawn={handlePolygonDrawn}
          isDrawingMode={isDrawingMode}
          drawingType={formData.type && locationTypes.find(t => t.value === formData.type)?.isArea ? 'polygon' : 'point'}
          showSearch={false}
        />

        {isDrawingMode && (
          <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg z-40">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">
                {formData.type && locationTypes.find(t => t.value === formData.type)?.isArea
                  ? 'מצב ציור גבולות'
                  : 'מצב בחירת נקודה'
                }
              </span>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              {formData.type && locationTypes.find(t => t.value === formData.type)?.isArea
                ? 'לחץ על המפה כדי להתחיל לצייר גבולות'
                : 'לחץ על המפה כדי לבחור מיקום'
              }
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsDrawingMode(false);
                setDrawnPolygon(editingLocation?.boundary_points || null);
                setFormData(prev => ({
                  ...prev,
                  coordinates: editingLocation?.coordinates || null,
                  boundary_points: editingLocation?.boundary_points || []
                }));
              }}
            >
              בטל ציור
            </Button>
          </div>
        )}
      </div>

      {/* Right Panel - Location Details */}
      {selectedLocation && (
        <div className="w-96 bg-white border-r shadow-lg">
          <Tabs defaultValue="details" className="h-full flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">{selectedLocation.name}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLocation(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">פרטים</TabsTrigger>
                <TabsTrigger value="resources">משאבים</TabsTrigger>
                <TabsTrigger value="security">אבטחה</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4">
                <TabsContent value="details" className="mt-0">
                  <Card className="clay-card">
                    <CardHeader>
                      <CardTitle className="text-md">פרטי המיקום</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm text-gray-600">סוג</Label>
                        <p className="font-medium">
                          {locationTypes.find(t => t.value === selectedLocation.type)?.label || selectedLocation.type}
                        </p>
                      </div>

                      {selectedLocation.policy && (
                        <div>
                          <Label className="text-sm text-gray-600">תיאור</Label>
                          <p className="text-sm">{selectedLocation.policy}</p>
                        </div>
                      )}

                      {selectedLocation.coordinates && (
                        <div>
                          <Label className="text-sm text-gray-600">קואורדינטות</Label>
                          <p className="text-xs font-mono">
                            {selectedLocation.coordinates.latitude.toFixed(6)},
                            {selectedLocation.coordinates.longitude.toFixed(6)}
                          </p>
                        </div>
                      )}

                      <div className="pt-4">
                        <Button
                          onClick={() => handleEditLocation(selectedLocation)}
                          className="w-full"
                          variant="outline"
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          ערוך מיקום
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="resources" className="mt-0">
                  <Card className="clay-card">
                    <CardHeader>
                      <CardTitle className="text-md flex items-center justify-between">
                        <span>משאבים באזור</span>
                        <Badge variant="secondary">{resourcesInLocation.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {resourcesInLocation.length > 0 ? (
                        <div className="space-y-2">
                          {resourcesInLocation.map((resource, index) => (
                            <div key={`${resource.id}-${index}`} className="p-2 border rounded-md">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">
                                  {resource.data.name || `רשומה ${resource.id.slice(0, 8)}`}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {resource.dataType.name}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          <Box className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">אין משאבים באזור זה</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="security" className="mt-0">
                  <Card className="clay-card">
                    <CardHeader>
                      <CardTitle className="text-md">הגדרות אבטחה</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm text-gray-600">רמת אבטחה</Label>
                        <div className="mt-1">
                          <Badge className={securityLevels.find(s => s.value === selectedLocation.security_level)?.color}>
                            {securityLevels.find(s => s.value === selectedLocation.security_level)?.label}
                          </Badge>
                        </div>
                      </div>

                      {selectedLocation.access_requirements && (
                        <div>
                          <Label className="text-sm text-gray-600">דרישות גישה</Label>
                          <div className="mt-1 space-y-1 text-sm">
                            {selectedLocation.access_requirements.requires_escort && (
                              <div className="flex items-center gap-2">
                                <UsersIcon className="w-3 h-3" />
                                <span>נדרש ליווי</span>
                              </div>
                            )}
                            {selectedLocation.access_requirements.requires_authorization && (
                              <div className="flex items-center gap-2">
                                <Settings className="w-3 h-3" />
                                <span>נדרש אישור</span>
                              </div>
                            )}
                            {selectedLocation.access_requirements.access_hours?.always_accessible && (
                              <div className="flex items-center gap-2">
                                <Target className="w-3 h-3" />
                                <span>גישה 24/7</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>
      )}

      {/* Location Creation/Edit Sidebar */}
      {showLocationForm && (
        <div className="absolute top-0 left-0 w-96 h-full bg-white shadow-xl z-50 flex flex-col">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingLocation ? 'עריכת מיקום' : 'יצירת מיקום חדש'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowLocationForm(false);
                  setIsDrawingMode(false);
                  resetForm();
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">שם המיקום *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="הכנס שם מיקום..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="type">סוג מיקום *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => {
                    setFormData(prev => ({
                      ...prev,
                      type: value,
                      coordinates: null,
                      boundary_points: [],
                      parent_id: ''
                    }));
                    setDrawnPolygon(null);
                    setIsDrawingMode(false);
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג מיקום" />
                  </SelectTrigger>
                  <SelectContent>
                    {locationTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.type && (
                  <p className="text-xs text-gray-500 mt-1">
                    {locationTypes.find(t => t.value === formData.type)?.isArea
                      ? 'אזור - ניתן לצייר גבולות על המפה'
                      : 'נקודה - ניתן לבחור מיקום ספציפי על המפה'
                    }
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="parent">מיקום הורה</Label>
                <Select
                  value={formData.parent_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, parent_id: value }))}
                  disabled={!formData.type}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מיקום הורה (אופציונלי)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>ללא מיקום הורה</SelectItem>
                    {getAvailableParentLocations().map(location => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name} ({locationTypes.find(t => t.value === location.type)?.label})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.type && getAvailableParentLocations().length === 0 && formData.type !== 'site' && (
                  <p className="text-xs text-orange-600 mt-1">
                    אין מיקומי הורה זמינים לסוג מיקום זה. צור תחילה מיקום מסוג מתאים.
                  </p>
                )}
                {formData.type === 'site' && (
                    <p className="text-xs text-gray-500 mt-1">
                      לסוג 'אתר' אין מיקום הורה.
                    </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">תיאור</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="תיאור המיקום..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="security_level">רמת אבטחה</Label>
                <Select
                  value={formData.security_level}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, security_level: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {securityLevels.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.type && (
                <div className="border-t pt-4 space-y-3">
                  <Label className="text-sm font-medium">
                    {locationTypes.find(t => t.value === formData.type)?.isArea
                      ? 'ציור גבולות האזור'
                      : 'בחירת מיקום על המפה'
                    }
                  </Label>

                  {formData.parent_id && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Info className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">
                          המלצה לציור בתוך גבולות הורה
                        </span>
                      </div>
                      <p className="text-xs text-blue-600">
                        {locations.find(l => l.id === formData.parent_id)?.name} -
                        {locationTypes.find(t => t.value === formData.type)?.isArea
                          ? ' מומלץ לצייר את הגבולות בתוך האזור המוסמן (מוצג בירוק במפה)'
                          : ' מומלץ לבחור נקודה בתוך הגבולות המוסמנים (מוצג בירוק במפה)'
                        }
                      </p>
                    </div>
                  )}

                  {!isDrawingMode && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDrawingMode(true)}
                      className="w-full"
                    >
                      <Target className="w-4 h-4 mr-2" />
                      {locationTypes.find(t => t.value === formData.type)?.isArea
                        ? 'התחל ציור גבולות'
                        : 'בחר נקודה על המפה'
                      }
                    </Button>
                  )}

                  {isDrawingMode && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">
                          {locationTypes.find(t => t.value === formData.type)?.isArea
                            ? 'מצב ציור גבולות פעיל'
                            : 'מצב בחירת נקודה פעיל'
                          }
                        </span>
                      </div>
                      <p className="text-xs text-blue-600 mb-3">
                        {locationTypes.find(t => t.value === formData.type)?.isArea
                          ? 'לחץ על המפה כדי להתחיל לצייר את גבולות האזור. ניתן לצייר בכל מקום.'
                          : 'לחץ על המפה כדי לבחור את המיקום המדויק. ניתן לבחור בכל מקום.'
                        }
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsDrawingMode(false);
                          setDrawnPolygon(editingLocation?.boundary_points || null);
                          setFormData(prev => ({
                            ...prev,
                            coordinates: editingLocation?.coordinates || null,
                            boundary_points: editingLocation?.boundary_points || []
                          }));
                        }}
                      >
                        בטל
                      </Button>
                    </div>
                  )}

                  {/* Show current location status */}
                  {formData.coordinates && (
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">נקודה נבחרה</span>
                      </div>
                      <p className="text-xs text-green-600">
                        {formData.coordinates.latitude.toFixed(6)}, {formData.coordinates.longitude.toFixed(6)}
                      </p>
                    </div>
                  )}

                  {drawnPolygon && drawnPolygon.length > 0 && (
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">גבולות נוצרו</span>
                      </div>
                      <p className="text-xs text-green-600">
                        {drawnPolygon.length} נקודות גבול
                        {formData.parent_id && (() => {
                          const parentLocation = locations.find(l => l.id === formData.parent_id);
                          if (parentLocation && parentLocation.boundary_points && parentLocation.boundary_points.length > 0) {
                            const allPointsInside = drawnPolygon.every(point =>
                              isPointInPolygon(
                                { lat: point.latitude, lng: point.longitude },
                                parentLocation.boundary_points
                              )
                            );
                            return allPointsInside 
                              ? ' - בתוך גבולות ההורה ✓' 
                              : ' - חורג מגבולות ההורה ⚠️';
                          }
                          return '';
                        })()}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-gray-50 flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowLocationForm(false);
                setIsDrawingMode(false);
                resetForm();
              }}
              className="flex-1"
            >
              ביטול
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.type || saving || (locationTypes.find(t => t.value === formData.type)?.isArea && (!drawnPolygon || drawnPolygon.length === 0)) || (!locationTypes.find(t => t.value === formData.type)?.isArea && !formData.coordinates)}
              className="flex-1"
            >
              {saving ? (
                <>
                  <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  שומר...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editingLocation ? 'עדכן' : 'צור'} מיקום
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
