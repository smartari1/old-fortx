
import React, { useState, useEffect } from 'react';
import { Role } from '@/api/entities';
import { User } from '@/api/entities';
import { CustomDataType } from '@/api/entities';
import { IncidentCategory } from '@/api/entities'; // NEW import
import { IncidentSubCategory } from '@/api/entities'; // NEW import
import { 
  Shield, 
  Plus, 
  Edit2, 
  Users, 
  Settings, 
  Save, 
  X,
  ListChecks,
  ToggleLeft,
  ToggleRight,
  Eye,
  PenSquare,
  Trash2 as IconTrash,
  KeyRound,
  // FileText, // REMOVED import
  Database,
  Search,
  AlertCircle,
  Info,
  AlertTriangle // NEW import
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Define permissions structure with safety checks
const permissionModules = {
  incidents: { 
    label: 'אירועים ודיווחים', 
    permissions: [
      { key: 'view', label: 'צפייה' },
      { key: 'create', label: 'יצירה' },
      { key: 'edit', label: 'עריכה' },
      { key: 'delete', label: 'מחיקה' },
      { key: 'manage_definitions', label: 'ניהול הגדרות אירוע' }
    ]
  },
  users: { 
    label: 'משתמשים', 
    permissions: [
      { key: 'view', label: 'צפייה' },
      { key: 'create', label: 'יצירה' },
      { key: 'edit', label: 'עריכה' },
      { key: 'delete', label: 'השבתה/הפעלה' },
      { key: 'manage_roles', label: 'ניהול תפקידים' },
      { key: 'view_reports', label: 'צפייה בדוחות עובדים' },
      { key: 'create_reports', label: 'יצירת דוח על עובד' }
    ]
  },
  locations: { 
    label: 'מיקומים ומפות', 
    permissions: [
      { key: 'view', label: 'צפייה' },
      { key: 'create', label: 'יצירה' },
      { key: 'edit', label: 'עריכה' },
      { key: 'delete', label: 'מחיקה' }
    ]
  },
  shifts: { 
    label: 'משמרות ולו"ז', 
    permissions: [
      { key: 'view', label: 'צפייה' },
      { key: 'create', label: 'יצירה' },
      { key: 'edit', label: 'עריכה' },
      { key: 'delete', label: 'מחיקה' },
      { key: 'manage_assignments', label: 'ניהול שיבוצים' }
    ]
  },
  resources: { 
    label: 'משאבים', 
    permissions: [
      { key: 'view', label: 'צפייה' },
      { key: 'create', label: 'יצירה' },
      { key: 'edit', label: 'עריכה' },
      { key: 'delete', label: 'מחיקה' },
      { key: 'manage_maintenance', label: 'ניהול תחזוקה' }
    ]
  },
  custom_data: {
    label: 'סוגי דאטה מותאמים',
    permissions: [
      { key: 'view',  label: 'צפייה ברשומות' },
      { key: 'create', label: 'יצירת רשומות' },
      { key: 'edit', label: 'עריכת רשומות' },
      { key: 'delete', label: 'מחיקת רשומות' },
      { key: 'manage_types', label: 'ניהול סוגי דאטה' }
    ]
  }
};

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [customDataTypes, setCustomDataTypes] = useState([]);
  const [incidentCategories, setIncidentCategories] = useState([]); // NEW state
  const [incidentSubCategories, setIncidentSubCategories] = useState([]); // NEW state
  // const [reportTypes, setReportTypes] = useState([]); // REMOVED state
  // const [reports, setReports] = useState([]); // REMOVED state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchCategoryTerm, setSearchCategoryTerm] = useState(''); // RENAMED from searchReportTerm
  const [searchDataTypeTerm, setSearchDataTypeTerm] = useState('');
  const [activeTab, setActiveTab] = useState("general");
  
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleFormData, setRoleFormData] = useState({
    name: '',
    description: '',
    permissions: {}, // Retained this property
    accessible_incident_categories: [], // NEW property
    accessible_incident_subcategories: [], // NEW property
    // accessible_reports: [], // REMOVED property
    custom_data_type_permissions: {},
    is_system_role: false,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, usersData, dataTypesData, categoriesData, subCategoriesData] = await Promise.all([ // MODIFIED promise list
        Role.list().catch(() => []), 
        User.list().catch(() => []), 
        CustomDataType.list().catch(() => []), 
        IncidentCategory.list().catch(() => []), // NEW fetch
        IncidentSubCategory.list().catch(() => []) // NEW fetch
        // Report.list().catch(() => []) // REMOVED fetch
      ]);
      
      // Process roles data with user count and safety checks
      const processedRoles = Array.isArray(rolesData) ? rolesData.map(role => {
        if (!role || typeof role !== 'object') return null; 
        
        const userCount = Array.isArray(usersData) ? 
          usersData.filter(user => {
            if (!user || !user.roles) return false;
            // Handle both array and single ID for user.roles
            return Array.isArray(user.roles) ? 
              user.roles.includes(role.id) : 
              user.roles === role.id;
          }).length : 0;
        
        return {
          ...role,
          user_count: userCount,
          permissions: role.permissions || {}, // Ensure permissions is an object
          accessible_incident_categories: Array.isArray(role.accessible_incident_categories) ? role.accessible_incident_categories : [], // NEW property
          accessible_incident_subcategories: Array.isArray(role.accessible_incident_subcategories) ? role.accessible_incident_subcategories : [], // NEW property
          // accessible_reports: Array.isArray(role.accessible_reports) ? role.accessible_reports : [], // REMOVED property
          custom_data_type_permissions: role.custom_data_type_permissions || {} // Ensure custom_data_type_permissions is an object
        };
      }).filter(Boolean) : []; 
      
      setRoles(processedRoles);
      setUsers(Array.isArray(usersData) ? usersData : []); 
      setCustomDataTypes(Array.isArray(dataTypesData) ? dataTypesData : []); 
      setIncidentCategories(Array.isArray(categoriesData) ? categoriesData : []); // NEW state set
      setIncidentSubCategories(Array.isArray(subCategoriesData) ? subCategoriesData : []); // NEW state set
      
      // REMOVED Report related processing and state setting
      // const reportTypesSet = new Set();
      // const processedReports = Array.isArray(reportsData) ? reportsData.filter(report => {
      //   if (!report || typeof report !== 'object') return false; 
      //   if (report.type && typeof report.type === 'string') {
      //     reportTypesSet.add(report.type);
      //   }
      //   return true;
      // }) : [];
      // setReportTypes(Array.from(reportTypesSet));
      // setReports(processedReports);
      
    } catch (err) {
      console.error("Error loading data:", err);
      setError("שגיאה בטעינת נתונים: " + (err?.message || 'שגיאה לא ידועה'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRoleFormData({
      name: '',
      description: '',
      permissions: {}, // Retained this property
      accessible_incident_categories: [], // NEW property
      accessible_incident_subcategories: [], // NEW property
      // accessible_reports: [], // REMOVED property
      custom_data_type_permissions: {},
      is_system_role: false,
      notes: ''
    });
    setEditingRole(null);
    setActiveTab("general");
    setSearchCategoryTerm(''); // RENAMED
    // setSearchReportTerm(''); // REMOVED
    setSearchDataTypeTerm('');
  };
  
  // Initialize form for new role or when editing with safety checks
  useEffect(() => {
    if (showRoleForm && !editingRole) {
      // New Role
      const initialPermissions = {};
      if (permissionModules && typeof permissionModules === 'object') {
        Object.keys(permissionModules).forEach(moduleKey => {
          const module = permissionModules[moduleKey];
          if (module && Array.isArray(module.permissions)) {
            initialPermissions[moduleKey] = {};
            module.permissions.forEach(perm => {
              if (perm && perm.key) { 
                initialPermissions[moduleKey][perm.key] = false; 
              }
            });
          }
        });
      }
      setRoleFormData(prev => ({
        ...prev,
        permissions: initialPermissions, // Retained for new role initialization
        accessible_incident_categories: [], // Ensure reset for new role
        accessible_incident_subcategories: [] // Ensure reset for new role
      }));
    } else if (editingRole && typeof editingRole === 'object') {
      // Editing Role with safety checks
      setRoleFormData({
        name: editingRole.name || '',
        description: editingRole.description || '',
        permissions: editingRole.permissions || {}, // Ensure it's an object
        accessible_incident_categories: Array.isArray(editingRole.accessible_incident_categories) ? editingRole.accessible_incident_categories : [], // NEW property
        accessible_incident_subcategories: Array.isArray(editingRole.accessible_incident_subcategories) ? editingRole.accessible_incident_subcategories : [], // NEW property
        // accessible_reports: Array.isArray(editingRole.accessible_reports) ? editingRole.accessible_reports : [], // REMOVED property
        custom_data_type_permissions: editingRole.custom_data_type_permissions || {}, // Ensure it's an object
        is_system_role: Boolean(editingRole.is_system_role), // Ensure boolean value
        notes: editingRole.notes || ''
      });
    }
  }, [showRoleForm, editingRole]);


  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    
    if (!roleFormData.name.trim()) {
      alert("שם התפקיד הוא שדה חובה.");
      return;
    }
    
    try {
      if (editingRole && editingRole.id) { 
        await Role.update(editingRole.id, roleFormData);
      } else {
        await Role.create(roleFormData);
      }
      
      await loadData();
      setShowRoleForm(false);
      resetForm();
    } catch (err) {
      console.error("Error saving role:", err);
      alert("שגיאה בשמירת התפקיד: " + (err?.message || 'שגיאה לא ידועה'));
    }
  };

  const handlePermissionChange = (moduleKey, permissionKey, value) => {
    if (!moduleKey || !permissionKey) return; 
    
    setRoleFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleKey]: {
          ...(prev.permissions[moduleKey] || {}), 
          [permissionKey]: Boolean(value) 
        }
      }
    }));
  };
  
  const handleToggleAllModulePermissions = (moduleKey, enable) => {
    if (!moduleKey || !permissionModules[moduleKey]) return; 
    
    const module = permissionModules[moduleKey];
    if (!Array.isArray(module.permissions)) return; 
    
    setRoleFormData(prev => {
      const newModulePermissions = {};
      module.permissions.forEach(perm => {
        if (perm && perm.key) { 
          newModulePermissions[perm.key] = Boolean(enable); 
        }
      });
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [moduleKey]: newModulePermissions
        }
      };
    });
  };
  
  // REMOVED handleReportAccessToggle function
  // const handleReportAccessToggle = (reportId) => { ... };

  const handleCategoryAccessToggle = (categoryId) => { // NEW function
    if (!categoryId) return;
    
    setRoleFormData(prev => {
      const currentCategories = Array.isArray(prev.accessible_incident_categories) ? prev.accessible_incident_categories : [];
      const newCategories = currentCategories.includes(categoryId)
        ? currentCategories.filter(id => id !== categoryId)
        : [...currentCategories, categoryId];
      
      return {
        ...prev,
        accessible_incident_categories: newCategories
      };
    });
  };

  const handleSubCategoryAccessToggle = (subCategoryId) => { // NEW function
    if (!subCategoryId) return;
    
    setRoleFormData(prev => {
      const currentSubCategories = Array.isArray(prev.accessible_incident_subcategories) ? prev.accessible_incident_subcategories : [];
      const newSubCategories = currentSubCategories.includes(subCategoryId)
        ? currentSubCategories.filter(id => id !== subCategoryId)
        : [...currentSubCategories, subCategoryId];
      
      return {
        ...prev,
        accessible_incident_subcategories: newSubCategories
      };
    });
  };

  const handleCustomDataTypePermissionChange = (dataTypeId, permission, value) => {
    if (!dataTypeId || !permission) return; 
    
    setRoleFormData(prev => ({
      ...prev,
      custom_data_type_permissions: {
        ...prev.custom_data_type_permissions,
        [dataTypeId]: {
          ...(prev.custom_data_type_permissions[dataTypeId] || {}), 
          [permission]: Boolean(value) 
        }
      }
    }));
  };

  const handleToggleAllDataTypePermissions = (dataTypeId, enable) => {
    if (!dataTypeId) return; 
    
    const permissions = ['view', 'create', 'edit', 'delete'];
    const updatedPermissions = {};
    
    permissions.forEach(perm => {
      updatedPermissions[perm] = Boolean(enable); 
    });
    
    setRoleFormData(prev => ({
      ...prev,
      custom_data_type_permissions: {
        ...prev.custom_data_type_permissions,
        [dataTypeId]: updatedPermissions
      }
    }));
  };

  // REMOVED filteredReports
  // const filteredReports = Array.isArray(reports) ? reports.filter(report => { ... });

  // Filter categories based on search term with safety checks (NEW)
  const filteredCategories = Array.isArray(incidentCategories) ? incidentCategories.filter(category => {
    if (!category || typeof category !== 'object') return false;
    if (!searchCategoryTerm) return true;
    
    const searchLower = searchCategoryTerm.toLowerCase();
    const name = (category.name || '').toLowerCase();
    
    return name.includes(searchLower);
  }) : [];

  // Filter data types based on search term with safety checks (remains unchanged)
  const filteredDataTypes = Array.isArray(customDataTypes) ? customDataTypes.filter(dataType => {
    if (!dataType || typeof dataType !== 'object') return false;
    if (!searchDataTypeTerm) return true;
    
    const searchLower = searchDataTypeTerm.toLowerCase();
    const name = (dataType.name || '').toLowerCase(); 
    const slug = (dataType.slug || '').toLowerCase(); 
    
    return name.includes(searchLower) || slug.includes(searchLower);
  }) : [];

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
    </div>
  );

  if (error) return <div className="clay-card bg-red-50 p-4 text-red-700 text-center">{error}</div>;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 flex items-center">
            <Shield className="w-8 h-8 ml-3 text-purple-600" />
            ניהול תפקידים
          </h1>
          <p className="text-gray-600">הגדרת תפקידים והרשאות גישה למערכת.</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowRoleForm(true);
          }}
          className="clay-button bg-purple-100 text-purple-700 font-medium flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          תפקיד חדש
        </Button>
      </div>

      {!Array.isArray(roles) || roles.length === 0 ? ( 
        <div className="clay-card bg-white text-center p-10">
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-700">לא נמצאו תפקידים</h3>
          <p className="text-gray-500 mt-2">צור תפקיד חדש כדי להתחיל לנהל הרשאות.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map(role => {
            if (!role || typeof role !== 'object' || !role.id) return null; 
            
            return (
              <Card key={role.id} className="clay-card bg-white flex flex-col justify-between">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-semibold text-purple-700 flex items-center gap-2">
                      <KeyRound className="w-5 h-5" />
                      {role.name || 'תפקיד ללא שם'} 
                    </CardTitle>
                    {role.is_system_role && (
                      <Badge className="bg-gray-200 text-gray-700">תפקיד מערכת</Badge>
                    )}
                  </div>
                  {role.description && (
                    <CardDescription className="text-sm text-gray-600 pt-1">
                      {role.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-grow space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="w-4 h-4 ml-2" />
                    <span>{role.user_count || 0} משתמשים משויכים</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {role.permissions && typeof role.permissions === 'object' && 
                     Object.entries(role.permissions).map(([moduleKey, perms]) => {
                      if (!perms || typeof perms !== 'object') return null; 
                      
                      const enabledCount = Object.values(perms).filter(Boolean).length;
                      if (enabledCount > 0) {
                        const moduleLabel = permissionModules[moduleKey]?.label || moduleKey;
                        return (
                          <Badge key={moduleKey} className="bg-purple-100 text-purple-800 text-xs">
                            {moduleLabel}: {enabledCount}
                          </Badge>
                        );
                      }
                      return null;
                    }).filter(Boolean)}
                  </div>
                  
                  {Array.isArray(role.accessible_incident_categories) && role.accessible_incident_categories.length > 0 && ( // MODIFIED to show incident categories
                    <div className="flex items-center text-sm text-gray-500">
                      <AlertTriangle className="w-4 h-4 ml-2" /> {/* Changed icon */}
                      <span>{role.accessible_incident_categories.length} קטגוריות אירועים נגישות</span> {/* Changed text */}
                    </div>
                  )}
                  
                  {/* REMOVED Reports section from CardContent */}
                  {/* Array.isArray(role.accessible_reports) && role.accessible_reports.length > 0 && ( 
                    <div className="flex items-center text-sm text-gray-500">
                      <FileText className="w-4 h-4 ml-2" />
                      <span>{role.accessible_reports.length} דוחות נגישים</span>
                    </div>
                  )*/}
                  
                  {role.custom_data_type_permissions && 
                   typeof role.custom_data_type_permissions === 'object' &&
                   Object.keys(role.custom_data_type_permissions).length > 0 && ( 
                    <div className="flex items-center text-sm text-gray-500">
                      <Database className="w-4 h-4 ml-2" />
                      <span>{Object.keys(role.custom_data_type_permissions).length} סוגי דאטה מותאמים</span>
                    </div>
                  )}
                  
                  {role.notes && <p className="text-xs text-gray-500 mt-2 italic">הערות: {role.notes}</p>}
                </CardContent>
                <CardFooter className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:bg-blue-50"
                    onClick={() => {
                      setEditingRole(role);
                      setShowRoleForm(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4 ml-1" /> ערוך
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showRoleForm} onOpenChange={setShowRoleForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-2xl font-semibold text-purple-700">
              {editingRole ? 'עריכת תפקיד' : 'יצירת תפקיד חדש'}
            </DialogTitle>
            {editingRole && editingRole.is_system_role && (
              <DialogDescription className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded-md mt-2">
                <AlertCircle className="w-4 h-4 inline ml-1"/>
                זהו תפקיד מערכת. שדות מסוימים עשויים להיות מוגבלים לעריכה.
              </DialogDescription>
            )}
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4"> {/* Grid layout for 3 tabs */}
              <TabsTrigger value="general">פרטים בסיסיים והרשאות</TabsTrigger> {/* Renamed tab */}
              <TabsTrigger value="incidents">הרשאות אירועים</TabsTrigger> {/* NEW tab */}
              <TabsTrigger value="data">ניהול סוגי דאטה</TabsTrigger>
            </TabsList>
            
            <form onSubmit={handleRoleSubmit} className="overflow-y-auto pr-2" style={{maxHeight: "calc(70vh - 120px)"}}>
              <TabsContent value="general" className="space-y-6 mt-0">
                <div>
                  <label className="text-sm font-medium text-gray-700">שם התפקיד</label>
                  <Input
                    value={roleFormData.name}
                    onChange={(e) => setRoleFormData({...roleFormData, name: e.target.value})}
                    className="clay-input mt-1"
                    required
                    disabled={editingRole?.is_system_role || false}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">תיאור</label>
                  <Textarea
                    value={roleFormData.description}
                    onChange={(e) => setRoleFormData({...roleFormData, description: e.target.value})}
                    className="clay-textarea mt-1 h-20"
                  />
                </div>

                {/* Retained the general permission modules section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <Settings className="w-5 h-5 ml-2 text-purple-600" />
                    הגדרת הרשאות מודולים
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(permissionModules).map(([moduleKey, moduleDetails]) => (
                      <Card key={moduleKey} className="clay-card bg-white shadow-sm">
                        <CardHeader className="flex flex-row justify-between items-center !p-3 bg-purple-50 rounded-t-lg">
                          <CardTitle className="text-md font-medium text-purple-700">
                            {moduleDetails.label}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Button type="button" size="sm" variant="ghost" className="text-xs p-1 h-auto" onClick={() => handleToggleAllModulePermissions(moduleKey, true)}>
                              <ToggleRight className="w-4 h-4 ml-1"/> אפשר הכל
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="text-xs p-1 h-auto" onClick={() => handleToggleAllModulePermissions(moduleKey, false)}>
                              <ToggleLeft className="w-4 h-4 ml-1"/> בטל הכל
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 p-4">
                          {Array.isArray(moduleDetails.permissions) && moduleDetails.permissions.map(permission => (
                            <div key={permission.key} className="flex items-center">
                              <Checkbox
                                id={`${moduleKey}-${permission.key}`}
                                checked={Boolean(roleFormData.permissions[moduleKey]?.[permission.key])}
                                onCheckedChange={(checked) => handlePermissionChange(moduleKey, permission.key, !!checked)}
                                className="clay-checkbox"
                              />
                              <label htmlFor={`${moduleKey}-${permission.key}`} className="mr-2 text-sm text-gray-700 select-none">
                                {permission.label}
                              </label>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">הערות נוספות</label>
                  <Textarea
                    value={roleFormData.notes}
                    onChange={(e) => setRoleFormData({...roleFormData, notes: e.target.value})}
                    className="clay-textarea mt-1 h-20"
                    placeholder="הערות פנימיות לגבי התפקיד..."
                  />
                </div>
              </TabsContent>
              
              {/* NEW TabsContent for Incidents */}
              <TabsContent value="incidents" className="mt-0">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <AlertTriangle className="w-5 h-5 ml-2 text-purple-600" />
                      הגדרת גישה לאירועים
                    </h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm w-64">בחר קטגוריות ותתי-קטגוריות אירועים שלתפקיד זה תהיה גישה אליהם</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="חיפוש קטגוריות..."
                        className="clay-input pr-10"
                        value={searchCategoryTerm}
                        onChange={(e) => setSearchCategoryTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <Card className="clay-card bg-white shadow-sm">
                    <CardContent className="p-0">
                      <div className="p-1">
                        <Accordion type="multiple" className="w-full">
                          {Array.isArray(filteredCategories) && filteredCategories.map((category, index) => {
                            const categorySubCategories = incidentSubCategories.filter(sub => sub?.parent_category_id === category.id);
                            
                            return (
                              <AccordionItem key={index} value={`category-${index}`}>
                                <AccordionTrigger className="hover:bg-gray-50 px-3 py-2 rounded-md">
                                  <div className="flex justify-between items-center w-full ml-2">
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={Boolean(roleFormData.accessible_incident_categories?.includes(category.id))}
                                        onCheckedChange={() => handleCategoryAccessToggle(category.id)}
                                        className="clay-checkbox"
                                        onClick={(e) => e.stopPropagation()} // Prevent accordion from toggling when checkbox is clicked
                                      />
                                      <span>{category.name || "קטגוריה ללא שם"}</span>
                                    </div>
                                    <Badge className="bg-purple-100 text-purple-800 text-xs mr-auto">
                                      {categorySubCategories.length} תתי-קטגוריות
                                    </Badge>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-1 pl-6 my-1">
                                    {categorySubCategories.map(subCategory => (
                                      <div key={subCategory.id} className="flex items-center py-1 px-2 hover:bg-purple-50 rounded-md">
                                        <Checkbox
                                          id={`subcategory-access-${subCategory.id}`}
                                          checked={Boolean(roleFormData.accessible_incident_subcategories?.includes(subCategory.id))}
                                          onCheckedChange={() => handleSubCategoryAccessToggle(subCategory.id)}
                                          className="clay-checkbox ml-2"
                                        />
                                        <label 
                                          htmlFor={`subcategory-access-${subCategory.id}`} 
                                          className="text-sm select-none cursor-pointer flex-1"
                                        >
                                          {subCategory.name || 'תת-קטגוריה ללא שם'}
                                        </label>
                                      </div>
                                    ))}
                                    {categorySubCategories.length === 0 && (
                                      <div className="text-center text-gray-500 py-2 text-sm">
                                        אין תתי-קטגוריות
                                      </div>
                                    )}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                        
                        {filteredCategories.length === 0 && (
                          <div className="text-center text-gray-500 p-8">
                            {searchCategoryTerm 
                              ? `לא נמצאו קטגוריות התואמות לחיפוש "${searchCategoryTerm}"`
                              : "לא נמצאו קטגוריות אירועים במערכת"}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              {/* Existing TabsContent for data types */}
              <TabsContent value="data" className="mt-0">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <Database className="w-5 h-5 ml-2 text-purple-600" />
                      הגדרת גישה לסוגי דאטה מותאמים
                    </h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm w-64">הגדר הרשאות ספציפיות לכל סוג דאטה מותאם אישית</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="חיפוש סוגי דאטה..."
                        className="clay-input pr-10"
                        value={searchDataTypeTerm}
                        onChange={(e) => setSearchDataTypeTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {filteredDataTypes.length === 0 ? (
                    <div className="clay-card bg-white text-center p-8">
                      <Database className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-gray-500">
                        {searchDataTypeTerm 
                          ? `לא נמצאו סוגי דאטה התואמים לחיפוש "${searchDataTypeTerm}"`
                          : "לא הוגדרו סוגי דאטה מותאמים במערכת"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredDataTypes.map(dataType => (
                        <Card key={dataType.id} className="clay-card bg-white shadow-sm">
                          <CardHeader className="flex flex-row justify-between items-center !p-3 bg-blue-50 rounded-t-lg">
                            <CardTitle className="text-md font-medium text-blue-700 flex items-center gap-2">
                              <Database className="w-4 h-4" />
                              {dataType.name || 'סוג דאטה ללא שם'}
                              <span className="text-xs text-gray-500">({dataType.slug || 'ללא סלאג'})</span>
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Button 
                                type="button" 
                                size="sm" 
                                variant="ghost" 
                                className="text-xs p-1 h-auto" 
                                onClick={() => handleToggleAllDataTypePermissions(dataType.id, true)}
                              >
                                <ToggleRight className="w-4 h-4 ml-1"/> אפשר הכל
                              </Button>
                              <Button 
                                type="button" 
                                size="sm" 
                                variant="ghost" 
                                className="text-xs p-1 h-auto" 
                                onClick={() => handleToggleAllDataTypePermissions(dataType.id, false)}
                              >
                                <ToggleLeft className="w-4 h-4 ml-1"/> בטל הכל
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4">
                            {['view', 'create', 'edit', 'delete'].map(permission => (
                              <div key={permission} className="flex items-center">
                                <Checkbox
                                  id={`datatype-${dataType.id}-${permission}`}
                                  checked={Boolean(roleFormData.custom_data_type_permissions[dataType.id]?.[permission])}
                                  onCheckedChange={(checked) => handleCustomDataTypePermissionChange(dataType.id, permission, !!checked)}
                                  className="clay-checkbox"
                                />
                                <label htmlFor={`datatype-${dataType.id}-${permission}`} className="mr-2 text-sm text-gray-700 select-none">
                                  {permission === 'view' ? 'צפייה' : 
                                   permission === 'create' ? 'יצירה' : 
                                   permission === 'edit' ? 'עריכה' : 'מחיקה'}
                                </label>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </form>
          </Tabs>
          
          <DialogFooter className="pt-6 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="clay-button">
                ביטול
              </Button>
            </DialogClose>
            <Button 
              type="button"
              onClick={handleRoleSubmit}
              className="clay-button bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingRole ? 'שמור שינויים' : 'צור תפקיד'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
