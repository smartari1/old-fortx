
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CustomDataRecordSelector from './CustomDataRecordSelector';
import EnhancedLocationSelector from './EnhancedLocationSelector';
import { MapPin, AlertTriangle } from 'lucide-react'; // MapPin is still imported, but no longer used in the location field label per changes.

export default function CustomDataRecordFormRenderer({ schema, formData, onFieldChange, onFileChange, entityName }) {
  const handleInputChange = ({ target: { name, value } }) => {
    onFieldChange(name, value);
  };

  const handleFileChange = (fieldName, file) => {
    onFileChange(fieldName, file);
  };

  const renderField = (fieldName, fieldSchema, value, onChange) => {
    const inputProps = {
      value: value || '',
      onChange: (e) => onChange(fieldName, e.target.value),
      className: "clay-input",
      placeholder: fieldSchema.description || `הזן ${fieldName}`
    };

    switch (fieldSchema.type) {
      case 'string':
        if (fieldSchema.format === 'email') {
          return (
            <Input
              {...inputProps}
              type="email"
              placeholder="example@email.com"
            />
          );
        }
        if (fieldSchema.format === 'url') {
          return (
            <Input
              {...inputProps}
              type="url"
              placeholder="https://example.com"
            />
          );
        }
        if (fieldSchema.format === 'tel' || fieldSchema.format === 'phone') {
          return (
            <Input
              {...inputProps}
              type="tel"
              placeholder="050-1234567"
            />
          );
        }
        if (fieldSchema.format === 'textarea') {
          return (
            <Textarea
              value={value || ''}
              onChange={(e) => onChange(fieldName, e.target.value)}
              className="clay-textarea"
              placeholder={fieldSchema.description || `הזן ${fieldName}`}
              rows={4}
            />
          );
        }
        return <Input {...inputProps} />;

      case 'number':
        return (
          <Input
            {...inputProps}
            type="number"
            step="any"
          />
        );

      case 'integer':
        return (
          <Input
            {...inputProps}
            type="number"
            step="1"
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Checkbox
              id={fieldName}
              checked={Boolean(value)}
              onCheckedChange={(checked) => onChange(fieldName, checked)}
            />
            <Label htmlFor={fieldName} className="text-sm">
              {fieldSchema.description || fieldName}
            </Label>
          </div>
        );

      case 'date':
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(fieldName, e.target.value)}
            type="date"
            className="clay-input"
          />
        );

      case 'time':
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(fieldName, e.target.value)}
            type="time"
            className="clay-input"
          />
        );

      case 'location':
        const isRequired = schema.required?.includes(fieldName);
        return (
          <div className="space-y-2">
            <Label htmlFor={fieldName} className="text-sm font-medium text-neutral-700"> {/* Removed MapPin icon and related flex classes */}
              {fieldSchema.description || fieldName}
              {isRequired && <span className="text-red-500 mr-1">*</span>} {/* Used mr-1 as per outline */}
            </Label>
            <EnhancedLocationSelector
              value={value} // Corrected to use 'value' prop passed to renderField
              onChange={(locationData) => {
                console.log('Location selected:', locationData); // Debug log
                onChange(fieldName, locationData); // Correctly calls the passed onChange prop
              }}
              placeholder={`בחר ${fieldSchema.description || fieldName}`} // Used outline's placeholder
              // 'disabled' prop removed as it was not defined in context
              // 'className="mt-1"' removed as it was not in the outline
            />
            {fieldSchema.description && (
              <p className="text-sm text-gray-500">{fieldSchema.description}</p>
            )}
          </div>
        );

      case 'enum':
        return (
          <Select
            value={value || ''}
            onValueChange={(selectedValue) => onChange(fieldName, selectedValue)}
          >
            <SelectTrigger className="clay-select">
              <SelectValue placeholder={`בחר ${fieldSchema.description || fieldName}`} />
            </SelectTrigger>
            <SelectContent>
              {fieldSchema.enum?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'parent_record_reference':
        return (
          <CustomDataRecordSelector
            dataTypeSlug={fieldSchema.parent_data_type_slug}
            value={value}
            onChange={(selectedRecordId) => onChange(fieldName, selectedRecordId)}
            placeholder={`בחר ${fieldSchema.description || fieldName}`}
            displayFormat={fieldSchema.parent_display_format}
            creationConfig={fieldSchema.parent_record_creation_config}
            className="clay-select"
          />
        );

      default:
        return <Input {...inputProps} />;
    }
  };

  if (!schema || !schema.properties) {
    return <div className="text-center text-red-500 p-4">הגדרת סוג הדאטה (schema) חסרה או לא תקינה.</div>;
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
      {Object.entries(schema.properties).map(([fieldName, fieldSchema]) => (
        <div key={fieldName} className="rounded-xl p-4 bg-white/70 shadow-[0_4px_12px_rgba(0,0,0,0.05)] backdrop-blur-sm">
          <Label htmlFor={fieldName} className="block text-sm font-medium text-gray-800 mb-2">
            {fieldSchema.description || fieldName}
            {schema.required?.includes(fieldName) && <span className="text-red-500 mr-1">*</span>}
          </Label>
          {renderField(
            fieldName,
            fieldSchema,
            formData[fieldName],
            (name, val) => handleInputChange({ target: { name, value: val } })
          )}
        </div>
      ))}
    </form>
  );
}
