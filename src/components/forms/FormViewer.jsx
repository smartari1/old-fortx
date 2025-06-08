
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FormTemplate } from '@/api/entities';
import { FormSubmission } from '@/api/entities';
import { User } from '@/api/entities';
import { CustomDataRecord } from '@/api/entities';
import { CustomDataType } from '@/api/entities';
import { UploadFile } from '@/api/integrations'; // New import for file uploads
import {
  FileText, Save, AlertCircle, Calendar, Clock, Paperclip, Database, Upload, CheckSquare, Eye, Edit3, X, Info, Loader2, Check, Camera, PenTool, Image as ImageIcon
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox"; //shadcn
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; //shadcn
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label"; // shadcn
import CustomDataRecordSelector from './CustomDataRecordSelector'; // New import for CustomDataRecordSelector

// Helper to get a display name for custom data records
const getCustomDataRecordDisplay = (record, fieldConfig, allCustomDataTypes) => {
  if (!record || !record.data) return `רשומה ${record.id}`;
  // Try common fields, then first string field, then ID
  const commonFields = ['name', 'title', 'identifier', 'label'];
  for (const cf of commonFields) {
    if (record.data[cf]) return record.data[cf];
  }
  // Try to find based on schema if available (more advanced)
  // For now, fallback to first string value or ID
  const firstStringValue = Object.values(record.data).find(v => typeof v === 'string');
  return firstStringValue || `רשומה ${record.id}`;
};

// Signature Canvas Component
const SignatureCanvas = ({ onSignatureChange, value, disabled = false }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 200;

    // Set canvas background
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // If there's an existing signature value, load it
    if (value && typeof value === 'string' && value.startsWith('data:image')) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height); // Draw image to fit canvas
        setHasSignature(true);
      };
      img.src = value;
    } else {
      setHasSignature(false); // Reset if value is not a valid signature
    }
  }, [value]);

  const startDrawing = (e) => {
    if (disabled) return;

    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawing || disabled) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const stopDrawing = () => {
    if (!isDrawing || disabled) return;

    setIsDrawing(false);
    setHasSignature(true);

    // Convert canvas to data URL and call the callback
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL('image/png');
    onSignatureChange(dataURL);
  };

  const clearSignature = () => {
    if (disabled) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    setHasSignature(false);
    onSignatureChange('');
  };

  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-white">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={(e) => {
          if (e.touches.length === 1) { // Only one touch for drawing
            startDrawing(e.touches[0]);
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 1) {
            draw(e.touches[0]);
          }
        }}
        onTouchEnd={stopDrawing}
        className="border border-gray-200 rounded cursor-crosshair w-full max-w-md"
        style={{ touchAction: 'none' }} // Prevent scrolling on canvas interaction
      />
      <div className="flex justify-between items-center mt-3">
        <p className="text-sm text-neutral-600">
          {hasSignature ? 'חתימה נוכחית' : disabled ? 'שדה לא ניתן לעריכה' : 'צייר חתימה עם העכבר/מגע'}
        </p>
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearSignature}
            className="text-red-600 hover:bg-red-50"
          >
            <X className="w-4 h-4 ml-1" />
            נקה
          </Button>
        )}
      </div>
    </div>
  );
};

