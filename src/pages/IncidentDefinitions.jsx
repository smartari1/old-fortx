import React, { useState, useEffect } from 'react';
import { IncidentCategory } from '@/api/entities';
import { IncidentSubCategory } from '@/api/entities';
import { Role } from '@/api/entities';
import { UserGroup } from '@/api/entities';
import { Procedure } from '@/api/entities';
import { Resource } from '@/api/entities';
import { CustomDataType } from '@/api/entities';
import {
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  Tag,
  Users,
  Bell,
  Settings,
  CheckCircle2,
  Box,
  Info,
  LayoutDashboard,
  Share2,
  Download,
  BellRing,
  Link as LinkIcon,
  MapPin as MapPinIcon,
  UserPlus,
  Briefcase,
  ClipboardEdit as ClipboardEditIcon,
  ShieldCheck,
  SlidersHorizontal,
  ListChecks,
  Database,
  AlertTriangle,
  Eye,
  Layers
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Map Lucide icon names to their components for dynamic rendering
const iconComponents = {
  Bell, Tag, Users, Settings, CheckCircle2, Box, Info, LayoutDashboard, Share2, Download,
  BellRing, Link: LinkIcon, MapPin: MapPinIcon, UserPlus, Briefcase, ClipboardEdit: ClipboardEditIcon,
  ShieldCheck, SlidersHorizontal, ListChecks, Database
};

const componentConfigOptions = [
  { id: 'location', label: 'מיקום', icon: <MapPinIcon className="w-4 h-4" />, description: "ניהול מיקום הטיקט (קואורדינטות, תיאור)." },
  { id: 'handling_team', label: 'צוות מטפל', icon: <Users className="w-4 h-4" />, description: "הקצאה וניהול של צוות המטפל בטיקט." },
  { id: 'procedures', label: 'סדרי פעולות', icon: <ListChecks className="w-4 h-4" />, description: "הצגה ומעקב אחר ביצוע נהלים." },
];

const availableActionsOptions = [
  { id: 'send_alert', label: 'שליחת התראה', icon: <BellRing className="w-4 h-4" />, description: "שליחת התראה לקבוצה/משתמשים מוגדרים." },
  { id: 'assign_team', label: 'הקצאת צוות', icon: <Users className="w-4 h-4" />, description: "הקצאה מהירה של צוות מטפל." },
  { id: 'export_pdf', label: 'ייצוא ל-PDF', icon: <Download className="w-4 h-4" />, description: "יצירת קובץ PDF מסכם לטיקט." },
  { id: 'share_link', label: 'שיתוף בלינק', icon: <LinkIcon className="w-4 h-4" />, description: "יצירת לינק מאובטח לשיתוף הטיקט." }
];

export default function TicketDefinitionsPage() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [roles, setRoles] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [resources, setResources] = useState([]);
  const [customDataTypes, setCustomDataTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);

  // Form states
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const [currentCategory, setCurrentCategory] = useState({
    name: '',
    description: '',
    notification_group_id: '',
    notification_template: '',
    requires_external_reporter: false,
    requires_handling_team_assignment: false,
    requires_specific_location: true,
    allow_title_edit_after_creation: true,
    allow_description_edit_after_creation: true,
    allowed_data_types: [],
    component_config: componentConfigOptions.reduce((acc, opt) => {
      acc[`${opt.id}_enabled`] = true;
      acc[`${opt.id}_required`] = false;
      return acc;
    }, {}),
    available_actions: []
  });

  const [currentSubCategory, setCurrentSubCategory] = useState({
    name: '',
    parent_category_id: '',
    description: '',
    procedure_id: '',
  });

  const createPageUrl = (pageName) => {
    switch (pageName) {
      case "ManageDataTypes":
        return "/admin/data-types";
      default:
        return "#";
    }
  };

  // Load data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedCategories = await IncidentCategory.list();
        const fetchedSubcategories = await IncidentSubCategory.list();
        const fetchedRoles = await Role.list();
        const fetchedUserGroups = await UserGroup.list();
        const fetchedProcedures = await Procedure.list();
        const fetchedResources = await Resource.list();
        const fetchedCustomDataTypes = await CustomDataType.list();

        setCategories(fetchedCategories);
        setSubcategories(fetchedSubcategories);
        setRoles(fetchedRoles);
        setUserGroups(fetchedUserGroups);
        setProcedures(fetchedProcedures);
        setResources(fetchedResources);
        setCustomDataTypes(fetchedCustomDataTypes || []);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load data. Please try again.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleCategoryExpansion = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCategoryInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentCategory(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();

    const payload = { ...currentCategory };
    payload.requires_external_reporter = !!payload.requires_external_reporter;
    payload.requires_handling_team_assignment = !!payload.requires_handling_team_assignment;
    payload.requires_specific_location = !!payload.requires_specific_location;
    payload.allow_title_edit_after_creation = !!payload.allow_title_edit_after_creation;
    payload.allow_description_edit_after_creation = !!payload.allow_description_edit_after_creation;

    try {
      if (editingCategory) {
        await IncidentCategory.update(editingCategory.id, payload);
        setCategories(prev => prev.map(cat =>
          cat.id === editingCategory.id ? { ...cat, ...payload } : cat
        ));
      } else {
        const newCategory = await IncidentCategory.create(payload);
        setCategories(prev => [...prev, newCategory]);
      }

      resetCategoryForm();
      setShowCategoryForm(false);

    } catch (error) {
      console.error("Error saving category:", error);
      setError("Failed to save category. Please try again.");
    }
  };

  const handleSubcategoryInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentSubCategory(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubcategorySubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingSubcategory) {
        await IncidentSubCategory.update(editingSubcategory.id, currentSubCategory);
        setSubcategories(prev => prev.map(subcat =>
          subcat.id === editingSubcategory.id ? { ...subcat, ...currentSubCategory } : subcat
        ));
      } else {
        const newSubcategory = await IncidentSubCategory.create(currentSubCategory);
        setSubcategories(prev => [...prev, newSubcategory]);
      }

      resetSubcategoryForm();
      setShowSubcategoryForm(false);
    } catch (error) {
      console.error("Error saving subcategory:", error);
      setError("Failed to save subcategory. Please try again.");
    }
  };

  const resetCategoryForm = () => {
    setCurrentCategory({
      name: '',
      description: '',
      notification_group_id: '',
      notification_template: '',
      requires_external_reporter: false,
      requires_handling_team_assignment: false,
      requires_specific_location: true,
      allow_title_edit_after_creation: true,
      allow_description_edit_after_creation: true,
      allowed_data_types: [],
      component_config: componentConfigOptions.reduce((acc, opt) => {
        acc[`${opt.id}_enabled`] = true;
        acc[`${opt.id}_required`] = false;
        return acc;
      }, {}),
      available_actions: []
    });
    setEditingCategory(null);
    setActiveTab("general");
  };

  const resetSubcategoryForm = () => {
    setCurrentSubCategory({
      name: '',
      parent_category_id: '',
      description: '',
      procedure_id: '',
    });
    setEditingSubcategory(null);
  };

  const handleEditCategory = (category) => {
    const defaultComponentConfig = componentConfigOptions.reduce((acc, opt) => {
        acc[`${opt.id}_enabled`] = true;
        acc[`${opt.id}_required`] = false;
        return acc;
    }, {});

    setCurrentCategory({
      name: category.name || '',
      description: category.description || '',
      notification_group_id: category.notification_group_id || '',
      notification_template: category.notification_template || '',
      requires_external_reporter: !!category.requires_external_reporter,
      requires_handling_team_assignment: !!category.requires_handling_team_assignment,
      requires_specific_location: category.requires_specific_location === undefined ? true : !!category.requires_specific_location,
      allow_title_edit_after_creation: category.allow_title_edit_after_creation === undefined ? true : !!category.allow_title_edit_after_creation,
      allow_description_edit_after_creation: category.allow_description_edit_after_creation === undefined ? true : !!category.allow_description_edit_after_creation,
      allowed_data_types: Array.isArray(category.allowed_data_types) ? category.allowed_data_types : [],
      component_config: { ...defaultComponentConfig, ...(category.component_config || {}) },
      available_actions: category.available_actions || []
    });
    setEditingCategory(category);
    setShowCategoryForm(true);
    setActiveTab("general");
  };

  const handleEditSubcategory = (subcategory) => {
    setCurrentSubCategory({
      name: subcategory.name || '',
      parent_category_id: subcategory.parent_category_id || '',
      description: subcategory.description || '',
      procedure_id: subcategory.procedure_id || '',
    });

    setEditingSubcategory(subcategory);
    setShowSubcategoryForm(true);
  };

  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק קטגוריה זו? כל תתי-הקטגוריות שלה יימחקו גם כן.')) {
      try {
        await IncidentCategory.delete(categoryId);

        const relatedSubcategories = subcategories.filter(
          subcat => subcat.parent_category_id === categoryId
        );

        for (const subcat of relatedSubcategories) {
          await IncidentSubCategory.delete(subcat.id);
        }

        setCategories(prev => prev.filter(cat => cat.id !== categoryId));
        setSubcategories(prev => prev.filter(
          subcat => subcat.parent_category_id !== categoryId
        ));
      } catch (error) {
        console.error("Error deleting category:", error);
        setError("Failed to delete category. Please try again.");
      }
    }
  };

  const handleDeleteSubcategory = async (subcategoryId) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק תת-קטגוריה זו?')) {
      try {
        await IncidentSubCategory.delete(subcategoryId);
        setSubcategories(prev => prev.filter(subcat => subcat.id !== subcategoryId));
      } catch (error) {
        console.error("Error deleting subcategory:", error);
        setError("Failed to delete subcategory. Please try again.");
      }
    }
  };

  const handleComponentConfigChange = (componentId, field, value) => {
    setCurrentCategory(prev => ({
      ...prev,
      component_config: {
        ...prev.component_config,
        [`${componentId}_${field}`]: value
      }
    }));
  };

  const handleAvailableActionToggle = (actionId) => {
    setCurrentCategory(prev => {
      const newActions = (prev.available_actions || []).includes(actionId)
        ? (prev.available_actions || []).filter(id => id !== actionId)
        : [...(prev.available_actions || []), actionId];
      return { ...prev, available_actions: newActions };
    });
  };

  const handleAllowedDataTypeToggle = (dataTypeSlug) => {
    setCurrentCategory(prev => {
      const newAllowedTypes = prev.allowed_data_types.includes(dataTypeSlug)
        ? prev.allowed_data_types.filter(slug => slug !== dataTypeSlug)
        : [...prev.allowed_data_types, dataTypeSlug];
      return { ...prev, allowed_data_types: newAllowedTypes };
    });
  };

  const getCategorySubcategories = (categoryId) => {
    return subcategories.filter(sub => sub.parent_category_id === categoryId);
  };

  const getProcedureName = (procedureId) => {
    const procedure = procedures.find(p => p.id === procedureId);
    return procedure ? procedure.name : 'ללא סדר פעולות';
  };

  if (loading) return (
    <div className="clay-card bg-white p-8 text-center">
      <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className="text-gray-600">טוען נתונים...</p>
    </div>
  );

  if (error) return (
    <div className="clay-card bg-red-100 p-8 text-center text-red-700">
      <p>{error}</p>
    </div>
  );

  return (
    <div className="container mx-auto p-4 md:p-6" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <Settings className="w-8 h-8 ml-3 text-indigo-500" />
          הגדרת טיקטים וסדרי פעולות
        </h1>
        <p className="text-gray-600">הגדרת קטגוריות טיקטים, תת-קטגוריות וסדרי פעולות לטיפול</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <Button
          onClick={() => {
            resetCategoryForm();
            setShowCategoryForm(true);
          }}
          className="clay-button bg-green-100 text-green-700 flex items-center"
        >
          <Plus className="w-4 h-4 ml-2" />
          קטגוריה חדשה
        </Button>
        <Button
          onClick={() => {
            resetSubcategoryForm();
            setShowSubcategoryForm(true);
          }}
          className="clay-button bg-blue-100 text-blue-700 flex items-center"
        >
          <Plus className="w-4 h-4 ml-2" />
          תת-קטגוריה חדשה
        </Button>
      </div>

      {/* Main Table */}
      <div className="clay-card bg-white shadow-xl">
        <Table>
          <TableHeader>
            <TableRow className="bg-neutral-50">
              <TableHead className="w-8"></TableHead>
              <TableHead className="text-right font-semibold">שם</TableHead>
              <TableHead className="text-right font-semibold">תיאור</TableHead>
              <TableHead className="text-center font-semibold">סוג</TableHead>
              <TableHead className="text-center font-semibold">סדר פעולות</TableHead>
              <TableHead className="text-left font-semibold">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => {
              const categorySubcategories = getCategorySubcategories(category.id);
              const isExpanded = expandedCategories.has(category.id);

              return (
                <React.Fragment key={category.id}>
                  {/* Category Row */}
                  <TableRow className="hover:bg-neutral-50/70 border-b-2 border-neutral-200">
                    <TableCell>
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCategoryExpansion(category.id)}
                            className="p-1 h-auto"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronUp className="w-4 h-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </Collapsible>
                    </TableCell>
                    <TableCell className="font-semibold text-indigo-700">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-indigo-500" />
                        {category.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-neutral-600 max-w-xs">
                      <div className="truncate" title={category.description}>
                        {category.description || 'ללא תיאור'}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-indigo-100 text-indigo-800">
                        קטגוריה ראשית
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-neutral-500">
                      {categorySubcategories.length} תתי-קטגוריות
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCategory(category)}
                          className="p-1 h-auto text-blue-600 hover:bg-blue-100"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            resetSubcategoryForm();
                            setCurrentSubCategory(prev => ({ ...prev, parent_category_id: category.id }));
                            setShowSubcategoryForm(true);
                          }}
                          className="p-1 h-auto text-green-600 hover:bg-green-100"
                          title="הוסף תת-קטגוריה"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id)}
                          className="p-1 h-auto text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Subcategories Rows */}
                  {isExpanded && categorySubcategories.map((subcategory) => (
                    <TableRow key={subcategory.id} className="bg-neutral-25 hover:bg-neutral-50">
                      <TableCell className="border-r-4 border-indigo-200"></TableCell>
                      <TableCell className="text-neutral-700 pr-8">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-neutral-400" />
                          {subcategory.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-neutral-600 max-w-xs">
                        <div className="truncate" title={subcategory.description}>
                          {subcategory.description || 'ללא תיאור'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-neutral-100 text-neutral-700">
                          תת-קטגוריה
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {getProcedureName(subcategory.procedure_id)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSubcategory(subcategory)}
                            className="p-1 h-auto text-blue-600 hover:bg-blue-100"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSubcategory(subcategory.id)}
                            className="p-1 h-auto text-red-600 hover:bg-red-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {isExpanded && categorySubcategories.length === 0 && (
                    <TableRow className="bg-neutral-25">
                      <TableCell className="border-r-4 border-indigo-200"></TableCell>
                      <TableCell colSpan={5} className="text-center text-neutral-500 py-4">
                        אין תתי-קטגוריות לקטגוריה זו
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>

        {categories.length === 0 && (
          <div className="p-8 text-center text-neutral-500">
            <Settings className="w-16 h-16 mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-semibold mb-2">לא הוגדרו קטגוריות טיקטים</h3>
            <p>התחל בהוספת קטגוריה ראשונה כדי לארגן את הטיקטים במערכת</p>
          </div>
        )}
      </div>

      {/* Category Management Dialog */}
      <Dialog open={showCategoryForm} onOpenChange={(isOpen) => { 
        if (!isOpen) { 
          resetCategoryForm(); 
          setShowCategoryForm(false); 
        } 
      }}>
        <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col">
          <DialogHeader className="pb-4 flex-shrink-0">
            <DialogTitle className="text-2xl text-primary-700">
              {editingCategory ? 'עריכת קטגוריית טיקט' : 'קטגוריית טיקט חדשה'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid grid-cols-4 mb-4 flex-shrink-0">
                <TabsTrigger value="general"><Settings className="w-4 h-4 ml-1" /> כללי</TabsTrigger>
                <TabsTrigger value="components"><LayoutDashboard className="w-4 h-4 ml-1" /> רכיבי דף</TabsTrigger>
                <TabsTrigger value="actions"><SlidersHorizontal className="w-4 h-4 ml-1" /> פעולות זמינות</TabsTrigger>
                <TabsTrigger value="data-types"><MapPinIcon className="w-4 h-4 ml-1" /> סוגי דאטה מקום</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-hidden">
                <form onSubmit={handleCategorySubmit} className="h-full flex flex-col">
                  <ScrollArea className="flex-1 px-1">
                    <div className="pr-3">
                      <TabsContent value="general" className="space-y-4 mt-0">
                        <div>
                          <label htmlFor="categoryName" className="block text-sm font-medium mb-1">שם הקטגוריה</label>
                          <Input
                            id="categoryName"
                            type="text"
                            name="name"
                            value={currentCategory.name}
                            onChange={handleCategoryInputChange}
                            className="clay-card w-full p-3"
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="categoryDescription" className="block text-sm font-medium mb-1">תיאור</label>
                          <Textarea
                            id="categoryDescription"
                            name="description"
                            value={currentCategory.description}
                            onChange={handleCategoryInputChange}
                            className="clay-card w-full p-3 h-24"
                          />
                        </div>

                        <div>
                          <label htmlFor="notificationGroupId" className="block text-sm font-medium mb-1">קבוצה להתראות</label>
                          <Select 
                            name="notification_group_id" 
                            value={currentCategory.notification_group_id} 
                            onValueChange={(value) => handleCategoryInputChange({ target: { name: 'notification_group_id', value } })}
                          >
                            <SelectTrigger className="clay-input mt-1">
                              <SelectValue placeholder="בחר קבוצה..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null}>בחר קבוצה...</SelectItem>
                              {userGroups.map(group => (
                                <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label htmlFor="notificationTemplate" className="block text-sm font-medium mb-1">תבנית התראות</label>
                          <Textarea
                            id="notificationTemplate"
                            name="notification_template"
                            value={currentCategory.notification_template}
                            onChange={handleCategoryInputChange}
                            placeholder="ניתן להשתמש ב-{title}, {category}, {description}, {location}, {reporter} וכו'"
                            className="clay-card w-full p-3 h-24"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            שדות זמינים: {'{title}'}, {'{category}'}, {'{description}'}, {'{location}'}, {'{reporter}'}, {'{status}'}
                          </p>
                        </div>

                        <div className="space-y-3 pt-3 border-t">
                          <h4 className="text-md font-medium text-indigo-600 flex items-center">
                            <Info size={16} className="ml-2" />הגדרות התנהגות טיקט
                          </h4>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="requires_external_reporter"
                              name="requires_external_reporter"
                              checked={currentCategory.requires_external_reporter}
                              onCheckedChange={(checked) => handleCategoryInputChange({ target: { name: 'requires_external_reporter', checked, type: 'checkbox' } })}
                              className="form-checkbox h-4 w-4"
                            />
                            <label htmlFor="requires_external_reporter" className="text-sm">מערב דיווח מגורם חיצוני?</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="requires_handling_team_assignment"
                              name="requires_handling_team_assignment"
                              checked={currentCategory.requires_handling_team_assignment}
                              onCheckedChange={(checked) => handleCategoryInputChange({ target: { name: 'requires_handling_team_assignment', checked, type: 'checkbox' } })}
                              className="form-checkbox h-4 w-4"
                            />
                            <label htmlFor="requires_handling_team_assignment" className="text-sm">מצריך הקצאת צוות מטפל?</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="requires_specific_location"
                              name="requires_specific_location"
                              checked={currentCategory.requires_specific_location}
                              onCheckedChange={(checked) => handleCategoryInputChange({ target: { name: 'requires_specific_location', checked, type: 'checkbox' } })}
                              className="form-checkbox h-4 w-4"
                            />
                            <label htmlFor="requires_specific_location" className="text-sm">מצריך מיקום ספציפי?</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="allow_title_edit_after_creation"
                              name="allow_title_edit_after_creation"
                              checked={currentCategory.allow_title_edit_after_creation}
                              onCheckedChange={(checked) => handleCategoryInputChange({ target: { name: 'allow_title_edit_after_creation', checked, type: 'checkbox' } })}
                              className="form-checkbox h-4 w-4"
                            />
                            <label htmlFor="allow_title_edit_after_creation" className="text-sm">אפשר עריכת כותרת לאחר יצירה?</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="allow_description_edit_after_creation"
                              name="allow_description_edit_after_creation"
                              checked={currentCategory.allow_description_edit_after_creation}
                              onCheckedChange={(checked) => handleCategoryInputChange({ target: { name: 'allow_description_edit_after_creation', checked, type: 'checkbox' } })}
                              className="form-checkbox h-4 w-4"
                            />
                            <label htmlFor="allow_description_edit_after_creation" className="text-sm">אפשר עריכת תיאור לאחר יצירה?</label>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="components" className="space-y-4 mt-0">
                        <p className="text-sm text-gray-600 mb-3">הגדר אילו רכיבים יוצגו בדף הטיקט עבור קטגוריה זו, והאם הם חובה.</p>
                        {componentConfigOptions.map(opt => (
                          <Card key={opt.id} className="clay-card p-3 shadow-sm">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="flex items-center flex-grow">
                                {opt.icon && React.cloneElement(opt.icon, { className: "ml-2 text-primary-600" })}
                                <div>
                                  <label htmlFor={`${opt.id}_enabled`} className="font-medium text-gray-800">{opt.label}</label>
                                  <p className="text-xs text-gray-500">{opt.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 flex-shrink-0 pt-2 sm:pt-0">
                                <div className="flex items-center">
                                  <Checkbox
                                    id={`${opt.id}_enabled`}
                                    checked={currentCategory.component_config?.[`${opt.id}_enabled`] !== undefined ? currentCategory.component_config[`${opt.id}_enabled`] : true}
                                    onCheckedChange={(checked) => handleComponentConfigChange(opt.id, 'enabled', !!checked)}
                                  />
                                  <label htmlFor={`${opt.id}_enabled`} className="text-xs ml-1.5 rtl:mr-1.5 select-none">פעיל</label>
                                </div>
                                <div className="flex items-center">
                                  <Checkbox
                                    id={`${opt.id}_required`}
                                    checked={currentCategory.component_config?.[`${opt.id}_required`] || false}
                                    onCheckedChange={(checked) => handleComponentConfigChange(opt.id, 'required', !!checked)}
                                    disabled={!(currentCategory.component_config?.[`${opt.id}_enabled`] !== undefined ? currentCategory.component_config[`${opt.id}_enabled`] : true)}
                                  />
                                  <label htmlFor={`${opt.id}_required`} className="text-xs ml-1.5 rtl:mr-1.5 select-none">חובה</label>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </TabsContent>

                      <TabsContent value="actions" className="space-y-3 mt-0">
                        <p className="text-sm text-gray-600 mb-3">בחר אילו פעולות מהירות יהיו זמינות למשתמשים בדף הטיקט עבור קטגוריה זו.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {availableActionsOptions.map(actionOpt => (
                            <div key={actionOpt.id} className="flex items-center p-3 bg-white rounded-lg shadow-sm border hover:border-primary-300">
                              <Checkbox
                                id={`action-${actionOpt.id}`}
                                checked={(currentCategory.available_actions || []).includes(actionOpt.id)}
                                onCheckedChange={() => handleAvailableActionToggle(actionOpt.id)}
                                className="ml-3 rtl:mr-0 rtl:ml-3"
                              />
                              <div className="flex items-center">
                                {actionOpt.icon && React.cloneElement(actionOpt.icon, { className: "ml-2 text-primary-600" })}
                                <div>
                                  <label htmlFor={`action-${actionOpt.id}`} className="text-sm font-medium text-gray-800 select-none cursor-pointer">{actionOpt.label}</label>
                                  <p className="text-xs text-gray-500">{actionOpt.description}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="data-types" className="space-y-4 mt-0">
                        <p className="text-sm text-gray-600 mb-3">בחר אילו סוגי דאטה מרחביים יוצגו במפה ובטבלת הנתונים הסמוכים עבור טיקטים מקטגוריה זו.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {customDataTypes.filter(cdt => cdt.spatial_config?.is_spatial && cdt.main_location_field_id).map(cdt => (
                            <div key={cdt.slug} className="flex items-center p-3 bg-white rounded-lg shadow-sm border hover:border-primary-300">
                              <Checkbox
                                id={`datatype-${cdt.slug}`}
                                checked={currentCategory.allowed_data_types.includes(cdt.slug)}
                                onCheckedChange={() => handleAllowedDataTypeToggle(cdt.slug)}
                                className="ml-3 rtl:mr-0 rtl:ml-3"
                              />
                              <div className="flex items-center">
                                {React.createElement(iconComponents[cdt.icon] || iconComponents['Database'], { className: "w-4 h-4 ml-2 text-primary-600" })}
                                <div>
                                  <label htmlFor={`datatype-${cdt.slug}`} className="text-sm font-medium text-gray-800 select-none cursor-pointer">{cdt.name}</label>
                                  <p className="text-xs text-gray-500">{cdt.description}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {customDataTypes.filter(cdt => cdt.spatial_config?.is_spatial && cdt.main_location_field_id).length === 0 && (
                          <div className="text-center py-8">
                            <Database className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                            <p className="text-center text-gray-500">לא קיימים סוגי דאטה מרחביים עם הגדרות מיקום.</p>
                            <p className="text-center text-gray-400 text-sm mt-1">
                              ניתן ליצור סוגי דאטה חדשים ב
                              <a href={createPageUrl("ManageDataTypes")} className="text-primary-600 hover:underline mr-1">דף ניהול סוגי דאטה</a>
                            </p>
                          </div>
                        )}
                      </TabsContent>
                    </div>
                  </ScrollArea>
                  
                  <DialogFooter className="mt-6 pt-4 flex-shrink-0 border-t">
                    {editingCategory && (
                      <Button
                        type="button"
                        onClick={() => { resetCategoryForm(); setShowCategoryForm(false); }}
                        className="clay-button bg-gray-100 ml-3"
                      >
                        ביטול
                      </Button>
                    )}

                    <Button
                      type="submit"
                      className="clay-button bg-indigo-100 text-indigo-700 flex items-center"
                    >
                      <Save className="w-4 h-4 ml-2" />
                      {editingCategory ? 'עדכן' : 'הוסף'} קטגוריה
                    </Button>
                  </DialogFooter>
                </form>
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* SubCategory Management Dialog */}
      <Dialog open={showSubcategoryForm} onOpenChange={(isOpen) => { 
        if (!isOpen) { 
          resetSubcategoryForm(); 
          setShowSubcategoryForm(false); 
        } 
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl text-primary-700">
              {editingSubcategory ? 'עריכת תת-קטגוריה' : 'הוספת תת-קטגוריה חדשה'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubcategorySubmit}>
            <ScrollArea className="max-h-[60vh] p-1 pr-3">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="subCategoryName" className="block text-sm font-medium mb-1">שם תת-הקטגוריה</label>
                    <Input
                      id="subCategoryName"
                      type="text"
                      name="name"
                      value={currentSubCategory.name}
                      onChange={handleSubcategoryInputChange}
                      className="clay-card w-full p-3"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="parentCategory" className="block text-sm font-medium mb-1">קטגוריה ראשית</label>
                    <Select
                      name="parent_category_id"
                      value={currentSubCategory.parent_category_id}
                      onValueChange={(value) => handleSubcategoryInputChange({ target: { name: 'parent_category_id', value } })}
                    >
                      <SelectTrigger className="clay-input mt-1">
                        <SelectValue placeholder="בחר קטגוריה..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>בחר קטגוריה...</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label htmlFor="subCategoryDescription" className="block text-sm font-medium mb-1">תיאור</label>
                  <Textarea
                    id="subCategoryDescription"
                    name="description"
                    value={currentSubCategory.description}
                    onChange={handleSubcategoryInputChange}
                    className="clay-card w-full p-3 h-24"
                  />
                </div>

                <div>
                  <label htmlFor="procedureSelect" className="block text-sm font-medium mb-1">סדר פעולות טיפול</label>
                  <Select
                    name="procedure_id"
                    value={currentSubCategory.procedure_id}
                    onValueChange={(value) => handleSubcategoryInputChange({ target: { name: 'procedure_id', value } })}
                  >
                    <SelectTrigger className="clay-input mt-1">
                      <SelectValue placeholder="בחר סדר פעולות..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>בחר סדר פעולות...</SelectItem>
                      {procedures.map(procedure => (
                        <SelectItem key={procedure.id} value={procedure.id}>{procedure.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="mt-6 pt-4">
              {editingSubcategory && (
                <Button
                  type="button"
                  onClick={() => {
                    resetSubcategoryForm();
                    setShowSubcategoryForm(false);
                  }}
                  className="clay-button bg-gray-100 ml-3"
                >
                  ביטול
                </Button>
              )}

              <Button
                type="submit"
                className="clay-button bg-indigo-100 text-indigo-700 flex items-center"
              >
                <Save className="w-4 h-4 ml-2" />
                {editingSubcategory ? 'עדכן' : 'הוסף'} תת-קטגוריה
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}