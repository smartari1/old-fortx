
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShiftTemplate } from '@/api/entities';
import { Shift } from '@/api/entities';
import { User } from '@/api/entities';
import { Role } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { CalendarPlus, Users as UsersIconLucide, ListChecks, ChevronLeft, Save, RotateCw, AlertTriangle, X, Plus } from 'lucide-react'; // Renamed Users to avoid conflict
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from "@/components/ui/badge";

export default function CreateShiftFromTemplatePage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [allUsers, setAllUsers] = useState([]); // Store all users
  const [allRoles, setAllRoles] = useState([]); // Store all roles
  const [currentUser, setCurrentUser] = useState(null);
  
  const [shiftStartDate, setShiftStartDate] = useState('');
  const [shiftEndDate, setShiftEndDate] = useState('');
  const [assignedStaff, setAssignedStaff] = useState({}); // { role_id: [user_id1, user_id2] }

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [debugMessage, setDebugMessage] = useState('');

  // Add manual assignment state
  const [manualAssignmentMode, setManualAssignmentMode] = useState(false);
  const [manualStaffInputs, setManualStaffInputs] = useState({}); // { role_id: [{ name: '', email: '' }] }

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        setDebugMessage('טוען נתונים ראשוניים...');
        
        const user = await User.me(); 
        setCurrentUser(user);
        
        // TEMPORARY: Fetch all users without is_active filter for debugging
        console.log("CreateShiftFromTemplatePage: Attempting to fetch ALL users (NO is_active filter for debugging)...");
        const [usersData, rolesData, allTemplatesData] = await Promise.all([
          User.list(), // REMOVED { is_active: true } for now
          Role.list(),
          ShiftTemplate.list()
        ]);

        let activeTemplates = [];
        if (allTemplatesData && Array.isArray(allTemplatesData)) {
          setDebugMessage(`נמצאו ${allTemplatesData.length} תבניות בסך הכל. מסנן תבניות פעילות...`);
          activeTemplates = allTemplatesData.filter(t => t.is_active === true);
          if (activeTemplates.length === 0 && allTemplatesData.length > 0) {
            setDebugMessage(`נמצאו ${allTemplatesData.length} תבניות, אך אף אחת מהן אינה פעילה (is_active: true).`);
          } else if (activeTemplates.length === 0 && allTemplatesData.length === 0) {
            setDebugMessage('לא נמצאו תבניות כלל (גם לא פעילות).');
          } else {
            setDebugMessage(`נמצאו ${activeTemplates.length} תבניות פעילות.`);
          }
        } else {
          setDebugMessage('קריאת ה-API לתבניות לא החזירה מערך תקין.');
        }
        
        console.log("CreateShiftFromTemplatePage: ALL Users data fetched from API (NO FILTER - first 5):", JSON.stringify(usersData?.slice(0,5), null, 2));
        usersData?.forEach(u => {
          console.log(`CreateShiftFromTemplatePage: User ${u.full_name} (ID: ${u.id}), Roles: ${JSON.stringify(u.roles)}, IsActive (from User entity if exists): ${u.is_active}`);
        });
        console.log("CreateShiftFromTemplatePage: ALL Roles data fetched from API:", JSON.stringify(rolesData, null, 2));

        setTemplates(activeTemplates); 
        setAllUsers(usersData || []);
        setAllRoles(rolesData || []);
        
      } catch (err) {
        console.error("CreateShiftFromTemplatePage: Error loading data:", err);
        setError("שגיאה בטעינת נתונים: " + err.message);
        setDebugMessage(`שגיאה בטעינת נתונים: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);
  
  const handleTemplateChange = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    setSelectedTemplate(template);
    setAssignedStaff({}); 
    setManualStaffInputs({});
    setShiftStartDate(''); 
    setShiftEndDate('');
    console.log("CreateShiftFromTemplatePage: Selected template:", template);
  };

  const handleStaffAssignment = (roleId, userId, isAssigned) => {
    setAssignedStaff(prev => {
      const currentAssignedForRole = prev[roleId] || [];
      const requiredRoleDetails = selectedTemplate?.required_roles?.find(r => r.role_id === roleId);
      const requiredRoleCount = requiredRoleDetails?.count || 0;

      let newAssignedForRole;

      if (isAssigned) {
        if (!currentAssignedForRole.includes(userId)) {
          if (currentAssignedForRole.length < requiredRoleCount) {
            newAssignedForRole = [...currentAssignedForRole, userId];
          } else {
            alert(`הגעת למספר המרבי של עובדים (${requiredRoleCount}) לתפקיד זה.`);
            newAssignedForRole = [...currentAssignedForRole]; // No change if limit reached
          }
        } else {
           newAssignedForRole = [...currentAssignedForRole]; // Already assigned
        }
      } else {
        newAssignedForRole = currentAssignedForRole.filter(id => id !== userId);
      }
      return { ...prev, [roleId]: newAssignedForRole };
    });
  };
  
  const getRoleName = (roleId) => allRoles.find(r => r.id === roleId)?.name || roleId;
  const getUserName = (userId) => allUsers.find(u => u.id === userId)?.full_name || userId;

  useEffect(() => {
    if (selectedTemplate && shiftStartDate && selectedTemplate.start_time && selectedTemplate.end_time) {
      try {
        const [startHour, startMinute] = selectedTemplate.start_time.split(':').map(Number);
        const [endHour, endMinute] = selectedTemplate.end_time.split(':').map(Number);
        
        const startDateObj = new Date(shiftStartDate); // This is just a date string YYYY-MM-DD
        
        // Create full Date objects for start and end by combining date and time
        const fullStartDate = new Date(startDateObj);
        fullStartDate.setHours(startHour, startMinute, 0, 0);

        let fullEndDate = new Date(startDateObj); // Start with the same date
        fullEndDate.setHours(endHour, endMinute, 0, 0);

        if (fullEndDate <= fullStartDate) { // If end time is on or before start time, move to next day
          fullEndDate.setDate(fullEndDate.getDate() + 1);
        }
        
        const pad = (num) => num.toString().padStart(2, '0');
        // Keep shiftStartDate as YYYY-MM-DD for the date input
        // setShiftStartDate(fullStartDate.toISOString().split('T')[0]); // Not needed, already set
        setShiftEndDate(
            `${fullEndDate.getFullYear()}-${pad(fullEndDate.getMonth() + 1)}-${pad(fullEndDate.getDate())}T${pad(fullEndDate.getHours())}:${pad(fullEndDate.getMinutes())}`
        );

      } catch (e) {
          console.warn("Could not calculate end date from template times", e);
          setShiftEndDate(''); 
      }
    } else if (selectedTemplate && shiftStartDate) {
       setShiftEndDate(''); 
    }
  }, [selectedTemplate, shiftStartDate]);

  const addManualStaffMember = (roleId) => {
    setManualStaffInputs(prev => ({
      ...prev,
      [roleId]: [...(prev[roleId] || []), { name: '', email: '', temp_id: Date.now() }]
    }));
  };

  const removeManualStaffMember = (roleId, tempId) => {
    setManualStaffInputs(prev => ({
      ...prev,
      [roleId]: (prev[roleId] || []).filter(staff => staff.temp_id !== tempId)
    }));
  };

  const updateManualStaffMember = (roleId, tempId, field, value) => {
    setManualStaffInputs(prev => ({
      ...prev,
      [roleId]: (prev[roleId] || []).map(staff => 
        staff.temp_id === tempId ? { ...staff, [field]: value } : staff
      )
    }));
  };

  const handleSubmitShift = async () => {
    if (!selectedTemplate || !shiftStartDate || !shiftEndDate || !currentUser) {
        alert("יש לבחור תבנית, תאריך, שעת סיום ולוודא שהמשתמש טעון.");
        return;
    }

    // Validation for manual mode
    if (manualAssignmentMode) {
      let validationPassed = true;
      selectedTemplate.required_roles?.forEach(reqRole => {
        const manualCount = manualStaffInputs[reqRole.role_id]?.length || 0;
        if (manualCount !== reqRole.count) {
          validationPassed = false;
          alert(`יש להוסיף ${reqRole.count} אנשי צוות לתפקיד ${getRoleName(reqRole.role_id)}. כרגע הוספת: ${manualCount}`);
        }
        // Check that all manual entries have names
        const incompleteEntries = manualStaffInputs[reqRole.role_id]?.filter(staff => !staff.name.trim()) || [];
        if (incompleteEntries.length > 0) {
          validationPassed = false;
          alert(`יש למלא שמות עבור כל אנשי הצוות בתפקיד ${getRoleName(reqRole.role_id)}`);
        }
      });
      if (!validationPassed) return;
    } else {
      // Original validation for regular mode
      let staffValidationPassed = true;
      selectedTemplate.required_roles?.forEach(reqRole => {
        const assignedCount = assignedStaff[reqRole.role_id]?.length || 0;
        if (assignedCount !== reqRole.count) {
          staffValidationPassed = false;
          alert(`יש לשבץ ${reqRole.count} עובדים לתפקיד ${getRoleName(reqRole.role_id)}. כרגע משובצים: ${assignedCount}`);
        }
      });
      if (!staffValidationPassed) return;
    }

    setSubmitting(true);
    try {
        let shiftStaff = [];
        
        if (manualAssignmentMode) {
          // Create staff from manual inputs
          Object.entries(manualStaffInputs).forEach(([roleId, staffMembers]) => {
            staffMembers.forEach(staffMember => {
              shiftStaff.push({ 
                user_id: `manual_${staffMember.temp_id}`, // Temporary ID for manual entries
                role: roleId,
                manual_name: staffMember.name,
                manual_email: staffMember.email || '',
                notes: `שובץ ידנית: ${staffMember.name}`
              });
            });
          });
        } else {
          // Original logic for assigned staff
          Object.entries(assignedStaff).forEach(([roleId, userIds]) => {
            userIds.forEach(userId => {
              shiftStaff.push({ user_id: userId, role: roleId });
            });
          });
        }

        // Construct start_time and end_time correctly from date and template times
        const [templateStartHour, templateStartMinute] = selectedTemplate.start_time.split(':').map(Number);
        const finalShiftStartTime = new Date(shiftStartDate);
        finalShiftStartTime.setHours(templateStartHour, templateStartMinute, 0, 0);
        
        const finalShiftEndTime = new Date(shiftEndDate);

        // Prepare shift_targets_status based on the selected template's targets
        const initialTargetsStatus = selectedTemplate.shift_targets?.map(templateTarget => ({
            template_target_id: templateTarget.id, // This is the crucial part - link to original template target ID
            target_definition: { ...templateTarget }, // Copy the definition from template
            assigned_user_id: templateTarget.target_role_id ? null : undefined, 
            target_role_id: templateTarget.target_role_id || null,
            completed_count: 0,
            related_incident_ids: []
        })) || [];


        const newShiftPayload = {
            template_id: selectedTemplate.id,
            site: selectedTemplate.site,
            start_time: finalShiftStartTime.toISOString(),
            end_time: finalShiftEndTime.toISOString(),
            manager_id: currentUser.id, 
            staff: shiftStaff,
            status: 'scheduled',
            notes: `נוצרה מתבנית: ${selectedTemplate.name} ע"י ${currentUser.full_name}${manualAssignmentMode ? ' (שיבוץ ידני)' : ''}`,
            shift_targets_status: initialTargetsStatus // Use the correctly prepared targets
        };
        
        console.log("Creating shift with payload:", JSON.stringify(newShiftPayload, null, 2)); // Added JSON.stringify for better logging
        const createdShift = await Shift.create(newShiftPayload);
        alert(`משמרת ${createdShift.id.substring(0,8)} נוצרה בהצלחה!`);
        navigate(createPageUrl("ShiftManagerDashboard"));

    } catch (err) {
        console.error("Error creating shift:", err.response ? JSON.stringify(err.response.data, null, 2) : err.message); // Log more details on error
        alert("שגיאה ביצירת המשמרת: " + (err.response?.data?.message || err.message));
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>טוען נתונים...</div>;
  if (error) return <div className="p-8 text-center text-red-600 clay-card">{error} ({debugMessage})</div>;

  console.log("CreateShiftFromTemplatePage: Rendering. Templates count:", templates.length);

  return (
    <div className="container mx-auto p-4 md:p-6" dir="rtl">
      <header className="mb-8">
        <div className="flex items-center mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="ml-2">
                <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold text-primary-700 flex items-center">
                <CalendarPlus className="w-8 h-8 ml-3 text-primary-500" />
                יצירת משמרת חדשה מתבנית
            </h1>
        </div>
        <p className="text-neutral-600 mr-12">בחר תבנית קיימת והתאם את פרטי המשמרת והצוות.</p>
      </header>
      {debugMessage && !error && <p className="mb-4 text-sm text-neutral-600 bg-neutral-100 p-3 rounded-md">{debugMessage}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Template Selection & Date */}
        <div className="md:col-span-1 space-y-6">
            <Card className="clay-card">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><ListChecks className="w-5 h-5 ml-2"/>בחירת תבנית</CardTitle>
                </CardHeader>
                <CardContent>
                    {templates.length > 0 ? (
                        <Select onValueChange={handleTemplateChange} value={selectedTemplate?.id || ''}>
                            <SelectTrigger className="clay-input">
                                <SelectValue placeholder="בחר תבנית משמרת..." />
                            </SelectTrigger>
                            <SelectContent>
                                {templates.map(template => (
                                    <SelectItem key={template.id} value={template.id}>
                                        {template.name} ({template.site})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                       <p className="text-sm text-neutral-500 py-4 text-center">
                           לא נמצאו תבניות משמרת פעילות. אנא צור תבנית חדשה ופעילה תחילה.
                        </p>
                    )}
                    {selectedTemplate && (
                        <div className="mt-3 text-xs text-neutral-600 space-y-1">
                            <p><strong>אתר:</strong> {selectedTemplate.site}</p>
                            <p><strong>ימים:</strong> {selectedTemplate.days_of_week?.join(', ') || 'כל הימים'}</p>
                            <p><strong>שעות:</strong> {selectedTemplate.start_time} - {selectedTemplate.end_time}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
            {selectedTemplate && (
                 <Card className="clay-card">
                    <CardHeader><CardTitle className="text-lg">תאריכי משמרת</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <label className="text-sm font-medium">תאריך התחלה <span className="text-red-500">*</span></label>
                            <Input 
                                type="date" 
                                value={shiftStartDate} 
                                onChange={e => setShiftStartDate(e.target.value)} 
                                className="clay-input mt-1"
                            />
                        </div>
                         <div>
                            <label className="text-sm font-medium">תאריך ושעת סיום (מחושב)</label>
                            <Input 
                                type="datetime-local" 
                                value={shiftEndDate} 
                                onChange={e => setShiftEndDate(e.target.value)} 
                                className="clay-input mt-1 bg-neutral-50"
                                readOnly
                            />
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>

        {/* Column 2: Staff Assignment */}
        <div className="md:col-span-2">
        {selectedTemplate ? (
            <Card className="clay-card">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><UsersIconLucide className="w-5 h-5 ml-2"/>שיבוץ צוות</CardTitle>
                    <CardDescription>
                      שבץ עובדים לתפקידים הנדרשים.
                      <div className="mt-2 flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="manual-mode"
                          checked={manualAssignmentMode}
                          onChange={(e) => setManualAssignmentMode(e.target.checked)}
                          className="form-checkbox h-4 w-4 text-primary-600"
                        />
                        <label htmlFor="manual-mode" className="text-sm">
                          שיבוץ ידני (הוסף שמות באופן ידני)
                        </label>
                      </div>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                {selectedTemplate.required_roles?.length > 0 ? (
                    <ScrollArea className="max-h-[60vh] pr-3">
                    <div className="space-y-6">
                    {selectedTemplate.required_roles.map(reqRole => {
                        const roleId = reqRole.role_id;
                        
                        if (manualAssignmentMode) {
                          const manualStaffForRole = manualStaffInputs[roleId] || [];
                          const manualCount = manualStaffForRole.length;
                          const countMet = manualCount === reqRole.count;
                          
                          return (
                            <div key={roleId} className="p-3 border rounded-lg clay-card bg-white">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-semibold">{getRoleName(roleId)}</h3>
                                    <div className="flex items-center gap-2">
                                      <Badge variant={countMet ? "default" : "destructive"} className={`${countMet ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} px-2 py-0.5 text-xs`}>
                                          נדרשים: {reqRole.count} | הוספו: {manualCount}
                                      </Badge>
                                      <Button 
                                        size="sm" 
                                        onClick={() => addManualStaffMember(roleId)}
                                        disabled={manualCount >= reqRole.count}
                                        className="clay-button text-xs"
                                      >
                                        <Plus className="w-3 h-3 ml-1" />
                                        הוסף
                                      </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                  {manualStaffForRole.map(staff => (
                                    <div key={staff.temp_id} className="flex items-center gap-2 p-2 bg-neutral-50 rounded">
                                      <Input
                                        placeholder="שם מלא"
                                        value={staff.name}
                                        onChange={(e) => updateManualStaffMember(roleId, staff.temp_id, 'name', e.target.value)}
                                        className="flex-1 clay-input text-sm"
                                      />
                                      <Input
                                        placeholder="אימייל (אופציונלי)"
                                        value={staff.email}
                                        onChange={(e) => updateManualStaffMember(roleId, staff.temp_id, 'email', e.target.value)}
                                        className="flex-1 clay-input text-sm"
                                      />
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => removeManualStaffMember(roleId, staff.temp_id)}
                                        className="text-red-600 hover:text-red-800"
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                  {manualStaffForRole.length === 0 && (
                                    <p className="text-xs text-neutral-500 text-center py-2">
                                      לחץ על "הוסף" כדי למלא פרטי צוות
                                    </p>
                                  )}
                                </div>
                            </div>
                          );
                        } else {
                          // Original user selection mode
                          console.log(`CreateShiftFromTemplatePage: Filtering for required role ID: ${roleId} (Name: ${getRoleName(roleId)})`);
                          
                          const usersForThisRole = allUsers.filter(user => {
                            const userHasRole = user.roles && Array.isArray(user.roles) && user.roles.includes(roleId);
                            const isActive = user.is_active !== undefined ? user.is_active : true;
                            return userHasRole && isActive;
                          });
                          
                          console.log(`CreateShiftFromTemplatePage: Found ${usersForThisRole.length} users for role ID ${roleId}`);

                          const assignedCountForThisRole = assignedStaff[roleId]?.length || 0;
                          const countMet = assignedCountForThisRole === reqRole.count;

                          return (
                          <div key={roleId} className="p-3 border rounded-lg clay-card bg-white">
                              <div className="flex justify-between items-center mb-2">
                                  <h3 className="font-semibold">{getRoleName(roleId)}</h3>
                                  <Badge variant={countMet ? "default" : "destructive"} className={`${countMet ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} px-2 py-0.5 text-xs`}>
                                      נדרשים: {reqRole.count} | שובצו: {assignedCountForThisRole}
                                  </Badge>
                              </div>
                              {usersForThisRole.length > 0 ? (
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                  {usersForThisRole.map(user => (
                                  <div key={user.id} className="flex items-center justify-between p-1.5 hover:bg-neutral-50 rounded text-sm">
                                      <label htmlFor={`user-${roleId}-${user.id}`} className="cursor-pointer flex-grow">
                                          {getUserName(user.id)}
                                      </label>
                                      <input
                                          type="checkbox"
                                          id={`user-${roleId}-${user.id}`}
                                          checked={assignedStaff[roleId]?.includes(user.id) || false}
                                          onChange={(e) => handleStaffAssignment(roleId, user.id, e.target.checked)}
                                          disabled={assignedCountForThisRole >= reqRole.count && !(assignedStaff[roleId]?.includes(user.id))}
                                          className="form-checkbox h-4 w-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500 ml-2"
                                      />
                                  </div>
                                  ))}
                              </div>
                              ) : (
                                  <div className="text-center py-4">
                                    <p className="text-xs text-neutral-500 mb-2">לא נמצאו משתמשים פעילים עם תפקיד זה.</p>
                                    <p className="text-xs text-blue-600">עבור למצב "שיבוץ ידני" כדי להוסיף צוות באופן ידני.</p>
                                  </div>
                              )}
                          </div>
                          );
                        }
                    })}
                    </div>
                    </ScrollArea>
                ) : (
                    <p className="text-neutral-500">התבנית לא דורשת תפקידים ספציפיים.</p>
                )}
                </CardContent>
                <CardFooter className="border-t pt-4">
                     <Button 
                        onClick={handleSubmitShift} 
                        disabled={submitting || !selectedTemplate || !shiftStartDate || !shiftEndDate}
                        className="w-full clay-button bg-primary-600 hover:bg-primary-700 text-white"
                    >
                        {submitting ? <RotateCw className="w-4 h-4 ml-2 animate-spin"/> : <Save className="w-4 h-4 ml-2"/>}
                        {submitting ? "יוצר משמרת..." : "צור ושבץ משמרת"}
                    </Button>
                </CardFooter>
            </Card>
        ) : (
            <div className="clay-card bg-white p-10 text-center">
                <ListChecks className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-neutral-500">אנא בחר תבנית משמרת כדי להמשיך.</p>
            </div>
        )}
        </div>
      </div>
    </div>
  );
}
