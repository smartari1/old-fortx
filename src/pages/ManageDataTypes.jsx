
import React, { useState, useEffect, useMemo } from 'react';
import { CustomDataType } from '@/api/entities';
import { 
  Plus, Edit, Trash2, Save, X, Database, Settings, ListChecks, AlertTriangle, 
  Users, Car, Building, FileText, Box, Shield, MapPin, Calendar, Truck, Home, 
  Store, Camera, Wrench, Laptop, Server, Radio, Antenna, Zap, TreePine, 
  Mountain, Waves, Fuel, Hospital, School, Factory, Warehouse, Compass,
  BarChart3 // Ensure BarChart3 is here if used in view_config default icons
} from 'lucide-react';
import { MapPin as MapPinIconLucide } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card"; // CardHeader, CardTitle removed from here as they are in sub-components
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import DataTypeGeneralSettingsForm from '../components/datatypes/DataTypeGeneralSettingsForm';
import DataTypeSchemaFieldsForm from '../components/datatypes/DataTypeSchemaFieldsForm';
import DataTypeViewConfigForm from '../components/datatypes/DataTypeViewConfigForm';


// Helper function to generate a basic slug
const generateSlug = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, ''); // Remove all non-word chars
};

const initialViewConfig = {
  searchable_fields: [],
  default_sort_field: 'created_date',
  default_sort_direction: 'desc',
  filters: [],
  data_cubes: [],
  table_columns: [],
};

