
import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { FormTemplate } from '@/api/entities';
import { FormSubmission } from '@/api/entities';
import { CustomDataType } from '@/api/entities';
import { CustomDataRecord } from '@/api/entities';
import { Role } from '@/api/entities';
import { Shift } from '@/api/entities'; // Add Shift import
import { Notification } from '@/api/entities'; // Add Notification import
import { createPageUrl } from '@/utils'; // Add utils import
import {
  CheckSquare, Circle, PlayCircle, Download, ListChecks, ClipboardEdit, Edit, Eye, Database, AlertTriangle, Save, FileText,
  ShieldCheck, BellRing, Send // Add BellRing and Send icons
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import FormViewer from '@/components/forms/FormViewer';
import CustomDataRecordSelector from '@/components/forms/CustomDataRecordSelector';

// Helper to format dates (can be moved to a utils file if used elsewhere)
const formatDate = (dateString) => {
  if (!dateString) return 'לא צוין';
  const date = new Date(dateString);
  return `${date.toLocaleDateString('he-IL')} ${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
};

export default function IncidentProcedureManager({
  incidentId,
  incidentTitle,
  incidentStatus,
  procedureDefinition, // The full procedure definition object
  procedureSteps, // The current steps on the incident object (with completion data)
  formTemplates,
  customDataTypes,
  currentUser,
  handleIncidentUpdate, // Async function (updateData, silent = false) => Promise<updatedIncident>
  handleSubmitLog,      // Async function (content, taggedEntities = [], logType = 'manual_entry') => Promise<void>
  parentLoading = false, // Indicates if parent page is loading other data
  onProcedureStatusUpdate // New prop to signal status change to parent (ManageIncidentPage)
}) {
  const [currentSteps, setCurrentSteps] = useState([]);
  const [showCompleteStepModal, setShowCompleteStepModal] = useState(null); // { stepId, executionId? }
  const [stepCompletionNotes, setStepCompletionNotes] = useState('');
  const [showViewFormModal, setShowViewFormModal] = useState(null); // { formTemplateId, stepId, executionId?, existingSubmissionId? }
  const [showSelectRecordModal, setShowSelectRecordModal] = useState(null); // { stepId, executionId?, targetDataTypeSlug, currentRecordId? }

  // New state for temporary selection in 'selection' step type
  const [selectedOptionsForSteps, setSelectedOptionsForSteps] = useState({});
  // NEW: Current user's roles and all roles for role name lookup
  const [userRoles, setUserRoles] = useState([]);
  const [allRoles, setAllRoles] = useState([]);

  const [internalLoading, setInternalLoading] = useState(false);

  // Derived state to check if all required steps are completed
  const allRequiredStepsCompleted = currentSteps.every(step => !step.is_required || step.completed);

  // NEW: Add state for notification functionality
  const [showNotifyDialog, setShowNotifyDialog] = useState(null); // { stepId, allowedRoles, eligibleUsers }
  const [notificationMessage, setNotificationMessage] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedNotificationUsers, setSelectedNotificationUsers] = useState([]);
  const [sendingNotification, setSendingNotification] = useState(false);

  // NEW: Load user roles and all roles
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const rolesData = await Role.list();
        setAllRoles(rolesData || []);

        if (currentUser && currentUser.roles) {
          setUserRoles(currentUser.roles);
        }
      } catch (error) {
        console.error('Error loading roles:', error);
      }
    };
    loadRoles();
  }, [currentUser]);

  // NEW: Load current shift users when component mounts
  useEffect(() => {
    const loadCurrentShiftUsers = async () => {
      try {
        // Get current active shifts
        const shifts = await Shift.list();
        const currentTime = new Date();

        // Find active shifts (current time is between start and end time)
        const activeShifts = shifts.filter(shift => {
          const startTime = new Date(shift.start_time);
          const endTime = new Date(shift.end_time);
          return currentTime >= startTime && currentTime <= endTime && shift.status === 'active';
        });

        // Get all users from active shifts
        const shiftUsers = [];
        for (const shift of activeShifts) {
          if (shift.staff && Array.isArray(shift.staff)) {
            shiftUsers.push(...shift.staff);
          }
        }

        // Get unique user IDs
        const uniqueUserIds = [...new Set(shiftUsers.map(staff => staff.user_id).filter(Boolean))];

        // Load user details
        const users = await Promise.all(
          uniqueUserIds.map(async (userId) => {
            try {
              return await User.get(userId);
            } catch (error) {
              console.warn(`Failed to load user ${userId}:`, error);
              return null;
            }
          })
        );

        setAvailableUsers(users.filter(Boolean));
      } catch (error) {
        console.error('Error loading current shift users:', error);
        setAvailableUsers([]);
      }
    };

    loadCurrentShiftUsers();
  }, []);

  useEffect(() => {
    // Sync currentSteps with procedureSteps from props, potentially enriching with definition details
    if (procedureSteps && procedureDefinition?.steps) {
      const enrichedSteps = procedureSteps.map(incidentStep => {
        const definitionStep = procedureDefinition.steps.find(
          ds => ds.step_number?.toString() === incidentStep.step_id || ds.title === incidentStep.title // Match by number or title
        );
        return {
          ...definitionStep, // Base properties from definition (like full description, step_type, etc.)
          ...incidentStep    // Overwrite with incident-specific data (completion, notes, etc.)
        };
      });
      setCurrentSteps(enrichedSteps);
    } else {
      setCurrentSteps(procedureSteps || []);
    }
  }, [procedureSteps, procedureDefinition]);

  const getUserName = (userId) => { // Simplified for this component, assumes currentUser is passed correctly
    if (!userId) return 'לא ידוע';
    if (currentUser && userId === currentUser.id) return currentUser.full_name + " (אני)";
    // In a real app, you might need to fetch user details if not `currentUser`
    const user = availableUsers.find(u => u.id === userId);
    return user ? user.full_name : `משתמש (ID: ${userId.substring(0, 6)}...)`;
  };

  const getFormTitle = (formId) => formTemplates?.find(ft => ft.id === formId)?.title || formId || 'טופס לא ידוע';
  const getDataTypeName = (slug) => customDataTypes?.find(cdt => cdt.slug === slug)?.name || slug || 'סוג דאטה לא ידוע';

  // NEW: Check if current user can execute a step
  const canUserExecuteStep = (step) => {
    if (!step.role_restriction_enabled || !step.allowed_roles || step.allowed_roles.length === 0) {
      return true; // No restrictions or empty restrictions = everyone can execute
    }

    // Check if user has any of the allowed roles
    return userRoles.some(roleId => step.allowed_roles.includes(roleId));
  };

  // NEW: Get role names for display
  const getRoleNames = (roleIds) => {
    if (!roleIds || roleIds.length === 0) return 'כל התפקידים';
    return roleIds.map(roleId => {
      const role = allRoles.find(r => r.id === roleId);
      return role ? role.name : roleId;
    }).join(', ');
  };

  const handleOpenCompleteModal = (stepId, executionId = null) => {
    // Determine the initial notes for the modal
    // If an executionId is provided, try to find notes for that specific execution
    // Otherwise, if it's a single-execution step, use the step's general notes
    const currentStep = currentSteps.find(s => s.step_id === stepId);
    let notesToPrefill = '';
    if (executionId && currentStep?.executions) {
      const exec = currentStep.executions.find(ex => ex.execution_id === executionId);
      notesToPrefill = exec?.notes || '';
    } else if (currentStep && !currentStep.allow_multiple_executions) {
      // For single-execution steps (like basic or text), use its main notes property if completed
      notesToPrefill = currentStep.notes || '';
    }

    setStepCompletionNotes(notesToPrefill);
    setShowCompleteStepModal({ stepId, executionId });
  };

  const handleOpenFormModal = (formTemplateId, stepId, executionId = null, existingSubmissionId = null) => {
    setShowViewFormModal({ formTemplateId, stepId, executionId, existingSubmissionId });
  };

  const handleOpenSelectRecordModal = (targetDataTypeSlug, stepId, executionId = null, currentRecordId = null) => {
    setShowSelectRecordModal({ targetDataTypeSlug, stepId, executionId, currentRecordId });
  };

  const completeStepExecution = async (stepId, executionId = null, notes = '', submissionId = null, selectedRecord = null) => {
    setInternalLoading(true);
    const stepToUpdate = currentSteps.find(s => s.step_id === stepId);
    if (!stepToUpdate) {
      setInternalLoading(false);
      return;
    }

    const newExecutionId = executionId || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newExecution = {
      execution_id: newExecutionId,
      completed: true,
      completed_at: new Date().toISOString(),
      completed_by: currentUser?.id,
      notes: notes,
      ...(submissionId && { form_submission_id: submissionId }),
      ...(selectedRecord && { selected_custom_data_record_id: selectedRecord.id, selected_custom_data_record_display: selectedRecord.display }),
    };

    let updatedStep;
    if (stepToUpdate.allow_multiple_executions) {
      // For multiple executions, find if we're updating an existing one or adding a new one
      const existingExecutionIndex = (stepToUpdate.executions || []).findIndex(ex => ex.execution_id === executionId);
      let updatedExecutions = [...(stepToUpdate.executions || [])];

      if (existingExecutionIndex !== -1) {
        // Update existing execution
        updatedExecutions[existingExecutionIndex] = newExecution;
      } else {
        // Add new execution
        updatedExecutions.push(newExecution);
      }

      updatedStep = {
        ...stepToUpdate,
        executions: updatedExecutions,
        completed: true,
        completed_at: stepToUpdate.completed_at || newExecution.completed_at, // Update overall completed_at only if it's the first completion
        completed_by: stepToUpdate.completed_by || newExecution.completed_by, // Update overall completed_by only if it's the first completion
      };
    } else {
      updatedStep = {
        ...stepToUpdate,
        completed: true,
        completed_at: newExecution.completed_at,
        completed_by: newExecution.completed_by,
        notes: newExecution.notes, // For single execution, main notes are the execution notes
        ...(submissionId && { form_submission_id: submissionId }),
        ...(selectedRecord && { selected_custom_data_record_id: selectedRecord.id, selected_custom_data_record_display: selectedRecord.display }),
        executions: [newExecution] // For single exec, ensure there's at least one execution
      };
    }

    const updatedStepsList = currentSteps.map(s => s.step_id === stepId ? updatedStep : s);

    try {
      await handleIncidentUpdate({ procedure_steps: updatedStepsList }, true); // silent update

      let logMessage = `השלים שלב בנוהל: "${stepToUpdate.title || stepToUpdate.step_id}"`;
      if (stepToUpdate.step_type === 'text') logMessage = `הושלם שלב טקסט: "${stepToUpdate.title || stepToUpdate.step_id}" עם תוכן: "${notes}"`;
      else if (notes) logMessage += ` (הערות: ${notes})`;

      if (submissionId) logMessage += ` (טופס ${getFormTitle(stepToUpdate.form_id)} הוגש)`;
      if (selectedRecord) logMessage += ` (נבחרה רשומה: ${selectedRecord.display} מסוג ${getDataTypeName(stepToUpdate.target_data_type_slug)})`;
      if (stepToUpdate.step_type === 'selection' && notes.startsWith('נבחר:')) logMessage = `שלב בחירה הושלם: "${stepToUpdate.title || stepToUpdate.step_id}" - ${notes}`;

      if (stepToUpdate.allow_multiple_executions && executionId) logMessage += ` (עדכון ביצוע קיים)`;
      else if (stepToUpdate.allow_multiple_executions) logMessage += ` (ביצוע חדש)`;

      await handleSubmitLog(logMessage, [], 'procedure_step_completion');

      // Close relevant modals
      if (showCompleteStepModal?.stepId === stepId) setShowCompleteStepModal(null);
      if (showViewFormModal?.stepId === stepId) setShowViewFormModal(null);
      if (showSelectRecordModal?.stepId === stepId) setShowSelectRecordModal(null);
      setStepCompletionNotes('');
    } catch (error) {
      console.error("Error completing step:", error);
      alert("שגיאה בהשלמת השלב: " + (error.message || 'נסה שוב'));
    } finally {
      setInternalLoading(false);
    }
  };

  const handleFormSubmitForStep = async (submissionPayload, existingSubmissionId) => {
    // Called by FormViewer on submit
    // submissionPayload already has form_template_id, submitted_by_user_id, submission_timestamp, data
    // and potentially context_entity_type, context_entity_id (though not strictly needed here as we have stepId)

    const { stepId, executionId } = showViewFormModal; // Get stepId from modal state
    if (!stepId) return;

    setInternalLoading(true);
    try {
      let finalSubmission;
      if (existingSubmissionId) {
        finalSubmission = await FormSubmission.update(existingSubmissionId, { data: submissionPayload.data });
      } else {
        finalSubmission = await FormSubmission.create(submissionPayload);
      }

      const stepToUpdate = currentSteps.find(s => s.step_id === stepId);
      const notes = `טופס "${getFormTitle(stepToUpdate.form_id)}" ${existingSubmissionId ? 'עודכן' : 'הוגש'}.`;
      await completeStepExecution(stepId, executionId, notes, finalSubmission.id);
      // Modal will be closed by completeStepExecution
    } catch (error) {
      console.error("Error in handleFormSubmitForStep:", error);
      alert("שגיאה בהגשת הטופס: " + error.message);
      setInternalLoading(false); // Ensure loading is stopped on error
    }
  };

  const handleRecordSelectionForStep = async (record) => {
    // record can be { id: '...', display: '...' } from CustomDataRecordSelector or null if cleared
    const { stepId, executionId, targetDataTypeSlug } = showSelectRecordModal;
    if (!stepId) return;

    const stepToUpdate = currentSteps.find(s => s.step_id === stepId);
    let notes = '';
    if (record) {
      notes = `רשומה "${record.display}" מסוג "${getDataTypeName(targetDataTypeSlug)}" נבחרה.`;
    } else {
      notes = `בחירת רשומה מסוג "${getDataTypeName(targetDataTypeSlug)}" בוטלה.`;
    }
    // For record selection, we usually mark the step as completed.
    // If it needs to be un-completed if selection is cleared, that logic needs to be added.
    await completeStepExecution(stepId, executionId, notes, null, record);
    // Modal will be closed by completeStepExecution
  };

  const handleFinishProcedure = async () => {
    if (!allRequiredStepsCompleted) {
      alert("יש להשלים את כל שלבי החובה בסדר הפעולות לפני סיום.");
      return;
    }
    if (onProcedureStatusUpdate) {
      // Signal parent to handle the incident status update (e.g., open close dialog)
      onProcedureStatusUpdate('closed_by_procedure_completion');
    } else {
      // Fallback if prop not provided, directly update status (less ideal as parent might have own logic)
      console.warn("onProcedureStatusUpdate prop not provided to IncidentProcedureManager. Closing incident directly.");
      try {
        setInternalLoading(true);
        await handleIncidentUpdate({ status: 'closed', closed_at: new Date().toISOString(), closed_by: currentUser?.id }, true);
        await handleSubmitLog(`סדר פעולות "${procedureDefinition?.name || 'טיפול'}" הושלם, והטיקט נסגר.`, [], 'procedure_completed');
      } catch (error) {
        console.error("Error closing incident from procedure manager:", error);
        alert("שגיאה בסגירת הטיקט.");
      } finally {
        setInternalLoading(false);
      }
    }
  };

  // NEW: Function to handle step notification
  const handleNotifyForStep = async (stepId, allowedRoles) => {
    // Filter users who have the required roles
    const eligibleUsers = availableUsers.filter(user => {
      if (!user.roles || !Array.isArray(user.roles)) return false;
      return allowedRoles.some(roleId => user.roles.includes(roleId));
    });

    if (eligibleUsers.length === 0) {
      alert('לא נמצאו משתמשים זמינים במשמרת הנוכחית עם ההרשאות הנדרשות לשלב זה.');
      return;
    }

    const step = currentSteps.find(s => s.step_id === stepId);
    setNotificationMessage(`יש שלב בסדר הפעולות "${step?.title || stepId}" הדורש את תשומת ליבך בטיקט "${incidentTitle}". אנא היכנס לטיקט ובצע את השלב הנדרש.`);
    setSelectedNotificationUsers(eligibleUsers.map(u => u.id)); // Select all eligible users by default
    setShowNotifyDialog({ stepId, allowedRoles, eligibleUsers });
  };

  // NEW: Function to send notification
  const sendStepNotification = async () => {
    if (selectedNotificationUsers.length === 0) {
      alert('יש לבחור לפחות משתמש אחד לקבלת ההתראה.');
      return;
    }

    if (!notificationMessage.trim()) {
      alert('יש להזין הודעת התראה.');
      return;
    }

    setSendingNotification(true);
    try {
      const step = currentSteps.find(s => s.step_id === showNotifyDialog.stepId);

      // Create notifications for selected users
      const notificationPromises = selectedNotificationUsers.map(userId =>
        Notification.create({
          user_id: userId,
          title: `נדרש ביצוע שלב בסדר הפעולות - ${incidentTitle}`,
          message: notificationMessage,
          type: 'procedure_step_required',
          priority: 'high',
          related_entity_type: 'Incident',
          related_entity_id: incidentId,
          action_url: createPageUrl(`ManageIncidentPage?id=${incidentId}`)
        })
      );

      await Promise.all(notificationPromises);

      // Log the notification in the incident
      const userNames = showNotifyDialog.eligibleUsers
        .filter(user => selectedNotificationUsers.includes(user.id))
        .map(user => user.full_name)
        .join(', ');

      await handleSubmitLog(
        `נשלחה התראה לביצוע שלב "${step?.title || showNotifyDialog.stepId}" ל: ${userNames}`,
        [],
        'step_notification_sent'
      );

      alert(`ההתראה נשלחה בהצלחה ל-${selectedNotificationUsers.length} משתמשים.`);
      setShowNotifyDialog(null);
      setNotificationMessage('');
      setSelectedNotificationUsers([]);

    } catch (error) {
      console.error('Error sending step notification:', error);
      alert('שגיאה בשליחת ההתראה: ' + (error.message || 'נסה שוב'));
    } finally {
      setSendingNotification(false);
    }
  };


  if (parentLoading && currentSteps.length === 0) {
    return (
      <Card className="clay-card">
        <CardHeader><CardTitle className="flex items-center"><ListChecks className="w-5 h-5 ml-2 text-primary-600" />סדר פעולות טיפול</CardTitle></CardHeader>
        <CardContent><p className="text-neutral-500 text-center py-4">טוען סדר פעולות...</p></CardContent>
      </Card>
    );
  }

  if (!currentSteps || currentSteps.length === 0) {
    return (
      <Card className="clay-card">
        <CardHeader><CardTitle className="flex items-center"><ListChecks className="w-5 h-5 ml-2 text-primary-600" />סדר פעולות טיפול</CardTitle></CardHeader>
        <CardContent><p className="text-neutral-500 text-center py-4">לא הוגדר סדר פעולות טיפול פעיל לאירוע זה.</p></CardContent>
      </Card>
    );
  }

  return (
    <Card className="clay-card">
      <CardHeader>
        <CardTitle className="flex items-center"><ListChecks className="w-5 h-5 ml-2 text-primary-600" />
          נוהל טיפול: {procedureDefinition?.name || 'נוהל משויך לאירוע'}
        </CardTitle>
        {procedureDefinition?.description && <CardDescription>{procedureDefinition.description}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {currentSteps.map((step, index) => {
          const isStepCompleted = step.completed; // Overall completion
          const isStepDisabled = incidentStatus === 'closed' || internalLoading;
          const canExecute = canUserExecuteStep(step);

          // Find the specific execution if executionId is relevant (e.g., for viewing a specific form of a multi-execution step)
          let currentExecutionForModal = null;
          if (step.allow_multiple_executions && (showViewFormModal?.executionId || showCompleteStepModal?.executionId || showSelectRecordModal?.executionId)) {
            const relevantExecutionId = showViewFormModal?.executionId || showCompleteStepModal?.executionId || showSelectRecordModal?.executionId;
            currentExecutionForModal = step.executions?.find(ex => ex.execution_id === relevantExecutionId);
          }

          return (
            <div key={step.step_id || index} className={`clay-card p-4 border-2 rounded-lg shadow-sm ${
              isStepCompleted ? 'bg-green-50 border-green-300' :
                (step.step_type === 'form' && step.form_id) ||
                (step.step_type === 'custom_data_record_selection' && step.target_data_type_slug) ||
                (step.step_type === 'selection' && step.selection_options) ||
                (step.step_type === 'text') ?
                'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
              }`}>
              <div className="flex justify-between items-start gap-3">
                <div className="flex-grow">
                  <h4 className="font-semibold flex items-center text-base">
                    {isStepCompleted ?
                      <CheckSquare size={20} className="ml-2 text-green-600" /> :
                      <Circle size={20} className="ml-2 text-gray-400" />
                    }
                    {step.title || `שלב ${step.step_id}`}
                    {step.is_required && <Badge variant="destructive" className="mr-2 text-xs px-1.5 py-0.5">חובה</Badge>}
                    {step.allow_multiple_executions && <Badge variant="outline" className="mr-2 text-xs px-1.5 py-0.5 border-blue-300 text-blue-700">ביצוע מרובה</Badge>}
                    {!canExecute && <Badge variant="outline" className="mr-2 text-xs px-1.5 py-0.5 border-red-300 text-red-700">אין הרשאה</Badge>}
                  </h4>
                  {step.description && <p className="text-sm text-neutral-600 mt-1">{step.description}</p>}

                  {/* NEW: Show role restrictions info */}
                  {step.role_restriction_enabled && step.allowed_roles && step.allowed_roles.length > 0 && (
                    <p className="text-xs text-amber-600 mt-1 bg-amber-50 p-1 rounded">
                      מותר לתפקידים: {getRoleNames(step.allowed_roles)}
                    </p>
                  )}

                  {/* Display info about completed form / selected record / selected option for single execution steps */}
                  {!step.allow_multiple_executions && isStepCompleted && step.form_submission_id && step.step_type === 'form' && (
                    <div className="mt-2 text-xs bg-green-100 p-2 rounded-md">
                      <p className="font-medium text-green-700">טופס "{getFormTitle(step.form_id)}" מולא.</p>
                      <p>ע"י: {getUserName(step.completed_by)} ב-{formatDate(step.completed_at)}</p>
                      {step.notes && <p>הערות: {step.notes}</p>}
                    </div>
                  )}
                  {!step.allow_multiple_executions && isStepCompleted && step.selected_custom_data_record_id && step.step_type === 'custom_data_record_selection' && (
                    <div className="mt-2 text-xs bg-green-100 p-2 rounded-md">
                      <p className="font-medium text-green-700">רשומה נבחרה: {step.selected_custom_data_record_display || step.selected_custom_data_record_id}</p>
                      <p>מסוג: {getDataTypeName(step.target_data_type_slug)}</p>
                      <p>ע"י: {getUserName(step.completed_by)} ב-{formatDate(step.completed_at)}</p>
                      {step.notes && <p>הערות: {step.notes}</p>}
                    </div>
                  )}
                  {!step.allow_multiple_executions && isStepCompleted && step.step_type === 'selection' && step.notes && step.notes.startsWith('נבחר:') && (
                    <div className="mt-2 text-xs bg-green-100 p-2 rounded-md">
                      <p className="font-medium text-green-700">{step.notes}</p>
                      <p>ע"י: {getUserName(step.completed_by)} ב-{formatDate(step.completed_at)}</p>
                    </div>
                  )}
                  {/* NEW: Display info about completed text step for single execution */}
                  {!step.allow_multiple_executions && isStepCompleted && step.step_type === 'text' && (
                    <div className="mt-2 text-xs bg-green-100 p-2 rounded-md">
                      <p className="font-medium text-green-700">תוכן שהוזן: {step.notes}</p>
                      <p>ע"י: {getUserName(step.completed_by)} ב-{formatDate(step.completed_at)}</p>
                    </div>
                  )}


                  {/* Show executions for multiple execution steps */}
                  {step.allow_multiple_executions && step.executions && step.executions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <h5 className="text-sm font-medium text-neutral-700">ביצועים ({step.executions.length}):</h5>
                      {step.executions.map((execution, execIndex) => (
                        <div key={execution.execution_id} className="bg-white p-2 rounded border border-gray-200 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">ביצוע #{execIndex + 1}</span>
                            <span className="text-gray-500">{formatDate(execution.completed_at)}</span>
                          </div>
                          <p className="text-gray-600 mt-1">ע"י: {getUserName(execution.completed_by)}</p>
                          {execution.notes && <p className="text-gray-600 mt-1">הערה: {execution.notes}</p>}

                          {execution.form_submission_id && step.step_type === 'form' && step.form_id && (
                            <div className="mt-2">
                              <Button variant="link" size="sm" className="text-xs p-0 h-auto text-blue-600 hover:underline" onClick={() => handleOpenFormModal(step.form_id, step.step_id, execution.execution_id, execution.form_submission_id)} disabled={isStepDisabled}>
                                <ClipboardEdit className="w-3 h-3 ml-1" /> טופס "{getFormTitle(step.form_id)}" (צפה/ערוך)
                              </Button>
                            </div>
                          )}
                          {execution.selected_custom_data_record_id && step.step_type === 'custom_data_record_selection' && (
                            <div className="mt-2">
                              <Button variant="link" size="sm" className="text-xs p-0 h-auto text-blue-600 hover:underline" onClick={() => handleOpenSelectRecordModal(step.target_data_type_slug, step.step_id, execution.execution_id, execution.selected_custom_data_record_id)} disabled={isStepDisabled}>
                                <Database className="w-3 h-3 ml-1" /> רשומה: {execution.selected_custom_data_record_display || execution.selected_custom_data_record_id} (שנה)
                              </Button>
                            </div>
                          )}
                          {/* For selection type, just show the notes if it was captured as a selection */}
                          {step.step_type === 'selection' && execution.notes && execution.notes.startsWith('נבחר:') && (
                            <div className="mt-2 text-xs bg-purple-50 p-2 rounded-md">
                              <p className="font-medium text-purple-700">{execution.notes}</p>
                            </div>
                          )}
                          {/* NEW: For text type, show notes and allow edit */}
                          {step.step_type === 'text' && execution.notes && (
                            <div className="mt-2">
                              <Button variant="link" size="sm" className="text-xs p-0 h-auto text-blue-600 hover:underline" onClick={() => handleOpenCompleteModal(step.step_id, execution.execution_id)} disabled={isStepDisabled}>
                                <Edit className="w-3 h-3 ml-1" /> ערוך/צפה בתוכן
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action buttons for forms / custom data selection / text / selection */}
                  {step.step_type === 'form' && step.form_id && (
                    <div className="mt-3 p-3 bg-white rounded-md border border-blue-200 shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <ClipboardEdit className="w-5 h-5 ml-2 text-blue-600" />
                          <span className="font-medium text-blue-700">{getFormTitle(step.form_id)}</span>
                          {/* For single execution steps, check main step completion */}
                          {!step.allow_multiple_executions && step.form_submission_id && (
                            <Badge className="bg-green-100 text-green-800 mr-2 text-xs px-1.5 py-0.5">
                              <CheckSquare className="w-3 h-3 ml-1" /> מולא
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className={`clay-button text-xs ${(!step.allow_multiple_executions && step.form_submission_id) ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "bg-blue-500 text-white hover:bg-blue-600"}`}
                          onClick={() => handleOpenFormModal(step.form_id, step.step_id, null, !step.allow_multiple_executions ? step.form_submission_id : null)}
                          disabled={isStepDisabled || !canExecute}
                        >
                          {(!step.allow_multiple_executions && step.form_submission_id) ? <Eye className="w-4 h-4 ml-1" /> : <Edit className="w-4 h-4 ml-1" />}
                          {(!step.allow_multiple_executions && step.form_submission_id) ? "צפה/ערוך טופס" : (step.allow_multiple_executions ? "מלא טופס (ביצוע חדש)" : "מלא טופס")}
                        </Button>
                      </div>
                      {!canExecute && (
                        <p className="text-sm text-red-600 p-2 bg-red-50 rounded mt-3">
                          אין לך הרשאה לבצע שלב זה. נדרש תפקיד: {getRoleNames(step.allowed_roles)}
                        </p>
                      )}
                    </div>
                  )}

                  {step.step_type === 'custom_data_record_selection' && step.target_data_type_slug && (
                    <div className="mt-3 p-3 bg-white rounded-md border border-indigo-200 shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Database className="w-5 h-5 ml-2 text-indigo-600" />
                          <span className="font-medium text-indigo-700">בחר/צור {getDataTypeName(step.target_data_type_slug)}</span>
                          {!step.allow_multiple_executions && step.selected_custom_data_record_id && (
                            <Badge className="bg-green-100 text-green-800 mr-2 text-xs px-1.5 py-0.5">
                              <CheckSquare className="w-3 h-3 ml-1" /> נבחרה
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className={`clay-button text-xs ${(!step.allow_multiple_executions && step.selected_custom_data_record_id) ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" : "bg-indigo-500 text-white hover:bg-indigo-600"}`}
                          onClick={() => handleOpenSelectRecordModal(step.target_data_type_slug, step.step_id, null, !step.allow_multiple_executions ? step.selected_custom_data_record_id : null)}
                          disabled={isStepDisabled || !canExecute}
                        >
                          {(!step.allow_multiple_executions && step.selected_custom_data_record_id) ? <Edit className="w-4 h-4 ml-1" /> : <Database className="w-4 h-4 ml-1" />}
                          {(!step.allow_multiple_executions && step.selected_custom_data_record_id) ? "שנה בחירה" : (step.allow_multiple_executions ? "בחר/צור (ביצוע חדש)" : "בחר/צור רשומה")}
                        </Button>
                      </div>
                      {!canExecute && (
                        <p className="text-sm text-red-600 p-2 bg-red-50 rounded mt-3">
                          אין לך הרשאה לבצע שלב זה. נדרש תפקיד: {getRoleNames(step.allowed_roles)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* NEW: Action buttons for text steps */}
                  {step.step_type === 'text' && (
                    <div className="mt-3 p-3 bg-white rounded-md border border-gray-200 shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 ml-2 text-gray-600" />
                          <span className="font-medium text-gray-700">הזנת טקסט</span>
                          {!step.allow_multiple_executions && step.completed && (
                            <Badge className="bg-green-100 text-green-800 mr-2 text-xs px-1.5 py-0.5">
                              <CheckSquare className="w-3 h-3 ml-1" /> הושלם
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className={`clay-button text-xs ${(!step.allow_multiple_executions && step.completed) ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-gray-500 text-white hover:bg-gray-600"}`}
                          onClick={() => {
                            const executionIdToEdit = !step.allow_multiple_executions && step.completed ? step.executions?.[0]?.execution_id : null;
                            handleOpenCompleteModal(step.step_id, executionIdToEdit);
                          }}
                          disabled={isStepDisabled || !canExecute}
                        >
                          {(!step.allow_multiple_executions && step.completed) ? <Edit className="w-4 h-4 ml-1" /> : <Save className="w-4 h-4 ml-1" />}
                          {(!step.allow_multiple_executions && step.completed) ? "עדכן טקסט" : (step.allow_multiple_executions ? "הזן טקסט (ביצוע חדש)" : "הזן טקסט")}
                        </Button>
                      </div>
                      {!canExecute && (
                        <p className="text-sm text-red-600 p-2 bg-red-50 rounded mt-3">
                          אין לך הרשאה לבצע שלב זה. נדרש תפקיד: {getRoleNames(step.allowed_roles)}
                        </p>
                      )}
                    </div>
                  )}

                  {step.step_type === 'selection' && step.selection_options && (
                    <div className="mt-3 p-3 bg-white rounded-md border border-purple-200 shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <ListChecks className="w-5 h-5 ml-2 text-purple-600" />
                          <span className="font-medium text-purple-700">בחר אופציה</span>
                          {!step.allow_multiple_executions && step.completed && (
                            <Badge className="bg-green-100 text-green-800 mr-2 text-xs px-1.5 py-0.5">
                              <CheckSquare className="w-3 h-3 ml-1" /> נבחרה
                            </Badge>
                          )}
                        </div>
                      </div>

                      {canExecute ? (
                        <>
                          <div className="space-y-2">
                            {step.selection_options.map((option) => (
                              <div key={option.id} className="flex items-center gap-3 p-2 border rounded-md hover:bg-gray-50 transition-colors">
                                <input
                                  type="radio"
                                  id={`option-${step.step_id}-${option.id}`}
                                  name={`step-selection-${step.step_id}`}
                                  value={option.value}
                                  checked={selectedOptionsForSteps[step.step_id]?.value === option.value}
                                  onChange={() => setSelectedOptionsForSteps(prev => ({
                                    ...prev,
                                    [step.step_id]: { value: option.value, label: option.label }
                                  }))}
                                  disabled={isStepDisabled || (step.completed && !step.allow_multiple_executions)}
                                  className="text-purple-600 focus:ring-purple-500"
                                />
                                <label htmlFor={`option-${step.step_id}-${option.id}`} className="flex-1 cursor-pointer">
                                  <div className="font-medium text-sm">{option.label}</div>
                                  {option.description && <div className="text-xs text-neutral-500 mt-0.5">{option.description}</div>}
                                </label>
                              </div>
                            ))}
                          </div>
                          {(!step.completed || step.allow_multiple_executions) && selectedOptionsForSteps[step.step_id] && (
                            <Button
                              size="sm"
                              className="clay-button bg-purple-500 text-white hover:bg-purple-600 mt-4"
                              onClick={() => {
                                const selected = selectedOptionsForSteps[step.step_id];
                                if (selected) {
                                  completeStepExecution(
                                    step.step_id,
                                    null,
                                    `נבחר: ${selected.label}`
                                  );
                                  setSelectedOptionsForSteps(prev => {
                                    const newSelections = { ...prev };
                                    delete newSelections[step.step_id];
                                    return newSelections;
                                  });
                                }
                              }}
                              disabled={isStepDisabled || !selectedOptionsForSteps[step.step_id]}
                            >
                              <CheckSquare className="w-4 h-4 ml-1" /> אשר בחירה
                            </Button>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-red-600 p-2 bg-red-50 rounded">
                          אין לך הרשאה לבצע שלב זה. נדרש תפקיד: {getRoleNames(step.allowed_roles)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* General step notes and completion info (for single exec) */}
                  {!step.allow_multiple_executions && isStepCompleted && step.notes && <p className="text-xs italic text-neutral-500 mt-2 bg-gray-50 p-1.5 rounded">הערה: {step.notes}</p>}
                  {!step.allow_multiple_executions && isStepCompleted && step.completed_by && <p className="text-xs text-neutral-400 mt-1">הושלם ע"י: {getUserName(step.completed_by)} ב-{formatDate(step.completed_at)}</p>}
                </div>

                <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                  {/* Complete button for basic steps (non-form, non-data-selection, non-selection, non-text) or if they are NOT allow_multiple_executions and not yet completed */}
                  {!isStepCompleted &&
                    incidentStatus !== 'closed' &&
                    canExecute &&
                    !['form', 'custom_data_record_selection', 'selection', 'text'].includes(step.step_type) && // Exclude new 'selection' type & 'text'
                    !step.allow_multiple_executions && // Only for single-execution basic steps
                    (
                      <Button size="sm" variant="outline" className="clay-button text-xs" onClick={() => handleOpenCompleteModal(step.step_id)} disabled={isStepDisabled}>
                        <CheckSquare size={14} className="ml-1" /> סמן כהושלם
                      </Button>
                    )
                  }

                  {/* Repeat Step Button for multiple execution steps (basic type) */}
                  {step.allow_multiple_executions &&
                    incidentStatus !== 'closed' &&
                    canExecute &&
                    !['form', 'custom_data_record_selection', 'selection', 'text'].includes(step.step_type) && // Forms/Data/Selection/Text handled by their own "new execution" buttons
                    (
                      <Button
                        size="sm"
                        variant="outline"
                        className="clay-button text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                        onClick={() => handleOpenCompleteModal(step.step_id)} // Opens modal to add notes for new execution
                        disabled={isStepDisabled}
                      >
                        <PlayCircle size={14} className="ml-1" /> בצע שלב זה שוב
                      </Button>
                    )
                  }

                  {step.step_type === 'document' && step.document_url && (
                    <a href={step.document_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 text-xs flex items-center hover:underline clay-button bg-gray-100 px-2 py-1 rounded shadow-sm">
                      <Download size={14} className="ml-1" /> הצג מסמך
                    </a>
                  )}

                  {/* No permission message with notification option */}
                  {!canExecute && !isStepCompleted && (
                    <div className="text-xs text-red-600 bg-red-50 p-3 rounded border border-red-200">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">אין הרשאה לביצוע שלב זה</p>
                          <p className="text-2xs mt-1">נדרש תפקיד: {getRoleNames(step.allowed_roles)}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleNotifyForStep(step.step_id, step.allowed_roles || [])}
                          className="clay-button bg-white text-red-600 border-red-300 hover:bg-red-50 text-xs min-w-[70px]"
                          disabled={isStepDisabled || !step.role_restriction_enabled || (step.allowed_roles || []).length === 0}
                          title="התרע למישהו עם הרשאה מתאימה"
                        >
                          <BellRing className="w-3 h-3 ml-1" />
                          התרע
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>

      {currentSteps && currentSteps.length > 0 && incidentStatus !== 'closed' && (
        <CardFooter className="border-t pt-4 flex justify-end">
          <Button
            onClick={handleFinishProcedure}
            disabled={!allRequiredStepsCompleted || internalLoading || incidentStatus === 'closed'}
            className={`clay-button ${allRequiredStepsCompleted ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-300 cursor-not-allowed'}`}
            title={!allRequiredStepsCompleted ? "יש להשלים את כל שלבי החובה תחילה" : "סיים סדר הפעולות וסגור טיקט"}
          >
            <ShieldCheck className="w-5 h-5 ml-2" />
            {internalLoading ? "מעדכן..." : "סיום סדר הפעולות וסגירת טיקט"}
          </Button>
        </CardFooter>
      )}

      {/* Modals */}
      {showCompleteStepModal && (
        <Dialog open={!!showCompleteStepModal} onOpenChange={() => setShowCompleteStepModal(null)}>
          <DialogContent className="clay-card max-w-md">
            <DialogHeader>
              <DialogTitle>השלמת שלב בסדר הפעולות</DialogTitle>
              <DialogDescription>
                שלב: {currentSteps.find(s => s.step_id === showCompleteStepModal.stepId)?.title || showCompleteStepModal.stepId}
                {showCompleteStepModal.executionId ? " (עדכון ביצוע קיים)" : " (ביצוע חדש)"}
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
            <DialogFooter className="border-t pt-4">
              <Button variant="outline" className="clay-button" onClick={() => setShowCompleteStepModal(null)}>ביטול</Button>
              <Button className="clay-button bg-green-500 hover:bg-green-600 text-white"
                onClick={() => completeStepExecution(showCompleteStepModal.stepId, showCompleteStepModal.executionId, stepCompletionNotes)}
                disabled={internalLoading}>
                {internalLoading ? "שומר..." : (showCompleteStepModal.executionId ? "עדכן ביצוע" : "סמן כהושלם")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {showViewFormModal && (
        <Dialog open={!!showViewFormModal} onOpenChange={() => setShowViewFormModal(null)}>
          <DialogContent className="clay-card max-w-4xl w-[95vw] md:w-[80vw] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                טופס: {getFormTitle(showViewFormModal.formTemplateId)}
              </DialogTitle>
              <DialogDescription>
                עבור שלב: {currentSteps.find(s => s.step_id === showViewFormModal.stepId)?.title}
                {showViewFormModal.executionId && " (ביצוע ספציפי)"}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 max-h-[calc(90vh-150px)] overflow-y-auto"> {/* Adjusted max height */}
              <FormViewer
                formTemplateId={showViewFormModal.formTemplateId}
                onSubmit={(submissionData, existingId) => handleFormSubmitForStep(submissionData, existingId)}
                onCancel={() => setShowViewFormModal(null)}
                contextEntityType="IncidentStepExecution" // More specific context
                contextEntityId={`${incidentId}_${showViewFormModal.stepId}_${showViewFormModal.executionId || 'new'}`}
                existingSubmissionId={showViewFormModal.existingSubmissionId}
                // Pass viewMode based on if existingSubmissionId exists and if user can edit
                viewMode={incidentStatus === 'closed' || (!!showViewFormModal.existingSubmissionId && !currentUser?.canEditForms)} // Example logic for viewMode
              // TODO: Consider passing custom_data_fields_config if the form itself has a custom_data_record_selector
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showSelectRecordModal && (
        <Dialog open={!!showSelectRecordModal} onOpenChange={() => setShowSelectRecordModal(null)}>
          <DialogContent className="clay-card max-w-2xl w-[90vw] md:w-[70vw] max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>
                בחירת רשומה מסוג: {getDataTypeName(showSelectRecordModal.targetDataTypeSlug)}
              </DialogTitle>
              <DialogDescription>
                עבור שלב: {currentSteps.find(s => s.step_id === showSelectRecordModal.stepId)?.title}
                {showSelectRecordModal.executionId && " (ביצוע ספציפי)"}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 max-h-[calc(80vh-150px)] overflow-y-auto">
              <CustomDataRecordSelector
                dataTypeSlug={showSelectRecordModal.targetDataTypeSlug}
                selectedRecordId={showSelectRecordModal.currentRecordId}
                onSelectionChange={(record) => handleRecordSelectionForStep(record)} // record will be { id: '...', display: '...' } or null
                // allowCreation might come from step definition if we add that feature
                // creationConfig might also come from step definition
                // required={currentSteps.find(s => s.step_id === showSelectRecordModal.stepId)?.is_required}
                disabled={incidentStatus === 'closed' || internalLoading}
              // Optional: Pass a function to close the modal from within selector if needed
              // onCancel={() => setShowSelectRecordModal(null)}
              />
            </div>
            <DialogFooter className="border-t pt-4">
              <Button variant="outline" className="clay-button" onClick={() => setShowSelectRecordModal(null)}>
                סגור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* NEW: Notification Dialog */}
      {showNotifyDialog && (
        <Dialog open={!!showNotifyDialog} onOpenChange={() => setShowNotifyDialog(null)}>
          <DialogContent className="clay-card max-w-md">
            <DialogHeader>
              <DialogTitle>התרעה לביצוע שלב בסדר הפעולות</DialogTitle>
              <DialogDescription>
                שלח התראה למישהו עם ההרשאות המתאימות לביצוע שלב: {currentSteps.find(s => s.step_id === showNotifyDialog.stepId)?.title}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  משתמשים זמינים במשמרת עם הרשאות מתאימות ({showNotifyDialog.eligibleUsers?.length || 0})
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                  {showNotifyDialog.eligibleUsers?.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-2">
                      לא נמצאו משתמשים זמינים במשמרת הנוכחית עם ההרשאות הנדרשות
                    </p>
                  ) : (
                    showNotifyDialog.eligibleUsers?.map(user => (
                      <div key={user.id} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id={`notify-user-${user.id}`}
                          checked={selectedNotificationUsers.includes(user.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedNotificationUsers(prev => [...prev, user.id]);
                            } else {
                              setSelectedNotificationUsers(prev => prev.filter(id => id !== user.id));
                            }
                          }}
                        />
                        <label htmlFor={`notify-user-${user.id}`} className="text-sm cursor-pointer flex-1">
                          {user.full_name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">הודעת התראה</label>
                <Textarea
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  className="clay-input"
                  rows={4}
                  placeholder="הודעה למקבל ההתראה..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowNotifyDialog(null)}
                className="clay-button"
                disabled={sendingNotification}
              >
                ביטול
              </Button>
              <Button
                onClick={sendStepNotification}
                className="clay-button bg-red-500 hover:bg-red-600 text-white"
                disabled={sendingNotification || selectedNotificationUsers.length === 0 || !notificationMessage.trim()}
              >
                {sendingNotification ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full ml-2" />
                    שולח...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 ml-2" />
                    שלח התראה ({selectedNotificationUsers.length})
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
