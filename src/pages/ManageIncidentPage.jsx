
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '@/api/entities';
import { Location } from '@/api/entities'; // Added Location entity
import { ResourceItem } from '@/api/entities';
import { Resource } from '@/api/entities';
import { Procedure } from '@/api/entities';
import { FormTemplate } from '@/api/entities';
import { FormSubmission } from '@/api/entities';
import { Incident } from '@/api/entities';
import { CustomDataType } from '@/api/entities';
import { CustomDataRecord } from '@/api/entities';
import { IncidentSubCategory } from '@/api/entities';
import { IncidentCategory } from '@/api/entities';
import { Notification } from '@/api/entities'; // For sendNotification
import { createPageUrl } from '@/utils';
import { InvokeLLM } from '@/api/integrations';
import IncidentProcedureManager from '@/components/incidents/IncidentProcedureManager';
import IncidentMapAndNearbyData from '@/components/incidents/IncidentMapAndNearbyData';
import GoogleAddressSelector from '@/components/forms/GoogleAddressSelector'; // Add this import
import { UserGroup } from '@/api/entities'; // Add UserGroup import
import {
  AlertTriangle, FileText, MessageSquare, CheckSquare, Users, Clock, Tag, Info, Car, Building,
  User as UserIcon, Box, Plus, Send, X, Paperclip, Save, BookText, ThumbsUp, Trash2, PlayCircle, Eye,
  ClipboardList, Link2, Download, ShieldCheck, HelpCircle, Settings2, RotateCw, ChevronDown, ListFilter, ArrowRight, ChevronLeft,
  AlertCircle, AtSign, BadgeInfo, Bell, Briefcase, CalendarDays, Check, CheckCircle2, ChevronRight as ChevronRightIcon, ClipboardEdit, Compass, ExternalLink,
  Filter as FilterIcon, GripVertical, ImageIcon, Link as LinkIcon, ListChecks as ListChecksIcon, Loader2, Maximize2,
  Minimize2, Navigation, Phone, Printer, RadioTower, RotateCcw, Share2, Shield, ThumbsDown, UserPlus, Video, Voicemail, Zap,
  BellRing, Circle, Database, Edit, FilePenLine, MapPin, Edit3, PlusCircle, MoreVertical, Menu, Map, Wand2 // Added Wand2 icon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import FormViewer from '@/components/forms/FormViewer';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Helper to format dates
const formatDate = (dateString) => {
  if (!dateString) return 'לא צוין';
  const date = new Date(dateString);
  return `${date.toLocaleDateString('he-IL')} ${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
};

// Simple Collapsible components (though not used in the final version of this file after implementation)
const Collapsible = ({ children, className }) => <div className={className}>{children}</div>;
const CollapsibleTrigger = ({ children, asChild, ...props }) => asChild ? React.cloneElement(children, props) : <button {...props}>{children}</button>;
const CollapsibleContent = ({ children, className }) => <div className={className}>{children}</div>;

// Define sendNotification directly within this file
const sendNotification = async (recipients, title, message, type = 'info', priority = 'medium', relatedEntity = null, actionUrl = null) => {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    console.warn("sendNotification: No recipients provided.");
    return false;
  }
  if (!title || !message) {
    console.warn("sendNotification: Title and message are required.");
    return false;
  }

  const notificationPromises = recipients.map(userId => {
    if (!userId || typeof userId !== 'string') {
      console.warn(`sendNotification: Invalid userId provided: ${userId}`);
      return Promise.resolve(null);
    }
    const newNotification = {
      user_id: userId,
      title,
      message,
      type,
      priority,
      status: 'unread',
      sent_at: new Date().toISOString(),
    };
    if (relatedEntity && relatedEntity.type && relatedEntity.id) {
      newNotification.related_entity_type = relatedEntity.type;
      newNotification.related_entity_id = relatedEntity.id;
    }
    if (actionUrl) {
      newNotification.action_url = actionUrl;
    }
    return Notification.create(newNotification).catch(err => {
      console.error(`Failed to create notification for user ${userId}:`, err);
      return null;
    });
  });

  try {
    const results = await Promise.all(notificationPromises);
    const successfulCount = results.filter(r => r !== null).length;
    if (successfulCount > 0) {
      console.log(`Successfully sent ${successfulCount} notifications: "${title}"`);
    }
    if (successfulCount < recipients.length) {
      console.warn(`sendNotification: Failed to send ${recipients.length - successfulCount} notifications.`);
    }
    return successfulCount > 0;
  } catch (error) {
    console.error("Error sending notifications (Promise.all level):", error);
    return false;
  }
};

export default function ManageIncidentPage() {
  const navigate = useNavigate();
  const locationHook = useLocation();
  const [incidentId, setIncidentId] = useState(null);

  const [incident, setIncident] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const [allResources, setAllResources] = useState([]);
  const [allResourceTypesState, setAllResourceTypesState] = useState([]);
  const [users, setUsers] = useState([]);
  const [incidentProcedureDefinition, setIncidentProcedureDefinition] = useState(null);
  const [formTemplates, setFormTemplates] = useState([]);
  const [allCustomDataTypesState, setAllCustomDataTypesState] = useState([]);
  const [customDataRecords, setCustomDataRecords] = useState([]);

  const [incidentSubCategoryDetails, setIncidentSubCategoryDetails] = useState(null);
  const [incidentCategories, setIncidentCategories] = useState([]);
  const [incidentSubCategoriesDb, setIncidentSubCategoriesDb] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [allLocations, setAllLocations] = useState([]); // For selecting predefined locations
  const [userGroups, setUserGroups] = useState([]); // Add state for user groups

  const [pageLoading, setPageLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showLogEntryModal, setShowLogEntryModal] = useState(false);
  const [newLogEntry, setNewLogEntry] = useState('');
  const [taggedEntitiesForLog, setTaggedEntitiesForLog] = useState([]);
  const [selectedEntityTypeForLog, setSelectedEntityTypeForLog] = useState(''); // Kept but will be removed from UI
  const [searchEntityForLog, setSearchEntityForLog] = useState(''); // Kept but will be removed from UI
  const [selectedCustomDataTypeSlugForLog, setSelectedCustomDataTypeSlugForLog] = useState('');
  const [searchCustomDataRecordForLog, setSearchCustomDataRecordForLog] = useState('');
  const [filteredCustomDataRecordsForLog, setFilteredCustomDataRecordsForLog] = useState([]);

  const [showCloseIncidentModal, setShowCloseIncidentModal] = useState(false);
  const [notificationsOnClose, setNotificationsOnClose] = useState({ message: '' });

  const [showIncidentDetailsModal, setShowIncidentDetailsModal] = useState(false); // New state for incident details modal
  const [showGenerateSummaryModal, setShowGenerateSummaryModal] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const [showDescriptionModal, setShowDescriptionModal] = useState(false); // New state for description modal

  const [editableTitle, setEditableTitle] = useState('');
  const [editableDescription, setEditableDescription] = useState(''); // Will be edited in modal

  // New states for location dialog
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [manualLocation, setManualLocation] = useState({ latitude: '', longitude: '', description: '', address: '', selected_google_address: null });
  const [selectedPredefinedLocation, setSelectedPredefinedLocation] = useState('');
  const [updatingIncident, setUpdatingIncident] = useState(false); // For button loading

  const [showSendAlertModal, setShowSendAlertModal] = useState(false);
  const [alertRecipients, setAlertRecipients] = useState([]);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertTitle, setAlertTitle] = useState('');

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d * 1000;
  };

  const getUserName = (userId) => {
    if (!userId) return 'לא צוין';
    if (userId === 'anonymous') return 'דיווח אנונימי';
    if (currentUser && userId === currentUser.id) return currentUser.full_name + " (אני)";
    const user = users && users.find(u => u.id === userId);
    return user ? user.full_name : `משתמש (ID: ${userId.substring(0, 6)}...)`;
  };

  const handleUpdate = async (updateData, silent = false) => {
    if (!incident) return;
    try {
      setDataLoading(true);
      const updatedIncident = await Incident.update(incident.id, updateData);
      setIncident(prev => ({ ...prev, ...updatedIncident }));
      if (!silent) {
        // console.log("פרטי האירוע עודכנו בהצלחה!");
      }
      return updatedIncident;
    } catch (err) {
      console.error("Error updating incident:", err);
      if (!silent) {
        alert("שגיאה בעדכון האירוע: " + err.message);
      }
      setError("שגיאה בעדכון האירוע: " + err.message);
      throw err;
    } finally {
      setDataLoading(false);
    }
  };

  // New helper to handle logging
  const handleSubmitLog = async (content, taggedEntities = [], logType = 'manual_entry') => {
    if (!incident || !currentUser) return;
    const log = {
      timestamp: new Date().toISOString(),
      user_id: currentUser?.id,
      content: content,
      tagged_entities: taggedEntities,
      log_type: logType, // e.g., 'manual_entry', 'system_action', 'status_change', etc.
    };
    try {
      await handleUpdate({ logs: [...(incident.logs || []), log] });
    } catch (err) {
      console.error("Error submitting log entry:", err);
      alert("שגיאה בהוספת רשומת יומן: " + err.message);
    }
  };

  // New wrapper functions to pass to IncidentProcedureManager
  const handleIncidentUpdateForProcedureManager = async (updateData, silent = false) => {
    return handleUpdate(updateData, silent);
  };

  const handleSubmitLogForProcedureManager = async (content, taggedEntities = [], logType = 'manual_entry') => {
    return handleSubmitLog(content, taggedEntities, logType);
  };

  const handleProcedureStatusUpdate = (action) => {
    if (action === 'closed_by_procedure_completion') {
      // This is called from IncidentProcedureManager when "Finish Procedure" is clicked
      // and all required steps are done.
      // We can now trigger the close incident modal or directly close.
      // For consistency, let's use the existing close incident modal flow.
      if (incident?.status !== 'closed') {
        // Pre-fill summary if not present, or suggest update?
        // Optional: Auto-generate summary or prompt user
        // For now, just open the close modal
        setShowCloseIncidentModal(true);
      }
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(locationHook.search);
    const id = searchParams.get('id');
    if (id) {
      setIncidentId(id);
    } else {
      setError("לא סופק מזהה אירוע.");
      setPageLoading(false);
    }
  }, [locationHook.search]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [
          usersData, incidentCategoriesData, incidentSubCategoriesData,
          proceduresData, formTemplatesData, customTypesData,
          resourceItemsData, resourceTypesData, locationsData, userGroupsData
        ] = await Promise.all([
          User.list(), IncidentCategory.list(), IncidentSubCategory.list(),
          Procedure.list(), FormTemplate.list(), CustomDataType.list(),
          ResourceItem.list(), Resource.list(), Location.list(), UserGroup.list()
        ]);

        setCurrentUser(await User.me());
        setUsers(usersData || []);
        setIncidentCategories(incidentCategoriesData || []);
        setIncidentSubCategoriesDb(incidentSubCategoriesData || []);
        setProcedures(proceduresData || []);
        setFormTemplates(formTemplatesData || []);
        setAllCustomDataTypesState(customTypesData || []);
        setAllResources(resourceItemsData || []);
        setAllResourceTypesState(resourceTypesData || []);
        setAllLocations(locationsData || []);
        setUserGroups(userGroupsData || []);
      } catch (err) {
        console.error("Error fetching initial incident management data:", err);
        setError(prev => (prev ? prev + "\n" : "") + "שגיאה בטעינת נתונים בסיסיים.");
      }
    };
    fetchInitialData();
  }, []);

  // Load custom data types and records - This is the new/updated useEffect from the outline
  useEffect(() => {
    const loadCustomData = async () => {
      try {
        const [dataTypes, dataRecords, categories] = await Promise.all([
          CustomDataType.list(),
          CustomDataRecord.list(),
          IncidentCategory.list()
        ]);

        setAllCustomDataTypesState(dataTypes || []);
        setCustomDataRecords(dataRecords || []);
        setIncidentCategories(categories || []);
      } catch (error) {
        console.error('Error loading custom data:', error);
      }
    };
    loadCustomData();
  }, []);

  useEffect(() => {
    if (!incidentId) return;
    const fetchIncidentAndCategoryData = async () => {
      setPageLoading(true);
      setError(null);
      try {
        const fetchedIncident = await Incident.get(incidentId);
        let finalIncident = { ...fetchedIncident };

        setEditableTitle(fetchedIncident.title || '');
        setEditableDescription(fetchedIncident.description || ''); // Initialize for modal
        // currentIncidentLocation is replaced by new states and dialog initialization
        // setCurrentIncidentLocation(fetchedIncident.location || { latitude: null, longitude: null, description: '', location_id: null });

        if (fetchedIncident.category) {
          try {
            const categorySettingsData = await IncidentCategory.get(fetchedIncident.category);
            finalIncident.category_details = categorySettingsData;
          } catch (catErr) {
            console.warn("Could not load incident category settings:", catErr);
            setError(prev => (prev ? prev + "\n" : "") + "שגיאה בטעינת הגדרות קטגוריית האירוע.");
          }
        }
        setIncident(finalIncident);
      } catch (err) {
        console.error("Error fetching incident:", err);
        setError("שגיאה בטעינת האירוע: " + err.message);
      } finally {
        // pageLoading will be set to false after all data is fetched
      }
    };
    fetchIncidentAndCategoryData();
  }, [incidentId]);

  useEffect(() => {
    if (!incident) return;
    let isMounted = true;
    const fetchOtherRelatedData = async () => {
      setDataLoading(true);
      try {
        const fetchedCustomDataRecordsData = await CustomDataRecord.list();
        if (isMounted) setCustomDataRecords(fetchedCustomDataRecordsData);

        let subCatDetailsToSet = null;
        if (incident.sub_category) {
          try {
            subCatDetailsToSet = await IncidentSubCategory.get(incident.sub_category);
            if (isMounted) setIncidentSubCategoryDetails(subCatDetailsToSet);
          } catch (err) {
            console.warn("Could not load incident sub-category details:", err);
            if (isMounted) setIncidentSubCategoryDetails(null);
          }
        }

        let procedureToUse = null;
        if (incident.procedure_definition_id) {
          procedureToUse = procedures.find(p => p.id === incident.procedure_definition_id);
        } else if (subCatDetailsToSet?.procedure_id) { // Try sub-category procedure
          procedureToUse = procedures.find(p => p.id === subCatDetailsToSet.procedure_id);
        } else if (incident.category_details?.default_procedure_id) { // Fallback to category default procedure
          procedureToUse = procedures.find(p => p.id === incident.category_details.default_procedure_id);
        }

        if (procedureToUse) {
          if (isMounted) setIncidentProcedureDefinition(procedureToUse);
          // Initialize or update procedure steps if not already correctly set or if procedure changed
          if ((!incident.procedure_steps || incident.procedure_steps.length === 0 || incident.procedure_steps.length < procedureToUse.steps.length || incident.procedure_definition_id !== procedureToUse.id) && procedureToUse.steps) {
            const initialSteps = procedureToUse.steps.map(stepDef => {
              const existingStepData = (incident.procedure_steps || []).find(is => (is.step_id === stepDef.step_number?.toString()) || (is.title === stepDef.title && incident.procedure_definition_id === procedureToUse.id));

              const baseStep = {
                step_id: stepDef.step_number?.toString() || stepDef.title.replace(/\s+/g, '-').toLowerCase(),
                title: stepDef.title, description: stepDef.description, is_required: stepDef.is_required,
                step_type: stepDef.step_type, form_id: stepDef.form_id || null, document_url: stepDef.document_url || null,
                allow_multiple_executions: stepDef.allow_multiple_executions || false, // Added for multiple executions
              };

              if (baseStep.allow_multiple_executions) {
                  baseStep.executions = existingStepData?.executions || []; // Carry over existing executions
                  // Overall step completion status based on if any executions exist
                  baseStep.completed = baseStep.executions.length > 0;
                  // These might represent the *first* or just a general completed status from existingStepData if available, otherwise first execution
                  baseStep.completed_at = existingStepData?.completed_at || (baseStep.executions.length > 0 ? baseStep.executions[0].completed_at : null);
                  baseStep.completed_by = existingStepData?.completed_by || (baseStep.executions.length > 0 ? baseStep.executions[0].completed_by : null);
                  baseStep.notes = existingStepData?.notes || ''; // Keep main notes for the overall step, per-execution notes are in executions array
                  baseStep.form_submission_id = existingStepData?.form_submission_id || (baseStep.executions.length > 0 ? baseStep.executions[0].form_submission_id : null); // Keep main form_submission_id for the overall step, per-execution form submissions are in executions array
              } else {
                  // Legacy single execution logic
                  baseStep.completed = existingStepData?.completed || false;
                  baseStep.completed_at = existingStepData?.completed_at || null;
                  baseStep.completed_by = existingStepData?.completed_by || null;
                  baseStep.notes = existingStepData?.notes || '';
                  baseStep.form_submission_id = existingStepData?.form_submission_id || null;
              }
              return baseStep;
            });
            // Update incident state and potentially persist the new procedure_definition_id and steps
            if (isMounted) {
              const updatePayload = { procedure_steps: initialSteps };
              if (incident.procedure_definition_id !== procedureToUse.id) {
                updatePayload.procedure_definition_id = procedureToUse.id; // Persist the linked procedure
              }
              // Call handleUpdate without logging for this system update
              handleUpdate(updatePayload, true)
                .then(updatedIncident => {
                  // handleUpdate already setsIncident, so no need to set again here
                })
                .catch(err => console.error("Error auto-updating procedure steps:", err));
            }
          }
        } else if (incident.procedure_definition_id && !procedureToUse) {
          console.warn("Procedure definition ID set on incident, but not found in loaded procedures:", incident.procedure_definition_id);
        }

        if (isMounted) {
          // Only set the message, recipients are now dynamic based on category group
          setNotificationsOnClose(prev => ({
            ...prev,
            message: `אירוע "${incident.title || ''}" (טיקט) נסגר.\nפרטים נוספים זמינים במערכת.`
          }));
        }

      } catch (err) {
        console.error("Error fetching other related incident data:", err);
        if (isMounted) setError((prevError) => (prevError ? prevError + "\n" : "") + "שגיאה בטעינת נתונים קשורים נוספים לאירוע.");
      } finally {
        if (isMounted) setDataLoading(false);
        if (isMounted && pageLoading) setPageLoading(false);
      }
    };
    fetchOtherRelatedData();
    return () => { isMounted = false; };
  }, [incident, allResources, allResourceTypesState, procedures, users, formTemplates, allCustomDataTypesState]);

  useEffect(() => { // For log tagging dropdown
    if (selectedCustomDataTypeSlugForLog && searchCustomDataRecordForLog.trim()) {
      const searchLower = searchCustomDataRecordForLog.toLowerCase();
      // Filter from already loaded customDataRecords state
      const filtered = customDataRecords.filter(cdr =>
        cdr.custom_data_type_slug === selectedCustomDataTypeSlugForLog &&
        (
          getCustomRecordDisplayValue(cdr, cdr.custom_data_type_slug).toLowerCase().includes(searchLower) ||
          Object.values(cdr.data).some(val => typeof val === 'string' && val.toLowerCase().includes(searchLower))
        )
      );
      setFilteredCustomDataRecordsForLog(filtered.slice(0, 15)); // Limit results for performance
    } else {
      setFilteredCustomDataRecordsForLog([]);
    }
  }, [searchCustomDataRecordForLog, selectedCustomDataTypeSlugForLog, customDataRecords]);

  // Initialize summaryDraft when incident data is available
  useEffect(() => {
    if (incident) {
        setSummaryDraft(incident.summary || '');
    }
  }, [incident?.summary]);

  const handleSaveTitleAndDescription = async () => {
    if (!incident) return;
    let updated = false;
    const updatePayload = {};

    // Title can be edited directly if allowed
    if (incident.category_details?.allow_title_edit_after_creation && incident.title !== editableTitle) {
      updatePayload.title = editableTitle;
      updated = true;
    }
    // Description is now edited via modal, so this part is for the modal's save action
    if (incident.category_details?.allow_description_edit_after_creation && incident.description !== editableDescription) {
      updatePayload.description = editableDescription; // editableDescription is state for modal
      updated = true;
    }

    if (updated) {
      try {
        await handleUpdate(updatePayload, true);
        const logContent = [];
        if (updatePayload.title) logContent.push("כותרת האירוע עודכנה.");
        if (updatePayload.description) logContent.push("תיאור האירוע עודכן.");

        if (logContent.length > 0) {
          await handleSubmitLog(logContent.join(' '), [], 'incident_update');
        }
        if (updatePayload.description) setShowDescriptionModal(false); // Close modal on save
      } catch (err) { /* Error handled by handleUpdate */ }
    } else {
      // If only description was "saved" but no change, still close modal
      if (updatePayload.description === undefined && incident.description === editableDescription) {
        setShowDescriptionModal(false);
      }
    }
  };

  const handleOpenLocationDialog = () => {
    if (incident.location) {
      if (incident.location.location_id) {
        setSelectedPredefinedLocation(incident.location.location_id);
        setManualLocation({ latitude: '', longitude: '', description: '', address: '', selected_google_address: null });
      } else if (incident.location.latitude && incident.location.longitude) {
        setManualLocation({
          latitude: incident.location.latitude,
          longitude: incident.location.longitude,
          description: incident.location.description || '',
          address: incident.location.address || '',
          selected_google_address: incident.location.address ? {
            formatted_address: incident.location.address,
            latitude: incident.location.latitude,
            longitude: incident.location.longitude,
            // You might need to populate other fields here if GoogleAddressSelector expects them
            // E.g., place_id, city, etc., depending on the component's internal state management.
            // For now, assuming basic lat/lng/address is sufficient to display.
          } : null
        });
        setSelectedPredefinedLocation('');
      } else {
        // No specific location or only description, reset all
        setManualLocation({ latitude: '', longitude: '', description: '', address: '', selected_google_address: null });
        setSelectedPredefinedLocation('');
      }
    } else {
      // Incident has no location, reset all
      setManualLocation({ latitude: '', longitude: '', description: '', address: '', selected_google_address: null });
      setSelectedPredefinedLocation('');
    }
    setShowLocationDialog(true);
  };

  const handleSelectedAddressChange = (addressData) => {
    if (addressData) {
        setManualLocation({
            latitude: addressData.latitude || '',
            longitude: addressData.longitude || '',
            address: addressData.formatted_address || '',
            description: addressData.formatted_address || '', // Default description to formatted address
            selected_google_address: addressData // Store the whole object for potential future use
        });
        setSelectedPredefinedLocation(''); // Clear predefined selection
    } else {
         setManualLocation(prev => ({...prev, latitude: '', longitude: '', address: '', description: '', selected_google_address: null }));
    }
  };

  const handleLocationUpdate = async () => {
    if (!incident) return;

    let locationData = null;

    if (selectedPredefinedLocation) {
      const predefinedLoc = allLocations.find(l => l.id === selectedPredefinedLocation);
      if (predefinedLoc && (predefinedLoc.coordinates || predefinedLoc.name)) {
        locationData = {
          location_id: predefinedLoc.id,
          description: manualLocation.description || predefinedLoc.name, // Allow custom description on top of predefined
          latitude: predefinedLoc.coordinates?.latitude || null,
          longitude: predefinedLoc.coordinates?.longitude || null,
          address: predefinedLoc.address || predefinedLoc.name
        };
      }
    } else if (manualLocation.selected_google_address) {
        locationData = {
            description: manualLocation.description || manualLocation.selected_google_address.formatted_address,
            latitude: manualLocation.selected_google_address.latitude,
            longitude: manualLocation.selected_google_address.longitude,
            address: manualLocation.selected_google_address.formatted_address
        };
    } else if (manualLocation.latitude && manualLocation.longitude) {
        locationData = {
            description: manualLocation.description || `נ.צ. ${parseFloat(manualLocation.latitude).toFixed(5)}, ${parseFloat(manualLocation.longitude).toFixed(5)}`,
            latitude: parseFloat(manualLocation.latitude),
            longitude: parseFloat(manualLocation.longitude),
            address: manualLocation.address || ''
        };
    }

    if (!locationData || (!locationData.location_id && (!locationData.latitude || !locationData.longitude) && !locationData.address)) {
      alert("מיקום לא חוקי. אנא בחר מיקום מוגדר, הזן קואורדינטות או בחר כתובת.");
      return;
    }

    // Ensure description is always present if location data exists
    if (locationData && !locationData.description) {
        if (locationData.location_id && allLocations.find(l => l.id === locationData.location_id)?.name) {
            locationData.description = allLocations.find(l => l.id === locationData.location_id).name;
        } else if (locationData.address) {
            locationData.description = locationData.address;
        } else if (locationData.latitude && locationData.longitude) {
            locationData.description = `נ.צ. ${locationData.latitude.toFixed(5)}, ${locationData.longitude.toFixed(5)}`;
        } else {
            locationData.description = 'מיקום לא מוגדר';
        }
    }

    try {
      setUpdatingIncident(true);
      await handleUpdate({ location: locationData }, true); // silent update
      await handleSubmitLog(`מיקום האירוע עודכן: ${locationData.description || 'לא צוין'}.`, [], 'location_update');
      setShowLocationDialog(false);
      // Reset states after successful update and close
      setManualLocation({ latitude: '', longitude: '', description: '', address: '', selected_google_address: null });
      setSelectedPredefinedLocation('');
    } catch (error) {
      console.error("Error updating incident location:", error);
      alert("שגיאה בעדכון מיקום האירוע.");
    } finally {
      setUpdatingIncident(false);
    }
  };


  const handleAddLogEntry = async () => {
    if (!newLogEntry.trim() && taggedEntitiesForLog.length === 0) return;

    try {
      await handleSubmitLog(newLogEntry, taggedEntitiesForLog);
      setNewLogEntry('');
      setTaggedEntitiesForLog([]);
      setSelectedEntityTypeForLog('');
      setSearchEntityForLog('');
      setSelectedCustomDataTypeSlugForLog('');
      setSearchCustomDataRecordForLog('');
      setShowLogEntryModal(false);
    } catch (err) { /* Error handled by handleSubmitLog */ }
  };

  const getCustomDataTypeLabel = (slug) => {
    const cdt = allCustomDataTypesState.find(ct => ct.slug === slug);
    return cdt ? cdt.name : (slug || 'סוג דאטה');
  };

  const getCustomRecordDisplayValue = (record, typeSlug) => {
    if (!record || !record.data) return `רשומה ${record?.id?.substring(0, 6) || 'לא ידועה'}`;
    const cdt = allCustomDataTypesState.find(ct => ct.slug === typeSlug);
    if (cdt && cdt.schema_definition && cdt.schema_definition.properties) {
      const displayFieldKey = Object.keys(cdt.schema_definition.properties).find(key => ['name', 'title', 'identifier'].includes(key.toLowerCase()));
      if (displayFieldKey && record.data[displayFieldKey]) {
        return String(record.data[displayFieldKey]);
      }
    }
    return `רשומה ${record.id.substring(0, 6)}`;
  };

  const getEntityNameForTag = (type, id, slug) => {
    if (type === 'custom_data') {
      const record = customDataRecords.find(cdr => cdr.id === id);
      if (record) {
        return getCustomRecordDisplayValue(record, slug || record.custom_data_type_slug);
      }
      return `רשומת דאטה (ID: ${id.substring(0, 6)}...)`; // Cannot fetch name if not loaded.
    }
    switch (type) {
      case 'contact': return `איש קשר (ID: ${id.substring(0, 6)}...)`;
      case 'vehicle': return `רכב (ID: ${id.substring(0, 6)}...)`;
      case 'institution': return `מוסד (ID: ${id.substring(0, 6)}...)`;
      case 'resource':
      case 'resource_item':
        const resourceItem = allResources.find(r => r.id === id);
        if (resourceItem) {
          const resourceType = allResourceTypesState.find(rt => rt.id === resourceItem.resource_type_id);
          return `${resourceItem.item_identifier} (${resourceType?.name || 'לא ידוע'})`;
        }
        return `משאב (ID: ${id.substring(0, 6)}...)`;
      default: return id;
    }
  };

  const getFilteredEntitiesForLog = () => {
    // Basic entity types (contact, vehicle, institution, resource) are no longer loaded into global state
    // so cannot be filtered directly here. Only custom data records can be filtered by search.
    // This function will effectively always return empty for basic types.
    return [];
  };

  const getFormTitle = (formId) => formTemplates.find(ft => ft.id === formId)?.title || formId;

  const handleUpdateStatus = async (newStatus) => {
    if (!incident || !currentUser) return;
    const oldStatus = incident.status;
    let oldStatusText = '';
    if (oldStatus === 'open') oldStatusText = 'פתוח';
    else if (oldStatus === 'in_progress') oldStatusText = 'בטיפול';
    else if (oldStatus === 'closed') oldStatusText = 'סגור';
    else oldStatusText = oldStatus;

    try {
      setDataLoading(true);
      const updatePayload = { status: newStatus };
      let statusText = '';
      if (newStatus === 'in_progress') statusText = 'בטיפול';
      else if (newStatus === 'closed') {
        statusText = 'סגור';
        updatePayload.closed_at = new Date().toISOString();
        updatePayload.closed_by = currentUser?.id;
      } else {
        statusText = newStatus;
      }

      await handleUpdate(updatePayload, true);

      // Log status change
      const statusLogContent = `סטטוס הטיקט שונה מ-'${oldStatusText}' ל-'${statusText}'`;
      await handleSubmitLog(statusLogContent, [], 'status_change');

      // Handle specific notifications for incident closure
      if (newStatus === 'closed') {
        const categoryDetails = incident?.category_details;
        let finalRecipients = [];
        let notificationTargetDescription = 'לא נשלחה התראת סגירה אוטומטית (לא הוגדרה קבוצה/נמענים בקטגוריה).';

        if (categoryDetails?.notification_group_id) {
          const targetGroup = userGroups.find(ug => ug.id === categoryDetails.notification_group_id);
          if (targetGroup && targetGroup.members && targetGroup.members.length > 0) {
            finalRecipients = targetGroup.members;
            notificationTargetDescription = `קבוצת "${targetGroup.name}"`;
          } else if (targetGroup) {
            notificationTargetDescription = `קבוצת "${targetGroup.name}" (אך לא נמצאו חברים בקבוצה)`;
          } else {
            notificationTargetDescription = `הוגדרה קבוצה (${categoryDetails.notification_group_id}) אך היא לא נמצאה`;
          }
        }

        const closeNotificationMessage = notificationsOnClose.message.trim() !== '' ?
          notificationsOnClose.message :
          `טיקט "${incident.title}" נסגר.\nפרטים נוספים זמינים במערכת.`;

        if (finalRecipients.length > 0) {
          await sendNotification(
            finalRecipients,
            `טיקט נסגר: ${incident.title}`,
            closeNotificationMessage,
            'info',
            'medium',
            { type: 'Incident', id: incident.id },
            createPageUrl(`ManageIncidentPage?id=${incident.id}`)
          );

          const notificationLogEntryContent = `נשלחה התראת סגירה ל: ${notificationTargetDescription}.`;
          await handleSubmitLog(notificationLogEntryContent, [], 'system_action');

          await handleUpdate({
            notifications_sent: [...(incident.notifications_sent || []), {
              timestamp: new Date().toISOString(),
              recipients: finalRecipients, // Store actual user_ids sent to
              message: closeNotificationMessage,
              title: `טיקט נסגר: ${incident.title}`
            }]
          }, true); // silent update for this internal meta-data
        } else {
           const noNotificationLogEntryContent = `לא נשלחה התראת סגירה אוטומטית: ${notificationTargetDescription}.`;
           await handleSubmitLog(noNotificationLogEntryContent, [], 'system_action');
        }
        setShowCloseIncidentModal(false);
      }
    } catch (err) {
      console.error("Error updating incident status:", err);
      alert("שגיאה בעדכון סטטוס הטיקט.");
    } finally {
      setDataLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!incident) return;
    setIsGeneratingSummary(true);
    const logsSummary = (incident.logs || []).map(log => `${getUserName(log.user_id)} (${formatDate(log.timestamp)}): ${log.content}`).join('\n');
    
    const prompt = `צור סיכום אירוע מפורט בעברית עבור האירוע הבא:\n` +
      `כותרת: ${incident.title}\n` +
      `קטגוריה: ${incident.category_details?.name || incident.category} - ${incidentSubCategoryDetails?.name || incident.sub_category_name || incident.sub_category}\n` +
      `תיאור ראשוני: ${incident.description}\n` +
      `דווח ע"י: ${getUserName(incident.reporter_id)} בתאריך ${formatDate(incident.created_date)}\n` +
      `מיקום: ${incident.location?.description || 'לא צוין'}\n` +
      `יומן אירועים:\n${logsSummary}\n` +
      `אנא סכם את מהלך האירוע, פעולות שננקטו, ותוצאה סופית. אם האירוע עדיין פתוח, ציין זאת.`;

    try {
      const llmResponse = await InvokeLLM({ prompt: prompt });
      setSummaryDraft(llmResponse || "לא הופק סיכום.");
    } catch (llmError) {
      console.error("Error generating summary with LLM:", llmError);
      setSummaryDraft("שגיאה ביצירת סיכום אוטומטי. אנא נסה שוב או הזן סיכום ידני.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleSaveSummary = async () => {
    if (!summaryDraft.trim() || !incident) return;
    try {
      await handleUpdate({ summary: summaryDraft }, true);
      await handleSubmitLog('סיכום האירוע עודכן/נוסף.', [], 'summary_update');
      setShowGenerateSummaryModal(false);
    } catch (err) { /* Error handled by handleUpdate */ }
  };

  const isComponentEnabled = (componentName) => {
    if (!incident || !incident.category_details || !incident.category_details.component_config) {
      return true; // Default to true if config not loaded yet, or false if prefer strict disabled state
    }
    return incident.category_details.component_config[`${componentName}_enabled`] !== false;
  };

  const isComponentRequired = (componentName) => {
    if (!incident || !incident.category_details || !incident.category_details.component_config) {
      return false;
    }
    return !!incident.category_details.component_config[`${componentName}_required`];
  };

  const handleSendCustomAlert = async () => {
    if (alertRecipients.length === 0 || !alertMessage.trim()) {
      alert("יש לבחור נמענים ולכתוב תוכן להתראה.");
      return;
    }
    if (!incident) return;

    const finalAlertTitle = alertTitle.trim() || `התראה בנוגע לאירוע: ${incident.title}`;
    const success = await sendNotification(
      alertRecipients,
      finalAlertTitle,
      alertMessage,
      'custom', // type
      'high',   // priority (or allow user to choose)
      { type: 'Incident', id: incident.id },
      createPageUrl(`ManageIncidentPage?id=${incident.id}`)
    );

    if (success) {
      await handleSubmitLog(`התראה מותאמת נשלחה ל: ${alertRecipients.map(id => getUserName(id)).join(', ')}. תוכן: "${alertMessage}"`, [], 'custom_alert_sent');
      alert("ההתראה נשלחה בהצלחה!");
      setShowSendAlertModal(false);
      setAlertRecipients([]);
      setAlertTitle('');
      setAlertMessage('');
    } else {
      alert("שגיאה בשליחת ההתראה. בדוק את הלוגים לפרטים נוספים.");
    }
  };


  if (pageLoading) return <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>טוען נתוני אירוע...</div>;
  if (error && !incident) return <div className="p-8 text-center text-red-600 clay-card">{error} <Button onClick={() => navigate(createPageUrl("Incidents"))} className="mt-4 clay-button">חזור לרשימה</Button></div>;
  if (!incident) return <div className="p-8 text-center clay-card">לא נמצא אירוע. <Button onClick={() => navigate(createPageUrl("Incidents"))} className="mt-4 clay-button">חזור לרשימה</Button></div>;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open': return <Badge variant="destructive" className="bg-red-100 text-red-700">פתוח</Badge>;
      case 'in_progress': return <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">בטיפול</Badge>;
      case 'closed': return <Badge variant="secondary" className="bg-green-100 text-green-700">סגור</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const availableIncidentStatuses = ['open', 'in_progress', 'closed'];

  // NEW: renderCloseIncidentModalContent function
  const renderCloseIncidentModalContent = () => {
    const categoryDetails = incident?.category_details;
    let notificationGroupInfo = "התראת סגירה לא תישלח אוטומטית (לא הוגדרה קבוצת התראות בקטגוריית האירוע).";
    if (categoryDetails?.notification_group_id) {
      const targetGroup = userGroups.find(ug => ug.id === categoryDetails.notification_group_id);
      if (targetGroup) {
        notificationGroupInfo = `התראת סגירה תישלח אוטומטית לקבוצת: "${targetGroup.name}".`;
        if (!targetGroup.members || targetGroup.members.length === 0) {
          notificationGroupInfo += " (שימו לב: לקבוצה זו אין כרגע חברים).";
        }
      } else {
        notificationGroupInfo = `לא נמצאה קבוצה עם מזהה: ${categoryDetails.notification_group_id} (שהוגדרה בקטגוריה). התראת סגירה לא תישלח אוטומטית.`;
      }
    }

    return (
      <div className="py-4 space-y-3">
        {!incident?.summary && <p className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded-md flex items-center"><HelpCircle size={16} className="ml-2" />לא נוצר סיכום לטיקט. מומלץ ליצור סיכום לפני סגירה.</p>}
        {incident?.procedure_steps?.some(s => s.is_required && !s.completed) && <p className="text-sm text-red-700 bg-red-50 p-2 rounded-md flex items-center"><AlertTriangle size={16} className="ml-2" />ישנם שלבי חובה בסדר הפעולות שטרם הושלמו!</p>}
        
        <p className="text-sm text-blue-700 bg-blue-50 p-2 rounded-md flex items-center">
          <Info size={16} className="ml-2" /> {notificationGroupInfo}
        </p>
        
        <div>
          <Label className="text-sm font-medium block mb-1">הודעת סגירה (אופציונלי, אם ריק תישלח הודעה סטנדרטית):</Label>
          <Textarea
            value={notificationsOnClose.message}
            onChange={(e) => setNotificationsOnClose(prev => ({ ...prev, message: e.target.value }))}
            className="clay-input text-sm min-h-[80px]"
            placeholder={`טיקט "${incident?.title || ''}" נסגר. פרטים נוספים זמינים במערכת.`}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-stone-200" dir="rtl">
      <header className="sticky top-0 z-30 bg-white shadow-md p-3 border-b">
        <div className="container mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-3 flex-grow min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("Incidents"))} aria-label="חזור לרשימת אירועים">
              <ChevronRightIcon className="w-6 h-6 ml-2 text-neutral-600 hover:text-neutral-800" />
            </Button>
            {incident.category_details?.allow_title_edit_after_creation ? (
              <Input
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                onBlur={handleSaveTitleAndDescription}
                className="text-xl font-bold text-primary-700 border-0 shadow-none focus:ring-0 p-0 h-auto clay-input-editable flex-grow"
                placeholder="הכנס כותרת לאירוע..."
              />
            ) : (
              <h1 className="text-xl font-bold text-primary-700 truncate" title={incident.title}>
                {incident.title}
              </h1>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Select value={incident.status} onValueChange={(newStatus) => newStatus !== incident.status && (newStatus === 'closed' ? setShowCloseIncidentModal(true) : handleUpdateStatus(newStatus))}>
              <SelectTrigger className="clay-select w-[150px] text-sm font-medium">
                <SelectValue placeholder="שנה סטטוס..." />
              </SelectTrigger>
              <SelectContent>
                {availableIncidentStatuses.map(statusOption => (
                  <SelectItem key={statusOption} value={statusOption}>
                    {statusOption === 'open' && 'פתוח'}
                    {statusOption === 'in_progress' && 'בטיפול'}
                    {statusOption === 'closed' && 'סגור'}
                    {!['open', 'in_progress', 'closed'].includes(statusOption) && statusOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getStatusBadge(incident.status)}

            {/* Main Action Buttons - Outside Plus Menu */}
            {incident.status !== 'closed' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLogEntryModal(true)}
                  className="clay-button text-sm"
                  title="הוסף ליומן"
                >
                  <MessageSquare className="w-4 h-4 ml-1" />
                  יומן
                </Button>

                {incident.category_details?.allow_description_edit_after_creation && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDescriptionModal(true)}
                    className="clay-button text-sm"
                    title={incident.description ? 'ערוך תיאור' : 'הוסף תיאור'}
                  >
                    <FilePenLine className="w-4 h-4 ml-1" />
                    {incident.description ? 'ערוך תיאור' : 'הוסף תיאור'}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSendAlertModal(true)}
                  className="clay-button text-sm"
                  title="שלח התראה מותאמת"
                >
                  <BellRing className="w-4 h-4 ml-1" />
                  התראה
                </Button>
              </>
            )}

            {/* Plus Menu for Secondary Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="clay-button">
                  <PlusCircle className="w-5 h-5" />
                  <span className="sr-only">פעולות נוספות</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 clay-card">
                <DropdownMenuLabel>פעולות נוספות</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setShowIncidentDetailsModal(true)} className="flex items-center gap-2">
                  <Info className="w-4 h-4" /> הצג פרטי אירוע
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { setSummaryDraft(incident.summary || ''); setShowGenerateSummaryModal(true);}} className="flex items-center gap-2">
                  <BookText className="w-4 h-4" /> {incident.summary ? 'הצג/עדכן סיכום' : 'צור סיכום'}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onSelect={() => handleExportToPDF()} className="flex items-center gap-2 text-green-700 hover:!bg-green-50">
                  <Download className="w-4 h-4" /> ייצוא ל-PDF
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => handleShareLink()} className="flex items-center gap-2 text-purple-700 hover:!bg-purple-50">
                  <LinkIcon className="w-4 h-4" /> שתף בלינק
                </DropdownMenuItem>

              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4 md:p-6">
        <div className="flex flex-col lg:flex-row-reverse gap-6">
          {/* Left Column (now on the right in RTL) - Map and Quick Actions */}
          <div className="lg:w-1/3 space-y-6 sticky top-20 self-start">

            {/* NEW: Integrate IncidentMapAndNearbyData component */}
            <IncidentMapAndNearbyData
              incident={incident}
              allCustomDataTypes={allCustomDataTypesState}
              allCustomDataRecords={customDataRecords}
              allLocations={allLocations}
              onOpenLocationEditModal={handleOpenLocationDialog} // Use new dialog handler
              isLocationComponentEnabled={isComponentEnabled('location')}
              isIncidentClosed={incident?.status === 'closed'}
              incidentCategoryDetails={incidentCategories?.find(cat => cat.id === incident?.category)}
            />
          </div>

          {/* Right Column (now on the left in RTL) - Main Incident Details */}
          <div className="lg:w-2/3 space-y-6">
            {dataLoading && !pageLoading && <div className="text-center p-4 text-neutral-500">טוען נתונים נוספים...</div>}
            {error && !pageLoading && <div className="p-4 text-center text-red-500 clay-card mb-4">{error.split("\n")[0]}</div>}

            {isComponentEnabled('procedures') && incident?.procedure_definition_id && (
              <IncidentProcedureManager
                incidentId={incident.id}
                incidentTitle={incident.title}
                incidentStatus={incident.status}
                procedureDefinition={incidentProcedureDefinition} // The full definition from Procedure entity
                procedureSteps={incident.procedure_steps || []} // The actual steps on the incident
                formTemplates={formTemplates}
                customDataTypes={allCustomDataTypesState}
                currentUser={currentUser}
                handleIncidentUpdate={handleIncidentUpdateForProcedureManager}
                handleSubmitLog={handleSubmitLogForProcedureManager}
                parentLoading={dataLoading || pageLoading}
                onProcedureStatusUpdate={handleProcedureStatusUpdate} // Pass the new handler
              />
            )}

            {isComponentEnabled('procedures') && !incident?.procedure_definition_id && (
              <Card className="clay-card">
                <CardHeader><CardTitle className="flex items-center"><ListChecksIcon className="w-5 h-5 ml-2 text-primary-600" />סדר פעולות טיפול</CardTitle></CardHeader>
                <CardContent><p className="text-neutral-500 text-center py-4">לא הוגדר סדר פעולות טיפול לקטגוריה זו או לטיקט זה.</p></CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-1 gap-6"> {/* Changed to 1 col */}
              <Card className="clay-card">
                <CardHeader>
                  <CardTitle className="flex items-center"><MessageSquare className="w-5 h-5 ml-2 text-indigo-600" />יומן אירוע</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {incident.logs && incident.logs.length > 0 ? (
                    <ScrollArea className="max-h-60">
                      <div className="space-y-3">
                        {incident.logs.slice().reverse().map((log, index) => (
                          <div key={index} className="clay-card bg-white p-2.5 border rounded-md shadow-sm">
                            <div className="flex justify-between items-center text-xs text-neutral-500 mb-1">
                              <span>{formatDate(log.timestamp)}</span>
                              <span>{getUserName(log.user_id)}</span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{log.content}</p>
                            {log.tagged_entities && log.tagged_entities.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {log.tagged_entities.map((tag, tIndex) => (
                                  <Badge key={tIndex} variant="outline" className="text-xs">
                                    <LinkIcon size={12} className="ml-1" /> {getEntityNameForTag(tag.type, tag.id, tag.custom_data_slug)}
                                    {tag.type === 'custom_data' && tag.custom_data_slug && allCustomDataTypesState.find(cdt => cdt.slug === tag.custom_data_slug) && (
                                      <span className="text-2xs text-neutral-500 ml-1">({allCustomDataTypesState.find(cdt => cdt.slug === tag.custom_data_slug).name})</span>
                                    )}
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
            </div>

            {incident.notifications_sent && incident.notifications_sent.length > 0 && (
              <Card className="clay-card">
                <CardHeader>
                  <CardTitle className="flex items-center"><Send className="w-5 h-5 ml-2 text-primary-600" />התראות שנשלחו</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-1 text-xs max-h-32 overflow-y-auto">
                  {incident.notifications_sent.map((notif, idx) => (
                    <div key={idx} className="p-1.5 border rounded-md bg-neutral-50">
                      <p><strong>נשלח ב:</strong> {formatDate(notif.timestamp)}</p>
                      <p><strong>נמענים:</strong> {notif.recipients?.map(id => getUserName(id)).join(', ') || 'לא צוינו'}</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-2xs"><strong>הודעה:</strong> {notif.message}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* MODALS SECTION */}

      {/* NEW: Incident Details Modal */}
      <Dialog open={showIncidentDetailsModal} onOpenChange={setShowIncidentDetailsModal}>
        <DialogContent className="clay-card max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center"><FileText className="w-5 h-5 ml-2 text-primary-600" />פרטי אירוע</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] p-1">
            <div className="pt-4 space-y-3 text-sm">
              <div><strong className="block text-xs text-neutral-500">קטגוריה:</strong> {incident?.category_details?.name || incident?.category}</div>
              <div><strong className="block text-xs text-neutral-500">אופי אירוע:</strong> {incidentSubCategoryDetails?.name || incident?.sub_category_name || incident?.sub_category || '-'}</div>
              <div><strong className="block text-xs text-neutral-500">תאריך יצירה:</strong> {formatDate(incident?.created_date)}</div>
              <div><strong className="block text-xs text-neutral-500">דווח ע"י (משתמש מערכת):</strong> {getUserName(incident?.reporter_id)}</div>
              {incident?.field_agent_id && <div><strong className="block text-xs text-neutral-500">איש שטח פותח:</strong> {getUserName(incident.field_agent_id)}</div>}
              {incident?.shift_id && <div><strong className="block text-xs text-neutral-500">משמרת ID:</strong> <Badge variant="outline" className="text-xs">{incident.shift_id.substring(0, 8)}...</Badge></div>}
              {incident?.closed_at && <div><strong className="block text-xs text-neutral-500">תאריך סגירה:</strong> {formatDate(incident.closed_at)}</div>}
              {incident?.closed_by && <div><strong className="block text-xs text-neutral-500">נסגר ע״י:</strong> {getUserName(incident.closed_by)}</div>}
              {incident?.description && (
                <div className="mt-3">
                  <strong className="block text-xs text-neutral-500 mb-1">תיאור האירוע:</strong>
                  <div className="bg-neutral-50 p-2.5 rounded-md text-sm whitespace-pre-wrap max-h-28 overflow-y-auto border border-neutral-200">
                    {incident.description}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4">
            <Button variant="outline" className="clay-button" onClick={() => setShowIncidentDetailsModal(false)}>סגור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Description Edit Modal */}
      {incident && incident.category_details?.allow_description_edit_after_creation && (
        <Dialog open={showDescriptionModal} onOpenChange={setShowDescriptionModal}>
          <DialogContent className="clay-card max-w-lg">
            <DialogHeader>
              <DialogTitle>{incident?.description ? 'עריכת תיאור אירוע' : 'הוספת תיאור לאירוע'}</DialogTitle>
              <DialogDescription>ספק תיאור מפורט של האירוע.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={editableDescription}
                onChange={(e) => setEditableDescription(e.target.value)}
                placeholder="פרט את מהלך האירוע, מה קרה, מי מעורב וכו'..."
                className="clay-input min-h-[150px]"
                rows={6}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" className="clay-button" onClick={() => { setShowDescriptionModal(false); setEditableDescription(incident?.description || ''); }}>ביטול</Button>
              <Button className="clay-button bg-primary-500 hover:bg-primary-600 text-white" onClick={handleSaveTitleAndDescription}>שמור תיאור</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Log Entry Modal */}
      <Dialog open={showLogEntryModal} onOpenChange={setShowLogEntryModal}>
        <DialogContent className="clay-card max-w-xl">
          <DialogHeader>
            <DialogTitle>הוספת רשומת יומן</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <Textarea
              value={newLogEntry}
              onChange={(e) => setNewLogEntry(e.target.value)}
              placeholder="תוכן הרשומה..."
              className="clay-input min-h-[100px]"
            />
            <div>
              <Label className="text-sm font-medium mb-2 block">תייג רשומת דאטה (אופציונלי):</Label>
              <div className="space-y-3 p-3 border rounded-lg clay-card bg-neutral-50">
                <Select 
                  value={selectedCustomDataTypeSlugForLog} 
                  onValueChange={(slug) => {
                    setSelectedCustomDataTypeSlugForLog(slug);
                    setSearchCustomDataRecordForLog(''); // Reset search on type change
                    setFilteredCustomDataRecordsForLog([]);
                  }}
                >
                  <SelectTrigger className="clay-select text-sm"><SelectValue placeholder="בחר סוג דאטה לתיוג..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>ללא בחירת סוג דאטה</SelectItem> {/* Changed value to empty string */}
                    {allCustomDataTypesState.map(cdt => (
                      <SelectItem key={cdt.slug} value={cdt.slug}>{cdt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedCustomDataTypeSlugForLog && (
                  <>
                    <Input
                      type="text"
                      value={searchCustomDataRecordForLog}
                      onChange={(e) => setSearchCustomDataRecordForLog(e.target.value)}
                      placeholder={`חפש רשומה מסוג "${getCustomDataTypeLabel(selectedCustomDataTypeSlugForLog)}"...`}
                      className="clay-input text-sm"
                    />
                    {searchCustomDataRecordForLog.trim() && (
                      <ScrollArea className="max-h-40 border rounded-md clay-card p-1 bg-white mt-2">
                        {dataLoading && <p className="text-xs text-neutral-500 p-2 text-center">טוען רשומות...</p>}
                        {!dataLoading && filteredCustomDataRecordsForLog.map(record => (
                          <div key={record.id}
                            className="p-2.5 text-sm hover:bg-primary-50 cursor-pointer rounded-md border-b last:border-b-0"
                            onClick={() => {
                              const newTag = { type: 'custom_data', id: record.id, custom_data_slug: record.custom_data_type_slug };
                              // Allow only one custom data tag for simplicity, replacing any existing
                              setTaggedEntitiesForLog([newTag]); 
                              setSearchCustomDataRecordForLog('');
                              setFilteredCustomDataRecordsForLog([]); // Clear results after selection
                            }}>
                            {getEntityNameForTag('custom_data', record.id, record.custom_data_type_slug)}
                          </div>
                        ))}
                        {!dataLoading && filteredCustomDataRecordsForLog.length === 0 && searchCustomDataRecordForLog.trim().length > 0 && 
                          <p className="text-xs text-neutral-500 p-2 text-center">לא נמצאו רשומות תואמות.</p>}
                        {!dataLoading && filteredCustomDataRecordsForLog.length === 0 && searchCustomDataRecordForLog.trim().length === 0 && selectedCustomDataTypeSlugForLog &&
                          <p className="text-xs text-neutral-500 p-2 text-center">התחל לחפש כדי לראות תוצאות.</p>}
                      </ScrollArea>
                    )}
                  </>
                )}
              </div>

              {taggedEntitiesForLog.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium mb-1">תיוגים שנוספו:</p>
                  <div className="flex flex-wrap gap-2">
                    {taggedEntitiesForLog.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-sm py-1 px-2 clay-badge">
                        <Database size={14} className="ml-1.5 text-indigo-500"/>
                        {getEntityNameForTag(tag.type, tag.id, tag.custom_data_slug)}
                        <span className="text-xs text-neutral-500 ml-1">({getCustomDataTypeLabel(tag.custom_data_slug)})</span>
                        <button 
                          onClick={() => setTaggedEntitiesForLog(taggedEntitiesForLog.filter((_, i) => i !== idx))} 
                          className="mr-1.5 text-muted-foreground hover:text-destructive p-0.5 rounded-full hover:bg-red-100"
                          aria-label="הסר תיוג"
                        >
                          <X size={14} />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" className="clay-button" onClick={() => {
              setShowLogEntryModal(false);
              // Reset log tagging states
              setSelectedCustomDataTypeSlugForLog('');
              setSearchCustomDataRecordForLog('');
              setTaggedEntitiesForLog([]);
            }}>ביטול</Button>
            <Button className="clay-button bg-primary-500 hover:bg-primary-600 text-white" onClick={handleAddLogEntry}>שמור רשומה</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Summary Modal (Modified) */}
      <Dialog open={showGenerateSummaryModal} onOpenChange={setShowGenerateSummaryModal}>
        <DialogContent className="clay-card max-w-xl">
          <DialogHeader>
            <DialogTitle>{incident?.summary ? 'ערוך סיכום אירוע' : 'צור סיכום אירוע'}</DialogTitle>
             <DialogDescription>
                {incident?.summary ? "ערוך את הסיכום הקיים או צור סיכום חדש בעזרת AI." : "הזן סיכום ידני או השתמש ב-AI ליצירת טיוטה."}
             </DialogDescription>
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
              className="clay-button w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              onClick={handleGenerateSummary}
              disabled={isGeneratingSummary}
            >
              {isGeneratingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {isGeneratingSummary ? "מייצר סיכום..." : "יצירת סיכום אוטומטי (טיוטה)"}
            </Button>
          </div>
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" className="clay-button" onClick={() => { setShowGenerateSummaryModal(false); setSummaryDraft(incident?.summary || ''); }}>ביטול</Button>
            <Button className="clay-button bg-primary-500 hover:bg-primary-600 text-white" onClick={handleSaveSummary} disabled={!summaryDraft.trim()}>
              <Save className="w-4 h-4 ml-1" /> שמור סיכום
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCloseIncidentModal} onOpenChange={setShowCloseIncidentModal}>
        <DialogContent className="clay-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center"><ShieldCheck className="w-6 h-6 ml-2 text-red-500" />סגירת טיקט</DialogTitle>
            <DialogDescription>האם אתה בטוח שברצונך לסגור את הטיקט? פעולה זו תשנה את סטטוס הטיקט ל'סגור'.</DialogDescription>
          </DialogHeader>
          {renderCloseIncidentModalContent()} {/* Use the new function to render dynamic content */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" className="clay-button" onClick={() => setShowCloseIncidentModal(false)}>ביטול</Button>
            <Button className="clay-button bg-red-500 hover:bg-red-600 text-white" onClick={() => handleUpdateStatus('closed')}>
              <ThumbsUp className="w-4 h-4 ml-1" /> אישור וסגירת טיקט
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Location Dialog (New) */}
      {isComponentEnabled('location') && (
        <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
          <DialogContent className="clay-card max-w-xl">
            <DialogHeader>
              <DialogTitle>הגדר/עדכן מיקום אירוע</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="predefinedLocation">בחר מיקום מוגדר מראש (אופציונלי)</Label>
                <Select
                  value={selectedPredefinedLocation}
                  onValueChange={(value) => {
                    setSelectedPredefinedLocation(value);
                    if (value) { // If a predefined location is selected, clear manual/address input
                      setManualLocation({ latitude: '', longitude: '', description: '', address: '', selected_google_address: null });
                    }
                  }}
                  disabled={!!manualLocation.selected_google_address?.formatted_address || (!!manualLocation.latitude && !!manualLocation.longitude)} // Disable if address or coords are being input
                >
                  <SelectTrigger id="predefinedLocation" className="clay-select">
                    <SelectValue placeholder="ללא מיקום מוגדר (הזן ידנית או חפש כתובת)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>ללא מיקום מוגדר (הזן ידנית או חפש כתובת)</SelectItem> {/* Changed value to empty string */}
                    {allLocations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} ({loc.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPredefinedLocation && allLocations.find(l => l.id === selectedPredefinedLocation)?.policy && (
                  <p className="text-xs text-neutral-500 mt-1 bg-neutral-100 p-1 rounded">
                    הנחיות למיקום: {allLocations.find(l => l.id === selectedPredefinedLocation)?.policy}
                  </p>
                )}
              </div>

              <div className="text-center my-2 text-sm text-neutral-500">- או -</div>

              <div>
                <GoogleAddressSelector
                  value={manualLocation.selected_google_address}
                  onChange={handleSelectedAddressChange}
                  placeholder="חפש כתובת בגוגל..."
                  label="חיפוש כתובת"
                  disabled={!!selectedPredefinedLocation} // Disable if predefined location is selected
                />
              </div>

              {(!selectedPredefinedLocation && !manualLocation.selected_google_address?.formatted_address) && (
                <>
                  <div className="text-center my-2 text-sm text-neutral-500">- או הזן קואורדינטות ידנית -</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="latitude">קו רוחב (Latitude)</Label>
                      <Input
                        id="latitude"
                        type="number"
                        placeholder="לדוגמה: 32.0853"
                        value={manualLocation.latitude}
                        onChange={(e) => {
                            setManualLocation(prev => ({ ...prev, latitude: e.target.value, address: '', selected_google_address: null }));
                            setSelectedPredefinedLocation('');
                        }}
                        className="clay-input"
                        disabled={!!selectedPredefinedLocation || !!manualLocation.selected_google_address?.formatted_address}
                      />
                    </div>
                    <div>
                      <Label htmlFor="longitude">קו אורך (Longitude)</Label>
                      <Input
                        id="longitude"
                        type="number"
                        placeholder="לדוגמה: 34.7818"
                        value={manualLocation.longitude}
                        onChange={(e) => {
                            setManualLocation(prev => ({ ...prev, longitude: e.target.value, address: '', selected_google_address: null }));
                            setSelectedPredefinedLocation('');
                        }}
                        className="clay-input"
                        disabled={!!selectedPredefinedLocation || !!manualLocation.selected_google_address?.formatted_address}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="locationDescription">תיאור נוסף למיקום (אופציונלי)</Label>
                <Input
                  id="locationDescription"
                  placeholder="לדוגמה: קומה 3, ליד המעלית"
                  value={manualLocation.description}
                  onChange={(e) => setManualLocation(prev => ({ ...prev, description: e.target.value }))}
                  className="clay-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLocationDialog(false)} className="clay-button">ביטול</Button>
              <Button onClick={handleLocationUpdate} className="clay-button bg-primary-100 text-primary-700" disabled={updatingIncident}>
                {updatingIncident && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                שמור מיקום
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {showSendAlertModal && (
        <Dialog open={showSendAlertModal} onOpenChange={setShowSendAlertModal}>
          <DialogContent className="max-w-lg clay-card">
            <DialogHeader>
              <DialogTitle>שליחת התראה מותאמת אישית</DialogTitle>
              <DialogDescription>בחר נמענים וכתוב את תוכן ההתראה.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3 max-h-[60vh] overflow-y-auto">
              <div>
                <Label htmlFor="alertTitle">כותרת ההתראה (אופציונלי)</Label>
                <Input
                  id="alertTitle"
                  value={alertTitle}
                  onChange={(e) => setAlertTitle(e.target.value)}
                  placeholder={`התראה בנוגע לאירוע: ${incident?.title || ''}`}
                  className="clay-input"
                />
              </div>
              <div>
                <Label htmlFor="alertMessage" className="font-medium">תוכן ההתראה <span className="text-red-500">*</span></Label>
                <Textarea
                  id="alertMessage"
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  placeholder="פרט את ההודעה..."
                  className="clay-input h-24"
                />
              </div>
              <div>
                <Label className="font-medium block mb-2">בחר נמענים <span className="text-red-500">*</span></Label>
                <ScrollArea className="h-40 border rounded-md p-2 clay-card bg-neutral-50">
                  {users.map(user => (
                    <div key={user.id} className="flex items-center space-x-2 space-x-reverse mb-1.5 p-1.5 rounded hover:bg-neutral-100">
                      <Checkbox
                        id={`recipient-${user.id}`}
                        checked={alertRecipients.includes(user.id)}
                        onCheckedChange={(checked) => {
                          setAlertRecipients(prev =>
                            checked ? [...prev, user.id] : prev.filter(id => id !== user.id)
                          );
                        }}
                        className="clay-checkbox"
                      />
                      <Label htmlFor={`recipient-${user.id}`} className="text-sm cursor-pointer">{user.full_name} ({user.email})</Label>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline" className="clay-button">ביטול</Button></DialogClose>
              <Button onClick={handleSendCustomAlert} className="clay-button bg-amber-500 hover:bg-amber-600 text-white" disabled={alertRecipients.length === 0 || !alertMessage.trim()}>
                <Send className="w-4 h-4 ml-2" /> שלח התראה
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}

// Add the new handler functions before the export
const handleExportToPDF = () => {
  // TODO: Implement PDF export functionality
  // This could use a PDF generation library like jsPDF or html2pdf
  // Or send data to a backend service that generates PDFs
  alert("ייצוא ל-PDF יימומש בקרוב");
};

const handleShareLink = () => {
  // Copy current page URL to clipboard
  const currentUrl = window.location.href;
  navigator.clipboard.writeText(currentUrl).then(() => {
    alert("קישור האירוע הועתק ללוח");
  }).catch(err => {
    console.error("Error copying link:", err);
    // Fallback - show the URL in a prompt
    prompt("העתק את הקישור:", currentUrl);
  });
};
