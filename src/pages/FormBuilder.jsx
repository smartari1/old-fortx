
import React, { useState, useEffect } from 'react';
import { FormTemplate } from '@/api/entities';
import { CustomDataType } from '@/api/entities';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Settings,
  Save,
  X,
  List,
  Type,
  CheckSquare,
  ToggleLeft,
  Hash,
  CalendarIcon,
  Clock,
  Paperclip,
  ChevronsUpDown,
  Copy,
  GripVertical,
  Database,
  Camera,
  PenTool
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const fieldTypes = [
  { value: 'text', label: 'טקסט (שורה אחת)', icon: <Type className="w-4 h-4" /> },
  { value: 'textarea', label: 'טקסט (רב שורות)', icon: <List className="w-4 h-4" /> },
  { value: 'number', label: 'מספר', icon: <Hash className="w-4 h-4" /> },
  { value: 'select', label: 'בחירה (רשימה נפתחת)', icon: <ChevronsUpDown className="w-4 h-4" /> },
  { value: 'checkbox', label: 'תיבת סימון (בחירה מרובה)', icon: <CheckSquare className="w-4 h-4" /> },
  { value: 'radio', label: 'כפתורי רדיו (בחירה יחידה)', icon: <ToggleLeft className="w-4 h-4" /> },
  { value: 'file', label: 'קובץ כללי', icon: <Paperclip className="w-4 h-4" /> },
  { value: 'image', label: 'תמונה', icon: <Camera className="w-4 h-4" /> },
  { value: 'signature', label: 'חתימה דיגיטלית', icon: <PenTool className="w-4 h-4" /> },
  { value: 'date', label: 'תאריך', icon: <CalendarIcon className="w-4 h-4" /> },
  { value: 'time', label: 'שעה', icon: <Clock className="w-4 h-4" /> },
  { value: 'custom_data_selector', label: 'בוחר נתונים מותאמים', icon: <Database className="w-4 h-4" /> },
  { value: 'custom_data_record_selector', label: 'בוחר/יוצר רשומת דאטה מותאמת', icon: <Database className="w-4 h-4" /> },
];

// Helper functions for default file settings
const getDefaultFileTypes = (fieldType) => {
  switch (fieldType) {
    case 'image':
      return 'image/*';
    case 'file':
      return '.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar';
    case 'signature':
      return 'image/png,image/jpeg';
    default:
      return undefined;
  }
};

const getDefaultMaxFileSize = (fieldType) => {
  switch (fieldType) {
    case 'image':
      return 10; // 10MB for images
    case 'signature':
      return 2; // 2MB for signatures
    case 'file':
      return 50; // 50MB for general files
    default:
      return undefined;
  }
};

const getDefaultMaxFiles = (fieldType) => {
  switch (fieldType) {
    case 'image':
      return 5; // Allow multiple images
    case 'signature':
      return 1; // Only one signature
    case 'file':
      return 3; // Multiple files
    default:
      return undefined;
  }
};

// Helper function for placeholder examples
const getPlaceholderExample = (fieldType) => {
  switch (fieldType) {
    case 'image':
      return 'העלה תמונות או גרור לכאן...';
    case 'file':
      return 'העלה קבצים או גרור לכאן...';
    case 'signature':
      return 'לחץ כדי לחתום...';
    case 'text':
      return 'הכנס טקסט...';
    case 'number':
      return 'הכנס מספר...';
    case 'date':
      return 'בחר תאריך...';
    default:
      return '';
  }
};

const generateFieldId = () => {
  return 'field_' + Math.random().toString(36).substr(2, 9);
};

const FieldItem = ({ field, index, onEdit, onRemove, onMove }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
    <div className="flex items-center space-x-3 space-x-reverse">
      <div className="flex flex-col space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMove(index, index - 1)}
          disabled={index === 0}
          className="h-4 w-6 p-0"
        >
          ↑
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMove(index, index + 1)}
          className="h-4 w-6 p-0"
        >
          ↓
        </Button>
      </div>
      <div>
        <p className="font-medium text-sm">{field.label || `שדה ${index + 1}`}</p>
        <p className="text-xs text-gray-500">
          {fieldTypes.find(ft => ft.value === field.type)?.label || field.type}
          {field.is_required && <span className="text-red-500"> *</span>}
        </p>
      </div>
    </div>
    <div className="flex space-x-2 space-x-reverse">
      <Button variant="ghost" size="sm" onClick={() => onEdit(index)}>
        <Edit2 className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => onRemove(index)} className="text-red-600">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  </div>
);

