import React, { useState, useEffect, useMemo } from 'react';
import { CustomDataRecord } from '@/api/entities';
import { CustomDataType } from '@/api/entities';
import { User } from '@/api/entities';
import { Guard } from '@/api/entities';
import { Role } from '@/api/entities';
import { Location } from '@/api/entities'; // Add Location entity
import EnhancedMapComponent from '@/components/locations/EnhancedMapComponent';
import { 
  Loader2, Users, Layers, Filter, Eye, Info, Shield, CalendarDays, 
  Route as RouteIcon, XCircle, Map, X, ExternalLink, Building, Target, 
  Grid, Home, Box, MapPin as MapPinIcon, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import UserProfileCard from '@/components/users/UserProfileCard';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

// Icon mapping for different entities
const iconComponents = {
  Users, Shield, Layers, Building, Target, Grid, Home, Box, MapPinIcon,
  Car: Users, Briefcase: Users, ListChecks: Layers, Settings: Layers,
  Activity: Layers, Clock: Layers, AlertCircle: Layers, FileText: Layers,
  Database: Layers, LayoutGrid: Layers, Plus: Layers
};

const locationTypeIcons = {
  'site': Building,
  'area': Target, 
  'subarea': Grid,
  'room': Home,
  'equipment_point': Box,
  'checkpoint': MapPinIcon
};

// Helper to get a display name for custom data records
const getCustomRecordDisplayValue = (record, dataType) => {
  if (!record || !record.data) return `רשומה ${record?.id?.substring(0, 6) || 'לא ידועה'}`;
  
  if (dataType && dataType.display_name_field_id && record.data[dataType.display_name_field_id]) {
    return String(record.data[dataType.display_name_field_id]);
  }
  
  // Fallback to common fields or ID
  const commonFields = ['name', 'title', 'identifier', 'label'];
  for (const cf of commonFields) {
    if (record.data[cf]) return String(record.data[cf]);
  }
  return `רשומה ${record.id.substring(0, 6)}`;
};

// Helper to get location from custom data record
const getCustomRecordLocation = (record, dataType) => {
  if (!record || !record.data || !dataType || !dataType.main_location_field_id) return null;
  
  const locFieldKey = dataType.main_location_field_id;
  const locData = record.data[locFieldKey];
  
  if (locData && typeof locData === 'object' && typeof locData.latitude === 'number' && typeof locData.longitude === 'number') {
    return { latitude: locData.latitude, longitude: locData.longitude };
  }
  return null;
};

export default function SiteMapPage() {
  const [allCustomDataTypes, setAllCustomDataTypes] = useState([]);
  const [allCustomDataRecords, setAllCustomDataRecords] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allGuards, setAllGuards] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [allLocations, setAllLocations] = useState([]); // Add locations state

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [selectedDataTypes, setSelectedDataTypes] = useState({});
  const [showGuards, setShowGuards] = useState(true);
  const [selectedGuardRoles, setSelectedGuardRoles] = useState({});
  const [showLocations, setShowLocations] = useState(true);
  const [selectedLocationTypes, setSelectedLocationTypes] = useState({});

  const [mapFeatures, setMapFeatures] = useState([]);
  const [mapCenter, setMapCenter] = useState([35.1127, 31.6996]);
  const [mapZoom, setMapZoom] = useState(14);

  const [selectedFeature, setSelectedFeature] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    locations: true,
    customData: true,
    guards: true
  });

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [types, records, users, guards, roles, locations] = await Promise.all([
          CustomDataType.list(),
          CustomDataRecord.list(),
          User.list(),
          Guard.list(),
          Role.list(),
          Location.list() // Add locations fetch
        ]);
        
        setAllCustomDataTypes(types || []);
        setAllCustomDataRecords(records || []);
        setAllUsers(users || []);
        setAllGuards(guards || []);
        setAllRoles(roles || []);
        setAllLocations(locations || []); // Set locations

        // Initialize filters - select all spatial custom data types by default
        const initialSelectedTypes = {};
        (types || []).forEach(dt => {
          if (dt.spatial_config?.is_spatial && dt.main_location_field_id) {
            initialSelectedTypes[dt.slug] = true;
          }
        });
        setSelectedDataTypes(initialSelectedTypes);
        
        // Initialize guard role filter
        const initialGuardRoles = {};
        const guardRoleNames = ['מאבטח ראשי', 'מאבטח רגיל', 'מאבטח במעקב', 'מנהל משמרת'];
        guardRoleNames.forEach(roleName => {
          initialGuardRoles[roleName] = true;
        });
        setSelectedGuardRoles(initialGuardRoles);

        // Initialize location type filter - select all by default
        const initialLocationTypes = {};
        Object.keys(locationTypeIcons).forEach(locType => {
          initialLocationTypes[locType] = true;
        });
        setSelectedLocationTypes(initialLocationTypes);

      } catch (err) {
        console.error("Error loading site map data:", err);
        setError("שגיאה בטעינת נתוני המפה: " + (err.message || String(err)));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Prepare features for the map based on filters
  useEffect(() => {
    const features = [];
    let firstValidCoord = null;

    // Add Locations to map
    allLocations.forEach(location => {
      if (!showLocations || !selectedLocationTypes[location.type]) return;
      
      const LocationIcon = locationTypeIcons[location.type] || MapPinIcon;
      
      if (location.boundary_points && location.boundary_points.length > 0) {
        // Area-based location
        features.push({
          id: `location-${location.id}`,
          geometry: {
            type: 'Polygon',
            coordinates: [location.boundary_points.map(p => [p.longitude, p.latitude])]
          },
          properties: {
            title: location.name,
            description: `${location.type} - ${location.policy || 'ללא תיאור'}`,
            entityType: 'Location',
            locationId: location.id,
            icon: location.type,
            color: getLocationColor(location.type, location.security_level),
            locationType: location.type,
            securityLevel: location.security_level
          }
        });
        
        if (!firstValidCoord && location.boundary_points[0]) {
          firstValidCoord = [location.boundary_points[0].longitude, location.boundary_points[0].latitude];
        }
      } else if (location.coordinates) {
        // Point-based location
        features.push({
          id: `location-${location.id}`,
          geometry: {
            type: 'Point',
            coordinates: [location.coordinates.longitude, location.coordinates.latitude]
          },
          properties: {
            title: location.name,
            description: `${location.type} - ${location.policy || 'ללא תיאור'}`,
            entityType: 'Location',
            locationId: location.id,
            icon: location.type,
            color: getLocationColor(location.type, location.security_level),
            locationType: location.type,
            securityLevel: location.security_level
          }
        });
        
        if (!firstValidCoord) {
          firstValidCoord = [location.coordinates.longitude, location.coordinates.latitude];
        }
      }
    });

    // Add CustomDataRecords to map
    allCustomDataRecords.forEach(record => {
      const dataType = allCustomDataTypes.find(dt => dt.slug === record.custom_data_type_slug);
      if (!dataType || !selectedDataTypes[dataType.slug] || !dataType.spatial_config?.is_spatial) return;
      
      const location = getCustomRecordLocation(record, dataType);
      if (location) {
        const IconComponent = iconComponents[dataType.icon] || iconComponents['Layers'];
        
        features.push({
          id: `cdr-${record.id}`,
          geometry: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude]
          },
          properties: {
            title: getCustomRecordDisplayValue(record, dataType),
            description: dataType.name,
            entityType: 'CustomDataRecord',
            dataTypeSlug: dataType.slug,
            recordId: record.id,
            icon: dataType.icon || 'Layers',
            color: dataType.spatial_config?.map_color || '#10B981',
          }
        });
        
        if (!firstValidCoord) {
          firstValidCoord = [location.longitude, location.latitude];
        }
      }
    });

    // Add Users (Guards from User entity) to map
    allUsers.forEach(user => {
      const userIsGuard = user.roles && user.roles.some(roleId => {
        const role = allRoles.find(r => r.id === roleId);
        return role && selectedGuardRoles[role.name];
      });
      
      if (showGuards && userIsGuard && user.current_location?.latitude && user.current_location?.longitude) {
        features.push({
          id: `user-${user.id}`,
          geometry: {
            type: 'Point',
            coordinates: [user.current_location.longitude, user.current_location.latitude]
          },
          properties: {
            title: user.full_name,
            description: `מאבטח (${user.current_status || 'לא ידוע'})`,
            entityType: 'User',
            userId: user.id,
            icon: 'Shield',
            color: '#3B82F6',
            status: user.current_status,
            lastSeen: user.current_location.timestamp,
          }
        });
        
        if (!firstValidCoord) {
          firstValidCoord = [user.current_location.longitude, user.current_location.latitude];
        }
      }
    });

    // Add Guards (from Guard entity) to map
    allGuards.forEach(guard => {
      if (!showGuards || !selectedGuardRoles[guard.role] || !guard.current_location?.latitude || !guard.current_location?.longitude) return;
      
      const statusColors = {
        'available': '#10B981',
        'on_patrol': '#3B82F6',
        'on_break': '#F59E0B',
        'responding_to_incident': '#EF4444',
        'unavailable': '#6B7280',
        'offline': '#374151'
      };
      
      features.push({
        id: `guard-${guard.id}`,
        geometry: {
          type: 'Point',
          coordinates: [guard.current_location.longitude, guard.current_location.latitude]
        },
        properties: {
          title: guard.full_name,
          description: `${guard.role} (${getGuardStatusText(guard.current_status)})`,
          entityType: 'Guard',
          guardId: guard.id,
          icon: 'Shield',
          color: statusColors[guard.current_status] || '#3B82F6',
          status: guard.current_status,
          lastSeen: guard.current_location.timestamp,
          role: guard.role,
          siteArea: guard.site_area,
        }
      });
      
      if (!firstValidCoord) {
        firstValidCoord = [guard.current_location.longitude, guard.current_location.latitude];
      }
    });
    
    console.log("SiteMapPage: Created features:", features);
    setMapFeatures(features);

    // Update map center if we have valid coordinates
    if (firstValidCoord && firstValidCoord[0] && firstValidCoord[1]) {
      setMapCenter([firstValidCoord[1], firstValidCoord[0]]);
    }

  }, [allCustomDataTypes, allCustomDataRecords, allUsers, allGuards, allLocations, selectedDataTypes, showGuards, selectedGuardRoles, showLocations, selectedLocationTypes, allRoles]);

  // Helper functions
  const getLocationColor = (locationType, securityLevel) => {
    const typeColors = {
      'site': '#8B5CF6',
      'area': '#06B6D4', 
      'subarea': '#10B981',
      'room': '#F59E0B',
      'equipment_point': '#EF4444',
      'checkpoint': '#3B82F6'
    };
    
    const securityColors = {
      'restricted': '#F59E0B',
      'confidential': '#EF4444', 
      'top_secret': '#DC2626'
    };
    
    return securityColors[securityLevel] || typeColors[locationType] || '#6B7280';
  };

  const getGuardStatusText = (status) => {
    const statusMap = {
      'available': 'זמין',
      'on_patrol': 'בסיור',
      'on_break': 'בהפסקה',
      'responding_to_incident': 'מגיב לאירוע',
      'unavailable': 'לא זמין',
      'offline': 'לא מחובר'
    };
    return statusMap[status] || status || 'לא ידוע';
  };

  const handleFeatureClick = (featureId, featureProperties) => {
    console.log("Feature clicked:", featureId, featureProperties);
    setSelectedFeature({ id: featureId, properties: featureProperties });
    setIsSheetOpen(true);
  };

  const toggleDataTypeFilter = (slug) => {
    setSelectedDataTypes(prev => ({ ...prev, [slug]: !prev[slug] }));
  };

  const toggleGuardRoleFilter = (roleName) => {
    setSelectedGuardRoles(prev => ({ ...prev, [roleName]: !prev[roleName] }));
  };

  const toggleLocationTypeFilter = (locationType) => {
    setSelectedLocationTypes(prev => ({ ...prev, [locationType]: !prev[locationType] }));
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-150px)]">
        <Loader2 className="w-12 h-12 animate-spin text-primary-500" />
        <p className="ml-4 text-lg">טוען מפת אתר...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 p-8 clay-card">{error}</div>;
  }
  
  const spatialDataTypes = allCustomDataTypes.filter(dt => dt.spatial_config?.is_spatial && dt.main_location_field_id);
  const guardRoleNames = ['מאבטח ראשי', 'מאבטח רגיל', 'מאבטח במעקב', 'מנהל משמרת'];
  const locationTypes = Object.keys(locationTypeIcons);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] p-4 gap-4" dir="rtl">
      <header className="flex justify-between items-center pb-2 border-b">
        <h1 className="text-2xl font-bold text-primary-700 flex items-center gap-2">
          <Map className="w-7 h-7" /> מפת האתר - ביתר עילית
        </h1>
        <div className="text-sm text-neutral-600">
          {mapFeatures.length} פריטים על המפה
        </div>
      </header>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Enhanced Filters Sidebar */}
        <Card className="clay-card w-80 min-w-[300px] flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary-600" /> שכבות המפה
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-grow">
            <CardContent className="space-y-4 pt-2">
              
              {/* Locations Section */}
              <Collapsible 
                open={expandedSections.locations} 
                onOpenChange={() => toggleSection('locations')}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border cursor-pointer hover:from-purple-100 hover:to-blue-100">
                    <div className="flex items-center gap-2">
                      <Building className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-purple-700">מיקומים ({allLocations.length})</span>
                    </div>
                    {expandedSections.locations ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  <div className="flex items-center space-x-2 space-x-reverse bg-neutral-50 p-2 rounded-md border">
                    <Checkbox
                      id="show-locations"
                      checked={showLocations}
                      onCheckedChange={setShowLocations}
                      className="clay-checkbox"
                    />
                    <Label htmlFor="show-locations" className="text-sm flex-1 cursor-pointer">הצג מיקומים על המפה</Label>
                  </div>
                  
                  {showLocations && (
                    <div className="space-y-1.5 pl-2">
                      {locationTypes.map(locType => {
                        const LocationIcon = locationTypeIcons[locType];
                        const typeLabels = {
                          'site': 'אתרים',
                          'area': 'אזורים', 
                          'subarea': 'תתי-אזורים',
                          'room': 'חדרים',
                          'equipment_point': 'נקודות ציוד',
                          'checkpoint': 'נקודות ביקורת'
                        };
                        
                        return (
                          <div key={locType} className="flex items-center space-x-2 space-x-reverse bg-neutral-50 p-1.5 rounded-md border border-neutral-100">
                            <Checkbox
                              id={`location-type-${locType}`}
                              checked={selectedLocationTypes[locType] || false}
                              onCheckedChange={() => toggleLocationTypeFilter(locType)}
                              className="clay-checkbox"
                            />
                            <Label htmlFor={`location-type-${locType}`} className="text-xs flex-1 cursor-pointer">
                              {typeLabels[locType]}
                            </Label>
                            <LocationIcon className="w-3.5 h-3.5" style={{color: getLocationColor(locType)}} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Custom Data Types Section */}
              {spatialDataTypes.length > 0 && (
                <Collapsible 
                  open={expandedSections.customData} 
                  onOpenChange={() => toggleSection('customData')}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border cursor-pointer hover:from-green-100 hover:to-teal-100">
                      <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-700">נתונים מותאמים ({spatialDataTypes.length})</span>
                      </div>
                      {expandedSections.customData ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1.5 mt-2">
                    {spatialDataTypes.map(dt => {
                      const IconComponent = iconComponents[dt.icon] || iconComponents['Layers'];
                      return (
                        <div key={dt.slug} className="flex items-center space-x-2 space-x-reverse bg-neutral-50 p-2 rounded-md border border-neutral-200">
                          <Checkbox
                            id={`filter-dt-${dt.slug}`}
                            checked={selectedDataTypes[dt.slug] || false}
                            onCheckedChange={() => toggleDataTypeFilter(dt.slug)}
                            className="clay-checkbox"
                          />
                          <Label htmlFor={`filter-dt-${dt.slug}`} className="text-xs flex-1 cursor-pointer">{dt.name}</Label>
                          <IconComponent className="w-3.5 h-3.5" style={{color: dt.spatial_config?.map_color || '#6B7280'}} />
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Guards Section */}
              <Collapsible 
                open={expandedSections.guards} 
                onOpenChange={() => toggleSection('guards')}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border cursor-pointer hover:from-blue-100 hover:to-indigo-100">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-blue-700">מאבטחים ({allGuards.length})</span>
                    </div>
                    {expandedSections.guards ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  <div className="flex items-center space-x-2 space-x-reverse bg-neutral-50 p-2 rounded-md border border-neutral-200">
                    <Checkbox
                      id="filter-guards-toggle"
                      checked={showGuards}
                      onCheckedChange={setShowGuards}
                      className="clay-checkbox"
                    />
                    <Label htmlFor="filter-guards-toggle" className="text-sm flex-1 cursor-pointer">הצג מאבטחים על המפה</Label>
                  </div>
                  
                  {showGuards && (
                    <div className="space-y-1.5 pl-2">
                      <p className="text-2xs text-neutral-500 mb-1">סנן לפי תפקיד:</p>
                      {guardRoleNames.map(roleName => (
                        <div key={roleName} className="flex items-center space-x-2 space-x-reverse bg-neutral-50 p-1.5 rounded-md border border-neutral-100">
                          <Checkbox
                            id={`filter-guardrole-${roleName}`}
                            checked={selectedGuardRoles[roleName] || false}
                            onCheckedChange={() => toggleGuardRoleFilter(roleName)}
                            className="clay-checkbox"
                          />
                          <Label htmlFor={`filter-guardrole-${roleName}`} className="text-xs flex-1 cursor-pointer">{roleName}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </ScrollArea>
        </Card>

        {/* Map Area */}
        <div className="flex-1 clay-card p-0.5 overflow-hidden relative">
          <EnhancedMapComponent
            features={mapFeatures}
            center={mapCenter}
            zoom={mapZoom}
            onFeatureClick={handleFeatureClick}
            isAdminMode={false}
            showLegend={true}
            showSearch={true}
          />
          
          {mapFeatures.length === 0 && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
              <XCircle className="w-16 h-16 text-neutral-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700">לא נמצאו פריטים להצגה במפה</h3>
              <p className="text-neutral-500 text-sm">בדוק את הגדרות הסינון או הוסף נתונים מרחביים למערכת.</p>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Details Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="clay-card sm:max-w-lg p-0 overflow-y-auto" side="left">
          <SheetHeader className="p-4 border-b sticky top-0 bg-white z-10">
            <div className="flex justify-between items-center">
              <SheetTitle className="flex items-center gap-2 text-primary-700">
                <Info className="w-5 h-5" /> פרטי הישות
              </SheetTitle>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-neutral-100">
                  <X className="w-5 h-5 text-neutral-500" />
                </Button>
              </SheetClose>
            </div>
            {selectedFeature?.properties?.title && <SheetDescription className="text-sm truncate">{selectedFeature.properties.title}</SheetDescription>}
          </SheetHeader>
          
          <div className="p-4 space-y-4">
            {/* Location Details */}
            {selectedFeature?.properties?.entityType === 'Location' && selectedFeature?.properties?.locationId && (
              (() => {
                const location = allLocations.find(l => l.id === selectedFeature.properties.locationId);
                if (!location) return <p>פרטי מיקום לא נמצאו.</p>;
                
                const LocationIcon = locationTypeIcons[location.type] || MapPinIcon;
                const typeLabels = {
                  'site': 'אתר',
                  'area': 'אזור', 
                  'subarea': 'תת-אזור',
                  'room': 'חדר',
                  'equipment_point': 'נקודת ציוד',
                  'checkpoint': 'נקודת ביקורת'
                };
                
                return (
                  <Card className="clay-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <LocationIcon className="w-5 h-5" style={{color: getLocationColor(location.type, location.security_level)}} />
                        {location.name}
                      </CardTitle>
                      <CardDescription>{typeLabels[location.type]}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {location.policy && (
                        <div>
                          <strong className="text-sm">תיאור:</strong>
                          <p className="text-sm text-gray-600 mt-1">{location.policy}</p>
                        </div>
                      )}
                      
                      <div>
                        <strong className="text-sm">רמת אבטחה:</strong>
                        <Badge className="mr-2 text-xs">
                          {location.security_level === 'public' ? 'ציבורי' :
                           location.security_level === 'restricted' ? 'מוגבל' :
                           location.security_level === 'confidential' ? 'סודי' :
                           location.security_level === 'top_secret' ? 'סודי ביותר' : location.security_level}
                        </Badge>
                      </div>
                      
                      {location.coordinates && (
                        <div className="text-xs text-neutral-500">
                          <strong>קואורדינטות:</strong> {location.coordinates.latitude.toFixed(6)}, {location.coordinates.longitude.toFixed(6)}
                        </div>
                      )}
                      
                      <Button asChild variant="link" className="p-0 h-auto text-primary-600 text-xs">
                        <Link to={createPageUrl('Locations')}>
                          נהל מיקומים <ExternalLink className="w-3 h-3 mr-1"/>
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })()
            )}

            {/* Guard Details */}
            {selectedFeature?.properties?.entityType === 'Guard' && selectedFeature?.properties?.guardId && (
              (() => {
                const guard = allGuards.find(g => g.id === selectedFeature.properties.guardId);
                if (!guard) return <p>פרטי מאבטח לא נמצאו.</p>;
                return (
                  <Card className="clay-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-500" />
                        {guard.full_name}
                      </CardTitle>
                      <CardDescription>{guard.role} - {guard.site_area}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><strong>מספר עובד:</strong><br/>{guard.employee_id}</div>
                        <div><strong>מוסד:</strong><br/>{guard.institution}</div>
                        <div><strong>טלפון:</strong><br/>{guard.phone}</div>
                        <div><strong>אימייל:</strong><br/>{guard.email}</div>
                      </div>
                      
                      <div className="border-t pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <strong className="text-sm">סטטוס נוכחי:</strong>
                          <Badge className={`text-xs ${
                            guard.current_status === 'available' ? 'bg-green-100 text-green-700' :
                            guard.current_status === 'on_patrol' ? 'bg-blue-100 text-blue-700' :
                            guard.current_status === 'on_break' ? 'bg-yellow-100 text-yellow-700' :
                            guard.current_status === 'responding_to_incident' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {getGuardStatusText(guard.current_status)}
                          </Badge>
                        </div>
                        <div className="text-xs text-neutral-500 space-y-1">
                          <div><strong>משמרת:</strong> {guard.shift_start_time} - {guard.shift_end_time}</div>
                          <div><strong>עדכון אחרון:</strong> {guard.last_activity ? new Date(guard.last_activity).toLocaleString('he-IL') : 'לא ידוע'}</div>
                          <div><strong>דיוק מיקום:</strong> {guard.current_location?.accuracy || 'לא ידוע'} מטרים</div>
                        </div>
                      </div>

                      {guard.current_shift_id && (
                        <div className="border-t pt-3">
                          <Button asChild variant="link" className="p-0 h-auto text-primary-600 text-xs">
                            <Link to={createPageUrl(`Shifts?highlight=${guard.current_shift_id}`)}>
                              צפה במשמרת נוכחית <ExternalLink className="w-3 h-3 mr-1"/>
                            </Link>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()
            )}
            
            {/* User Details */}
            {selectedFeature?.properties?.entityType === 'User' && selectedFeature?.properties?.userId && (
              (() => {
                const user = allUsers.find(u => u.id === selectedFeature.properties.userId);
                if (!user) return <p>פרטי משתמש לא נמצאו.</p>;
                return (
                  <>
                    <UserProfileCard 
                      user={user} 
                      rolesData={allRoles} 
                      sitesData={[]} 
                      institutionsData={[]} 
                      groupsData={[]} 
                    />
                    <Card className="clay-card shadow-none border-0">
                      <CardHeader className="pb-2 pt-3">
                        <CardTitle className="text-md font-medium text-neutral-700 flex items-center">
                          <Shield className="w-5 h-5 ml-2 text-blue-500" /> 
                          סטטוס מאבטח
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1 text-sm">
                        <p><strong>סטטוס נוכחי:</strong> {user.current_status ? <Badge variant="outline" className="text-xs">{user.current_status}</Badge> : 'לא ידוע'}</p>
                        {user.current_location?.timestamp && <p className="text-xs text-neutral-500"><strong>מיקום עודכן לאחרונה:</strong> {new Date(user.current_location.timestamp).toLocaleString('he-IL')}</p>}
                        {user.current_shift_id && <p><strong>משמרת נוכחית:</strong> <Link to={createPageUrl(`Shifts?highlight=${user.current_shift_id}`)} className="text-primary-600 hover:underline text-xs">צפה במשמרת</Link></p>}
                      </CardContent>
                    </Card>
                  </>
                );
              })()
            )}

            {/* Custom Data Record Details */}
            {selectedFeature?.properties?.entityType === 'CustomDataRecord' && selectedFeature?.properties?.recordId && (
              (() => {
                const record = allCustomDataRecords.find(r => r.id === selectedFeature.properties.recordId);
                const dataType = allCustomDataTypes.find(dt => dt.slug === selectedFeature.properties.dataTypeSlug);
                if (!record || !dataType) return <p>פרטי רשומה לא נמצאו.</p>;
                
                const IconComponent = iconComponents[dataType.icon] || iconComponents['Layers'];
                
                return (
                  <Card className="clay-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IconComponent className="w-5 h-5" style={{color: dataType.spatial_config?.map_color}} />
                        {getCustomRecordDisplayValue(record, dataType)}
                      </CardTitle>
                      <CardDescription>{dataType.name}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm max-h-96 overflow-y-auto">
                      {Object.entries(record.data).map(([key, value]) => {
                        const fieldSchema = dataType.schema_definition?.properties?.[key];
                        const fieldLabel = fieldSchema?.description || key;
                        let displayValue = String(value);
                        if (typeof value === 'object' && value !== null) {
                          displayValue = JSON.stringify(value, null, 2);
                        } else if (typeof value === 'boolean') {
                          displayValue = value ? "כן" : "לא";
                        } else if (value === null || value === undefined) {
                          displayValue = <span className="italic text-neutral-400">אין ערך</span>
                        }

                        return (
                          <div key={key} className="border-b pb-1 mb-1">
                            <strong className="block text-xs text-neutral-500">{fieldLabel}:</strong>
                            <div className="whitespace-pre-wrap text-neutral-700">{displayValue}</div>
                          </div>
                        );
                      })}
                      <Button asChild variant="link" className="p-0 h-auto text-primary-600 mt-3 text-xs">
                         <Link to={createPageUrl(`CustomDataView?dataTypeSlug=${dataType.slug}&recordId=${record.id}`)}>
                           פתח רשומה מלאה <ExternalLink className="w-3 h-3 mr-1"/>
                         </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })()
            )}
            
            {!selectedFeature && (
              <p className="text-center text-neutral-500 py-8">בחר ישות מהמפה כדי לראות פרטים.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}