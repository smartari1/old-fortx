
import React, { useState, useEffect } from 'react';
import { AutomatedReportConfig } from '@/api/entities';
import { IncidentCategory } from '@/api/entities';
import { IncidentSubCategory } from '@/api/entities';
import { Plus, Edit2, Trash2, Clock, Mail, Filter as FilterIcon, FileCog, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Resource } from '@/api/entities'; // For selecting resource types
import { UserGroup } from '@/api/entities'; // For selecting recipient groups
import { User } from '@/api/entities'; // To fetch user emails from groups (conceptually for now)

// Helper to display schedule nicely
const formatSchedule = (schedule) => {
    if (!schedule) return "לא הוגדר";
    let text = "";
    if (schedule.frequency === 'daily') text = "יומי";
    else if (schedule.frequency === 'weekly') {
        const days = {monday: "שני", tuesday: "שלישי", wednesday: "רביעי", thursday: "חמישי", friday: "שישי", saturday: "שבת", sunday: "ראשון"};
        text = `שבועי, ביום ${days[schedule.day_of_week] || schedule.day_of_week}`;
    }
    else if (schedule.frequency === 'monthly') text = `חודשי, ב-${schedule.day_of_month} בחודש`;
    
    return `${text} בשעה ${schedule.time_of_day}`;
};

const entityTypeOptions = [
    { value: "Incident", label: "אירועים" },
    { value: "Shift", label: "משמרות" },
    { value: "ResourceItem", label: "פריטי משאב" },
];

const frequencyOptions = [
    { value: "daily", label: "יומי" },
    { value: "weekly", label: "שבועי" },
    { value: "monthly", label: "חודשי" },
];

const dayOfWeekOptions = [
    { value: "sunday", label: "ראשון" },
    { value: "monday", label: "שני" },
    { value: "tuesday", label: "שלישי" },
    { value: "wednesday", label: "רביעי" },
    { value: "thursday", label: "חמישי" },
    { value: "friday", label: "שישי" },
    { value: "saturday", label: "שבת" },
];

