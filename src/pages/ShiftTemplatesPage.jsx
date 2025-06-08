
import React, { useState, useEffect } from 'react';
import { ShiftTemplate } from '@/api/entities';
import { Shift } from '@/api/entities'; // Add Shift import
import { Role } from '@/api/entities';
import { IncidentCategory } from '@/api/entities';
import { IncidentSubCategory } from '@/api/entities';
import { Route } from '@/api/entities';
import { User } from '@/api/entities'; // Add User import
import { 
  Plus, Edit2, Trash2, Save, X, Calendar, Clock, Users, Target, FileText, Settings, Route as RouteIcon,
  CalendarDays, Eye, UserPlus, CheckCircle2, AlertTriangle // Add icons for shifts management
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose 
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

const daysOfWeekMap = {
  sunday: 'ראשון',
  monday: 'שני',
  tuesday: 'שלישי',
  wednesday: 'רביעי',
  thursday: 'חמישי',
  friday: 'שישי',
  saturday: 'שבת',
};

export default function ShiftTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [shifts, setShifts] = useState([]); // Add shifts state
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]); // Add users state
  const [incidentCategories, setIncidentCategories] = useState([]);
  const [incidentSubCategories, setIncidentSubCategories] = useState([]);
  const [allRoutes, setAllRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("templates"); // Add tabs state
  
  const [showForm, setShowForm] = useState(false);
  const [showShiftForm, setShowShiftForm] = useState(false); // Add shift form state
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingShift, setEditingShift] = useState(null); // Add editing shift state
  const [currentTemplate, setCurrentTemplate] = useState({
    name: '',
    site: '',
    days_of_week: [],
    start_time: '',
    end_time: '',
    required_roles: [],
    shift_targets: [],
    default_routes: [],
    notes: '',
    is_active: true
  });

  // Add current shift state for manual shift creation
  const [currentShift, setCurrentShift] = useState({
    site: '',
    start_time: '', // ISO string for datetime-local input (YYYY-MM-DDTHH:MM)
    end_time: '',   // ISO string for datetime-local input (YYYY-MM-DDTHH:MM)
    manager_id: '',
    staff: [], // Array of { user_id, role_id, notes }
    status: 'scheduled',
    notes: '',
    shift_targets_status: [] // No UI for this, but needs to be initialized
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        templatesData, shiftsData, rolesData, usersData, // Add shifts and users
        categoriesData, subCategoriesData, routesData
      ] = await Promise.all([
        ShiftTemplate.list(),
        Shift.list('-start_time'), // Load shifts, sorted by start_time descending
        Role.list(),
        User.list(), // Load users
        IncidentCategory.list(),
        IncidentSubCategory.list(),
        Route.list()
      ]);
      setTemplates(templatesData);
      setShifts(shiftsData); // Set shifts
      setRoles(rolesData);
      setUsers(usersData); // Set users
      setIncidentCategories(categoriesData);
      setIncidentSubCategories(subCategoriesData);
      setAllRoutes(routesData);
    } catch (err) {
      console.error("Error loading data for shift templates:", err);
      setError("שגיאה בטעינת נתונים: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'תפקיד לא ידוע';
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.full_name : 'משתמש לא ידוע';
  };

  const getSiteName = (site) => {
    // Assuming 'site' field is a string name, not an ID.
    return site || 'לא משויך לאתר';
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return 'לא הוגדר';
    // Ensure it's a valid date string before parsing
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'תאריך לא חוקי';
    return date.toLocaleString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper to format ISO string for datetime-local input
  const formatIsoForDatetimeLocal = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      // Check for invalid date
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string received:', isoString);
        return '';
      }
      return date.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
    } catch (error) {
      console.error('Error formatting ISO string for datetime-local:', error);
      return '';
    }
  };

  const resetForm = () => {
    setCurrentTemplate({
      name: '',
      site: '',
      days_of_week: [],
      start_time: '',
      end_time: '',
      required_roles: [],
      shift_targets: [],
      default_routes: [],
      notes: '',
      is_active: true
    });
    setEditingTemplate(null);
  };

  const resetShiftForm = () => {
    setCurrentShift({
      site: '',
      start_time: '',
      end_time: '',
      manager_id: '',
      staff: [],
      status: 'scheduled',
      notes: '',
      shift_targets_status: []
    });
    setEditingShift(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentTemplate(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleShiftInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentShift(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleDayToggle = (day) => {
    setCurrentTemplate(prev => {
      const newDays = prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day];
      return { ...prev, days_of_week: newDays };
    });
  };

  const addRequiredRole = () => {
    setCurrentTemplate(prev => ({
      ...prev,
      required_roles: [...prev.required_roles, { role_id: '', count: 1 }]
    }));
  };

  const updateRequiredRole = (index, field, value) => {
    setCurrentTemplate(prev => {
      const updatedRoles = [...prev.required_roles];
      updatedRoles[index] = { ...updatedRoles[index], [field]: field === 'count' ? parseInt(value) || 1 : value };
      return { ...prev, required_roles: updatedRoles };
    });
  };

  const removeRequiredRole = (index) => {
    setCurrentTemplate(prev => ({
      ...prev,
      required_roles: prev.required_roles.filter((_, i) => i !== index)
    }));
  };

  const addShiftTarget = () => {
    setCurrentTemplate(prev => ({
      ...prev,
      shift_targets: [...prev.shift_targets, { 
        id: Date.now().toString(), 
        incident_category_id: '', 
        count: 1, 
        description: '', 
        incident_sub_category_ids: [], 
        target_role_id: '' 
      }]
    }));
  };

  const updateShiftTarget = (index, field, value) => {
    setCurrentTemplate(prev => {
      const updatedTargets = [...prev.shift_targets];
      if (field === 'incident_sub_category_ids') {
        updatedTargets[index] = { ...updatedTargets[index], [field]: value };
      } else {
        updatedTargets[index] = { ...updatedTargets[index], [field]: field === 'count' ? parseInt(value) || 1 : value };
      }
      return { ...prev, shift_targets: updatedTargets };
    });
  };
  
  const removeShiftTarget = (index) => {
    setCurrentTemplate(prev => ({
      ...prev,
      shift_targets: prev.shift_targets.filter((_, i) => i !== index)
    }));
  };

  const handleRouteSelection = (routeId) => {
    setCurrentTemplate(prev => {
      const currentRoutes = prev.default_routes || [];
      const newRoutes = currentRoutes.includes(routeId)
        ? currentRoutes.filter(id => id !== routeId)
        : [...currentRoutes, routeId];
      return { ...prev, default_routes: newRoutes };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentTemplate.name || !currentTemplate.site || !currentTemplate.start_time || !currentTemplate.end_time) {
      alert("נא למלא את כל שדות החובה: שם, אתר, שעת התחלה ושעת סיום.");
      return;
    }
    
    if (currentTemplate.required_roles.some(rr => !rr.role_id)) {
      alert("נא לבחור תפקיד לכל דרישת צוות.");
      return;
    }
    if (currentTemplate.shift_targets.some(st => !st.incident_category_id || !st.description)) {
      alert("נא למלא קטגוריית אירוע ותיאור לכל יעד משמרת.");
      return;
    }

    try {
      if (editingTemplate) {
        await ShiftTemplate.update(editingTemplate.id, currentTemplate);
      } else {
        await ShiftTemplate.create(currentTemplate);
      }
      await loadData();
      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error("Error saving shift template:", err);
      alert("שגיאה בשמירת תבנית משמרת: " + err.message);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setCurrentTemplate({
      ...template,
      days_of_week: Array.isArray(template.days_of_week) ? [...template.days_of_week] : [],
      required_roles: Array.isArray(template.required_roles) 
        ? template.required_roles.map(rr => ({ ...rr })) 
        : [],
      shift_targets: Array.isArray(template.shift_targets) 
        ? template.shift_targets.map(st => ({ 
            ...st, 
            incident_sub_category_ids: Array.isArray(st.incident_sub_category_ids) ? [...st.incident_sub_category_ids] : [] 
          })) 
        : [],
      default_routes: Array.isArray(template.default_routes) ? [...template.default_routes] : [],
    });
    setShowForm(true);
  };

  const handleDelete = async (templateId) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק תבנית משמרת זו?")) {
      try {
        await ShiftTemplate.delete(templateId);
        await loadData();
      } catch (err) {
        console.error("Error deleting shift template:", err);
        alert("שגיאה במחיקת תבנית המשמרת: " + err.message);
      }
    }
  };

  // Enhanced shift creation function with proper target assignment
  const handleCreateShift = async (e) => {
    e.preventDefault();
    if (!currentShift.site || !currentShift.start_time || !currentShift.end_time) {
      alert("נא למלא את כל שדות החובה: אתר, שעת התחלה ושעת סיום.");
      return;
    }

    try {
      // Process shift targets to include required fields
      const processedTargetsStatus = currentShift.shift_targets_status?.map(target => ({
        target_id: target.target_id || target.template_target_id || `target_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        assigned_user_id: target.assigned_user_id || (currentShift.staff.length > 0 ? currentShift.staff[0].user_id : currentShift.manager_id),
        target_role_id: target.target_role_id || target.target_definition?.target_role_id,
        target_definition: target.target_definition,
        completed_count: target.completed_count || 0,
        related_incident_ids: target.related_incident_ids || [],
        notes: target.notes || '',
        last_updated: new Date().toISOString()
      })) || [];

      // Clean up staff data - ensure we only send required fields
      const processedStaff = currentShift.staff.map(member => ({
        user_id: member.user_id,
        role: member.role_id || member.role, // Use role_id if available, fallback to role
        assignment_type: member.assignment_type || 'specific_user',
        check_in_time: member.check_in_time || null,
        check_out_time: member.check_out_time || null,
        notes: member.notes || '',
        targets_assigned: member.targets_assigned || []
      }));

      const shiftData = {
        ...currentShift,
        staff: processedStaff,
        shift_targets_status: processedTargetsStatus,
        shift_log: currentShift.shift_log || []
      };

      if (editingShift) {
        await Shift.update(editingShift.id, shiftData);
      } else {
        await Shift.create(shiftData);
      }
      await loadData();
      setShowShiftForm(false);
      resetShiftForm();
    } catch (err) {
      console.error("Error saving shift:", err);
      alert("שגיאה בשמירת משמרת: " + err.message);
    }
  };

  const handleEditShift = (shift) => {
    setEditingShift(shift);
    
    // Clean up staff data for editing
    const processedStaff = (shift.staff || []).map(member => ({
      ...member,
      role_id: member.role_id || member.role, // Ensure role_id is available
      role: member.role_id || member.role // Keep role for backwards compatibility
    }));

    // Clean up targets for editing
    const processedTargets = (shift.shift_targets_status || []).map(target => ({
      ...target,
      target_id: target.target_id || target.template_target_id || `target_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      assigned_user_id: target.assigned_user_id || (processedStaff.length > 0 ? processedStaff[0].user_id : shift.manager_id)
    }));

    setCurrentShift({
      ...shift,
      start_time: formatIsoForDatetimeLocal(shift.start_time), // Using existing helper
      end_time: formatIsoForDatetimeLocal(shift.end_time), // Using existing helper
      staff: processedStaff,
      shift_targets_status: processedTargets
    });
    setShowShiftForm(true);
  };

  const handleDeleteShift = async (shiftId) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק משמרת זו?")) {
      try {
        await Shift.delete(shiftId);
        await loadData();
      } catch (err) {
        console.error("Error deleting shift:", err);
        alert("שגיאה במחיקת המשמרת: " + err.message);
      }
    }
  };

  // Add staff member to shift with proper role handling
  const addStaffMember = () => {
    setCurrentShift(prev => ({
      ...prev,
      staff: [...prev.staff, { 
        user_id: '', 
        role: '', 
        role_id: '', // Add role_id field
        notes: '',
        assignment_type: 'specific_user',
        check_in_time: null,
        check_out_time: null,
        targets_assigned: []
      }]
    }));
  };

  const updateStaffMember = (index, field, value) => {
    setCurrentShift(prev => ({
      ...prev,
      staff: prev.staff.map((member, i) => {
        if (i === index) {
          const updatedMember = { ...member, [field]: value };
          // If updating role_id, also update role for backwards compatibility
          if (field === 'role_id') {
            updatedMember.role = value;
          }
          // If updating role, also update role_id
          if (field === 'role') {
            updatedMember.role_id = value;
          }
          return updatedMember;
        }
        return member;
      })
    }));
  };

  const removeStaffMember = (index) => {
    setCurrentShift(prev => ({
      ...prev,
      staff: prev.staff.filter((_, i) => i !== index)
    }));
  };

  // Enhanced function to assign targets to users
  const assignTargetsToUsers = () => {
    if (!currentShift.staff || currentShift.staff.length === 0) {
      return;
    }

    const updatedTargets = (currentShift.shift_targets_status || []).map(target => {
      // Find a user with matching role or assign to first user
      const assignedUser = currentShift.staff.find(staff => 
        staff.role_id === target.target_definition?.target_role_id || 
        staff.role === target.target_definition?.target_role_id
      ) || currentShift.staff[0];

      return {
        ...target,
        target_id: target.target_id || `target_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        assigned_user_id: assignedUser ? assignedUser.user_id : currentShift.manager_id,
        completed_count: target.completed_count || 0,
        related_incident_ids: target.related_incident_ids || [],
        notes: target.notes || '',
        last_updated: new Date().toISOString()
      };
    });

    setCurrentShift(prev => ({
      ...prev,
      shift_targets_status: updatedTargets
    }));
  };

  // Call assignTargetsToUsers when staff changes
  useEffect(() => {
    if (currentShift.staff && currentShift.staff.length > 0 && currentShift.shift_targets_status && currentShift.shift_targets_status.length > 0) {
      assignTargetsToUsers();
    }
  }, [currentShift.staff?.length]);

  if (loading) {
    return <div className="clay-card bg-white p-8 text-center">
             <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
             <p className="text-gray-600">טוען נתוני משמרות...</p>
           </div>;
  }
  
  if (error) {
    return <div className="clay-card bg-red-50 p-4 text-red-700 text-center">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <FileText className="w-8 h-8 ml-3 text-purple-500" />
          ניהול משמרות ותבניות
        </h1>
        <p className="text-gray-600">הגדר ונהל תבניות סטנדרטיות למשמרות ויצירת משמרות פעילות.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="templates" className="clay-button data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
            <FileText className="w-4 h-4 ml-2" />
            תבניות משמרות
          </TabsTrigger>
          <TabsTrigger value="shifts" className="clay-button data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
            <CalendarDays className="w-4 h-4 ml-2" />
            משמרות פעילות
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          {!showForm && (
            <Button onClick={() => { resetForm(); setShowForm(true); }} className="clay-button flex items-center gap-2 bg-purple-100 text-purple-700 font-medium mb-6">
              <Plus className="w-4 h-4" />
              תבנית חדשה
            </Button>
          )}

          {showForm ? (
            <Card className="clay-card mb-8">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-2xl text-purple-700">
                    {editingTemplate ? 'עריכת' : 'יצירת'} תבנית משמרת
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); resetForm(); }}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Info */}
                  <fieldset className="clay-card bg-purple-50 p-4 rounded-lg">
                    <legend className="text-lg font-semibold mb-3 text-purple-600">פרטים כלליים</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="templateName" className="block text-sm font-medium mb-1">שם התבנית</label>
                        <Input id="templateName" name="name" value={currentTemplate.name} onChange={handleInputChange} className="clay-input" required />
                      </div>
                      <div>
                        <label htmlFor="templateSite" className="block text-sm font-medium mb-1">אתר</label>
                        <Input id="templateSite" name="site" value={currentTemplate.site} onChange={handleInputChange} className="clay-input" required />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium mb-2">ימים בשבוע</label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(daysOfWeekMap).map(([eng, heb]) => (
                          <Button
                            key={eng}
                            type="button"
                            variant={currentTemplate.days_of_week.includes(eng) ? "default" : "outline"}
                            onClick={() => handleDayToggle(eng)}
                            className={`clay-button text-xs ${currentTemplate.days_of_week.includes(eng) ? 'bg-purple-600 text-white' : ''}`}
                          >
                            {heb}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label htmlFor="startTime" className="block text-sm font-medium mb-1">שעת התחלה</label>
                        <Input id="startTime" name="start_time" type="time" value={currentTemplate.start_time} onChange={handleInputChange} className="clay-input" required />
                      </div>
                      <div>
                        <label htmlFor="endTime" className="block text-sm font-medium mb-1">שעת סיום</label>
                        <Input id="endTime" name="end_time" type="time" value={currentTemplate.end_time} onChange={handleInputChange} className="clay-input" required />
                      </div>
                    </div>
                    <div className="mt-4">
                        <label htmlFor="templateNotes" className="block text-sm font-medium mb-1">הערות</label>
                        <Textarea id="templateNotes" name="notes" value={currentTemplate.notes} onChange={handleInputChange} className="clay-input h-20" />
                    </div>
                     <div className="flex items-center space-x-2 mt-4">
                        <Checkbox 
                          id="isActive" 
                          name="is_active" 
                          checked={currentTemplate.is_active} 
                          onCheckedChange={(checked) => handleInputChange({ target: { name: 'is_active', checked, type: 'checkbox' }})} 
                          className="clay-checkbox"
                        />
                        <label htmlFor="isActive" className="text-sm font-medium">תבנית פעילה</label>
                      </div>
                  </fieldset>

                  {/* Required Roles */}
                  <fieldset className="clay-card bg-indigo-50 p-4 rounded-lg">
                    <legend className="text-lg font-semibold mb-3 text-indigo-600 flex items-center gap-2">
                      <Users className="w-5 h-5" /> דרישות צוות
                    </legend>
                    {currentTemplate.required_roles.map((rr, index) => (
                      <div key={index} className="grid grid-cols-3 gap-3 items-end mb-2 p-3 bg-white rounded-md shadow-sm">
                        <div className="col-span-3 md:col-span-1">
                          <label className="text-xs font-medium">תפקיד</label>
                          <Select value={rr.role_id} onValueChange={(value) => updateRequiredRole(index, 'role_id', value)}>
                            <SelectTrigger className="clay-select text-sm">
                              <SelectValue placeholder="בחר תפקיד..." />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map(role => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <label className="text-xs font-medium">כמות</label>
                          <Input type="number" min="1" value={rr.count} onChange={(e) => updateRequiredRole(index, 'count', e.target.value)} className="clay-input text-sm" />
                        </div>
                        <Button type="button" variant="ghost" onClick={() => removeRequiredRole(index)} className="text-red-500 hover:bg-red-50 p-2 self-end">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addRequiredRole} className="clay-button text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700 mt-2">
                      <Plus className="w-3 h-3 mr-1" /> הוסף דרישת צוות
                    </Button>
                  </fieldset>

                  {/* Shift Targets */}
                  <fieldset className="clay-card bg-teal-50 p-4 rounded-lg">
                    <legend className="text-lg font-semibold mb-3 text-teal-600 flex items-center gap-2">
                      <Target className="w-5 h-5" /> יעדי משמרת
                    </legend>
                    {currentTemplate.shift_targets.map((st, index) => (
                      <div key={st.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start mb-3 p-3 bg-white rounded-md shadow-sm">
                        <div className="md:col-span-1">
                          <label className="text-xs font-medium">קטגוריית אירוע</label>
                          <Select value={st.incident_category_id} onValueChange={(value) => updateShiftTarget(index, 'incident_category_id', value)}>
                            <SelectTrigger className="clay-select text-sm">
                              <SelectValue placeholder="בחר קטגוריה..." />
                            </SelectTrigger>
                            <SelectContent>
                              {incidentCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-1">
                          <label className="text-xs font-medium">כמות נדרשת</label>
                          <Input type="number" min="1" value={st.count} onChange={(e) => updateShiftTarget(index, 'count', e.target.value)} className="clay-input text-sm" />
                        </div>
                         <div className="md:col-span-1">
                          <label className="text-xs font-medium">תפקיד משויך (אופציונלי)</label>
                          <Select value={st.target_role_id || ''} onValueChange={(value) => updateShiftTarget(index, 'target_role_id', value)}>
                            <SelectTrigger className="clay-select text-sm">
                              <SelectValue placeholder="כללי למשמרת" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null}>כללי למשמרת</SelectItem>
                              {roles.map(role => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs font-medium">תיאור היעד</label>
                          <Input value={st.description} onChange={(e) => updateShiftTarget(index, 'description', e.target.value)} placeholder="תיאור מפורט של היעד" className="clay-input text-sm" />
                        </div>
                        <Button type="button" variant="ghost" onClick={() => removeShiftTarget(index)} className="text-red-500 hover:bg-red-50 p-2 self-center md:self-end">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addShiftTarget} className="clay-button text-sm bg-teal-100 hover:bg-teal-200 text-teal-700 mt-2">
                      <Plus className="w-3 h-3 mr-1" /> הוסף יעד
                    </Button>
                  </fieldset>

                  {/* Default Routes */}
                  <fieldset className="clay-card bg-orange-50 p-4 rounded-lg">
                    <legend className="text-lg font-semibold mb-3 text-orange-600 flex items-center gap-2">
                      <RouteIcon className="w-5 h-5" /> מסלולים קבועים למשמרת
                    </legend>
                    {allRoutes.length === 0 ? (
                      <p className="text-sm text-gray-500">אין מסלולים מוגדרים במערכת. <a href={createPageUrl("Routes")} className="text-orange-600 underline">עבור לדף ניהול מסלולים</a> כדי להוסיף.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {allRoutes.filter(route => route.is_active).map(route => (
                          <div key={route.id} className="flex items-center p-2 bg-white rounded-md shadow-sm border">
                            <Checkbox
                              id={`route-${route.id}`}
                              checked={(currentTemplate.default_routes || []).includes(route.id)}
                              onCheckedChange={() => handleRouteSelection(route.id)}
                              className="clay-checkbox ml-2"
                            />
                            <label htmlFor={`route-${route.id}`} className="text-sm font-medium select-none flex-1">
                              {route.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </fieldset>

                  <DialogFooter className="pt-6 border-t">
                    <Button type="button" variant="outline" className="clay-button" onClick={() => { setShowForm(false); resetForm(); }}>
                      ביטול
                    </Button>
                    <Button type="submit" className="clay-button bg-purple-600 hover:bg-purple-700 text-white">
                      <Save className="w-4 h-4 mr-2" /> {editingTemplate ? 'שמור שינויים' : 'צור תבנית'}
                    </Button>
                  </DialogFooter>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {templates.length === 0 && !loading && (
                <Card className="clay-card text-center p-8">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400"/>
                    <h3 className="text-xl font-semibold text-gray-700">אין תבניות משמרת</h3>
                    <p className="text-gray-500">לחץ על "תבנית חדשה" כדי להתחיל.</p>
                </Card>
              )}
              {templates.map(template => (
                <Card key={template.id} className="clay-card">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl text-purple-700">{template.name}</CardTitle>
                        <CardDescription>אתר: {template.site}</CardDescription>
                        {!template.is_active && <Badge className="bg-gray-200 text-gray-600 mt-1">לא פעילה</Badge>}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(template)} title="ערוך">
                          <Edit2 className="w-4 h-4 text-purple-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)} title="מחק">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="clay-button text-xs"
                            onClick={() => navigate(createPageUrl(`CreateShiftFromTemplatePage?templateId=${template.id}`))}
                        >
                            <Plus className="w-3 h-3 ml-1"/> צור משמרת מהתבנית
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>{template.start_time} - {template.end_time}</span>
                      <span className="text-gray-400">|</span>
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>{template.days_of_week.map(day => daysOfWeekMap[day]).join(', ') || 'לא הוגדרו ימים'}</span>
                    </div>
                    {template.required_roles?.length > 0 && (
                      <div className="flex items-start gap-2 text-sm">
                        <Users className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <span className="font-medium">צוות נדרש: </span>
                           {template.required_roles.map(rr => `${getRoleName(rr.role_id)} (×${rr.count})`).join(', ')}
                        </div>
                      </div>
                    )}
                    {template.shift_targets?.length > 0 && (
                      <div className="flex items-start gap-2 text-sm">
                        <Target className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <span className="font-medium">יעדים: </span>
                          {template.shift_targets.map(st => `${st.description} (×${st.count})`).join('; ')}
                        </div>
                      </div>
                    )}
                     {(template.default_routes || []).length > 0 && (
                      <div className="flex items-start gap-2 text-sm">
                        <RouteIcon className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <span className="font-medium">מסלולים קבועים: </span>
                           {(template.default_routes || []).map(routeId => allRoutes.find(r => r.id === routeId)?.name || 'לא ידוע').join(', ')}
                        </div>
                      </div>
                    )}
                    {template.notes && <p className="text-sm text-gray-600 italic">הערות: {template.notes}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="shifts">
          {!showShiftForm && (
            <Button onClick={() => { resetShiftForm(); setShowShiftForm(true); }} className="clay-button flex items-center gap-2 bg-blue-100 text-blue-700 font-medium mb-6">
              <Plus className="w-4 h-4" />
              משמרת חדשה
            </Button>
          )}

          {showShiftForm ? (
            <Card className="clay-card mb-8">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-2xl text-blue-700">
                    {editingShift ? 'עריכת' : 'יצירת'} משמרת
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => { setShowShiftForm(false); resetShiftForm(); }}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateShift} className="space-y-6">
                  <fieldset className="clay-card bg-blue-50 p-4 rounded-lg">
                    <legend className="text-lg font-semibold mb-3 text-blue-600">פרטי משמרת</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="shiftSite" className="block text-sm font-medium mb-1">אתר</label>
                        <Input id="shiftSite" name="site" value={currentShift.site} onChange={handleShiftInputChange} className="clay-input" required />
                      </div>
                      <div>
                        <label htmlFor="shiftManager" className="block text-sm font-medium mb-1">מנהל משמרת</label>
                        <Select value={currentShift.manager_id} onValueChange={(value) => setCurrentShift(prev => ({...prev, manager_id: value}))}>
                          <SelectTrigger className="clay-select">
                            <SelectValue placeholder="בחר מנהל משמרת..." />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map(user => <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label htmlFor="shiftStartTime" className="block text-sm font-medium mb-1">שעת התחלה</label>
                        <Input id="shiftStartTime" name="start_time" type="datetime-local" value={currentShift.start_time} onChange={handleShiftInputChange} className="clay-input" required />
                      </div>
                      <div>
                        <label htmlFor="shiftEndTime" className="block text-sm font-medium mb-1">שעת סיום</label>
                        <Input id="shiftEndTime" name="end_time" type="datetime-local" value={currentShift.end_time} onChange={handleShiftInputChange} className="clay-input" required />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label htmlFor="shiftStatus" className="block text-sm font-medium mb-1">סטטוס</label>
                      <Select value={currentShift.status} onValueChange={(value) => setCurrentShift(prev => ({...prev, status: value}))}>
                        <SelectTrigger className="clay-select">
                          <SelectValue placeholder="בחר סטטוס..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">מתוכננת</SelectItem>
                          <SelectItem value="active">פעילה</SelectItem>
                          <SelectItem value="completed">הושלמה</SelectItem>
                          <SelectItem value="cancelled">בוטלה</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="mt-4">
                        <label htmlFor="shiftNotes" className="block text-sm font-medium mb-1">הערות</label>
                        <Textarea id="shiftNotes" name="notes" value={currentShift.notes} onChange={handleShiftInputChange} className="clay-input h-20" />
                    </div>
                  </fieldset>

                  {/* Staff Assignment */}
                  <fieldset className="clay-card bg-green-50 p-4 rounded-lg">
                    <legend className="text-lg font-semibold mb-3 text-green-600 flex items-center gap-2">
                      <Users className="w-5 h-5" /> הקצאת צוות
                    </legend>
                    {currentShift.staff.map((member, index) => (
                      <div key={index} className="grid grid-cols-4 gap-3 items-end mb-2 p-3 bg-white rounded-md shadow-sm">
                        <div className="col-span-4 md:col-span-1">
                          <label className="text-xs font-medium">משתמש</label>
                          <Select value={member.user_id} onValueChange={(value) => updateStaffMember(index, 'user_id', value)}>
                            <SelectTrigger className="clay-select text-sm">
                              <SelectValue placeholder="בחר משתמש..." />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map(user => <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3 md:col-span-1">
                          <label className="text-xs font-medium">תפקיד</label>
                          <Select value={member.role_id || member.role} onValueChange={(value) => updateStaffMember(index, 'role_id', value)}>
                            <SelectTrigger className="clay-select text-sm">
                              <SelectValue placeholder="בחר תפקיד..." />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map(role => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3 md:col-span-1">
                          <label className="text-xs font-medium">הערות</label>
                          <Input value={member.notes || ''} onChange={(e) => updateStaffMember(index, 'notes', e.target.value)} className="clay-input text-sm" placeholder="הערות..." />
                        </div>
                        <Button type="button" variant="ghost" onClick={() => removeStaffMember(index)} className="text-red-500 hover:bg-red-50 p-2 self-end">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addStaffMember} className="clay-button text-sm bg-green-100 hover:bg-green-200 text-green-700 mt-2">
                      <Plus className="w-3 h-3 mr-1" /> הוסף איש צוות
                    </Button>
                  </fieldset>

                  <DialogFooter className="pt-6 border-t">
                    <Button type="button" variant="outline" className="clay-button" onClick={() => { setShowShiftForm(false); resetShiftForm(); }}>
                      ביטול
                    </Button>
                    <Button type="submit" className="clay-button bg-blue-600 hover:bg-blue-700 text-white">
                      <Save className="w-4 h-4 mr-2" /> {editingShift ? 'שמור שינויים' : 'צור משמרת'}
                    </Button>
                  </DialogFooter>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {shifts.length === 0 && !loading && (
                <Card className="clay-card text-center p-8">
                    <CalendarDays className="w-16 h-16 mx-auto mb-4 text-gray-400"/>
                    <h3 className="text-xl font-semibold text-gray-700">אין משמרות פעילות</h3>
                    <p className="text-gray-500">לחץ על "משמרת חדשה" כדי להתחיל.</p>
                </Card>
              )}
              {shifts.map(shift => (
                <Card key={shift.id} className="clay-card">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl text-blue-700">משמרת {getSiteName(shift.site)}</CardTitle>
                        <CardDescription>מנהל: {getUserName(shift.manager_id)}</CardDescription>
                        <Badge className={`mt-1 ${
                          shift.status === 'active' ? 'bg-green-100 text-green-700' :
                          shift.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                          shift.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {shift.status === 'scheduled' ? 'מתוכננת' :
                           shift.status === 'active' ? 'פעילה' :
                           shift.status === 'completed' ? 'הושלמה' :
                           shift.status === 'cancelled' ? 'בוטלה' : shift.status}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditShift(shift)} title="ערוך">
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteShift(shift.id)} title="מחק">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="clay-button text-xs"
                            onClick={() => navigate(createPageUrl(`ShiftManagerDashboard?shiftId=${shift.id}`))}
                        >
                            <Eye className="w-3 h-3 ml-1"/> נהל משמרת
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>{formatDateTime(shift.start_time)} - {formatDateTime(shift.end_time)}</span>
                    </div>
                    {shift.staff?.length > 0 && (
                      <div className="flex items-start gap-2 text-sm">
                        <Users className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <span className="font-medium">צוות: </span>
                           {shift.staff.map(member => `${getUserName(member.user_id)} (${getRoleName(member.role_id || member.role)})`).join(', ')}
                        </div>
                      </div>
                    )}
                    {shift.notes && <p className="text-sm text-gray-600 italic">הערות: {shift.notes}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
