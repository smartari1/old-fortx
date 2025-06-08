
import React, { useState, useEffect } from 'react';
import { Route } from '@/api/entities';
import { RouteAssignment } from '@/api/entities';
import { IncidentCategory } from '@/api/entities';
import { IncidentSubCategory } from '@/api/entities';
import { Location } from '@/api/entities';
import { GeofenceZone } from '@/api/entities';
import { Role } from '@/api/entities';
import { 
  Route as RouteIcon, 
  Plus, 
  Edit2, 
  Trash2, 
  Settings, 
  Save, 
  X,
  MapPin,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  Copy,
  Eye,
  Play,
  Target,
  ListChecks,
  Calendar,
  Timer,
  Shield,
  Tag, // For incident category selection
  Layers, // For incident sub-category selection
  AlertTriangle // For incident linking section
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Helper functions
const getRouteTypeText = (type) => {
  const typeMap = {
    patrol: 'סיור',
    inspection: 'בדיקה',
    monitoring: 'מעקב', 
    mixed: 'מעורב',
    custom: 'מותאם'
  };
  return typeMap[type] || type;
};

const getTaskTypeText = (type) => {
  const typeMap = {
    patrol: 'סיור',
    checkpoint: 'נקודת ביקורת',
    inspection: 'בדיקה',
    observation: 'תצפית',
    documentation: 'תיעוד',
    communication: 'תקשורת',
    emergency_check: 'בדיקת חירום',
    custom: 'מותאם'
  };
  return typeMap[type] || type;
};

const getPriorityColor = (priority) => {
  const colorMap = {
    low: 'bg-gray-100 text-gray-700',
    normal: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700'
  };
  return colorMap[priority] || colorMap.normal;
};

const getDifficultyColor = (difficulty) => {
  const colorMap = {
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-yellow-100 text-yellow-700', 
    advanced: 'bg-orange-100 text-orange-700',
    expert: 'bg-red-100 text-red-700'
  };
  return colorMap[difficulty] || colorMap.intermediate;
};

export default function RoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [routeAssignments, setRouteAssignments] = useState([]);
  const [incidentCategories, setIncidentCategories] = useState([]);
  const [incidentSubCategories, setIncidentSubCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [geofenceZones, setGeofenceZones] = useState([]);
  const [roles, setRoles] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [currentRoute, setCurrentRoute] = useState({
    name: '',
    description: '',
    route_type: 'patrol',
    assigned_area_id: '',
    assigned_area_type: '',
    tasks: [],
    estimated_total_duration_minutes: 0,
    required_role_types: [],
    required_personnel_count: 1,
    difficulty_level: 'intermediate',
    weather_dependent: false,
    safety_requirements: [],
    escalation_rules: {},
    is_active: true
  });
  
  const [editingTaskIndex, setEditingTaskIndex] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [currentTask, setCurrentTask] = useState({
    id: '',
    task_name: '',
    task_type: 'patrol',
    incident_category_id: '', // Now mandatory
    incident_sub_category_id: '', // Optional
    prefilled_incident_title_template: '', // New field
    prefilled_incident_description_template: '', // New field
    required_count: 1,
    time_window: { type: 'anytime' },
    priority: 'normal',
    estimated_duration_minutes: 30,
    requires_documentation: false,
    required_equipment: [],
    checkpoints: [],
    instructions: '',
    navigation_instructions: '' // New field
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        routesData, 
        assignmentsData,
        categoriesData, 
        subCategoriesData, 
        locationsData, 
        geofenceZonesData,
        rolesData
      ] = await Promise.all([
        Route.list(),
        RouteAssignment.list(),
        IncidentCategory.list(),
        IncidentSubCategory.list(),
        Location.list(),
        GeofenceZone.list(),
        Role.list()
      ]);
      
      setRoutes(routesData);
      setRouteAssignments(assignmentsData);
      setIncidentCategories(categoriesData);
      setIncidentSubCategories(subCategoriesData);
      setLocations(locationsData);
      setGeofenceZones(geofenceZonesData);
      setRoles(rolesData);
    } catch (err) {
      console.error("Error loading routes data:", err);
      setError("שגיאה בטעינת נתונים: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentRoute({
      name: '',
      description: '',
      route_type: 'patrol',
      assigned_area_id: '',
      assigned_area_type: '',
      tasks: [],
      estimated_total_duration_minutes: 0,
      required_role_types: [],
      required_personnel_count: 1,
      difficulty_level: 'intermediate',
      weather_dependent: false,
      safety_requirements: [],
      escalation_rules: {},
      is_active: true
    });
    setEditingRoute(null);
  };

  const resetTaskForm = () => {
    setCurrentTask({
      id: Date.now().toString(), // Simple ID generation
      task_name: '',
      task_type: 'patrol',
      incident_category_id: '', // Reset to empty
      incident_sub_category_id: '',
      prefilled_incident_title_template: '',
      prefilled_incident_description_template: '',
      required_count: 1,
      time_window: { type: 'anytime' },
      priority: 'normal',
      estimated_duration_minutes: 30,
      requires_documentation: false,
      required_equipment: [],
      checkpoints: [],
      instructions: '',
      navigation_instructions: ''
    });
    setEditingTaskIndex(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentRoute(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTaskInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentTask(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentRoute.name.trim()) {
      alert("שם המסלול הוא שדה חובה.");
      return;
    }

    if (currentRoute.tasks.length === 0) {
      alert("יש להוסיף לפחות משימה אחת למסלול.");
      return;
    }

    try {
      setLoading(true);
      if (editingRoute) {
        await Route.update(editingRoute.id, currentRoute);
      } else {
        await Route.create(currentRoute);
      }
      await loadData();
      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error("Error saving route:", err);
      alert("שגיאה בשמירת המסלול: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (route) => {
    setEditingRoute(route);
    setCurrentRoute({...route});
    setShowForm(true);
  };

  const handleDelete = async (routeId) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק מסלול זה?")) {
      try {
        setLoading(true);
        await Route.delete(routeId);
        await loadData();
      } catch (err) {
        console.error("Error deleting route:", err);
        alert("שגיאה במחיקת המסלול: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const duplicateRoute = async (route) => {
    if (window.confirm(`האם אתה בטוח שברצונך לשכפל את המסלול "${route.name}"?`)) {
      try {
        setLoading(true);
        const { id, created_date, updated_date, usage_statistics, ...routeDataToDuplicate } = route;
        const duplicatedRoute = {
          ...routeDataToDuplicate,
          name: `${route.name} (עותק)`
        };
        await Route.create(duplicatedRoute);
        await loadData();
      } catch (err) {
        console.error("Error duplicating route:", err);
        alert("שגיאה בשכפול המסלול: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const addTask = () => {
    resetTaskForm();
    setShowTaskForm(true);
  };

  const editTask = (index) => {
    setCurrentTask({...currentRoute.tasks[index]});
    setEditingTaskIndex(index);
    setShowTaskForm(true);
  };

  const saveTask = () => {
    if (!currentTask.task_name.trim()) {
      alert("שם המשימה הוא שדה חובה.");
      return;
    }
    if (!currentTask.incident_category_id) { // Validation for mandatory field
      alert("קטגוריית אירוע היא שדה חובה עבור כל משימה.");
      return;
    }

    const updatedTasks = [...currentRoute.tasks];
    if (editingTaskIndex !== null) {
      updatedTasks[editingTaskIndex] = currentTask;
    } else {
      updatedTasks.push(currentTask);
    }

    setCurrentRoute(prev => ({
      ...prev,
      tasks: updatedTasks,
      estimated_total_duration_minutes: updatedTasks.reduce((total, task) => 
        total + (task.estimated_duration_minutes * task.required_count), 0)
    }));

    setShowTaskForm(false);
    resetTaskForm();
  };

  const removeTask = (index) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק משימה זו?")) {
      const updatedTasks = currentRoute.tasks.filter((_, i) => i !== index);
      setCurrentRoute(prev => ({
        ...prev,
        tasks: updatedTasks,
        estimated_total_duration_minutes: updatedTasks.reduce((total, task) => 
          total + (task.estimated_duration_minutes * task.required_count), 0)
      }));
    }
  };

  if (loading) {
    return <div className="clay-card bg-white p-8 text-center">
             <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
             <p className="text-gray-600">טוען מסלולים...</p>
           </div>;
  }
  
  if (error) {
    return <div className="clay-card bg-red-50 p-4 text-red-700 text-center">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <RouteIcon className="w-8 h-8 ml-3 text-blue-500" />
          ניהול מסלולים
        </h1>
        <p className="text-gray-600">יצירה וניהול של מסלולי עבודה, סיורים ומשימות לצוותי האבטחה.</p>
      </div>

      {!showForm && (
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="clay-button flex items-center gap-2 bg-blue-100 text-blue-700 font-medium mb-6">
          <Plus className="w-4 h-4" />
          מסלול חדש
        </Button>
      )}

      {showForm ? (
        <Card className="clay-card mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl text-blue-700">
                {editingRoute ? 'עריכת' : 'יצירת'} מסלול
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); resetForm(); }}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Route Info */}
              <fieldset className="clay-card bg-blue-50 p-4 rounded-lg">
                <legend className="text-lg font-semibold mb-3 text-blue-600">הגדרות כלליות</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="routeName" className="block text-sm font-medium mb-1">שם המסלול</label>
                    <Input id="routeName" name="name" value={currentRoute.name} onChange={handleInputChange} className="clay-input" required />
                  </div>
                  <div>
                    <label htmlFor="routeType" className="block text-sm font-medium mb-1">סוג המסלול</label>
                    <Select value={currentRoute.route_type} onValueChange={(value) => setCurrentRoute(prev => ({...prev, route_type: value}))}>
                      <SelectTrigger className="clay-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="patrol">סיור</SelectItem>
                        <SelectItem value="inspection">בדיקה</SelectItem>
                        <SelectItem value="monitoring">מעקב</SelectItem>
                        <SelectItem value="mixed">מעורב</SelectItem>
                        <SelectItem value="custom">מותאם</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="routeDescription" className="block text-sm font-medium mb-1">תיאור המסלול</label>
                    <Textarea id="routeDescription" name="description" value={currentRoute.description} onChange={handleInputChange} className="clay-input h-24" />
                  </div>
                </div>
              </fieldset>

              {/* Tasks Management */}
              <fieldset className="clay-card bg-green-50 p-4 rounded-lg">
                <legend className="text-lg font-semibold mb-3 text-green-600 flex items-center">
                  <ListChecks className="w-5 h-5 mr-2"/>
                  משימות המסלול ({currentRoute.tasks.length})
                </legend>
                
                {currentRoute.tasks.map((task, index) => (
                  <div key={task.id || index} className="clay-card bg-white p-4 mb-3 shadow-sm border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{index + 1}</Badge>
                        <span className="font-medium">{task.task_name}</span>
                        <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                        {task.required_count > 1 && <Badge className="bg-purple-100 text-purple-700">× {task.required_count}</Badge>}
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => editTask(index)} className="text-xs">
                          <Settings className="w-3 h-3 mr-1" /> ערוך
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeTask(index)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-gray-600">{getTaskTypeText(task.task_type)}</span>
                        {task.estimated_duration_minutes && (
                          <span className="text-gray-500">• {task.estimated_duration_minutes} דקות</span>
                        )}
                      </div>
                      {task.instructions && <p className="text-gray-600 mt-1">{task.instructions}</p>}
                    </div>
                  </div>
                ))}

                {currentRoute.tasks.length === 0 && (
                  <p className="text-center text-gray-500 py-4">אין משימות במסלול. לחץ למטה להוספת משימה חדשה.</p>
                )}

                <div className="mt-4 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline"
                    className="clay-button bg-white hover:bg-green-100"
                    onClick={addTask}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    הוסף משימה חדשה
                  </Button>
                </div>
              </fieldset>

              {/* Route Settings */}
              <fieldset className="clay-card bg-purple-50 p-4 rounded-lg">
                <legend className="text-lg font-semibold mb-3 text-purple-600">הגדרות מתקדמות</legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="personnelCount" className="block text-sm font-medium mb-1">מספר אנשים נדרש</label>
                    <Input 
                      id="personnelCount" 
                      name="required_personnel_count" 
                      type="number" 
                      min="1" 
                      value={currentRoute.required_personnel_count} 
                      onChange={handleInputChange} 
                      className="clay-input" 
                    />
                  </div>
                  <div>
                    <label htmlFor="difficulty" className="block text-sm font-medium mb-1">רמת קושי</label>
                    <Select value={currentRoute.difficulty_level} onValueChange={(value) => setCurrentRoute(prev => ({...prev, difficulty_level: value}))}>
                      <SelectTrigger className="clay-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">מתחיל</SelectItem>
                        <SelectItem value="intermediate">בינוני</SelectItem>
                        <SelectItem value="advanced">מתקדם</SelectItem>
                        <SelectItem value="expert">מומחה</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="totalDuration" className="block text-sm font-medium mb-1">זמן כולל (דקות)</label>
                    <Input 
                      id="totalDuration" 
                      value={currentRoute.estimated_total_duration_minutes} 
                      disabled 
                      className="clay-input bg-gray-100" 
                      placeholder="מחושב אוטומטית"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="weatherDependent"
                      checked={currentRoute.weather_dependent} 
                      onCheckedChange={(checked) => setCurrentRoute(prev => ({...prev, weather_dependent: !!checked}))}
                    />
                    <label htmlFor="weatherDependent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      המסלול תלוי מזג אוויר
                    </label>
                  </div>
                </div>
              </fieldset>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="outline" className="clay-button" onClick={() => { setShowForm(false); resetForm(); }}>
                  <X className="w-4 h-4 mr-2" /> ביטול
                </Button>
                <Button type="submit" className="clay-button bg-blue-600 hover:bg-blue-700 text-white">
                  <Save className="w-4 h-4 mr-2" /> {editingRoute ? 'שמור שינויים' : 'צור מסלול'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {routes.length === 0 && !loading && (
            <Card className="clay-card text-center p-8">
                <RouteIcon className="w-16 h-16 mx-auto mb-4 text-gray-400"/>
                <h3 className="text-xl font-semibold text-gray-700">אין מסלולים מוגדרים</h3>
                <p className="text-gray-500">לחץ על "מסלול חדש" כדי להתחיל.</p>
            </Card>
          )}
          {routes.map(route => (
            <Card key={route.id} className="clay-card">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl text-blue-700">{route.name}</CardTitle>
                      <Badge className={getDifficultyColor(route.difficulty_level)}>{route.difficulty_level}</Badge>
                      <Badge variant="outline">{getRouteTypeText(route.route_type)}</Badge>
                      {!route.is_active && <Badge className="bg-gray-200 text-gray-600">לא פעיל</Badge>}
                    </div>
                    <CardDescription>{route.description || 'אין תיאור'}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(route)} title="ערוך">
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => duplicateRoute(route)} title="שכפל">
                      <Copy className="w-4 h-4 text-purple-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(route.id)} title="מחק">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-gray-500" />
                    <span><strong>{route.tasks?.length || 0}</strong> משימות</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span><strong>{route.estimated_total_duration_minutes || 0}</strong> דקות</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span><strong>{route.required_personnel_count}</strong> אנשים</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-gray-500" />
                    <span><strong>{route.usage_statistics?.times_completed || 0}</strong> ביצועים</span>
                  </div>
                </div>

                {route.tasks && route.tasks.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-700 mb-2">משימות עיקריות:</h4>
                    <div className="flex flex-wrap gap-2">
                      {route.tasks.slice(0, 3).map((task, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {task.task_name} {task.required_count > 1 && `(×${task.required_count})`}
                        </Badge>
                      ))}
                      {route.tasks.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{route.tasks.length - 3} נוספות
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Task Form Dialog */}
      <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
        <DialogContent className="sm:max-w-2xl clay-card">
          <DialogHeader>
            <DialogTitle className="text-xl text-blue-700">
              {editingTaskIndex !== null ? 'עריכת משימה' : 'הוספת משימה חדשה'}
            </DialogTitle>
            <DialogDescription>הגדר את פרטי המשימה שתבוצע במסלול. כל משימה תקושר אוטומטית ליצירת אירוע.</DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh] p-1">
            <div className="space-y-4 py-4 pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="taskName" className="block text-sm font-medium mb-1">שם המשימה <span className="text-red-500">*</span></label>
                  <Input 
                    id="taskName" 
                    name="task_name" 
                    value={currentTask.task_name} 
                    onChange={handleTaskInputChange} 
                    className="clay-input" 
                    placeholder="למשל: בדיקת שערים"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="taskType" className="block text-sm font-medium mb-1">סוג המשימה</label>
                  <Select value={currentTask.task_type} onValueChange={(value) => setCurrentTask(prev => ({...prev, task_type: value}))}>
                    <SelectTrigger className="clay-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patrol">סיור</SelectItem>
                      <SelectItem value="checkpoint">נקודת ביקורת</SelectItem>
                      <SelectItem value="inspection">בדיקה</SelectItem>
                      <SelectItem value="observation">תצפית</SelectItem>
                      <SelectItem value="documentation">תיעוד</SelectItem>
                      <SelectItem value="communication">תקשורת</SelectItem>
                      <SelectItem value="emergency_check">בדיקת חירום</SelectItem>
                      <SelectItem value="custom">מותאם</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Incident Category and Sub-Category */}
              <Card className="clay-card bg-slate-50 p-3">
                <CardHeader className="p-0 mb-2">
                  <CardTitle className="text-sm font-medium text-neutral-700 flex items-center">
                    <AlertTriangle className="w-4 h-4 ml-1 text-orange-500"/>
                    קישור לאירוע (שדות חובה למשימה)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="incidentCategory" className="block text-xs font-medium mb-0.5">קטגוריית אירוע <span className="text-red-500">*</span></label>
                    <Select 
                        value={currentTask.incident_category_id} 
                        onValueChange={(value) => setCurrentTask(prev => ({...prev, incident_category_id: value, incident_sub_category_id: ''}))} // Reset sub-category on change
                        required
                    >
                      <SelectTrigger className="clay-select text-sm">
                        <SelectValue placeholder="בחר קטגוריה ראשית..." />
                      </SelectTrigger>
                      <SelectContent>
                        {incidentCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="incidentSubCategory" className="block text-xs font-medium mb-0.5">תת-קטגוריית אירוע (אופציונלי)</label>
                    <Select 
                        value={currentTask.incident_sub_category_id} 
                        onValueChange={(value) => setCurrentTask(prev => ({...prev, incident_sub_category_id: value}))}
                        disabled={!currentTask.incident_category_id || incidentSubCategories.filter(sub => sub.parent_category_id === currentTask.incident_category_id).length === 0}
                    >
                      <SelectTrigger className="clay-select text-sm">
                         <SelectValue placeholder={incidentSubCategories.filter(sub => sub.parent_category_id === currentTask.incident_category_id).length > 0 ? "בחר תת-קטגוריה..." : "אין תתי-קטגוריות"} />
                      </SelectTrigger>
                      <SelectContent>
                        {incidentSubCategories
                          .filter(sub => sub.parent_category_id === currentTask.incident_category_id)
                          .map(sub => <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>)
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="prefilledTitle" className="block text-xs font-medium mb-0.5">תבנית כותרת אירוע (אופציונלי)</label>
                    <Input 
                        id="prefilledTitle" 
                        name="prefilled_incident_title_template" 
                        value={currentTask.prefilled_incident_title_template} 
                        onChange={handleTaskInputChange} 
                        className="clay-input text-sm" 
                        placeholder="לדוג': {task_name} ב{route_name}"
                    />
                     <p className="text-[10px] text-gray-500 mt-0.5">משתנים אפשריים: {'{task_name}'}, {'{route_name}'}, {'{site_name}'}, {'{user_name}'}</p>
                  </div>
                   <div className="md:col-span-2">
                    <label htmlFor="prefilledDescription" className="block text-xs font-medium mb-0.5">תבנית תיאור אירוע (אופציונלי)</label>
                    <Textarea
                        id="prefilledDescription" 
                        name="prefilled_incident_description_template" 
                        value={currentTask.prefilled_incident_description_template} 
                        onChange={handleTaskInputChange} 
                        className="clay-input text-sm h-16" 
                        placeholder="לדוג': בוצעה משימה {task_name} כחלק ממסלול {route_name}."
                    />
                  </div>
                </CardContent>
              </Card>


              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="requiredCount" className="block text-sm font-medium mb-1">כמות ביצועים</label>
                <Input 
                  id="requiredCount" 
                  name="required_count" 
                  type="number" 
                  min="1" 
                  value={currentTask.required_count} 
                  onChange={handleTaskInputChange} 
                  className="clay-input" 
                />
              </div>
              <div>
                <label htmlFor="priority" className="block text-sm font-medium mb-1">עדיפות</label>
                <Select value={currentTask.priority} onValueChange={(value) => setCurrentTask(prev => ({...prev, priority: value}))}>
                  <SelectTrigger className="clay-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">נמוכה</SelectItem>
                    <SelectItem value="normal">רגילה</SelectItem>
                    <SelectItem value="high">גבוהה</SelectItem>
                    <SelectItem value="critical">קריטית</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="estimatedDuration" className="block text-sm font-medium mb-1">זמן משוער (דקות)</label>
                <Input 
                  id="estimatedDuration" 
                  name="estimated_duration_minutes" 
                  type="number" 
                  min="1" 
                  value={currentTask.estimated_duration_minutes} 
                  onChange={handleTaskInputChange} 
                  className="clay-input" 
                />
              </div>
            </div>

            <div>
              <label htmlFor="taskInstructions" className="block text-sm font-medium mb-1">הוראות ביצוע משימה</label>
              <Textarea 
                id="taskInstructions" 
                name="instructions" 
                value={currentTask.instructions} 
                onChange={handleTaskInputChange} 
                className="clay-input h-20" 
                placeholder="הוראות מפורטות לביצוע המשימה..."
              />
            </div>
            <div>
              <label htmlFor="navigationInstructions" className="block text-sm font-medium mb-1">הוראות ניווט (אופציונלי)</label>
              <Textarea 
                id="navigationInstructions" 
                name="navigation_instructions" 
                value={currentTask.navigation_instructions} 
                onChange={handleTaskInputChange} 
                className="clay-input h-16" 
                placeholder="הנחיות הגעה לנקודה, אם רלוונטי..."
              />
            </div>

            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Checkbox 
                id="requiresDocumentation"
                checked={currentTask.requires_documentation} 
                onCheckedChange={(checked) => setCurrentTask(prev => ({...prev, requires_documentation: !!checked}))}
              />
              <label htmlFor="requiresDocumentation" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                נדרש תיעוד מיוחד
              </label>
            </div>
          </div>
          </ScrollArea>
          
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setShowTaskForm(false)}>
              ביטול
            </Button>
            <Button onClick={saveTask} disabled={!currentTask.task_name.trim()}>
              {editingTaskIndex !== null ? 'עדכן משימה' : 'הוסף משימה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