// File Upload Component
const FileUpload = ({
  field,
  value = [],
  onChange,
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const isImageField = field.type === 'image';
  const maxFiles = field.max_files || (isImageField ? 5 : 10); // Default max files
  const maxSizeMB = field.max_file_size_mb || (isImageField ? 10 : 50); // Default max file size

  // Determine accepted file types for input, fallback to image/* for image type, or *.* for file type
  const acceptedTypes = field.file_types_accepted || (isImageField ? 'image/*' : '*/*');

  const handleFileSelect = async (e) => {
    if (disabled) return;

    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (value.length + files.length > maxFiles) {
      setUploadError(`ניתן להעלות עד ${maxFiles} קבצים. העלאת ${files.length} קבצים נוספים תעבור את המגבלה.`);
      return;
    }

    setUploading(true);
    setUploadError('');

    const newUploadedFiles = [];
    for (const file of files) {
      try {
        // Check file size
        if (file.size > maxSizeMB * 1024 * 1024) {
          throw new Error(`הקובץ ${file.name} גדול מדי (מקסימום ${maxSizeMB}MB).`);
        }

        // Upload file
        const { file_url } = await UploadFile({ file });

        newUploadedFiles.push({
          id: file_url + Math.random(), // Unique ID, URL might not be unique if filename is same
          name: file.name,
          url: file_url,
          size: file.size,
          type: file.type
        });
      } catch (error) {
        console.error('File upload error:', error);
        setUploadError(error.message || `שגיאה בהעלאת הקובץ ${file.name}.`);
        break; // Stop on first error
      }
    }

    onChange([...value, ...newUploadedFiles]);

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear input to allow re-uploading same file
    }
  };

  const removeFile = (fileId) => {
    if (disabled) return;
    onChange(value.filter(file => file.id !== fileId));
    setUploadError(''); // Clear error if files are removed
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-3">
      {/* Upload Button */}
      {!disabled && value.length < maxFiles && (
        <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-neutral-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            multiple={maxFiles > 1}
            accept={acceptedTypes}
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mb-2 clay-button"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
            ) : isImageField ? (
              <Camera className="w-4 h-4 ml-2" />
            ) : (
              <Upload className="w-4 h-4 ml-2" />
            )}
            {uploading ? 'מעלה...' : isImageField ? 'העלה תמונות' : 'העלה קבצים'}
          </Button>
          <p className="text-sm text-neutral-500">
            {isImageField ? 'תמונות בלבד' : 'כל סוגי הקבצים'} • עד {maxSizeMB}MB • עד {maxFiles} קבצים
          </p>
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
          <AlertCircle className="w-4 h-4 text-red-500 ml-2" />
          <span className="text-sm text-red-700">{uploadError}</span>
        </div>
      )}

      {/* Uploaded Files */}
      {value.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-neutral-700">
            קבצים שהועלו ({value.length}/{maxFiles})
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {value.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                <div className="flex items-center space-x-3 space-x-reverse">
                  {file.type?.startsWith('image/') ? (
                    <ImageIcon className="w-5 h-5 text-blue-500" />
                  ) : (
                    <FileText className="w-5 h-5 text-neutral-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{file.name}</p>
                    <p className="text-xs text-neutral-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  {file.url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(file.url, '_blank')}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      צפה
                    </Button>
                  )}
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Display when disabled and no files */}
      {disabled && value.length === 0 && (
        <div className="text-sm text-neutral-500 italic">
          לא הועלו קבצים לשדה זה
        </div>
      )}
    </div>
  );
};


