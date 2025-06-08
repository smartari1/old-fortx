
import React, { useState, useEffect } from 'react';
import { Procedure } from '@/api/entities';
import { FormTemplate } from '@/api/entities';
import { CustomDataType } from '@/api/entities';
import { Role } from '@/api/entities'; // NEW: Import Role entity
import { 
  FileText, 
  Plus, 
  Edit2, 
  Trash2, 
  Settings, 
  Save, 
  X,
  List,
  CheckSquare,
  ClipboardEdit,
  ArrowUp,
  ArrowDown,
  Copy,
  Info,
  Database,
  Circle 
} from 'lucide-react';
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
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const stepTypes = [
  { value: 'checkbox', label: 'משימה בסיסית (checkbox)', icon: <CheckSquare className="w-4 h-4" /> },
  { value: 'text', label: 'הזנת טקסט חופשי', icon: <FileText className="w-4 h-4" /> },
  { value: 'selection', label: 'בחירה מתוך אופציות', icon: <Circle className="w-4 h-4" /> },
  { value: 'document', label: 'הצגת מסמך', icon: <FileText className="w-4 h-4" /> },
  { value: 'form', label: 'מילוי טופס מובנה', icon: <ClipboardEdit className="w-4 h-4" /> },
  { value: 'custom_data_record_selection', label: 'בחירת/יצירת רשומת דאטה', icon: <Database className="w-4 h-4" /> },
];