export default function AutomatedReportsPage() {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingConfig, setEditingConfig] = useState(null);
    
    // Categories and subcategories for incidents filtering
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [filteredSubcategories, setFilteredSubcategories] = useState([]);

    const [resourceTypes, setResourceTypes] = useState([]);
    const [userGroups, setUserGroups] = useState([]);
    
    const [currentConfig, setCurrentConfig] = useState({
        report_name: '',
        description: '',
        entity_type: 'Incident',
        filters: {}, 
        output_format: 'csv',
        schedule: {
            frequency: 'daily',
            day_of_week: 'monday',
            day_of_month: 1,
            time_of_day: '08:00'
        },
        recipients: [], // Array of emails
        recipient_groups: [], // Array of UserGroup IDs
        is_active: true,
        filter_mode: 'simple', 
        simple_filters: {
            status: 'all',
            category: 'all',
            sub_category: 'all',
            date_range: 'last_month',
            resource_type: 'all' // New simple filter for resource type
        }
    });

    useEffect(() => {
        loadConfigs();
        loadCategoriesAndSubcategories();
        loadResourceTypes();
        loadUserGroups();
    }, []);

    const loadConfigs = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await AutomatedReportConfig.list();
            setConfigs(data);
        } catch (err) {
            console.error("Error loading automated report configs:", err);
            setError("שגיאה בטעינת הגדרות הדוחות: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadCategoriesAndSubcategories = async () => {
        try {
            const [fetchedCategories, fetchedSubcategories] = await Promise.all([
                IncidentCategory.list(),
                IncidentSubCategory.list()
            ]);
            setCategories(fetchedCategories);
            setSubcategories(fetchedSubcategories);
        } catch (err) {
            console.error("Error loading categories and subcategories:", err);
        }
    };

    const loadResourceTypes = async () => {
        try {
            const types = await Resource.list();
            setResourceTypes(types);
        } catch (err) {
            console.error("Error loading resource types:", err);
        }
    };

    const loadUserGroups = async () => {
        try {
            const groups = await UserGroup.list();
            setUserGroups(groups);
        } catch (err) {
            console.error("Error loading user groups:", err);
        }
    };

    useEffect(() => {
        if (currentConfig.simple_filters.category && currentConfig.simple_filters.category !== 'all') {
            const subs = subcategories.filter(sub => sub.parent_category_id === currentConfig.simple_filters.category);
            setFilteredSubcategories(subs);
        } else {
            setFilteredSubcategories([]);
        }
        // Reset sub_category when category changes
        if (currentConfig.simple_filters.category === 'all') {
            setCurrentConfig(prev => ({
                ...prev,
                simple_filters: { ...prev.simple_filters, sub_category: 'all' }
            }));
        }
    }, [currentConfig.simple_filters.category, subcategories]);

    const resetForm = () => {
        setCurrentConfig({
            report_name: '',
            description: '',
            entity_type: 'Incident',
            filters: {},
            output_format: 'csv',
            schedule: { frequency: 'daily', day_of_week: 'monday', day_of_month: 1, time_of_day: '08:00' },
            recipients: [],
            recipient_groups: [],
            is_active: true,
            filter_mode: 'simple',
            simple_filters: {
                status: 'all',
                category: 'all',
                sub_category: 'all',
                date_range: 'last_month',
                resource_type: 'all'
            }
        });
        setEditingConfig(null);
        setFilteredSubcategories([]);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name.startsWith("schedule.")) {
            const scheduleField = name.split(".")[1];
            setCurrentConfig(prev => ({ 
                ...prev, 
                schedule: { ...prev.schedule, [scheduleField]: type === 'number' ? parseInt(value) : value }
            }));
        } else if (name.startsWith("simple_filters.")) {
            const filterField = name.split(".")[1];
            setCurrentConfig(prev => ({
                ...prev,
                simple_filters: { ...prev.simple_filters, [filterField]: value }
            }));
        } else {
            setCurrentConfig(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        }
    };
    
    const handleSelectChange = (name, value) => {
         if (name.startsWith("schedule.")) {
            const scheduleField = name.split(".")[1];
            setCurrentConfig(prev => ({ 
                ...prev, 
                schedule: { ...prev.schedule, [scheduleField]: value }
            }));
        } else if (name.startsWith("simple_filters.")) {
            const filterField = name.split(".")[1];
            setCurrentConfig(prev => ({
                ...prev,
                simple_filters: { ...prev.simple_filters, [filterField]: value }
            }));
        } else {
            setCurrentConfig(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleRecipientEmailsChange = (e) => {
        const emailArray = e.target.value.split(',').map(email => email.trim()).filter(email => email);
        setCurrentConfig(prev => ({ ...prev, recipients: emailArray }));
    };

    const handleRecipientGroupsChange = (groupId) => {
        setCurrentConfig(prev => ({
            ...prev,
            recipient_groups: prev.recipient_groups.includes(groupId)
                ? prev.recipient_groups.filter(id => id !== groupId)
                : [...prev.recipient_groups, groupId]
        }));
    };


    const handleAdvancedFilterChange = (e) => {
        try {
            const parsedFilters = JSON.parse(e.target.value || '{}');
            setCurrentConfig(prev => ({ ...prev, filters: parsedFilters }));
        } catch (jsonError) {
            // Potentially show an error to the user if JSON is invalid
            console.warn("Invalid JSON for filters:", jsonError);
        }
    };

    const buildFiltersFromSimple = () => {
        if (currentConfig.filter_mode === 'advanced') {
            return currentConfig.filters;
        }
        
        const filters = {};
        const { status, category, sub_category, date_range, resource_type } = currentConfig.simple_filters;
        
        if (currentConfig.entity_type === 'Incident') {
            if (status !== 'all') filters.status = status;
            if (category !== 'all') filters.category = category;
            if (sub_category !== 'all') filters.sub_category = sub_category;
        } else if (currentConfig.entity_type === 'ResourceItem') {
            if (resource_type !== 'all') filters.resource_type_id = resource_type;
            // Potentially add status filter for ResourceItem here if needed
        }
        // Add other entity-specific simple filters here if needed

        // Handle date range (common filter)
        if (date_range !== 'all') {
            const now = new Date();
            let startDate;
            switch (date_range) {
                case 'last_week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'last_month':
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case 'last_3_months':
                    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    break;
            }
            if (startDate) {
                filters.created_date_gte = startDate.toISOString().split('T')[0]; 
            }
        }
        
        return filters;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentConfig.report_name.trim() || (currentConfig.recipients.length === 0 && currentConfig.recipient_groups.length === 0) ) {
            alert("שם דוח ולפחות נמען אחד (אימייל או קבוצה) הם שדות חובה.");
            return;
        }

        const filtersToSave = buildFiltersFromSimple();
        const payload = { ...currentConfig, filters: filtersToSave };
        
        delete payload.simple_filters;
        // delete payload.filter_mode; // Keep filter_mode if needed for display consistency, or remove

        try {
            setLoading(true);
            if (editingConfig) {
                await AutomatedReportConfig.update(editingConfig.id, payload);
            } else {
                await AutomatedReportConfig.create(payload);
            }
            await loadConfigs();
            setShowFormModal(false);
            resetForm();
        } catch (err) {
            console.error("Error saving config:", err);
            alert("שגיאה בשמירת הגדרת הדוח: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (config) => {
        setEditingConfig(config);
        
        const filters = config.filters || {};
        let canUseSimpleMode = true;
        let simpleFilters = {
            status: 'all',
            category: 'all',
            sub_category: 'all',
            date_range: 'all',
            resource_type: 'all'
        };
        
        if (config.entity_type === 'Incident') {
            if (filters.status && ['open', 'in_progress', 'closed'].includes(filters.status)) {
                simpleFilters.status = filters.status;
            } else if (filters.status) { canUseSimpleMode = false; }
            
            if (filters.category) simpleFilters.category = filters.category;
            if (filters.sub_category) simpleFilters.sub_category = filters.sub_category;
        } else if (config.entity_type === 'ResourceItem') {
            if (filters.resource_type_id) simpleFilters.resource_type = filters.resource_type_id;
            // Add status for ResourceItem if applicable
        }
        
        if (filters.created_date_gte) {
            const gte = new Date(filters.created_date_gte);
            const now = new Date();
            const diffDays = Math.floor((now - gte) / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 6 && diffDays <= 8) simpleFilters.date_range = 'last_week';
            else if (diffDays >= 28 && diffDays <= 32) simpleFilters.date_range = 'last_month';
            else if (diffDays >= 85 && diffDays <= 95) simpleFilters.date_range = 'last_3_months';
            else canUseSimpleMode = false;
        }
        
        const knownSimpleFields = ['status', 'category', 'sub_category', 'created_date_gte', 'resource_type_id'];
        const hasOtherFields = Object.keys(filters).some(key => !knownSimpleFields.includes(key));
        if (hasOtherFields) canUseSimpleMode = false;
        
        setCurrentConfig({
            ...config,
            filter_mode: (config.filter_mode !== undefined) ? config.filter_mode : (canUseSimpleMode ? 'simple' : 'advanced'),
            simple_filters: simpleFilters,
            filters: typeof config.filters === 'string' ? config.filters : JSON.stringify(config.filters || {}, null, 2),
            recipients: Array.isArray(config.recipients) ? config.recipients : [],
            recipient_groups: Array.isArray(config.recipient_groups) ? config.recipient_groups : []
        });
        setShowFormModal(true);
    };

    const handleDelete = async (configId) => {
        if (window.confirm("האם אתה בטוח שברצונך למחוק הגדרת דוח זו?")) {
            try {
                setLoading(true);
                await AutomatedReportConfig.delete(configId);
                await loadConfigs();
            } catch (err) {
                console.error("Error deleting config:", err);
                alert("שגיאה במחיקת הגדרת הדוח: " + err.message);
            } finally {
                setLoading(false);
            }
        }
    };


    if (loading && configs.length === 0) {
        return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div></div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6" dir="rtl">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold flex items-center text-primary-700">
                    <FileCog className="w-8 h-8 ml-3 text-primary-500" />
                    הגדרת דוחות אוטומטיים
                </h1>
                <Button onClick={() => { resetForm(); setShowFormModal(true); }} className="clay-button bg-primary-500 hover:bg-primary-600 text-white">
                    <Plus className="w-4 h-4 ml-2" />
                    הגדרת דוח חדש
                </Button>
            </div>

            {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>}

            {configs.length === 0 && !loading ? (
                 <Card className="clay-card text-center p-10">
                    <FileCog className="w-20 h-20 mx-auto mb-6 text-neutral-300"/>
                    <h3 className="text-2xl font-semibold text-neutral-700">אין דוחות אוטומטיים מוגדרים</h3>
                    <p className="text-neutral-500 mt-2">לחץ על "הגדרת דוח חדש" כדי להתחיל.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {configs.map(config => (
                        <Card key={config.id} className={`clay-card shadow-lg transition-all hover:shadow-xl ${!config.is_active ? 'opacity-60 bg-neutral-50' : 'bg-white'}`}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-xl text-primary-600">{config.report_name}</CardTitle>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(config)} className="text-primary-500 hover:text-primary-700">
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(config.id)} className="text-red-500 hover:text-red-700">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <CardDescription className="text-sm">{config.description || "אין תיאור"}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex items-center">
                                    <FileCog className="w-4 h-4 ml-2 text-neutral-500" />
                                    <strong>סוג ישות:</strong> <span className="mr-1">{entityTypeOptions.find(e => e.value === config.entity_type)?.label || config.entity_type}</span>
                                </div>
                                <div className="flex items-center">
                                    <Clock className="w-4 h-4 ml-2 text-neutral-500" />
                                    <strong>תזמון:</strong> <span className="mr-1">{formatSchedule(config.schedule)}</span>
                                </div>
                                <div className="flex items-center">
                                    <Mail className="w-4 h-4 ml-2 text-neutral-500" />
                                    <strong>נמענים:</strong> 
                                    <span className="mr-1 truncate" title={[...(config.recipients || []), ...(config.recipient_groups?.map(gid => `קבוצה: ${userGroups.find(g=>g.id===gid)?.name || gid}`) || [])].join(', ')}>
                                        {[...(config.recipients || []), ...(config.recipient_groups?.map(gid => `קבוצה: ${userGroups.find(g=>g.id===gid)?.name || gid}`) || [])].join(', ').substring(0,30)}
                                        {[...(config.recipients || []), ...(config.recipient_groups?.map(gid => `קבוצה: ${userGroups.find(g=>g.id===gid)?.name || gid}`) || [])].join(', ').length > 30 ? '...' : ''}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <FilterIcon className="w-4 h-4 ml-2 text-neutral-500" />
                                    <strong>מסננים:</strong> <span className="mr-1 text-xs bg-neutral-100 p-1 rounded truncate" title={JSON.stringify(config.filters)}>{Object.keys(config.filters || {}).length > 0 ? `${Object.keys(config.filters).length} מסננים פעילים` : "ללא מסננים"}</span>
                                </div>
                                <div className="flex items-center">
                                    <strong>סטטוס:</strong> 
                                    <span className={`mr-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {config.is_active ? "פעיל" : "לא פעיל"}
                                    </span>
                                </div>
                                {config.last_run_timestamp && (
                                    <div className="text-xs text-neutral-400 pt-2 border-t mt-2">
                                        הרצה אחרונה: {new Date(config.last_run_timestamp).toLocaleString('he-IL')} ({config.last_run_status})
                                        {config.last_run_status === 'failed' && <p className="text-red-400">שגיאה: {config.last_run_error}</p>}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
                <DialogContent className="sm:max-w-[700px] clay-card" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl text-primary-700">{editingConfig ? 'עריכת' : 'הוספת'} הגדרת דוח אוטומטי</DialogTitle>
                        <DialogDescription>
                            הגדר את הפרטים עבור הפקת דוח אוטומטי ושליחתו במייל.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                        <div>
                            <label htmlFor="report_name" className="block text-sm font-medium mb-1">שם הדוח <span className="text-red-500">*</span></label>
                            <Input id="report_name" name="report_name" value={currentConfig.report_name} onChange={handleInputChange} className="clay-input" required />
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium mb-1">תיאור</label>
                            <Textarea id="description" name="description" value={currentConfig.description} onChange={handleInputChange} className="clay-input h-20" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="entity_type" className="block text-sm font-medium mb-1">סוג ישות לדוח</label>
                                <Select name="entity_type" value={currentConfig.entity_type} onValueChange={(val) => handleSelectChange("entity_type", val)}>
                                    <SelectTrigger className="clay-input"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {entityTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label htmlFor="output_format" className="block text-sm font-medium mb-1">פורמט פלט</label>
                                <Select name="output_format" value={currentConfig.output_format} onValueChange={(val) => handleSelectChange("output_format", val)}>
                                    <SelectTrigger className="clay-input"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="csv">CSV</SelectItem>
                                        <SelectItem value="pdf_summary">סיכום PDF</SelectItem>
                                        <SelectItem value="json">JSON</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Filter Mode Selection */}
                        <div>
                            <label className="block text-sm font-medium mb-1">מצב הגדרת מסננים</label>
                            <div className="flex gap-4">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="filter_mode"
                                        value="simple"
                                        checked={currentConfig.filter_mode === 'simple'}
                                        onChange={() => setCurrentConfig(prev => ({ ...prev, filter_mode: 'simple' }))}
                                        className="ml-2"
                                    />
                                    <span>מסננים פשוטים</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="filter_mode"
                                        value="advanced"
                                        checked={currentConfig.filter_mode === 'advanced'}
                                        onChange={() => setCurrentConfig(prev => ({ ...prev, filter_mode: 'advanced' }))}
                                        className="ml-2"
                                    />
                                    <span>מסננים מתקדמים (JSON)</span>
                                </label>
                            </div>
                        </div>
                        
                        {/* Simple Filters - for Incident entity type */}
                        {currentConfig.filter_mode === 'simple' && currentConfig.entity_type === 'Incident' && (
                            <fieldset className="clay-card bg-neutral-50 p-4 rounded-lg">
                                <legend className="text-md font-semibold mb-2 text-neutral-700">מסננים פשוטים (אירועים)</legend>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="simple_filters.status" className="block text-sm font-medium mb-1">סטטוס</label>
                                        <Select name="simple_filters.status" value={currentConfig.simple_filters.status} onValueChange={(val) => handleSelectChange("simple_filters.status", val)}>
                                            <SelectTrigger className="clay-input"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">כל הסטטוסים</SelectItem>
                                                <SelectItem value="open">פתוח</SelectItem>
                                                <SelectItem value="in_progress">בטיפול</SelectItem>
                                                <SelectItem value="closed">סגור</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label htmlFor="simple_filters.category" className="block text-sm font-medium mb-1">קטגוריה</label>
                                        <Select name="simple_filters.category" value={currentConfig.simple_filters.category} onValueChange={(val) => handleSelectChange("simple_filters.category", val)}>
                                            <SelectTrigger className="clay-input"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">כל הקטגוריות</SelectItem>
                                                {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {currentConfig.simple_filters.category !== 'all' && filteredSubcategories.length > 0 && (
                                        <div>
                                            <label htmlFor="simple_filters.sub_category" className="block text-sm font-medium mb-1">תת-קטגוריה</label>
                                            <Select name="simple_filters.sub_category" value={currentConfig.simple_filters.sub_category} onValueChange={(val) => handleSelectChange("simple_filters.sub_category", val)}>
                                                <SelectTrigger className="clay-input"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">כל תתי-הקטגוריות</SelectItem>
                                                    {filteredSubcategories.map(sub => <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <div>
                                        <label htmlFor="simple_filters.date_range" className="block text-sm font-medium mb-1">טווח תאריכים</label>
                                        <Select name="simple_filters.date_range" value={currentConfig.simple_filters.date_range} onValueChange={(val) => handleSelectChange("simple_filters.date_range", val)}>
                                            <SelectTrigger className="clay-input"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">כל הזמנים</SelectItem>
                                                <SelectItem value="last_week">שבוע אחרון</SelectItem>
                                                <SelectItem value="last_month">חודש אחרון</SelectItem>
                                                <SelectItem value="last_3_months">3 חודשים אחרונים</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </fieldset>
                        )}

                        {/* Simple Filters - for ResourceItem entity type */}
                        {currentConfig.filter_mode === 'simple' && currentConfig.entity_type === 'ResourceItem' && (
                            <fieldset className="clay-card bg-neutral-50 p-4 rounded-lg">
                                <legend className="text-md font-semibold mb-2 text-neutral-700">מסננים פשוטים (פריטי משאב)</legend>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="simple_filters.resource_type" className="block text-sm font-medium mb-1">סוג משאב</label>
                                        <Select name="simple_filters.resource_type" value={currentConfig.simple_filters.resource_type} onValueChange={(val) => handleSelectChange("simple_filters.resource_type", val)}>
                                            <SelectTrigger className="clay-input"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">כל סוגי המשאבים</SelectItem>
                                                {resourceTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {/* Add status filter for ResourceItem if needed */}
                                    <div>
                                        <label htmlFor="simple_filters.date_range" className="block text-sm font-medium mb-1">טווח תאריכי יצירה</label>
                                        <Select name="simple_filters.date_range" value={currentConfig.simple_filters.date_range} onValueChange={(val) => handleSelectChange("simple_filters.date_range", val)}>
                                            <SelectTrigger className="clay-input"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">כל הזמנים</SelectItem>
                                                <SelectItem value="last_week">שבוע אחרון</SelectItem>
                                                <SelectItem value="last_month">חודש אחרון</SelectItem>
                                                <SelectItem value="last_3_months">3 חודשים אחרונים</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </fieldset>
                        )}


                        {/* Advanced Filters, Fallback message */}
                         {currentConfig.filter_mode === 'advanced' && (
                            <div>
                                <label htmlFor="filters" className="block text-sm font-medium mb-1">מסננים מתקדמים (JSON)</label>
                                <Textarea 
                                    id="filters" 
                                    name="filters" 
                                    value={typeof currentConfig.filters === 'string' ? currentConfig.filters : JSON.stringify(currentConfig.filters || {}, null, 2)} 
                                    onChange={handleAdvancedFilterChange} 
                                    className="clay-input h-32 font-mono text-xs" 
                                    placeholder={'{\n  "status": "open",\n  "category": "some_category_id",\n  "created_date_gte": "2024-01-01"\n}'} 
                                />
                                 <p className="text-xs text-neutral-500 mt-1">הכנס אובייקט JSON. לדוגמה עבור אירועים: {"{\"status\": \"open\", \"category\": \"category_id\"}"}</p>
                            </div>
                        )}

                        {currentConfig.filter_mode === 'simple' && !['Incident', 'ResourceItem'].includes(currentConfig.entity_type) && (
                            <div className="clay-card bg-yellow-50 p-4 rounded-lg">
                                <div className="flex items-center">
                                    <Info className="w-4 h-4 ml-2 text-yellow-600" />
                                    <p className="text-sm text-yellow-700">
                                        מסננים פשוטים זמינים כרגע רק עבור אירועים ופריטי משאב. עבור סוגי ישות אחרים, השתמש במסננים מתקדמים.
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        {/* Schedule fields */}
                        <fieldset className="clay-card bg-neutral-50 p-4 rounded-lg">
                            <legend className="text-md font-semibold mb-2 text-neutral-700">תזמון</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="schedule.frequency" className="block text-sm font-medium mb-1">תדירות</label>
                                     <Select name="schedule.frequency" value={currentConfig.schedule.frequency} onValueChange={(val) => handleSelectChange("schedule.frequency", val)}>
                                        <SelectTrigger className="clay-input"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {frequencyOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div>
                                    <label htmlFor="schedule.time_of_day" className="block text-sm font-medium mb-1">שעת הפקה</label>
                                    <Input id="schedule.time_of_day" type="time" name="schedule.time_of_day" value={currentConfig.schedule.time_of_day} onChange={handleInputChange} className="clay-input" required />
                                </div>
                                {currentConfig.schedule.frequency === 'weekly' && (
                                    <div>
                                        <label htmlFor="schedule.day_of_week" className="block text-sm font-medium mb-1">יום בשבוע</label>
                                        <Select name="schedule.day_of_week" value={currentConfig.schedule.day_of_week} onValueChange={(val) => handleSelectChange("schedule.day_of_week", val)}>
                                            <SelectTrigger className="clay-input"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {dayOfWeekOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                {currentConfig.schedule.frequency === 'monthly' && (
                                    <div>
                                        <label htmlFor="schedule.day_of_month" className="block text-sm font-medium mb-1">יום בחודש (1-31)</label>
                                        <Input id="schedule.day_of_month" type="number" name="schedule.day_of_month" min="1" max="31" value={currentConfig.schedule.day_of_month} onChange={handleInputChange} className="clay-input" />
                                    </div>
                                )}
                            </div>
                        </fieldset>

                        {/* Recipients */}
                        <fieldset className="clay-card bg-neutral-50 p-4 rounded-lg">
                            <legend className="text-md font-semibold mb-2 text-neutral-700">נמענים <span className="text-red-500">*</span></legend>
                            <div>
                                <label htmlFor="recipients" className="block text-sm font-medium mb-1">אימיילים (מופרדים בפסיק)</label>
                                <Input 
                                    id="recipients" 
                                    name="recipients" 
                                    type="text" 
                                    value={Array.isArray(currentConfig.recipients) ? currentConfig.recipients.join(', ') : ''} 
                                    onChange={handleRecipientEmailsChange} 
                                    className="clay-input" 
                                    placeholder="email1@example.com, email2@example.com" 
                                />
                            </div>
                            <div className="mt-3">
                                <label className="block text-sm font-medium mb-1">קבוצות משתמשים</label>
                                {userGroups.map(group => (
                                    <div key={group.id} className="flex items-center mt-1">
                                        <Checkbox
                                            id={`group-${group.id}`}
                                            checked={currentConfig.recipient_groups.includes(group.id)}
                                            onCheckedChange={() => handleRecipientGroupsChange(group.id)}
                                            className="ml-2"
                                        />
                                        <label htmlFor={`group-${group.id}`} className="text-sm">{group.name}</label>
                                    </div>
                                ))}
                                {userGroups.length === 0 && <p className="text-xs text-neutral-500">אין קבוצות משתמשים מוגדרות במערכת.</p>}
                            </div>
                        </fieldset>

                        {/* is_active checkbox */}
                         <div className="flex items-center space-x-2">
                            <Checkbox id="is_active" name="is_active" checked={currentConfig.is_active} onCheckedChange={(checked) => handleSelectChange('is_active', !!checked)} />
                            <label htmlFor="is_active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                הגדרה פעילה
                            </label>
                        </div>
                    </form>
                    <DialogFooter className="pt-6">
                        <Button type="button" variant="outline" className="clay-button" onClick={() => setShowFormModal(false)}>ביטול</Button>
                        <Button type="submit" form="automatedReportForm" onClick={handleSubmit} className="clay-button bg-primary-600 hover:bg-primary-700 text-white" disabled={loading}>
                            {loading ? "שומר..." : (editingConfig ? "שמור שינויים" : "צור הגדרה")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