export default function FormViewer({
  formTemplateId,
  onSubmit, // (submissionData) => void
  onCancel, // () => void
  contextEntityType = null,
  contextEntityId = null,
  initialData = {}, // For pre-filling new forms
  existingSubmissionId = null, // To load and display/edit an existing submission
  viewMode = false // Initial mode (true for view, false for edit/create)
}) {
  const [formTemplate, setFormTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [originalFormData, setOriginalFormData] = useState({}); // To revert changes on cancel
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [customDataOptions, setCustomDataOptions] = useState({}); // { [fieldId]: [records] }
  const [allCustomDataTypes, setAllCustomDataTypes] = useState([]); // For CustomDataRecord display names

  const [currentMode, setCurrentMode] = useState(existingSubmissionId ? true : viewMode);

  const isViewMode = currentMode; // More explicit naming for use in JSX

  // Load current user
  useEffect(() => {
    User.me().then(setCurrentUser).catch(console.error);
  }, []);

  // Load Form Template and All Custom Data Types
  useEffect(() => {
    if (!formTemplateId) {
      setError("לא סופק מזהה תבנית טופס.");
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      FormTemplate.get(formTemplateId),
      CustomDataType.list() // Fetch all custom data types once for display name lookups
    ])
    .then(async ([template, types]) => {
      setFormTemplate(template);
      setAllCustomDataTypes(types || []);

      const customDataFields = template.fields.filter(f =>
        (f.type === 'custom_data_selector' || f.type === 'custom_data_record_selector')
        && f.linked_data_type_slug
      );
      const optionsMap = {};
      for (const field of customDataFields) {
        try {
          optionsMap[field.id] = await CustomDataRecord.filter({ custom_data_type_slug: field.linked_data_type_slug }) || [];
        } catch (err) {
          console.warn(`Failed to load custom data for field ${field.id}:`, err);
          optionsMap[field.id] = [];
        }
      }
      setCustomDataOptions(optionsMap);
    })
    .catch(err => {
      console.error("Error loading form template or custom data types:", err);
      setError("שגיאה בטעינת תבנית הטופס: " + (err.message || String(err)));
    })
    .finally(() => {
      // Loading will be set to false after submission/initialData is processed
    });
  }, [formTemplateId]);

  const getDefaultFieldValue = useCallback((field) => {
    switch (field.type) {
      case 'checkbox':
        return [];
      case 'file':
      case 'image':
        return []; // Files are stored as an array of objects
      case 'signature':
        return ''; // Signature is a data URL string
      default:
        return '';
    }
  }, []);

  // Load Existing Submission or Initialize New Form Data
  useEffect(() => {
    if (!formTemplate) return; // Wait for template to load

    if (existingSubmissionId) {
      setCurrentMode(true); // Start in view mode for existing submissions
      FormSubmission.get(existingSubmissionId)
        .then(submission => {
          const data = submission.data || {};
          setFormData(data);
          setOriginalFormData(JSON.parse(JSON.stringify(data))); // Deep copy for reset
        })
        .catch(err => {
          console.error("Error loading existing submission:", err);
          setError("שגיאה בטעינת הגשה קיימת: " + (err.message || String(err)));
        })
        .finally(() => setLoading(false));
    } else {
      const newFormData = { ...initialData };
      formTemplate.fields.forEach(field => {
        if (!(field.id in newFormData)) {
          newFormData[field.id] = getDefaultFieldValue(field);
        }
      });
      setFormData(newFormData);
      setOriginalFormData(JSON.parse(JSON.stringify(newFormData))); // Deep copy
      setCurrentMode(viewMode); // Set initial mode based on prop for new forms
      setLoading(false);
    }
  }, [formTemplate, existingSubmissionId, initialData, viewMode, getDefaultFieldValue]); // Added getDefaultFieldValue to deps

  const validateForm = useCallback(() => {
    if (!formTemplate) return false;
    for (const field of formTemplate.fields) {
      if (field.is_required) {
        const value = formData[field.id];
        switch (field.type) {
          case 'checkbox':
          case 'file':
          case 'image':
            if (!Array.isArray(value) || value.length === 0) {
              setError(`שדה "${field.label}" הוא שדה חובה.`);
              return false;
            }
            break;
          case 'signature':
            if (!value || typeof value !== 'string' || value.trim() === '') {
              setError(`שדה "${field.label}" הוא שדה חובה.`);
              return false;
            }
            break;
          default:
            if (value === undefined || value === null || String(value).trim() === '') {
              setError(`שדה "${field.label}" הוא שדה חובה.`);
              return false;
            }
            break;
        }
      }
    }
    setError(null); // Clear previous errors
    return true;
  }, [formData, formTemplate]);

  const internalOnSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);

    // File and image uploads are handled by the FileUpload component directly,
    // so formData already contains the URLs/objects for those fields.
    // Signature is a data URL string.
    const submissionPayload = {
      form_template_id: formTemplateId,
      submitted_by_user_id: currentUser?.id || 'unknown_user',
      submission_timestamp: new Date().toISOString(),
      data: formData, // formData now contains all processed field values (URLs for files, data URLs for signatures)
      ...(contextEntityType && { context_entity_type: contextEntityType }),
      ...(contextEntityId && { context_entity_id: contextEntityId }),
    };

    try {
      await onSubmit(submissionPayload, existingSubmissionId); // Pass existingId for update scenarios
      if (!existingSubmissionId) { // Reset form only for new submissions
        const newEmptyFormData = {};
        formTemplate.fields.forEach(field => {
          newEmptyFormData[field.id] = getDefaultFieldValue(field);
        });
        setFormData(newEmptyFormData);
        setOriginalFormData(JSON.parse(JSON.stringify(newEmptyFormData)));
      } else {
        setOriginalFormData(JSON.parse(JSON.stringify(formData))); // Update original data after successful edit
        setCurrentMode(true); // Go back to view mode after editing an existing submission
      }
    } catch (submitError) {
      console.error("Error in onSubmit prop:", submitError);
      setError("אירעה שגיאה בעת הגשת הטופס: " + (submitError.message || String(submitError)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const internalOnCancel = () => {
    if (existingSubmissionId && !currentMode) { // Was editing an existing submission
      setFormData(JSON.parse(JSON.stringify(originalFormData))); // Revert to original data
      setCurrentMode(true); // Go back to view mode
      setError(null);
    } else if (onCancel) { // New form or already in view mode and cancelling
      onCancel();
    }
  };

  const renderField = (field) => {
    const fieldValue = formData[field.id] !== undefined
      ? formData[field.id]
      : getDefaultFieldValue(field);
    const isRequired = field.is_required;
    const isDisabled = isViewMode; // Use isViewMode for clarity

    const handleFieldChange = (value) => {
      if (isDisabled) return;
      setFormData(prev => ({ ...prev, [field.id]: value }));
    };

    if (isViewMode) {
      let displayValue = fieldValue;

      switch (field.type) {
        case 'checkbox':
          displayValue = Array.isArray(fieldValue) ? fieldValue.join(', ') : '';
          break;
        case 'select':
        case 'radio':
          const selectedOption = field.options?.find(opt => opt.value === fieldValue);
          displayValue = selectedOption ? selectedOption.label : fieldValue;
          break;
        case 'file':
        case 'image':
          if (Array.isArray(fieldValue) && fieldValue.length > 0) {
            return (
              <div className="space-y-2">
                {fieldValue.map((file, index) => (
                  <div key={file.id || index} className="flex items-center gap-2 text-primary-600">
                    {file.type?.startsWith('image/') ? <ImageIcon size={14} /> : <Paperclip size={14} />}
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {file.name || 'קובץ מצורף'}
                    </a>
                  </div>
                ))}
              </div>
            );
          }
          displayValue = <span className="text-neutral-500 italic">לא הועלו קבצים</span>;
          break;
        case 'signature':
          if (fieldValue && typeof fieldValue === 'string' && fieldValue.startsWith('data:image')) {
            return (
              <div className="border border-neutral-200 rounded-lg p-2 bg-neutral-50">
                <p className="text-sm text-neutral-600 mb-1">חתימה דיגיטלית:</p>
                <img
                  src={fieldValue}
                  alt="חתימה דיגיטלית"
                  className="max-w-xs border border-neutral-200 rounded bg-white"
                  style={{ maxHeight: '150px', width: 'auto' }}
                />
              </div>
            );
          }
          displayValue = <span className="text-neutral-500 italic">לא הוזנה חתימה</span>;
          break;
        case 'custom_data_selector':
        case 'custom_data_record_selector':
          const selectedRecord = customDataOptions[field.id]?.find(r => r.id === fieldValue);
          displayValue = selectedRecord ? getCustomDataRecordDisplay(selectedRecord, field, allCustomDataTypes) : fieldValue;
          break;
        case 'boolean':
          displayValue = fieldValue ? "כן" : "לא";
          break;
        default:
          if (fieldValue === null || fieldValue === undefined || String(fieldValue).trim() === '') {
            displayValue = <span className="text-neutral-500 italic">לא הוזן</span>;
          }
          break;
      }
      return <div className="text-neutral-700 whitespace-pre-wrap">{displayValue}</div>;
    }

    // Edit/Create Mode
    switch (field.type) {
      case 'text':
        return (
          <Input
            type="text"
            value={String(fieldValue)}
            onChange={(e) => handleFieldChange(e.target.value)}
            placeholder={field.placeholder}
            required={isRequired}
            disabled={isDisabled}
            className="clay-input"
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={String(fieldValue)}
            onChange={(e) => handleFieldChange(e.target.value)}
            placeholder={field.placeholder}
            required={isRequired}
            disabled={isDisabled}
            className="clay-input h-24"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={String(fieldValue)}
            onChange={(e) => handleFieldChange(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder={field.placeholder}
            required={isRequired}
            disabled={isDisabled}
            className="clay-input"
          />
        );

      case 'date':
        const dateValue = fieldValue instanceof Date ? fieldValue.toISOString().split('T')[0] : (typeof fieldValue === 'string' ? fieldValue.split('T')[0] : '');
        return (
          <Input
            type="date"
            value={dateValue}
            onChange={(e) => handleFieldChange(e.target.value)}
            required={isRequired}
            disabled={isDisabled}
            className="clay-input"
          />
        );

      case 'time':
        return (
          <Input
            type="time"
            value={String(fieldValue)}
            onChange={(e) => handleFieldChange(e.target.value)}
            required={isRequired}
            disabled={isDisabled}
            className="clay-input"
          />
        );

      case 'select':
        const validSelectOptions = field.options?.filter(opt => opt.value !== "") || [];
        return (
          <Select
            value={String(fieldValue)}
            onValueChange={handleFieldChange}
            disabled={isDisabled}
            required={isRequired}
          >
            <SelectTrigger className="clay-input w-full"><SelectValue placeholder={field.placeholder || 'בחר...'} /></SelectTrigger>
            <SelectContent>
              {field.placeholder && <SelectItem value={null} disabled>{field.placeholder || 'בחר...'}</SelectItem>} {/* Empty value for placeholder */}
              {validSelectOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        );

      case 'radio':
        const validRadioOptions = field.options?.filter(opt => opt.value !== "") || [];
        return (
          <RadioGroup
            value={String(fieldValue)}
            onValueChange={handleFieldChange}
            disabled={isDisabled}
            className="space-y-1"
          >
            {validRadioOptions.map(opt => (
              <div key={opt.value} className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value={opt.value} id={`${field.id}-${opt.value}`} />
                <Label htmlFor={`${field.id}-${opt.value}`}>{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'checkbox': // For multiple selections
        const currentCheckboxValues = Array.isArray(fieldValue) ? fieldValue : [];
        return (
          <div className="space-y-1">
            {field.options?.map(opt => (
              <div key={opt.value} className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id={`${field.id}-${opt.value}`}
                  checked={currentCheckboxValues.includes(opt.value)}
                  onCheckedChange={(checked) => {
                    const updatedValues = checked
                      ? [...new Set([...currentCheckboxValues, opt.value])] // Add without duplicates
                      : currentCheckboxValues.filter(v => v !== opt.value); // Remove
                    handleFieldChange(updatedValues);
                  }}
                  disabled={isDisabled}
                />
                <Label htmlFor={`${field.id}-${opt.value}`}>{opt.label}</Label>
              </div>
            ))}
          </div>
        );

      case 'file':
      case 'image':
        return (
          <FileUpload
            field={field}
            value={Array.isArray(fieldValue) ? fieldValue : []}
            onChange={handleFieldChange}
            disabled={isDisabled}
            // isRequired is handled by validateForm for this type based on array length
          />
        );

      case 'signature':
        return (
          <SignatureCanvas
            value={fieldValue}
            onSignatureChange={handleFieldChange}
            disabled={isDisabled}
            // isRequired is handled by validateForm for this type based on string content
          />
        );

      case 'custom_data_selector':
      case 'custom_data_record_selector':
        return (
          <CustomDataRecordSelector
            dataTypeSlug={field.linked_data_type_slug}
            selectedRecordId={fieldValue}
            onSelectionChange={handleFieldChange}
            placeholder={field.placeholder || 'בחר או הוסף רשומה...'}
            required={isRequired}
            disabled={isDisabled}
            allowCreate={field.type === 'custom_data_record_selector'} // Assuming this is the intention for "record" selector
            fieldsConfig={field.custom_data_fields_config} // Pass through field-specific config
          />
        );
      default:
        return <Input type="text" value={String(fieldValue)} onChange={(e) => handleFieldChange(e.target.value)} placeholder={field.placeholder} className="clay-input" required={isRequired} disabled={isDisabled} />;
    }
  };

  if (loading) {
    return (
      <Card className="clay-card p-6 text-center" dir="rtl">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary-500 mb-3" />
        <p className="text-neutral-600">טוען טופס...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="clay-card p-6 text-center bg-red-50 border-red-200" dir="rtl">
        <AlertCircle className="w-10 h-10 mx-auto text-red-500 mb-3" />
        <p className="text-red-700 font-semibold mb-1">אירעה שגיאה</p>
        <p className="text-red-600 text-sm">{error}</p>
        {onCancel && <Button variant="outline" onClick={onCancel} className="mt-4 clay-button">חזור</Button>}
      </Card>
    );
  }

  if (!formTemplate) {
    return (
      <Card className="clay-card p-6 text-center text-neutral-500" dir="rtl">
        <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
        תבנית טופס לא נמצאה.
      </Card>
    );
  }

  return (
    <Card className="clay-card w-full" dir="rtl">
      <CardHeader className="border-b pb-4">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl text-primary-700">{formTemplate.title}</CardTitle>
            {formTemplate.description && <CardDescription className="text-sm text-neutral-500 mt-1">{formTemplate.description}</CardDescription>}
          </div>
          {existingSubmissionId && isViewMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMode(false)}
              className="clay-button text-primary-600 hover:bg-primary-50"
              aria-label="ערוך טופס"
            >
              <Edit3 className="w-4 h-4 ml-1 rtl:mr-0 rtl:ml-1" />
              ערוך
            </Button>
          )}
        </div>
        {existingSubmissionId && <Badge variant="outline" className="mt-2 text-sm bg-blue-50 text-blue-700 border-blue-200">טופס זה מולא בעבר</Badge>}
      </CardHeader>
      <form onSubmit={internalOnSubmit}>
        <CardContent className="pt-6 space-y-6">
          {formTemplate.fields.sort((a,b) => (a.order || 0) - (b.order || 0)).map(field => (
            <div key={field.id} className="grid gap-2">
              <Label htmlFor={field.id} className="font-medium text-neutral-800">
                {field.label}
                {field.is_required && !isViewMode && <span className="text-red-500 mr-1">*</span>}
              </Label>
              {renderField(field)}
              {field.description && !isViewMode && <p className="text-xs text-neutral-500 mt-1">{field.description}</p>}
            </div>
          ))}
        </CardContent>
        {!isViewMode && (
          <CardFooter className="flex justify-end gap-3 pt-6 border-t">
            {onCancel && (
                <Button type="button" variant="outline" onClick={internalOnCancel} className="clay-button" disabled={isSubmitting}>
                   {existingSubmissionId ? "בטל שינויים" : "נקה טופס"} <X size={16} className="ml-1"/>
                </Button>
            )}
            <Button type="submit" className="clay-button bg-primary-600 hover:bg-primary-700 text-white" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin ml-2"/> שומר...</> : <><Save className="w-4 h-4 ml-2"/> {existingSubmissionId ? "שמור שינויים" : "הגש טופס"}</>}
            </Button>
          </CardFooter>
        )}
         {isViewMode && onCancel && ( // Add a "Close" button in view mode if onCancel is provided
          <CardFooter className="flex justify-end pt-6 border-t">
            <Button type="button" variant="outline" onClick={onCancel} className="clay-button">
                סגור <X size={16} className="ml-1"/>
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}
