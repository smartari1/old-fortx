
import React, { useState, useEffect } from 'react';
import { Automation } from '@/api/entities';
import { CustomDataType } from '@/api/entities';
import { User } from '@/api/entities';
import { UserGroup } from '@/api/entities';
import {
  Zap, Plus, Edit2, Trash2, Play, Pause, Settings, Activity, Clock,
  AlertTriangle, CheckCircle, XCircle, Filter, Search, Eye, Copy,
  ArrowRight, Database, Mail, MessageSquare, Phone, Globe, Bell,
  Calendar, Code, Workflow, BarChart3, Info, Save, X, User as UserIcon
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function AutomationsPage() {
  const [automations, setAutomations] = useState([]);
  const [customDataTypes, setCustomDataTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState(null);
  const [selectedAutomation, setSelectedAutomation] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Form state for creating/editing automation
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    trigger_config: {
      trigger_type: 'field_change',
      source_entity_type: 'CustomDataRecord',
      source_custom_data_type_slug: '',
      field_name: '',
      trigger_conditions: {}
    },
    actions: [],
    tags: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [automationsData, customDataTypesData, usersData, userGroupsData, currentUserData] = await Promise.all([
        Automation.list('-created_date'),
        CustomDataType.list(),
        User.list(),
        UserGroup.list(),
        User.me()
      ]);

      setAutomations(automationsData || []);
      setCustomDataTypes(customDataTypesData || []);
      setUsers(usersData || []);
      setUserGroups(userGroupsData || []);
      setCurrentUser(currentUserData);
    } catch (err) {
      console.error("Error loading automations data:", err);
      setError("שגיאה בטעינת נתוני האוטומציות: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAutomation = () => {
    setEditingAutomation(null);
    setFormData({
      name: '',
      description: '',
      is_active: true,
      trigger_config: {
        trigger_type: 'field_change',
        source_entity_type: 'CustomDataRecord',
        source_custom_data_type_slug: '',
        field_name: '',
        trigger_conditions: {}
      },
      actions: [],
      tags: []
    });
    setShowCreateModal(true);
  };

  const handleEditAutomation = (automation) => {
    setEditingAutomation(automation);
    setFormData({
      ...automation,
      actions: automation.actions || [],
      tags: automation.tags || []
    });
    setShowCreateModal(true);
  };

  const handleSaveAutomation = async () => {
    try {
      const dataToSave = {
        ...formData,
        created_by: currentUser?.id,
        statistics: editingAutomation?.statistics || {
          total_executions: 0,
          successful_executions: 0,
          failed_executions: 0
        }
      };

      if (editingAutomation) {
        await Automation.update(editingAutomation.id, dataToSave);
      } else {
        await Automation.create(dataToSave);
      }

      await loadData();
      setShowCreateModal(false);
    } catch (err) {
      console.error("Error saving automation:", err);
      alert("שגיאה בשמירת האוטומציה: " + err.message);
    }
  };

  const handleToggleAutomation = async (automationId, currentStatus) => {
    try {
      await Automation.update(automationId, { is_active: !currentStatus });
      await loadData();
    } catch (err) {
      console.error("Error toggling automation:", err);
      alert("שגיאה בעדכון סטטוס האוטומציה");
    }
  };

  const handleDeleteAutomation = async (automationId) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק את האוטומציה? פעולה זו אינה הפיכה.")) {
      try {
        await Automation.delete(automationId);
        await loadData();
      } catch (err) {
        console.error("Error deleting automation:", err);
        alert("שגיאה במחיקת האוטומציה");
      }
    }
  };

  const addAction = () => {
    const newAction = {
      action_id: `action_${Date.now()}`,
      action_type: 'send_email', // Default to email
      target_config: {
        target_type: 'field_reference'
      },
      message_template: {
        subject: '',
        body: '',
        placeholders: []
      },
      // Add create_record_config for new records
      create_record_config: {
        target_entity_type: '',
        target_custom_data_type_slug: '',
        field_mappings: [], // Array of {target_field, value_source, static_value, source_field}
        auto_generate_fields: true // Auto-fill common fields like created_by, timestamps
      }
    };

    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, newAction]
    }));
  };

  const updateAction = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) =>
        i === index ? { ...action, [field]: value } : action
      )
    }));
  };

  const removeAction = (index) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  // Enhanced function to get fields for any entity type
  const getEntityFields = (entityType, customDataTypeSlug = null) => {
    if (entityType === 'CustomDataRecord' && customDataTypeSlug) {
      const dataType = customDataTypes.find(dt => dt.slug === customDataTypeSlug);
      if (dataType && dataType.schema_definition && dataType.schema_definition.properties) {
        return Object.keys(dataType.schema_definition.properties).map(fieldName => ({
          value: fieldName,
          label: dataType.schema_definition.properties[fieldName].description || fieldName,
          type: dataType.schema_definition.properties[fieldName].type,
          format: dataType.schema_definition.properties[fieldName].format
        }));
      }
    }

    // Enhanced field mappings for built-in entities
    const entityFieldsMap = {
      'Incident': [
        { value: 'title', label: 'כותרת', type: 'string' },
        { value: 'status', label: 'סטטוס', type: 'string' },
        { value: 'category', label: 'קטגוריה', type: 'string' },
        { value: 'sub_category', label: 'תת-קטגוריה', type: 'string' },
        { value: 'description', label: 'תיאור', type: 'string' },
        { value: 'reporter_id', label: 'מזהה מדווח', type: 'string' },
        { value: 'location.description', label: 'תיאור מיקום', type: 'string' },
        { value: 'location.latitude', label: 'קו רוחב', type: 'number' },
        { value: 'location.longitude', label: 'קו אורך', type: 'number' }
      ],
      'User': [
        { value: 'full_name', label: 'שם מלא', type: 'string' },
        { value: 'email', label: 'מייל', type: 'string', format: 'email' },
        { value: 'phone', label: 'טלפון', type: 'string', format: 'phone' },
        { value: 'site', label: 'אתר', type: 'string' },
        { value: 'active', label: 'פעיל', type: 'boolean' },
        { value: 'roles', label: 'תפקידים', type: 'array' },
        { value: 'groups', label: 'קבוצות', type: 'array' }
      ],
      'ResourceItem': [
        { value: 'item_identifier', label: 'מזהה פריט', type: 'string' },
        { value: 'status', label: 'סטטוס', type: 'string' },
        { value: 'site', label: 'אתר', type: 'string' },
        { value: 'resource_type_id', label: 'סוג משאב', type: 'string' },
        { value: 'notes', label: 'הערות', type: 'string' }
      ],
      'Contact': [
        { value: 'full_name', label: 'שם מלא', type: 'string' },
        { value: 'email', label: 'מייל', type: 'string', format: 'email' },
        { value: 'phone', label: 'טלפון', type: 'string', format: 'phone' },
        { value: 'address', label: 'כתובת', type: 'string' }
      ],
      'Vehicle': [
        { value: 'license_plate', label: 'מספר רישוי', type: 'string' },
        { value: 'make', label: 'יצרן', type: 'string' },
        { value: 'model', label: 'דגם', type: 'string' },
        { value: 'color', label: 'צבע', type: 'string' },
        { value: 'status', label: 'סטטוס', type: 'string' }
      ],
      'Institution': [
        { value: 'name', label: 'שם המוסד', type: 'string' },
        { value: 'contact_person', label: 'איש קשר', type: 'string' },
        { value: 'contact_phone', label: 'טלפון', type: 'string', format: 'phone' },
        { value: 'contact_email', label: 'מייל', type: 'string', format: 'email' },
        { value: 'institution_email', label: 'מייל מוסד', type: 'string', format: 'email' }
      ]
    };

    return entityFieldsMap[entityType] || [];
  };

  // Get fields that can be used as communication targets (email, phone, etc.)
  const getCommunicationFields = (entityType, customDataTypeSlug = null) => {
    const allFields = getEntityFields(entityType, customDataTypeSlug);
    return allFields.filter(field =>
      field.format === 'email' ||
      field.format === 'phone' ||
      field.format === 'tel' ||
      (typeof field.value === 'string' && (field.value.includes('email') || field.value.includes('phone') || field.value.includes('mail')))
    );
  };

  // Get updateable fields for field update actions
  const getUpdateableFields = (entityType, customDataTypeSlug = null) => {
    const allFields = getEntityFields(entityType, customDataTypeSlug);
    // Exclude read-only fields like IDs, timestamps
    return allFields.filter(field =>
      !field.value.includes('id') &&
      !field.value.includes('created_date') &&
      !field.value.includes('updated_date') &&
      !field.value.includes('timestamp')
    );
  };

  // Add function to get all fields for record creation (including read-only fields that can be auto-filled)
  const getAllEntityFields = (entityType, customDataTypeSlug = null) => {
    if (entityType === 'CustomDataRecord' && customDataTypeSlug) {
      const dataType = customDataTypes.find(dt => dt.slug === customDataTypeSlug);
      if (dataType && dataType.schema_definition && dataType.schema_definition.properties) {
        const fields = Object.keys(dataType.schema_definition.properties).map(fieldName => ({
          value: fieldName,
          label: dataType.schema_definition.properties[fieldName].description || fieldName,
          type: dataType.schema_definition.properties[fieldName].type,
          format: dataType.schema_definition.properties[fieldName].format,
          required: dataType.schema_definition.required?.includes(fieldName) || false
        }));
        return fields;
      }
    }

    // Enhanced field mappings for built-in entities (including all fields for creation)
    const entityFieldsMap = {
      'Incident': [
        { value: 'title', label: 'כותרת', type: 'string', required: true },
        { value: 'category', label: 'קטגוריה', type: 'string', required: true },
        { value: 'sub_category', label: 'תת-קטגוריה', type: 'string', required: true },
        { value: 'description', label: 'תיאור', type: 'string', required: true },
        { value: 'status', label: 'סטטוס', type: 'string', required: false },
        { value: 'reporter_id', label: 'מזהה מדווח', type: 'string', required: false },
        { value: 'field_agent_id', label: 'מזהה סוכן שטח', type: 'string', required: false },
        { value: 'handling_team', label: 'צוות טיפול', type: 'array', required: false },
        { value: 'contact_id', label: 'מזהה איש קשר', type: 'string', required: false },
        { value: 'location.description', label: 'תיאור מיקום', type: 'string', required: false },
        { value: 'location.latitude', label: 'קו רוחב', type: 'number', required: false },
        { value: 'location.longitude', label: 'קו אורך', type: 'number', required: false },
        { value: 'created_date', label: 'תאריך יצירה', type: 'string', format: 'date-time', required: false },
        { value: 'updated_date', label: 'תאריך עדכון', type: 'string', format: 'date-time', required: false },
        { value: 'id', label: 'מזהה אירוע', type: 'string', required: false }
      ],
      'ResourceItem': [
        { value: 'resource_type_id', label: 'סוג משאב', type: 'string', required: true },
        { value: 'item_identifier', label: 'מזהה פריט', type: 'string', required: true },
        { value: 'site', label: 'אתר', type: 'string', required: true },
        { value: 'status', label: 'סטטוס', type: 'string', required: true },
        { value: 'specific_location_description', label: 'תיאור מיקום ספציפי', type: 'string', required: false },
        { value: 'is_mobile', label: 'נייד', type: 'boolean', required: false },
        { value: 'notes', label: 'הערות', type: 'string', required: false },
        { value: 'last_inspection_date', label: 'תאריך בדיקה אחרונה', type: 'string', format: 'date', required: false },
        { value: 'next_inspection_date', label: 'תאריך בדיקה הבאה', type: 'string', format: 'date', required: false },
        { value: 'created_date', label: 'תאריך יצירה', type: 'string', format: 'date-time', required: false },
        { value: 'updated_date', label: 'תאריך עדכון', type: 'string', format: 'date-time', required: false },
        { value: 'id', label: 'מזהה פריט משאב', type: 'string', required: false }
      ],
      'Contact': [
        { value: 'full_name', label: 'שם מלא', type: 'string', required: true },
        { value: 'email', label: 'מייל', type: 'string', format: 'email', required: false },
        { value: 'phone', label: 'טלפון', type: 'string', format: 'phone', required: false },
        { value: 'address', label: 'כתובת', type: 'string', required: false },
        { value: 'created_date', label: 'תאריך יצירה', type: 'string', format: 'date-time', required: false },
        { value: 'updated_date', label: 'תאריך עדכון', type: 'string', format: 'date-time', required: false },
        { value: 'id', label: 'מזהה איש קשר', type: 'string', required: false }
      ],
      'Vehicle': [
        { value: 'license_plate', label: 'מספר רישוי', type: 'string', required: true },
        { value: 'make', label: 'יצרן', type: 'string', required: false },
        { value: 'model', label: 'דגם', type: 'string', required: false },
        { value: 'color', label: 'צבע', type: 'string', required: false },
        { value: 'year', label: 'שנת ייצור', type: 'integer', required: false },
        { value: 'status', label: 'סטטוס', type: 'string', required: false },
        { value: 'owner_details', label: 'פרטי בעלים', type: 'string', required: false },
        { value: 'created_date', label: 'תאריך יצירה', type: 'string', format: 'date-time', required: false },
        { value: 'updated_date', label: 'תאריך עדכון', type: 'string', format: 'date-time', required: false },
        { value: 'id', label: 'מזהה רכב', type: 'string', required: false }
      ],
      'Institution': [
        { value: 'name', label: 'שם המוסד', type: 'string', required: true },
        { value: 'contact_person', label: 'איש קשר', type: 'string', required: false },
        { value: 'contact_phone', label: 'טלפון', type: 'string', format: 'phone', required: false },
        { value: 'contact_email', label: 'מייל', type: 'string', format: 'email', required: false },
        { value: 'institution_email', label: 'מייל מוסד', type: 'string', format: 'email', required: false },
        { value: 'address_text', label: 'כתובת', type: 'string', required: false },
        { value: 'site_id', label: 'מזהה אתר', type: 'string', required: false },
        { value: 'created_date', label: 'תאריך יצירה', type: 'string', format: 'date-time', required: false },
        { value: 'updated_date', label: 'תאריך עדכון', type: 'string', format: 'date-time', required: false },
        { value: 'id', label: 'מזהה מוסד', type: 'string', required: false }
      ]
    };

    return entityFieldsMap[entityType] || [];
  };

  const updateActionTarget = (actionIndex, targetField, value) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) =>
        i === actionIndex ? {
          ...action,
          target_config: {
            ...action.target_config,
            [targetField]: value
          }
        } : action
      )
    }));
  };

  const updateActionFieldUpdate = (actionIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) =>
        i === actionIndex ? {
          ...action,
          field_update_config: {
            ...action.field_update_config,
            [field]: value
          }
        } : action
      )
    }));
  };

  const updateCreateRecordConfig = (actionIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) =>
        i === actionIndex ? {
          ...action,
          create_record_config: {
            ...action.create_record_config,
            [field]: value
          }
        } : action
      )
    }));
  };

  const addFieldMapping = (actionIndex) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) =>
        i === actionIndex ? {
          ...action,
          create_record_config: {
            ...action.create_record_config,
            field_mappings: [
              ...(action.create_record_config?.field_mappings || []),
              {
                id: `mapping_${Date.now()}_${Math.random().toString(36).substring(7)}`, // Unique ID
                target_field: '',
                value_source: 'static', // static, from_trigger, calculated
                static_value: '',
                source_field: '',
                calculation_type: ''
              }
            ]
          }
        } : action
      )
    }));
  };

  const updateFieldMapping = (actionIndex, mappingIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) =>
        i === actionIndex ? {
          ...action,
          create_record_config: {
            ...action.create_record_config,
            field_mappings: action.create_record_config.field_mappings.map((mapping, mi) =>
              mi === mappingIndex ? { ...mapping, [field]: value } : mapping
            )
          }
        } : action
      )
    }));
  };

  const removeFieldMapping = (actionIndex, mappingIndex) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) =>
        i === actionIndex ? {
          ...action,
          create_record_config: {
            ...action.create_record_config,
            field_mappings: action.create_record_config.field_mappings.filter((_, mi) => mi !== mappingIndex)
          }
        } : action
      )
    }));
  };

  const filteredAutomations = automations.filter(automation => {
    const matchesSearch = !searchTerm ||
      automation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      automation.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && automation.is_active) ||
      (filterStatus === 'inactive' && !automation.is_active);

    const matchesType = filterType === 'all' ||
      automation.trigger_config?.trigger_type === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const renderActionIcon = (actionType) => {
    const iconMap = {
      send_email: <Mail className="w-4 h-4" />,
      send_sms: <Phone className="w-4 h-4" />,
      send_whatsapp: <MessageSquare className="w-4 h-4" />,
      send_notification: <Bell className="w-4 h-4" />,
      send_group_notification: <UserIcon className="w-4 h-4" />,
      update_field: <Edit2 className="w-4 h-4" />,
      create_record: <Plus className="w-4 h-4" />,
      api_call: <Globe className="w-4 h-4" />,
      webhook: <Code className="w-4 h-4" />
    };
    return iconMap[actionType] || <Settings className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <Zap className="w-8 h-8 ml-3 text-purple-500" />
          מערכת אוטומציות
        </h1>
        <p className="text-gray-600">יצירה וניהול של אוטומציות חכמות לחיבור בין נתונים ופעולות במערכת</p>
      </div>

      {error && (
        <div className="clay-card bg-red-50 p-4 text-red-700 mb-6">
          <AlertTriangle className="w-5 h-5 inline ml-2" />
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="clay-card bg-white p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="חפש אוטומציות..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 clay-input"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32 clay-select">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="active">פעיל</SelectItem>
                <SelectItem value="inactive">לא פעיל</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40 clay-select">
                <SelectValue placeholder="סוג טריגר" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסוגים</SelectItem>
                <SelectItem value="field_change">שינוי שדה</SelectItem>
                <SelectItem value="entity_created">יצירת ישות</SelectItem>
                <SelectItem value="entity_updated">עדכון ישות</SelectItem>
                <SelectItem value="scheduled">מתוזמן</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleCreateAutomation}
            className="clay-button bg-purple-600 text-white hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 ml-2" />
            אוטומציה חדשה
          </Button>
        </div>
      </div>

      {/* Automations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAutomations.map(automation => (
          <Card key={automation.id} className="clay-card bg-white hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Workflow className="w-5 h-5 text-purple-500" />
                    {automation.name}
                    {automation.is_active ? (
                      <Badge className="bg-green-100 text-green-700 text-xs">פעיל</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700 text-xs">לא פעיל</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600 mt-1">
                    {automation.description || 'אין תיאור'}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleAutomation(automation.id, automation.is_active)}
                    className="h-8 w-8"
                    title={automation.is_active ? "השבת" : "הפעל"}
                  >
                    {automation.is_active ?
                      <Pause className="w-4 h-4 text-orange-500" /> :
                      <Play className="w-4 h-4 text-green-500" />
                    }
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">טריגר:</span>
                  <Badge variant="outline" className="text-xs">
                    {automation.trigger_config?.trigger_type === 'field_change' ? 'שינוי שדה' :
                      automation.trigger_config?.trigger_type === 'entity_created' ? 'יצירת ישות' :
                        automation.trigger_config?.trigger_type === 'entity_updated' ? 'עדכון ישות' :
                          automation.trigger_config?.trigger_type === 'scheduled' ? 'מתוזמן' :
                            automation.trigger_config?.trigger_type}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-500" />
                  <span className="font-medium">מקור:</span>
                  <span className="text-xs text-gray-600">
                    {automation.trigger_config?.source_entity_type}
                    {automation.trigger_config?.source_custom_data_type_slug &&
                      ` (${customDataTypes.find(dt => dt.slug === automation.trigger_config.source_custom_data_type_slug)?.name || automation.trigger_config.source_custom_data_type_slug})`
                    }
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-purple-500" />
                  <span className="font-medium">פעולות:</span>
                  <div className="flex gap-1">
                    {(automation.actions || []).slice(0, 3).map((action, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        {renderActionIcon(action.action_type)}
                      </div>
                    ))}
                    {(automation.actions || []).length > 3 && (
                      <span className="text-xs text-gray-500">+{automation.actions.length - 3}</span>
                    )}
                  </div>
                </div>

                {automation.statistics && (
                  <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      <span>{automation.statistics.total_executions || 0} הפעלות</span>
                    </div>
                    {automation.statistics.last_execution && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>לאחרונה: {new Date(automation.statistics.last_execution).toLocaleDateString('he-IL')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedAutomation(automation)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Eye className="w-4 h-4 ml-1" />
                  פרטים
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditAutomation(automation)}
                  className="text-green-600 hover:text-green-700"
                >
                  <Edit2 className="w-4 h-4 ml-1" />
                  ערוך
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteAutomation(automation.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 ml-1" />
                  מחק
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAutomations.length === 0 && !loading && (
        <div className="clay-card bg-white text-center p-10">
          <Zap className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">אין אוטומציות</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || filterStatus !== 'all' || filterType !== 'all' ?
              "לא נמצאו אוטומציות התואמות לסינון." :
              "צור את האוטומציה הראשונה שלך כדי להתחיל לחבר בין נתונים ופעולות."
            }
          </p>
          <Button onClick={handleCreateAutomation} className="clay-button bg-purple-600 text-white">
            <Plus className="w-4 h-4 ml-2" />
            צור אוטומציה ראשונה
          </Button>
        </div>
      )}

      {/* Create/Edit Automation Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden clay-card">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-purple-700">
              {editingAutomation ? 'עריכת אוטומציה' : 'יצירת אוטומציה חדשה'}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[70vh] pr-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="basic">פרטים בסיסיים</TabsTrigger>
                <TabsTrigger value="trigger">טריגר</TabsTrigger>
                <TabsTrigger value="actions">פעולות</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">שם האוטומציה *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="הזן שם תיאורי לאוטומציה"
                    className="clay-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">תיאור</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="תאר את מטרת האוטומציה ומה היא עושה"
                    className="clay-textarea h-20"
                  />
                </div>

                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Checkbox
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <label htmlFor="is_active" className="text-sm">האוטומציה פעילה</label>
                </div>
              </TabsContent>

              <TabsContent value="trigger" className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">סוג הטריגר *</label>
                  <Select
                    value={formData.trigger_config.trigger_type}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      trigger_config: { ...formData.trigger_config, trigger_type: value }
                    })}
                  >
                    <SelectTrigger className="clay-select">
                      <SelectValue placeholder="בחר סוג טריגר" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="field_change">שינוי שדה</SelectItem>
                      <SelectItem value="entity_created">יצירת ישות חדשה</SelectItem>
                      <SelectItem value="entity_updated">עדכון ישות קיימת</SelectItem>
                      <SelectItem value="entity_deleted">מחיקת ישות</SelectItem>
                      <SelectItem value="scheduled">מתוזמן</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">סוג ישות מקור *</label>
                  <Select
                    value={formData.trigger_config.source_entity_type}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      trigger_config: {
                        ...formData.trigger_config,
                        source_entity_type: value,
                        source_custom_data_type_slug: value === 'CustomDataRecord' ? formData.trigger_config.source_custom_data_type_slug : ''
                      }
                    })}
                  >
                    <SelectTrigger className="clay-select">
                      <SelectValue placeholder="בחר סוג ישות" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CustomDataRecord">רשומת דאטה מותאמת</SelectItem>
                      <SelectItem value="Incident">אירוע</SelectItem>
                      <SelectItem value="User">משתמש</SelectItem>
                      <SelectItem value="Location">מיקום</SelectItem>
                      <SelectItem value="Shift">משמרת</SelectItem>
                      <SelectItem value="ResourceItem">פריט משאב</SelectItem>
                      <SelectItem value="Contact">איש קשר</SelectItem>
                      <SelectItem value="Vehicle">רכב</SelectItem>
                      <SelectItem value="Institution">מוסד</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.trigger_config.source_entity_type === 'CustomDataRecord' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">סוג דאטה מותאם *</label>
                    <Select
                      value={formData.trigger_config.source_custom_data_type_slug}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        trigger_config: { ...formData.trigger_config, source_custom_data_type_slug: value, field_name: '' }
                      })}
                    >
                      <SelectTrigger className="clay-select">
                        <SelectValue placeholder="בחר סוג דאטה" />
                      </SelectTrigger>
                      <SelectContent>
                        {customDataTypes.map(dt => (
                          <SelectItem key={dt.slug} value={dt.slug}>{dt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.trigger_config.trigger_type === 'field_change' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">שדה לעקוב אחריו *</label>
                    <Select
                      value={formData.trigger_config.field_name}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        trigger_config: { ...formData.trigger_config, field_name: value }
                      })}
                    >
                      <SelectTrigger className="clay-select">
                        <SelectValue placeholder="בחר שדה" />
                      </SelectTrigger>
                      <SelectContent>
                        {getEntityFields(
                          formData.trigger_config.source_entity_type,
                          formData.trigger_config.source_custom_data_type_slug
                        ).map(field => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label} ({field.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.trigger_config.trigger_type === 'field_change' && formData.trigger_config.field_name && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium">תנאי הפעלה</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">שווה לערך:</label>
                        <Input
                          value={formData.trigger_config.trigger_conditions?.field_value_equals || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            trigger_config: {
                              ...formData.trigger_config,
                              trigger_conditions: {
                                ...formData.trigger_config.trigger_conditions,
                                field_value_equals: e.target.value
                              }
                            }
                          })}
                          placeholder="ערך ספציפי"
                          className="clay-input text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">שונה לערך:</label>
                        <Input
                          value={formData.trigger_config.trigger_conditions?.field_value_changed_to || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            trigger_config: {
                              ...formData.trigger_config,
                              trigger_conditions: {
                                ...formData.trigger_config.trigger_conditions,
                                field_value_changed_to: e.target.value
                              }
                            }
                          })}
                          placeholder="הערך החדש"
                          className="clay-input text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">פעולות לביצוע</h3>
                  <Button onClick={addAction} className="clay-button bg-green-600 text-white">
                    <Plus className="w-4 h-4 ml-1" />
                    הוסף פעולה
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.actions.map((action, index) => (
                    <Card key={action.action_id} className="clay-card border-l-4 border-l-purple-500">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">פעולה #{index + 1}</h4>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAction(index)}
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">סוג פעולה</label>
                          <Select
                            value={action.action_type}
                            onValueChange={(value) => updateAction(index, 'action_type', value)}
                          >
                            <SelectTrigger className="clay-select">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="send_email">שליחת מייל</SelectItem>
                              <SelectItem value="send_sms">שליחת SMS</SelectItem>
                              <SelectItem value="send_whatsapp">שליחת WhatsApp</SelectItem>
                              <SelectItem value="send_notification">התראה במערכת</SelectItem>
                              <SelectItem value="send_group_notification">התראה לקבוצת משתמשים</SelectItem>
                              <SelectItem value="update_field">עדכון שדה</SelectItem>
                              <SelectItem value="create_record">יצירת רשומה</SelectItem>
                              <SelectItem value="api_call">קריאת API</SelectItem>
                              <SelectItem value="webhook">Webhook</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Enhanced target configuration for communication actions */}
                        {['send_email', 'send_sms', 'send_whatsapp', 'send_notification'].includes(action.action_type) && (
                          <>
                            <div>
                              <label className="block text-sm font-medium mb-1">יעד השליחה</label>
                              <Select
                                value={action.target_config?.target_type || ''}
                                onValueChange={(value) => updateActionTarget(index, 'target_type', value)}
                              >
                                <SelectTrigger className="clay-select">
                                  <SelectValue placeholder="בחר יעד" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="static_value">ערך קבוע</SelectItem>
                                  <SelectItem value="field_reference">שדה מהטריגר</SelectItem>
                                  <SelectItem value="related_record_field">שדה מרשומה מקושרת</SelectItem>
                                  <SelectItem value="user_field">שדה משתמש ספציפי</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Static value input */}
                            {action.target_config?.target_type === 'static_value' && (
                              <div>
                                <label className="block text-sm font-medium mb-1">
                                  {action.action_type === 'send_email' ? 'כתובת מייל' :
                                    action.action_type === 'send_sms' ? 'מספר טלפון' :
                                      action.action_type === 'send_whatsapp' ? 'מספר WhatsApp' : 'מזהה משתמש'}
                                </label>
                                <Input
                                  value={action.target_config?.static_target || ''}
                                  onChange={(e) => updateActionTarget(index, 'static_target', e.target.value)}
                                  placeholder={action.action_type === 'send_email' ? 'user@example.com' :
                                    action.action_type === 'send_sms' ? '050-1234567' :
                                      action.action_type === 'send_whatsapp' ? '972501234567' : 'מזהה משתמש'}
                                  className="clay-input"
                                />
                              </div>
                            )}

                            {/* Field reference from trigger entity */}
                            {action.target_config?.target_type === 'field_reference' && (
                              <div>
                                <label className="block text-sm font-medium mb-1">
                                  שדה מהישות המפעילה
                                </label>
                                <Select
                                  value={action.target_config?.source_field || ''}
                                  onValueChange={(value) => updateActionTarget(index, 'source_field', value)}
                                >
                                  <SelectTrigger className="clay-select">
                                    <SelectValue placeholder="בחר שדה" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getCommunicationFields(
                                      formData.trigger_config.source_entity_type,
                                      formData.trigger_config.source_custom_data_type_slug
                                    ).map(field => (
                                      <SelectItem key={field.value} value={field.value}>
                                        {field.label} ({field.type})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {/* Related record field selection */}
                            {action.target_config?.target_type === 'related_record_field' && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium mb-1">סוג ישות יעד</label>
                                  <Select
                                    value={action.target_config?.target_entity_type || ''}
                                    onValueChange={(value) => updateActionTarget(index, 'target_entity_type', value)}
                                  >
                                    <SelectTrigger className="clay-select">
                                      <SelectValue placeholder="בחר סוג ישות" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="CustomDataRecord">רשומת דאטה מותאמת</SelectItem>
                                      <SelectItem value="User">משתמש</SelectItem>
                                      <SelectItem value="Contact">איש קשר</SelectItem>
                                      <SelectItem value="Institution">מוסד</SelectItem>
                                      <SelectItem value="Vehicle">רכב</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {action.target_config?.target_entity_type === 'CustomDataRecord' && (
                                  <div>
                                    <label className="block text-sm font-medium mb-1">סוג דאטה מותאם</label>
                                    <Select
                                      value={action.target_config?.target_custom_data_type_slug || ''}
                                      onValueChange={(value) => updateActionTarget(index, 'target_custom_data_type_slug', value)}
                                    >
                                      <SelectTrigger className="clay-select">
                                        <SelectValue placeholder="בחר סוג דאטה" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {customDataTypes.map(dt => (
                                          <SelectItem key={dt.slug} value={dt.slug}>{dt.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                <div>
                                  <label className="block text-sm font-medium mb-1">שדה התקשורת</label>
                                  <Select
                                    value={action.target_config?.target_field_name || ''}
                                    onValueChange={(value) => updateActionTarget(index, 'target_field_name', value)}
                                  >
                                    <SelectTrigger className="clay-select">
                                      <SelectValue placeholder="בחר שדה" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getCommunicationFields(
                                        action.target_config?.target_entity_type,
                                        action.target_config?.target_custom_data_type_slug
                                      ).map(field => (
                                        <SelectItem key={field.value} value={field.value}>
                                          {field.label} ({field.type})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-1">שדה קישור</label>
                                  <Input
                                    value={action.target_config?.linking_field || ''}
                                    onChange={(e) => updateActionTarget(index, 'linking_field', e.target.value)}
                                    placeholder="שם השדה המקשר בין הישויות (למשל: resource_id)"
                                    className="clay-input"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    השדה שיחבר בין הישות המפעילה לישות היעד
                                  </p>
                                </div>
                              </>
                            )}

                            {/* User field selection */}
                            {action.target_config?.target_type === 'user_field' && (
                              <div>
                                <label className="block text-sm font-medium mb-1">משתמש ספציפי</label>
                                <Select
                                  value={action.target_config?.user_id || ''}
                                  onValueChange={(value) => updateActionTarget(index, 'user_id', value)}
                                >
                                  <SelectTrigger className="clay-select">
                                    <SelectValue placeholder="בחר משתמש" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {users.map(user => (
                                      <SelectItem key={user.id} value={user.id}>
                                        {user.full_name} ({user.email})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </>
                        )}

                        {/* Group notification configuration */}
                        {action.action_type === 'send_group_notification' && (
                          <div>
                            <label className="block text-sm font-medium mb-1">קבוצת משתמשים</label>
                            <Select
                              value={action.target_config?.group_id || ''}
                              onValueChange={(value) => updateActionTarget(index, 'group_id', value)}
                            >
                              <SelectTrigger className="clay-select">
                                <SelectValue placeholder="בחר קבוצה" />
                              </SelectTrigger>
                              <SelectContent>
                                {userGroups.map(group => (
                                  <SelectItem key={group.id} value={group.id}>
                                    {group.name} ({group.members?.length || 0} חברים)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Email subject for email actions */}
                        {action.action_type === 'send_email' && (
                          <div>
                            <label className="block text-sm font-medium mb-1">נושא המייל</label>
                            <Input
                              value={action.message_template?.subject || ''}
                              onChange={(e) => updateAction(index, 'message_template', {
                                ...action.message_template,
                                subject: e.target.value
                              })}
                              placeholder="נושא המייל - ניתן להשתמש ב-{field_name}"
                              className="clay-input"
                            />
                          </div>
                        )}

                        {/* Message body for communication actions */}
                        {['send_email', 'send_sms', 'send_whatsapp', 'send_notification', 'send_group_notification'].includes(action.action_type) && (
                          <div>
                            <label className="block text-sm font-medium mb-1">גוף ההודעה</label>
                            <Textarea
                              value={action.message_template?.body || ''}
                              onChange={(e) => updateAction(index, 'message_template', {
                                ...action.message_template,
                                body: e.target.value
                              })}
                              placeholder="תוכן ההודעה - ניתן להשתמש ב-{field_name} עבור ערכים דינמיים"
                              className="clay-textarea h-24"
                            />
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-700 mb-1">שדות זמינים לשימוש:</p>
                              <div className="flex flex-wrap gap-1">
                                {getEntityFields(
                                  formData.trigger_config.source_entity_type,
                                  formData.trigger_config.source_custom_data_type_slug
                                ).slice(0, 6).map(field => (
                                  <Badge
                                    key={field.value}
                                    variant="outline"
                                    className="text-xs cursor-pointer hover:bg-purple-50"
                                    onClick={() => {
                                      const currentBody = action.message_template?.body || '';
                                      updateAction(index, 'message_template', {
                                        ...action.message_template,
                                        body: currentBody + `{${field.value}}`
                                      });
                                    }}
                                  >
                                    {field.label}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Field update configuration */}
                        {action.action_type === 'update_field' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium mb-1">ישות יעד לעדכון</label>
                              <Select
                                value={action.field_update_config?.target_entity_type || ''}
                                onValueChange={(value) => updateActionFieldUpdate(index, 'target_entity_type', value)}
                              >
                                <SelectTrigger className="clay-select">
                                  <SelectValue placeholder="בחר סוג ישות" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="same_record">אותה רשומה (הטריגר)</SelectItem>
                                  <SelectItem value="CustomDataRecord">רשומת דאטה מותאמת</SelectItem>
                                  <SelectItem value="Incident">אירוע</SelectItem>
                                  <SelectItem value="User">משתמש</SelectItem>
                                  <SelectItem value="ResourceItem">פריט משאב</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {action.field_update_config?.target_entity_type === 'CustomDataRecord' && (
                              <div>
                                <label className="block text-sm font-medium mb-1">סוג דאטה מותאם</label>
                                <Select
                                  value={action.field_update_config?.target_custom_data_type_slug || ''}
                                  onValueChange={(value) => updateActionFieldUpdate(index, 'target_custom_data_type_slug', value)}
                                >
                                  <SelectTrigger className="clay-select">
                                    <SelectValue placeholder="בחר סוג דאטה" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {customDataTypes.map(dt => (
                                      <SelectItem key={dt.slug} value={dt.slug}>{dt.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <div>
                              <label className="block text-sm font-medium mb-1">שדה לעדכון</label>
                              <Select
                                value={action.field_update_config?.target_field || ''}
                                onValueChange={(value) => updateActionFieldUpdate(index, 'target_field', value)}
                              >
                                <SelectTrigger className="clay-select">
                                  <SelectValue placeholder="בחר שדה" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getUpdateableFields(
                                    action.field_update_config?.target_entity_type === 'same_record'
                                      ? formData.trigger_config.source_entity_type
                                      : action.field_update_config?.target_entity_type,
                                    action.field_update_config?.target_entity_type === 'same_record'
                                      ? formData.trigger_config.source_custom_data_type_slug
                                      : action.field_update_config?.target_custom_data_type_slug
                                  ).map(field => (
                                    <SelectItem key={field.value} value={field.value}>
                                      {field.label} ({field.type})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">מקור הערך החדש</label>
                              <Select
                                value={action.field_update_config?.value_source || ''}
                                onValueChange={(value) => updateActionFieldUpdate(index, 'value_source', value)}
                              >
                                <SelectTrigger className="clay-select">
                                  <SelectValue placeholder="בחר מקור" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="static">ערך קבוע</SelectItem>
                                  <SelectItem value="from_trigger_data">מהנתונים המפעילים</SelectItem>
                                  <SelectItem value="calculated">חישוב (תאריך נוכחי, וכו')</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {action.field_update_config?.value_source === 'static' && (
                              <div>
                                <label className="block text-sm font-medium mb-1">ערך חדש</label>
                                <Input
                                  value={action.field_update_config?.new_value || ''}
                                  onChange={(e) => updateActionFieldUpdate(index, 'new_value', e.target.value)}
                                  placeholder="הערך שיוכנס לשדה"
                                  className="clay-input"
                                />
                              </div>
                            )}

                            {action.field_update_config?.value_source === 'from_trigger_data' && (
                              <div>
                                <label className="block text-sm font-medium mb-1">שדה מקור</label>
                                <Select
                                  value={action.field_update_config?.source_field || ''}
                                  onValueChange={(value) => updateActionFieldUpdate(index, 'source_field', value)}
                                >
                                  <SelectTrigger className="clay-select">
                                    <SelectValue placeholder="בחר שדה מהטריגר" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getEntityFields(
                                      formData.trigger_config.source_entity_type,
                                      formData.trigger_config.source_custom_data_type_slug
                                    ).map(field => (
                                      <SelectItem key={field.value} value={field.value}>
                                        {field.label} ({field.type})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {action.field_update_config?.value_source === 'calculated' && (
                              <div>
                                <label className="block text-sm font-medium mb-1">סוג חישוב</label>
                                <Select
                                  value={action.field_update_config?.calculation_type || ''}
                                  onValueChange={(value) => updateActionFieldUpdate(index, 'calculation_type', value)}
                                >
                                  <SelectTrigger className="clay-select">
                                    <SelectValue placeholder="בחר סוג חישוב" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="current_timestamp">תאריך ושעה נוכחיים</SelectItem>
                                    <SelectItem value="current_date">תאריך נוכחי</SelectItem>
                                    <SelectItem value="current_user_id">מזהה משתמש נוכחי</SelectItem>
                                    <SelectItem value="random_id">מזהה אקראי</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {action.field_update_config?.target_entity_type !== 'same_record' && (
                              <div>
                                <label className="block text-sm font-medium mb-1">איך למצוא את הרשומה לעדכון</label>
                                <Input
                                  value={action.field_update_config?.record_lookup_field || ''}
                                  onChange={(e) => updateActionFieldUpdate(index, 'record_lookup_field', e.target.value)}
                                  placeholder="שם השדה לחיפוש (למשל: resource_id)"
                                  className="clay-input"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  השדה שיחבר בין הרשומה המפעילה לרשומה הנערכת
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        {/* Enhanced Create Record Configuration */}
                        {action.action_type === 'create_record' && (
                          <div className="space-y-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                            <h5 className="text-sm font-medium text-emerald-700 mb-3">הגדרות יצירת רשומה</h5>

                            <div>
                              <label className="block text-sm font-medium mb-1">סוג ישות יעד ליצירה</label>
                              <Select
                                value={action.create_record_config?.target_entity_type || ''}
                                onValueChange={(value) => updateCreateRecordConfig(index, 'target_entity_type', value)}
                              >
                                <SelectTrigger className="clay-select">
                                  <SelectValue placeholder="בחר סוג ישות" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="CustomDataRecord">רשומת דאטה מותאמת</SelectItem>
                                  <SelectItem value="Incident">אירוע</SelectItem>
                                  <SelectItem value="ResourceItem">פריט משאב</SelectItem>
                                  <SelectItem value="Contact">איש קשר</SelectItem>
                                  <SelectItem value="Vehicle">רכב</SelectItem>
                                  <SelectItem value="Institution">מוסד</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {action.create_record_config?.target_entity_type === 'CustomDataRecord' && (
                              <div>
                                <label className="block text-sm font-medium mb-1">סוג דאטה מותאם</label>
                                <Select
                                  value={action.create_record_config?.target_custom_data_type_slug || ''}
                                  onValueChange={(value) => updateCreateRecordConfig(index, 'target_custom_data_type_slug', value)}
                                >
                                  <SelectTrigger className="clay-select">
                                    <SelectValue placeholder="בחר סוג דאטה" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {customDataTypes.map(dt => (
                                      <SelectItem key={dt.slug} value={dt.slug}>{dt.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <div className="flex items-center space-x-2 space-x-reverse">
                              <Checkbox
                                id={`auto-generate-${index}`}
                                checked={action.create_record_config?.auto_generate_fields || false}
                                onCheckedChange={(checked) => updateCreateRecordConfig(index, 'auto_generate_fields', checked)}
                              />
                              <label htmlFor={`auto-generate-${index}`} className="text-sm">
                                מלא אוטומטית שדות מערכת (created_by, timestamps וכו')
                              </label>
                            </div>

                            {/* Field Mappings Section */}
                            <div>
                              <div className="flex justify-between items-center mb-3">
                                <label className="block text-sm font-medium">מיפוי שדות</label>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addFieldMapping(index)}
                                  className="clay-button bg-emerald-100 text-emerald-700"
                                >
                                  <Plus className="w-3 h-3 ml-1" />
                                  הוסף שדה
                                </Button>
                              </div>

                              <div className="space-y-3 max-h-64 overflow-y-auto">
                                {(action.create_record_config?.field_mappings || []).map((mapping, mappingIndex) => (
                                  <div key={mapping.id} className="p-3 border rounded-lg bg-white">
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-xs font-medium text-gray-600">מיפוי #{mappingIndex + 1}</span>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeFieldMapping(index, mappingIndex)}
                                        className="h-6 w-6 text-red-500 hover:text-red-700"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                      {/* Target Field Selection */}
                                      <div>
                                        <label className="block text-xs font-medium mb-1">שדה יעד</label>
                                        <Select
                                          value={mapping.target_field || ''}
                                          onValueChange={(value) => updateFieldMapping(index, mappingIndex, 'target_field', value)}
                                        >
                                          <SelectTrigger className="clay-select text-xs">
                                            <SelectValue placeholder="בחר שדה" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {getAllEntityFields(
                                              action.create_record_config?.target_entity_type,
                                              action.create_record_config?.target_custom_data_type_slug
                                            ).map(field => (
                                              <SelectItem key={field.value} value={field.value}>
                                                {field.label} ({field.type}) {field.required && '(חובה)'}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {/* Value Source Selection */}
                                      <div>
                                        <label className="block text-xs font-medium mb-1">מקור הערך</label>
                                        <Select
                                          value={mapping.value_source || 'static'}
                                          onValueChange={(value) => updateFieldMapping(index, mappingIndex, 'value_source', value)}
                                        >
                                          <SelectTrigger className="clay-select text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="static">ערך קבוע</SelectItem>
                                            <SelectItem value="from_trigger">מהטריגר</SelectItem>
                                            <SelectItem value="calculated">חישוב</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {/* Value Input based on source type */}
                                      <div>
                                        {mapping.value_source === 'static' && (
                                          <>
                                            <label className="block text-xs font-medium mb-1">ערך קבוע</label>
                                            <Input
                                              value={mapping.static_value || ''}
                                              onChange={(e) => updateFieldMapping(index, mappingIndex, 'static_value', e.target.value)}
                                              placeholder="הזן ערך"
                                              className="clay-input text-xs"
                                            />
                                          </>
                                        )}

                                        {mapping.value_source === 'from_trigger' && (
                                          <>
                                            <label className="block text-xs font-medium mb-1">שדה מקור</label>
                                            <Select
                                              value={mapping.source_field || ''}
                                              onValueChange={(value) => updateFieldMapping(index, mappingIndex, 'source_field', value)}
                                            >
                                              <SelectTrigger className="clay-select text-xs">
                                                <SelectValue placeholder="בחר שדה" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {getEntityFields(
                                                  formData.trigger_config.source_entity_type,
                                                  formData.trigger_config.source_custom_data_type_slug
                                                ).map(field => (
                                                  <SelectItem key={field.value} value={field.value}>
                                                    {field.label}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </>
                                        )}

                                        {mapping.value_source === 'calculated' && (
                                          <>
                                            <label className="block text-xs font-medium mb-1">סוג חישוב</label>
                                            <Select
                                              value={mapping.calculation_type || ''}
                                              onValueChange={(value) => updateFieldMapping(index, mappingIndex, 'calculation_type', value)}
                                            >
                                              <SelectTrigger className="clay-select text-xs">
                                                <SelectValue placeholder="בחר חישוב" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="current_timestamp">זמן נוכחי</SelectItem>
                                                <SelectItem value="current_date">תאריך נוכחי</SelectItem>
                                                <SelectItem value="current_user_id">מזהה משתמש נוכחי</SelectItem>
                                                <SelectItem value="random_id">מזהה אקראי</SelectItem>
                                                <SelectItem value="trigger_record_id">מזהה רשומת הטריגר</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {(action.create_record_config?.field_mappings || []).length === 0 && (
                                <div className="text-center py-4 text-gray-500 text-sm">
                                  <Database className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                  <p>לא הוגדרו מיפויי שדות</p>
                                  <p className="text-xs">הוסף מיפויי שדות כדי לקבוע איך למלא את הרשומה החדשה</p>
                                </div>
                              )}
                            </div>

                            {/* Required Fields Warning */}
                            {action.create_record_config?.target_entity_type && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <h6 className="text-xs font-medium text-amber-800 mb-1">שדות חובה:</h6>
                                <div className="flex flex-wrap gap-1">
                                  {getAllEntityFields(
                                    action.create_record_config?.target_entity_type,
                                    action.create_record_config?.target_custom_data_type_slug
                                  ).filter(field => field.required).map(field => (
                                    <Badge key={field.value} variant="outline" className="text-xs bg-amber-100 text-amber-700">
                                      {field.label}
                                    </Badge>
                                  ))}
                                </div>
                                <p className="text-xs text-amber-700 mt-1">וודא שכל השדות החובה ממופים או ימולאו אוטומטית</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* API call configuration */}
                        {action.action_type === 'api_call' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium mb-1">שיטת HTTP</label>
                              <Select
                                value={action.api_config?.method || 'POST'}
                                onValueChange={(value) => updateAction(index, 'api_config', {
                                  ...action.api_config,
                                  method: value
                                })}
                              >
                                <SelectTrigger className="clay-select">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="GET">GET</SelectItem>
                                  <SelectItem value="POST">POST</SelectItem>
                                  <SelectItem value="PUT">PUT</SelectItem>
                                  <SelectItem value="DELETE">DELETE</SelectItem>
                                  <SelectItem value="PATCH">PATCH</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">URL</label>
                              <Input
                                value={action.api_config?.url || ''}
                                onChange={(e) => updateAction(index, 'api_config', {
                                  ...action.api_config,
                                  url: e.target.value
                                })}
                                placeholder="https://api.example.com/endpoint"
                                className="clay-input"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">גוף הבקשה (JSON)</label>
                              <Textarea
                                value={action.api_config?.body_template || ''}
                                onChange={(e) => updateAction(index, 'api_config', {
                                  ...action.api_config,
                                  body_template: e.target.value
                                })}
                                placeholder='{"field": "{field_name}", "value": "{new_value}"}'
                                className="clay-textarea h-20"
                              />
                              <div className="mt-2">
                                <p className="text-xs font-medium text-gray-700 mb-1">שדות זמינים לשימוש:</p>
                                <div className="flex flex-wrap gap-1">
                                  {getEntityFields(
                                    formData.trigger_config.source_entity_type,
                                    formData.trigger_config.source_custom_data_type_slug
                                  ).slice(0, 6).map(field => (
                                    <Badge
                                      key={field.value}
                                      variant="outline"
                                      className="text-xs cursor-pointer hover:bg-purple-50"
                                      onClick={() => {
                                        const currentBody = action.api_config?.body_template || '';
                                        updateAction(index, 'api_config', {
                                          ...action.api_config,
                                          body_template: currentBody + `"${field.value}": "{${field.value}}",`
                                        });
                                      }}
                                    >
                                      {field.label}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {formData.actions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>אין פעולות מוגדרות</p>
                    <p className="text-sm">לחץ על "הוסף פעולה" כדי להתחיל</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="clay-button">
              ביטול
            </Button>
            <Button onClick={handleSaveAutomation} className="clay-button bg-purple-600 text-white" disabled={!formData.name.trim()}>
              <Save className="w-4 h-4 ml-1" />
              {editingAutomation ? 'שמור שינויים' : 'צור אוטומציה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Automation Details Modal */}
      {selectedAutomation && (
        <Dialog open={!!selectedAutomation} onOpenChange={() => setSelectedAutomation(null)}>
          <DialogContent className="max-w-2xl clay-card">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Info className="w-5 h-5 ml-2 text-blue-500" />
                פרטי אוטומציה: {selectedAutomation.name}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">מידע כללי</h4>
                  <div className="bg-gray-50 p-3 rounded-md space-y-2 text-sm">
                    <p><strong>תיאור:</strong> {selectedAutomation.description || 'אין תיאור'}</p>
                    <p><strong>סטטוס:</strong>
                      {selectedAutomation.is_active ? (
                        <Badge className="bg-green-100 text-green-700 mr-1">פעיל</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700 mr-1">לא פעיל</Badge>
                      )}
                    </p>
                    <p><strong>נוצר ע"י:</strong> {users.find(u => u.id === selectedAutomation.created_by)?.full_name || 'לא ידוע'}</p>
                    <p><strong>תאריך יצירה:</strong> {new Date(selectedAutomation.created_date).toLocaleDateString('he-IL')}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">הגדרות טריגר</h4>
                  <div className="bg-blue-50 p-3 rounded-md space-y-2 text-sm">
                    <p><strong>סוג טריגר:</strong> {selectedAutomation.trigger_config?.trigger_type}</p>
                    <p><strong>ישות מקור:</strong> {selectedAutomation.trigger_config?.source_entity_type}</p>
                    {selectedAutomation.trigger_config?.source_custom_data_type_slug && (
                      <p><strong>סוג דאטה:</strong> {customDataTypes.find(dt => dt.slug === selectedAutomation.trigger_config.source_custom_data_type_slug)?.name}</p>
                    )}
                    {selectedAutomation.trigger_config?.field_name && (
                      <p><strong>שדה:</strong> {selectedAutomation.trigger_config.field_name}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">פעולות ({(selectedAutomation.actions || []).length})</h4>
                  <div className="space-y-2">
                    {(selectedAutomation.actions || []).map((action, idx) => (
                      <div key={idx} className="bg-purple-50 p-3 rounded-md text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          {renderActionIcon(action.action_type)}
                          <strong>
                            {action.action_type === 'send_email' ? 'שליחת מייל' :
                              action.action_type === 'send_sms' ? 'שליחת SMS' :
                                action.action_type === 'send_whatsapp' ? 'שליחת WhatsApp' :
                                  action.action_type === 'send_notification' ? 'התראה במערכת' :
                                    action.action_type === 'send_group_notification' ? 'התראה לקבוצת משתמשים' :
                                      action.action_type === 'update_field' ? 'עדכון שדה' :
                                        action.action_type === 'create_record' ? 'יצירת רשומה' :
                                          action.action_type === 'api_call' ? 'קריאת API' :
                                            action.action_type}
                          </strong>
                        </div>
                        {action.message_template?.subject && (
                          <p><strong>נושא:</strong> {action.message_template.subject}</p>
                        )}
                        {action.message_template?.body && (
                          <p><strong>תוכן:</strong> {action.message_template.body.substring(0, 100)}...</p>
                        )}
                        {action.api_config?.url && (
                          <p><strong>URL:</strong> {action.api_config.url}</p>
                        )}
                        {action.create_record_config?.target_entity_type && (
                          <p><strong>יצירת רשומה מסוג:</strong> {action.create_record_config.target_entity_type}
                            {action.create_record_config.target_custom_data_type_slug &&
                              ` (${customDataTypes.find(dt => dt.slug === action.create_record_config.target_custom_data_type_slug)?.name || action.create_record_config.target_custom_data_type_slug})`
                            }
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedAutomation.statistics && (
                  <div>
                    <h4 className="font-medium mb-2">סטטיסטיקות</h4>
                    <div className="bg-green-50 p-3 rounded-md grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>סה"כ הפעלות:</strong> {selectedAutomation.statistics.total_executions || 0}</p>
                        <p><strong>הפעלות מוצלחות:</strong> {selectedAutomation.statistics.successful_executions || 0}</p>
                      </div>
                      <div>
                        <p><strong>הפעלות כושלות:</strong> {selectedAutomation.statistics.failed_executions || 0}</p>
                        {selectedAutomation.statistics.last_execution && (
                          <p><strong>הפעלה אחרונה:</strong> {new Date(selectedAutomation.statistics.last_execution).toLocaleDateString('he-IL')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedAutomation(null)} className="clay-button">
                סגור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
