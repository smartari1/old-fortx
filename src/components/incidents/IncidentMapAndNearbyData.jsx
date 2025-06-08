import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit3, MapPin, ListFilter, Layers, Milestone, Maximize, Map, AlertTriangle } from 'lucide-react'; // Added Map and AlertTriangle
import EnhancedMapComponent from '@/components/locations/EnhancedMapComponent';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Helper function to calculate distance (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Distance in meters
};

const getRecordDisplayValue = (record, dataType) => {
  if (!record || !record.data || !dataType || !dataType.display_name_field_id) {
    return `רשומה ${record?.id?.substring(0, 6) || 'לא ידועה'}`;
  }
  return record.data[dataType.display_name_field_id] || `רשומה ${record.id.substring(0, 6)}`;
};

// Get location value from record based on data type's main location field
const getRecordLocation = (record, dataType) => {
  if (!record || !record.data || !dataType || !dataType.main_location_field_id) {
    return null;
  }
  
  const locFieldKey = dataType.main_location_field_id;
  const locData = record.data[locFieldKey];
  
  // Check if location data exists and has valid coordinates
  if (locData && typeof locData === 'object') {
    const lat = typeof locData.latitude === 'number' ? locData.latitude : parseFloat(locData.latitude);
    const lng = typeof locData.longitude === 'number' ? locData.longitude : parseFloat(locData.longitude);
    
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitude: lat, longitude: lng, ...locData };
    }
  }
  
  return null;
};

