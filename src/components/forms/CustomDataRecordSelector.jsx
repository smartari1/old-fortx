
import React, { useState, useEffect, useCallback } from 'react';
import { CustomDataRecord } from '@/api/entities';
import { CustomDataType } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Check, X, Loader2 } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Enhanced helper to get display name for a custom data record
const getCustomDataRecordDisplay = (record, customDataType, displayFormat = null) => {
  if (!record || !record.data) return `רשומה ${record.id?.substring(0, 6) || 'לא ידועה'}`;

  // If we have a specific display format from the field definition, use it first
  if (displayFormat && displayFormat.trim()) {
    try {
      let formattedDisplay = displayFormat;

      // Find all placeholders like {field_name}
      const matches = displayFormat.match(/\{[^}]+\}/g); // This returns an array of matched strings like ["{name}", "{age}"]

      if (matches) {
        // Use a Set to process each unique placeholder only once,
        // and avoid issues if the same placeholder appears multiple times.
        const uniquePlaceholders = [...new Set(matches)];

        for (const fullPlaceholder of uniquePlaceholders) {
          const fieldName = fullPlaceholder.substring(1, fullPlaceholder.length - 1); // Extract field name from "{field_name}"

          let fieldValue = '';
          if (record.data[fieldName] !== undefined && record.data[fieldName] !== null) {
            fieldValue = String(record.data[fieldName]);
          }

          // Replace all occurrences of this specific placeholder in the formattedDisplay string
          // Escape special regex characters in the placeholder itself for safe replacement
          const escapedPlaceholder = fullPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedPlaceholder, 'g');
          formattedDisplay = formattedDisplay.replace(regex, fieldValue);
        }
      }

      // If after replacement we have meaningful content, AND the formatted string is different from the original displayFormat
      // (implying some placeholders were processed and changed the string, not just static text that didn't change)
      if (formattedDisplay.trim() && formattedDisplay !== displayFormat) {
        return formattedDisplay.trim();
      }
    } catch (error) {
      console.warn('Error processing display format:', error);
    }
  }

  // Fallback to using the data type's display_name_field_id
  if (customDataType?.display_name_field_id && record.data[customDataType.display_name_field_id]) {
    return String(record.data[customDataType.display_name_field_id]);
  }

  // Fallback to common field names
  const commonFields = ['name', 'title', 'identifier', 'label', 'display_name'];
  for (const field of commonFields) {
    if (record.data[field]) return String(record.data[field]);
  }

  // Last resort: use the first string value
  const firstStringValue = Object.values(record.data).find(v => typeof v === 'string' && v.trim());
  return firstStringValue || `רשומה ${record.id?.substring(0, 6) || 'לא ידועה'}`;
};

