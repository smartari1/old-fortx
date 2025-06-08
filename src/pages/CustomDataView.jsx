
import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/api/entities';
import { CustomDataType } from '@/api/entities';
import { CustomDataRecord } from '@/api/entities';
import { Incident } from '@/api/entities';
import { Resource } from '@/api/entities'; // Assuming Resource entity exists
import { InvokeLLM } from '@/api/integrations';
import GoogleAddressSelector from '@/components/forms/GoogleAddressSelector';
import CustomDataRecordFormDialog from '@/components/forms/CustomDataRecordFormDialog'; // New import
import {
  Plus,
  Database,
  Edit2,
  Trash2,
  Filter,
  FileText,
  Save,
  X,
  Search,
  Eye,
  History,
  MapPin as MapPinIcon,
  BarChart3,
  Calendar,
  Users as UsersIcon,
  Activity,
  Target,
  ArrowUp,
  ArrowDown,
  Edit3,
  TrendingUp,
  TrendingDown,
  PieChart,
  Archive,
  AlertTriangle,
  Clock,
  User as UserIcon,
  ExternalLink,
  CheckCircle,
  MessageSquare,
  Info,
  Wand2,
  Send,
  RefreshCw,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EnhancedMapComponent from '@/components/locations/EnhancedMapComponent';
import CustomDataRecordSelector from '@/components/forms/CustomDataRecordSelector';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import Markdown from 'react-markdown';
import { createPageUrl } from '@/utils';


// Helper function to render complex field values in table
// This function is intended for displaying values in the table cells.
// It tries to format common types for brevity and readability.
const renderTableCell = (value, fieldSchema) => {
  if (value === undefined || value === null) return '';

  if (!fieldSchema || !fieldSchema.type) {
    // Fallback for unknown schema type or missing schema
    const stringValue = String(value);
    return stringValue.length > 50 ? <span title={stringValue}>{stringValue.substring(0, 50)}...</span> : stringValue;
  }

  switch (fieldSchema.type) {
    case 'string':
      if (fieldSchema.enum) {
        return value; // Display enum value directly
      } else if (fieldSchema.format === 'date') {
        try {
          return format(new Date(value), 'dd/MM/yyyy', { locale: he });
        } catch { return String(value); }
      } else if (fieldSchema.format === 'email') {
        return value;
      } else {
        const stringValue = String(value);
        return stringValue.length > 50 ? <span title={stringValue}>{stringValue.substring(0, 50)}...</span> : stringValue;
      }
    case 'number':
    case 'integer':
      return typeof value === 'number' ? value.toLocaleString('he-IL') : String(value);
    case 'boolean':
      return value ? 'כן' : 'לא';
    case 'location':
      // Value can be a structured object with lat/lon and address
      const lat = value.latitude;
      const lon = value.longitude;
      const address = value.formatted_address;
      if (lat && lon) {
        return (
          <span className="flex items-center text-xs text-gray-600">
            <MapPinIcon className="w-3 h-3 ml-1" />
            {address ? <span title={`${lat.toFixed(4)}, ${lon.toFixed(4)}`}>{address}</span> : `${lat.toFixed(4)}, ${lon.toFixed(4)}`}
          </span>
        )
      }
      return <span className="text-gray-400">לא הוגדר מיקום</span>;
    case 'parent_record_reference':
      return (
        <span className="text-xs text-gray-500" title={value}>
          <Database className="inline w-3 h-3 ml-1" />{String(value).substring(0, 8)}...
        </span>
      ); // Simplified for table, just show ID
    case 'array':
    case 'object':
      const jsonString = JSON.stringify(value);
      return jsonString.length > 50 ? `${jsonString.substring(0, 50)}...` : jsonString;
    default:
      const stringValue = String(value);
      return stringValue.length > 50 ? <span title={stringValue}>{stringValue.substring(0, 50)}...`</span> : stringValue;
  }
};


export default function CustomDataView() {
  const urlParams = new URLSearchParams(window.location.search);
  const dataTypeSlug = urlParams.get('dataTypeSlug');
  const recordIdFromUrl = urlParams.get('recordId');

  const [currentDataType, setCurrentDataType] = useState(null);
  const [allRawRecords, setAllRawRecords] = useState([]); // All records fetched for the type
  const [records, setRecords] = useState([]); // Filtered and sorted records for display
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for search, filters, sorting, and data cubes
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({}); // Renamed from activeFilters
  const [sortField, setSortField] = useState('created_date'); // Replaces sortConfig.field
  const [sortDirection, setSortDirection] = useState('desc'); // Replaces sortConfig.direction
  const [dataCubes, setDataCubes] = useState([]);

  // Form dialog state
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // State for record details and notes
  const [viewingRecord, setViewingRecord] = useState(null);
  const [isRecordDrawerOpen, setIsRecordDrawerOpen] = useState(false);
  const [recordAiSummary, setRecordAiSummary] = useState('');
  const [recordHistory, setRecordHistory] = useState([]);
  const [recordNotes, setRecordNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loadingAiSummary, setLoadingAiSummary] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // State for entity data
  const [allDataTypes, setAllDataTypes] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allIncidents, setAllIncidents] = useState([]);
  const [resourceTypes, setResourceTypes] = useState([]); // Existing state for resource types
  const [currentUser, setCurrentUser] = useState(null); // New state for current user

  // State for column visibility/configuration
  const [columns, setColumns] = useState([]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({});

  // Mapping for dataType.icon to LucideReact components
  const iconComponents = {
    Database: Database,
    UsersIcon: UsersIcon,
    FileText: FileText,
    MapPinIcon: MapPinIcon,
    BarChart3: BarChart3,
    Calendar: Calendar,
    Activity: Activity,
    Target: Target,
    // Add other icons as needed for dataType.icon in the future
  };
  const DefaultIcon = Database; // Default icon if dataType.icon is not found

  // Helper to get record display name (for latest/oldest cubes)
  const getRecordDisplayName = useCallback((record) => {
    if (!record?.data) return `רשומה ${record.id?.substring(0, 6)}`;

    if (currentDataType?.display_name_field_id && record.data[currentDataType.display_name_field_id]) {
      return String(record.data[currentDataType.display_name_field_id]);
    }

    const commonFields = ['name', 'title', 'identifier', 'label'];
    for (const field of commonFields) {
      if (record.data[field]) return String(record.data[field]);
    }

    const firstStringValue = Object.values(record.data).find(v => typeof v === 'string' && v.trim());
    return firstStringValue || `רשומה ${record.id?.substring(0, 6)}`;
  }, [currentDataType]);

  // Helper to get location from custom data record  
  const getCustomRecordLocation = useCallback((record, dataType) => {
    if (!record || !record.data || !dataType || !dataType.main_location_field_id) return null;

    const locFieldKey = dataType.main_location_field_id;
    const locData = record.data[locFieldKey];

    // Handle different location data formats
    if (locData) {
      // New format: direct coordinates
      if (typeof locData.latitude === 'number' && typeof locData.longitude === 'number') {
        return {
          latitude: locData.latitude,
          longitude: locData.longitude,
          location_name: locData.location_name || locData.address,
          location_id: locData.location_id
        };
      }

      // Legacy format: nested coordinates
      if (locData.coordinates && typeof locData.coordinates.latitude === 'number' && typeof locData.coordinates.longitude === 'number') {
        return {
          latitude: locData.coordinates.latitude,
          longitude: locData.coordinates.longitude,
          location_name: locData.location_name || locData.address,
          location_id: locData.location_id
        };
      }
    }

    return null;
  }, []);

  // Calculate data cubes
  const calculateDataCube = useCallback((cube, recordsToCalculate) => {
    const filtered = recordsToCalculate.filter(record => {
      if (!cube.filters) return true;
      return Object.entries(cube.filters).every(([key, value]) => {
        // Handle boolean filters if the value is a string 'true' or 'false'
        if (typeof value === 'boolean') {
          return record.data?.[key] === value;
        }
        // General case for string/number equality
        return String(record.data?.[key]) === String(value);
      });
    });

    switch (cube.cube_type) {
      case 'count':
        return { value: filtered.length, label: cube.title };

      case 'count_by_field':
        if (!cube.field_name) return { value: 0, label: cube.title };
        const uniqueValues = new Set(filtered.map(r => r.data?.[cube.field_name]).filter(Boolean));
        return { value: uniqueValues.size, label: cube.title };

      case 'sum':
        if (!cube.field_name) return { value: 0, label: cube.title };
        const sum = filtered.reduce((acc, record) => {
          const value = Number(record.data?.[cube.field_name]) || 0;
          return acc + value;
        }, 0);
        return { value: sum, label: cube.title };

      case 'average':
        if (!cube.field_name) return { value: 0, label: cube.title };
        const values = filtered.map(r => Number(r.data?.[cube.field_name])).filter(v => !isNaN(v));
        const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        return { value: Math.round(avg * 100) / 100, label: cube.title };

      case 'latest_record':
        const latest = filtered.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
        if (!latest) return { value: 'אין רשומות', label: cube.title };
        const latestDisplay = cube.field_name ? latest.data?.[cube.field_name] : getRecordDisplayName(latest);
        return { value: latestDisplay || 'לא זמין', label: cube.title };

      case 'oldest_record':
        const oldest = filtered.sort((a, b) => new Date(a.created_date) - new Date(b.created_date))[0];
        if (!oldest) return { value: 'אין רשומות', label: cube.title };
        const oldestDisplay = cube.field_name ? oldest.data?.[cube.field_name] : getRecordDisplayName(oldest);
        return { value: oldestDisplay || 'לא זמין', label: cube.title };

      default:
        return { value: 0, label: cube.title };
    }
  }, [getRecordDisplayName]);


  // Helper function to create table columns based on dataType configuration
  const createTableColumns = useCallback(() => {
    if (!currentDataType?.schema_definition?.properties) return [];

    const schema = currentDataType.schema_definition.properties;
    let computedColumns = [];
    const defaultVisibleCols = {}; // To initialize visibleColumns state

    // Add display name column first if a display_name_field_id is defined
    if (currentDataType.display_name_field_id) {
      computedColumns.push({
        field_name: currentDataType.display_name_field_id,
        label: currentDataType.view_config?.table_columns?.find(col => col.field_name === currentDataType.display_name_field_id)?.label || 'שם הרשומה',
        sortable: true,
        visible: true,
      });
      defaultVisibleCols[currentDataType.display_name_field_id] = true;
    }


    // Add configured columns or default ones
    if (currentDataType.view_config?.table_columns && currentDataType.view_config.table_columns.length > 0) {
      currentDataType.view_config.table_columns.forEach(colConfig => {
        if (schema[colConfig.field_name] && !computedColumns.find(c => c.field_name === colConfig.field_name)) { // Avoid duplicates if display name is also a config column
          computedColumns.push({
            field_name: colConfig.field_name,
            label: colConfig.label || schema[colConfig.field_name].description || colConfig.field_name,
            sortable: colConfig.sortable !== false,
            width: colConfig.width,
          });
          defaultVisibleCols[colConfig.field_name] = colConfig.visible !== false;
        }
      });
    } else {
      // Default: show first few string/number fields from schema
      Object.entries(schema)
        .filter(([_, fieldSchema]) =>
          (fieldSchema.type === 'string' || fieldSchema.type === 'number' || fieldSchema.type === 'integer' || fieldSchema.type === 'boolean') && !fieldSchema.format
        )
        .slice(0, 3)
        .forEach(([fieldName, fieldSchema]) => {
          if (!computedColumns.find(c => c.field_name === fieldName)) { // Avoid duplicates
            computedColumns.push({
              field_name: fieldName,
              label: fieldSchema.description || fieldName,
              sortable: true,
            });
            defaultVisibleCols[fieldName] = true;
          }
        });
    }

    // Add system columns (if not already included by view_config or computed logic)
    const systemCols = [
      { field_name: 'id', label: 'מזהה', sortable: true, defaultVisible: false },
      { field_name: 'created_date', label: 'תאריך יצירה', sortable: true, defaultVisible: true },
      { field_name: 'created_by', label: 'נוצר ע"י', sortable: true, defaultVisible: true },
      { field_name: 'updated_date', label: 'תאריך עדכון', sortable: true, defaultVisible: true },
    ];
    systemCols.forEach(sc => {
      if (!computedColumns.find(tc => tc.field_name === sc.field_name)) {
        computedColumns.push({
          field_name: sc.field_name,
          label: sc.label,
          sortable: sc.sortable,
        });
        defaultVisibleCols[sc.field_name] = sc.defaultVisible;
      }
    });

    setColumns(computedColumns);
    setVisibleColumns(prev => { // Preserve user's changes if any, otherwise use defaults
      const newVisible = { ...prev };
      computedColumns.forEach(col => {
        if (newVisible[col.field_name] === undefined) {
          newVisible[col.field_name] = defaultVisibleCols[col.field_name] || false;
        }
      });
      return newVisible;
    });

  }, [currentDataType, getRecordDisplayName]);


  // Helper to apply filters, search and sort to raw records
  const applyFiltersAndSort = useCallback((rawRecords) => {
    if (!currentDataType || !Array.isArray(rawRecords)) {
      setRecords([]);
      return;
    }

    let currentProcessedRecords = [...rawRecords];

    // Apply search
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      const searchableFields = currentDataType.view_config?.searchable_fields ||
        Object.keys(currentDataType.schema_definition?.properties || {}).filter(key =>
          currentDataType.schema_definition.properties[key].type === 'string'
        );

      currentProcessedRecords = currentProcessedRecords.filter(record => {
        if (!record.data) return false;

        // Search in data fields
        const matchesInData = searchableFields.some(field => {
          const value = record.data[field];
          return value && String(value).toLowerCase().includes(searchLower);
        });

        // Search in notes
        const matchesInNotes = Array.isArray(record.manual_notes) ? record.manual_notes.some(note =>
          note.note_content && note.note_content.toLowerCase().includes(searchLower)
        ) : false;

        return matchesInData || matchesInNotes;
      });
    }

    // Apply filters
    Object.entries(filters || {}).forEach(([filterField, filterValue]) => {
      if (filterValue === null || filterValue === '' || filterValue === 'null') return; // 'null' is from Select's default value

      currentProcessedRecords = currentProcessedRecords.filter(record => {
        const recordDataValue = record.data?.[filterField];

        // For boolean filters, the value comes as string 'true'/'false'
        if (filterValue === 'true' || filterValue === 'false') {
          const booleanFilterValue = filterValue === 'true';
          return recordDataValue === booleanFilterValue;
        }

        // For select/text filters
        return String(recordDataValue).toLowerCase().includes(String(filterValue).toLowerCase());
      });
    });

    // Apply sorting
    if (sortField) {
      currentProcessedRecords.sort((a, b) => {
        let aVal, bVal;

        // Handle system fields vs. data fields
        if (a.hasOwnProperty(sortField) && typeof a[sortField] !== 'object' && !currentDataType.schema_definition.properties[sortField]) {
          aVal = a[sortField];
          bVal = b[sortField];
        } else if (currentDataType?.schema_definition?.properties?.[sortField]) { // Check if it's a data field
          aVal = a.data?.[sortField];
          bVal = b.data?.[sortField];
        } else {
          // Fallback for display name field if it's not a direct data property
          if (sortField === currentDataType?.display_name_field_id) {
            aVal = getRecordDisplayName(a);
            bVal = getRecordDisplayName(b);
          } else {
            // Last resort: treat as string comparison for unknown fields
            aVal = String(a.data?.[sortField] || a[sortField] || '');
            bVal = String(b.data?.[sortField] || b[sortField] || '');
          }
        }


        // Handle null/undefined values by placing them at the end (or beginning for asc)
        if (aVal === null || aVal === undefined) return sortDirection === 'desc' ? 1 : -1;
        if (bVal === null || bVal === undefined) return sortDirection === 'desc' ? -1 : 1;

        let comparison = 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal, 'he', { sensitivity: 'base' });
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
          comparison = (aVal === bVal) ? 0 : (aVal ? 1 : -1); // false comes before true for asc
        } else if (sortField === 'created_date' || sortField === 'updated_date') {
          comparison = new Date(aVal).getTime() - new Date(bVal).getTime();
        } else {
          // Fallback for mixed types or unsupported types, convert to string
          comparison = String(aVal).localeCompare(String(bVal), 'he', { sensitivity: 'base' });
        }

        return sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    setRecords(currentProcessedRecords);
  }, [currentDataType, searchTerm, filters, sortField, sortDirection, getRecordDisplayName]);


  // Create map features from records
  const createMapFeatures = useCallback(() => {
    if (!currentDataType || !currentDataType.spatial_config?.is_spatial) return [];

    const features = [];

    records.forEach((record) => {
      const location = getCustomRecordLocation(record, currentDataType);
      if (!location) return;

      const displayName = getRecordDisplayName(record);
      const iconName = currentDataType.spatial_config?.map_icon || currentDataType.icon || 'MapPinIcon';
      const IconComponent = iconComponents[iconName] || MapPinIcon; // Use MapPinIcon explicitly

      features.push({
        id: record.id,
        geometry: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        },
        properties: {
          title: displayName,
          description: `${currentDataType.name}${location.location_name ? ` - ${location.location_name}` : ''}`,
          entityType: 'CustomDataRecord',
          recordId: record.id,
          dataTypeSlug: currentDataType.slug,
          icon: iconName,
          color: currentDataType.spatial_config?.map_color || '#3B82F6',
        }
      });
    });

    console.log('Created map features:', features); // Debug log
    return features;
  }, [records, currentDataType, getCustomRecordLocation, getRecordDisplayName]);


  // Load custom data type and its raw records initially
  useEffect(() => {
    const fetchData = async () => {
      if (!dataTypeSlug) {
        setError("לא סופק סוג דאטה");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch current user and essential entity data
        const [user, dataTypesList, usersResponse, incidentsResponse] = await Promise.all([
          User.me(),
          CustomDataType.list(),
          User.list(),
          Incident.list(),
        ]);
        setCurrentUser(user);
        setAllDataTypes(Array.isArray(dataTypesList) ? dataTypesList : []);
        setAllUsers(usersResponse || []);
        setAllIncidents(incidentsResponse || []);

        // Find the specific data type definition by slug
        const foundType = dataTypesList?.find(dt => dt.slug === dataTypeSlug);

        if (!foundType) {
          setError(`סוג דאטה "${dataTypeSlug}" לא נמצא`);
          setLoading(false);
          return;
        }

        setCurrentDataType(foundType);

        // Fetch resource types if this is a 'resource_item' data type
        if (dataTypeSlug === 'resource_item') {
          const fetchedResourceTypes = await Resource.list();
          setResourceTypes(fetchedResourceTypes);
        } else {
          setResourceTypes([]);
        }

        // Get all raw records of this data type
        const allRecords = await CustomDataRecord.list();
        const typeRecords = Array.isArray(allRecords) ? allRecords.filter(record => record.custom_data_type_slug === dataTypeSlug) : [];
        setAllRawRecords(typeRecords);

        // Initialize sort configuration
        setSortField(foundType.view_config?.default_sort_field || 'created_date');
        setSortDirection(foundType.view_config?.default_sort_direction || 'desc');


        // If a recordId is present in the URL, try to select and show its details
        if (recordIdFromUrl && typeRecords.length > 0) {
          const recordToHighlight = typeRecords.find(r => r.id === recordIdFromUrl);
          if (recordToHighlight) {
            handleViewRecord(recordToHighlight);
          }
        }

      } catch (err) {
        console.error("Error loading data:", err);
        setError("שגיאה בטעינת המידע: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataTypeSlug, recordIdFromUrl]); // Removed other dependencies as they are set within this effect or handled by subsequent effects


  // Effect to re-create columns whenever currentDataType changes
  useEffect(() => {
    if (currentDataType) {
      createTableColumns();
    }
  }, [currentDataType, createTableColumns]);


  // Effect to apply filters/search/sort whenever relevant states or raw records change
  useEffect(() => {
    if (currentDataType && allRawRecords.length > 0) {
      applyFiltersAndSort(allRawRecords);
    } else if (currentDataType && allRawRecords.length === 0) {
      setRecords([]); // Clear records if no raw records or type removed
    }
  }, [allRawRecords, currentDataType, filters, searchTerm, sortField, sortDirection, applyFiltersAndSort]);


  // Calculate data cubes when raw records or dataType change
  useEffect(() => {
    if (!Array.isArray(currentDataType?.view_config?.data_cubes)) {
      setDataCubes([]);
      return;
    }

    const calculatedCubes = currentDataType.view_config.data_cubes.map(cubeConfig => ({
      ...cubeConfig,
      ...calculateDataCube(cubeConfig, Array.isArray(allRawRecords) ? allRawRecords : []) // Cubes calculate on raw records
    }));

    setDataCubes(calculatedCubes);
  }, [allRawRecords, currentDataType, calculateDataCube]);


  // Handle record editing (opens form)
  const handleEdit = (record) => {
    setEditingRecord(record);
    setShowFormDialog(true);
    if (isRecordDrawerOpen) { // Close drawer if open for this record
      setIsRecordDrawerOpen(false);
      setViewingRecord(null);
    }
  };

  // Handle record creation
  const handleCreate = () => {
    setEditingRecord(null);
    setShowFormDialog(true);
  };

  // Handle form success
  const handleFormSuccess = async (savedRecord) => {
    // Reload records
    const allRecords = await CustomDataRecord.list();
    const typeRecords = allRecords.filter(record => record.custom_data_type_slug === dataTypeSlug);
    setAllRawRecords(typeRecords); // Update raw records

    // Close form
    setShowFormDialog(false);
    setEditingRecord(null);
  };

  // Handle form error
  const handleFormError = (error) => {
    console.error('Form error:', error);
    alert('שגיאה בשמירת הרשומה: ' + error.message);
  };


  // Handle record deletion
  const handleDelete = async (recordId) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק רשומה זו?")) return;

    try {
      await CustomDataRecord.delete(recordId);

      // Reload records
      const allRecords = await CustomDataRecord.list();
      const typeRecords = allRecords.filter(record => record.custom_data_type_slug === dataTypeSlug);
      setAllRawRecords(typeRecords); // Update raw records

      // Close drawer if it was open for this record
      if (viewingRecord && viewingRecord.id === recordId) {
        setIsRecordDrawerOpen(false);
        setViewingRecord(null);
      }

    } catch (err) {
      console.error("Error deleting record:", err);
      alert("שגיאה במחיקת הרשומה: " + err.message);
    }
  };


  // Handle sorting column click (now only for header click for initial sort, actual sort is handled by applyFiltersAndSort)
  const handleSort = useCallback((field) => {
    setSortField(field);
    setSortDirection(prev => (sortField === field && prev === 'desc' ? 'asc' : 'desc'));
  }, [sortField]);


  // Helper to get user full name for system fields
  const getUserFullName = (userId) => {
    const user = allUsers.find(u => u.id === userId);
    return user ? user.full_name : userId;
  };

  // New function to open record in drawer
  const handleViewRecord = (record) => {
    setViewingRecord(record);
    setIsRecordDrawerOpen(true);
    setRecordAiSummary(''); // Clear previous summary
    setRecordHistory([]); // Clear previous history
    setRecordNotes(record.manual_notes || []); // Set notes from record
    setNewNote(''); // Clear new note input

    // Load AI summary if prompt is configured
    if (currentDataType?.ai_summary_prompt) {
      generateAiSummary(record);
    }

    // Load record history
    loadRecordHistory(record.id);
  };

  // Generate AI summary for the record
  const generateAiSummary = async (record) => {
    if (!currentDataType?.ai_summary_prompt || !record) return;

    setLoadingAiSummary(true);
    try {
      let prompt = currentDataType.ai_summary_prompt;

      // Replace placeholders in prompt with actual field values
      Object.keys(record.data || {}).forEach(fieldKey => {
        const fieldSchema = currentDataType.schema_definition.properties[fieldKey];
        let valueToInsert = record.data[fieldKey];

        // Format special types for prompt
        if (fieldSchema?.type === 'location' && typeof valueToInsert === 'object' && valueToInsert?.latitude && valueToInsert?.longitude) {
          valueToInsert = `קו רוחב: ${valueToInsert.latitude}, קו אורך: ${valueToInsert.longitude}${valueToInsert.formatted_address ? `, כתובת: ${valueToInsert.formatted_address}` : ''}`;
        } else if (fieldSchema?.type === 'parent_record_reference' && valueToInsert) {
          const parentDataType = allDataTypes.find(dt => dt.slug === fieldSchema.parent_data_type_slug);
          valueToInsert = `רשומה מקושרת מסוג ${parentDataType?.name || fieldSchema.parent_data_type_slug} עם מזהה ${valueToInsert}`;
        } else if (typeof valueToInsert === 'boolean') {
          valueToInsert = valueToInsert ? 'כן' : 'לא';
        } else if (fieldSchema?.format === 'date' && valueToInsert) {
          try {
            valueToInsert = format(new Date(valueToInsert), 'dd/MM/yyyy', { locale: he });
          } catch { /* ignore */ }
        } else if (typeof valueToInsert === 'object') {
          valueToInsert = JSON.stringify(valueToInsert); // Fallback for complex objects
        }

        const placeholder = `{${fieldKey}}`;
        if (prompt.includes(placeholder)) {
          prompt = prompt.replace(new RegExp(`\\{${fieldKey}\\}`, 'g'),
            valueToInsert ? String(valueToInsert) : 'לא זמין');
        }
      });

      // Add built-in fields
      prompt = prompt.replace(/{id}/g, record.id || 'לא זמין');
      prompt = prompt.replace(/{created_date}/g, record.created_date ?
        format(new Date(record.created_date), 'dd/MM/yyyy HH:mm', { locale: he }) : 'לא זמין');
      prompt = prompt.replace(/{created_by}/g, getUserFullName(record.created_by) || 'לא זמין');

      const response = await InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      setRecordAiSummary(response || 'לא ניתן היה ליצור סיכום.');
    } catch (error) {
      console.error('Error generating AI summary:', error);
      setRecordAiSummary('שגיאה ביצירת סיכום AI: ' + error.message);
    } finally {
      setLoadingAiSummary(false);
    }
  };

  // Load record history (incidents, mentions, etc.)
  const loadRecordHistory = async (recordId) => {
    setLoadingHistory(true);
    try {
      const history = [];

      // Search for incidents that mention this record
      allIncidents.forEach(incident => {
        // Check if record is mentioned in incident logs
        if (incident.logs) {
          incident.logs.forEach(log => {
            if (log.tagged_entities) {
              const mentionedEntity = log.tagged_entities.find(entity =>
                entity.entity_type === 'custom_data' &&
                entity.entity_id === recordId &&
                entity.slug === currentDataType.slug
              );
              if (mentionedEntity) {
                history.push({
                  type: 'incident_mention',
                  date: log.timestamp,
                  title: `הוזכר באירוע: ${incident.title}`,
                  description: log.content,
                  related_id: incident.id,
                  icon: 'AlertTriangle'
                });
              }
            }
          });
        }
      });

      // Add record creation event
      if (viewingRecord) { // Ensure viewingRecord exists
        history.push({
          type: 'record_created',
          date: viewingRecord.created_date,
          title: 'רשומה נוצרה',
          description: `נוצרה על ידי ${getUserFullName(viewingRecord.created_by)}`,
          icon: 'Plus'
        });
      }


      // Sort by date (newest first)
      history.sort((a, b) => new Date(b.date) - new Date(a.date));

      setRecordHistory(history);
    } catch (error) {
      console.error('Error loading record history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Add note to record from drawer
  const handleAddNote = async () => {
    if (!newNote.trim() || !viewingRecord || !currentUser) return;

    try {
      const noteToAdd = {
        note_id: Date.now().toString(), // Simple ID generation
        note_content: newNote.trim(),
        created_by_user_id: currentUser.id,
        created_by_user_name: currentUser.full_name,
        created_at: new Date().toISOString()
      };

      const updatedNotes = [...recordNotes, noteToAdd];
      const updatedManualNotes = [...(viewingRecord.manual_notes || []), noteToAdd];

      await CustomDataRecord.update(viewingRecord.id, {
        manual_notes: updatedManualNotes
      });

      setRecordNotes(updatedNotes);
      setNewNote('');

      // Update the record in the main list
      setAllRawRecords(prev => prev.map(r =>
        r.id === viewingRecord.id
          ? { ...r, manual_notes: updatedManualNotes }
          : r
      ));
      setViewingRecord(prev => ({ ...prev, manual_notes: updatedManualNotes })); // Update viewing record too

    } catch (error) {
      console.error('Error adding note:', error);
      alert('שגיאה בהוספת הערה: ' + error.message);
    }
  };

  // Render field value in record view (enhanced version for drawer)
  const renderRecordFieldValue = (value, fieldSchema) => {
    if (value === undefined || value === null || value === '') {
      return <span className="italic text-gray-400 text-sm">אין ערך</span>;
    }

    if (fieldSchema?.format === 'date') {
      try {
        return (
          <div className="flex items-center gap-1 text-gray-800 text-sm">
            <Calendar className="w-4 h-4 text-gray-500" />
            {format(new Date(value), 'dd/MM/yyyy', { locale: he })}
          </div>
        );
      } catch (e) {
        return <span className="text-gray-600 text-sm">{String(value)}</span>;
      }
    }

    switch (fieldSchema?.type) {
      case 'string':
        if (fieldSchema.format === 'url') {
          return (
            <a href={String(value)} target="_blank" rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 text-sm">
              {String(value)} <ExternalLink className="w-3 h-3" />
            </a>
          );
        }
        if (fieldSchema.format === 'email') {
          return (
            <a href={`mailto:${String(value)}`}
              className="text-blue-600 hover:text-blue-800 hover:underline text-sm">
              {String(value)}
            </a>
          );
        }
        if (fieldSchema.format === 'textarea' || (fieldSchema.description && (fieldSchema.description.toLowerCase().includes('תיאור') || fieldSchema.description.toLowerCase().includes('הערות')))) {
          return <div className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded-lg border">{String(value)}</div>;
        }
        // Specific handling for 'resource_type_id' display in read-only view
        if (fieldSchema?.field_name === 'resource_type_id' || (fieldSchema?.description && (fieldSchema.description.includes('סוג המשאב') || fieldSchema.description.includes('Resource')))) {
          const resourceType = resourceTypes.find(rt => rt.id === value);
          return resourceType ? (
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
              <Database className="w-3 h-3 ml-1" />{resourceType.name}
            </Badge>
          ) : (
            <span className="text-gray-500 text-sm">{value} (לא ידוע)</span>
          );
        }
        return <span className="text-gray-800 text-sm">{String(value)}</span>;
      case 'enum': // Add enum case for display as well if not already string
      case 'number':
      case 'integer':
        return <span className="font-mono text-gray-800 text-sm">{Number(value).toLocaleString('he-IL')}</span>;
      case 'boolean':
        return (
          <Badge variant={value ? "default" : "secondary"} className="text-xs">
            {value ? (
              <><CheckCircle className="w-3 h-3 mr-1" />כן</>
            ) : (
              <><X className="w-3 h-3 mr-1" />לא</>
            )}
          </Badge>
        );
      case 'location':
        if (typeof value === 'object' && value.latitude != null && value.longitude != null) {
          return (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-1 text-blue-800 font-medium mb-1">
                <MapPinIcon className="w-4 h-4" />
                מיקום
                <a
                  href={`https://www.google.com/maps?q=${value.latitude},${value.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs mr-2"
                  title="פתח במפות Google"
                >
                  (מפה)
                </a>
              </div>
              {value.formatted_address && (
                <div className="text-sm text-gray-700 mb-1">
                  {value.formatted_address}
                </div>
              )}
              <div className="text-sm text-gray-600 font-mono">
                קו רוחב: {value.latitude}<br />
                קו אורך: {value.longitude}
              </div>
            </div>
          );
        }
        return <span className="text-gray-500 text-sm">לא הוגדר מיקום</span>;
      case 'parent_record_reference':
        const parentDataTypeSlug = fieldSchema.parent_data_type_slug;
        const parentDataType = allDataTypes.find(dt => dt.slug === parentDataTypeSlug);
        return (
          <a
            href={createPageUrl(`CustomRecordViewPage?dataTypeSlug=${parentDataTypeSlug}&recordId=${value}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            <Database className="w-3 h-3" />
            <span>
              {parentDataType ? parentDataType.name : 'רשומה מקושרת'}: {String(value).substring(0, 8)}...
            </span>
          </a>
        );
      default:
        if (typeof value === 'object') {
          return <div className="bg-gray-50 p-2 rounded text-sm font-mono whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</div>;
        }
        return <span className="text-gray-800 text-sm">{String(value)}</span>;
    }
  };


  const handleFilterChange = useCallback((filterField, value) => { // Changed filterId to filterField
    setFilters(prev => ({
      ...prev,
      [filterField]: value === null || value === 'null' ? null : value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchTerm('');
    setSortField('created_date');
    setSortDirection('desc');
  }, []);

  const formatCubeValue = (cube) => {
    if (cube.value === null || cube.value === undefined || cube.value === '') {
      return '-';
    }
    if (cube.cube_type === 'latest_record' || cube.cube_type === 'oldest_record') {
      return cube.value; // For records, return as is
    }

    if (!cube.display_format) return cube.value;

    switch (cube.display_format) {
      case 'currency':
        return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(cube.value);
      case 'percentage':
        return `${cube.value}%`;
      case 'number':
        return new Intl.NumberFormat('he-IL').format(cube.value);
      case 'relative':
        // For relative time display (e.g., "5 days ago") - requires date-fns or similar
        return cube.value;
      default:
        return cube.value;
    }
  };

  const getCubeIcon = (cube) => {
    switch (cube.icon || cube.cube_type) {
      case 'count': return <UsersIcon className="w-6 h-6 text-gray-700" />;
      case 'sum': case 'average': return <BarChart3 className="w-6 h-6 text-gray-700" />;
      case 'latest_record': case 'oldest_record': return <Calendar className="w-6 h-6 text-gray-700" />;
      case 'count_by_field': return <Target className="w-6 h-6 text-gray-700" />;
      default: return <Activity className="w-6 h-6 text-gray-700" />;
    }
  };

  const getCubeColorClass = (color) => {
    switch (color) {
      case 'green': return 'bg-green-100 border-green-200 text-green-800';
      case 'red': return 'bg-red-100 border-red-200 text-red-800';
      case 'yellow': return 'bg-yellow-100 border-yellow-200 text-yellow-800';
      case 'purple': return 'bg-purple-100 border-purple-200 text-purple-800';
      case 'orange': return 'bg-orange-100 border-orange-200 text-orange-800';
      case 'gray': return 'bg-gray-100 border-gray-200 text-gray-800';
      default: return 'bg-blue-100 border-blue-200 text-blue-800';
    }
  };

  // Helper function to render a custom icon based on name (from CustomDataType.icon)
  const RenderDataTypeIcon = iconComponents[currentDataType?.icon] || DefaultIcon;

  // Data Cubes rendering
  const renderDataCubes = () => {
    if (!Array.isArray(dataCubes) || dataCubes.length === 0) {
      return null;
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {dataCubes.map((cube) => (
          <Card key={cube.id} className={`clay-card ${getCubeColorClass(cube.color)} !shadow-sm`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {cube.title}
              </CardTitle>
              {getCubeIcon(cube)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCubeValue(cube)}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Render filter input based on type
  const renderFilterInput = useCallback((filterConfig, fieldSchema) => {
    const currentValue = filters[filterConfig.field_name] || '';

    if (filterConfig.filter_type === 'select') {
      let options = filterConfig.options || [];

      // Auto-populate options if configured
      if (filterConfig.auto_populate_options && fieldSchema.enum) {
        options = fieldSchema.enum.map(value => ({ value, label: value }));
      } else if (filterConfig.auto_populate_options) {
        // Get unique values from allRawRecords
        const uniqueValues = [...new Set(
          allRawRecords.map(r => r.data?.[filterConfig.field_name]).filter(Boolean)
        )];
        options = uniqueValues.map(value => ({ value, label: String(value) }));
      }

      return (
        <Select
          value={currentValue}
          onValueChange={(value) => handleFilterChange(filterConfig.field_name, value)}
        >
          <SelectTrigger className="clay-select text-sm">
            <SelectValue placeholder={`בחר ${filterConfig.label}`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="null">הכל</SelectItem>
            {options.map(option => (
              <SelectItem key={String(option.value)} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (filterConfig.filter_type === 'boolean') {
      return (
        <Select
          value={currentValue === true ? 'true' : (currentValue === false ? 'false' : 'null')}
          onValueChange={(value) => handleFilterChange(filterConfig.field_name, value)}
        >
          <SelectTrigger className="clay-select text-sm">
            <SelectValue placeholder="בחר..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="null">הכל</SelectItem>
            <SelectItem value="true">כן</SelectItem>
            <SelectItem value="false">לא</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    // Default: text input
    return (
      <Input
        value={currentValue}
        onChange={(e) => handleFilterChange(filterConfig.field_name, e.target.value)}
        placeholder={`חפש ב${filterConfig.label}`}
        className="clay-input text-sm"
      />
    );
  }, [allRawRecords, filters, handleFilterChange]);

  // Create filter components
  const createFilterComponents = useCallback(() => {
    if (!currentDataType?.view_config?.filters) return null;

    return currentDataType.view_config.filters.map(filterConfig => {
      const fieldSchema = currentDataType.schema_definition?.properties[filterConfig.field_name];
      if (!fieldSchema) return null;

      return (
        <div key={filterConfig.id} className="min-w-[180px] flex-1">
          <Label className="text-xs text-neutral-600 mb-1 block">
            {filterConfig.label}
          </Label>
          {renderFilterInput(filterConfig, fieldSchema)}
        </div>
      );
    });
  }, [currentDataType, renderFilterInput]);


  const toggleColumnVisibility = (field) => {
    setVisibleColumns(prev => ({ ...prev, [field]: !prev[field] }));
  };

  if (loading && !currentDataType) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="clay-card bg-red-50 p-6 text-center text-red-700">
        <div className="mb-4">שגיאה: {error}</div>
        <Button onClick={() => window.location.reload()} className="clay-button">נסה שוב</Button>
      </div>
    );
  }

  if (!currentDataType) {
    return (
      <div className="clay-card bg-amber-50 p-6 text-center text-amber-700">
        <div className="mb-4">סוג הדאטה לא נמצא</div>
        <Button onClick={() => window.history.back()} className="clay-button">חזרה</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          {currentDataType && <RenderDataTypeIcon className="w-8 h-8 ml-3 text-primary-500" />}
          {currentDataType?.name || 'טוען...'}
        </h1>
        {currentDataType?.description && (
          <p className="text-gray-600">{currentDataType.description}</p>
        )}
      </div>

      {/* Data Cubes */}
      {renderDataCubes()}

      {/* Search and Filters */}
      <div className="clay-card bg-white p-4 mb-6 !shadow-sm">
        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder={`חפש ב${currentDataType?.name || 'רשומות'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="clay-input pr-10"
              />
            </div>
            <Button
              onClick={handleCreate}
              className="clay-button bg-primary-100 text-primary-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              הוסף רשומה חדשה
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            {createFilterComponents()}
          </div>

          {/* Sort & Clear Filters */}
          <div className="flex gap-4 items-center justify-between">
            <div className="flex gap-4 items-center">
              <label className="text-sm font-medium text-neutral-600">מיון לפי:</label>
              <Select value={sortField} onValueChange={setSortField}>
                <SelectTrigger className="clay-select w-48 text-sm">
                  <SelectValue placeholder="בחר שדה למיון..." />
                </SelectTrigger>
                <SelectContent>
                  {columns.filter(col => col.sortable !== false).map(column => (
                    <SelectItem key={column.field_name} value={column.field_name}>
                      {column.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sortField && (
                <Select value={sortDirection} onValueChange={setSortDirection}>
                  <SelectTrigger className="clay-select w-32 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">עולה</SelectItem>
                    <SelectItem value="desc">יורד</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            {(searchTerm || Object.keys(filters || {}).some(key => filters[key] !== null && filters[key] !== 'null') || sortField !== 'created_date' || sortDirection !== 'desc') && (
              <Button
                onClick={clearFilters}
                variant="outline"
                size="sm"
                className="clay-button"
              >
                <Filter className="w-4 h-4 ml-1" />
                נקה הכל
              </Button>
            )}
          </div>

          {/* Column Selector */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColumnSelector(true)}
              className="clay-button"
            >
              <Filter className="w-4 h-4 ml-1" />
              הצג/הסתר עמודות
            </Button>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="clay-card bg-white !shadow-sm">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            רשומות ({Array.isArray(records) ? records.length : 0})
          </h2>
          {Array.isArray(records) && Array.isArray(allRawRecords) && records.length !== allRawRecords.length && (
            <Badge variant="outline" className="bg-gray-100 text-gray-700">
              מוצגות {records.length} מתוך {allRawRecords.length} רשומות
            </Badge>
          )}
        </div>

        {!Array.isArray(records) || records.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-semibold mb-2">אין רשומות</h3>
            <p className="text-sm">
              {(searchTerm || Object.keys(filters || {}).some(key => filters[key] !== null && filters[key] !== 'null')
                || sortField !== 'created_date' || sortDirection !== 'desc')
                ? 'לא נמצאו רשומות התואמות לחיפוש או הפילטרים הנוכחיים.'
                : 'לא נוצרו עדיין רשומות עבור סוג דאטה זה.'}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-450px)] md:h-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-gray-100 z-10">
                <TableRow>
                  {columns.filter(col => visibleColumns[col.field_name]).map(column => (
                    <TableHead key={column.field_name} style={{ width: column.width || 'auto' }} className="text-right px-3 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => column.sortable !== false && handleSort(column.field_name)}
                        className="font-semibold text-gray-700 hover:bg-gray-200 p-1"
                      >
                        {column.label || column.field_name}
                        {sortField === column.field_name && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 inline mr-1" /> : <ArrowDown className="w-3 h-3 inline mr-1" />)}
                      </Button>
                    </TableHead>
                  ))}
                  <TableHead className="text-right px-3 py-2 text-gray-700 w-24">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map(record => {
                  return (
                    <TableRow key={record.id} className="hover:bg-gray-50 transition-colors">
                      {columns.filter(col => visibleColumns[col.field_name]).map(column => (
                        <TableCell key={column.field_name} className="px-3 py-2 text-sm text-gray-600 align-top">
                          {column.field_name === currentDataType?.display_name_field_id ?
                            getRecordDisplayName(record)
                            : column.field_name === 'created_by' ?
                              getUserFullName(record.created_by)
                              : column.field_name === 'created_date' || column.field_name === 'updated_date' ?
                                format(new Date(record[column.field_name]), 'dd/MM/yy HH:mm', { locale: he })
                                : (record[column.field_name] !== undefined ? renderTableCell(record[column.field_name], currentDataType.schema_definition.properties[column.field_name] || {})
                                  : renderTableCell(record.data?.[column.field_name], currentDataType.schema_definition.properties[column.field_name] || {}))
                          }
                        </TableCell>
                      ))}
                      <TableCell className="px-3 py-2 align-top">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewRecord(record)}
                            className="w-8 h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-all duration-200 rounded-lg"
                            title="הצג פרטים מלאים"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(record)}
                            className="w-8 h-8 text-green-600 hover:text-green-800 hover:bg-green-50 transition-all duration-200 rounded-lg"
                            title="ערוך רשומה"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(record.id)}
                            className="w-8 h-8 text-red-600 hover:text-red-800 hover:bg-red-50 transition-all duration-200 rounded-lg"
                            title="מחק רשומה"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>

      {/* Record Form Dialog (new component) */}
      <CustomDataRecordFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        dataType={currentDataType}
        record={editingRecord}
        onSuccess={handleFormSuccess}
        onError={handleFormError}
        resourceTypes={resourceTypes} // Passed to allow the form to render resource_type_id field
        allDataTypes={allDataTypes} // Passed to allow the form to resolve parent_record_reference field
        allUsers={allUsers} // Passed to allow the form to resolve user references
        currentUser={currentUser} // Passed for any create/update logic that requires current user
      />

      {/* Column Visibility Selector Dialog */}
      <Dialog open={showColumnSelector} onOpenChange={setShowColumnSelector}>
        <DialogContent className="clay-card max-w-sm">
          <DialogHeader>
            <DialogTitle>בחירת עמודות</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 p-2">
              {columns.map(col => (
                <div key={col.field_name} className="flex items-center space-x-2">
                  <Checkbox
                    id={`col-${col.field_name}`}
                    checked={visibleColumns[col.field_name]}
                    onCheckedChange={() => toggleColumnVisibility(col.field_name)}
                  />
                  <label
                    htmlFor={`col-${col.field_name}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {col.label}
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setShowColumnSelector(false)} className="clay-button">
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Record View Drawer */}
      <Sheet open={isRecordDrawerOpen} onOpenChange={setIsRecordDrawerOpen}>
        <SheetContent className="clay-card sm:max-w-3xl p-0 overflow-y-auto" side="left">
          <SheetHeader className="p-6 border-b sticky top-0 bg-white z-10">
            <div className="flex justify-between items-start">
              <div>
                <SheetTitle className="text-2xl font-bold text-primary-700 flex items-center gap-2">
                  <Info className="w-6 h-6" />
                  {viewingRecord && currentDataType?.display_name_field_id ?
                    (viewingRecord.data?.[currentDataType.display_name_field_id] || `רשומה ${viewingRecord.id?.substring(0, 8)}`) :
                    `רשומה ${viewingRecord?.id?.substring(0, 8)}`
                  }
                </SheetTitle>
                <p className="text-sm text-gray-600 mt-1">{currentDataType?.name}</p>
              </div>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-neutral-100">
                  <X className="w-5 h-5 text-neutral-500" />
                </Button>
              </SheetClose>
            </div>
          </SheetHeader>

          {viewingRecord && (
            <Tabs defaultValue="details" className="w-full">
              <div className="px-6 py-4 border-b bg-gray-50">
                <TabsList className="grid w-full grid-cols-4 clay-card">
                  <TabsTrigger value="details" className="flex items-center gap-2">
                    <><Info className="w-4 h-4" /> פרטים</>
                  </TabsTrigger>
                  <TabsTrigger value="ai-summary" className="flex items-center gap-2">
                    <><Sparkles className="w-4 h-4" /> סיכום AI</>
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex items-center gap-2">
                    <><History className="w-4 h-4" /> היסטוריה</>
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="flex items-center gap-2">
                    <><MessageSquare className="w-4 h-4" /> הערות ({recordNotes.length})</>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                {/* Details Tab */}
                <TabsContent value="details" className="mt-0">
                  <div className="grid gap-6">
                    {/* Basic Info Card */}
                    <Card className="clay-card shadow-none border-0">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Info className="w-5 h-5 text-primary-600" />
                          פרטים בסיסיים
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4">
                          {currentDataType?.schema_definition?.properties && Object.entries(currentDataType.schema_definition.properties).map(([fieldKey, fieldSchema]) => {
                            const value = viewingRecord.data?.[fieldKey];
                            return (
                              <div key={fieldKey} className="border-b pb-3 last:border-b-0">
                                <label className="text-sm font-medium text-gray-600 block mb-1">
                                  {fieldSchema.description || fieldKey}
                                </label>
                                <div className="text-gray-800">
                                  {renderRecordFieldValue(value, { ...fieldSchema, field_name: fieldKey })} {/* Pass fieldKey for specific display logic */}
                                </div>
                              </div>
                            );
                          })}

                          {/* System fields */}
                          <div className="mt-6 pt-4 border-t bg-gray-50 -mx-6 px-6 -mb-6 pb-6">
                            <h4 className="text-sm font-medium text-gray-600 mb-3">מידע מערכת</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">נוצר:</span>
                                <span className="font-medium mr-2">
                                  {viewingRecord.created_date ? format(new Date(viewingRecord.created_date), 'dd/MM/yyyy HH:mm', { locale: he }) : '-'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">נוצר על ידי:</span>
                                <span className="font-medium mr-2">{getUserFullName(viewingRecord.created_by)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">עודכן:</span>
                                <span className="font-medium mr-2">
                                  {viewingRecord.updated_date ? format(new Date(viewingRecord.updated_date), 'dd/MM/yyyy HH:mm', { locale: he }) : '-'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">מזהה:</span>
                                <span className="font-mono text-xs mr-2">{viewingRecord.id}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* AI Summary Tab */}
                <TabsContent value="ai-summary" className="mt-0">
                  <Card className="clay-card shadow-none border-0">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-purple-600" />
                          סיכום AI
                        </CardTitle>
                        {currentDataType?.ai_summary_prompt && (
                          <Button
                            onClick={() => generateAiSummary(viewingRecord)}
                            disabled={loadingAiSummary}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <RefreshCw className={`w-4 h-4 ${loadingAiSummary ? 'animate-spin' : ''}`} />
                            רענן סיכום
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {!currentDataType?.ai_summary_prompt ? (
                        <div className="text-center py-8 text-gray-500">
                          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>לא הוגדר פרומפט AI עבור סוג דאטה זה</p>
                          <p className="text-sm mt-2">ניתן להגדיר פרומפט בהגדרות סוג הדאטה</p>
                        </div>
                      ) : loadingAiSummary ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                          <span className="mr-3 text-gray-600">יוצר סיכום AI...</span>
                        </div>
                      ) : recordAiSummary ? (
                        <div className="prose prose-sm max-w-none">
                          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                            <Markdown className="text-gray-800">{recordAiSummary}</Markdown>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Wand2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>לחץ על "רענן סיכום" ליצירת סיכום AI</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="mt-0">
                  <Card className="clay-card shadow-none border-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <History className="w-5 h-5 text-blue-600" />
                        היסטורית האירועים
                      </CardTitle>
                      <CardDescription>
                        כל המקומות שבהם הרשומה הוזכרה או שימשה
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loadingHistory ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                          <span className="mr-3 text-gray-600">טוען היסטוריה...</span>
                        </div>
                      ) : recordHistory.length > 0 ? (
                        <div className="space-y-4">
                          {recordHistory.map((item, index) => (
                            <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-lg border">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  {item.icon === 'AlertTriangle' && <AlertTriangle className="w-4 h-4 text-orange-600" />}
                                  {item.icon === 'Plus' && <Plus className="w-4 h-4 text-green-600" />}
                                  {!['AlertTriangle', 'Plus'].includes(item.icon) && <Clock className="w-4 h-4 text-blue-600" />}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900">{item.title}</h4>
                                {item.description && (
                                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                  <span>{format(new Date(item.date), 'dd/MM/yyyy HH:mm', { locale: he })}</span>
                                  {item.related_id && (
                                    <span className="text-blue-600">מזהה: {item.related_id.substring(0, 8)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>אין היסטורית שימוש זמינה</p>
                          <p className="text-sm mt-2">הרשומה עדיין לא שימשה במערכת</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes" className="mt-0">
                  <Card className="clay-card shadow-none border-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-green-600" />
                        הערות ({recordNotes.length})
                      </CardTitle>
                      <CardDescription>
                        הערות ישירות על הרשומה, לא קשורות לאירועים ספציפיים
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Add new note */}
                      <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                        <h4 className="font-medium text-green-800 mb-3">הוסף הערה חדשה</h4>
                        <div className="space-y-3">
                          <Textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="כתוב הערה..."
                            className="clay-textarea"
                            rows={3}
                          />
                          <div className="flex justify-end">
                            <Button
                              onClick={handleAddNote}
                              disabled={!newNote.trim()}
                              className="clay-button bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
                            >
                              <Send className="w-4 h-4" />
                              הוסף הערה
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Existing notes */}
                      {recordNotes.length > 0 ? (
                        <div className="space-y-4">
                          {recordNotes.map((note) => (
                            <div key={note.note_id} className="p-4 bg-gray-50 rounded-lg border">
                              <div className="flex items-start gap-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                                    {note.created_by_user_name?.charAt(0)?.toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-gray-900 text-sm">
                                      {note.created_by_user_name || 'משתמש לא ידוע'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {format(new Date(note.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                                    </span>
                                  </div>
                                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{note.note_content}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>אין הערות על רשומה זו</p>
                          <p className="text-sm mt-2">תוכל להוסיף הערה ראשונה למעלה</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