export default function FormBuilderPage() {
  const [templates, setTemplates] = useState([]);
  const [customDataTypes, setCustomDataTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingFieldIndex, setEditingFieldIndex] = useState(null);

  // Add mobile-specific state
  const [mobileActivePanel, setMobileActivePanel] = useState('settings'); // 'settings', 'fields', 'editor'

  const [currentTemplate, setCurrentTemplate] = useState({
    title: '',
    description: '',
    category: '',
    status: 'draft',
    linked_data_type_slugs: [],
    fields: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [templatesData, dataTypesData] = await Promise.all([
        FormTemplate.list().catch(() => []),
        CustomDataType.list().catch(() => [])
      ]);
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      setCustomDataTypes(Array.isArray(dataTypesData) ? dataTypesData : []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentTemplate({
      title: '',
      description: '',
      category: '',
      status: 'draft',
      linked_data_type_slugs: [],
      fields: []
    });
    setEditingTemplate(null);
    setEditingFieldIndex(null);
  };

  const handleTemplateSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentTemplate.title.trim()) {
      alert("כותרת הטופס היא שדה חובה.");
      return;
    }

    if (currentTemplate.fields.length === 0) {
      alert("יש להוסיף לפחות שדה אחד לטופס.");
      return;
    }

    // Validate that all fields have proper IDs and labels
    for (const field of currentTemplate.fields) {
      if (!field.id || !field.id.trim()) {
        alert("כל השדות חייבים לכלול מזהה (ID).");
        return;
      }
      if (!field.label || !field.label.trim()) {
        alert("כל השדות חייבים לכלול תווית.");
        return;
      }
    }

    try {
      if (editingTemplate) {
        await FormTemplate.update(editingTemplate.id, currentTemplate);
      } else {
        await FormTemplate.create(currentTemplate);
      }
      
      setShowTemplateForm(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error saving template:", error);
      alert("שגיאה בשמירת הטופס: " + error.message);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק טופס זה?")) {
      try {
        await FormTemplate.delete(templateId);
        loadData();
      } catch (error) {
        console.error("Error deleting template:", error);
        alert("שגיאה במחיקת הטופס.");
      }
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setCurrentTemplate({ ...template });
    setShowTemplateForm(true);
  };

  const addField = (type = 'text') => {
    const newField = {
      id: generateFieldId(),
      label: '',
      type: type,
      is_required: false,
      placeholder: '',
      options: [], // For select, radio, checkbox
      file_types_accepted: getDefaultFileTypes(type),
      max_file_size_mb: getDefaultMaxFileSize(type),
      max_files: getDefaultMaxFiles(type),
      linked_data_type_slug: (type === 'custom_data_selector' || type === 'custom_data_record_selector') ? '' : undefined,
      custom_data_fields_config: type === 'custom_data_record_selector' ? { enabled_fields: [], required_fields: [], field_labels_override: {}, field_placeholders_override: {} } : undefined,
    };
    setCurrentTemplate(prev => ({ ...prev, fields: [...prev.fields, newField] }));
    setEditingFieldIndex(currentTemplate.fields.length);
  };

  const handleFieldChange = (index, property, value) => {
    setCurrentTemplate(prev => ({
      ...prev,
      fields: prev.fields.map((field, i) => 
        i === index ? { ...field, [property]: value } : field
      )
    }));
  };

  const removeField = (index) => {
    setCurrentTemplate(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }));
    if (editingFieldIndex === index) {
      setEditingFieldIndex(null);
    }
  };

  const moveField = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= currentTemplate.fields.length) return;
    
    setCurrentTemplate(prev => {
      const newFields = [...prev.fields];
      const [movedField] = newFields.splice(fromIndex, 1);
      newFields.splice(toIndex, 0, movedField);
      return { ...prev, fields: newFields };
    });
  };

  const addOption = (fieldIndex) => {
    const newOption = { value: '', label: '' };
    handleFieldChange(fieldIndex, 'options', [...(currentTemplate.fields[fieldIndex].options || []), newOption]);
  };

  const updateOption = (fieldIndex, optionIndex, property, value) => {
    const field = currentTemplate.fields[fieldIndex];
    const updatedOptions = field.options.map((option, i) => 
      i === optionIndex ? { ...option, [property]: value } : option
    );
    handleFieldChange(fieldIndex, 'options', updatedOptions);
  };

  const removeOption = (fieldIndex, optionIndex) => {
    const field = currentTemplate.fields[fieldIndex];
    const updatedOptions = field.options.filter((_, i) => i !== optionIndex);
    handleFieldChange(fieldIndex, 'options', updatedOptions);
  };

  const linkableDataTypes = customDataTypes.filter(cdt => 
    cdt && typeof cdt === 'object' && cdt.slug && cdt.name
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  const currentEditingField = editingFieldIndex !== null ? currentTemplate.fields[editingFieldIndex] : null;

  return (
    <div className="container mx-auto p-2 md:p-6">
      <div className="mb-4 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center">
            <FileText className="w-6 h-6 md:w-8 md:h-8 ml-2 md:ml-3 text-purple-600" />
            בונה טפסים
          </h1>
          <p className="text-sm md:text-base text-gray-600">יצירה וניהול של טפסים מותאמים אישית למערכת.</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowTemplateForm(true);
            setMobileActivePanel('settings');
          }}
          className="clay-button bg-purple-100 text-purple-700 font-medium flex items-center gap-2 text-sm md:text-base"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          טופס חדש
        </Button>
      </div>

      {/* Templates List */}
      {!showTemplateForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {templates.length === 0 ? (
            <div className="col-span-full clay-card bg-white text-center p-6 md:p-10">
              <FileText className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg md:text-xl font-semibold text-gray-700">אין טפסים</h3>
              <p className="text-sm md:text-base text-gray-500 mt-2">צור טופס חדש כדי להתחיל.</p>
            </div>
          ) : (
            templates.map(template => (
              <Card key={template.id} className="clay-card bg-white">
                <CardHeader className="p-4 md:p-6">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base md:text-lg font-semibold text-purple-700">
                      {template.title}
                    </CardTitle>
                    <Badge className={
                      template.status === 'active' ? 'bg-green-100 text-green-800' : 
                      template.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-gray-100 text-gray-800'
                    }>
                      {template.status === 'active' ? 'פעיל' : 
                       template.status === 'draft' ? 'טיוטה' : 'בארכיון'}
                    </Badge>
                  </div>
                  {template.description && (
                    <CardDescription className="text-xs md:text-sm text-gray-600">
                      {template.description}
                    </CardDescription>
                  )}
                  {template.category && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <div className="space-y-2 text-xs md:text-sm text-gray-600">
                    <div>שדות: {template.fields?.length || 0}</div>
                    {template.linked_data_type_slugs && template.linked_data_type_slugs.length > 0 && (
                      <div>סוגי דאטה מקושרים: {template.linked_data_type_slugs.length}</div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTemplate(template)}
                      className="clay-button text-xs md:text-sm"
                    >
                      <Edit2 className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      ערוך
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="clay-button text-red-600 hover:bg-red-50 text-xs md:text-sm"
                    >
                      <Trash2 className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      מחק
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Form Builder Dialog - Mobile Responsive */}
      <Dialog open={showTemplateForm} onOpenChange={(open) => {
        if (!open) {
          setShowTemplateForm(false);
          resetForm();
          setMobileActivePanel('settings');
        }
      }}>
        <DialogContent className="w-[95vw] h-[95vh] md:max-w-6xl md:h-[90vh] clay-card p-0 gap-0">
          <DialogHeader className="p-3 md:p-6 pb-2 md:pb-4 border-b shrink-0">
            <DialogTitle className="text-lg md:text-xl font-semibold text-purple-700">
              {editingTemplate ? 'עריכת טופס' : 'יצירת טופס חדש'}
            </DialogTitle>
            <DialogDescription className="text-sm md:text-base">
              הגדר את פרטי הטופס והוסף שדות לפי הצורך.
            </DialogDescription>
          </DialogHeader>

          {/* Mobile Navigation Tabs */}
          <div className="block md:hidden border-b bg-gray-50">
            <div className="flex">
              <button
                className={`flex-1 px-3 py-2 text-sm font-medium ${
                  mobileActivePanel === 'settings' 
                    ? 'bg-white text-purple-700 border-b-2 border-purple-500' 
                    : 'text-gray-600'
                }`}
                onClick={() => setMobileActivePanel('settings')}
              >
                הגדרות
              </button>
              <button
                className={`flex-1 px-3 py-2 text-sm font-medium ${
                  mobileActivePanel === 'fields' 
                    ? 'bg-white text-purple-700 border-b-2 border-purple-500' 
                    : 'text-gray-600'
                }`}
                onClick={() => setMobileActivePanel('fields')}
              >
                שדות ({currentTemplate.fields.length})
              </button>
              {currentEditingField && (
                <button
                  className={`flex-1 px-3 py-2 text-sm font-medium ${
                    mobileActivePanel === 'editor' 
                      ? 'bg-white text-purple-700 border-b-2 border-purple-500' 
                      : 'text-gray-600'
                  }`}
                  onClick={() => setMobileActivePanel('editor')}
                >
                  עריכת שדה
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Desktop Layout */}
            <div className="hidden md:flex w-full">
              {/* Left Panel - Template Settings */}
              <div className="w-1/3 border-l overflow-y-auto">
                <ScrollArea className="h-full">
                  <div className="p-6 space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">הגדרות טופס</h3>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="templateTitle" className="block text-sm font-medium mb-1">כותרת הטופס *</label>
                          <Input
                            id="templateTitle"
                            value={currentTemplate.title}
                            onChange={(e) => setCurrentTemplate(prev => ({ ...prev, title: e.target.value }))}
                            className="clay-input"
                            placeholder="הכנס כותרת לטופס"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="templateDescription" className="block text-sm font-medium mb-1">תיאור</label>
                          <Textarea
                            id="templateDescription"
                            value={currentTemplate.description}
                            onChange={(e) => setCurrentTemplate(prev => ({ ...prev, description: e.target.value }))}
                            className="clay-input"
                            placeholder="תיאור קצר של מטרת הטופס"
                            rows={3}
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="templateCategory" className="block text-sm font-medium mb-1">קטגוריה</label>
                          <Input
                            id="templateCategory"
                            value={currentTemplate.category}
                            onChange={(e) => setCurrentTemplate(prev => ({ ...prev, category: e.target.value }))}
                            className="clay-input"
                            placeholder="לדוגמה: אבטחה, תחזוקה"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="templateStatus" className="block text-sm font-medium mb-1">סטטוס</label>
                          <Select 
                            value={currentTemplate.status} 
                            onValueChange={(value) => setCurrentTemplate(prev => ({ ...prev, status: value }))}
                          >
                            <SelectTrigger className="clay-input">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">טיוטה</SelectItem>
                              <SelectItem value="active">פעיל</SelectItem>
                              <SelectItem value="archived">בארכיון</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Add Field Section */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">הוספת שדות</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {fieldTypes.map(fieldType => (
                          <Button
                            key={fieldType.value}
                            variant="outline"
                            size="sm"
                            onClick={() => addField(fieldType.value)}
                            className="clay-button justify-start"
                          >
                            {fieldType.icon}
                            <span className="mr-2">{fieldType.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Field List */}
                    {currentTemplate.fields.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-4">שדות בטופס ({currentTemplate.fields.length})</h3>
                        <div className="space-y-2">
                          {currentTemplate.fields.map((field, index) => (
                            <FieldItem
                              key={field.id || index}
                              field={field}
                              index={index}
                              onEdit={setEditingFieldIndex}
                              onRemove={removeField}
                              onMove={moveField}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Right Panel - Field Settings */}
              <div className="flex-1 overflow-y-auto">
                <ScrollArea className="h-full">
                  {editingFieldIndex !== null && currentEditingField ? (
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">עריכת שדה</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingFieldIndex(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {/* Field Settings Content */}
                      <div className="space-y-4 py-4 pr-2">
                        <div>
                          <label htmlFor={`fieldId-${editingFieldIndex}`} className="block text-sm font-medium mb-1">מזהה שדה (ID)</label>
                          <Input
                            id={`fieldId-${editingFieldIndex}`}
                            value={currentEditingField.id || ''}
                            onChange={(e) => handleFieldChange(editingFieldIndex, 'id', e.target.value)}
                            className="clay-input"
                            placeholder="באנגלית, ללא רווחים (למשל: user_name)"
                          />
                          <p className="text-xs text-gray-500 mt-1">חובה. ייחודי לטופס. מומלץ באנגלית ללא רווחים.</p>
                        </div>
                        <div>
                          <label htmlFor={`fieldLabel-${editingFieldIndex}`} className="block text-sm font-medium mb-1">תווית השדה (מה שיוצג למשתמש)</label>
                          <Input id={`fieldLabel-${editingFieldIndex}`} value={currentEditingField.label || ''} onChange={(e) => handleFieldChange(editingFieldIndex, 'label', e.target.value)} className="clay-input" required />
                        </div>
                        <div>
                          <label htmlFor={`fieldType-${editingFieldIndex}`} className="block text-sm font-medium mb-1">סוג השדה</label>
                          <select
                            id={`fieldType-${editingFieldIndex}`}
                            value={currentEditingField.type || 'text'}
                            onChange={(e) => {
                              const newType = e.target.value;
                              handleFieldChange(editingFieldIndex, 'type', newType);
                              // Update file-related fields when changing to file types
                              if (['file', 'image', 'signature'].includes(newType)) {
                                handleFieldChange(editingFieldIndex, 'file_types_accepted', getDefaultFileTypes(newType));
                                handleFieldChange(editingFieldIndex, 'max_file_size_mb', getDefaultMaxFileSize(newType));
                                handleFieldChange(editingFieldIndex, 'max_files', getDefaultMaxFiles(newType));
                              }
                            }}
                            className="clay-input w-full"
                          >
                            {fieldTypes.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                          </select>
                        </div>

                        {/* File upload settings for file, image, and signature fields */}
                        {['file', 'image', 'signature'].includes(currentEditingField.type) && (
                          <div className="clay-card bg-green-50 p-4 rounded-lg border border-green-200">
                            <h5 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                              <Paperclip className="w-4 h-4" />
                              הגדרות העלאת קבצים
                            </h5>
                            
                            <div className="space-y-3">
                              <div>
                                <label htmlFor={`fileTypes-${editingFieldIndex}`} className="block text-xs font-medium mb-1">סוגי קבצים מותרים</label>
                                <Input
                                  id={`fileTypes-${editingFieldIndex}`}
                                  value={currentEditingField.file_types_accepted || ''}
                                  onChange={(e) => handleFieldChange(editingFieldIndex, 'file_types_accepted', e.target.value)}
                                  className="clay-input text-sm"
                                  placeholder={currentEditingField.type === 'image' ? 'image/*' : '.pdf,.doc,.docx'}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  {currentEditingField.type === 'image' && 'לדוגמה: image/*, image/jpeg, image/png'}
                                  {currentEditingField.type === 'signature' && 'לדוגמה: image/png, image/jpeg'}
                                  {currentEditingField.type === 'file' && 'לדוגמה: .pdf,.doc,.docx,.jpg,.png'}
                                </p>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label htmlFor={`maxFileSize-${editingFieldIndex}`} className="block text-xs font-medium mb-1">גודל מקסימלי (MB)</label>
                                  <Input
                                    id={`maxFileSize-${editingFieldIndex}`}
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={currentEditingField.max_file_size_mb || ''}
                                    onChange={(e) => handleFieldChange(editingFieldIndex, 'max_file_size_mb', parseInt(e.target.value) || undefined)}
                                    className="clay-input text-sm"
                                    placeholder={currentEditingField.type === 'signature' ? '2' : '10'}
                                  />
                                </div>
                                
                                <div>
                                  <label htmlFor={`maxFiles-${editingFieldIndex}`} className="block text-xs font-medium mb-1">מספר קבצים מקסימלי</label>
                                  <Input
                                    id={`maxFiles-${editingFieldIndex}`}
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={currentEditingField.max_files || ''}
                                    onChange={(e) => handleFieldChange(editingFieldIndex, 'max_files', parseInt(e.target.value) || undefined)}
                                    className="clay-input text-sm"
                                    placeholder={currentEditingField.type === 'signature' ? '1' : '5'}
                                  />
                                </div>
                              </div>
                              
                              {currentEditingField.type === 'signature' && (
                                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                  <p className="text-xs text-blue-700 mb-2">
                                    <strong>שדה חתימה דיגיטלית:</strong>
                                  </p>
                                  <ul className="text-xs text-blue-600 space-y-1">
                                    <li>• המשתמש יוכל לצייר חתימה באמצעות עכבר או מגע</li>
                                    <li>• החתימה תישמר כתמונה PNG</li>
                                    <li>• מומלץ להגביל לקובץ אחד בלבד</li>
                                    <li>• גודל מומלץ: עד 2MB</li>
                                  </ul>
                                </div>
                              )}
                              
                              {currentEditingField.type === 'image' && (
                                <div className="bg-purple-50 p-3 rounded border border-purple-200">
                                  <p className="text-xs text-purple-700 mb-2">
                                    <strong>שדה תמונות:</strong>
                                  </p>
                                  <ul className="text-xs text-purple-600 space-y-1">
                                    <li>• המשתמש יוכל להעלות תמונות מהמחשב או לצלם</li>
                                    <li>• תמיכה בפורמטים: JPG, PNG, GIF, WebP</li>
                                    <li>• אפשרות לתצוגה מקדימה לפני שליחה</li>
                                    <li>• גודל מומלץ: עד 10MB לתמונה</li>
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div>
                          <label htmlFor={`fieldPlaceholder-${editingFieldIndex}`} className="block text-sm font-medium mb-1">טקסט מציין מיקום (Placeholder)</label>
                          <Input 
                            id={`fieldPlaceholder-${editingFieldIndex}`} 
                            value={currentEditingField.placeholder || ''} 
                            onChange={(e) => handleFieldChange(editingFieldIndex, 'placeholder', e.target.value)} 
                            className="clay-input" 
                            placeholder={getPlaceholderExample(currentEditingField.type)}
                          />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`fieldRequired-${currentEditingField.id}`}
                            checked={currentEditingField.is_required || false}
                            onCheckedChange={(checked) => handleFieldChange(editingFieldIndex, 'is_required', !!checked)}
                          />
                          <label htmlFor={`fieldRequired-${currentEditingField.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            שדה חובה
                          </label>
                        </div>

                        {/* Options for select/radio/checkbox */}
                        {['select', 'radio', 'checkbox'].includes(currentEditingField.type) && (
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-sm font-medium">אפשרויות</label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addOption(editingFieldIndex)}
                                className="clay-button"
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                הוסף אפשרות
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {(currentEditingField.options || []).map((option, optionIndex) => (
                                <div key={optionIndex} className="flex gap-2 items-center">
                                  <Input
                                    placeholder="ערך"
                                    value={option.value || ''}
                                    onChange={(e) => updateOption(editingFieldIndex, optionIndex, 'value', e.target.value)}
                                    className="clay-input flex-1"
                                  />
                                  <Input
                                    placeholder="תווית"
                                    value={option.label || ''}
                                    onChange={(e) => updateOption(editingFieldIndex, optionIndex, 'label', e.target.value)}
                                    className="clay-input flex-1"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeOption(editingFieldIndex, optionIndex)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Custom data type selector */}
                        {currentEditingField.type === 'custom_data_selector' && (
                          <div>
                            <label htmlFor={`fieldLinkedDataType-${editingFieldIndex}`} className="block text-sm font-medium mb-1">קשר לסוג דאטה מותאם</label>
                            <select
                              id={`fieldLinkedDataType-${editingFieldIndex}`}
                              value={currentEditingField.linked_data_type_slug || ''}
                              onChange={(e) => handleFieldChange(editingFieldIndex, 'linked_data_type_slug', e.target.value)}
                              className="clay-input w-full"
                            >
                              <option value="">בחר סוג דאטה...</option>
                              {linkableDataTypes.map(cdt => (
                                <option key={cdt.slug} value={cdt.slug}>{cdt.name} ({cdt.slug})</option>
                              ))}
                            </select>
                            {linkableDataTypes.length === 0 && (
                              <p className="text-xs text-yellow-600 mt-1">לא נמצאו סוגי דאטה מותאמים. הגדר אותם תחילה בדף "ניהול סוגי דאטה".</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">זה יאפשר למשתמש לבחור רשומה קיימת מסוג דאטה זה.</p>
                          </div>
                        )}

                        {/* Custom data record selector with configuration */}
                        {currentEditingField.type === 'custom_data_record_selector' && (
                          <div className="space-y-4">
                            <div>
                              <label htmlFor={`fieldLinkedDataType-${editingFieldIndex}`} className="block text-sm font-medium mb-1">קשר לסוג דאטה מותאם</label>
                              <select
                                id={`fieldLinkedDataType-${editingFieldIndex}`}
                                value={currentEditingField.linked_data_type_slug || ''}
                                onChange={(e) => handleFieldChange(editingFieldIndex, 'linked_data_type_slug', e.target.value)}
                                className="clay-input w-full"
                              >
                                <option value="">בחר סוג דאטה...</option>
                                {linkableDataTypes.map(cdt => (
                                  <option key={cdt.slug} value={cdt.slug}>{cdt.name} ({cdt.slug})</option>
                                ))}
                              </select>
                              <p className="text-xs text-gray-500 mt-1">זה יאפשר למשתמש לבחור רשומה קיימת או ליצור חדשה מסוג דאטה זה.</p>
                            </div>

                            {currentEditingField.linked_data_type_slug && (
                              <div className="clay-card bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h5 className="font-medium text-blue-800 mb-3">הגדרות יצירת רשומה חדשה</h5>
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-xs font-medium mb-1">שדות שיוצגו בטופס יצירה</label>
                                    <Textarea
                                      value={(currentEditingField.custom_data_fields_config?.enabled_fields || []).join(', ')}
                                      onChange={(e) => {
                                        const fields = e.target.value.split(',').map(f => f.trim()).filter(f => f);
                                        handleFieldChange(editingFieldIndex, 'custom_data_fields_config', {
                                          ...currentEditingField.custom_data_fields_config,
                                          enabled_fields: fields
                                        });
                                      }}
                                      className="clay-input text-sm"
                                      placeholder="field1, field2, field3 (השאר ריק לכל השדות)"
                                      rows={2}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium mb-1">שדות חובה ביצירה</label>
                                    <Textarea
                                      value={(currentEditingField.custom_data_fields_config?.required_fields || []).join(', ')}
                                      onChange={(e) => {
                                        const fields = e.target.value.split(',').map(f => f.trim()).filter(f => f);
                                        handleFieldChange(editingFieldIndex, 'custom_data_fields_config', {
                                          ...currentEditingField.custom_data_fields_config,
                                          required_fields: fields
                                        });
                                      }}
                                      className="clay-input text-sm"
                                      placeholder="field1, field2"
                                      rows={2}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-gray-500">
                      <Settings className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium mb-2">בחר שדה לעריכה</h3>
                      <p>לחץ על שדה מהרשימה משמאל כדי לערוך את ההגדרות שלו.</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>

            {/* Mobile Layout */}
            <div className="block md:hidden w-full overflow-hidden">
              {/* Mobile Settings Panel */}
              {mobileActivePanel === 'settings' && (
                <div className="h-full overflow-y-auto">
                  <div className="p-4 space-y-4">
                    <div>
                      <h3 className="text-lg font-medium mb-4">הגדרות טופס</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">כותרת הטופס *</label>
                          <Input
                            value={currentTemplate.title}
                            onChange={(e) => setCurrentTemplate(prev => ({ ...prev, title: e.target.value }))}
                            className="clay-input"
                            placeholder="הכנס כותרת לטופס"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">תיאור</label>
                          <Textarea
                            value={currentTemplate.description}
                            onChange={(e) => setCurrentTemplate(prev => ({ ...prev, description: e.target.value }))}
                            className="clay-input"
                            placeholder="תיאור קצר של מטרת הטופס"
                            rows={3}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">קטגוריה</label>
                          <Input
                            value={currentTemplate.category}
                            onChange={(e) => setCurrentTemplate(prev => ({ ...prev, category: e.target.value }))}
                            className="clay-input"
                            placeholder="לדוגמה: אבטחה, תחזוקה"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">סטטוס</label>
                          <Select 
                            value={currentTemplate.status} 
                            onValueChange={(value) => setCurrentTemplate(prev => ({ ...prev, status: value }))}
                          >
                            <SelectTrigger className="clay-input">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">טיוטה</SelectItem>
                              <SelectItem value="active">פעיל</SelectItem>
                              <SelectItem value="archived">בארכיון</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Add Field Section */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">הוספת שדות</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {fieldTypes.map(fieldType => (
                          <Button
                            key={fieldType.value}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              addField(fieldType.value);
                              setMobileActivePanel('editor');
                            }}
                            className="clay-button justify-start text-sm"
                          >
                            {fieldType.icon}
                            <span className="mr-2">{fieldType.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile Fields List Panel */}
              {mobileActivePanel === 'fields' && (
                <div className="h-full overflow-y-auto">
                  <div className="p-4">
                    <h3 className="text-lg font-medium mb-4">שדות בטופס ({currentTemplate.fields.length})</h3>
                    {currentTemplate.fields.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Settings className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">אין שדות בטופס</p>
                        <p className="text-xs">עבור לטאב הגדרות כדי להוסיף שדות</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {currentTemplate.fields.map((field, index) => (
                          <div key={field.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                            <div className="flex items-center space-x-3 space-x-reverse">
                              <div>
                                <p className="font-medium text-sm">{field.label || `שדה ${index + 1}`}</p>
                                <p className="text-xs text-gray-500">
                                  {fieldTypes.find(ft => ft.value === field.type)?.label || field.type}
                                  {field.is_required && <span className="text-red-500"> *</span>}
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-2 space-x-reverse">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  setEditingFieldIndex(index);
                                  setMobileActivePanel('editor');
                                }}
                                className="text-xs"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => removeField(index)} 
                                className="text-red-600 text-xs"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mobile Field Editor Panel */}
              {mobileActivePanel === 'editor' && currentEditingField && (
                <div className="h-full overflow-y-auto">
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">עריכת שדה</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingFieldIndex(null);
                          setMobileActivePanel('fields');
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">מזהה שדה (ID)</label>
                        <Input
                          value={currentEditingField.id || ''}
                          onChange={(e) => handleFieldChange(editingFieldIndex, 'id', e.target.value)}
                          className="clay-input"
                          placeholder="באנגלית, ללא רווחים"
                        />
                        <p className="text-xs text-gray-500 mt-1">חובה. ייחודי לטופס.</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">תווית השדה</label>
                        <Input 
                          value={currentEditingField.label || ''} 
                          onChange={(e) => handleFieldChange(editingFieldIndex, 'label', e.target.value)} 
                          className="clay-input" 
                          required 
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">סוג השדה</label>
                        <select
                          value={currentEditingField.type || 'text'}
                          onChange={(e) => {
                            const newType = e.target.value;
                            handleFieldChange(editingFieldIndex, 'type', newType);
                            // Update file-related fields when changing to file types
                            if (['file', 'image', 'signature'].includes(newType)) {
                              handleFieldChange(editingFieldIndex, 'file_types_accepted', getDefaultFileTypes(newType));
                              handleFieldChange(editingFieldIndex, 'max_file_size_mb', getDefaultMaxFileSize(newType));
                              handleFieldChange(editingFieldIndex, 'max_files', getDefaultMaxFiles(newType));
                            }
                          }}
                          className="clay-input w-full"
                        >
                          {fieldTypes.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                        </select>
                      </div>

                      {/* File upload settings for mobile */}
                      {['file', 'image', 'signature'].includes(currentEditingField.type) && (
                        <div className="clay-card bg-green-50 p-3 rounded-lg border border-green-200">
                          <h5 className="font-medium text-green-800 mb-3 flex items-center gap-2 text-sm">
                            <Paperclip className="w-4 h-4" />
                            הגדרות העלאת קבצים
                          </h5>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium mb-1">סוגי קבצים מותרים</label>
                              <Input
                                value={currentEditingField.file_types_accepted || ''}
                                onChange={(e) => handleFieldChange(editingFieldIndex, 'file_types_accepted', e.target.value)}
                                className="clay-input text-sm"
                                placeholder={currentEditingField.type === 'image' ? 'image/*' : '.pdf,.doc,.docx'}
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium mb-1">גודל מקסימלי (MB)</label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={currentEditingField.max_file_size_mb || ''}
                                  onChange={(e) => handleFieldChange(editingFieldIndex, 'max_file_size_mb', parseInt(e.target.value) || undefined)}
                                  className="clay-input text-sm"
                                  placeholder={currentEditingField.type === 'signature' ? '2' : '10'}
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium mb-1">מספר קבצים מקסימלי</label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="20"
                                  value={currentEditingField.max_files || ''}
                                  onChange={(e) => handleFieldChange(editingFieldIndex, 'max_files', parseInt(e.target.value) || undefined)}
                                  className="clay-input text-sm"
                                  placeholder={currentEditingField.type === 'signature' ? '1' : '5'}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-1">טקסט מציין מיקום</label>
                        <Input 
                          value={currentEditingField.placeholder || ''} 
                          onChange={(e) => handleFieldChange(editingFieldIndex, 'placeholder', e.target.value)} 
                          className="clay-input" 
                          placeholder={getPlaceholderExample(currentEditingField.type)}
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`fieldRequired-${currentEditingField.id}`}
                          checked={currentEditingField.is_required || false}
                          onCheckedChange={(checked) => handleFieldChange(editingFieldIndex, 'is_required', !!checked)}
                        />
                        <label htmlFor={`fieldRequired-${currentEditingField.id}`} className="text-sm font-medium">
                          שדה חובה
                        </label>
                      </div>

                      {/* Options for select/radio/checkbox - Mobile */}
                      {['select', 'radio', 'checkbox'].includes(currentEditingField.type) && (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium">אפשרויות</label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addOption(editingFieldIndex)}
                              className="clay-button text-xs"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              הוסף
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {(currentEditingField.options || []).map((option, optionIndex) => (
                              <div key={optionIndex} className="space-y-2 p-2 border rounded">
                                <Input
                                  placeholder="ערך"
                                  value={option.value || ''}
                                  onChange={(e) => updateOption(editingFieldIndex, optionIndex, 'value', e.target.value)}
                                  className="clay-input text-sm"
                                />
                                <Input
                                  placeholder="תווית"
                                  value={option.label || ''}
                                  onChange={(e) => updateOption(editingFieldIndex, optionIndex, 'label', e.target.value)}
                                  className="clay-input text-sm"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeOption(editingFieldIndex, optionIndex)}
                                  className="text-red-600 text-xs w-full"
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  הסר אפשרות
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Custom data type selector - Mobile */}
                      {currentEditingField.type === 'custom_data_selector' && (
                        <div>
                          <label className="block text-sm font-medium mb-1">קשר לסוג דאטה מותאם</label>
                          <select
                            value={currentEditingField.linked_data_type_slug || ''}
                            onChange={(e) => handleFieldChange(editingFieldIndex, 'linked_data_type_slug', e.target.value)}
                            className="clay-input w-full"
                          >
                            <option value="">בחר סוג דאטה...</option>
                            {linkableDataTypes.map(cdt => (
                              <option key={cdt.slug} value={cdt.slug}>{cdt.name} ({cdt.slug})</option>
                            ))}
                          </select>
                          {linkableDataTypes.length === 0 && (
                            <p className="text-xs text-yellow-600 mt-1">לא נמצאו סוגי דאטה מותאמים.</p>
                          )}
                        </div>
                      )}

                      {/* Custom data record selector - Mobile */}
                      {currentEditingField.type === 'custom_data_record_selector' && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">קשר לסוג דאטה מותאם</label>
                            <select
                              value={currentEditingField.linked_data_type_slug || ''}
                              onChange={(e) => handleFieldChange(editingFieldIndex, 'linked_data_type_slug', e.target.value)}
                              className="clay-input w-full"
                            >
                              <option value="">בחר סוג דאטה...</option>
                              {linkableDataTypes.map(cdt => (
                                <option key={cdt.slug} value={cdt.slug}>{cdt.name} ({cdt.slug})</option>
                              ))}
                            </select>
                          </div>

                          {currentEditingField.linked_data_type_slug && (
                            <div className="clay-card bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <h5 className="font-medium text-blue-800 mb-3 text-sm">הגדרות יצירת רשומה חדשה</h5>
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-medium mb-1">שדות שיוצגו בטופס יצירה</label>
                                  <Textarea
                                    value={(currentEditingField.custom_data_fields_config?.enabled_fields || []).join(', ')}
                                    onChange={(e) => {
                                      const fields = e.target.value.split(',').map(f => f.trim()).filter(f => f);
                                      handleFieldChange(editingFieldIndex, 'custom_data_fields_config', {
                                        ...currentEditingField.custom_data_fields_config,
                                        enabled_fields: fields
                                      });
                                    }}
                                    className="clay-input text-sm"
                                    placeholder="field1, field2, field3"
                                    rows={2}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1">שדות חובה ביצירה</label>
                                  <Textarea
                                    value={(currentEditingField.custom_data_fields_config?.required_fields || []).join(', ')}
                                    onChange={(e) => {
                                      const fields = e.target.value.split(',').map(f => f.trim()).filter(f => f);
                                      handleFieldChange(editingFieldIndex, 'custom_data_fields_config', {
                                        ...currentEditingField.custom_data_fields_config,
                                        required_fields: fields
                                      });
                                    }}
                                    className="clay-input text-sm"
                                    placeholder="field1, field2"
                                    rows={2}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-3 md:p-6 pt-2 md:pt-4 border-t shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowTemplateForm(false);
                resetForm();
                setMobileActivePanel('settings');
              }}
              className="clay-button text-sm"
            >
              ביטול
            </Button>
            <Button
              type="button"
              onClick={handleTemplateSubmit}
              className="clay-button bg-purple-100 text-purple-700 text-sm"
            >
              <Save className="w-3 h-3 md:w-4 md:h-4 mr-2" />
              {editingTemplate ? 'עדכן טופס' : 'שמור טופס'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