export default function CustomDataRecordSelector({
  dataTypeSlug,
  selectedRecordId,
  onSelectionChange, // (recordId: string | null) => void
  placeholder = 'בחר רשומה...',
  required = false,
  disabled = false,
  formFieldDefinition = null, // Optional: definition of the form field calling this, for creationConfig
  incidentId = null, // Optional: for context if creating new records linked to an incident
  allowCreation = true // Default to true, can be overridden
}) {
  const [options, setOptions] = useState([]); // Stores { id, display, record }
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRecordData, setNewRecordData] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState(null);
  const [dataType, setDataType] = useState(null); // The specific CustomDataType for this selector
  const [allDataTypes, setAllDataTypes] = useState([]);


  // Access custom_data_fields_config safely
  const currentCreationConfig = formFieldDefinition?.custom_data_fields_config || {
    enabled_fields: null,
    required_fields: [],
    field_labels_override: {},
    field_placeholders_override: {}
  };

  // Get the display format from the field definition
  const displayFormat = formFieldDefinition?.parent_display_format ||
                       formFieldDefinition?.display_format ||
                       null;

  // Helper to get display value for an option
  const getDisplayValue = useCallback((record) => {
    return getCustomDataRecordDisplay(record, dataType, displayFormat);
  }, [dataType, displayFormat]);

  // Load the CustomDataType definition and all data types
  useEffect(() => {
    if (!dataTypeSlug) {
      console.warn('CustomDataRecordSelector: missing dataTypeSlug in props.');
      setIsLoadingOptions(false);
      setDataType(null);
      setOptions([]);
      return;
    }

    let isActive = true;
    setIsLoadingOptions(true);
    setCreationError(null);

    const fetchAll = async () => {
        try {
            const [allDTs, currentDTDefinitions] = await Promise.all([
                CustomDataType.list(),
                CustomDataType.filter({ slug: dataTypeSlug })
            ]);

            if (!isActive) return;

            const currentDTDefinition = currentDTDefinitions[0];

            setAllDataTypes(allDTs || []);

            if (!currentDTDefinition) {
                console.error(`CustomDataType with slug "${dataTypeSlug}" not found`);
                setCreationError(`שגיאה: לא נמצא סוג דאטה עם המזהה "${dataTypeSlug}"`);
                setDataType(null);
                setOptions([]);
                setIsLoadingOptions(false);
                return;
            }
            setDataType(currentDTDefinition);
        } catch (err) {
            if (!isActive) return;
            console.error('Error fetching initial data for CustomDataRecordSelector:', err);
            setCreationError('שגיאה בטעינת הגדרות: ' + (err.message || 'נסה שוב'));
            setDataType(null);
            setOptions([]);
        } finally {
            if (isActive) setIsLoadingOptions(false);
        }
    };

    fetchAll();

    return () => { isActive = false; };

  }, [dataTypeSlug]);

  // Load records based on dataType and searchTerm
  const loadRecords = useCallback(async () => {
    if (!dataType) { // Ensure dataType is loaded before trying to fetch records
      setOptions([]);
      setIsLoadingOptions(false);
      return;
    }
    setIsLoadingOptions(true);
    setCreationError(null); // Clear previous errors
    try {
      const allRecords = await CustomDataRecord.list();
      const records = allRecords.filter(record => record.custom_data_type_slug === dataTypeSlug);

      const formattedOptions = records.map(record => ({
        id: record.id,
        display: getDisplayValue(record), // Use the memoized helper
        record: record // Keep the full record for later use if needed
      }));

      const filtered = formattedOptions.filter(option => {
        const searchLower = searchTerm.toLowerCase();
        // Ensure option.display and option.record.data are defined before calling methods on them
        const displayMatch = option.display && String(option.display).toLowerCase().includes(searchLower);
        const dataMatch = option.record && option.record.data && Object.values(option.record.data).some(value =>
          typeof value === 'string' && value.toLowerCase().includes(searchLower)
        );
        return displayMatch || dataMatch;
      });
      setOptions(filtered);
    } catch (err) {
      console.error('Error fetching custom data records:', err);
      setCreationError('שגיאה בטעינת רשומות: ' + (err.message || 'נסה שוב'));
    } finally {
      setIsLoadingOptions(false);
    }
  }, [dataType, dataTypeSlug, searchTerm, getDisplayValue]); // Trigger loadRecords when dataType is set or loadRecords changes

  // Effect to trigger loading records
  useEffect(() => {
    if (dataType) { // Only load records if dataType definition is available
        loadRecords();
    }
  }, [dataType, loadRecords]); // Trigger loadRecords when dataType is set or loadRecords changes

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    // loadRecords will be triggered by searchTerm change due to its dependency in useCallback for loadRecords
  };

  // Handle selection from the dropdown
  const handleSelect = (id) => {
    // Convert special clear value to null
    const actualId = id === '__CLEAR__' ? null : id;
    onSelectionChange(actualId);
  };

  // Open the create new record modal
  const openCreateModal = useCallback(() => {
    if (!dataType || !dataType.schema_definition?.properties) {
      setCreationError('שגיאה: הגדרת סוג הדאטה אינה זמינה ליצירה.');
      return;
    }
    const emptyData = {};
    Object.keys(dataType.schema_definition.properties).forEach(fieldId => {
      const fieldDef = dataType.schema_definition.properties[fieldId];
      if (fieldDef.type === 'boolean') {
        emptyData[fieldId] = false;
      } else if (fieldDef.type === 'location') {
        emptyData[fieldId] = { latitude: null, longitude: null };
      } else if (fieldDef.type === 'string' && fieldDef.format === 'custom-data-record') {
        emptyData[fieldId] = null; // For linked records, default to null
      } else if (fieldDef.type === 'parent_record_reference') {
        emptyData[fieldId] = null; // For parent record references, default to null
      } else if (fieldDef.type === 'enum') {
        emptyData[fieldId] = fieldDef.enum && fieldDef.enum.length > 0 ? fieldDef.enum[0] : ''; // Default to first enum option or empty string
      }
      else {
        emptyData[fieldId] = '';
      }
    });
    setNewRecordData(emptyData);
    setCreationError(null); // Clear previous creation errors
    setShowCreateModal(true);
  }, [dataType]);

  // Handle input changes for new record data
  const handleNewRecordInputChange = (fieldName, value) => {
    // console.log('handleNewRecordInputChange called:', fieldName, value); // Debug log
    setNewRecordData(prev => {
      const updated = { ...prev, [fieldName]: value };
      // console.log('Updated newRecordData:', updated); // Debug log
      return updated;
    });
  };

  // Render field based on type for the create modal
  const renderCreationFormField = useCallback((fieldName, fieldSchemaOfParent) => {
    const fieldValue = (newRecordData && typeof newRecordData === 'object' && newRecordData[fieldName] !== undefined)
                         ? newRecordData[fieldName]
                         : (fieldSchemaOfParent.type === 'boolean' ? false : '');

    const label = currentCreationConfig.field_labels_override?.[fieldName] || fieldSchemaOfParent.description || fieldName;
    const placeholderToUse = currentCreationConfig.field_placeholders_override?.[fieldName] || `הכנס ${label}...`;
    const requiredField = (dataType?.schema_definition?.required?.includes(fieldName) || currentCreationConfig.required_fields?.includes(fieldName)) || false;

    // console.log('Rendering field:', fieldName, 'type:', fieldSchemaOfParent.type, 'value:', fieldValue); // Debug log

    switch (fieldSchemaOfParent.type) {
      case 'string':
        if (fieldSchemaOfParent.format === 'textarea' || fieldName.toLowerCase().includes('description')) {
          return (
            <Textarea
              key={fieldName}
              value={fieldValue || ''}
              onChange={(e) => handleNewRecordInputChange(fieldName, e.target.value)}
              placeholder={placeholderToUse}
              className="clay-input"
              required={requiredField}
              disabled={isCreating}
            />
          );
        }
        if (fieldSchemaOfParent.format === 'custom-data-record') {
          const linkedDataTypeSlugForField = fieldSchemaOfParent['x-linked-data-type-slug'];
          if (!linkedDataTypeSlugForField) {
            console.warn(`Schema for field ${fieldName} of format 'custom-data-record' has no x-linked-data-type-slug.`);
            return <Input key={fieldName} type="text" readOnly value="שגיאה: חסר הגדרת סוג מידע מקושר" className="clay-input bg-red-100" />;
          }

          const nestedDefinition = {
            type: 'custom_data_record_selector', // Conceptual type
            linked_data_type_slug: linkedDataTypeSlugForField,
            // The config for *creating* the linked record is on the field itself in its parent's schema
            custom_data_fields_config: fieldSchemaOfParent.parent_record_creation_config || {
                enabled_fields: null,
                required_fields: [],
                field_labels_override: {},
                field_placeholders_override: {}
            },
            // Pass through display format for the nested selector
            parent_display_format: fieldSchemaOfParent.parent_display_format || fieldSchemaOfParent.display_format
          };

          return (
            <div key={fieldName} className="space-y-2">
              <CustomDataRecordSelector
                dataTypeSlug={linkedDataTypeSlugForField}
                selectedRecordId={fieldValue}
                onSelectionChange={(selectedNestedRecordId) => { // Updated to receive ID directly
                  // console.log('Nested custom-data-record selector onSelectionChange called:', fieldName, selectedNestedRecordId); // Debug log
                  handleNewRecordInputChange(fieldName, selectedNestedRecordId);
                }}
                placeholder={placeholderToUse}
                required={requiredField}
                disabled={isCreating}
                formFieldDefinition={nestedDefinition}
                incidentId={incidentId}
                allowCreation={true}
              />
            </div>
          );
        }
        return (
           <Input
            key={fieldName}
            type={fieldSchemaOfParent.format === 'email' ? 'email' :
                  fieldSchemaOfParent.format === 'url' ? 'url' :
                  fieldSchemaOfParent.format === 'phone' ? 'tel' : 'text'}
            value={fieldValue || ''}
            onChange={(e) => handleNewRecordInputChange(fieldName, e.target.value)}
            placeholder={placeholderToUse}
            className="clay-input"
            required={requiredField}
            disabled={isCreating}
          />
        );

      case 'enum':
        // Defensive check: ensure enumOptions is always an array and options are valid strings.
        const enumOptions = (Array.isArray(fieldSchemaOfParent.enum) ? fieldSchemaOfParent.enum : [])
                              .filter(opt => typeof opt === 'string' && opt.trim() !== "");
        
        return (
          <Select
            key={fieldName}
            value={fieldValue || ''}
            onValueChange={(value) => handleNewRecordInputChange(fieldName, value)}
            disabled={isCreating}
          >
            <SelectTrigger className="clay-input">
              <SelectValue placeholder={placeholderToUse} />
            </SelectTrigger>
            <SelectContent>
              {enumOptions.map((option, index) => (
                <SelectItem key={`${option}-${index}`} value={option}> {/* Ensure key is unique, e.g. if options are not unique */}
                  {option}
                </SelectItem>
              ))}
              {enumOptions.length === 0 && (
                <div className="p-2 text-sm text-gray-500">לא הוגדרו אפשרויות תקינות.</div>
              )}
            </SelectContent>
          </Select>
        );

      case 'number':
      case 'integer':
        return (
          <Input
            key={fieldName}
            type="number"
            value={fieldValue === null || fieldValue === undefined ? '' : fieldValue} // Ensure empty string for undefined/null
            onChange={(e) => {
              const numValue = e.target.value === '' ? null : Number(e.target.value);
              handleNewRecordInputChange(fieldName, numValue);
            }}
            placeholder={placeholderToUse}
            className="clay-input"
            required={requiredField}
            disabled={isCreating}
          />
        );

      case 'boolean':
        return (
          <div key={fieldName} className="flex items-center space-x-2 space-x-reverse pt-2">
            <input
              id={`bool-${fieldName}-${dataTypeSlug}`} // Added dataTypeSlug for more unique ID
              type="checkbox"
              checked={!!fieldValue}
              onChange={(e) => handleNewRecordInputChange(fieldName, e.target.checked)}
              className="form-checkbox h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              disabled={isCreating}
            />
            <Label htmlFor={`bool-${fieldName}-${dataTypeSlug}`}>{label}</Label>
          </div>
        );

      case 'date':
        return (
          <Input
            key={fieldName}
            type="date"
            value={fieldValue || ''}
            onChange={(e) => handleNewRecordInputChange(fieldName, e.target.value)}
            className="clay-input"
            required={requiredField}
            disabled={isCreating}
          />
        );

      case 'time':
        return (
          <Input
            key={fieldName}
            type="time"
            value={fieldValue || ''}
            onChange={(e) => handleNewRecordInputChange(fieldName, e.target.value)}
            className="clay-input"
            required={requiredField}
            disabled={isCreating}
          />
        );

      case 'location':
        // Ensure fieldValue is an object, even if null/undefined initially
        const currentLatLng = fieldValue || { latitude: null, longitude: null };
        return (
          <div key={fieldName} className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              step="any"
              placeholder="קו רוחב"
              value={currentLatLng.latitude === null || currentLatLng.latitude === undefined ? '' : currentLatLng.latitude}
              onChange={(e) => handleNewRecordInputChange(fieldName, { ...currentLatLng, latitude: parseFloat(e.target.value) || null })}
              className="clay-input"
              required={requiredField}
              disabled={isCreating}
            />
            <Input
              type="number"
              step="any"
              placeholder="קו אורך"
              value={currentLatLng.longitude === null || currentLatLng.longitude === undefined ? '' : currentLatLng.longitude}
              onChange={(e) => handleNewRecordInputChange(fieldName, { ...currentLatLng, longitude: parseFloat(e.target.value) || null })}
              className="clay-input"
              required={requiredField}
              disabled={isCreating}
            />
          </div>
        );

      case 'parent_record_reference':
        const linkedDataTypeSlug = fieldSchemaOfParent.parent_data_type_slug;
        if (!linkedDataTypeSlug) {
          console.warn(`Schema for field ${fieldName} of type 'parent_record_reference' has no parent_data_type_slug.`);
          return <p key={fieldName} className="text-red-500 text-sm">שגיאה: לא הוגדר סוג דאטה אב לשדה {fieldName}.</p>;
        }

        // Create the nested formFieldDefinition for the linked data type
        const nestedDefinitionForParentRef = {
          type: 'custom_data_record_selector', // Conceptual type
          linked_data_type_slug: linkedDataTypeSlug,
          custom_data_fields_config: fieldSchemaOfParent.parent_record_creation_config || {
              enabled_fields: null,
              required_fields: [],
              field_labels_override: {},
              field_placeholders_override: {}
          },
          // Pass through display format for the nested selector
          parent_display_format: fieldSchemaOfParent.parent_display_format || fieldSchemaOfParent.display_format
        };

        // console.log('Creating nested selector for field:', fieldName, 'linkedDataTypeSlug:', linkedDataTypeSlug, 'currentValue:', fieldValue); // Debug log

        return (
          <div key={fieldName} className="space-y-2">
            <CustomDataRecordSelector
              dataTypeSlug={linkedDataTypeSlug}
              selectedRecordId={fieldValue} // This should be the ID of the selected parent record
              onSelectionChange={(selectedRecordId) => {
                // console.log('Nested parent_record_reference selector onSelectionChange called:', fieldName, selectedRecordId); // Debug log
                handleNewRecordInputChange(fieldName, selectedRecordId);
              }}
              placeholder={placeholderToUse}
              required={requiredField}
              disabled={isCreating}
              formFieldDefinition={nestedDefinitionForParentRef} // Pass the parent field definition
              incidentId={incidentId}
              allowCreation={!!fieldSchemaOfParent.parent_record_creation_config} // Allow creation based on config
            />
          </div>
        );

      default:
        return (
          <Input
            key={fieldName}
            type="text"
            value={fieldValue || ''}
            onChange={(e) => handleNewRecordInputChange(fieldName, e.target.value)}
            placeholder={placeholderToUse}
            className="clay-input"
            disabled={isCreating}
            required={requiredField}
          />
        );
    }
  }, [newRecordData, dataType, isCreating, incidentId, handleNewRecordInputChange, currentCreationConfig, dataTypeSlug]);


  const handleCreateRecord = async () => {
    if (!dataType) {
        setCreationError('סוג הדאטה אינו זמין ליצירת רשומה.');
        return;
    }

    setIsCreating(true);
    setCreationError(null);

    try {
      const dataToSubmit = { ...newRecordData };
      const schemaProperties = dataType.schema_definition?.properties || {};

      for (const [fieldName, fieldSchema] of Object.entries(schemaProperties)) {
        // Only validate fields that are enabled for creation
        if (currentCreationConfig.enabled_fields && currentCreationConfig.enabled_fields.length > 0 && !currentCreationConfig.enabled_fields.includes(fieldName)) {
            continue; // Skip fields not enabled for creation
        }

        const value = dataToSubmit[fieldName];
        const isRequiredField = (dataType.schema_definition?.required?.includes(fieldName) || currentCreationConfig.required_fields?.includes(fieldName)) || false;

        if (isRequiredField) {
          const fieldLabel = currentCreationConfig.field_labels_override?.[fieldName] || fieldSchema.description || fieldName;
          if (fieldSchema.type === 'boolean') {
              // Boolean fields are always defined as true/false, no specific check needed for required (as it defaults to false)
          } else if (fieldSchema.type === 'location') {
              if (!value || (value.latitude === null && value.longitude === null)) {
                  throw new Error(`שדה מיקום "${fieldLabel}" הוא חובה.`);
              }
          } else { // string, number, integer, date, time, custom-data-record, parent_record_reference etc.
              if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
                  throw new Error(`שדה "${fieldLabel}" הוא חובה.`);
              }
          }
        }

        // Parse numbers before submitting
        if ((fieldSchema.type === 'number' || fieldSchema.type === 'integer') && value !== undefined && value !== null && value !== '') {
            const numVal = Number(value); // Changed parseFloat to Number
            if (isNaN(numVal)) {
                throw new Error(`ערך לא תקין עבור שדה המספר "${currentCreationConfig.field_labels_override?.[fieldName] || fieldSchema.description || fieldName}"`);
            }
            dataToSubmit[fieldName] = numVal;
        }
      }

      const newRecord = await CustomDataRecord.create({
        custom_data_type_slug: dataTypeSlug,
        data: dataToSubmit // Use the potentially parsed data
      });

      // Update options with the new record AND its display name
      const newOption = {
        id: newRecord.id,
        display: getCustomDataRecordDisplay(newRecord, dataType, displayFormat), // Generate display name for the new record with displayFormat
        record: newRecord
      };

      setOptions(prevOptions => {
        const updatedOptions = [newOption, ...prevOptions.filter(opt => opt.id !== newRecord.id)];
        // If searching, re-filter to ensure it appears if it matches
        if (searchTerm.trim()) {
          return updatedOptions.filter(option => {
            const searchLower = searchTerm.toLowerCase();
            return String(option.display).toLowerCase().includes(searchLower) ||
              Object.values(option.record.data).some(value =>
                typeof value === 'string' && value.toLowerCase().includes(searchLower)
              );
          });
        }
        return updatedOptions;
      });

      onSelectionChange(newRecord.id); // Pass only the ID

      // Reset form and close modal
      setNewRecordData({});
      setShowCreateModal(false);

    } catch (err) {
      console.error('Error creating new record:', err);
      setCreationError(err.message || 'שגיאה ביצירת רשומה חדשה');
    } finally {
      setIsCreating(false);
    }
  };

  // Conditional rendering for initial loading and errors
  if (isLoadingOptions && !dataType) {
    return (
      <div className="flex items-center justify-center p-4 border rounded-md clay-card">
        <Loader2 className="w-4 h-4 animate-spin ml-2" />
        <span className="text-sm text-neutral-600">טוען נתונים...</span>
      </div>
    );
  }

  if (creationError && !dataType) { // Show general error if data type couldn't be loaded
    return (
      <div className="p-4 border rounded-md clay-card bg-red-50 border-red-200">
        <p className="text-red-700 text-sm">{creationError}</p>
      </div>
    );
  }

  if (!dataType) { // If dataType is null due to not found or error, but not actively loading
    return (
      <div className="p-4 border rounded-md clay-card bg-red-50 border-red-200">
        <p className="text-red-700 text-sm">שגיאה: לא ניתן לטעון את סוג הדאטה '{dataTypeSlug}'.</p>
      </div>
    );
  }

  const currentSelectedOption = options.find(o => o.id === selectedRecordId);

  return (
    <div className="space-y-4">
      {/* Existing Record Selection */}
      <div>
        <Label className="text-sm font-medium">
          {formFieldDefinition?.label || dataType?.name || 'טוען...'}
          {required && <span className="text-red-500 mr-1">*</span>}
        </Label>

        <div className="mt-1 space-y-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder={`חפש ב${dataType?.name || 'רשומות'}...`}
              value={searchTerm}
              onChange={handleSearchChange}
              className="clay-input pr-10"
              disabled={isLoadingOptions || !dataType || disabled}
            />
          </div>

          {/* Selection */}
          <Select
            value={selectedRecordId || ''}
            onValueChange={handleSelect}
            disabled={isLoadingOptions || !dataType || disabled}
          >
            <SelectTrigger className="clay-select">
              <SelectValue placeholder={placeholder}>
                {/* Display the name of the selected option if found, otherwise placeholder */}
                {currentSelectedOption ? currentSelectedOption.display : placeholder}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {/* Option to clear selection */}
              {selectedRecordId && (
                <SelectItem value="__CLEAR__" className="text-red-500">
                  <span className="flex items-center"><X className="w-3 h-3 mr-1" /> נקה בחירה</span>
                </SelectItem>
              )}
              {/* Render options */}
              {options.length > 0 ? (
                options.map(option => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.display}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="__NO_RECORDS__" disabled>
                  {isLoadingOptions ? 'טוען רשומות...' : (searchTerm.trim() ? `לא נמצאו רשומות עבור "${searchTerm}"` : 'אין רשומות קיימות')}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Create New Record Button */}
      {allowCreation && (
        <div className="flex justify-center">
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="clay-button bg-green-50 text-green-700 border-green-200"
                onClick={openCreateModal}
                disabled={isLoadingOptions || !dataType || disabled}
              >
                <Plus className="w-4 h-4 ml-2" />
                הוסף {dataType?.name || 'רשומה'} חדש/ה
              </Button>
            </DialogTrigger>
            {showCreateModal && dataType && dataType.schema_definition && ( // Conditional render for DialogContent
              <DialogContent className="max-w-2xl clay-card max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>צור {currentCreationConfig.field_labels_override?.form_title || dataType.name} חדש/ה</DialogTitle>
                  <DialogDescription>
                    {currentCreationConfig.field_placeholders_override?.form_description ||
                      (currentCreationConfig.enabled_fields && currentCreationConfig.enabled_fields.length > 0
                        ? `מלא את השדות הנדרשים לטופס זה (${currentCreationConfig.enabled_fields.length} מתוך ${Object.keys(dataType.schema_definition.properties || {}).length} שדות זמינים):`
                        : 'מלא את הפרטים ליצירת רשומה חדשה:'
                      )
                    }
                  </DialogDescription>
                </DialogHeader>

                {creationError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                    {typeof creationError === 'string' ? creationError : JSON.stringify(creationError)}
                  </div>
                )}

                <ScrollArea className="flex-1 max-h-[60vh] p-1">
                  <div className="space-y-4 py-4 pr-2">
                    {Object.entries(dataType.schema_definition.properties || {})
                      .filter(([fieldId]) => {
                        if (currentCreationConfig.enabled_fields && currentCreationConfig.enabled_fields.length > 0) {
                          return currentCreationConfig.enabled_fields.includes(fieldId);
                        }
                        return true; // If no enabled_fields specified, all are shown
                      })
                      .map(([fieldId, fieldSchema]) => (
                      <div key={fieldId} className="space-y-1">
                        <Label htmlFor={`new-record-${fieldId}`} className="font-medium text-neutral-800">
                          {currentCreationConfig.field_labels_override?.[fieldId] || fieldSchema.description || fieldId}
                          {(dataType.schema_definition.required?.includes(fieldId) || currentCreationConfig.required_fields?.includes(fieldId)) && (
                            <span className="text-red-500 mr-1">*</span>
                          )}
                        </Label>
                        {renderCreationFormField(fieldId, fieldSchema)}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <DialogFooter className="pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewRecordData({});
                      setCreationError(null); // Clear error on cancel
                    }}
                    disabled={isCreating}
                    className="clay-button"
                  >
                    ביטול
                  </Button>
                  <Button onClick={handleCreateRecord} disabled={isCreating} className="clay-button bg-primary-100 text-primary-700">
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        יוצר...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 ml-2" />
                        צור רשומה
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            )}
          </Dialog>
        </div>
      )}

      {/* Selected Record Display */}
      {currentSelectedOption && (
        <Card className="clay-card bg-blue-50 border-blue-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-blue-800">
                נבחר: {currentSelectedOption.display}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelect('__CLEAR__')} // Use special clear value
                className="text-blue-600 hover:text-blue-800"
                disabled={disabled}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Required field indicator */}
      {required && !selectedRecordId && (
        <p className="text-xs text-red-500 text-right mt-1">שדה חובה</p>
      )}
    </div>
  );
}
