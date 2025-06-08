import React, { useState, useEffect, useCallback } from 'react';
import { CustomDataRecord } from '@/api/entities';
import { CustomDataType } from '@/api/entities';
import { Resource } from '@/api/entities';
import { User } from '@/api/entities';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, X, AlertCircle, Info } from 'lucide-react';
import GoogleAddressSelector from '@/components/forms/GoogleAddressSelector';
import EnhancedLocationSelector from '@/components/forms/EnhancedLocationSelector';
import CustomDataRecordSelector from '@/components/forms/CustomDataRecordSelector';
import { format } from 'date-fns';

export default function CustomDataRecordFormDialog({
  open,
  onOpenChange,
  dataType,
  record = null,
  onSuccess,
  onError = () => {},
  additionalContext = {}
}) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [resourceTypes, setResourceTypes] = useState([]);
  const [allDataTypes, setAllDataTypes] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Initialize form data when dialog opens or record changes
  useEffect(() => {
    if (!dataType || !open) return;

    const initializeFormData = async () => {
      setLoading(true);
      try {
        // Load current user
        const user = await User.me();
        setCurrentUser(user);

        // Load all data types for parent record references
        const allTypes = await CustomDataType.list();
        setAllDataTypes(allTypes);

        // Load resource types if needed
        if (dataType.slug === 'resource_item' || hasResourceTypeField()) {
          const fetchedResourceTypes = await Resource.list();
          setResourceTypes(fetchedResourceTypes);
        }

        // Initialize form data
        if (record) {
          // Edit mode - use existing record data
          setFormData(record.data || {});
        } else {
          // Create mode - initialize with defaults
          const initialData = {};
          if (dataType.schema_definition?.properties) {
            Object.entries(dataType.schema_definition.properties).forEach(([fieldName, fieldSchema]) => {
              initialData[fieldName] = getDefaultValue(fieldSchema);
            });
          }
          setFormData(initialData);
        }

        setValidationErrors({});
      } catch (error) {
        console.error('Error initializing form:', error);
        onError(error);
      } finally {
        setLoading(false);
      }
    };

    initializeFormData();
  }, [dataType, record, open]);

  // Helper to check if dataType has resource_type_id field
  const hasResourceTypeField = () => {
    return dataType?.schema_definition?.properties && 
           Object.keys(dataType.schema_definition.properties).some(field => 
             field === 'resource_type_id' || 
             dataType.schema_definition.properties[field].description?.includes('סוג משאב')
           );
  };

  // Get default value for field type
  const getDefaultValue = (fieldSchema) => {
    switch (fieldSchema.type) {
      case 'string':
        return '';
      case 'number':
      case 'integer':
        return null;
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
        return {};
      case 'location':
        return { latitude: null, longitude: null, formatted_address: '' };
      case 'parent_record_reference':
        return null;
      case 'enum':
        return '';
      default:
        return '';
    }
  };

  // Handle field change
  const handleFieldChange = useCallback((fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear validation error for this field
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  }, [validationErrors]);

  // Validate form
  const validateForm = () => {
    const errors = {};
    const required = dataType?.schema_definition?.required || [];

    required.forEach(fieldName => {
      const value = formData[fieldName];
      const fieldSchema = dataType.schema_definition.properties[fieldName];
      
      if (fieldSchema.type === 'location') {
        if (!value || (value.latitude === null && value.longitude === null && !value.internal_location_id)) {
          errors[fieldName] = 'שדה זה הוא חובה';
        }
      } else if (value === undefined || value === null || value === '') {
        errors[fieldName] = 'שדה זה הוא חובה';
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      // Process form data before saving
      const processedData = { ...formData };
      
      // Handle number fields
      Object.entries(dataType.schema_definition.properties || {}).forEach(([fieldName, fieldSchema]) => {
        if ((fieldSchema.type === 'number' || fieldSchema.type === 'integer') && 
            processedData[fieldName] !== null && processedData[fieldName] !== '') {
          processedData[fieldName] = Number(processedData[fieldName]);
        }
      });

      let savedRecord;
      if (record) {
        // Update existing record
        savedRecord = await CustomDataRecord.update(record.id, {
          data: processedData
        });
      } else {
        // Create new record
        savedRecord = await CustomDataRecord.create({
          custom_data_type_slug: dataType.slug,
          data: processedData
        });
      }

      onSuccess(savedRecord);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving record:', error);
      onError(error);
    } finally {
      setSaving(false);
    }
  };

  // Render individual form field
  const renderFormField = (fieldName, fieldSchema) => {
    const value = formData[fieldName];
    const error = validationErrors[fieldName];
    const isRequired = dataType.schema_definition.required?.includes(fieldName);

    const fieldProps = {
      value,
      onChange: (newValue) => handleFieldChange(fieldName, newValue),
      error,
      required: isRequired,
      disabled: saving
    };

    return (
      <div key={fieldName} className="space-y-2">
        <Label htmlFor={fieldName} className="text-sm font-medium">
          {fieldSchema.description || fieldName}
          {isRequired && <span className="text-red-500 mr-1">*</span>}
        </Label>
        
        {renderFieldInput(fieldName, fieldSchema, fieldProps)}
        
        {error && (
          <div className="flex items-center gap-1 text-red-600 text-xs">
            <AlertCircle className="w-3 h-3" />
            {error}
          </div>
        )}
      </div>
    );
  };

  // Render field input based on type
  const renderFieldInput = (fieldName, fieldSchema, { value, onChange, error, required, disabled }) => {
    const inputClassName = `clay-input ${error ? 'border-red-300' : ''}`;

    switch (fieldSchema.type) {
      case 'string':
        if (fieldSchema.enum && Array.isArray(fieldSchema.enum)) {
          return (
            <Select
              value={value || ''}
              onValueChange={onChange}
              disabled={disabled}
            >
              <SelectTrigger className={inputClassName}>
                <SelectValue placeholder={`בחר ${fieldSchema.description || fieldName}`} />
              </SelectTrigger>
              <SelectContent className="z-[70]">
                {fieldSchema.enum.map((option, index) => (
                  <SelectItem key={`${option}-${index}`} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

        // Special handling for resource_type_id
        if (fieldName === 'resource_type_id') {
          return (
            <Select
              value={value || ''}
              onValueChange={onChange}
              disabled={disabled}
            >
              <SelectTrigger className={inputClassName}>
                <SelectValue placeholder="בחר סוג משאב" />
              </SelectTrigger>
              <SelectContent className="z-[70] max-h-[200px] overflow-y-auto">
                {resourceTypes.map((resourceType) => (
                  <SelectItem key={resourceType.id} value={resourceType.id}>
                    {resourceType.name}
                  </SelectItem>
                ))}
                {resourceTypes.length === 0 && (
                  <SelectItem value={null} disabled>
                    אין סוגי משאבים זמינים
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          );
        }

        // Text field variations
        if (fieldSchema.format === 'textarea' || 
            fieldName.toLowerCase().includes('description') ||
            fieldName.toLowerCase().includes('notes')) {
          return (
            <Textarea
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              className={inputClassName}
              rows={4}
              placeholder={`הכנס ${fieldSchema.description || fieldName}...`}
              disabled={disabled}
            />
          );
        }

        return (
          <Input
            type={fieldSchema.format === 'email' ? 'email' : 
                  fieldSchema.format === 'url' ? 'url' :
                  fieldSchema.format === 'date' ? 'date' :
                  fieldSchema.format === 'time' ? 'time' : 'text'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={inputClassName}
            placeholder={`הכנס ${fieldSchema.description || fieldName}...`}
            disabled={disabled}
          />
        );

      case 'enum':
        return (
          <Select
            value={value || ''}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger className={inputClassName}>
              <SelectValue placeholder={`בחר ${fieldSchema.description || fieldName}`} />
            </SelectTrigger>
            <SelectContent className="z-[70]">
              {fieldSchema.enum?.map((option, index) => (
                <SelectItem key={`${option}-${index}`} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'number':
      case 'integer':
        return (
          <Input
            type="number"
            value={value === null || value === undefined ? '' : value}
            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
            className={inputClassName}
            placeholder={`הכנס ${fieldSchema.description || fieldName}...`}
            disabled={disabled}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={`check-${fieldName}`}
              checked={!!value}
              onCheckedChange={onChange}
              disabled={disabled}
            />
            <Label htmlFor={`check-${fieldName}`} className="text-sm">
              {fieldSchema.description || fieldName}
            </Label>
          </div>
        );

      case 'location':
        return (
          <EnhancedLocationSelector
            value={value}
            onChange={onChange}
            placeholder="בחר מיקום..."
            required={required}
            disabled={disabled}
            label={fieldSchema.description || fieldName}
          />
        );

      case 'parent_record_reference':
        if (!fieldSchema.parent_data_type_slug) {
          return (
            <div className="text-red-500 text-sm">
              שגיאה: חסר הגדרת parent_data_type_slug עבור שדה {fieldName}
            </div>
          );
        }

        const fieldDefinition = {
          type: 'custom_data_record_selector',
          linked_data_type_slug: fieldSchema.parent_data_type_slug,
          custom_data_fields_config: fieldSchema.parent_record_creation_config || {
            enabled_fields: null,
            required_fields: [],
            field_labels_override: {},
            field_placeholders_override: {}
          }
        };

        return (
          <CustomDataRecordSelector
            dataTypeSlug={fieldSchema.parent_data_type_slug}
            selectedRecordId={value}
            onSelectionChange={onChange}
            placeholder={`בחר ${fieldSchema.description || fieldName}...`}
            required={required}
            disabled={disabled}
            formFieldDefinition={fieldDefinition}
            allowCreation={true}
          />
        );

      default:
        return (
          <div className="space-y-2">
            <Input
              value={typeof value === 'object' ? JSON.stringify(value) : (value || '')}
              onChange={(e) => {
                try {
                  onChange(JSON.parse(e.target.value));
                } catch {
                  onChange(e.target.value);
                }
              }}
              className={inputClassName}
              disabled={disabled}
              readOnly
            />
            <p className="text-amber-600 text-xs">
              שדה מסוג '{fieldSchema.type}' אינו נתמך לעריכה ישירה.
            </p>
          </div>
        );
    }
  };

  if (!dataType) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="clay-card max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-primary-700 flex items-center gap-2">
            {record ? 'עריכת' : 'יצירת'} {dataType.name}
          </DialogTitle>
          <DialogDescription>
            {record ? 'ערוך את פרטי הרשומה' : 'מלא את הפרטים ליצירת רשומה חדשה'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            <span className="mr-3">טוען נתונים...</span>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-1" style={{ maxHeight: '60vh' }}>
              <div className="space-y-6 py-4">
                {/* Basic Fields */}
                <Card className="clay-card bg-blue-50 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Info className="w-5 h-5 text-blue-600" />
                      פרטים בסיסיים
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 max-h-none overflow-visible">
                    {dataType.schema_definition?.properties && 
                     Object.entries(dataType.schema_definition.properties).map(([fieldName, fieldSchema]) =>
                       renderFormField(fieldName, fieldSchema)
                     )}
                  </CardContent>
                </Card>

                {/* System Info for Edit Mode */}
                {record && (
                  <Card className="clay-card bg-gray-50 border-gray-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-gray-600">מידע מערכת</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">נוצר:</span>
                          <span className="font-medium mr-2">
                            {record.created_date ? format(new Date(record.created_date), 'dd/MM/yyyy HH:mm') : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">מזהה:</span>
                          <span className="font-mono text-xs mr-2">{record.id}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
                className="clay-button"
              >
                <X className="w-4 h-4 ml-2" />
                ביטול
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="clay-button bg-primary-100 text-primary-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    {record ? 'עדכן רשומה' : 'צור רשומה'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}