export default function ProceduresPage() {
  const [procedures, setProcedures] = useState([]);
  const [formTemplates, setFormTemplates] = useState([]);
  const [customDataTypes, setCustomDataTypes] = useState([]);
  const [roles, setRoles] = useState([]); // NEW: Load roles for permissions
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showForm, setShowForm] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState(null);
  const [currentProcedure, setCurrentProcedure] = useState({
    name: '',
    description: '',
    steps: []
  });

  // Load data function
  const loadData = async () => {
    try {
      setLoading(true);
      const [proceduresData, formTemplatesData, customTypesData, rolesData] = await Promise.all([
        Procedure.list(),
        FormTemplate.list(),
        CustomDataType.list(),
        Role.list()
      ]);
      
      setProcedures(proceduresData);
      setFormTemplates(formTemplatesData.filter(ft => ft.status === 'active')); // Only active forms
      setCustomDataTypes(customTypesData || []);
      setRoles(rolesData || []);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("שגיאה בטעינת נתונים: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setCurrentProcedure({
      name: '',
      description: '',
      steps: []
    });
    setEditingProcedure(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentProcedure(prev => ({ ...prev, [name]: value }));
  };

  const addStep = () => {
    const newStep = {
      step_number: currentProcedure.steps.length + 1,
      title: '',
      description: '',
      is_required: false,
      step_type: 'checkbox',
      form_id: '',
      document_url: '',
      target_data_type_slug: '',
      selection_options: [],
      allow_multiple_executions: false,
      allowed_roles: [], // NEW: Empty means all roles can execute
      role_restriction_enabled: false // NEW: Enable/disable role restrictions for this step
    };
    setCurrentProcedure(prev => ({ ...prev, steps: [...prev.steps, newStep] }));
  };

  const removeStep = (index) => {
    const updatedSteps = currentProcedure.steps.filter((_, i) => i !== index);
    const renumberedSteps = updatedSteps.map((step, i) => ({ ...step, step_number: i + 1 }));
    setCurrentProcedure(prev => ({ ...prev, steps: renumberedSteps }));
  };

  const moveStep = (index, offset) => {
    const steps = [...currentProcedure.steps];
    const newIndex = index + offset;
    
    if (newIndex < 0 || newIndex >= steps.length) return;
    
    [steps[index], steps[newIndex]] = [steps[newIndex], steps[index]];
    
    const renumberedSteps = steps.map((step, i) => ({ ...step, step_number: i + 1 }));
    setCurrentProcedure(prev => ({ ...prev, steps: renumberedSteps }));
  };

  const updateStep = (index, property, value) => {
    const updatedSteps = [...currentProcedure.steps];
    updatedSteps[index] = { ...updatedSteps[index], [property]: value };
    
    if (property === 'step_type') {
      if (value !== 'form') {
        updatedSteps[index].form_id = '';
      }
      if (value !== 'document') {
        updatedSteps[index].document_url = '';
      }
      if (value !== 'custom_data_record_selection') {
        updatedSteps[index].target_data_type_slug = '';
      }
      if (value !== 'selection') {
        updatedSteps[index].selection_options = [];
      }
    }
    
    setCurrentProcedure(prev => ({ ...prev, steps: updatedSteps }));
  };

  const addSelectionOption = (stepIndex) => {
    const updatedSteps = [...currentProcedure.steps];
    if (!updatedSteps[stepIndex].selection_options) {
      updatedSteps[stepIndex].selection_options = [];
    }
    updatedSteps[stepIndex].selection_options.push({
      id: `option_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: '',
      value: '',
      description: ''
    });
    setCurrentProcedure(prev => ({ ...prev, steps: updatedSteps }));
  };

  const removeSelectionOption = (stepIndex, optionIndex) => {
    const updatedSteps = [...currentProcedure.steps];
    updatedSteps[stepIndex].selection_options = updatedSteps[stepIndex].selection_options.filter((_, i) => i !== optionIndex);
    setCurrentProcedure(prev => ({ ...prev, steps: updatedSteps }));
  };

  const updateSelectionOption = (stepIndex, optionIndex, field, value) => {
    const updatedSteps = [...currentProcedure.steps];
    const newOptions = [...(updatedSteps[stepIndex].selection_options || [])];
    newOptions[optionIndex] = {
      ...newOptions[optionIndex],
      [field]: value
    };
    updatedSteps[stepIndex].selection_options = newOptions;
    setCurrentProcedure(prev => ({ ...prev, steps: updatedSteps }));
  };

  // NEW: Function to toggle role in allowed_roles array
  const toggleAllowedRole = (stepIndex, roleId) => {
    const updatedSteps = [...currentProcedure.steps];
    const step = updatedSteps[stepIndex];
    
    if (!step.allowed_roles) {
      step.allowed_roles = [];
    }
    
    if (step.allowed_roles.includes(roleId)) {
      step.allowed_roles = step.allowed_roles.filter(id => id !== roleId);
    } else {
      step.allowed_roles.push(roleId);
    }
    
    setCurrentProcedure(prev => ({ ...prev, steps: updatedSteps }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentProcedure.name.trim()) {
      alert("שם הסדר פעולות הוא שדה חובה.");
      return;
    }

    try {
      setLoading(true);
      if (editingProcedure) {
        await Procedure.update(editingProcedure.id, currentProcedure);
      } else {
        await Procedure.create(currentProcedure);
      }
      await loadData(); // Re-fetch all data after save
      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error("Error saving procedure:", err);
      alert("שגיאה בשמירת סדר הפעולות: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (procedure) => {
    setEditingProcedure(procedure);
    setCurrentProcedure(procedure);
    setShowForm(true);
  };

  const handleDelete = async (procedureId) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק סדר פעולות זה?")) {
      try {
        setLoading(true);
        await Procedure.delete(procedureId);
        await loadData(); // Re-fetch all data after delete
      } catch (err) {
        console.error("Error deleting procedure:", err);
        alert("שגיאה במחיקת סדר הפעולות: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const duplicateProcedure = async (procedure) => {
    if (window.confirm(`האם אתה בטוח שברצונך לשכפל את סדר הפעולות "${procedure.name}"?`)) {
      try {
        setLoading(true);
        const { id, created_date, updated_date, ...procedureDataToDuplicate } = procedure;
        const duplicatedProcedure = {
          ...procedureDataToDuplicate,
          name: `${procedure.name} (עותק)`
        };
        await Procedure.create(duplicatedProcedure);
        await loadData(); // Re-fetch all data after duplication
      } catch (err) {
        console.error("Error duplicating procedure:", err);
        alert("שגיאה בשכפול סדר הפעולות: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const renderStepEditor = (step, stepIndex) => {
    const stepType = stepTypes.find(st => st.value === step.step_type) || stepTypes[0];

    return (
      <Card key={stepIndex} className="clay-card mb-3">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">
              שלב {step.step_number || stepIndex + 1}: {step.title || 'ללא כותרת'}
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => moveStep(stepIndex, -1)}
                disabled={stepIndex === 0}
                className="clay-button"
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => moveStep(stepIndex, 1)}
                disabled={stepIndex === currentProcedure.steps.length - 1}
                className="clay-button"
              >
                <ArrowDown className="w-4 h-4" />
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => removeStep(stepIndex)}
                className="clay-button text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`step-title-${stepIndex}`}>כותרת השלב</Label>
              <Input
                id={`step-title-${stepIndex}`}
                value={step.title || ''}
                onChange={(e) => updateStep(stepIndex, 'title', e.target.value)}
                className="clay-input"
                placeholder="כותרת השלב..."
              />
            </div>
            <div>
              <Label htmlFor={`step-type-${stepIndex}`}>סוג השלב</Label>
              <Select 
                value={step.step_type || 'checkbox'} 
                onValueChange={(value) => updateStep(stepIndex, 'step_type', value)}
              >
                <SelectTrigger id={`step-type-${stepIndex}`} className="clay-input">
                  <SelectValue placeholder="בחר סוג שלב" />
                </SelectTrigger>
                <SelectContent>
                  {stepTypes.map(st => (
                    <SelectItem key={st.value} value={st.value}>
                      <div className="flex items-center gap-2">
                        {st.icon} {st.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor={`step-description-${stepIndex}`}>תיאור השלב</Label>
            <Textarea
              id={`step-description-${stepIndex}`}
              value={step.description || ''}
              onChange={(e) => updateStep(stepIndex, 'description', e.target.value)}
              className="clay-input h-20"
              placeholder="תיאור מפורט של השלב..."
            />
          </div>

          {/* NEW: Role Permissions Section */}
          <div className="border rounded-lg p-3 bg-amber-50">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium text-amber-800">הרשאות ביצוע השלב</Label>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id={`step-role-restriction-${stepIndex}`}
                  checked={step.role_restriction_enabled || false}
                  onCheckedChange={(checked) => updateStep(stepIndex, 'role_restriction_enabled', checked)}
                />
                <Label htmlFor={`step-role-restriction-${stepIndex}`} className="text-sm text-amber-700">
                  הגבל לתפקידים מסוימים
                </Label>
              </div>
            </div>
            
            {step.role_restriction_enabled ? (
              <div>
                <p className="text-xs text-amber-700 mb-2">בחר את התפקידים שיכולים לבצע שלב זה:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {roles.length === 0 && (
                    <p className="text-sm text-gray-500 col-span-full">אין תפקידים זמינים במערכת.</p>
                  )}
                  {roles.map(role => (
                    <div key={role.id} className="flex items-center space-x-2 space-x-reverse p-2 bg-white rounded border">
                      <Checkbox
                        id={`step-${stepIndex}-role-${role.id}`}
                        checked={(step.allowed_roles || []).includes(role.id)}
                        onCheckedChange={() => toggleAllowedRole(stepIndex, role.id)}
                      />
                      <Label htmlFor={`step-${stepIndex}-role-${role.id}`} className="text-xs cursor-pointer">
                        {role.name}
                      </Label>
                    </div>
                  ))}
                </div>
                {(step.allowed_roles || []).length === 0 && step.role_restriction_enabled && (
                  <p className="text-xs text-red-600 mt-1">יש לבחור לפחות תפקיד אחד כדי שהשלב יהיה ניתן לביצוע.</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-amber-700">כל התפקידים יכולים לבצע שלב זה (ברירת מחדל)</p>
            )}
          </div>

          {step.step_type === 'selection' && (
            <div>
              <Label className="block text-sm font-medium mb-2">אופציות לבחירה</Label>
              <div className="space-y-3">
                {(step.selection_options || []).map((option, optionIndex) => (
                  <div key={option.id || optionIndex} className="p-3 border rounded-lg bg-blue-50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">אופציה {optionIndex + 1}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeSelectionOption(stepIndex, optionIndex)}
                        className="clay-button text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Input
                        placeholder="תווית האופציה (מה שיראה המשתמש)"
                        value={option.label || ''}
                        onChange={(e) => updateSelectionOption(stepIndex, optionIndex, 'label', e.target.value)}
                        className="clay-input text-sm"
                      />
                      <Input
                        placeholder="ערך האופציה (לשמירה במערכת)"
                        value={option.value || ''}
                        onChange={(e) => updateSelectionOption(stepIndex, optionIndex, 'value', e.target.value)}
                        className="clay-input text-sm"
                      />
                    </div>
                    <Input
                      placeholder="תיאור נוסף (אופציונלי)"
                      value={option.description || ''}
                      onChange={(e) => updateSelectionOption(stepIndex, optionIndex, 'description', e.target.value)}
                      className="clay-input text-sm mt-2"
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addSelectionOption(stepIndex)}
                  className="clay-button bg-blue-100 text-blue-700 hover:bg-blue-200"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  הוסף אופציה
                </Button>
                {(step.selection_options || []).length === 0 && (
                  <p className="text-sm text-gray-500 italic mt-2">לא הוגדרו אופציות. הוסף לפחות אופציה אחת.</p>
                )}
              </div>
            </div>
          )}

          {step.step_type === 'form' && (
            <div>
              <Label htmlFor={`step-form-${stepIndex}`}>טופס מקושר</Label>
              <Select 
                value={step.form_id || ''} 
                onValueChange={(value) => updateStep(stepIndex, 'form_id', value)}
              >
                <SelectTrigger id={`step-form-${stepIndex}`} className="clay-input">
                  <SelectValue placeholder="בחר טופס..." />
                </SelectTrigger>
                <SelectContent>
                  {formTemplates.length === 0 && (
                      <p className="p-2 text-sm text-gray-500">אין טפסים זמינים</p>
                  )}
                  {formTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.title} ({template.category || 'ללא קטגוריה'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
               {formTemplates.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">לא נמצאו טפסים פעילים. צור טופס חדש בבונה הטפסים.</p>
              )}
            </div>
          )}

          {step.step_type === 'document' && (
            <div>
              <Label htmlFor={`step-document-${stepIndex}`}>קישור למסמך</Label>
              <Input
                id={`step-document-${stepIndex}`}
                value={step.document_url || ''}
                onChange={(e) => updateStep(stepIndex, 'document_url', e.target.value)}
                className="clay-input"
                placeholder="https://example.com/document.pdf"
              />
            </div>
          )}

          {step.step_type === 'custom_data_record_selection' && (
            <div>
              <Label htmlFor={`step-custom-data-type-${stepIndex}`}>בחר סוג דאטה לקישור</Label>
              <Select 
                value={step.target_data_type_slug || ''} 
                onValueChange={(value) => updateStep(stepIndex, 'target_data_type_slug', value)}
              >
                <SelectTrigger id={`step-custom-data-type-${stepIndex}`} className="clay-input">
                  <SelectValue placeholder="בחר סוג דאטה..." />
                </SelectTrigger>
                <SelectContent>
                  {customDataTypes.length === 0 && (
                      <p className="p-2 text-sm text-gray-500">לא מוגדרים סוגי דאטה</p>
                  )}
                  {customDataTypes.map(cdt => (
                    <SelectItem key={cdt.slug} value={cdt.slug}>
                      {cdt.name} ({cdt.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
               {customDataTypes.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">לא נמצאו סוגי דאטה. הגדר סוגי דאטה בדף "ניהול סוגי דאטה".</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id={`step-required-${stepIndex}`}
                checked={step.is_required || false}
                onCheckedChange={(checked) => updateStep(stepIndex, 'is_required', checked)}
              />
              <Label htmlFor={`step-required-${stepIndex}`}>שלב חובה</Label>
            </div>
            
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id={`step-multiple-${stepIndex}`}
                checked={step.allow_multiple_executions || false}
                onCheckedChange={(checked) => updateStep(stepIndex, 'allow_multiple_executions', checked)}
              />
              <Label htmlFor={`step-multiple-${stepIndex}`}>אפשר ביצוע מרובה</Label>
            </div>
          </div>

          {step.allow_multiple_executions && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">ביצוע מרובה</span>
              </div>
              <p className="text-xs text-blue-700">
                שלב זה יכול להתבצע מספר פעמים במהלך אותו אירוע. המשתמש יוכל לחזור ולבצע את השלב שוב לאחר שהשלים אותו פעם ראשונה.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading && !procedures.length) {
    return <div className="clay-card bg-white p-8 text-center">
             <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
             <p className="text-gray-600">טוען נהלים...</p>
           </div>;
  }
  
  if (error) {
    return <div className="clay-card bg-red-50 p-4 text-red-700 text-center">{error}</div>;
  }

  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <List className="w-8 h-8 ml-3 text-blue-500" />
          ניהול סדרי פעולות
        </h1>
        <p className="text-gray-600">יצירה, עריכה וניהול של נהלי עבודה וטיפול.</p>
      </div>

      {!showForm && (
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="clay-button flex items-center gap-2 bg-blue-100 text-blue-700 font-medium mb-6">
          <Plus className="w-4 h-4" />
          סדר פעולות חדש
        </Button>
      )}

      {showForm ? (
        <Card className="clay-card mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl text-blue-700">
                {editingProcedure ? 'עריכת' : 'יצירת'} סדר פעולות
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); resetForm(); }}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <fieldset className="clay-card bg-blue-50 p-4 rounded-lg">
                <legend className="text-lg font-semibold mb-3 text-blue-600">הגדרות כלליות</legend>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="procedureName" className="block text-sm font-medium mb-1">שם סדר הפעולות</label>
                    <Input id="procedureName" name="name" value={currentProcedure.name} onChange={handleInputChange} className="clay-input" required />
                  </div>
                  <div>
                    <label htmlFor="procedureDescription" className="block text-sm font-medium mb-1">תיאור סדר הפעולות</label>
                    <Textarea id="procedureDescription" name="description" value={currentProcedure.description} onChange={handleInputChange} className="clay-input h-24" />
                  </div>
                </div>
              </fieldset>

              <fieldset className="clay-card bg-green-50 p-4 rounded-lg">
                <legend className="text-lg font-semibold mb-3 text-green-600 flex items-center">
                  <Settings className="w-5 h-5 mr-2"/>
                  שלבי סדר הפעולות
                </legend>
                
                {currentProcedure.steps.map((step, index) => (
                  renderStepEditor(step, index)
                ))}

                {currentProcedure.steps.length === 0 && (
                  <p className="text-center text-gray-500 py-4">אין שלבים בסדר הפעולות. לחץ למטה להוספת שלב חדש.</p>
                )}

                <div className="mt-4 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline"
                    className="clay-button bg-white hover:bg-green-100"
                    onClick={addStep}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    הוסף שלב חדש
                  </Button>
                </div>
              </fieldset>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="outline" className="clay-button" onClick={() => { setShowForm(false); resetForm(); }}>
                  <X className="w-4 h-4 mr-2" /> ביטול
                </Button>
                <Button type="submit" className="clay-button bg-blue-600 hover:bg-blue-700 text-white">
                  <Save className="w-4 h-4 mr-2" /> {editingProcedure ? 'שמור שינויים' : 'צור סדר פעולות'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {procedures.length === 0 && !loading && (
            <Card className="clay-card text-center p-8">
                <List className="w-16 h-16 mx-auto mb-4 text-gray-400"/>
                <h3 className="text-xl font-semibold text-gray-700">אין נהלים מוגדרים</h3>
                <p className="text-gray-500">לחץ על "סדר פעולות חדש" כדי להתחיל.</p>
            </Card>
          )}
          {procedures.map(procedure => (
            <Card key={procedure.id} className="clay-card">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl text-blue-700">{procedure.name}</CardTitle>
                    <CardDescription>{procedure.description || 'אין תיאור'}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(procedure)} title="ערוך">
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => duplicateProcedure(procedure)} title="שכפל">
                      <Copy className="w-4 h-4 text-purple-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(procedure.id)} title="מחק">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <p><strong className="font-medium">מספר שלבים:</strong> {procedure.steps?.length || 0}</p>
                  {procedure.steps && procedure.steps.some(s => s.step_type === 'form') && (
                    <p><strong className="font-medium">שלבים עם טפסים:</strong> {procedure.steps.filter(s => s.step_type === 'form').length}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
