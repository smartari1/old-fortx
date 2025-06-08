import React, { useState, useEffect, useMemo } from 'react';
import { Resource } from '@/api/entities';
import { ResourceItem } from '@/api/entities';
import { User } from '@/api/entities'; // For identifying current user
import { 
  Box, 
  Plus, 
  Edit2, 
  Trash2, 
  List, 
  CheckCircle, 
  AlertTriangle, 
  Wrench,
  Archive, 
  Search, 
  ChevronDown, 
  ChevronUp,
  Package, // Icon for Resource Types
  Puzzle, // Icon for Resource Items
  Eye,
  Settings2,
  History,
  MapPin,
  Users as UserIcon // For user related logs
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Keep for ItemDetailModal internal tabs
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Standalone utility for rendering status badges
const renderStatusBadge = (status) => {
  let colorClass = "bg-gray-100 text-gray-800"; // Default
  if (!status) return <Badge className={colorClass}>לא ידוע</Badge>;

  switch (status.toLowerCase()) {
    case "תקין":
      colorClass = "bg-green-100 text-green-800";
      break;
    case "דרוש בדיקה":
      colorClass = "bg-yellow-100 text-yellow-800";
      break;
    case "דרוש תיקון":
    case "בתיקון":
    case "מושבת":
    case "אבד/נגנב":
      colorClass = "bg-red-100 text-red-800";
      break;
    default:
      // Fallback for statuses that might not be explicitly handled
      if (status.includes("תיקון") || status.includes("מושבת") || status.includes("אבד")) {
         colorClass = "bg-red-100 text-red-800";
      } else if (status.includes("בדיקה")) {
         colorClass = "bg-yellow-100 text-yellow-800";
      }
      break;
  }
  return <Badge className={`${colorClass} font-medium py-1 px-2.5`}>{status}</Badge>;
};


const ResourceTypeForm = ({ type, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState(type || { name: '', notes: '', maintenance_frequency: 'אין', maintenance_contact: { name: '', phone: '', contact_method: 'email', contact_details: '' } });

  useEffect(() => {
    // Update form data if 'type' prop changes (e.g., when switching to edit a different type)
    setFormData(type || { name: '', notes: '', maintenance_frequency: 'אין', maintenance_contact: { name: '', phone: '', contact_method: 'email', contact_details: '' } });
  }, [type]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('maintenance_contact.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({ ...prev, maintenance_contact: { ...prev.maintenance_contact, [field]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-1">
      <div>
        <label className="block text-sm font-medium mb-1 text-neutral-700">שם סוג המשאב *</label>
        <Input name="name" value={formData.name} onChange={handleChange} required placeholder="לדוגמה: מצלמת גוף" className="clay-input"/>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-neutral-700">הערות</label>
        <Textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="תיאור קצר או הערות נוספות..." className="clay-textarea"/>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-neutral-700">תדירות תחזוקה</label>
        <Select name="maintenance_frequency" value={formData.maintenance_frequency} onValueChange={(val) => setFormData(prev => ({...prev, maintenance_frequency: val}))}>
          <SelectTrigger className="clay-select"><SelectValue placeholder="בחר תדירות" /></SelectTrigger>
          <SelectContent>
            {["אין", "יומי", "שבועי", "חודשי", "רבעוני", "חצי שנתי", "שנתי", "לפי דרישה"].map(freq => (
              <SelectItem key={freq} value={freq}>{freq}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <fieldset className="border p-3 rounded-xl clay-card bg-neutral-50 !shadow-sm">
        <legend className="text-sm font-medium px-1 text-neutral-700">פרטי גורם מתחזק</legend>
        <div className="space-y-3 mt-2">
          <Input name="maintenance_contact.name" value={formData.maintenance_contact.name || ''} onChange={handleChange} placeholder="שם הגורם/איש קשר" className="clay-input"/>
          <Input name="maintenance_contact.phone" value={formData.maintenance_contact.phone || ''} onChange={handleChange} placeholder="טלפון" className="clay-input"/>
          <Select name="maintenance_contact.contact_method" value={formData.maintenance_contact.contact_method || 'email'} onValueChange={(val) => setFormData(prev => ({...prev, maintenance_contact: {...prev.maintenance_contact, contact_method: val}}))}>
            <SelectTrigger className="clay-select"><SelectValue placeholder="דרך יצירת קשר" /></SelectTrigger>
            <SelectContent>
              {["email", "phone", "form", "api_call", "other"].map(method => (
                <SelectItem key={method} value={method}>{method === 'email' ? 'אימייל' : method === 'phone' ? 'טלפון' : method === 'form' ? 'טופס' : method === 'api_call' ? 'קריאת API' : 'אחר'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input name="maintenance_contact.contact_details" value={formData.maintenance_contact.contact_details || ''} onChange={handleChange} placeholder="פרטי יצירת קשר (מייל, ID טופס וכו')" className="clay-input"/>
        </div>
      </fieldset>
      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" onClick={onCancel} className="clay-button">ביטול</Button>
        <Button type="submit" className="clay-button bg-primary-100 text-primary-700 border-primary-200">{type?.id ? 'עדכן סוג משאב' : 'צור סוג משאב'}</Button>
      </DialogFooter>
    </form>
  );
};

const ResourceItemForm = ({ item, resourceTypes, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState(item || { resource_type_id: '', item_identifier: '', site: '', specific_location_description: '', is_mobile: false, notes: '', status: 'תקין', last_inspection_date: null, next_inspection_date: null });

  useEffect(() => {
    setFormData(item || { resource_type_id: '', item_identifier: '', site: '', specific_location_description: '', is_mobile: false, notes: '', status: 'תקין', last_inspection_date: null, next_inspection_date: null });
  }, [item]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };
  
  const handleSelectChange = (name, value) => {
     setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Basic validation
    if (!formData.resource_type_id || !formData.item_identifier || !formData.site || !formData.status) {
        alert("נא למלא את כל שדות החובה (*).");
        return;
    }
    onSubmit(formData);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-1">
      <div>
        <label className="block text-sm font-medium mb-1 text-neutral-700">סוג המשאב *</label>
        <Select name="resource_type_id" value={formData.resource_type_id} onValueChange={(val) => handleSelectChange('resource_type_id', val)} required>
          <SelectTrigger className="clay-select"><SelectValue placeholder="בחר סוג משאב" /></SelectTrigger>
          <SelectContent>
            {resourceTypes.map(rt => (
              <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-neutral-700">מזהה פריט (מס' סידורי/תג) *</label>
        <Input name="item_identifier" value={formData.item_identifier} onChange={handleChange} required className="clay-input"/>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-neutral-700">אתר ראשי *</label>
        <Input name="site" value={formData.site} onChange={handleChange} required placeholder="לדוגמה: מטה ראשי, סניף צפון" className="clay-input"/>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-neutral-700">מיקום ספציפי / תיאור לפריט נייד</label>
        <Input name="specific_location_description" value={formData.specific_location_description} onChange={handleChange} placeholder="לדוגמה: חדר שרתים, ארון 3 / רכב סיור 101" className="clay-input"/>
      </div>
      <div className="flex items-center">
        <input type="checkbox" id="is_mobile" name="is_mobile" checked={formData.is_mobile} onChange={handleChange} className="ml-2 h-4 w-4 rounded text-primary-600 focus:ring-primary-500 border-neutral-300"/>
        <label htmlFor="is_mobile" className="text-sm font-medium text-neutral-700">האם הפריט נייד?</label>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-neutral-700">הערות</label>
        <Textarea name="notes" value={formData.notes} onChange={handleChange} className="clay-textarea"/>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-neutral-700">סטטוס *</label>
        <Select name="status" value={formData.status} onValueChange={(val) => handleSelectChange('status', val)} required>
          <SelectTrigger className="clay-select"><SelectValue placeholder="בחר סטטוס" /></SelectTrigger>
          <SelectContent>
            {["תקין", "דרוש בדיקה", "דרוש תיקון", "בתיקון", "מושבת", "אבד/נגנב"].map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label className="block text-sm font-medium mb-1 text-neutral-700">תאריך בדיקה/טיפול אחרון</label>
            <Input type="date" name="last_inspection_date" value={formData.last_inspection_date || ''} onChange={handleChange} className="clay-input"/>
        </div>
        <div>
            <label className="block text-sm font-medium mb-1 text-neutral-700">תאריך בדיקה/טיפול הבא</label>
            <Input type="date" name="next_inspection_date" value={formData.next_inspection_date || ''} onChange={handleChange} className="clay-input"/>
        </div>
      </div>
      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" onClick={onCancel} className="clay-button">ביטול</Button>
        <Button type="submit" className="clay-button bg-primary-100 text-primary-700 border-primary-200">{item?.id ? 'עדכן פריט' : 'צור פריט'}</Button>
      </DialogFooter>
    </form>
  );
};

const ResourceItemDetailModal = ({ item, resourceType, onClose, onUpdateItem }) => {
  const [activeTab, setActiveTab] = useState("details");
  const [showLogForm, setShowLogForm] = useState(null); // 'maintenance', 'status_update', 'usage'
  const [logFormData, setLogFormData] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    User.me().then(setCurrentUser).catch(console.error);
  }, []);
  
  if (!item || !resourceType) return null;

  const handleLogSubmit = async () => {
    if (!currentUser) {
        alert("חובה להיות מחובר כדי לשמור רישום.");
        return;
    }
    const logEntryBase = { 
      timestamp: new Date().toISOString(), 
      updated_by_user_id: currentUser.id, // Use ID
    };

    let updatedItemData = { ...item }; // This will be the data sent to ResourceItem.update

    if (showLogForm === 'maintenance') {
      const newLog = { ...logEntryBase, ...logFormData, serviced_by_user_id: logFormData.serviced_by_user_id || currentUser.id };
      updatedItemData.maintenance_log = [...(item.maintenance_log || []), newLog];
      if (logFormData.status_after_service) {
        updatedItemData.status = logFormData.status_after_service;
        updatedItemData.status_update_log = [...(item.status_update_log || []), {
          ...logEntryBase,
          previous_status: item.status,
          new_status: logFormData.status_after_service,
          notes: `סטטוס עודכן לאחר טיפול: ${logFormData.service_details || ''}`.trim()
        }];
      }
       if(logFormData.next_inspection_date_after_service) {
        updatedItemData.next_inspection_date = logFormData.next_inspection_date_after_service;
      }
      updatedItemData.last_inspection_date = new Date().toISOString().split('T')[0]; // Set last inspection to today

    } else if (showLogForm === 'status_update') {
      if (!logFormData.new_status) {
        alert("חובה לבחור סטטוס חדש.");
        return;
      }
      const newLog = { ...logEntryBase, previous_status: item.status, ...logFormData };
      updatedItemData.status_update_log = [...(item.status_update_log || []), newLog];
      updatedItemData.status = logFormData.new_status;
    } else if (showLogForm === 'usage') {
       if (!logFormData.usage_timestamp_start || !logFormData.user_id_for_usage) {
        alert("חובה למלא תחילת שימוש ומשתמש.");
        return;
      }
      const newLog = { ...logEntryBase, user_id: logFormData.user_id_for_usage, ...logFormData };
      updatedItemData.usage_log = [...(item.usage_log || []), newLog];
    }
    
    try {
      // Ensure we only send properties defined in the entity schema
      const { id, created_date, updated_date, created_by, ...payload } = updatedItemData;
      const cleanPayload = Object.keys(payload).reduce((acc, key) => {
        if (ResourceItem.schema().properties.hasOwnProperty(key)) {
           acc[key] = payload[key];
        }
        return acc;
      }, {});

      const updatedItem = await ResourceItem.update(item.id, cleanPayload);
      onUpdateItem(updatedItem); // Update parent state
      setShowLogForm(null);
      setLogFormData({});
    } catch (error) {
      console.error(`שגיאה בהוספת לוג ${showLogForm}:`, error);
      alert(`שגיאה בהוספת לוג ${showLogForm}. בדוק את הקונסול לפרטים.`);
    }
  };
  
  const LogEntryCard = ({ log, type }) => {
    let title = '';
    let details = [];
    let icon = <History className="w-4 h-4 text-gray-500"/>;

    if (type === 'status_update') {
      title = `עדכון סטטוס ל: ${renderStatusBadge(log.new_status).props.children}`;
      icon = <Settings2 className="w-4 h-4 text-blue-500"/>;
      details.push(`מסטטוס קודם: ${renderStatusBadge(log.previous_status).props.children}`);
      if(log.notes) details.push(`הערות: ${log.notes}`);
    } else if (type === 'maintenance') {
      title = `טיפול תחזוקה`;
      icon = <Wrench className="w-4 h-4 text-green-500"/>;
      if(log.service_details) details.push(`פירוט: ${log.service_details}`);
      if(log.status_after_service) details.push(<>סטטוס לאחר טיפול: {renderStatusBadge(log.status_after_service)}</>);
      if(log.serviced_by_user_id && log.serviced_by_user_id !== currentUser?.id) details.push(`טופל ע"י: ${log.serviced_by_user_id}`); // Consider fetching name
      else if (log.serviced_by_user_id === currentUser?.id) details.push(`טופל על ידך`);
      else if(log.serviced_by_external) details.push(`טופל ע"י (חיצוני): ${log.serviced_by_external}`);
      if(log.cost) details.push(`עלות: ${log.cost} ש"ח`);
      if(log.related_document_url) details.push(<a href={log.related_document_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">מסמך קשור</a>);
      if(log.notes) details.push(`הערות נוספות: ${log.notes}`);
    } else if (type === 'usage') {
      title = `רישום שימוש`;
      icon = <UserIcon className="w-4 h-4 text-purple-500"/>;
      details.push(`משתמש: ${log.user_id}`); // Consider fetching name
      if(log.shift_id) details.push(`משמרת: ${log.shift_id}`); // Consider fetching shift details
      details.push(`תחילת שימוש: ${new Date(log.usage_timestamp_start).toLocaleString('he-IL')}`);
      if(log.usage_timestamp_end) details.push(`סיום שימוש: ${new Date(log.usage_timestamp_end).toLocaleString('he-IL')}`);
      if(log.notes) details.push(`הערות: ${log.notes}`);
    }
    
    return (
      <Card className="mb-3 clay-card bg-white !shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 !p-3">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          <div className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString('he-IL')}</div>
        </CardHeader>
        <CardContent className="!p-3 text-xs space-y-0.5">
          {details.map((d, i) => <div key={i}>{d}</div>)}
          {log.updated_by_user_id && <p className="text-gray-400 text-xs mt-1">עודכן ע"י: {log.updated_by_user_id === currentUser?.id ? 'אתה' : log.updated_by_user_id}</p>} {/* Fetch name if not current user */}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] clay-card">
        <DialogHeader className="pb-4 mb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-primary-700">
            <Puzzle className="w-6 h-6 text-primary-500"/>
            פרטי פריט: {item.item_identifier} ({resourceType.name})
          </DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-0">
          <TabsList className="grid w-full grid-cols-4 clay-card !p-1 bg-neutral-100 !mb-4">
            <TabsTrigger value="details" className="data-[state=active]:bg-white data-[state=active]:shadow-md">פרטים</TabsTrigger>
            <TabsTrigger value="status_log" className="data-[state=active]:bg-white data-[state=active]:shadow-md">לוג סטטוסים</TabsTrigger>
            <TabsTrigger value="maintenance_log" className="data-[state=active]:bg-white data-[state=active]:shadow-md">לוג תחזוקה</TabsTrigger>
            <TabsTrigger value="usage_log" className="data-[state=active]:bg-white data-[state=active]:shadow-md">לוג שימוש</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="mt-2 space-y-4">
            <Card className="clay-card bg-white !shadow-sm">
              <CardContent className="!pt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><strong>סוג משאב:</strong> {resourceType.name}</div>
                <div><strong>מזהה פריט:</strong> {item.item_identifier}</div>
                <div><strong>אתר:</strong> {item.site}</div>
                <div><strong>מיקום ספציפי:</strong> {item.specific_location_description || "-"}</div>
                <div><strong>נייד:</strong> {item.is_mobile ? "כן" : "לא"}</div>
                <div className="flex items-center gap-2"><strong>סטטוס:</strong> {renderStatusBadge(item.status)}</div>
                <div><strong>בדיקה אחרונה:</strong> {item.last_inspection_date ? new Date(item.last_inspection_date).toLocaleDateString('he-IL') : "-"}</div>
                <div><strong>בדיקה הבאה:</strong> {item.next_inspection_date ? new Date(item.next_inspection_date).toLocaleDateString('he-IL') : "-"}</div>
                <div className="col-span-full"><strong>הערות פריט:</strong> {item.notes || "-"}</div>
              </CardContent>
            </Card>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => {setLogFormData({new_status: item.status}); setShowLogForm('status_update')}} className="clay-button">עדכון סטטוס</Button>
              <Button variant="outline" size="sm" onClick={() => {setLogFormData({}); setShowLogForm('maintenance')}} className="clay-button">רישום תחזוקה</Button>
              <Button variant="outline" size="sm" onClick={() => {setLogFormData({user_id_for_usage: currentUser?.id, usage_timestamp_start: new Date().toISOString().slice(0,16) }); setShowLogForm('usage')}} className="clay-button">רישום שימוש</Button>
            </div>
          </TabsContent>
          <TabsContent value="status_log" className="mt-1 max-h-96 overflow-y-auto p-1">
            {(item.status_update_log || []).slice().reverse().map((log, idx) => <LogEntryCard key={idx} log={log} type="status_update"/>)}
            {(!item.status_update_log || item.status_update_log.length === 0) && <p className="text-center text-sm text-gray-500 py-4">אין עדכוני סטטוס.</p>}
          </TabsContent>
          <TabsContent value="maintenance_log" className="mt-1 max-h-96 overflow-y-auto p-1">
            {(item.maintenance_log || []).slice().reverse().map((log, idx) => <LogEntryCard key={idx} log={log} type="maintenance"/>)}
            {(!item.maintenance_log || item.maintenance_log.length === 0) && <p className="text-center text-sm text-gray-500 py-4">אין רישומי תחזוקה.</p>}
          </TabsContent>
          <TabsContent value="usage_log" className="mt-1 max-h-96 overflow-y-auto p-1">
            {(item.usage_log || []).slice().reverse().map((log, idx) => <LogEntryCard key={idx} log={log} type="usage"/>)}
            {(!item.usage_log || item.usage_log.length === 0) && <p className="text-center text-sm text-gray-500 py-4">אין רישומי שימוש.</p>}
          </TabsContent>
        </Tabs>

        {showLogForm && (
          <Dialog open={!!showLogForm} onOpenChange={() => {setShowLogForm(null); setLogFormData({});}}>
            <DialogContent className="clay-card">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-primary-700">
                  {showLogForm === 'maintenance' ? 'רישום טיפול תחזוקה' : 
                   showLogForm === 'status_update' ? 'עדכון סטטוס פריט' : 
                   'רישום שימוש בפריט'}
                </DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-3">
                {showLogForm === 'maintenance' && <>
                  <Textarea placeholder="פירוט הטיפול *" value={logFormData.service_details || ''} onChange={e => setLogFormData({...logFormData, service_details: e.target.value})} className="clay-textarea" required/>
                  <Select value={logFormData.status_after_service || ''} onValueChange={val => setLogFormData({...logFormData, status_after_service: val})}>
                    <SelectTrigger className="clay-select"><SelectValue placeholder="סטטוס לאחר טיפול"/></SelectTrigger>
                    <SelectContent>{["תקין", "דרוש בדיקה", "דרוש תיקון", "בתיקון", "מושבת"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="date" name="next_inspection_date_after_service" placeholder="תאריך בדיקה הבא (אופציונלי)" value={logFormData.next_inspection_date_after_service || ''} onChange={e => setLogFormData({...logFormData, next_inspection_date_after_service: e.target.value})} className="clay-input"/>
                  <Input type="number" placeholder="עלות (אופציונלי)" value={logFormData.cost || ''} onChange={e => setLogFormData({...logFormData, cost: parseFloat(e.target.value)})} className="clay-input"/>
                  <Input placeholder="שם גורם חיצוני (אם רלוונטי)" value={logFormData.serviced_by_external || ''} onChange={e => setLogFormData({...logFormData, serviced_by_external: e.target.value})} className="clay-input"/>
                  <Input placeholder="קישור למסמך (חשבונית, דוח טכנאי)" value={logFormData.related_document_url || ''} onChange={e => setLogFormData({...logFormData, related_document_url: e.target.value})} className="clay-input"/>
                  <Textarea placeholder="הערות נוספות" value={logFormData.notes || ''} onChange={e => setLogFormData({...logFormData, notes: e.target.value})} className="clay-textarea"/>
                </>}
                {showLogForm === 'status_update' && <>
                  <Select value={logFormData.new_status || ''} onValueChange={val => setLogFormData({...logFormData, new_status: val})} required>
                    <SelectTrigger className="clay-select"><SelectValue placeholder="סטטוס חדש *"/></SelectTrigger>
                    <SelectContent>{["תקין", "דרוש בדיקה", "דרוש תיקון", "בתיקון", "מושבת", "אבד/נגנב"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Textarea placeholder="הערות (סיבת השינוי)" value={logFormData.notes || ''} onChange={e => setLogFormData({...logFormData, notes: e.target.value})} className="clay-textarea"/>
                </>}
                {showLogForm === 'usage' && <>
                  <Input placeholder="משתמש (שם/מזהה) *" value={logFormData.user_id_for_usage || ''} onChange={e => setLogFormData({...logFormData, user_id_for_usage: e.target.value})} className="clay-input" required/>
                  <Input type="datetime-local" placeholder="תחילת שימוש *" value={logFormData.usage_timestamp_start || ''} onChange={e => setLogFormData({...logFormData, usage_timestamp_start: e.target.value})} className="clay-input" required/>
                  <Input type="datetime-local" placeholder="סיום שימוש (אופציונלי)" value={logFormData.usage_timestamp_end || ''} onChange={e => setLogFormData({...logFormData, usage_timestamp_end: e.target.value})} className="clay-input"/>
                  <Textarea placeholder="הערות לגבי השימוש" value={logFormData.notes || ''} onChange={e => setLogFormData({...logFormData, notes: e.target.value})} className="clay-textarea"/>
                </>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {setShowLogForm(null); setLogFormData({});}} className="clay-button">ביטול</Button>
                <Button onClick={handleLogSubmit} disabled={(showLogForm === 'status_update' && !logFormData.new_status) || (showLogForm === 'maintenance' && !logFormData.service_details) || (showLogForm === 'usage' && (!logFormData.user_id_for_usage || !logFormData.usage_timestamp_start))} className="clay-button bg-primary-100 text-primary-700 border-primary-200">שמור רישום</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <DialogFooter className="mt-6">
          <DialogClose asChild><Button variant="outline" className="clay-button">סגור</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function ResourcesPage() {
  const [resourceTypes, setResourceTypes] = useState([]);
  const [resourceItems, setResourceItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const [showResourceTypeForm, setShowResourceTypeForm] = useState(false);
  const [editingResourceType, setEditingResourceType] = useState(null);
  
  const [showResourceItemForm, setShowResourceItemForm] = useState(false);
  const [editingResourceItem, setEditingResourceItem] = useState(null);
  
  const [viewingResourceItemDetails, setViewingResourceItemDetails] = useState(null); // {item, resourceType}

  const [searchTermItems, setSearchTermItems] = useState("");
  const [filterTypeItems, setFilterTypeItems] = useState("all");
  const [filterStatusItems, setFilterStatusItems] = useState("all");
  
  const [expandedType, setExpandedType] = useState(null);

  useEffect(() => {
    fetchData();
    User.me().then(setCurrentUser).catch(console.error);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const types = await Resource.list('-created_date');
      const items = await ResourceItem.list('-created_date');
      setResourceTypes(types);
      setResourceItems(items);
    } catch (error) {
      console.error("Error fetching resources:", error);
      // Consider adding user-friendly error display here
    }
    setLoading(false);
  };

  const handleResourceTypeSubmit = async (typeData) => {
    try {
      if (editingResourceType) {
        await Resource.update(editingResourceType.id, typeData);
      } else {
        await Resource.create(typeData);
      }
      fetchData(); 
      setShowResourceTypeForm(false);
      setEditingResourceType(null);
    } catch (error) {
      console.error("Error saving resource type:", error);
      alert("שגיאה בשמירת סוג המשאב.");
    }
  };

  const handleDeleteResourceType = async (typeId) => {
    const itemsOfType = resourceItems.filter(item => item.resource_type_id === typeId);
    if (itemsOfType.length > 0) {
      alert("לא ניתן למחוק סוג משאב שיש לו פריטים משויכים. מחק או שנה את הפריטים תחילה.");
      return;
    }
    if (window.confirm("האם אתה בטוח שברצונך למחוק סוג משאב זה?")) {
      try {
        await Resource.delete(typeId);
        fetchData();
      } catch (error) {
        console.error("Error deleting resource type:", error);
        alert("שגיאה במחיקת סוג המשאב.");
      }
    }
  };
  
  const handleResourceItemSubmit = async (itemData) => {
    try {
      if (editingResourceItem) {
        await ResourceItem.update(editingResourceItem.id, itemData);
      } else {
        await ResourceItem.create(itemData);
      }
      fetchData(); 
      setShowResourceItemForm(false);
      setEditingResourceItem(null);
    } catch (error) {
      console.error("Error saving resource item:", error);
      alert("שגיאה בשמירת פריט המשאב.");
    }
  };

  const handleDeleteResourceItem = async (itemId) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק פריט משאב זה?")) {
      try {
        await ResourceItem.delete(itemId);
        fetchData(); 
      } catch (error) {
        console.error("Error deleting resource item:", error);
        alert("שגיאה במחיקת פריט המשאב.");
      }
    }
  };
  
  const handleUpdateItemInList = (updatedItem) => {
    setResourceItems(prevItems => prevItems.map(item => item.id === updatedItem.id ? updatedItem : item));
    if (viewingResourceItemDetails && viewingResourceItemDetails.item.id === updatedItem.id) {
      // If detail modal is open for this item, update its content
      const resourceType = resourceTypes.find(rt => rt.id === updatedItem.resource_type_id);
      setViewingResourceItemDetails({item: updatedItem, resourceType });
    }
  };

  const filteredResourceItems = useMemo(() => {
    return resourceItems.filter(item => {
      const typeMatch = filterTypeItems === "all" || item.resource_type_id === filterTypeItems;
      const statusMatch = filterStatusItems === "all" || item.status === filterStatusItems;
      const searchMatch = !searchTermItems || 
                          item.item_identifier?.toLowerCase().includes(searchTermItems.toLowerCase()) ||
                          item.site?.toLowerCase().includes(searchTermItems.toLowerCase()) ||
                          item.specific_location_description?.toLowerCase().includes(searchTermItems.toLowerCase()) ||
                          resourceTypes.find(rt=>rt.id === item.resource_type_id)?.name.toLowerCase().includes(searchTermItems.toLowerCase());
      return typeMatch && statusMatch && searchMatch;
    });
  }, [resourceItems, filterTypeItems, filterStatusItems, searchTermItems, resourceTypes]);

  const resourceStats = useMemo(() => {
    const stats = {
      total: resourceItems.length,
      operational: 0,
      needsInspection: 0,
      needsMaintenance: 0, // "דרוש תיקון"
      inRepair: 0,
      outOfService: 0, // "מושבת"
      lostOrStolen: 0, // "אבד/נגנב"
    };
    resourceItems.forEach(item => {
      switch (item.status) {
        case "תקין": stats.operational++; break;
        case "דרוש בדיקה": stats.needsInspection++; break;
        case "דרוש תיקון": stats.needsMaintenance++; break;
        case "בתיקון": stats.inRepair++; break;
        case "מושבת": stats.outOfService++; break;
        case "אבד/נגנב": stats.lostOrStolen++; break;
        default: break;
      }
    });
    return stats;
  }, [resourceItems]);

  if (loading && !resourceTypes.length && !resourceItems.length) { // Show loader only on initial full load
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center text-neutral-800">
          <Box className="w-8 h-8 mr-3 text-primary-500" />
          ניהול משאבים
        </h1>
        <p className="text-neutral-600">מעקב אחר משאבים ארגוניים, תחזוקה וסטטוס.</p>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card className="clay-card"><CardHeader className="pb-2 pt-3"><CardTitle className="text-sm font-medium text-neutral-600">סה"כ פריטים</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-primary-700">{resourceStats.total}</div></CardContent></Card>
        <Card className="clay-card bg-green-50 border-green-200"><CardHeader className="pb-2 pt-3"><CardTitle className="text-sm font-medium text-green-700">תקינים</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-700">{resourceStats.operational}</div></CardContent></Card>
        <Card className="clay-card bg-yellow-50 border-yellow-200"><CardHeader className="pb-2 pt-3"><CardTitle className="text-sm font-medium text-yellow-700">דרוש בדיקה</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-700">{resourceStats.needsInspection}</div></CardContent></Card>
        <Card className="clay-card bg-red-50 border-red-200"><CardHeader className="pb-2 pt-3"><CardTitle className="text-sm font-medium text-red-700">דרוש תיקון</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-700">{resourceStats.needsMaintenance}</div></CardContent></Card>
        <Card className="clay-card bg-orange-50 border-orange-200"><CardHeader className="pb-2 pt-3"><CardTitle className="text-sm font-medium text-orange-700">בתיקון</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-orange-700">{resourceStats.inRepair}</div></CardContent></Card>
        <Card className="clay-card bg-neutral-100 border-neutral-300"><CardHeader className="pb-2 pt-3"><CardTitle className="text-sm font-medium text-neutral-700">מושבת/אבוד</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-neutral-700">{resourceStats.outOfService + resourceStats.lostOrStolen}</div></CardContent></Card>
      </div>

      {/* Section 1: Resource Types */}
      <Card className="clay-card mb-8">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <CardTitle className="text-xl font-semibold text-neutral-700 flex items-center"><Package className="w-5 h-5 mr-2 text-primary-500"/>ניהול סוגי משאבים</CardTitle>
            <CardDescription className="mt-1">הגדרת קטגוריות כלליות של משאבים ותכונות התחזוקה שלהם.</CardDescription>
          </div>
          <Button onClick={() => { setEditingResourceType(null); setShowResourceTypeForm(true); }} className="clay-button bg-primary-100 text-primary-700 border-primary-200 flex items-center gap-1">
            <Plus className="w-4 h-4" /> הוסף סוג משאב
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 mt-2">
          {resourceTypes.length === 0 && !loading && <p className="text-center text-neutral-500 py-4">לא הוגדרו סוגי משאבים.</p>}
          {loading && resourceTypes.length === 0 && <p className="text-center text-neutral-500 py-4">טוען סוגי משאבים...</p>}
          {resourceTypes.map(type => (
            <Card key={type.id} className="clay-card bg-white !shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row justify-between items-start !p-4">
                <div>
                  <CardTitle className="text-lg text-neutral-700">{type.name}</CardTitle>
                  <CardDescription className="text-sm">{type.notes || "אין הערות נוספות."}</CardDescription>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="outline" size="icon" onClick={() => setExpandedType(expandedType === type.id ? null : type.id)} className="clay-button p-2">
                    {expandedType === type.id ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => { setEditingResourceType(type); setShowResourceTypeForm(true); }} className="clay-button p-2 bg-blue-50 text-blue-600 hover:bg-blue-100"> <Edit2 className="w-4 h-4"/> </Button>
                  <Button variant="destructiveOutline" size="icon" onClick={() => handleDeleteResourceType(type.id)} className="clay-button p-2 bg-red-50 text-red-600 hover:bg-red-100"> <Trash2 className="w-4 h-4"/> </Button>
                </div>
              </CardHeader>
              {expandedType === type.id && (
                <CardContent className="!p-4 border-t text-sm space-y-1">
                  <p><strong>תדירות תחזוקה:</strong> {type.maintenance_frequency || "לא הוגדר"}</p>
                  {type.maintenance_contact && (type.maintenance_contact.name || type.maintenance_contact.phone || type.maintenance_contact.contact_method) &&
                    <>
                      <p><strong>גורם מתחזק:</strong> {type.maintenance_contact.name || "-"}</p>
                      <p><strong>טלפון:</strong> {type.maintenance_contact.phone || "-"}</p>
                      <p><strong>יצירת קשר:</strong> {type.maintenance_contact.contact_method || "-"} ({type.maintenance_contact.contact_details || "-"})</p>
                    </>
                  }
                  {!type.maintenance_contact?.name && !type.maintenance_contact?.phone && !type.maintenance_contact?.contact_method && <p className="text-neutral-500">לא הוגדרו פרטי גורם מתחזק.</p>}
                </CardContent>
              )}
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Section 2: Resource Items */}
      <Card className="clay-card">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <CardTitle className="text-xl font-semibold text-neutral-700 flex items-center"><Puzzle className="w-5 h-5 mr-2 text-primary-500"/>רשימת פריטי משאב</CardTitle>
            <CardDescription className="mt-1"> חיפוש, סינון וניהול של פריטי משאב בודדים.</CardDescription>
          </div>
          <Button onClick={() => { setEditingResourceItem(null); setShowResourceItemForm(true); }} className="clay-button bg-primary-100 text-primary-700 border-primary-200 flex items-center gap-1">
            <Plus className="w-4 h-4" /> הוסף פריט משאב
          </Button>
        </CardHeader>
        <CardContent className="mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <Input 
              placeholder="חיפוש מזהה, אתר, תיאור, סוג..." 
              value={searchTermItems} 
              onChange={(e) => setSearchTermItems(e.target.value)}
              className="clay-input"
            />
            <Select value={filterTypeItems} onValueChange={setFilterTypeItems}>
              <SelectTrigger className="clay-select"><SelectValue placeholder="סנן לפי סוג משאב" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסוגים</SelectItem>
                {resourceTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatusItems} onValueChange={setFilterStatusItems}>
              <SelectTrigger className="clay-select"><SelectValue placeholder="סנן לפי סטטוס" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                {["תקין", "דרוש בדיקה", "דרוש תיקון", "בתיקון", "מושבת", "אבד/נגנב"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="p-3 text-right font-medium text-neutral-600">מזהה פריט</th>
                  <th className="p-3 text-right font-medium text-neutral-600">סוג משאב</th>
                  <th className="p-3 text-right font-medium text-neutral-600">אתר</th>
                  <th className="p-3 text-right font-medium text-neutral-600">סטטוס</th>
                  <th className="p-3 text-right font-medium text-neutral-600">בדיקה הבאה</th>
                  <th className="p-3 text-center font-medium text-neutral-600">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading && filteredResourceItems.length === 0 && <tr><td colSpan="6" className="text-center p-4 text-neutral-500">טוען פריטי משאב...</td></tr>}
                {!loading && filteredResourceItems.length === 0 && (
                    <tr><td colSpan="6" className="text-center p-8 text-neutral-500">
                        <Puzzle className="w-12 h-12 mx-auto mb-2 text-neutral-400"/>
                        לא נמצאו פריטי משאב התואמים לסינון.
                    </td></tr>
                )}
                {filteredResourceItems.map(item => {
                  const type = resourceTypes.find(rt => rt.id === item.resource_type_id);
                  return (
                    <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="p-3 text-neutral-700 font-medium">{item.item_identifier}</td>
                      <td className="p-3 text-neutral-600">{type?.name || 'לא ידוע'}</td>
                      <td className="p-3 text-neutral-600">{item.site}</td>
                      <td className="p-3">{renderStatusBadge(item.status)}</td>
                      <td className="p-3 text-neutral-600">{item.next_inspection_date ? new Date(item.next_inspection_date).toLocaleDateString('he-IL') : '-'}</td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setViewingResourceItemDetails({item, resourceType: type})} title="צפה בפרטים" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"> <Eye className="w-4 h-4"/> </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setEditingResourceItem(item); setShowResourceItemForm(true); }} title="ערוך פריט" className="text-green-600 hover:text-green-700 hover:bg-green-50"> <Edit2 className="w-4 h-4"/> </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteResourceItem(item.id)} title="מחק פריט" className="text-red-600 hover:text-red-700 hover:bg-red-50"> <Trash2 className="w-4 h-4"/> </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={showResourceTypeForm} onOpenChange={(isOpen) => { if(!isOpen) { setEditingResourceType(null); } setShowResourceTypeForm(isOpen);}}>
        <DialogContent className="clay-card">
          <DialogHeader className="pb-4 mb-4 border-b">
            <DialogTitle className="text-xl font-semibold text-primary-700">{editingResourceType ? 'ערוך סוג משאב' : 'הוסף סוג משאב חדש'}</DialogTitle>
          </DialogHeader>
          <ResourceTypeForm type={editingResourceType} onSubmit={handleResourceTypeSubmit} onCancel={() => { setShowResourceTypeForm(false); setEditingResourceType(null); }}/>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showResourceItemForm} onOpenChange={(isOpen) => { if(!isOpen) { setEditingResourceItem(null); } setShowResourceItemForm(isOpen);}}>
        <DialogContent className="clay-card">
          <DialogHeader className="pb-4 mb-4 border-b">
            <DialogTitle className="text-xl font-semibold text-primary-700">{editingResourceItem ? 'ערוך פריט משאב' : 'הוסף פריט משאב חדש'}</DialogTitle>
          </DialogHeader>
          <ResourceItemForm item={editingResourceItem} resourceTypes={resourceTypes} onSubmit={handleResourceItemSubmit} onCancel={() => { setShowResourceItemForm(false); setEditingResourceItem(null); }} />
        </DialogContent>
      </Dialog>
      
      {viewingResourceItemDetails && viewingResourceItemDetails.item && viewingResourceItemDetails.resourceType && (
          <ResourceItemDetailModal 
              item={viewingResourceItemDetails.item} 
              resourceType={viewingResourceItemDetails.resourceType} 
              onClose={() => setViewingResourceItemDetails(null)}
              onUpdateItem={handleUpdateItemInList}
          />
      )}

    </div>
  );
}