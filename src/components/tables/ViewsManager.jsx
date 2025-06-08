import React, { useState, useEffect } from 'react';
import { TableView } from '@/api/entities';
import { User } from '@/api/entities';
import {
  Filter,
  Plus,
  Eye,
  Edit3,
  Trash2,
  Star,
  Share,
  Lock,
  Users,
  Settings,
  Save,
  X,
  Check,
  MoreVertical
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

const ViewsManager = ({
  tableType,
  customDataTypeSlug = null,
  currentFilters = {},
  currentSort = {},
  visibleColumns = [],
  onViewSelect,
  onFiltersChange,
  className = ""
}) => {
  const [views, setViews] = useState([]);
  const [activeView, setActiveView] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Form states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingView, setEditingView] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_default: false,
    is_public: false,
    shared_with_roles: [],
    icon: 'Filter',
    color: 'blue'
  });

  const colorOptions = [
    { value: 'blue', label: 'כחול', class: 'bg-blue-100 text-blue-800' },
    { value: 'green', label: 'ירוק', class: 'bg-green-100 text-green-800' },
    { value: 'red', label: 'אדום', class: 'bg-red-100 text-red-800' },
    { value: 'yellow', label: 'צהוב', class: 'bg-yellow-100 text-yellow-800' },
    { value: 'purple', label: 'סגול', class: 'bg-purple-100 text-purple-800' },
    { value: 'orange', label: 'כתום', class: 'bg-orange-100 text-orange-800' }
  ];

  const iconOptions = [
    { value: 'Filter', label: 'מסנן', icon: Filter },
    { value: 'Eye', label: 'עין', icon: Eye },
    { value: 'Star', label: 'כוכב', icon: Star },
    { value: 'Users', label: 'משתמשים', icon: Users },
    { value: 'Settings', label: 'הגדרות', icon: Settings }
  ];

  // Load user and views
  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
        await loadViews();
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    fetchData();
  }, [tableType, customDataTypeSlug]);

  const loadViews = async () => {
    try {
      setLoading(true);
      const viewsData = await TableView.filter({
        table_type: tableType,
        ...(customDataTypeSlug && { custom_data_type_slug: customDataTypeSlug })
      });

      // Filter views user can see
      const accessibleViews = viewsData.filter(view => 
        view.is_public || 
        view.created_by_user_id === currentUser?.id ||
        (view.shared_with_roles && currentUser?.roles?.some(role => 
          view.shared_with_roles.includes(role)
        ))
      );

      setViews(accessibleViews);

      // Auto-select default view
      const defaultView = accessibleViews.find(v => v.is_default);
      if (defaultView && !activeView) {
        handleViewSelect(defaultView);
      }
    } catch (error) {
      console.error('Error loading views:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSelect = (view) => {
    setActiveView(view);
    if (onViewSelect) {
      onViewSelect(view);
    }
    if (onFiltersChange) {
      onFiltersChange(view.filters || {}, view.sort_config || {});
    }
  };

  const handleCreateView = () => {
    setFormData({
      name: '',
      description: '',
      is_default: false,
      is_public: false,
      shared_with_roles: [],
      icon: 'Filter',
      color: 'blue'
    });
    setEditingView(null);
    setShowCreateDialog(true);
  };

  const handleEditView = (view) => {
    setFormData({
      name: view.name,
      description: view.description || '',
      is_default: view.is_default || false,
      is_public: view.is_public || false,
      shared_with_roles: view.shared_with_roles || [],
      icon: view.icon || 'Filter',
      color: view.color || 'blue'
    });
    setEditingView(view);
    setShowCreateDialog(true);
  };

  const handleSaveView = async () => {
    try {
      const viewData = {
        ...formData,
        table_type: tableType,
        ...(customDataTypeSlug && { custom_data_type_slug: customDataTypeSlug }),
        filters: currentFilters,
        sort_config: currentSort,
        visible_columns: visibleColumns,
        created_by_user_id: currentUser?.id
      };

      if (editingView) {
        await TableView.update(editingView.id, viewData);
      } else {
        await TableView.create(viewData);
      }

      setShowCreateDialog(false);
      await loadViews();
    } catch (error) {
      console.error('Error saving view:', error);
    }
  };

  const handleDeleteView = async (view) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את התצוגה "${view.name}"?`)) return;
    
    try {
      await TableView.delete(view.id);
      if (activeView?.id === view.id) {
        setActiveView(null);
      }
      await loadViews();
    } catch (error) {
      console.error('Error deleting view:', error);
    }
  };

  const handleSetDefault = async (view) => {
    try {
      // Remove default from all other views
      const updatePromises = views
        .filter(v => v.is_default && v.id !== view.id)
        .map(v => TableView.update(v.id, { is_default: false }));
      
      // Set this view as default
      updatePromises.push(TableView.update(view.id, { is_default: true }));
      
      await Promise.all(updatePromises);
      await loadViews();
    } catch (error) {
      console.error('Error setting default view:', error);
    }
  };

  const getViewIcon = (iconName) => {
    const iconConfig = iconOptions.find(opt => opt.value === iconName);
    return iconConfig ? iconConfig.icon : Filter;
  };

  const getViewColor = (colorName) => {
    const colorConfig = colorOptions.find(opt => opt.value === colorName);
    return colorConfig ? colorConfig.class : 'bg-blue-100 text-blue-800';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Views dropdown */}
      <div className="flex items-center gap-1">
        {views.map(view => {
          const IconComponent = getViewIcon(view.icon);
          const isActive = activeView?.id === view.id;
          
          return (
            <div key={view.id} className="relative">
              <Button
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => handleViewSelect(view)}
                className={`flex items-center gap-1 ${isActive ? 'bg-primary-600 text-white' : ''}`}
              >
                <IconComponent className="w-4 h-4" />
                <span className="text-sm">{view.name}</span>
                {view.is_default && <Star className="w-3 h-3 fill-current" />}
              </Button>
              
              {isActive && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 absolute -top-1 -right-1 bg-white border shadow-sm"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditView(view)}>
                      <Edit3 className="w-4 h-4 mr-2" />
                      ערוך תצוגה
                    </DropdownMenuItem>
                    {!view.is_default && (
                      <DropdownMenuItem onClick={() => handleSetDefault(view)}>
                        <Star className="w-4 h-4 mr-2" />
                        קבע כברירת מחדל
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDeleteView(view)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      מחק תצוגה
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>

      {/* Create new view button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleCreateView}
        className="flex items-center gap-1 border-dashed"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm">תצוגה חדשה</span>
      </Button>

      {/* Create/Edit View Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingView ? 'עריכת תצוגה' : 'יצירת תצוגה חדשה'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">שם התצוגה</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="הכנס שם לתצוגה..."
              />
            </div>
            
            <div>
              <Label htmlFor="description">תיאור</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="תיאור אופציונלי לתצוגה..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="icon">אייקון</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map(option => {
                      const IconComp = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <IconComp className="w-4 h-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="color">צבע</Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded ${option.class}`}></div>
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, is_default: checked }))
                  }
                />
                <Label htmlFor="is_default" className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  קבע כתצוגת ברירת מחדל
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, is_public: checked }))
                  }
                />
                <Label htmlFor="is_public" className="flex items-center gap-2">
                  <Share className="w-4 h-4" />
                  שתף עם כל המשתמשים
                </Label>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>הפילטרים הנוכחיים יישמרו בתצוגה:</strong>
              </p>
              <div className="mt-2 text-xs text-blue-600">
                {Object.keys(currentFilters).length === 0 ? (
                  <span>אין פילטרים פעילים</span>
                ) : (
                  <div className="space-y-1">
                    {Object.entries(currentFilters).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-1">
                        <Filter className="w-3 h-3" />
                        <span>{key}: {String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              ביטול
            </Button>
            <Button
              onClick={handleSaveView}
              disabled={!formData.name.trim()}
            >
              <Save className="w-4 h-4 mr-2" />
              {editingView ? 'עדכן תצוגה' : 'צור תצוגה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ViewsManager;