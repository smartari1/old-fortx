
import React, { useState, useEffect, useMemo } from 'react';
import { Shift } from '@/api/entities';
import { ShiftTemplate } from '@/api/entities';
import { Location } from '@/api/entities';
import { User } from '@/api/entities';
import { Role } from '@/api/entities';
import { IncidentCategory } from '@/api/entities'; // Import IncidentCategory entity
import { IncidentSubCategory } from '@/api/entities'; // Import IncidentSubCategory entity

// Import date-fns for formatting datetime-local inputs
import { format, parseISO } from 'date-fns';


import {
  Calendar,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Copy,
  Users,
  AlarmClock,
  Save,
  Eye,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  AlertCircle,
  FileText,
  CalendarDays,
  RotateCcw, // For loading spinner (template)
  RotateCw, // For loading spinner (shift)
  Target, // For shift targets section
  Goal // For shift targets section in dialog
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Hebrew day names for display
const hebrewDays = {
  'sunday': 'ראשון',
  'monday': 'שני',
  'tuesday': 'שלישי',
  'wednesday': 'רביעי',
  'thursday': 'חמישי',
  'friday': 'שישי',
  'saturday': 'שבת'
};

// English day names for API
const englishDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Helper function to generate a simple unique ID (fallback for uuid)
const generateSimpleId = () => {
  return `temp_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
};

export default function ShiftsPage() {
  const [activeTab, setActiveTab] = useState("templates"); // or "active" or "upcoming"
  const [templates, setTemplates] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [sites, setSites] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSave, setLoadingSave] = useState(false); // Add loading state for save operations
  const [error, setError] = useState(null);
  const [incidentCategories, setIncidentCategories] = useState([]); // New state for incident categories
  const [incidentSubCategories, setIncidentSubCategories] = useState([]); // New state for incident sub-categories

  // Template form state
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    site: '',
    days_of_week: [],
    start_time: '08:00',
    end_time: '16:00',
    required_roles: [],
    shift_targets: [], // Initialize shift_targets
    notes: '',
    is_active: true
  });

  // Shift form state
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [shiftFormData, setShiftFormData] = useState({
    template_id: '',
    site: '',
    start_time: new Date().toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16),
    manager_id: '',
    staff: [],
    notes: '',
    status: 'scheduled',
    shift_targets_status: [] // Initialize shift_targets_status
  });

  // Shift view state
  const [viewShift, setViewShift] = useState(null);
  const [showShiftDetails, setShowShiftDetails] = useState(false);

  // Filters
  const [siteFilter, setSiteFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // today, week, month, all
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
    loadIncidentRelatedData(); // Load incident categories and sub-categories
  }, []);

  const loadIncidentRelatedData = async () => {
    try {
        const [cats, subCats] = await Promise.all([
            IncidentCategory.list(),
            IncidentSubCategory.list()
        ]);
        setIncidentCategories(cats);
        setIncidentSubCategories(subCats);
    } catch (err) {
        console.error("Error loading incident categories/subcategories for shifts page:", err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesData, shiftsData, sitesData, usersData, rolesData] = await Promise.all([
        ShiftTemplate.list(),
        Shift.list('-start_time'), // Order by start time descending
        Location.list(),
        User.list(),
        Role.list()
      ]);

      setTemplates(templatesData);
      setShifts(shiftsData);
      setSites(sitesData.filter(site => site.type === 'site')); // Only include actual sites
      setUsers(usersData);
      setRoles(rolesData);

      setLoading(false);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("שגיאה בטעינת נתונים: " + err.message);
      setLoading(false);
    }
  };

  // Reset template form to initial empty state
  const resetTemplateForm = () => {
    console.log('Resetting template form'); // Debug log
    setTemplateFormData({
      name: '',
      site: '',
      days_of_week: [],
      start_time: '08:00',
      end_time: '16:00',
      required_roles: [],
      shift_targets: [],
      notes: '',
      is_active: true
    });
    setEditingTemplate(null);
  };

  // Reset shift form to initial empty state
  const resetShiftForm = () => {
    console.log('Resetting shift form'); // Debug log
    setShiftFormData({
      template_id: '',
      site: '',
      start_time: '',
      end_time: '',
      manager_id: '',
      staff: [],
      notes: '',
      status: 'scheduled',
      shift_targets_status: [] // Reset targets as well
    });
    setEditingShift(null);
  };

  // Initialize form when editing template
  useEffect(() => {
    if (editingTemplate) {
      console.log('Initializing template form for editing:', editingTemplate); // Debug log
      setTemplateFormData({
        name: editingTemplate.name || '',
        site: editingTemplate.site || '',
        days_of_week: Array.isArray(editingTemplate.days_of_week) ? [...editingTemplate.days_of_week] : [],
        start_time: editingTemplate.start_time || '08:00',
        end_time: editingTemplate.end_time || '16:00',
        required_roles: Array.isArray(editingTemplate.required_roles)
          ? editingTemplate.required_roles.map(r => ({ role_id: r.role_id || '', count: r.count || 1 }))
          : [],
        shift_targets: Array.isArray(editingTemplate.shift_targets)
          ? editingTemplate.shift_targets.map(t => ({
              id: t.id || generateSimpleId(),
              incident_category_id: t.incident_category_id || '',
              incident_sub_category_ids: Array.isArray(t.incident_sub_category_ids) ? [...t.incident_sub_category_ids] : [],
              count: t.count || 1,
              description: t.description || '',
              target_role_id: t.target_role_id || ''
            }))
          : [],
        notes: editingTemplate.notes || '',
        is_active: editingTemplate.is_active !== undefined ? editingTemplate.is_active : true
      });
    }
  }, [editingTemplate]);

  // Initialize form when editing a shift
  useEffect(() => {
    if (editingShift) {
      console.log('Initializing shift form for editing:', editingShift);
      setShiftFormData({
        template_id: editingShift.template_id || '',
        site: editingShift.site || '',
        start_time: editingShift.start_time ? format(parseISO(editingShift.start_time), "yyyy-MM-dd'T'HH:mm") : '',
        end_time: editingShift.end_time ? format(parseISO(editingShift.end_time), "yyyy-MM-dd'T'HH:mm") : '',
        manager_id: editingShift.manager_id || '',
        staff: Array.isArray(editingShift.staff)
          ? editingShift.staff.map(s => ({
              user_id: s.user_id || '',
              role: s.role || '',
              name: s.name || '', // for manual entries
              email: s.email || '', // for manual entries
              notes: s.notes || '',
              check_in_time: s.check_in_time || '',
              check_out_time: s.check_out_time || ''
            }))
          : [],
        notes: editingShift.notes || '',
        status: editingShift.status || 'scheduled',
        // Ensure shift_targets_status is an array and map it correctly
        shift_targets_status: Array.isArray(editingShift.shift_targets_status)
          ? editingShift.shift_targets_status.map(t => ({
              template_target_id: t.template_target_id || generateSimpleId(), // Keep or generate ID
              target_definition: {
                id: t.target_definition?.id || generateSimpleId(),
                target_role_id: t.target_definition?.target_role_id || '',
                incident_category_id: t.target_definition?.incident_category_id || '',
                incident_sub_category_ids: Array.isArray(t.target_definition?.incident_sub_category_ids) ? [...t.target_definition.incident_sub_category_ids] : [],
                count: t.target_definition?.count || 1,
                description: t.target_definition?.description || ''
              },
              completed_count: t.completed_count || 0,
              related_incident_ids: Array.isArray(t.related_incident_ids) ? [...t.related_incident_ids] : []
            }))
          : []
      });
    }
  }, [editingShift]);

  // Effect to populate shift form from template when template_id changes
  useEffect(() => {
    // Only apply template data if it's a new shift and a template is selected
    if (shiftFormData.template_id && !editingShift) {
      const selectedTemplate = templates.find(t => t.id === shiftFormData.template_id);
      if (selectedTemplate) {
        console.log('Populating shift form from template:', selectedTemplate);

        // Calculate start and end times based on template
        const today = new Date();
        today.setHours(parseInt(selectedTemplate.start_time.split(':')[0], 10));
        today.setMinutes(parseInt(selectedTemplate.start_time.split(':')[1], 10));
        today.setSeconds(0);

        const endTime = new Date(today);
        endTime.setHours(parseInt(selectedTemplate.end_time.split(':')[0], 10));
        endTime.setMinutes(parseInt(selectedTemplate.end_time.split(':')[1], 10));

        // If end time is before start time, assume it's next day
        if (endTime < today) {
          endTime.setDate(endTime.getDate() + 1);
        }

        // Prepare staff array based on required roles
        const staffArray = [];
        if (selectedTemplate.required_roles && selectedTemplate.required_roles.length > 0) {
          selectedTemplate.required_roles.forEach(requiredRole => {
            for (let i = 0; i < requiredRole.count; i++) {
              staffArray.push({
                user_id: '',
                role: requiredRole.role_id, // Use role_id from template
                notes: ''
              });
            }
          });
        }

        // Prepare shift_targets_status based on template targets
        const initialTargetsStatus = Array.isArray(selectedTemplate.shift_targets)
          ? selectedTemplate.shift_targets.map(target => ({
              template_target_id: target.id, // Link to the original template target ID
              target_definition: { // Copy the definition
                id: target.id, // Use template target id as definition id
                target_role_id: target.target_role_id || '',
                incident_category_id: target.incident_category_id || '',
                incident_sub_category_ids: Array.isArray(target.incident_sub_category_ids) ? [...target.incident_sub_category_ids] : [],
                count: target.count || 1,
                description: target.description || ''
              },
              completed_count: 0,
              related_incident_ids: []
            }))
          : [];

        setShiftFormData(prev => ({
          ...prev,
          site: selectedTemplate.site,
          start_time: today.toISOString().slice(0, 16),
          end_time: endTime.toISOString().slice(0, 16),
          staff: staffArray,
          shift_targets_status: initialTargetsStatus // Set initial targets status
        }));
      }
    }
  }, [shiftFormData.template_id, editingShift, templates]);

  // Handle template form submission
  const handleTemplateSubmit = async (e) => {
    e.preventDefault();
    setLoadingSave(true); // Set loading state

    try {
      console.log('Submitting template form data:', templateFormData); // Debug log

      // Improved validation for required fields
      if (!templateFormData.name?.trim() || !templateFormData.site?.trim()) {
        alert("שם המשמרת והאתר הם שדות חובה");
        setLoadingSave(false); // Reset loading state on validation error
        return;
      }

      // Validate and filter required roles
      const validRoles = Array.isArray(templateFormData.required_roles)
        ? templateFormData.required_roles.filter(role => role.role_id && role.count && role.count > 0)
        : [];

      // Ensure each target has a unique ID and valid data
      const targetsWithIds = Array.isArray(templateFormData.shift_targets)
        ? templateFormData.shift_targets
            .filter(target => target.incident_category_id && target.count > 0) // Only include valid targets
            .map(target => ({
              id: target.id || generateSimpleId(),
              incident_category_id: target.incident_category_id,
              incident_sub_category_ids: Array.isArray(target.incident_sub_category_ids) ? target.incident_sub_category_ids : [],
              count: parseInt(target.count) || 1, // Ensure count is an integer, default to 1
              description: target.description || '',
              target_role_id: target.target_role_id || ''
            }))
        : [];


      const dataToSubmit = {
        name: templateFormData.name.trim(), // Trim name
        site: templateFormData.site.trim(), // Trim site
        days_of_week: Array.isArray(templateFormData.days_of_week) ? templateFormData.days_of_week : [],
        start_time: templateFormData.start_time || '08:00',
        end_time: templateFormData.end_time || '16:00',
        required_roles: validRoles,
        shift_targets: targetsWithIds,
        notes: templateFormData.notes || '',
        is_active: templateFormData.is_active !== undefined ? templateFormData.is_active : true
      };

      console.log('Data to submit:', dataToSubmit); // Debug log

      let savedTemplate;
      if (editingTemplate) {
        savedTemplate = await ShiftTemplate.update(editingTemplate.id, dataToSubmit);
        console.log('Template updated:', savedTemplate); // Debug log
      } else {
        savedTemplate = await ShiftTemplate.create(dataToSubmit);
        console.log('Template created:', savedTemplate); // Debug log
      }

      // Reload data to get fresh template list
      await loadData();

      // Close form and reset state
      setShowTemplateForm(false);

      // Small delay before resetting to ensure form is closed and avoids potential flicker
      setTimeout(() => {
        resetTemplateForm();
      }, 100);

      console.log('Template saved successfully'); // Debug log

    } catch (err) {
      console.error("Error saving template:", err);
      alert("שגיאה בשמירת תבנית המשמרת: " + err.message);
    } finally {
      setLoadingSave(false); // Always reset loading state
    }
  };

  // Handle shift form submission
  const handleShiftSubmit = async (e) => {
    e.preventDefault();
    setLoadingSave(true);

    try {
      console.log('Submitting shift form data:', shiftFormData);
      if (!shiftFormData.site?.trim() || !shiftFormData.start_time || !shiftFormData.end_time) {
        alert("אתר, שעת התחלה ושעת סיום הם שדות חובה.");
        setLoadingSave(false);
        return;
      }

      const dataToSubmit = {
        ...shiftFormData,
        staff: shiftFormData.staff.map(s => ({
          user_id: s.user_id || null, // Ensure user_id is null if empty for backend
          role: s.role || '',
          name: s.user_id ? undefined : (s.name || 'משתמש ידני'), // Only send name for manual users
          email: s.user_id ? undefined : (s.email || ''), // Only send email for manual users
          notes: s.notes || '',
          check_in_time: s.check_in_time || null,
          check_out_time: s.check_out_time || null,
        })),
        // Ensure targets are in the correct structure for saving
        shift_targets_status: shiftFormData.shift_targets_status.map(target => ({
            template_target_id: target.template_target_id,
            target_definition: { // Ensure all fields of target_definition are present
                id: target.target_definition.id || generateSimpleId(),
                target_role_id: target.target_definition.target_role_id || '',
                incident_category_id: target.target_definition.incident_category_id,
                incident_sub_category_ids: target.target_definition.incident_sub_category_ids || [],
                count: parseInt(target.target_definition.count) || 1,
                description: target.target_definition.description || ''
            },
            completed_count: target.completed_count || 0,
            related_incident_ids: target.related_incident_ids || []
        }))
      };

      console.log('Data to submit (Shift):', dataToSubmit);

      if (editingShift) {
        await Shift.update(editingShift.id, dataToSubmit);
      } else {
        await Shift.create(dataToSubmit);
      }

      await loadData();
      setShowShiftForm(false);
      setTimeout(() => {
        resetShiftForm();
      }, 100);
      console.log('Shift saved successfully');
    } catch (err) {
      console.error("Error saving shift:", err);
      alert("שגיאה בשמירת המשמרת: " + err.message);
    } finally {
      setLoadingSave(false);
    }
  };

  // Handle day of week toggle in template form
  const handleDayToggle = (day) => {
    setTemplateFormData(prev => {
      const currentDays = Array.isArray(prev.days_of_week) ? prev.days_of_week : [];
      const updatedDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day];

      console.log('Days updated:', updatedDays); // Debug log
      return {
        ...prev,
        days_of_week: updatedDays
      };
    });
  };

  // Handle required role addition in template form
  const handleAddRequiredRole = () => {
    setTemplateFormData(prev => ({
      ...prev,
      required_roles: [...(prev.required_roles || []), { role_id: '', count: 1 }] // Use role_id
    }));
  };

  // Handle required role change in template form
  const handleRequiredRoleChange = (index, field, value) => {
    setTemplateFormData(prev => {
      const newRequiredRoles = [...(prev.required_roles || [])];
      newRequiredRoles[index] = {
        ...newRequiredRoles[index],
        [field]: field === 'count' ? parseInt(value) || 1 : value
      };
      return {
        ...prev,
        required_roles: newRequiredRoles
      };
    });
  };

  // Handle required role removal in template form
  const handleRemoveRequiredRole = (index) => {
    setTemplateFormData(prev => ({
      ...prev,
      required_roles: (prev.required_roles || []).filter((_, i) => i !== index)
    }));
  };

  // Handle new shift target addition in template form
  const handleAddShiftTarget = () => {
    const newTarget = {
      id: generateSimpleId(), // Assign a unique ID to the new target
      incident_category_id: '',
      incident_sub_category_ids: [], // Assuming this is an array
      count: 1,
      description: '',
      target_role_id: ''
    };

    setTemplateFormData(prev => ({
      ...prev,
      shift_targets: [...(prev.shift_targets || []), newTarget]
    }));
  };

  // Handle shift target change in template form
  const handleShiftTargetChange = (index, field, value) => {
    setTemplateFormData(prev => {
      const updatedTargets = [...(prev.shift_targets || [])];

      if (!updatedTargets[index]) return prev; // Safety check

      if (field === 'count') {
        updatedTargets[index] = {
          ...updatedTargets[index],
          [field]: parseInt(value) || 1 // Parse count as integer
        };
      } else if (field === 'incident_sub_category_ids') {
        // Handle array field properly for multi-select (even if select is single)
        updatedTargets[index] = {
          ...updatedTargets[index],
          [field]: Array.isArray(value) ? value : (value ? [value] : [])
        };
      } else {
        updatedTargets[index] = {
          ...updatedTargets[index],
          [field]: value
        };
      }
      // Auto-generate description if empty and category is chosen
      if (field === 'incident_category_id' && !updatedTargets[index].description && value) {
          const category = incidentCategories.find(cat => cat.id === value);
          if (category) {
              updatedTargets[index].description = `יעד עבור ${category.name}`;
          }
      }
      return {
        ...prev,
        shift_targets: updatedTargets
      };
    });
  };

  // Handle shift target removal in template form
  const handleRemoveShiftTarget = (index) => {
    setTemplateFormData(prev => ({
      ...prev,
      shift_targets: (prev.shift_targets || []).filter((_, i) => i !== index)
    }));
  };

  // Handle staff addition in shift form
  const handleAddStaffMember = () => {
    setShiftFormData(prev => ({
      ...prev,
      staff: [...prev.staff, { user_id: '', role: '', notes: '' }]
    }));
  };

  // Handle staff change in shift form
  const handleStaffChange = (index, field, value) => {
    setShiftFormData(prev => {
      const newStaff = [...prev.staff];
      newStaff[index] = {
        ...newStaff[index],
        [field]: value
      };
      return {
        ...prev,
        staff: newStaff
      };
    });
  };

  // Handle staff removal in shift form
  const handleRemoveStaffMember = (index) => {
    setShiftFormData(prev => ({
      ...prev,
      staff: prev.staff.filter((_, i) => i !== index)
    }));
  };

  // Functions to manage targets in the shift form
  const handleAddShiftFormTarget = () => {
    const newTarget = {
      template_target_id: generateSimpleId(), // This is an ad-hoc target, not from template
      target_definition: {
        id: generateSimpleId(), // Unique ID for this definition instance
        target_role_id: '',
        incident_category_id: '',
        incident_sub_category_ids: [],
        count: 1,
        description: ''
      },
      completed_count: 0,
      related_incident_ids: []
    };
    setShiftFormData(prev => ({
      ...prev,
      shift_targets_status: [...(prev.shift_targets_status || []), newTarget]
    }));
  };

  const handleShiftFormTargetChange = (index, fieldPath, value) => {
    setShiftFormData(prev => {
      const updatedTargets = [...(prev.shift_targets_status || [])];
      const pathParts = fieldPath.split('.'); // e.g., "target_definition.description"

      let currentLevel = updatedTargets[index];
      // Navigate to the correct nested object
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!currentLevel[pathParts[i]]) {
            currentLevel[pathParts[i]] = {}; // Initialize if undefined
        }
        currentLevel = currentLevel[pathParts[i]];
      }

      const finalField = pathParts[pathParts.length - 1];
      if (finalField === 'count') {
        currentLevel[finalField] = parseInt(value) || 1;
      } else if (finalField === 'incident_sub_category_ids') {
         // Assuming single selection returns string, multi-selection returns array.
         // For shadcn Select, if not a multi-select component, it will be a string.
         // We wrap it in an array to match the expected data structure.
         currentLevel[finalField] = Array.isArray(value) ? value : (value ? [value] : []);
      }
      else {
        currentLevel[finalField] = value;
      }

      // Auto-generate description if empty and category is chosen
      if (fieldPath === 'target_definition.incident_category_id' && !updatedTargets[index].target_definition.description && value) {
          const category = incidentCategories.find(cat => cat.id === value);
          if (category) {
              updatedTargets[index].target_definition.description = `יעד עבור ${category.name}`;
          }
      }

      return { ...prev, shift_targets_status: updatedTargets };
    });
  };

  const handleRemoveShiftFormTarget = (index) => {
    setShiftFormData(prev => ({
      ...prev,
      shift_targets_status: (prev.shift_targets_status || []).filter((_, i) => i !== index)
    }));
  };

  // Delete template
  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק תבנית משמרת זו?")) {
      try {
        await ShiftTemplate.delete(templateId);
        await loadData();
      } catch (err) {
        console.error("Error deleting template:", err);
        alert("שגיאה במחיקת תבנית המשמרת: " + err.message);
      }
    }
  };

  // Delete shift
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

  // Create new shift from template
  const handleCreateFromTemplate = (template) => {
    // Calculate next occurrence of one of the days in the template
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    let nextDate = null;
    if (template.days_of_week && template.days_of_week.length > 0) {
      // Find the next day that matches one of the template days
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        const dayOfWeek = englishDays[checkDate.getDay()];

        if (template.days_of_week.includes(dayOfWeek)) {
          nextDate = checkDate;
          break;
        }
      }
    }

    // If no specific day was found or no days specified, use today
    if (!nextDate) {
      nextDate = today;
    }

    // Set hours from template
    const startParts = template.start_time.split(':');
    const endParts = template.end_time.split(':');

    const startTime = new Date(nextDate);
    startTime.setHours(parseInt(startParts[0], 10), parseInt(startParts[1], 10), 0);

    const endTime = new Date(nextDate);
    endTime.setHours(parseInt(endParts[0], 10), parseInt(endParts[1], 10), 0);

    // If end time is before start time, assume it's next day
    if (endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }

    // Prepare staff array based on required roles
    const staffArray = [];
    if (template.required_roles && template.required_roles.length > 0) {
      template.required_roles.forEach(requiredRole => {
        for (let i = 0; i < requiredRole.count; i++) {
          staffArray.push({
            user_id: '',
            role: requiredRole.role_id, // Use role_id from template
            notes: ''
          });
        }
      });
    }

    // Prepare shift_targets_status for the new shift based on the template
    const initialTargetsStatus = template.shift_targets ? template.shift_targets.map(targetDef => ({
        template_target_id: targetDef.id, // Link to the template target ID
        target_definition: { ...targetDef, id: targetDef.id }, // Copy the definition and ensure definition ID is set
        completed_count: 0,
        related_incident_ids: []
    })) : [];

    setShiftFormData({
      template_id: template.id,
      site: template.site,
      start_time: startTime.toISOString().slice(0, 16),
      end_time: endTime.toISOString().slice(0, 16),
      manager_id: '',
      staff: staffArray,
      notes: template.notes || '',
      status: 'scheduled',
      shift_targets_status: initialTargetsStatus // Add this
    });

    setShowShiftForm(true);
  };

  // Apply filters to shifts
  const filteredShifts = useMemo(() => {
    return shifts.filter(shift => {
      // Filter by site
      if (siteFilter !== 'all' && shift.site !== siteFilter) {
        return false;
      }

      // Filter by status
      if (statusFilter !== 'all' && shift.status !== statusFilter) {
        return false;
      }

      // Filter by date
      if (dateFilter !== 'all') {
        const shiftDate = new Date(shift.start_time);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        if (dateFilter === 'today') {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          if (shiftDate < today || shiftDate >= tomorrow) {
            return false;
          }
        } else if (dateFilter === 'week') {
          const weekLater = new Date(today);
          weekLater.setDate(weekLater.getDate() + 7);
          if (shiftDate < today || shiftDate >= weekLater) {
            return false;
          }
        } else if (dateFilter === 'month') {
          const monthLater = new Date(today);
          monthLater.setMonth(monthLater.getMonth() + 1);
          if (shiftDate < today || shiftDate >= monthLater) {
            return false;
          }
        }
      }

      // Filter by search term
      if (searchTerm) {
        const siteName = sites.find(site => site.id === shift.site)?.name || '';
        const managerName = users.find(user => user.id === shift.manager_id)?.full_name || '';
        const staffNames = (shift.staff || []).map(staffMember =>
          users.find(user => user.id === staffMember.user_id)?.full_name || ''
        ).join(' ');

        const searchString = `${siteName} ${managerName} ${staffNames} ${shift.notes || ''}`.toLowerCase();
        if (!searchString.includes(searchTerm.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [shifts, siteFilter, statusFilter, dateFilter, searchTerm, sites, users]);

  // Get status badge style
  const getStatusBadge = (status) => {
    let colorClass = "bg-gray-100 text-gray-800";
    let label = "לא ידוע";

    switch (status) {
      case 'scheduled':
        colorClass = "bg-blue-100 text-blue-800";
        label = "מתוכננת";
        break;
      case 'active':
        colorClass = "bg-green-100 text-green-800";
        label = "פעילה";
        break;
      case 'completed':
        colorClass = "bg-purple-100 text-purple-800";
        label = "הושלמה";
        break;
      case 'cancelled':
        colorClass = "bg-red-100 text-red-800";
        label = "בוטלה";
        break;
    }

    return <Badge className={colorClass}>{label}</Badge>;
  };

  // Format time range for display
  const formatTimeRange = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);

    return `${start.toLocaleDateString('he-IL')} ${start.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Get site name from ID
  const getSiteName = (siteId) => {
    return sites.find(site => site.id === siteId)?.name || 'אתר לא ידוע';
  };

  // Get user name from ID
  const getUserName = (userId) => {
    return users.find(user => user.id === userId)?.full_name || 'משתמש לא ידוע';
  };

  // Get role name
  const getRoleName = (roleId) => {
    return roles.find(role => role.id === roleId)?.name || roleId || 'תפקיד לא ידוע';
  };

  // Enhanced template editing function
  const handleEditTemplate = (template) => {
    console.log('Starting to edit template:', template); // Debug log
    setEditingTemplate(template);
    setShowTemplateForm(true);
  };

  // Enhanced template creation function
  const handleCreateTemplate = () => {
    console.log('Starting to create new template'); // Debug log
    resetTemplateForm(); // Reset first
    setShowTemplateForm(true);
  };

  // Handle form cancellation
  const handleCancelTemplateForm = () => {
    console.log('Cancelling template form'); // Debug log
    setShowTemplateForm(false);
    setTimeout(() => { // Small delay to allow dialog to close before state reset
      resetTemplateForm();
    }, 100);
  };

  const handleCancelShiftForm = () => {
    setShowShiftForm(false);
    setTimeout(() => {
      resetShiftForm();
    }, 100);
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
    </div>
  );

  if (error) return <div className="clay-card bg-red-50 p-4 text-red-700 text-center">{error}</div>;

  return (
    <div className="container mx-auto p-4 md:p-6" dir="rtl">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 flex items-center">
            <CalendarDays className="w-8 h-8 ml-3 text-cyan-500" />
            ניהול משמרות ולו"ז
          </h1>
          <p className="text-gray-600">הגדרת משמרות, שיבוץ עובדים ומעקב נוכחות.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger value="templates">תבניות משמרת</TabsTrigger>
          <TabsTrigger value="shifts">משמרות</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">תבניות משמרת</h2>
            <Button
              onClick={handleCreateTemplate} // Use the new wrapper function
              className="clay-button bg-cyan-100 text-cyan-700 font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              תבנית חדשה
            </Button>
          </div>

          {templates.length === 0 ? (
            <div className="clay-card bg-white text-center p-10">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-700">לא נמצאו תבניות משמרת</h3>
              <p className="text-gray-500 mt-2">צור תבנית משמרת חדשה כדי להתחיל.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(template => (
                <Card key={template.id} className="clay-card bg-white flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl font-semibold text-cyan-700">
                        {template.name}
                      </CardTitle>
                      <Badge className={template.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {template.is_active ? "פעילה" : "לא פעילה"}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm text-gray-600 pt-1">
                      אתר: {getSiteName(template.site)}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-grow space-y-3">
                    <div className="flex items-center text-sm">
                      <Clock className="w-4 h-4 ml-2 text-gray-500" />
                      <span>{template.start_time} - {template.end_time}</span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">ימים:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.days_of_week?.map(day => (
                          <Badge key={day} className="bg-cyan-50 text-cyan-800">
                            {hebrewDays[day]}
                          </Badge>
                        ))}
                        {(!template.days_of_week || template.days_of_week.length === 0) && (
                          <span className="text-sm text-gray-500">לא הוגדרו ימים</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">תפקידים נדרשים:</p>
                      <div className="flex flex-col gap-1">
                        {template.required_roles?.map((role, index) => (
                          <div key={index} className="text-sm">
                            <span className="font-medium">{getRoleName(role.role_id)}</span>
                            <span> - {role.count} עובדים</span>
                          </div>
                        ))}
                        {(!template.required_roles || template.required_roles.length === 0) && (
                          <span className="text-sm text-gray-500">לא הוגדרו תפקידים</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 font-medium">יעדי משמרת:</p>
                      {template.shift_targets && template.shift_targets.length > 0 ? (
                        template.shift_targets.map((target, index) => (
                          <div key={target.id || index} className="text-xs pl-2 border-r-2 border-cyan-200 mr-1">
                            <span className="font-semibold">{target.description || `יעד עבור ${incidentCategories.find(c => c.id === target.incident_category_id)?.name || 'קטגוריה לא ידועה'}`}</span>
                            <span> ({target.count} נדרשים)</span>
                            {target.target_role_id && <Badge className="mr-1 bg-purple-100 text-purple-800 text-xs">{`לתפקיד: ${getRoleName(target.target_role_id)}`}</Badge>}
                          </div>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">לא הוגדרו יעדים</span>
                      )}
                    </div>

                    {template.notes && (
                      <div className="text-sm text-gray-600 italic">
                        <p className="font-medium">הערות:</p>
                        <p>{template.notes}</p>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-600 hover:bg-green-50"
                      onClick={() => handleCreateFromTemplate(template)}
                    >
                      <Plus className="w-4 h-4 ml-1" /> צור משמרת
                    </Button>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:bg-blue-50"
                        onClick={() => handleEditTemplate(template)} // Use new wrapper function
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="shifts" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">משמרות</h2>
            <Button
              onClick={() => {
                resetShiftForm();
                setShowShiftForm(true);
              }}
              className="clay-button bg-cyan-100 text-cyan-700 font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              משמרת חדשה
            </Button>
          </div>

          <div className="clay-card bg-white p-4 mb-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center">
                <Filter className="w-4 h-4 ml-2 text-gray-500" />
                <Select value={siteFilter} onValueChange={setSiteFilter}>
                  <SelectTrigger className="clay-select w-40">
                    <SelectValue placeholder="אתר" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל האתרים</SelectItem>
                    {sites.map(site => (
                      <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center">
                <Calendar className="w-4 h-4 ml-2 text-gray-500" />
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="clay-select w-40">
                    <SelectValue placeholder="תאריך" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל התאריכים</SelectItem>
                    <SelectItem value="today">היום</SelectItem>
                    <SelectItem value="week">שבוע הקרוב</SelectItem>
                    <SelectItem value="month">חודש הקרוב</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center">
                <AlarmClock className="w-4 h-4 ml-2 text-gray-500" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="clay-select w-40">
                    <SelectValue placeholder="סטטוס" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסטטוסים</SelectItem>
                    <SelectItem value="scheduled">מתוכננת</SelectItem>
                    <SelectItem value="active">פעילה</SelectItem>
                    <SelectItem value="completed">הושלמה</SelectItem>
                    <SelectItem value="cancelled">בוטלה</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center flex-grow">
                <div className="relative w-full">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="חיפוש משמרות..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {filteredShifts.length === 0 ? (
            <div className="clay-card bg-white text-center p-10">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-700">לא נמצאו משמרות</h3>
              <p className="text-gray-500 mt-2">
                {searchTerm || siteFilter !== 'all' || statusFilter !== 'all' || dateFilter !== 'all'
                  ? "נסה לשנות את הסינון כדי לראות יותר תוצאות"
                  : "צור משמרת חדשה כדי להתחיל"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredShifts.map(shift => (
                <Card key={shift.id} className="clay-card bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
                    <div className="space-y-2">
                      <div className="text-sm text-gray-500">אתר</div>
                      <div className="font-medium">{getSiteName(shift.site)}</div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm text-gray-500">זמן</div>
                      <div className="font-medium">{formatTimeRange(shift.start_time, shift.end_time)}</div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm text-gray-500">מנהל משמרת</div>
                      <div className="font-medium">
                        {shift.manager_id ? getUserName(shift.manager_id) : 'לא הוגדר'}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm text-gray-500">סטטוס</div>
                      <div>{getStatusBadge(shift.status)}</div>
                    </div>

                    <div className="md:col-span-3 space-y-2">
                      <div className="text-sm text-gray-500">צוות ({shift.staff?.length || 0} עובדים)</div>
                      <div className="flex flex-wrap gap-2">
                        {shift.staff?.slice(0, 3).map((staffMember, index) => (
                          <Badge key={index} className="bg-gray-100 text-gray-800">
                            {getUserName(staffMember.user_id)} - {getRoleName(staffMember.role)}
                          </Badge>
                        ))}
                        {(shift.staff?.length || 0) > 3 && (
                          <Badge className="bg-gray-100 text-gray-800">
                            +{shift.staff.length - 3} נוספים
                          </Badge>
                        )}
                        {(!shift.staff || shift.staff.length === 0) && (
                          <span className="text-sm text-gray-500">לא שובצו עובדים</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:bg-blue-50"
                        onClick={() => {
                          setViewShift(shift);
                          setShowShiftDetails(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:bg-blue-50"
                        onClick={() => {
                          setEditingShift(shift);
                          setShowShiftForm(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteShift(shift.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Template Form Dialog */}
      <Dialog open={showTemplateForm} onOpenChange={(open) => {
        if (!open) {
          handleCancelTemplateForm();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-cyan-700">
              {editingTemplate ? `עריכת תבנית: ${editingTemplate.name}` : 'יצירת תבנית משמרת חדשה'}
            </DialogTitle>
            <DialogDescription>
              הגדר את פרטי תבנית המשמרת, ימי פעילות והצוות הנדרש.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTemplateSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="template-name" className="block text-sm font-medium mb-1">
                  שם התבנית <span className="text-red-500">*</span>
                </label>
                <Input
                  id="template-name"
                  value={templateFormData.name}
                  onChange={(e) => setTemplateFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="clay-input mt-1"
                  placeholder="לדוגמה: משמרת בוקר"
                  required
                />
              </div>

              <div>
                <label htmlFor="template-site" className="block text-sm font-medium mb-1">
                  אתר <span className="text-red-500">*</span>
                </label>
                <Select // Retain Select component for site selection
                  id="template-site"
                  value={templateFormData.site}
                  onValueChange={(value) => setTemplateFormData(prev => ({ ...prev, site: value }))}
                  required
                >
                  <SelectTrigger className="clay-select mt-1">
                    <SelectValue placeholder="בחר אתר" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map(site => (
                      <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">שעת התחלה</label>
                <Input
                  type="time"
                  value={templateFormData.start_time}
                  onChange={(e) => setTemplateFormData({...templateFormData, start_time: e.target.value})}
                  className="clay-input mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">שעת סיום</label>
                <Input
                  type="time"
                  value={templateFormData.end_time}
                  onChange={(e) => setTemplateFormData({...templateFormData, end_time: e.target.value})}
                  className="clay-input mt-1"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">ימי פעילות</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(hebrewDays).map(([day, label]) => (
                  <div key={day} className="flex items-center">
                    <Checkbox
                      id={`day-${day}`}
                      checked={templateFormData.days_of_week.includes(day)}
                      onCheckedChange={() => handleDayToggle(day)}
                      className="clay-checkbox"
                    />
                    <label
                      htmlFor={`day-${day}`}
                      className="mr-2 text-sm select-none cursor-pointer"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">תפקידים נדרשים</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRequiredRole}
                  className="text-xs"
                >
                  <Plus className="w-3 h-3 ml-1" />
                  הוסף תפקיד
                </Button>
              </div>

              {templateFormData.required_roles.length === 0 ? (
                <div className="text-sm text-gray-500 text-center p-4 border border-dashed rounded-md">
                  לא הוגדרו תפקידים. לחץ על "הוסף תפקיד" כדי להתחיל.
                </div>
              ) : (
                <div className="space-y-3">
                  {templateFormData.required_roles.map((requiredRole, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-md bg-gray-50">
                      <div className="flex-grow">
                        <Select
                          value={requiredRole.role_id} // Use role_id
                          onValueChange={(value) => handleRequiredRoleChange(index, 'role_id', value)} // Use role_id
                        >
                          <SelectTrigger className="clay-select">
                            <SelectValue placeholder="בחר תפקיד" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map(role => (
                              <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-24">
                        <Input
                          type="number"
                          min="1"
                          value={requiredRole.count}
                          onChange={(e) => handleRequiredRoleChange(index, 'count', parseInt(e.target.value, 10))}
                          className="clay-input"
                          placeholder="כמות"
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 h-9 w-9 p-0"
                        onClick={() => handleRemoveRequiredRole(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shift Targets Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium">יעדי משמרת</label>
                <Button type="button" onClick={handleAddShiftTarget} className="clay-button bg-purple-100 text-purple-700 text-sm">
                  <Target className="w-4 h-4 ml-1" />
                  הוסף יעד
                </Button>
              </div>

              {!templateFormData.shift_targets || templateFormData.shift_targets.length === 0 ? (
                <div className="clay-card bg-neutral-50 p-4 text-center text-neutral-500">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>לא הוגדרו יעדים למשמרת זו.</p>
                  <p className="text-xs mt-1">יעדים מאפשרים מעקב אחר משימות ואירועים נדרשים במשמרת.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templateFormData.shift_targets?.map((target, index) => (
                    <Card key={target.id || index} className="clay-card bg-white p-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium">תיאור היעד</label>
                          <Input
                            value={target.description || ''}
                            onChange={(e) => handleShiftTargetChange(index, 'description', e.target.value)}
                            className="clay-input mt-1"
                            placeholder="תיאור היעד (למשל, בדיקת גדרות)"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium">קטגוריית אירוע ליעד</label>
                          <Select
                            value={target.incident_category_id || ''}
                            onValueChange={(value) => handleShiftTargetChange(index, 'incident_category_id', value)}
                            required
                          >
                            <SelectTrigger className="clay-select mt-1">
                              <SelectValue placeholder="בחר קטגוריית אירוע..." />
                            </SelectTrigger>
                            <SelectContent>
                              {incidentCategories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-medium">כמות נדרשת</label>
                          <Input
                            type="number"
                            min="1"
                            value={target.count || 1}
                            onChange={(e) => handleShiftTargetChange(index, 'count', parseInt(e.target.value, 10))}
                            className="clay-input mt-1"
                            placeholder="כמה פעמים?"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium">תפקיד ייעודי (אופציונלי)</label>
                           <Select
                            value={target.target_role_id || ''}
                            onValueChange={(value) => handleShiftTargetChange(index, 'target_role_id', value)}
                          >
                            <SelectTrigger className="clay-select mt-1">
                              <SelectValue placeholder="כללי למשמרת או בחר תפקיד..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null}>כללי למשמרת</SelectItem>
                              {roles.map(role => (
                                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {target.incident_category_id && incidentSubCategories.filter(sc => sc.parent_category_id === target.incident_category_id).length > 0 && (
                            <div>
                                <label className="text-xs font-medium">תת-קטגוריות (אופציונלי)</label>
                                <Select
                                    value={target.incident_sub_category_ids[0] || ''} // Assuming single selection for now
                                    onValueChange={(value) => handleShiftTargetChange(index, 'incident_sub_category_ids', value)}
                                >
                                    <SelectTrigger className="clay-select mt-1">
                                        <SelectValue placeholder="בחר תת-קטגוריות" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={null}>ללא תת-קטגוריה</SelectItem>
                                        {incidentSubCategories
                                            .filter(sc => sc.parent_category_id === target.incident_category_id)
                                            .map(subCat => (
                                                <SelectItem key={subCat.id} value={subCat.id}>
                                                    {subCat.name}
                                                </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                      </div>
                      <div className="mt-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                          onClick={() => handleRemoveShiftTarget(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">הערות</label>
              <Textarea
                value={templateFormData.notes}
                onChange={(e) => setTemplateFormData({...templateFormData, notes: e.target.value})}
                className="clay-textarea mt-1"
                placeholder="הערות כלליות לגבי המשמרת..."
              />
            </div>

            <div className="flex items-center">
              <Checkbox
                id="is-active"
                checked={templateFormData.is_active}
                onCheckedChange={(checked) => setTemplateFormData({...templateFormData, is_active: !!checked})}
                className="clay-checkbox"
              />
              <label htmlFor="is-active" className="mr-2 text-sm">
                תבנית פעילה
              </label>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelTemplateForm} // Use the new wrapper function
                className="clay-button"
              >
                ביטול
              </Button>
              <Button
                type="submit"
                disabled={loadingSave} // Disable when saving
                className="clay-button bg-cyan-600 text-white hover:bg-cyan-700"
              >
                {loadingSave ? ( // Show loading spinner and text
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin ml-2" />
                    {editingTemplate ? 'מעדכן...' : 'שומר...'}
                  </>
                ) : ( // Show regular icon and text
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    {editingTemplate ? 'עדכן תבנית' : 'צור תבנית'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Shift Form Dialog */}
      <Dialog open={showShiftForm} onOpenChange={(open) => {
        if (!open) {
          handleCancelShiftForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-cyan-700">
              {editingShift ? 'עריכת משמרת' : 'יצירת משמרת חדשה'}
            </DialogTitle>
            <DialogDescription>
              הגדר את פרטי המשמרת, מועד ושיבוץ עובדים.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleShiftSubmit} className="space-y-6">
            {!editingShift && (
              <div>
                <label className="text-sm font-medium">תבנית משמרת (אופציונלי)</label>
                <Select
                  value={shiftFormData.template_id}
                  onValueChange={(value) => setShiftFormData({...shiftFormData, template_id: value})}
                >
                  <SelectTrigger className="clay-select mt-1">
                    <SelectValue placeholder="בחר תבנית" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>ללא תבנית</SelectItem>
                    {templates.filter(t => t.is_active).map(template => (
                      <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">בחירת תבנית תמלא אוטומטית את שדות האתר, השעות והתפקידים הנדרשים.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium">אתר</label>
                <Select
                  value={shiftFormData.site}
                  onValueChange={(value) => setShiftFormData({...shiftFormData, site: value})}
                  required
                >
                  <SelectTrigger className="clay-select mt-1">
                    <SelectValue placeholder="בחר אתר" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map(site => (
                      <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">מנהל משמרת</label>
                <Select
                  value={shiftFormData.manager_id}
                  onValueChange={(value) => setShiftFormData({...shiftFormData, manager_id: value})}
                >
                  <SelectTrigger className="clay-select mt-1">
                    <SelectValue placeholder="בחר מנהל משמרת" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>ללא מנהל</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">שעת התחלה</label>
                <Input
                  type="datetime-local"
                  value={shiftFormData.start_time}
                  onChange={(e) => setShiftFormData({...shiftFormData, start_time: e.target.value})}
                  className="clay-input mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">שעת סיום</label>
                <Input
                  type="datetime-local"
                  value={shiftFormData.end_time}
                  onChange={(e) => setShiftFormData({...shiftFormData, end_time: e.target.value})}
                  className="clay-input mt-1"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">סטטוס</label>
                <Select
                  value={shiftFormData.status}
                  onValueChange={(value) => setShiftFormData({...shiftFormData, status: value})}
                  required
                >
                  <SelectTrigger className="clay-select mt-1">
                    <SelectValue placeholder="בחר סטטוס" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">מתוכננת</SelectItem>
                    <SelectItem value="active">פעילה</SelectItem>
                    <SelectItem value="completed">הושלמה</SelectItem>
                    <SelectItem value="cancelled">בוטלה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">שיבוץ עובדים</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddStaffMember}
                  className="text-xs"
                >
                  <Plus className="w-3 h-3 ml-1" />
                  הוסף עובד
                </Button>
              </div>

              {shiftFormData.staff.length === 0 ? (
                <div className="text-sm text-gray-500 text-center p-4 border border-dashed rounded-md">
                  לא שובצו עובדים. לחץ על "הוסף עובד" כדי לשבץ עובדים למשמרת.
                </div>
              ) : (
                <div className="space-y-3">
                  {shiftFormData.staff.map((staffMember, index) => (
                    <div key={index} className="p-3 border rounded-md bg-gray-50">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-grow">
                          <Select
                            value={staffMember.user_id}
                            onValueChange={(value) => handleStaffChange(index, 'user_id', value)}
                          >
                            <SelectTrigger className="clay-select">
                              <SelectValue placeholder="בחר עובד" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null}>בחר עובד</SelectItem>
                              {users.map(user => (
                                <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex-grow">
                          <Select
                            value={staffMember.role}
                            onValueChange={(value) => handleStaffChange(index, 'role', value)}
                          >
                            <SelectTrigger className="clay-select">
                              <SelectValue placeholder="בחר תפקיד" />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map(role => (
                                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 h-9 w-9 p-0"
                          onClick={() => handleRemoveStaffMember(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {(staffMember.user_id || editingShift) && (
                        <Input
                          value={staffMember.notes || ''}
                          onChange={(e) => handleStaffChange(index, 'notes', e.target.value)}
                          className="clay-input mt-1"
                          placeholder="הערות על העובד במשמרת זו..."
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shift Targets Section - NEW */}
            <Card className="clay-card bg-white shadow-sm">
              <CardHeader className="bg-purple-50 rounded-t-lg">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-medium text-purple-700 flex items-center">
                    <Goal className="w-5 h-5 ml-2" />
                    יעדי משמרת
                  </CardTitle>
                  <Button type="button" onClick={handleAddShiftFormTarget} className="clay-button bg-purple-100 text-purple-700 text-sm">
                    <Plus className="w-4 h-4 ml-1" />
                    הוסף יעד
                  </Button>
                </div>
                <CardDescription className="text-sm text-purple-600">
                  הגדר או ערוך יעדים ספציפיים למשמרת זו.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {!shiftFormData.shift_targets_status || shiftFormData.shift_targets_status.length === 0 ? (
                  <div className="clay-card bg-neutral-50 p-6 text-center text-neutral-500">
                    <Goal className="w-10 h-10 mx-auto mb-2 opacity-50 text-purple-400" />
                    <p>לא הוגדרו יעדים למשמרת זו.</p>
                    <p className="text-xs mt-1">ניתן להוסיף יעדים על ידי לחיצה על "הוסף יעד".</p>
                  </div>
                ) : (
                  shiftFormData.shift_targets_status.map((targetStatus, index) => (
                    <Card key={targetStatus.template_target_id || targetStatus.target_definition.id || index} className="clay-card bg-white p-4 border relative">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 left-2 text-red-500 hover:bg-red-100 p-1 h-auto w-auto"
                        onClick={() => handleRemoveShiftFormTarget(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                        <div>
                          <label className="text-xs font-medium text-gray-600">תיאור היעד</label>
                          <Input
                            value={targetStatus.target_definition.description}
                            onChange={(e) => handleShiftFormTargetChange(index, 'target_definition.description', e.target.value)}
                            placeholder="למשל, ביצוע X סיורים"
                            className="clay-input text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">כמות נדרשת</label>
                          <Input
                            type="number"
                            min="1"
                            value={targetStatus.target_definition.count}
                            onChange={(e) => handleShiftFormTargetChange(index, 'target_definition.count', e.target.value)}
                            className="clay-input text-sm w-24"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="text-xs font-medium text-gray-600">קטגוריית אירוע קשורה (אם רלוונטי)</label>
                          <Select
                            value={targetStatus.target_definition.incident_category_id || ''}
                            onValueChange={(value) => handleShiftFormTargetChange(index, 'target_definition.incident_category_id', value)}
                          >
                            <SelectTrigger className="clay-select text-sm">
                              <SelectValue placeholder="בחר קטגוריה" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null}>ללא קטגוריה ספציפית</SelectItem>
                              {incidentCategories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {targetStatus.target_definition.incident_category_id && incidentSubCategories.filter(sc => sc.parent_category_id === targetStatus.target_definition.incident_category_id).length > 0 && (
                          <div className="md:col-span-1">
                            <label className="text-xs font-medium text-gray-600">תת-קטגוריות (אופציונלי)</label>
                            <Select
                                value={targetStatus.target_definition.incident_sub_category_ids[0] || ''} // Assuming single selection for now in UI
                                onValueChange={(value) => handleShiftFormTargetChange(index, 'target_definition.incident_sub_category_ids', value)}
                            >
                                <SelectTrigger className="clay-select text-sm">
                                    <SelectValue placeholder="בחר תת-קטגוריות" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={null}>ללא תת-קטגוריה</SelectItem>
                                    {incidentSubCategories
                                        .filter(sc => sc.parent_category_id === targetStatus.target_definition.incident_category_id)
                                        .map(subCat => (
                                            <SelectItem key={subCat.id} value={subCat.id}>
                                                {subCat.name}
                                            </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-400 mt-1">בחירה מרובה אינה נתמכת כרגע בממשק זה.</p>
                          </div>
                        )}
                        {/* Hidden fields (for data integrity, not user editing here) */}
                        {/* <p className="text-xs text-gray-500 md:col-span-2">הושלמו: {targetStatus.completed_count || 0}</p> */}
                      </div>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>

            <div>
              <label className="text-sm font-medium">הערות כלליות</label>
              <Textarea
                value={shiftFormData.notes}
                onChange={(e) => setShiftFormData({...shiftFormData, notes: e.target.value})}
                className="clay-textarea mt-1"
                placeholder="הערות כלליות למשמרת..."
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelShiftForm}
                className="clay-button"
              >
                ביטול
              </Button>
              <Button
                type="submit"
                disabled={loadingSave}
                className="clay-button bg-cyan-600 text-white hover:bg-cyan-700"
              >
                {loadingSave ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin ml-2" />
                    {editingShift ? 'מעדכן...' : 'שומר...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    {editingShift ? 'עדכן משמרת' : 'צור משמרת'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Shift Details Dialog */}
      <Dialog open={showShiftDetails} onOpenChange={setShowShiftDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewShift && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-semibold text-cyan-700 flex items-center gap-2">
                  <Calendar className="w-6 h-6" />
                  משמרת: {getSiteName(viewShift.site)}
                </DialogTitle>
                <DialogDescription>
                  {formatTimeRange(viewShift.start_time, viewShift.end_time)} · {getStatusBadge(viewShift.status)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">מנהל משמרת</h3>
                    <p className="font-medium">
                      {viewShift.manager_id ? getUserName(viewShift.manager_id) : 'לא הוגדר'}
                    </p>
                  </div>

                  {viewShift.template_id && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">נוצר מתבנית</h3>
                      <p className="font-medium">
                        {templates.find(t => t.id === viewShift.template_id)?.name || 'תבנית לא ידועה'}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">צוות המשמרת</h3>

                  {!viewShift.staff || viewShift.staff.length === 0 ? (
                    <p className="text-gray-500">לא שובצו עובדים למשמרת זו.</p>
                  ) : (
                    <Card className="clay-card bg-white">
                      <CardContent className="p-0">
                        <div className="divide-y">
                          {viewShift.staff.map((staffMember, index) => (
                            <div key={index} className="p-4 flex items-center justify-between">
                              <div>
                                <p className="font-medium">{getUserName(staffMember.user_id)}</p>
                                <p className="text-sm text-gray-500">{getRoleName(staffMember.role)}</p>
                                {staffMember.notes && (
                                  <p className="text-xs text-gray-500 mt-1 italic">{staffMember.notes}</p>
                                )}
                              </div>

                              <div className="text-sm text-right">
                                {staffMember.check_in_time && (
                                  <div className="text-green-600">
                                    כניסה: {new Date(staffMember.check_in_time).toLocaleTimeString('he-IL')}
                                  </div>
                                )}

                                {staffMember.check_out_time && (
                                  <div className="text-red-600">
                                    יציאה: {new Date(staffMember.check_out_time).toLocaleTimeString('he-IL')}
                                  </div>
                                )}

                                {!staffMember.check_in_time && !staffMember.check_out_time && (
                                  <Badge className="bg-yellow-100 text-yellow-800">
                                    טרם נרשמה נוכחות
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {viewShift.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">הערות</h3>
                    <p className="p-3 bg-gray-50 rounded-md">{viewShift.notes}</p>
                  </div>
                )}

                {viewShift.shift_log && viewShift.shift_log.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">יומן המשמרת</h3>
                    <Card className="clay-card bg-white">
                      <CardContent className="p-0">
                        <div className="divide-y">
                          {viewShift.shift_log.map((log, index) => (
                            <div key={index} className="p-3 flex items-start gap-3">
                              <div className="text-xs text-gray-500 whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleTimeString('he-IL')}
                              </div>

                              <div className="flex-grow">
                                <p className="text-sm">{log.content}</p>
                                {log.user_id && (
                                  <p className="text-xs text-gray-500">נרשם ע"י: {getUserName(log.user_id)}</p>
                                )}
                              </div>

                              {log.event_type && (
                                <Badge className={
                                  log.event_type === 'check_in' ? "bg-green-100 text-green-800" :
                                  log.event_type === 'check_out' ? "bg-red-100 text-red-800" :
                                  log.event_type === 'incident' ? "bg-yellow-100 text-yellow-800" :
                                  log.event_type === 'status_change' ? "bg-blue-100 text-blue-800" :
                                  "bg-gray-100 text-gray-800"
                                }>
                                  {log.event_type === 'check_in' ? 'כניסה' :
                                   log.event_type === 'check_out' ? 'יציאה' :
                                   log.event_type === 'incident' ? 'אירוע' :
                                   log.event_type === 'status_change' ? 'שינוי סטטוס' :
                                   'הערה'}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowShiftDetails(false)}
                  className="clay-button"
                >
                  סגור
                </Button>
                <Button
                  onClick={() => {
                    setEditingShift(viewShift);
                    setShowShiftDetails(false);
                    setShowShiftForm(true);
                  }}
                  className="clay-button bg-cyan-600 text-white hover:bg-cyan-700"
                >
                  <Edit2 className="w-4 h-4 ml-1" />
                  ערוך משמרת
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
