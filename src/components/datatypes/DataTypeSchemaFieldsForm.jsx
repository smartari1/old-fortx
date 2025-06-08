
import React from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, X } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function DataTypeSchemaFieldsForm({
  formData = { fields: [] }, // Default value to prevent undefined
  onChange = () => {}, // Default empty function to prevent error
  customDataTypes = [] // Default value to prevent undefined
}) {

  // Safely get fields array with fallback
  const fields = formData?.fields || [];

  // Helper function for generic field changes
  const handleFieldChange = (index, key, value) => {
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], [key]: value };
    onChange({ ...formData, fields: updatedFields });
  };

  // Helper function to remove a schema field
  const removeField = (index) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    onChange({ ...formData, fields: updatedFields });
  };

  // Helper function to add a schema field
  const addNewField = () => {
    const newField = {
      id: Date.now(), // Simple unique ID, could be UUID in a real app
      name: '',
      type: 'string',
      description: '',
      required: false,
      enum: [], // Initialize enum for new fields, to support both enum type and string with enum
      format: '', // For string type formats
      parent_data_type_slug: '',
      parent_display_format: '',
      parent_record_creation_config: { 
        enabled_fields: [], 
        required_fields: [], 
        field_labels_override: {}, 
        field_placeholders_override: {} 
      }
    };
    onChange({ ...formData, fields: [...fields, newField] });
  };

  // Helper for parent record creation config changes
  const handleParentRecordCreationConfigChange = (fieldIndex, configKey, configValue) => {
    const updatedFields = [...fields];
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      parent_record_creation_config: {
        ...updatedFields[fieldIndex].parent_record_creation_config,
        [configKey]: configValue,
      },
    };
    onChange({ ...formData, fields: updatedFields });
  };

  // Enum option specific handlers
  const addOption = (fieldIndex) => {
    const updatedFields = [...fields];
    if (!updatedFields[fieldIndex].enum) {
      updatedFields[fieldIndex].enum = [];
    }
    updatedFields[fieldIndex].enum.push('');
    onChange({ ...formData, fields: updatedFields });
  };

  const removeOption = (fieldIndex, optionIndex) => {
    const updatedFields = [...fields];
    updatedFields[fieldIndex].enum.splice(optionIndex, 1);
    onChange({ ...formData, fields: updatedFields });
  };

  const updateOption = (fieldIndex, optionIndex, value) => {
    const updatedFields = [...fields];
    if (!updatedFields[fieldIndex].enum) {
      updatedFields[fieldIndex].enum = [];
    }
    updatedFields[fieldIndex].enum[optionIndex] = value;
    onChange({ ...formData, fields: updatedFields });
  };

  const renderSingleSchemaField = (field, index) => {
    const parentDataTypeDefinition = customDataTypes.find(dt => dt.slug === field.parent_data_type_slug);
    const parentSchemaFields = parentDataTypeDefinition?.schema_definition?.properties ? Object.entries(parentDataTypeDefinition.schema_definition.properties) : [];
    const currentCreationConfig = field.parent_record_creation_config || { enabled_fields: [], required_fields: [], field_labels_override: {}, field_placeholders_override: {} };
    const enabledParentFields = Array.isArray(currentCreationConfig.enabled_fields) ? currentCreationConfig.enabled_fields : [];
    const defaultAllEnabled = enabledParentFields.length === 0 && !currentCreationConfig.user_interacted_with_enabled_fields;

    return (
      <Card key={field.id} className="clay-card bg-white p-3 shadow-sm">
        <CardHeader className="p-0 pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-md text-gray-800">שדה #{index + 1}</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeField(index)}
              className="text-red-500 hover:text-red-700 w-7 h-7"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">שם השדה (באנגלית, ללא רווחים)</label>
              <Input
                value={field.name || ''}
                onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                placeholder="field_name_example"
                className="clay-input"
                required
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">סוג</label>
              <Select value={field.type} onValueChange={(value) => handleFieldChange(index, 'type', value)}>
                <SelectTrigger className="clay-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">טקסט (String)</SelectItem>
                  <SelectItem value="number">מספר (Number)</SelectItem>
                  <SelectItem value="integer">מספר שלם (Integer)</SelectItem>
                  <SelectItem value="boolean">כן/לא (Boolean)</SelectItem>
                  <SelectItem value="date">תאריך (Date)</SelectItem>
                  <SelectItem value="time">שעה (Time)</SelectItem>
                  <SelectItem value="location">מיקום (Location)</SelectItem>
                  <SelectItem value="enum">בחירה מתוך אופציות (Enum/Select)</SelectItem>
                  <SelectItem value="parent_record_reference">קישור לרשומת אב (Parent Record Reference)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">תיאור קצר (יוצג למשתמש)</label>
            <Input
              value={field.description || ''}
              onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
              placeholder="לדוגמא: מספר סידורי של המכשיר"
              className="clay-input"
            />
          </div>

          {/* String format options */}
          {field.type === 'string' && (
            <div>
              <label className="block text-sm font-medium mb-1">פורמט טקסט (אופציונלי)</label>
              <Select value={field.format || ''} onValueChange={(value) => handleFieldChange(index, 'format', value || '')}>
                <SelectTrigger className="clay-input">
                  <SelectValue placeholder="בחר פורמט..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>טקסט רגיל (שורה אחת)</SelectItem>
                  <SelectItem value="textarea">טקסט ארוך (רב שורות)</SelectItem>
                  <SelectItem value="email">כתובת אימייל</SelectItem>
                  <SelectItem value="url">קישור (URL)</SelectItem>
                  <SelectItem value="phone">מספר טלפון</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Enum options section - ONLY for enum type */}
          {field.type === 'enum' && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="block text-sm font-medium mb-3 text-blue-800">
                אופציות לבחירה
              </label>
              
              {field.enum && field.enum.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {field.enum.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                        placeholder={`אופציה ${optionIndex + 1}`}
                        className="clay-input flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(index, optionIndex)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="הסר אופציה"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 mb-3 text-center py-2">
                  לא הוגדרו אופציות עדיין
                </div>
              )}
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addOption(index)}
                className="clay-button bg-blue-100 text-blue-700 border-blue-300 w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                הוסף אופציה חדשה
              </Button>
              
              {(!field.enum || field.enum.length === 0) && (
                <p className="text-xs text-blue-600 mt-2">
                  הוסף לפחות אופציה אחת כדי שהשדה יהיה שמיש
                </p>
              )}
            </div>
          )}

          {/* Parent Record Reference configuration */}
          {field.type === 'parent_record_reference' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800">הגדרות קישור לרשומת אב</h4>
              
              <div>
                <label className="block text-sm font-medium mb-1">סוג דאטה אב</label>
                <Select value={field.parent_data_type_slug || ''} onValueChange={(value) => handleFieldChange(index, 'parent_data_type_slug', value)}>
                  <SelectTrigger className="clay-input">
                    <SelectValue placeholder="בחר סוג דאטה אב..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customDataTypes.map(dataType => (
                      <SelectItem key={dataType.slug} value={dataType.slug}>
                        {dataType.name} ({dataType.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">פורמט תצוגה (לרשומה נבחרת)</label>
                <Input
                  value={field.parent_display_format || ''}
                  onChange={(e) => handleFieldChange(index, 'parent_display_format', e.target.value)}
                  placeholder="{display_name}"
                  className="clay-input"
                  dir="ltr"
                />
                <p className="text-xs text-gray-500 mt-1">השתמש ב-{`{field_name}`} כדי להציג ערכים מהרשומה האב.</p>
              </div>

              {/* Parent Record Creation Config Section */}
              {field.parent_data_type_slug && parentDataTypeDefinition && (
                <div className="mt-3 p-3 bg-indigo-100 rounded-lg border border-indigo-200">
                  <h5 className="text-sm font-medium text-indigo-700 mb-2">הגדרות יצירת רשומת אב חדשה (אופציונלי)</h5>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">שדות שיוצגו בטופס יצירת רשומת אב:</label>
                      <div className="max-h-40 overflow-y-auto space-y-1 border p-2 rounded bg-white">
                        {parentSchemaFields.map(([parentFieldName, parentFieldSchema]) => {
                          const isEnabled = defaultAllEnabled || enabledParentFields.includes(parentFieldName);
                          const isOriginallyRequired = parentDataTypeDefinition.schema_definition.required?.includes(parentFieldName);
                          const isConfigRequired = (currentCreationConfig.required_fields || []).includes(parentFieldName);

                          return (
                            <div key={parentFieldName} className="flex items-center justify-between p-1.5 bg-gray-50 rounded text-xs">
                              <label className="flex items-center gap-1.5">
                                <Checkbox
                                  id={`parent-field-${index}-${parentFieldName}`}
                                  checked={isEnabled}
                                  onCheckedChange={(checked) => {
                                    const newEnabled = checked
                                      ? [...enabledParentFields, parentFieldName].filter((v, i, a) => a.indexOf(v) === i)
                                      : enabledParentFields.filter(f => f !== parentFieldName);
                                    handleParentRecordCreationConfigChange(index, 'enabled_fields', newEnabled);
                                    handleParentRecordCreationConfigChange(index, 'user_interacted_with_enabled_fields', true);
                                  }}
                                  className="h-3.5 w-3.5 rounded-sm"
                                />
                                {parentFieldSchema.description || parentFieldName}
                                {isOriginallyRequired && <Badge className="text-xxs bg-red-100 text-red-700 py-0 px-1 ml-1">חובה במקור</Badge>}
                              </label>
                              {isEnabled && (
                                <label className="flex items-center gap-1 text-xxs">
                                  <Checkbox
                                    id={`parent-field-required-${index}-${parentFieldName}`}
                                    checked={isConfigRequired || isOriginallyRequired}
                                    disabled={isOriginallyRequired}
                                    onCheckedChange={(checked) => {
                                      const newRequired = checked
                                        ? [...(currentCreationConfig.required_fields || []), parentFieldName].filter((v,i,a) => a.indexOf(v) === i)
                                        : (currentCreationConfig.required_fields || []).filter(f => f !== parentFieldName);
                                      handleParentRecordCreationConfigChange(index, 'required_fields', newRequired);
                                    }}
                                    className="h-3 w-3 rounded-sm"
                                  />
                                  חובה
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xxs text-gray-500 mt-0.5">אם לא נבחרו שדות, כל השדות יופיעו. שדות חובה מקוריים תמיד יהיו חובה.</p>
                    </div>

                    {/* Field Labels Override */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">שינוי תוויות שדות (אופציונלי):</label>
                      <div className="space-y-1">
                        {enabledParentFields.filter(fieldName => parentSchemaFields.find(([name]) => name === fieldName)).map(fieldName => (
                          <div key={fieldName} className="flex items-center gap-2">
                            <span className="w-20 text-xs font-medium truncate" title={fieldName}>{fieldName}:</span>
                            <Input
                              type="text"
                              value={currentCreationConfig.field_labels_override?.[fieldName] || ''}
                              onChange={(e) => {
                                const newOverride = { ...currentCreationConfig.field_labels_override };
                                if (e.target.value.trim()) {
                                  newOverride[fieldName] = e.target.value;
                                } else {
                                  delete newOverride[fieldName];
                                }
                                handleParentRecordCreationConfigChange(index, 'field_labels_override', newOverride);
                              }}
                              placeholder="תווית מותאמת..."
                              className="flex-1 p-1 text-xs border rounded"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">השאר ריק כדי להשתמש בתווית המקורית</p>
                    </div>

                    {/* Field Placeholders Override */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">שינוי טקסט מציין מיקום לשדות (אופציונלי):</label>
                      <div className="space-y-1">
                        {enabledParentFields.filter(fieldName => parentSchemaFields.find(([name]) => name === fieldName)).map(fieldName => (
                          <div key={fieldName} className="flex items-center gap-2">
                            <span className="w-20 text-xs font-medium truncate" title={fieldName}>{fieldName}:</span>
                            <Input
                              type="text"
                              value={currentCreationConfig.field_placeholders_override?.[fieldName] || ''}
                              onChange={(e) => {
                                const newOverride = { ...currentCreationConfig.field_placeholders_override };
                                if (e.target.value.trim()) {
                                  newOverride[fieldName] = e.target.value;
                                } else {
                                  delete newOverride[fieldName];
                                }
                                handleParentRecordCreationConfigChange(index, 'field_placeholders_override', newOverride);
                              }}
                              placeholder="טקסט מציין מיקום מותאם..."
                              className="flex-1 p-1 text-xs border rounded"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">השאר ריק כדי להשתמש בטקסט מציין המיקום המוגדר כברירת מחדל.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2 space-x-reverse pt-2 border-t">
            <Checkbox
              id={`required-${field.id}`}
              checked={field.required}
              onCheckedChange={(checked) => handleFieldChange(index, 'required', !!checked)}
            />
            <label htmlFor={`required-${field.id}`} className="text-sm font-medium">
              שדה חובה
            </label>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-3 clay-card bg-purple-50 p-4 rounded-lg">
      {fields.map((field, index) => renderSingleSchemaField(field, index))}
      <Button type="button" onClick={addNewField} className="clay-button flex items-center gap-1 text-sm bg-purple-100 text-purple-700">
        <Plus className="w-3 h-3" /> הוסף שדה
      </Button>
    </div>
  );
}