export default function ManageDataTypes() {
  const [dataTypes, setDataTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [currentType, setCurrentType] = useState({
    name: '',
    description: '',
    slug: '',
    icon: 'ListChecks',
    schema_definition: {
      'type': 'object',
      'properties': {},
      'required': [],
    },
    main_location_field_id: '',
    display_name_field_id: '',
    spatial_config: {
      is_spatial: false,
      location_type: 'point',
      map_icon: 'MapPin',
      map_color: '#3B82F6',
      clustering_enabled: true,
      show_in_legend: true,
      popup_template: ''
    },
    permissions: [],
    view_config: JSON.parse(JSON.stringify(initialViewConfig)), // Initialize view_config
  });
  const [schemaFields, setSchemaFields] = useState([]);
  // editingFilterIndex and editingDataCubeIndex are no longer needed as forms are inline in DataTypeViewConfigForm


  // Icons for selection - ensure all are imported
  const availableIcons = ["Users", "Car", "Building", "FileText", "Box", "Shield", "MapPin", "Calendar", "ListChecks", "Settings", "Database", "AlertTriangle", "BarChart3"];

  // Additional map icons for spatial display
  const availableMapIcons = [
    "MapPin", "Car", "Truck", "Building", "Home", "Store", "Camera", "Wrench", "Laptop", "Server", "Radio", "Antenna", "Zap", "TreePine", "Mountain",
    "Waves", "Fuel", "Hospital", "School", "Factory", "Warehouse", "Compass", "Users", "Shield", "AlertTriangle",
  ];

  // Create a map for direct component access instead of eval
  const iconComponents = {
    Users, Car, Building, FileText, Box, Shield, MapPin: MapPinIconLucide, Calendar, ListChecks, Settings, Database, AlertTriangle,
    Truck, Home, Store, Camera, Wrench, Laptop, Server, Radio, Antenna, Zap, TreePine, Mountain, Waves, Fuel, Hospital, School, Factory, Warehouse, Compass, BarChart3
  };

  useEffect(() => {
    loadDataTypes();
  }, []);

  const loadDataTypes = async () => {
    setLoading(true);
    setError(null);
    try {
      const types = await CustomDataType.list();
      setDataTypes(types);
    } catch (err) {
      console.error("Error loading data types:", err);
      setError("שגיאה בטעינת סוגי דאטה: " + err.message);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setEditingType(null);
    setCurrentType({
      name: '',
      description: '',
      slug: '',
      icon: 'ListChecks',
      schema_definition: { 'type': 'object', 'properties': {}, 'required': [] },
      main_location_field_id: '',
      display_name_field_id: '',
      spatial_config: {
        is_spatial: false,
        location_type: 'point',
        map_icon: 'MapPin',
        map_color: '#3B82F6',
        clustering_enabled: true,
        show_in_legend: true,
        popup_template: ''
      },
      permissions: [],
      view_config: JSON.parse(JSON.stringify(initialViewConfig)), // Reset view_config
    });
    setSchemaFields([]);
    setShowForm(false);
  };

  const handleEdit = (dataType) => {
    setEditingType(dataType);
    setCurrentType({
      ...dataType,
      main_location_field_id: dataType.main_location_field_id || '',
      display_name_field_id: dataType.display_name_field_id || '',
      spatial_config: dataType.spatial_config || {
        is_spatial: false,
        location_type: 'point',
        map_icon: 'MapPin',
        map_color: '#3B82F6',
        clustering_enabled: true,
        show_in_legend: true,
        popup_template: ''
      },
      view_config: { // Ensure view_config and its nested arrays/objects exist
        ...JSON.parse(JSON.stringify(initialViewConfig)), // Start with defaults
        ...(dataType.view_config || {}), // Spread existing config
        filters: Array.isArray(dataType.view_config?.filters) ? dataType.view_config.filters : [],
        data_cubes: Array.isArray(dataType.view_config?.data_cubes) ? dataType.view_config.data_cubes : [],
        table_columns: Array.isArray(dataType.view_config?.table_columns) ? dataType.view_config.table_columns : [],
        searchable_fields: Array.isArray(dataType.view_config?.searchable_fields) ? dataType.view_config.searchable_fields : [],
      }
    });
    const fields = Object.entries(dataType.schema_definition.properties || {}).map(([name, def]) => ({
      id: name, // Use name as id for schema fields as they are unique within the schema
      name, // The field 'name' in internal state
      type: def.type,
      description: def.description || '',
      required: dataType.schema_definition.required?.includes(name) || false,
      enum: def.enum || [], // For enum type
      format: def.format || '', // For string type formats
      parent_data_type_slug: def.parent_data_type_slug || '',
      parent_display_format: def.parent_display_format || '',
      parent_record_creation_config: def.parent_record_creation_config || {
        enabled_fields: [],
        required_fields: [],
        field_labels_override: {},
        field_placeholders_override: {}
      }
    }));
    setSchemaFields(fields);
    setShowForm(true);
  };

  const handleDelete = async (typeId) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק סוג דאטה זה? כל הרשומות הקשורות אליו (CustomDataRecord) עלולות להישאר ללא הגדרה תואמת.")) {
      try {
        await CustomDataType.delete(typeId);
        loadDataTypes();
      } catch (err) {
        console.error("Error deleting data type:", err);
        setError("שגיאה במחיקת סוג דאטה: " + err.message);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "name" && !editingType) {
        setCurrentType(prev => ({ ...prev, [name]: value, slug: generateSlug(value) }));
    } else {
        setCurrentType(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (name, value) => {
    setCurrentType(prev => ({ ...prev, [name]: value }));
  };

  const handleSpatialConfigChange = (key, value) => {
    setCurrentType(prev => ({
      ...prev,
      spatial_config: {
        ...prev.spatial_config,
        [key]: value
      }
    }));
  };

  const handleIconChange = (iconName) => {
    setCurrentType(prev => ({...prev, icon: iconName}));
  };

  // The following schema field handlers (add, change, remove, parent config change)
  // are no longer directly used in ManageDataTypes component to modify schemaFields state,
  // as DataTypeSchemaFieldsForm will now handle its own internal state and pass the
  // full updated fields array back via its onChange prop.
  // They are commented out as they are now redundant in ManageDataTypes.

  /*
  const addSchemaField = () => {
    const newFieldId = `field_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    setSchemaFields(prev => [...prev, {
      id: newFieldId,
      name: '', // Renamed from fieldName to name for consistency with schema_definition
      type: 'string',
      description: '',
      required: false,
      enum: [], // For enum/select type
      format: '', // For string type formats
      parent_data_type_slug: '',
      parent_display_format: '',
      parent_record_creation_config: {
        enabled_fields: [],
        required_fields: [],
        field_labels_override: {},
        field_placeholders_override: {}
      }
    }]);
  };

  const handleSchemaFieldChange = (index, fieldPropertyName, value) => {
    setSchemaFields(prev => {
      const updated = [...prev];
      const currentField = { ...updated[index] };

      currentField[fieldPropertyName] = value;

      // Type-specific cleanup
      if (fieldPropertyName === 'type') {
          if (value !== 'enum') {
              currentField.enum = undefined; // Clear enum options
          }
          if (value !== 'string') {
              currentField.format = undefined; // Clear format for non-string types
          }
          if (value !== 'parent_record_reference') {
              currentField.parent_data_type_slug = undefined;
              currentField.parent_display_format = undefined;
              currentField.parent_record_creation_config = undefined; // Clear parent record creation config
          } else {
              // Initialize if switching to parent_record_reference and not already defined
              if (!currentField.parent_record_creation_config) {
                  currentField.parent_record_creation_config = {
                      enabled_fields: [],
                      required_fields: [],
                      field_labels_override: {},
                      field_placeholders_override: {}
                  };
              }
          }
      }

      updated[index] = currentField;
      return updated;
    });
  };

  const handleParentRecordCreationConfigChange = (fieldIndex, configPropertyName, configValue) => {
    setSchemaFields(prev => {
      const updatedFields = [...prev];
      const fieldToUpdate = { ...updatedFields[fieldIndex] };
      if (!fieldToUpdate.parent_record_creation_config) {
        fieldToUpdate.parent_record_creation_config = {
          enabled_fields: [],
          required_fields: [],
          field_labels_override: {},
          field_placeholders_override: {}
        };
      }
      // Special handling for labels/placeholders if they are cleared (empty string)
      if (configPropertyName === 'field_labels_override' || configPropertyName === 'field_placeholders_override') {
        fieldToUpdate.parent_record_creation_config[configPropertyName] = configValue;
      } else {
        fieldToUpdate.parent_record_creation_config[configPropertyName] = configValue;
      }
      updatedFields[fieldIndex] = fieldToUpdate;
      return updatedFields;
    });
  };

  const removeSchemaField = (index) => {
    setSchemaFields(prev => prev.filter((_, i) => i !== index));
  };
  */

  const handleViewConfigChange = (path, value) => {
    setCurrentType(prev => {
      const newViewConfig = { ...prev.view_config };
      let currentLevel = newViewConfig;
      const keys = path.split('.');
      keys.forEach((key, index) => {
        if (index === keys.length - 1) {
          currentLevel[key] = value;
        } else {
          if (!currentLevel[key]) {
            // Check if next key is a number (array index) or string (object key)
            const nextKeyIsNumber = !isNaN(parseInt(keys[index+1], 10));
            currentLevel[key] = nextKeyIsNumber ? [] : {};
          }
          currentLevel = currentLevel[key];
        }
      });
      return { ...prev, view_config: newViewConfig };
    });
  };
  
  const addViewConfigListItem = (listName) => {
    setCurrentType(prev => {
      const newList = Array.isArray(prev.view_config[listName]) ? [...prev.view_config[listName]] : [];
      let newItem = {};
      if (listName === 'filters') {
        newItem = { id: `filter_${Date.now()}`, field_name: '', label: '', filter_type: 'search', options: [] };
      } else if (listName === 'data_cubes') {
        newItem = { id: `cube_${Date.now()}`, title: '', cube_type: 'count', field_name: '', icon: 'BarChart3', color: 'blue', filters: {}, display_format: '' };
      } else if (listName === 'table_columns') {
        // Need to ensure field_name is unique if used as key, but it's okay to start empty.
        // It's better to ensure field_name is picked by user and then use it as a key.
        newItem = { field_name: '', label: '', width: '', sortable: true, visible: true, id: `col_${Date.now()}` }; // Added id for better DND handling
      }
      newList.push(newItem);
      return { ...prev, view_config: { ...prev.view_config, [listName]: newList } };
    });
  };

  const updateViewConfigListItem = (listName, index, property, value) => {
    setCurrentType(prev => {
      const newList = [...prev.view_config[listName]];
      newList[index] = { ...newList[index], [property]: value };
      return { ...prev, view_config: { ...prev.view_config, [listName]: newList } };
    });
  };
  
  const removeViewConfigListItem = (listName, index) => {
    setCurrentType(prev => {
      const newList = prev.view_config[listName].filter((_, i) => i !== index);
      return { ...prev, view_config: { ...prev.view_config, [listName]: newList } };
    });
  };

  const handleTableColumnDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(currentType.view_config.table_columns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    handleViewConfigChange('table_columns', items);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentType.name.trim() || !currentType.slug.trim()) {
        alert("שם וכינוי (slug) הם שדות חובה.");
        return;
    }

    // Validate spatial config if enabled
    if (currentType.spatial_config.is_spatial) {
      if (!currentType.spatial_config.map_icon) {
        alert("בעת הפעלת תצוגה מרחבית, חובה לבחור אייקון למפה.");
        return;
      }
      if (!currentType.spatial_config.map_color || !/^#[0-9A-F]{6}$/i.test(currentType.spatial_config.map_color)) {
        alert("בעת הפעלת תצוגה מרחבית, חובה לציין צבע תקין (HEX format).");
        return;
      }
    }

    const properties = {};
    const requiredFields = [];
    let schemaValid = true;

    // Validate schema fields and build properties
    schemaFields.forEach(field => {
      if (!field.name || !field.name.trim() || !field.type || !field.type.trim()) { // Added check for empty field.name
        alert("נא למלא שם (שאינו ריק) וסוג לכל שדה סכמה.");
        schemaValid = false;
        return;
      }
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.name)) {
          alert(`שם השדה "${field.name}" אינו תקין. השתמש באותיות אנגליות, מספרים וקווים תחתונים, והתחל באות או קו תחתון.`);
          schemaValid = false;
          return;
      }
      if (properties[field.name]) {
          alert(`שם השדה "${field.name}" כבר קיים בסכמה. אנא בחר שם ייחודי.`);
          schemaValid = false;
          return;
      }

      const propertyDef = { type: field.type, description: field.description };

      // Add enum options if type is enum
      if (field.type === 'enum') {
        if (!Array.isArray(field.enum) || field.enum.length === 0) {
          alert(`שדה "${field.name}" מסוג 'בחירה מתוך אופציות' חייב להכיל לפחות אפשרות אחת.`);
          schemaValid = false;
          return;
        }
        // Ensure enum options are not empty strings
        if (field.enum.some(opt => typeof opt !== 'string' || opt.trim() === '')) {
          alert(`בשדה "${field.name}", כל האופציות לבחירה חייבות להיות טקסט שאינו ריק.`);
          schemaValid = false;
          return;
        }
        propertyDef.enum = field.enum;
      }

      // Add format if type is string
      if (field.type === 'string' && field.format) {
        propertyDef.format = field.format;
      }

      // Add parent reference specific fields
      if (field.type === 'parent_record_reference') {
        if (!field.parent_data_type_slug) {
          alert(`שדה "${field.name}" מסוג 'קישור לרשומת אב' חייב להיות מקושר לסוג דאטה.`);
          schemaValid = false;
          return;
        }
        propertyDef.parent_data_type_slug = field.parent_data_type_slug;
        propertyDef.parent_display_format = field.parent_display_format || '';
        const configToSave = { ...(field.parent_record_creation_config || {}) };
        delete configToSave.user_interacted_with_enabled_fields; // Do not save this internal flag
        propertyDef.parent_record_creation_config = configToSave;
      }

      properties[field.name] = propertyDef;
      if (field.required) {
        requiredFields.push(field.name);
      }
    });

    if (!schemaValid) { // schemaValid might be false due to schemaFields.forEach
        return;
    }
    
    // Validate view_config filters options
    if (currentType.view_config && Array.isArray(currentType.view_config.filters)) {
      for (const filter of currentType.view_config.filters) {
        if (filter.filter_type === 'select' && Array.isArray(filter.options)) {
          if (filter.options.some(opt => !opt.value || opt.value.trim() === '')) {
            alert(`בפילטר "${filter.label || filter.field_name}", כל ערכי האופציות (value) חייבים להיות טקסט שאינו ריק.`);
            return;
          }
        }
      }
    }


    // Validate field references
    // For schema fields, use the `name` property as the ID in the map for easier lookup by generated properties
    const schemaFieldMapByName = new Map(schemaFields.map(field => [field.name, field]));


    if (currentType.main_location_field_id) {
        const locField = schemaFieldMapByName.get(currentType.main_location_field_id);
        if (!locField) {
            alert("שדה המיקום הראשי שנבחר אינו קיים בסכמה. אנא בחר שדה קיים או הסר את הבחירה.");
            return;
        }
        if (locField.type !== 'location') {
            alert("השדה שנבחר כשדה מיקום ראשי חייב להיות מסוג 'מיקום'.");
            return;
        }
    }

    if (currentType.display_name_field_id) {
        const displayNameField = schemaFieldMapByName.get(currentType.display_name_field_id);
        if (!displayNameField) {
            alert("שדה שם התצוגה שנבחר אינו קיים בסכמה. אנא בחר שדה קיים או הסר את הבחירה.");
            return;
        }
        if (displayNameField.type !== 'string' && displayNameField.type !== 'enum') { // Allow enum as display name for consistency
            alert("השדה שנבחר כשדה שם תצוגה חייב להיות מסוג 'טקסט' או 'בחירה מתוך אופציות'.");
            return;
        }
    }

    const finalTypeData = {
      ...currentType,
      schema_definition: {
        type: 'object',
        properties,
        required: requiredFields,
      },
      main_location_field_id: currentType.main_location_field_id,
      display_name_field_id: currentType.display_name_field_id,
      spatial_config: currentType.spatial_config.is_spatial ? currentType.spatial_config : null,
      view_config: currentType.view_config // Ensure view_config is saved
    };

    setLoading(true);
    setError(null);
    try {
      if (editingType) {
        await CustomDataType.update(editingType.id, finalTypeData);
      } else {
        await CustomDataType.create(finalTypeData);
      }
      resetForm();
      loadDataTypes();
    } catch (err) {
      console.error("Error saving data type:", err);
      setError("שגיאה בשמירת סוג דאטה: " + err.message);
    }
    setLoading(false);
  };

  if (error) {
    return <div className="clay-card bg-red-50 p-4 text-red-700 text-center">{error} <button onClick={loadDataTypes} className="ml-2 text-sm underline">נסה שוב</button></div>;
  }

  const renderIcon = (iconNameString) => {
    const IconComponent = iconComponents[iconNameString] || ListChecks;
    return <IconComponent className="w-5 h-5 text-purple-500" />;
  };

  // Calculate field options for selects
  const locationFieldsInCurrentSchema = useMemo(() => {
    if (!currentType.schema_definition?.properties) return [];
    return Object.entries(currentType.schema_definition.properties)
      .filter(([_, fieldDef]) => fieldDef.type === 'location')
      .map(([fieldName, fieldDef]) => ({
        value: fieldName,
        label: fieldDef.description || fieldName
      }));
  }, [currentType.schema_definition]);

  const stringFieldsInCurrentSchema = useMemo(() => {
    if (!currentType.schema_definition?.properties) return [];
    return Object.entries(currentType.schema_definition.properties)
      .filter(([_, fieldDef]) => 
        fieldDef.type === 'string' && 
        !fieldDef.format && 
        !fieldDef.enum
      )
      .map(([fieldName, fieldDef]) => ({
        value: fieldName,
        label: fieldDef.description || fieldName
      }));
  }, [currentType.schema_definition]);

  const availableParentDataTypes = dataTypes.filter(dt => dt.slug !== currentType.slug); // Still needed for field-level parent_record_reference

  const currentSchemaFieldOptions = schemaFields
    .filter(sf => sf.name && sf.name.trim() !== '') // Ensure field name is not empty before creating an option
    .map(sf => ({ value: sf.name, label: `${sf.description || sf.name} (${sf.type})`, type: sf.type }));

  const currentStringSchemaFieldOptions = schemaFields
    .filter(sf => (sf.type === 'string' || sf.type === 'enum') && sf.name && sf.name.trim() !== '') // Ensure field name is not empty
    .map(sf => ({ value: sf.name, label: `${sf.description || sf.name}` }));


  return (
    <div className="container mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <Database className="w-8 h-8 ml-3 text-purple-500" />
          ניהול סוגי דאטה ארגוני
        </h1>
        <p className="text-gray-600">הגדר ונהל סוגי מידע מותאמים אישית עבור הארגון שלך.</p>
      </div>

      {!showForm && (
        <Button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="clay-button flex items-center gap-2 bg-purple-100 text-purple-700 font-medium mb-6"
        >
          <Plus className="w-4 h-4" />
          סוג דאטה חדש
        </Button>
      )}

      {showForm ? (
        <div className="clay-card bg-white p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-purple-700">
              {editingType ? 'עריכת' : 'יצירת'} סוג דאטה
            </h2>
            <Button onClick={resetForm} className="clay-button p-2"><X className="w-5 h-5"/></Button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <Accordion type="single" collapsible defaultValue="general-settings" className="w-full">
              <AccordionItem value="general-settings">
                <AccordionTrigger className="text-xl font-medium text-purple-700 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-purple-600" />
                    הגדרות כלליות ותצוגה מרחבית
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <DataTypeGeneralSettingsForm
                    currentType={currentType}
                    handleInputChange={handleInputChange}
                    handleSelectChange={handleSelectChange}
                    handleIconChange={handleIconChange}
                    handleSpatialConfigChange={handleSpatialConfigChange}
                    availableIcons={availableIcons}
                    availableMapIcons={availableMapIcons}
                    iconComponents={iconComponents}
                    locationFieldsInCurrentSchema={locationFieldsInCurrentSchema}
                    stringFieldsInCurrentSchema={stringFieldsInCurrentSchema}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="schema-fields">
                <AccordionTrigger className="text-xl font-medium text-purple-700 hover:no-underline">
                   <div className="flex items-center gap-2">
                    <ListChecks className="w-5 h-5 text-purple-600" />
                    הגדרת שדות (סכמה)
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <DataTypeSchemaFieldsForm
                    formData={{ fields: schemaFields }}
                    onChange={(data) => setSchemaFields(data.fields)}
                    customDataTypes={availableParentDataTypes}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="view-config">
                <AccordionTrigger className="text-xl font-medium text-purple-700 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-purple-600" /> {/* Consider a more specific icon like LayoutGrid or Table */}
                    הגדרות תצוגת רשומות (חיפוש, פילטרים, קוביות נתונים, טבלה)
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <DataTypeViewConfigForm
                    currentType={currentType}
                    handleViewConfigChange={handleViewConfigChange}
                    addViewConfigListItem={addViewConfigListItem}
                    updateViewConfigListItem={updateViewConfigListItem}
                    removeViewConfigListItem={removeViewConfigListItem}
                    handleTableColumnDragEnd={handleTableColumnDragEnd}
                    currentSchemaFieldOptions={currentSchemaFieldOptions}
                    currentStringSchemaFieldOptions={currentStringSchemaFieldOptions}
                    availableIcons={availableIcons} // Pass availableIcons for data cube icon selection
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <div className="flex justify-end gap-3 pt-6 border-t">
                <Button type="button" onClick={resetForm} className="clay-button bg-gray-100">ביטול</Button>
                <Button type="submit" className="clay-button bg-purple-100 text-purple-700 flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {editingType ? 'עדכן' : 'צור'} סוג דאטה
                </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          {loading ? (
            <div className="clay-card bg-white p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">טוען סוגי דאטה...</p>
            </div>
          ) : dataTypes.length === 0 ? (
            <div className="clay-card bg-white p-8 text-center">
              <Database className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">אין סוגי דאטה</h3>
              <p className="text-gray-500">לחץ על "סוג דאטה חדש" כדי להתחיל.</p>
            </div>
          ) : (
            dataTypes.map(dataType => (
              <div key={dataType.id} className="clay-card bg-white">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        {renderIcon(dataType.icon)}
                        <h3 className="text-xl font-semibold">{dataType.name}</h3>
                        <span className="text-sm text-gray-500">({dataType.slug})</span>
                        {dataType.spatial_config?.is_spatial && (
                          <Badge className="bg-green-100 text-green-800 text-xs flex items-center gap-1">
                            <MapPin className="w-3 h-3 ml-1" /> מרחבי
                          </Badge>
                        )}
                      </div>
                      {dataType.description && (<p className="text-gray-600 mb-4">{dataType.description}</p>)}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleEdit(dataType)} className="clay-button p-2 bg-blue-50 text-blue-600"><Edit className="w-4 h-4" /></Button>
                      <Button onClick={() => handleDelete(dataType.id)} className="clay-button p-2 bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {dataType.main_location_field_id && dataType.schema_definition.properties[dataType.main_location_field_id] && (
                        <p className="text-gray-600"><strong className="font-medium text-gray-700">שדה מיקום ראשי:</strong> {dataType.schema_definition.properties[dataType.main_location_field_id].description || dataType.main_location_field_id}</p>
                    )}
                    {dataType.display_name_field_id && dataType.schema_definition.properties[dataType.display_name_field_id] && (
                        <p className="text-gray-600"><strong className="font-medium text-gray-700">שדה שם תצוגה:</strong> {dataType.schema_definition.properties[dataType.display_name_field_id].description || dataType.display_name_field_id}</p>
                    )}
                    {dataType.spatial_config?.is_spatial && (
                        <p className="text-gray-600"><strong className="font-medium text-green-700">תצוגה מרחבית:</strong> {dataType.spatial_config.location_type} ({dataType.spatial_config.map_icon})</p>
                    )}
                  </div>
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">שדות מוגדרים:</h4>
                    {Object.keys(dataType.schema_definition.properties || {}).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {Object.entries(dataType.schema_definition.properties)
                          .filter(([fieldName]) => fieldName && fieldName.trim() !== '') // Ensure fieldName is not empty
                          .map(([fieldName, schema]) => (
                            <div key={fieldName} className="bg-purple-50 rounded-lg p-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="font-medium">{fieldName}</span>
                                <div className="flex gap-1">
                                  {dataType.schema_definition.required?.includes(fieldName) && (
                                    <Badge className="bg-red-100 text-red-800 text-xs">חובה</Badge>
                                  )}
                                  {schema.type === 'parent_record_reference' && (
                                    <Badge className="bg-blue-100 text-blue-800 text-xs">קישור</Badge>
                                  )}
                                  {schema.type === 'enum' && (
                                    <Badge className="bg-orange-100 text-orange-800 text-xs">בחירה</Badge>
                                  )}
                                </div>
                            </div>
                            <div className="text-gray-600 text-xs mt-1">
                                <span>{schema.description || fieldName}</span>
                                <span className="text-purple-600 mr-1">({schema.type})</span>
                                {schema.format && <span className="text-gray-500 mr-1"> ({schema.format})</span>}
                                {schema.type === 'parent_record_reference' && schema.parent_data_type_slug && (
                                  <div className="text-blue-600 mt-1">→ {schema.parent_data_type_slug}</div>
                                )}
                                {schema.type === 'enum' && Array.isArray(schema.enum) && schema.enum.length > 0 && (
                                  <div className="text-gray-500 mt-1">אפשרויות: {schema.enum.join(', ')}</div>
                                )}
                            </div>
                            </div>
                        ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500">לא הוגדרו שדות סכמה עבור סוג דאטה זה.</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
