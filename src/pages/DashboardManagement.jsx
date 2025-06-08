import React, { useState, useEffect } from 'react';
import { DashboardShortcut } from '@/api/entities';
import { Role } from '@/api/entities';
import { IncidentCategory } from '@/api/entities';
import { IncidentSubCategory } from '@/api/entities';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Monitor,
  AlertCircle,
  FileText,
  ExternalLink,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";

const iconOptions = [
  { value: 'Plus', label: 'Plus', icon: Plus },
  { value: 'AlertCircle', label: 'AlertCircle', icon: AlertCircle },
  { value: 'FileText', label: 'FileText', icon: FileText },
  { value: 'ExternalLink', label: 'ExternalLink', icon: ExternalLink }
];

const colorOptions = [
  { value: 'blue', label: 'כחול', className: 'bg-blue-100 text-blue-700' },
  { value: 'green', label: 'ירוק', className: 'bg-green-100 text-green-700' },
  { value: 'red', label: 'אדום', className: 'bg-red-100 text-red-700' },
  { value: 'yellow', label: 'צהוב', className: 'bg-yellow-100 text-yellow-700' },
  { value: 'purple', label: 'סגול', className: 'bg-purple-100 text-purple-700' },
  { value: 'orange', label: 'כתום', className: 'bg-orange-100 text-orange-700' },
  { value: 'gray', label: 'אפור', className: 'bg-gray-100 text-gray-700' }
];

