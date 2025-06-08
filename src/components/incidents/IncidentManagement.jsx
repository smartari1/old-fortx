
import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { Contact } from '@/api/entities';
import { Vehicle } from '@/api/entities';
import { Institution } from '@/api/entities';
import { ResourceItem } from '@/api/entities';
import { Procedure } from '@/api/entities';
import { FormTemplate } from '@/api/entities';
import { FormSubmission } from '@/api/entities'; // Added for saving form data related to incident
import { Incident } from '@/api/entities';
import { CustomDataType } from '@/api/entities'; // Added
import { CustomDataRecord } from '@/api/entities'; // Added
import { createPageUrl } from '@/utils';
import {
  AlertTriangle, FileText, MessageSquare, CheckSquare, Users, Clock, Tag, Info, MapPin, Car, Building,
  User as UserIcon, Box, Plus, Send, X, Paperclip, Save, BookText, ThumbsUp, Edit3, Trash2, PlayCircle, Eye,
  ClipboardList, Link2, Download, ShieldCheck, HelpCircle, Settings2, RotateCw, ChevronDown, ListFilter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import FormViewer from '@/components/forms/FormViewer';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

// Helper to format dates
const formatDate = (dateString) => {
  if (!dateString) return 'לא צוין';
  const date = new Date(dateString);
  return `${date.toLocaleDateString('he-IL')} ${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
};

export default function IncidentManagement({ incidentId, onClose, onUpdate }) {
  const [incident, setIncident] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [allResources, setAllResources] = useState([]);
  const [resourcesNearby, setResourcesNearby] = useState([]);
  const [users, setUsers] = useState([]);
  const [incidentProcedureDefinition, setIncidentProcedureDefinition] = useState(null); // Full procedure definition from Procedure entity
  const [formTemplates, setFormTemplates] = useState([]);
  const [customDataTypes, setCustomDataTypes] = useState([]); // Added
  const [customDataRecords, setCustomDataRecords] = useState([]); // Added

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Modal States ---
  const [showLogEntryModal, setShowLogEntryModal] = useState(false);
  const [showAddEntityModal, setShowAddEntityModal] = useState(false);
  const [showResourceUsageModal, setShowResourceUsageModal] = useState(false);
  const [showCloseIncidentModal, setShowCloseIncidentModal] = useState(false);
  const [showCompleteStepModal, setShowCompleteStepModal] = useState(null);
  const [showGenerateSummaryModal, setShowGenerateSummaryModal] = useState(false);
  const [showViewFormModal, setShowViewFormModal] = useState(null); // { formTemplateId, stepId (optional) }
  const [showTagCustomDataModal, setShowTagCustomDataModal] = useState(false); // For tagging custom data in logs

  // --- Form States for Modals ---
  const [newLogEntry, setNewLogEntry] = useState('');
  const [taggedEntitiesForLog, setTaggedEntitiesForLog] = useState([]);
  const [selectedEntityTypeForLog, setSelectedEntityTypeForLog] = useState('');
  const [searchEntityForLog, setSearchEntityForLog] = useState('');
  
  const [involvedEntityType, setInvolvedEntityType] = useState('');
  const [searchInvolvedEntity, setSearchInvolvedEntity] = useState('');
  const [selectedInvolvedEntityId, setSelectedInvolvedEntityId] = useState('');
  const [involvedEntityRole, setInvolvedEntityRole] = useState('involved');

  const [selectedResourceForUsage, setSelectedResourceForUsage] = useState('');
  const [resourceUsageNotes, setResourceUsageNotes] = useState('');
  
  const [stepCompletionNotes, setStepCompletionNotes] = useState('');
  const [summaryDraft, setSummaryDraft] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  
  const [notifications, setNotifications] = useState({ recipients: [], message: ''});

  // States for tagging custom data in log
  const [selectedCustomDataTypeSlugForLog, setSelectedCustomDataTypeSlugForLog] = useState('');
  const [searchCustomDataRecordForLog, setSearchCustomDataRecordForLog] = useState('');
  const [filteredCustomDataRecordsForLog, setFilteredCustomDataRecordsForLog] = useState([]);


  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const user = await User.me();
        setCurrentUser(user);

        const [
          fetchedContacts, fetchedVehicles, fetchedInstitutions, fetchedResources, 
          fetchedUsers, fetchedFormTemplates, fetchedCustomDataTypes, fetchedCustomDataRecords
        ] = await Promise.all([
          Contact.list(),
          Vehicle.list(),
          Institution.list(),
          ResourceItem.list(),
          User.list(),
          FormTemplate.list(),
          CustomDataType.list(), // Added
          CustomDataRecord.list() // Added
        ]);
        setContacts(fetchedContacts);
        setVehicles(fetchedVehicles);
        setInstitutions(fetchedInstitutions);
        setAllResources(fetchedResources);
        setUsers(fetchedUsers);
        setFormTemplates(fetchedFormTemplates);
        setCustomDataTypes(fetchedCustomDataTypes); // Added
        setCustomDataRecords(fetchedCustomDataRecords); // Added

        const fetchedIncident = await Incident.get(incidentId);
        setIncident(fetchedIncident);
        setSummaryDraft(fetchedIncident?.summary || '');

        if (fetchedIncident?.location?.latitude && fetchedIncident?.location?.longitude) {
           const nearby = fetchedResources.filter(resource => {
            if (resource.current_coordinates?.latitude && resource.current_coordinates?.longitude) {
              const distance = calculateDistance(
                fetchedIncident.location.latitude, fetchedIncident.location.longitude,
                resource.current_coordinates.latitude, resource.current_coordinates.longitude
              );
              return distance < 1000; // 1km radius
            }
            return resource.site === fetchedIncident.location?.description; // Fallback to site match
          });
          setResourcesNearby(nearby);
        } else if (fetchedIncident?.location?.description) {
             const siteMatch = fetchedResources.filter(r => r.site === fetchedIncident.location.description);
             setResourcesNearby(siteMatch);
        }

        // Fetch full procedure definition if a procedure_id is linked to the sub_category
        // This requires knowing the sub_category entity structure.
        // Assuming IncidentSubCategory entity has a `procedure_id` field.
        // For now, if incident.procedure_steps exists and seems populated, use it.
        // Otherwise, if incident.procedure_definition_id exists, fetch it.
        if (fetchedIncident.procedure_definition_id) {
            try {
                const procDef = await Procedure.get(fetchedIncident.procedure_definition_id);
                setIncidentProcedureDefinition(procDef);
                // If incident doesn't have steps or they are minimal, populate them from definition
                if (!fetchedIncident.procedure_steps || fetchedIncident.procedure_steps.length === 0 || !fetchedIncident.procedure_steps[0].title) {
                    const initialSteps = procDef.steps.map(stepDef => ({
                        step_id: stepDef.step_number?.toString() || stepDef.title.replace(/\s+/g, '-').toLowerCase(), // Ensure unique ID
                        title: stepDef.title,
                        description: stepDef.description,
                        is_required: stepDef.is_required,
                        step_type: stepDef.step_type,
                        form_id: stepDef.form_id,
                        document_url: stepDef.document_url, // Assuming document_url from Procedure entity
                        completed: false,
                        completed_at: null,
                        completed_by: null,
                        notes: '',
                        form_submission_id: null // For storing ID of submitted form data for this step
                    }));
                    // Only update if incident.procedure_steps is not already more detailed
                    const currentIncidentSteps = fetchedIncident.procedure_steps || [];
                    if (currentIncidentSteps.length < initialSteps.length || !currentIncidentSteps[0]?.title) {
                       setIncident(prev => ({...prev, procedure_steps: initialSteps}));
                    }
                }
            } catch (procError) {
                console.warn("Could not load procedure definition:", procError);
            }
        } else if (fetchedIncident.procedure_steps && fetchedIncident.procedure_steps.length > 0 && fetchedIncident.procedure_steps[0].title) {
            // If steps are already well-defined in the incident, assume they are sourced correctly.
            // Potentially fetch the procedure definition title if needed elsewhere.
        }
        
        setNotifications(prev => ({
          ...prev,
          message: `אירוע "${fetchedIncident?.title || ''}" נסגר.\nפרטים נוספים זמינים במערכת.`
        }));

      } catch (err) {
        console.error("Error fetching incident management data:", err);
        setError("שגיאה בטעינת נתוני האירוע.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [incidentId]);

  useEffect(() => {
    if(incident) {
      setSummaryDraft(incident?.summary || '');
    }
  }, [incident]);


  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; 
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getUserName = (userId) => users.find(u => u.id === userId)?.full_name || userId || "לא ידוע";

  const handleUpdate = async (updateData, silent = false) => {
    try {
      const updatedIncident = await Incident.update(incident.id, updateData);
      setIncident(updatedIncident); 
      if (onUpdate) onUpdate(updatedIncident); 
      if (!silent) console.log("Incident updated successfully", updatedIncident);
      return updatedIncident;
    } catch (err) {
      console.error("Error updating incident:", err);
      if (!silent) alert("שגיאה בעדכון האירוע: " + err.message);
      throw err; 
    }
  };

  // --- Log Entry & Tagging ---
  const handleAddLogEntry = async () => {
    if (!newLogEntry.trim() && taggedEntitiesForLog.length === 0) return;
    const log = {
      timestamp: new Date().toISOString(),
      user_id: currentUser?.id,
      content: newLogEntry,
      tagged_entities: taggedEntitiesForLog,
    };
    try {
      await handleUpdate({ logs: [...(incident.logs || []), log] });
      setNewLogEntry('');
      setTaggedEntitiesForLog([]);
      setSelectedEntityTypeForLog('');
      setSearchEntityForLog('');
      setSelectedCustomDataTypeSlugForLog('');
      setSearchCustomDataRecordForLog('');
      setShowLogEntryModal(false);
    } catch (err) { /* Error handled by handleUpdate */ }
  };

  const getEntityNameForTag = (type, id) => {
    switch (type) {
      case 'contact': return contacts.find(c => c.id === id)?.full_name || id;
      case 'vehicle': return vehicles.find(v => v.id === id)?.license_plate || id;
      case 'institution': return institutions.find(i => i.id === id)?.name || id;
      case 'resource': return allResources.find(r => r.id === id)?.item_identifier || id;
      case 'custom_data': 
        const record = customDataRecords.find(cdr => cdr.id === id);
        if (!record) return id;
        return record.data?.name || record.data?.title || record.data?.identifier || `רשומה: ${id.substring(0,6)}`;
      default: return id;
    }
  };
  
  const getFilteredEntitiesForLog = () => {
    if (!selectedEntityTypeForLog || !searchEntityForLog.trim()) return [];
    const searchLower = searchEntityForLog.toLowerCase();
    switch (selectedEntityTypeForLog) {
      case 'contact': return contacts.filter(c => c.full_name.toLowerCase().includes(searchLower));
      case 'vehicle': return vehicles.filter(v => v.license_plate.toLowerCase().includes(searchLower));
      case 'institution': return institutions.filter(i => i.name.toLowerCase().includes(searchLower));
      case 'resource': return allResources.filter(r => r.item_identifier.toLowerCase().includes(searchLower) || r.site?.toLowerCase().includes(searchLower));
      default: return [];
    }
  };

  useEffect(() => {
    if (selectedCustomDataTypeSlugForLog && searchCustomDataRecordForLog.trim()) {
        const searchLower = searchCustomDataRecordForLog.toLowerCase();
        const filtered = customDataRecords.filter(cdr => 
            cdr.custom_data_type_slug === selectedCustomDataTypeSlugForLog &&
            (
                cdr.data?.name?.toLowerCase().includes(searchLower) ||
                cdr.data?.title?.toLowerCase().includes(searchLower) ||
                cdr.data?.identifier?.toLowerCase().includes(searchLower) ||
                Object.values(cdr.data).some(val => typeof val === 'string' && val.toLowerCase().includes(searchLower))
            )
        );
        setFilteredCustomDataRecordsForLog(filtered);
    } else {
        setFilteredCustomDataRecordsForLog([]);
    }
  }, [searchCustomDataRecordForLog, selectedCustomDataTypeSlugForLog, customDataRecords]);

  // --- Involved Entity ---
  const handleAddInvolvedEntity = async () => {
    if (!involvedEntityType || !selectedInvolvedEntityId) return;
    const entity = {
      entity_type: involvedEntityType,
      entity_id: selectedInvolvedEntityId,
      role: involvedEntityRole,
    };
    if (incident.involved_entities?.some(e => e.entity_type === entity.entity_type && e.entity_id === entity.entity_id)) {
      alert("ישות זו כבר מעורבת באירוע.");
      return;
    }
    try {
      await handleUpdate({ involved_entities: [...(incident.involved_entities || []), entity] });
      setInvolvedEntityType('');
      setSelectedInvolvedEntityId('');
      setSearchInvolvedEntity('');
      setInvolvedEntityRole('involved');
      setShowAddEntityModal(false);
    } catch (err) { /* Error handled */ }
  };
  
  const getFilteredInvolvedEntities = () => {
    if (!involvedEntityType || !searchInvolvedEntity.trim()) return [];
    const searchLower = searchInvolvedEntity.toLowerCase();
    switch (involvedEntityType) {
      case 'contact': return contacts.filter(c => c.full_name.toLowerCase().includes(searchLower));
      case 'vehicle': return vehicles.filter(v => v.license_plate.toLowerCase().includes(searchLower));
      case 'institution': return institutions.filter(i => i.name.toLowerCase().includes(searchLower));
      default: return [];
    }
  };

  // --- Procedure Step Completion & Form Handling ---
  const handleCompleteStep = async () => {
    if (showCompleteStepModal === null) return; // Should be step_id
    const stepToUpdate = incident.procedure_steps?.find(s => s.step_id === showCompleteStepModal);
    if (!stepToUpdate) return;

    const updatedStep = {
      ...stepToUpdate,
      completed: true,
      completed_at: new Date().toISOString(),
      completed_by: currentUser?.id,
      notes: stepCompletionNotes,
    };
    const updatedSteps = incident.procedure_steps.map(s => s.step_id === showCompleteStepModal ? updatedStep : s);
    try {
      await handleUpdate({ procedure_steps: updatedSteps }, true); // Silent update for steps
      
      const logContent = `השלים שלב בסדר הפעולות: "${stepToUpdate.title || stepToUpdate.step_id}"` + 
                         (stepCompletionNotes ? ` (הערות: ${stepCompletionNotes})` : '');
      const stepLog = {
        timestamp: new Date().toISOString(),
        user_id: currentUser?.id,
        content: logContent,
      };
      await handleUpdate({ logs: [...(incident.logs || []), stepLog] });

      setShowCompleteStepModal(null);
      setStepCompletionNotes('');
    } catch (err) { /* Error handled */ }
  };

  const handleStepFormSubmit = async (formDataObject) => {
    if (!showViewFormModal || !showViewFormModal.stepId) return;
    
    const stepId = showViewFormModal.stepId;
    const stepToUpdate = incident.procedure_steps.find(s => s.step_id === stepId);
    if (!stepToUpdate) return;

    try {
        // 1. Create FormSubmission
        const submission = await FormSubmission.create({
            form_template_id: showViewFormModal.formTemplateId,
            submitted_by_user_id: currentUser.id,
            submission_timestamp: new Date().toISOString(),
            data: formDataObject.data, // Assuming formDataObject from FormViewer has a data property
            context_entity_type: 'IncidentStep', // Or just 'Incident', linking to the step via notes
            context_entity_id: incident.id + '_' + stepId // Unique context
        });

        // 2. Update the step with form_submission_id and mark as complete (or partially)
        const updatedStep = {
            ...stepToUpdate,
            form_submission_id: submission.id,
            completed: true, // Or some other logic if form is just one part of completion
            completed_at: new Date().toISOString(),
            completed_by: currentUser?.id,
            notes: (stepToUpdate.notes || '') + ` טופס ${getFormTitle(showViewFormModal.formTemplateId)} הוגש.`,
        };
        const updatedSteps = incident.procedure_steps.map(s => s.step_id === stepId ? updatedStep : s);
        await handleUpdate({ procedure_steps: updatedSteps }, true);

        // 3. Add log entry
        const logContent = `הגיש טופס "${getFormTitle(showViewFormModal.formTemplateId)}" עבור שלב: "${stepToUpdate.title}"`;
        const formLog = {
          timestamp: new Date().toISOString(),
          user_id: currentUser?.id,
          content: logContent,
        };
        await handleUpdate({ logs: [...(incident.logs || []), formLog] });

        setShowViewFormModal(null); // Close form modal
    } catch (formSubmitError) {
        console.error("Error submitting step form:", formSubmitError);
        alert("שגיאה בהגשת הטופס: " + formSubmitError.message);
    }
  };
  
  const getFormTitle = (formId) => formTemplates.find(ft => ft.id === formId)?.title || formId;

  // --- Resource Usage ---
  const handleAddResourceUsage = async () => {
    if (!selectedResourceForUsage) return;
    // This is simplified. Ideally, if a form is associated with resource usage,
    // it should open FormViewer like for procedure steps.
    const usage = {
      resource_id: selectedResourceForUsage,
      usage_details: resourceUsageNotes,
    };
    try {
      await handleUpdate({ resources_used: [...(incident.resources_used || []), usage] }, true);
      
      const resourceName = allResources.find(r => r.id === selectedResourceForUsage)?.item_identifier || selectedResourceForUsage;
      const logContent = `שימוש במשאב: ${resourceName}` + 
                         (resourceUsageNotes ? ` (פרטים: ${resourceUsageNotes})` : '');
      const resourceLog = {
        timestamp: new Date().toISOString(),
        user_id: currentUser?.id,
        content: logContent,
        tagged_entities: [{type: 'resource', id: selectedResourceForUsage}]
      };
      await handleUpdate({ logs: [...(incident.logs || []), resourceLog] });
      
      setSelectedResourceForUsage('');
      setResourceUsageNotes('');
      setShowResourceUsageModal(false);
    } catch (err) { /* Error handled */ }
  };

  // --- Incident Status & Closing ---
  const handleUpdateStatus = async (newStatus) => {
    try {
      const updatePayload = { status: newStatus };
      let statusText = '';
      if (newStatus === 'in_progress') statusText = 'בטיפול';
      else if (newStatus === 'closed') {
        statusText = 'סגור';
        updatePayload.closed_at = new Date().toISOString();
        updatePayload.closed_by = currentUser?.id;
      } else {
        statusText = 'פתוח'; // Should not happen from here but for completeness
      }
      
      await handleUpdate(updatePayload, true); // Silent update for status itself

      const statusLog = {
        timestamp: new Date().toISOString(),
        user_id: currentUser?.id,
        content: `סטטוס האירוע שונה ל: ${statusText}`
      };
      const finalLogsUpdate = { logs: [...(incident.logs || []), statusLog] };

      if (newStatus === 'closed' && notifications.recipients.length > 0) {
        // Simulate sending notifications (actual sending would be an integration call)
        console.log("Sending notifications for closure:", notifications);
        const notificationLogEntry = {
          timestamp: new Date().toISOString(),
          user_id: currentUser?.id,
          content: `נשלחו התראות סגירה ל: ${notifications.recipients.join(', ')}`,
        };
        finalLogsUpdate.logs.push(notificationLogEntry);
        finalLogsUpdate.notifications_sent = [...(incident.notifications_sent || []), {
           timestamp: new Date().toISOString(),
           recipients: notifications.recipients,
           message: notifications.message
         }];
      }
       await handleUpdate(finalLogsUpdate);


      if (newStatus === 'closed') {
        setShowCloseIncidentModal(false);
      }
    } catch (err) { /* Error handled by general handleUpdate */ }
  };

  // --- Summary ---
  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    const logsSummary = (incident.logs || []).map(log => `${getUserName(log.user_id)} (${formatDate(log.timestamp)}): ${log.content}`).join('\n');
    const involvedSummary = (incident.involved_entities || []).map(inv => `${getEntityNameForTag(inv.entity_type, inv.entity_id)} (${inv.role})`).join(', ');
    const resourcesSummary = (incident.resources_used || []).map(res => `${allResources.find(r => r.id === res.resource_id)?.item_identifier || res.resource_id} - ${res.usage_details || 'אין פירוט'}`).join('\n');

    const prompt = `צור סיכום אירוע מפורט בעברית עבור האירוע הבא:\n` +
      `כותרת: ${incident.title}\n` +
      `קטגוריה: ${incident.category} - ${incident.sub_category}\n` +
      `תיאור ראשוני: ${incident.description}\n` +
      `דווח ע"י: ${getUserName(incident.reporter_id)} בתאריך ${formatDate(incident.created_date)}\n` +
      `מיקום: ${incident.location?.description || 'לא צוין'}\n` +
      `${involvedSummary ? `מעורבים: ${involvedSummary}\n` : ''}` +
      `יומן אירועים:\n${logsSummary}\n` +
      `${resourcesSummary ? `משאבים בשימוש:\n${resourcesSummary}\n` : ''}` +
      `אנא סכם את מהלך האירוע, פעולות שננקטו, ותוצאה סופית. אם האירוע עדיין פתוח, ציין זאת.`;

    // This is a placeholder for actual LLM call. For now, simple template.
    // import { InvokeLLM } from "@/api/integrations";
    // try {
    //   const summaryText = await InvokeLLM({ prompt: prompt: prompt });
    //   setSummaryDraft(summaryText);
    // } catch (llmError) {
    //   console.error("LLM Error:", llmError);
    //   setSummaryDraft("שגיאה ביצירת סיכום אוטומטי. אנא נסה שוב או הזן ידנית.");
    // }
    
    // Simplified summary for now
    const generatedSummary = `סיכום אירוע: ${incident.title}\n` +
      `תאריך: ${formatDate(incident.created_date)}\n` +
      `קטגוריה: ${incident.category} - ${incident.sub_category}\n` +
      `תיאור: ${incident.description}\n\n` +
      `יומן אירועים עיקרי:\n${(incident.logs || []).slice(-3).map(log => `- ${log.content}`).join('\n')}\n\n` + // Last 3 log entries
      `האירוע ${incident.status === 'closed' ? `נסגר בתאריך ${formatDate(incident.closed_at)} ע"י ${getUserName(incident.closed_by)}.` : 'עדיין בטיפול'}.`;
    
    setTimeout(() => {
      setSummaryDraft(generatedSummary);
      setIsGeneratingSummary(false);
    }, 1000);
  };

  const handleSaveSummary = async () => {
    if (!summaryDraft.trim()) return;
    try {
      await handleUpdate({ summary: summaryDraft }, true);
      const summaryLog = {
        timestamp: new Date().toISOString(),
        user_id: currentUser?.id,
        content: 'סיכום האירוע עודכן/נוסף.'
      };
      await handleUpdate({ logs: [...(incident.logs || []), summaryLog] });
      setShowGenerateSummaryModal(false);
    } catch (err) { /* Error handled */ }
  };
  
  if (loading) return <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>טוען נתוני אירוע...</div>;
  if (error) return <div className="p-8 text-center text-red-600 clay-card">{error}</div>;
  if (!incident) return <div className="p-8 text-center clay-card">לא נבחר אירוע.</div>;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open': return <Badge variant="destructive" className="bg-red-100 text-red-700">פתוח</Badge>;
      case 'in_progress': return <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">בטיפול</Badge>;
      case 'closed': return <Badge variant="secondary" className="bg-green-100 text-green-700">סגור</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const currentProcedureSteps = incident.procedure_steps || [];

  return (
    <div className="h-full flex flex-col bg-neutral-50" dir="rtl">
      {/* Sticky Action Bar */}
      <header className="sticky top-0 z-30 bg-white shadow-md p-3 border-b">
        <div className="container mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="סגור ניהול אירוע">
              <X className="w-6 h-6 text-neutral-600 hover:text-neutral-800" />
            </Button>
            <h1 className="text-xl font-bold text-primary-700 truncate" title={incident.title}>
              ניהול אירוע: {incident.title}
            </h1>
            {getStatusBadge(incident.status)}
          </div>
          <div className="flex flex-wrap gap-2">
            {incident.status !== 'closed' && (
              <>
                <Button size="sm" className="clay-button" onClick={() => setShowLogEntryModal(true)}>
                  <Plus className="w-4 h-4 ml-1" /> יומן
                </Button>
                <Button size="sm" variant="outline" className="clay-button" onClick={() => setShowAddEntityModal(true)}>
                  <Users className="w-4 h-4 ml-1" /> הוסף מעורב
                </Button>
                 {incident.status === 'open' && 
                    <Button size="sm" variant="outline" className="clay-button bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200" onClick={() => handleUpdateStatus('in_progress')}>
                        <PlayCircle className="w-4 h-4 ml-1" /> העבר לטיפול
                    </Button>
                 }
                <Button size="sm" variant="outline" className="clay-button" onClick={() => setShowResourceUsageModal(true)}>
                  <Box className="w-4 h-4 ml-1" /> שימוש במשאב
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" className="clay-button" onClick={() => setShowGenerateSummaryModal(true)}>
               <BookText className="w-4 h-4 ml-1" /> {incident.summary ? 'עדכן סיכום' : 'צור סיכום'}
            </Button>
            {incident.status !== 'closed' && (
              <Button size="sm" className="clay-button bg-red-500 hover:bg-red-600 text-white" onClick={() => setShowCloseIncidentModal(true)}>
                <ShieldCheck className="w-4 h-4 ml-1" /> סגור אירוע
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area with Scroll */}
      <ScrollArea className="flex-grow p-4 md:p-6 container mx-auto">
        <div className="space-y-6">
          {/* Section 1: General Details */}
          <Card className="clay-card">
            <CardHeader>
              <CardTitle className="flex items-center"><Info className="w-5 h-5 ml-2 text-primary-600" />פרטי אירוע עיקריים</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><strong className="block text-sm text-neutral-500">קטגוריה:</strong> {incident.category_name || incident.category}</div> {/* Assuming category_name might be populated */}
                <div><strong className="block text-sm text-neutral-500">אופי אירוע:</strong> {incident.sub_category_name || incident.sub_category}</div> {/* Assuming sub_category_name */}
                <div><strong className="block text-sm text-neutral-500">תאריך יצירה:</strong> {formatDate(incident.created_date)}</div>
                <div><strong className="block text-sm text-neutral-500">מדווח:</strong> {getUserName(incident.reporter_id)}</div>
                {incident.field_agent_id && <div><strong className="block text-sm text-neutral-500">איש שטח:</strong> {incident.field_agent_id}</div>}
                {incident.shift_id && <div><strong className="block text-sm text-neutral-500">משמרת ID:</strong> {incident.shift_id}</div>}
                {incident.closed_at && <div><strong className="block text-sm text-neutral-500">תאריך סגירה:</strong> {formatDate(incident.closed_at)}</div>}
                {incident.closed_by && <div><strong className="block text-sm text-neutral-500">נסגר ע״י:</strong> {getUserName(incident.closed_by)}</div>}
              </div>
              <div className="pt-2">
                <strong className="block text-sm text-neutral-500 mb-1">מיקום:</strong>
                <div className="clay-card bg-neutral-50 p-3 text-sm">
                  <p className="flex items-center"><MapPin size={16} className="ml-2 text-neutral-400" /> {incident.location?.description || "לא צוין תיאור מיקום"}</p>
                  {incident.location?.latitude && incident.location?.longitude && (
                    <p className="text-xs text-neutral-500 mt-1">נ.צ: {incident.location.latitude.toFixed(5)}, {incident.location.longitude.toFixed(5)}</p>
                  )}
                </div>
              </div>
              <div className="pt-2">
                <strong className="block text-sm text-neutral-500 mb-1">תיאור האירוע:</strong>
                <div className="clay-card bg-neutral-50 p-3 text-sm whitespace-pre-wrap">{incident.description || "אין תיאור מפורט"}</div>
              </div>
              {incident.handling_team && incident.handling_team.length > 0 && (
                <div className="pt-2">
                  <strong className="block text-sm text-neutral-500 mb-1">צוות מטפל:</strong>
                  <div className="flex flex-wrap gap-2">
                    {incident.handling_team.map(userId => (
                      <Badge key={userId} variant="secondary" className="bg-blue-50 text-blue-700">{getUserName(userId)}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {incident.contact_id && (
                 <div className="pt-2">
                  <strong className="block text-sm text-neutral-500 mb-1">איש קשר (מתלונן/מדווח):</strong>
                  <p className="text-sm">
                    {incident.contact_id === 'anonymous' ? 'אנונימי' : (contacts.find(c => c.id === incident.contact_id)?.full_name || incident.contact_id)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Event Log */}
          <Card className="clay-card">
            <CardHeader>
              <CardTitle className="flex items-center"><MessageSquare className="w-5 h-5 ml-2 text-primary-600" />יומן אירוע</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {incident.logs && incident.logs.length > 0 ? (
                <ScrollArea className="max-h-96">
                <div className="space-y-4">
                  {incident.logs.slice().reverse().map((log, index) => ( 
                    <div key={index} className="clay-card bg-white p-3 border">
                      <div className="flex justify-between items-center text-xs text-neutral-500 mb-1">
                        <span>{formatDate(log.timestamp)}</span>
                        <span>{getUserName(log.user_id)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{log.content}</p>
                      {log.tagged_entities && log.tagged_entities.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {log.tagged_entities.map((tag, tIndex) => (
                            <Badge key={tIndex} variant="outline" className="text-xs">
                              <Link2 size={12} className="ml-1" /> {getEntityNameForTag(tag.entity_type, tag.entity_id)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                </ScrollArea>
              ) : (
                <p className="text-neutral-500 text-center py-4">אין רשומות ביומן האירוע.</p>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Involved Entities */}
          <Card className="clay-card">
            <CardHeader>
              <CardTitle className="flex items-center"><Users className="w-5 h-5 ml-2 text-primary-600" />ישויות מעורבות</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {incident.involved_entities && incident.involved_entities.length > 0 ? (
                <div className="space-y-3">
                  {incident.involved_entities.map((entity, index) => (
                    <div key={index} className="clay-card bg-white p-3 border flex justify-between items-center">
                      <div>
                        <span className="font-medium">{getEntityNameForTag(entity.entity_type, entity.entity_id)}</span>
                        <span className="text-xs text-neutral-500 ml-2">({entity.entity_type})</span>
                      </div>
                      <Badge variant="secondary">{entity.role || 'מעורב'}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-500 text-center py-4">אין ישויות מעורבות שקושרו לאירוע זה.</p>
              )}
            </CardContent>
          </Card>

          {/* Section 4: Procedure Steps */}
          {currentProcedureSteps && currentProcedureSteps.length > 0 && (
            <Card className="clay-card">
              <CardHeader>
                <CardTitle className="flex items-center"><ClipboardList className="w-5 h-5 ml-2 text-primary-600" />
                  סדר פעולות טיפול: {incidentProcedureDefinition?.name || 'סדר פעולות משויך'}
                </CardTitle>
                 {incidentProcedureDefinition?.description && <CardDescription>{incidentProcedureDefinition.description}</CardDescription>}
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {currentProcedureSteps.map((step, index) => (
                  <div key={step.step_id || index} className={`clay-card p-3 border ${step.completed ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-grow">
                        <h4 className="font-medium flex items-center">
                          {step.completed ? <CheckSquare size={18} className="ml-2 text-green-600" /> : <div className="w-5 h-5 border border-neutral-400 rounded ml-2 inline-block"></div>}
                          {step.title || `שלב ${step.step_id}`}
                          {step.is_required && <Badge variant="destructive" className="mr-2 text-xs">חובה</Badge>}
                        </h4>
                        {step.description && <p className="text-sm text-neutral-600 mt-1">{step.description}</p>}
                        {step.completed && step.notes && <p className="text-xs italic text-neutral-500 mt-1">הערה: {step.notes}</p>}
                         {step.completed_by && <p className="text-xs text-neutral-400 mt-1">הושלם ע"י: {getUserName(step.completed_by)} ב-{formatDate(step.completed_at)}</p>}
                         {step.form_submission_id && <p className="text-xs text-blue-500 mt-1">הגשת טופס ID: {step.form_submission_id.substring(0,8)}...</p>}
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-1">
                        {!step.completed && incident.status !== 'closed' && (
                          <Button size="sm" variant="outline" className="clay-button text-xs" onClick={() => setShowCompleteStepModal(step.step_id)}>
                            <Edit3 size={14} className="ml-1" /> סמן כהושלם
                          </Button>
                        )}
                        {step.step_type === 'form' && step.form_id && (
                            <Button size="xs" variant="link" className="text-primary-600 p-0 h-auto text-xs" 
                                    onClick={() => setShowViewFormModal({ formTemplateId: step.form_id, stepId: step.step_id })}>
                                <ClipboardList size={14} className="ml-1" /> 
                                {step.form_submission_id ? "צפה/עדכן טופס" : "מלא טופס"}: {getFormTitle(step.form_id)}
                            </Button>
                        )}
                        {step.step_type === 'document' && step.document_url && (
                            <a href={step.document_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 text-xs flex items-center hover:underline">
                                <Download size={14} className="ml-1" /> הצג מסמך
                            </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Section 5: Resources Used & Nearby */}
          <Card className="clay-card">
            <CardHeader>
              <CardTitle className="flex items-center"><Box className="w-5 h-5 ml-2 text-primary-600" />משאבים</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <h4 className="text-md font-medium mb-2">משאבים בשימוש באירוע:</h4>
              {incident.resources_used && incident.resources_used.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {incident.resources_used.map((usage, index) => (
                    <div key={index} className="clay-card bg-white p-3 border">
                      <p className="font-medium">{allResources.find(r => r.id === usage.resource_id)?.item_identifier || usage.resource_id}</p>
                      {usage.usage_details && <p className="text-sm text-neutral-600 mt-1">{usage.usage_details}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-500 text-center py-4">לא דווח על שימוש במשאבים ספציפיים באירוע זה.</p>
              )}
              <Collapsible className="mt-4">
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="text-sm text-neutral-600 flex items-center p-1">
                        <ListFilter size={16} className="ml-1"/> הצג משאבים בקרבת מקום ({resourcesNearby.length})
                        <ChevronDown size={16} className="mr-1 data-[state=open]:rotate-180 transition-transform"/>
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                    {resourcesNearby.length > 0 ? resourcesNearby.map(res => (
                        <div key={res.id} className="text-xs p-2 border rounded-md bg-neutral-50">
                           {res.item_identifier} ({res.site || 'לא משויך לאתר'}) - סטטוס: {res.status}
                        </div>
                    )) : <p className="text-xs text-neutral-400">אין משאבים ידועים בקרבת מקום האירוע.</p>}
                </CollapsibleContent>
               </Collapsible>
            </CardContent>
          </Card>

          {/* Section 6: Incident Summary */}
          <Card className="clay-card">
            <CardHeader>
              <CardTitle className="flex items-center"><BookText className="w-5 h-5 ml-2 text-primary-600" />סיכום אירוע</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {incident.summary || summaryDraft ? (
                <div className="whitespace-pre-wrap bg-neutral-100 p-3 rounded-md text-sm">{incident.summary || summaryDraft}</div>
              ) : (
                <p className="text-neutral-500 text-center py-4">טרם נוצר סיכום לאירוע זה.</p>
              )}
            </CardContent>
          </Card>
          
           {/* Section 7: Notifications Sent */}
            {incident.notifications_sent && incident.notifications_sent.length > 0 && (
             <Card className="clay-card">
                <CardHeader>
                  <CardTitle className="flex items-center"><Send className="w-5 h-5 ml-2 text-primary-600" />התראות שנשלחו</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-2">
                    {incident.notifications_sent.map((notif, idx) => (
                        <div key={idx} className="text-xs p-2 border rounded-md bg-neutral-50">
                            <p><strong>נשלח ב:</strong> {formatDate(notif.timestamp)}</p>
                            <p><strong>נמענים:</strong> {notif.recipients?.join(', ') || 'לא צוינו נמענים'}</p>
                            <p className="mt-1 whitespace-pre-wrap"><strong>הודעה:</strong> {notif.message}</p>
                        </div>
                    ))}
                </CardContent>
             </Card>
            )}

        </div>
      </ScrollArea>

      {/* --- Modals --- */}
      {/* Add Log Entry Modal */}
      <Dialog open={showLogEntryModal} onOpenChange={setShowLogEntryModal}>
        <DialogContent className="clay-card max-w-xl"> {/* Increased width */}
          <DialogHeader>
            <DialogTitle>הוספת רשומת יומן</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Textarea 
              value={newLogEntry} 
              onChange={(e) => setNewLogEntry(e.target.value)} 
              placeholder="תוכן הרשומה..." 
              className="clay-input min-h-[100px]"
            />
            <div>
                <label className="text-sm font-medium mb-1 block">תייג ישויות (אופציונלי):</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                    <Select value={selectedEntityTypeForLog} onValueChange={setSelectedEntityTypeForLog}>
                        <SelectTrigger className="clay-input text-xs"><SelectValue placeholder="בחר סוג ישות בסיסית..."/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="contact">איש קשר</SelectItem>
                            <SelectItem value="vehicle">רכב</SelectItem>
                            <SelectItem value="institution">מוסד</SelectItem>
                            <SelectItem value="resource">משאב</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input 
                        type="text" 
                        value={searchEntityForLog} 
                        onChange={(e) => setSearchEntityForLog(e.target.value)}
                        placeholder="חפש ישות בסיסית..."
                        className="clay-input text-xs"
                        disabled={!selectedEntityTypeForLog}
                    />
                </div>
                {selectedEntityTypeForLog && searchEntityForLog.trim() && (
                    <ScrollArea className="max-h-32 border rounded-md clay-card p-1 mb-2">
                        {getFilteredEntitiesForLog().map(entity => (
                            <div key={entity.id} 
                                 className="p-2 text-xs hover:bg-primary-50 cursor-pointer rounded"
                                 onClick={() => {
                                     if (!taggedEntitiesForLog.find(t => t.type === selectedEntityTypeForLog && t.id === entity.id)) {
                                        setTaggedEntitiesForLog([...taggedEntitiesForLog, {type: selectedEntityTypeForLog, id: entity.id}]);
                                     }
                                     setSearchEntityForLog('');
                                 }}>
                                {getEntityNameForTag(selectedEntityTypeForLog, entity.id)}
                            </div>
                        ))}
                    </ScrollArea>
                )}
                {/* Custom Data Tagging */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                    <Select value={selectedCustomDataTypeSlugForLog} onValueChange={setSelectedCustomDataTypeSlugForLog}>
                        <SelectTrigger className="clay-input text-xs"><SelectValue placeholder="בחר סוג דאטה מותאם..."/></SelectTrigger>
                        <SelectContent>
                            {customDataTypes.map(cdt => (
                                <SelectItem key={cdt.slug} value={cdt.slug}>{cdt.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <Input 
                        type="text" 
                        value={searchCustomDataRecordForLog} 
                        onChange={(e) => setSearchCustomDataRecordForLog(e.target.value)}
                        placeholder="חפש רשומת דאטה..."
                        className="clay-input text-xs"
                        disabled={!selectedCustomDataTypeSlugForLog}
                    />
                </div>
                 {selectedCustomDataTypeSlugForLog && searchCustomDataRecordForLog.trim() && (
                    <ScrollArea className="max-h-32 border rounded-md clay-card p-1">
                        {filteredCustomDataRecordsForLog.map(record => (
                            <div key={record.id} 
                                 className="p-2 text-xs hover:bg-primary-50 cursor-pointer rounded"
                                 onClick={() => {
                                     if (!taggedEntitiesForLog.find(t => t.type === 'custom_data' && t.id === record.id)) {
                                        setTaggedEntitiesForLog([...taggedEntitiesForLog, {type: 'custom_data', id: record.id, slug: record.custom_data_type_slug}]);
                                     }
                                     setSearchCustomDataRecordForLog(''); 
                                 }}>
                                {getEntityNameForTag('custom_data', record.id)} ({customDataTypes.find(cdt => cdt.slug === record.custom_data_type_slug)?.name})
                            </div>
                        ))}
                    </ScrollArea>
                )}

                 {taggedEntitiesForLog.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        <p className="text-xs font-medium w-full mb-1">תיוגים שנוספו:</p>
                        {taggedEntitiesForLog.map((tag, idx) => (
                             <Badge key={idx} variant="secondary" className="text-xs">
                                {getEntityNameForTag(tag.type, tag.id)}
                                {tag.type === 'custom_data' && ` (${customDataTypes.find(cdt => cdt.slug === tag.slug)?.name})`}
                                <button onClick={() => setTaggedEntitiesForLog(taggedEntitiesForLog.filter((_, i) => i !== idx))} className="mr-1 text-muted-foreground hover:text-destructive">
                                    <X size={12}/>
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" className="clay-button" onClick={() => setShowLogEntryModal(false)}>ביטול</Button>
            <Button className="clay-button bg-primary-500 hover:bg-primary-600 text-white" onClick={handleAddLogEntry}>שמור רשומה</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Involved Entity Modal */}
      <Dialog open={showAddEntityModal} onOpenChange={setShowAddEntityModal}>
        <DialogContent className="clay-card max-w-lg">
          <DialogHeader><DialogTitle>הוספת ישות מעורבת</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <Select value={involvedEntityType} onValueChange={setInvolvedEntityType}>
                <SelectTrigger className="clay-input"><SelectValue placeholder="בחר סוג ישות..."/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="contact">איש קשר</SelectItem>
                    <SelectItem value="vehicle">רכב</SelectItem>
                    <SelectItem value="institution">מוסד</SelectItem>
                </SelectContent>
            </Select>
            <Input 
                type="text" 
                value={searchInvolvedEntity} 
                onChange={(e) => setSearchInvolvedEntity(e.target.value)}
                placeholder="חפש ישות..."
                className="clay-input"
                disabled={!involvedEntityType}
            />
            {involvedEntityType && searchInvolvedEntity.trim() && (
                 <ScrollArea className="max-h-40 border rounded-md clay-card p-1">
                    {getFilteredInvolvedEntities().map(entity => (
                        <div key={entity.id} 
                             className={`p-2 text-sm hover:bg-primary-50 cursor-pointer rounded ${selectedInvolvedEntityId === entity.id ? 'bg-primary-100' : ''}`}
                             onClick={() => setSelectedInvolvedEntityId(entity.id)}>
                            {getEntityNameForTag(involvedEntityType, entity.id)}
                        </div>
                    ))}
                </ScrollArea>
            )}
             {selectedInvolvedEntityId && <p className="text-xs text-green-600">נבחר: {getEntityNameForTag(involvedEntityType, selectedInvolvedEntityId)}</p>}
            <Select value={involvedEntityRole} onValueChange={setInvolvedEntityRole}>
                <SelectTrigger className="clay-input"><SelectValue placeholder="בחר תפקיד באירוע..."/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="involved">מעורב</SelectItem>
                    <SelectItem value="reporter">מדווח</SelectItem>
                    <SelectItem value="witness">עד</SelectItem>
                    <SelectItem value="responder">מגיב</SelectItem>
                    <SelectItem value="other">אחר</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" className="clay-button" onClick={() => setShowAddEntityModal(false)}>ביטול</Button>
            <Button className="clay-button bg-primary-500 hover:bg-primary-600 text-white" onClick={handleAddInvolvedEntity} disabled={!selectedInvolvedEntityId}>הוסף ישות</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Procedure Step Modal */}
      {showCompleteStepModal !== null && (
        <Dialog open={showCompleteStepModal !== null} onOpenChange={() => setShowCompleteStepModal(null)}>
           <DialogContent className="clay-card max-w-md">
                <DialogHeader>
                    <DialogTitle>השלמת שלב בסדר הפעולות</DialogTitle>
                    <DialogDescription>
                        שלב: {currentProcedureSteps.find(s => s.step_id === showCompleteStepModal)?.title || showCompleteStepModal}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Textarea 
                        value={stepCompletionNotes}
                        onChange={(e) => setStepCompletionNotes(e.target.value)}
                        placeholder="הערות להשלמת השלב (אופציונלי)..."
                        className="clay-input min-h-[80px]"
                    />
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" className="clay-button" onClick={() => setShowCompleteStepModal(null)}>ביטול</Button>
                    <Button className="clay-button bg-green-500 hover:bg-green-600 text-white" onClick={handleCompleteStep}>סמן כהושלם</Button>
                </div>
           </DialogContent>
        </Dialog>
      )}
      
      {/* Resource Usage Modal */}
      <Dialog open={showResourceUsageModal} onOpenChange={setShowResourceUsageModal}>
        <DialogContent className="clay-card max-w-lg">
            <DialogHeader><DialogTitle>רישום שימוש במשאב</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
                <Select value={selectedResourceForUsage} onValueChange={setSelectedResourceForUsage}>
                    <SelectTrigger className="clay-input"><SelectValue placeholder="בחר משאב מהרשימה או מקרבת מקום..."/></SelectTrigger>
                    <SelectContent>
                        <ScrollArea className="max-h-60">
                        {resourcesNearby.length > 0 && <SelectItem value={null} disabled className="font-semibold text-neutral-400">משאבים בקרבת מקום:</SelectItem>}
                        {resourcesNearby.map(res => (
                            <SelectItem key={res.id} value={res.id}>{res.item_identifier} ({res.site})</SelectItem>
                        ))}
                        {resourcesNearby.length > 0 && allResources.length > resourcesNearby.length && <SelectItem value={null} disabled className="font-semibold text-neutral-400 pt-2 mt-2 border-t">כל המשאבים:</SelectItem>}
                        {allResources.filter(ar => !resourcesNearby.some(nr => nr.id === ar.id)).map(res => (
                             <SelectItem key={res.id} value={res.id}>{res.item_identifier} ({res.site})</SelectItem>
                        ))}
                        </ScrollArea>
                    </SelectContent>
                </Select>
                <Textarea 
                    value={resourceUsageNotes}
                    onChange={(e) => setResourceUsageNotes(e.target.value)}
                    placeholder="פרטי שימוש (למשל, 'סוללה התרוקנה', 'שימוש לבדיקת אזור')..."
                    className="clay-input min-h-[80px]"
                />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" className="clay-button" onClick={() => setShowResourceUsageModal(false)}>ביטול</Button>
                <Button className="clay-button bg-primary-500 hover:bg-primary-600 text-white" onClick={handleAddResourceUsage} disabled={!selectedResourceForUsage}>רשום שימוש</Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Generate/Edit Summary Modal */}
      <Dialog open={showGenerateSummaryModal} onOpenChange={setShowGenerateSummaryModal}>
        <DialogContent className="clay-card max-w-xl">
            <DialogHeader>
                <DialogTitle>{incident.summary ? 'עריכת סיכום אירוע' : 'יצירת סיכום אירוע'}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <Textarea 
                    value={summaryDraft}
                    onChange={(e) => setSummaryDraft(e.target.value)}
                    placeholder="הכנס סיכום ידני או לחץ על 'יצירת סיכום אוטומטי'..."
                    className="clay-input min-h-[200px]"
                />
                 <Button 
                    variant="outline" 
                    className="clay-button w-full" 
                    onClick={handleGenerateSummary}
                    disabled={isGeneratingSummary}
                  >
                    {isGeneratingSummary ? <RotateCw className="w-4 h-4 ml-2 animate-spin"/> : <Settings2 className="w-4 h-4 ml-2"/>}
                    {isGeneratingSummary ? "מייצר סיכום..." : "יצירת סיכום אוטומטי (טיוטה)"}
                  </Button>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" className="clay-button" onClick={() => {setShowGenerateSummaryModal(false); setSummaryDraft(incident.summary || '');}}>ביטול</Button>
                <Button className="clay-button bg-primary-500 hover:bg-primary-600 text-white" onClick={handleSaveSummary} disabled={!summaryDraft.trim()}>
                  <Save className="w-4 h-4 ml-1"/> שמור סיכום
                </Button>
            </div>
        </DialogContent>
      </Dialog>
      
      {/* Close Incident Modal */}
      <Dialog open={showCloseIncidentModal} onOpenChange={setShowCloseIncidentModal}>
        <DialogContent className="clay-card max-w-lg">
            <DialogHeader>
                <DialogTitle className="flex items-center"><ShieldCheck className="w-6 h-6 ml-2 text-red-500"/>סגירת אירוע</DialogTitle>
                <DialogDescription>האם אתה בטוח שברצונך לסגור את האירוע? פעולה זו תשנה את סטטוס האירוע ל'סגור'.</DialogDescription>
            </DialogHeader>
             <div className="py-4 space-y-3">
                {!incident.summary && <p className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded-md flex items-center"><HelpCircle size={16} className="ml-2"/>לא נוצר סיכום לאירוע. מומלץ ליצור סיכום לפני סגירה.</p>}
                {currentProcedureSteps.some(s => s.is_required && !s.completed) && <p className="text-sm text-red-700 bg-red-50 p-2 rounded-md flex items-center"><AlertTriangle size={16} className="ml-2"/>ישנם שלבי חובה בסדר הפעולות שטרם הושלמו!</p>}
                <div>
                    <label className="text-sm font-medium block mb-1">נמענים להתראת סגירה (אופציונלי, מופרד בפסיקים):</label>
                    <Input 
                        value={notifications.recipients.join(', ')}
                        onChange={(e) => setNotifications(prev => ({...prev, recipients: e.target.value.split(',').map(s => s.trim()).filter(s => s)}))}
                        className="clay-input text-sm"
                        placeholder="לדוגמה: manager@example.com, security_team_group_id"
                    />
                </div>
                 <div>
                    <label className="text-sm font-medium block mb-1">הודעת סגירה (מותאם אוטומטית):</label>
                    <Textarea 
                        value={notifications.message}
                        onChange={(e) => setNotifications(prev => ({...prev, message: e.target.value}))}
                        className="clay-input text-sm min-h-[80px]"
                    />
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" className="clay-button" onClick={() => setShowCloseIncidentModal(false)}>ביטול</Button>
                <Button className="clay-button bg-red-500 hover:bg-red-600 text-white" onClick={() => handleUpdateStatus('closed')}>
                  <ThumbsUp className="w-4 h-4 ml-1"/> אישור וסגירת אירוע
                </Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Form Viewer Modal for Procedure Steps */}
      {showViewFormModal && (
        <Dialog open={!!showViewFormModal} onOpenChange={() => setShowViewFormModal(null)}>
            <DialogContent className="clay-card max-w-2xl w-[90vw] md:w-[70vw]">
                <DialogHeader>
                    <DialogTitle>
                        מילוי טופס: {getFormTitle(showViewFormModal.formTemplateId)}
                    </DialogTitle>
                    {showViewFormModal.stepId && 
                        <DialogDescription>
                            עבור שלב: {currentProcedureSteps.find(s => s.step_id === showViewFormModal.stepId)?.title}
                        </DialogDescription>
                    }
                </DialogHeader>
                <div className="py-4 max-h-[70vh] overflow-y-auto">
                    <FormViewer
                        formTemplateId={showViewFormModal.formTemplateId}
                        onSubmit={handleStepFormSubmit}
                        onCancel={() => setShowViewFormModal(null)}
                        contextEntityType="IncidentStep" // Context for where the form is being filled
                        contextEntityId={`${incident.id}_${showViewFormModal.stepId}`} // Unique ID for the step context
                        // initialData can be passed if we want to prefill or edit a submission
                    />
                </div>
            </DialogContent>
        </Dialog>
      )}

    </div>
  );
}

const Collapsible = ({ children, className }) => <div className={className}>{children}</div>;
const CollapsibleTrigger = ({ children, asChild, ...props }) => asChild ? React.cloneElement(children, props) : <button {...props}>{children}</button>;
const CollapsibleContent = ({ children, className }) => <div className={className}>{children}</div>;