export default function IncidentMapAndNearbyData({
  incident,
  allCustomDataTypes,
  allCustomDataRecords,
  allLocations,
  onOpenLocationEditModal,
  isLocationComponentEnabled,
  isIncidentClosed,
  incidentCategoryDetails // Added to get allowed data types for this incident category
}) {
  const [mapFeatures, setMapFeatures] = useState([]);
  const [nearbyData, setNearbyData] = useState([]); // This will store all relevant nearby data records
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [selectedDataTypesForTable, setSelectedDataTypesForTable] = useState({});
  const [distanceFilter, setDistanceFilter] = useState(5000); // Default 5km in meters
  const [maxItemsInTable, setMaxItemsInTable] = useState(20);

  const incidentLocation = useMemo(() => {
    if (incident?.location?.latitude && incident?.location?.longitude) {
      return {
        latitude: incident.location.latitude,
        longitude: incident.location.longitude,
        description: incident.location.description || "מיקום אירוע",
        id: `incident-${incident.id}`
      };
    }
    return null;
  }, [incident]);

  // Filter data types based on incident category allowed data types
  const allowedDataTypes = useMemo(() => {
    if (!allCustomDataTypes || !Array.isArray(allCustomDataTypes)) return [];
    
    // Get allowed data type slugs from incident category
    const allowedSlugs = incidentCategoryDetails?.allowed_data_types || [];
    
    // If no specific allowed types configured, show all spatial data types
    if (allowedSlugs.length === 0) {
      return allCustomDataTypes.filter(cdt => cdt.spatial_config?.is_spatial && cdt.main_location_field_id);
    }
    
    // Filter to only allowed data types that are also spatial
    return allCustomDataTypes.filter(cdt => 
      allowedSlugs.includes(cdt.slug) && 
      cdt.spatial_config?.is_spatial && 
      cdt.main_location_field_id
    );
  }, [allCustomDataTypes, incidentCategoryDetails]);

  // Initialize selectedDataTypesForTable with allowed types initially checked
  useEffect(() => {
    if (allowedDataTypes.length > 0) {
      const initialSelected = {};
      allowedDataTypes.forEach(cdt => {
        initialSelected[cdt.slug] = true;
      });
      setSelectedDataTypesForTable(initialSelected);
    }
  }, [allowedDataTypes]);

  // Prepare map features and nearby data
  useEffect(() => {
    // Only proceed if incidentLocation exists and allowedDataTypes is not empty
    if (!incidentLocation || !allowedDataTypes.length || !allCustomDataRecords) {
      setMapFeatures([]);
      setNearbyData([]);
      return;
    }

    const features = [];
    const nearbyRecords = [];

    // 1. Add Incident Location to map
    features.push({
      id: incidentLocation.id,
      type: 'Point',
      coordinates: [incidentLocation.longitude, incidentLocation.latitude], // Lon, Lat
      properties: {
        title: incident.title || "מיקום אירוע",
        description: incidentLocation.description,
        entityType: 'incident_location',
        icon: incidentCategoryDetails?.icon || 'AlertTriangle', // Use AlertTriangle from lucide
        color: '#dc2626', // Red for incident
      }
    });

    // 2. Process each allowed data type
    allowedDataTypes.forEach(dataType => {
      // Get records of this data type
      const recordsOfType = (allCustomDataRecords || []).filter(record => record.custom_data_type_slug === dataType.slug);
      
      recordsOfType.forEach(record => {
        const recordLocation = getRecordLocation(record, dataType);
        
        if (recordLocation) {
          const distance = calculateDistance(
            incidentLocation.latitude,
            incidentLocation.longitude,
            recordLocation.latitude,
            recordLocation.longitude
          );

          // Add to map features
          features.push({
            id: `customData-${record.id}`,
            type: 'Point',
            coordinates: [recordLocation.longitude, recordLocation.latitude], // Lon, Lat
            properties: {
              title: getRecordDisplayValue(record, dataType),
              description: `סוג: ${dataType.name}\n${record.data?.description || ''}`,
              entityType: 'custom_data_record',
              dataTypeSlug: dataType.slug,
              recordId: record.id,
              icon: dataType.spatial_config?.map_icon || dataType.icon || 'MapPin', // Default to MapPin
              color: dataType.spatial_config?.map_color || '#3b82f6', // Default blue
            }
          });

          // Add to nearby data (for potential display in table)
          nearbyRecords.push({
            id: record.id,
            dataType: dataType,
            record: record,
            location: recordLocation,
            distance: distance,
            displayName: getRecordDisplayValue(record, dataType),
          });
        }
      });
    });

    // Sort nearby records by distance
    nearbyRecords.sort((a, b) => a.distance - b.distance);

    setMapFeatures(features);
    setNearbyData(nearbyRecords);
  }, [incidentLocation, allowedDataTypes, allCustomDataRecords, incidentCategoryDetails, incident]); // Dependencies updated

  // Filter nearby data for table display based on user selections
  const filteredNearbyData = useMemo(() => {
    return nearbyData
      .filter(item => {
        // Filter by selected data types
        if (!selectedDataTypesForTable[item.dataType.slug]) return false;
        
        // Filter by distance
        if (item.distance > distanceFilter) return false;
        
        return true;
      })
      .slice(0, maxItemsInTable);
  }, [nearbyData, selectedDataTypesForTable, distanceFilter, maxItemsInTable]);

  // Helper function to format distance for display
  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)} מ'`;
    } else {
      return `${(meters / 1000).toFixed(1)} ק"מ`;
    }
  };

  const MapAndTableContent = ({ isInModal = false }) => (
    <div className={`space-y-4 ${isInModal ? 'h-full' : ''}`}>
      {/* Map */}
      <div className={`${isInModal ? 'h-96' : 'h-64'} w-full rounded-lg overflow-hidden border clay-card bg-white`}>
        {mapFeatures.length > 0 ? (
          <EnhancedMapComponent
            features={mapFeatures}
            center={incidentLocation ? [incidentLocation.longitude, incidentLocation.latitude] : (mapFeatures[0]?.coordinates ? [mapFeatures[0].coordinates[0], mapFeatures[0].coordinates[1]] : [35.2137, 31.7683])} // Lon, Lat
            zoom={incidentLocation ? 14 : 8}
            isAdminMode={false} // Assuming this prop should be false
            // onFeatureClick is not defined in the original component, remove or add its implementation if needed
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-neutral-100">
            <p className="text-neutral-500 text-center p-4">
              {(!isIncidentClosed && isLocationComponentEnabled && !incidentLocation) ? "לא הוגדר מיקום לאירוע. לחץ על 'הגדר מיקום'." : "לא הוגדר מיקום לאירוע או שאין נתונים מרחביים להצגה."}
            </p>
          </div>
        )}
      </div>

      {incidentLocation && (
        <div className="text-sm bg-neutral-50 p-2 rounded-md border">
          <p><strong>מיקום אירוע:</strong> {incidentLocation.description || 'לא צוין תיאור'}</p>
          {incident.location?.address && <p className="text-xs"><strong>כתובת:</strong> {incident.location.address}</p>}
          <p className="text-xs text-gray-500">נ.צ: {incidentLocation.latitude?.toFixed(5) || ''}, {incidentLocation.longitude?.toFixed(5) || ''}</p>
        </div>
      )}
      
      {/* Table Controls */}
      {incidentLocation && allowedDataTypes.length > 0 && (
        <div className="mt-6">
          <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary-600" /> נתונים בקרבת האירוע
          </h3>
          <div className="flex flex-col md:flex-row gap-4 mb-4 p-3 border rounded-lg clay-card bg-indigo-50">
            <div className="flex-1">
              <Label className="text-sm font-medium mb-1 block text-indigo-800">סנן לפי סוג דאטה:</Label>
              <ScrollArea className="h-24 border rounded-md p-2 bg-white">
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                {allowedDataTypes.map(dataType => (
                  <div key={dataType.slug} className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id={`table-filter-${dataType.slug}${isInModal ? '-modal' : ''}`}
                      checked={selectedDataTypesForTable[dataType.slug] || false}
                      onCheckedChange={(checked) => {
                        setSelectedDataTypesForTable(prev => ({
                          ...prev,
                          [dataType.slug]: checked
                        }));
                      }}
                      className="clay-checkbox"
                    />
                    <Label htmlFor={`table-filter-${dataType.slug}${isInModal ? '-modal' : ''}`} className="text-xs font-normal cursor-pointer flex items-center">
                       {React.createElement(Milestone, { className: `w-3 h-3 ml-1`, style: { color: dataType.spatial_config?.map_color || '#6B7280' }})}
                       {dataType.name}
                    </Label>
                  </div>
                ))}
                </div>
              </ScrollArea>
            </div>
            <div className="flex-1 md:max-w-xs">
              <Label htmlFor={`distance-filter${isInModal ? '-modal' : ''}`} className="text-sm font-medium mb-1 block text-indigo-800">סנן לפי מרחק (מטרים):</Label>
              <Input
                id={`distance-filter${isInModal ? '-modal' : ''}`}
                type="number"
                value={distanceFilter}
                onChange={(e) => setDistanceFilter(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="clay-input"
                min="0"
                step="100"
              />
               <Label htmlFor={`max-items-filter${isInModal ? '-modal' : ''}`} className="text-sm font-medium mt-2 mb-1 block text-indigo-800">מקסימום פריטים בטבלה:</Label>
              <Input
                id={`max-items-filter${isInModal ? '-modal' : ''}`}
                type="number"
                value={maxItemsInTable}
                onChange={(e) => setMaxItemsInTable(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="clay-input"
                min="1"
                step="5"
              />
            </div>
          </div>

          {/* Nearby Data Table */}
          {filteredNearbyData.length > 0 ? (
            <Card className="clay-card shadow-md overflow-hidden">
              <ScrollArea className={`${isInModal ? 'max-h-[300px]' : 'max-h-[400px]'}`}>
                <Table className="text-xs">
                  <TableHeader className="bg-neutral-100">
                    <TableRow>
                      <TableHead className="w-[200px]">שם הרשומה</TableHead>
                      <TableHead>סוג דאטה</TableHead>
                      <TableHead className="text-center">מרחק</TableHead>
                      <TableHead className="text-left">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNearbyData.map((item) => (
                      <TableRow key={`${item.dataType.slug}-${item.id}`} className="hover:bg-neutral-50">
                        <TableCell className="font-medium py-1.5">{item.displayName}</TableCell>
                        <TableCell className="py-1.5">
                          <Badge 
                              variant="outline" 
                              style={{ borderColor: item.dataType.spatial_config?.map_color, color: item.dataType.spatial_config?.map_color }} 
                              className="text-xxs px-1.5 py-0.5"
                          >
                              {item.dataType.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center py-1.5">{formatDistance(item.distance)}</TableCell>
                        <TableCell className="text-left py-1.5">
                          <Button variant="link" size="xs" className="p-0 h-auto text-primary-600" onClick={() => alert(`TODO: View details for ${item.displayName}`)}>
                            פרטים
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          ) : (
            <div className="text-center py-8 text-gray-500 border rounded-lg bg-neutral-50 clay-card">
              <Layers className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>לא נמצאו נתונים סמוכים להצגה</p>
              <p className="text-sm mt-1">נסה להגדיל את רדיוס החיפוש או לבחור סוגי דאטה נוספים</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Debug logs
  console.log('IncidentMapAndNearbyData render:', {
    incident: !!incident,
    incidentLocation,
    isLocationComponentEnabled,
    allowedDataTypesCount: allowedDataTypes.length,
    allCustomDataTypesCount: allCustomDataTypes?.length,
    allCustomDataRecordsCount: allCustomDataRecords?.length,
    incidentCategoryDetails: !!incidentCategoryDetails
  });

  // Always show the card, but show different content based on conditions
  return (
    <Card className="clay-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Map className="w-5 h-5 text-primary-600" /> מפה ונתונים סמוכים
        </CardTitle>
        <div className="flex gap-2">
          {incidentLocation && (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="clay-button text-xs">
                  <Maximize className="w-3 h-3 ml-1" /> הרחב תצוגה
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden clay-card"> {/* Added overflow-hidden */}
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Map className="text-primary-600" /> מפה ונתונים סמוכים - {incident.title}
                  </DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[calc(90vh-8rem)]"> {/* Added ScrollArea here */}
                  <MapAndTableContent isInModal={true} />
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}
          {!isIncidentClosed && isLocationComponentEnabled && (
            <Button variant="outline" size="sm" className="clay-button text-xs" onClick={onOpenLocationEditModal}>
              <Edit3 className="w-3 h-3 ml-1" /> {incidentLocation ? 'עדכן מיקום' : 'הגדר מיקום'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!isLocationComponentEnabled ? (
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>רכיב המיקום לא מופעל עבור קטגוריית אירוע זו</p>
          </div>
        ) : !incidentLocation ? (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>לא הוגדר מיקום לאירוע זה</p>
            {!isIncidentClosed && (
              <Button variant="outline" size="sm" className="mt-3 clay-button" onClick={onOpenLocationEditModal}>
                <Edit3 className="w-4 h-4 ml-1" /> הגדר מיקום
              </Button>
            )}
          </div>
        ) : (
          <MapAndTableContent isInModal={false} />
        )}
      </CardContent>
    </Card>
  );


}