export default function DashboardManagement() {
  const [shortcuts, setShortcuts] = useState([]);
  const [roles, setRoles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState(null);
  const [selectedRole, setSelectedRole] = useState('all');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_role_id: '',
    shortcut_type: 'create_incident',
    incident_category_id: '',
    incident_sub_category_id: '',
    report_type: '',
    custom_url: '',
    icon: 'Plus',
    color: 'blue',
    is_active: true,
    order: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [shortcutsData, rolesData, categoriesData, subcategoriesData] = await Promise.all([
        DashboardShortcut.list('-order'),
        Role.list(),
        IncidentCategory.list(),
        IncidentSubCategory.list()
      ]);
      
      setShortcuts(shortcutsData);
      setRoles(rolesData);
      setCategories(categoriesData);
      setSubcategories(subcategoriesData);
    } catch (error) {
      console.error("Error loading dashboard management data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingShortcut) {
        await DashboardShortcut.update(editingShortcut.id, formData);
      } else {
        await DashboardShortcut.create(formData);
      }
      await loadData();
      resetForm();
    } catch (error) {
      console.error("Error saving shortcut:", error);
      alert("שגיאה בשמירת הקיצור: " + error.message);
    }
  };

  const handleEdit = (shortcut) => {
    setFormData({
      title: shortcut.title || '',
      description: shortcut.description || '',
      target_role_id: shortcut.target_role_id || '',
      shortcut_type: shortcut.shortcut_type || 'create_incident',
      incident_category_id: shortcut.incident_category_id || '',
      incident_sub_category_id: shortcut.incident_sub_category_id || '',
      report_type: shortcut.report_type || '',
      custom_url: shortcut.custom_url || '',
      icon: shortcut.icon || 'Plus',
      color: shortcut.color || 'blue',
      is_active: shortcut.is_active !== undefined ? shortcut.is_active : true,
      order: shortcut.order || 0
    });
    setEditingShortcut(shortcut);
    setShowForm(true);
  };

  const handleDelete = async (shortcutId) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק קיצור זה?')) {
      try {
        await DashboardShortcut.delete(shortcutId);
        await loadData();
      } catch (error) {
        console.error("Error deleting shortcut:", error);
        alert("שגיאה במחיקת הקיצור: " + error.message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      target_role_id: '',
      shortcut_type: 'create_incident',
      incident_category_id: '',
      incident_sub_category_id: '',
      report_type: '',
      custom_url: '',
      icon: 'Plus',
      color: 'blue',
      is_active: true,
      order: 0
    });
    setEditingShortcut(null);
    setShowForm(false);
  };

  const moveShortcut = async (shortcutId, direction) => {
    const shortcut = shortcuts.find(s => s.id === shortcutId);
    if (!shortcut) return;

    const newOrder = direction === 'up' ? shortcut.order - 1 : shortcut.order + 1;
    try {
      await DashboardShortcut.update(shortcutId, { ...shortcut, order: newOrder });
      await loadData();
    } catch (error) {
      console.error("Error moving shortcut:", error);
    }
  };

  const getRoleName = (roleId) => roles.find(r => r.id === roleId)?.name || roleId;
  const getCategoryName = (categoryId) => categories.find(c => c.id === categoryId)?.name || categoryId;
  const getSubcategoryName = (subcategoryId) => subcategories.find(s => s.id === subcategoryId)?.name || subcategoryId;

  const filteredShortcuts = selectedRole === 'all' 
    ? shortcuts 
    : shortcuts.filter(s => s.target_role_id === selectedRole);

  const getColorClass = (color) => colorOptions.find(c => c.value === color)?.className || 'bg-blue-100 text-blue-700';

  if (loading) return <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>טוען נתונים...</div>;

  return (
    <div className="container mx-auto p-4 md:p-6" dir="rtl">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 flex items-center">
            <Monitor className="w-8 h-8 ml-3 text-primary-600" />
            ניהול לוחות מחוונים
          </h1>
          <p className="text-gray-600">הגדרת קיצורי דרך לתפקידים שונים במערכת.</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="clay-button bg-primary-100 text-primary-700 font-medium flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          קיצור חדש
        </Button>
      </div>

      {/* Role Filter */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">סינון לפי תפקיד:</label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-48 clay-input">
              <SelectValue placeholder="כל התפקידים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל התפקידים</SelectItem>
              {roles.map(role => (
                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Shortcuts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredShortcuts.map(shortcut => {
          const IconComponent = iconOptions.find(i => i.value === shortcut.icon)?.icon || Plus;
          return (
            <Card key={shortcut.id} className="clay-card">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getColorClass(shortcut.color)}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold text-gray-800 truncate">
                      {shortcut.title}
                    </CardTitle>
                    <Badge className="mt-1 text-xs">
                      {getRoleName(shortcut.target_role_id)}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveShortcut(shortcut.id, 'up')}
                    className="h-8 w-8"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveShortcut(shortcut.id, 'down')}
                    className="h-8 w-8"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {shortcut.description && (
                  <p className="text-sm text-gray-600">{shortcut.description}</p>
                )}
                <div className="text-xs text-gray-500 space-y-1">
                  <p><strong>סוג:</strong> {
                    shortcut.shortcut_type === 'create_incident' ? 'יצירת אירוע' :
                    shortcut.shortcut_type === 'create_report' ? 'יצירת דוח' : 'קישור מותאם'
                  }</p>
                  {shortcut.incident_category_id && (
                    <p><strong>קטגוריה:</strong> {getCategoryName(shortcut.incident_category_id)}</p>
                  )}
                  {shortcut.incident_sub_category_id && (
                    <p><strong>תת-קטגוריה:</strong> {getSubcategoryName(shortcut.incident_sub_category_id)}</p>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(shortcut)}
                    className="text-blue-600 hover:bg-blue-50"
                  >
                    <Edit className="w-4 h-4 ml-1" /> ערוך
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(shortcut.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 ml-1" /> מחק
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredShortcuts.length === 0 && (
        <div className="clay-card bg-white text-center p-10">
          <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-700">אין קיצורי דרך</h3>
          <p className="text-gray-500 mt-2">
            {selectedRole === 'all' 
              ? 'עדיין לא הוגדרו קיצורי דרך. צור קיצור חדש כדי להתחיל.'
              : `אין קיצורי דרך מוגדרים עבור התפקיד "${getRoleName(selectedRole)}".`
            }
          </p>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingShortcut ? 'עריכת קיצור דרך' : 'יצירת קיצור דרך חדש'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">כותרת הקיצור <span className="text-red-500">*</span></label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="clay-input mt-1"
                  placeholder="לדוגמה: דיווח ביטחוני מהיר"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">תפקיד יעד <span className="text-red-500">*</span></label>
                <Select 
                  value={formData.target_role_id} 
                  onValueChange={(value) => setFormData({...formData, target_role_id: value})}
                >
                  <SelectTrigger className="clay-input mt-1">
                    <SelectValue placeholder="בחר תפקיד..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">תיאור</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="clay-textarea mt-1"
                rows={2}
                placeholder="תיאור קצר של מה הקיצור עושה..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">סוג קיצור</label>
                <Select 
                  value={formData.shortcut_type} 
                  onValueChange={(value) => setFormData({...formData, shortcut_type: value})}
                >
                  <SelectTrigger className="clay-input mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="create_incident">יצירת אירוע</SelectItem>
                    <SelectItem value="create_report">יצירת דוח</SelectItem>
                    <SelectItem value="custom_link">קישור מותאם</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">אייקון</label>
                <Select 
                  value={formData.icon} 
                  onValueChange={(value) => setFormData({...formData, icon: value})}
                >
                  <SelectTrigger className="clay-input mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map(icon => {
                      const IconComp = icon.icon;
                      return (
                        <SelectItem key={icon.value} value={icon.value}>
                          <div className="flex items-center gap-2">
                            <IconComp className="w-4 h-4" />
                            {icon.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">צבע</label>
                <Select 
                  value={formData.color} 
                  onValueChange={(value) => setFormData({...formData, color: value})}
                >
                  <SelectTrigger className="clay-input mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded ${color.className.split(' ')[0]}`}></div>
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.shortcut_type === 'create_incident' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium">קטגוריית אירוע</label>
                  <Select 
                    value={formData.incident_category_id} 
                    onValueChange={(value) => setFormData({...formData, incident_category_id: value, incident_sub_category_id: ''})}
                  >
                    <SelectTrigger className="clay-input mt-1">
                      <SelectValue placeholder="בחר קטגוריה..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">תת-קטגוריה (אופציונלי)</label>
                  <Select 
                    value={formData.incident_sub_category_id} 
                    onValueChange={(value) => setFormData({...formData, incident_sub_category_id: value})}
                    disabled={!formData.incident_category_id}
                  >
                    <SelectTrigger className="clay-input mt-1">
                      <SelectValue placeholder="בחר תת-קטגוריה..." />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories
                        .filter(sub => sub.parent_category_id === formData.incident_category_id)
                        .map(subcategory => (
                          <SelectItem key={subcategory.id} value={subcategory.id}>{subcategory.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {formData.shortcut_type === 'create_report' && (
              <div className="p-4 bg-green-50 rounded-lg">
                <label className="text-sm font-medium">סוג דוח</label>
                <Input
                  value={formData.report_type}
                  onChange={(e) => setFormData({...formData, report_type: e.target.value})}
                  className="clay-input mt-1"
                  placeholder="לדוגמה: דוח ביטחוני יומי"
                />
              </div>
            )}

            {formData.shortcut_type === 'custom_link' && (
              <div className="p-4 bg-orange-50 rounded-lg">
                <label className="text-sm font-medium">URL מותאם</label>
                <Input
                  value={formData.custom_url}
                  onChange={(e) => setFormData({...formData, custom_url: e.target.value})}
                  className="clay-input mt-1"
                  placeholder="https://..."
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">סדר תצוגה</label>
                <Input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 0})}
                  className="clay-input mt-1"
                />
              </div>
              <div className="flex items-center pt-6">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="ml-2"
                />
                <label htmlFor="is_active" className="text-sm font-medium">פעיל</label>
              </div>
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetForm} className="clay-button">
              ביטול
            </Button>
            <Button 
              type="button"
              onClick={handleSubmit}
              className="clay-button bg-primary-600 text-white hover:bg-primary-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingShortcut ? 'שמור שינויים' : 'צור קיצור'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}