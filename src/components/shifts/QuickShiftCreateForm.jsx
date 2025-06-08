import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShiftTemplate } from '@/api/entities';
import { Shift } from '@/api/entities';
import { User } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from '@/utils';
import { CalendarPlus, ChevronLeft, Users as UsersIcon, UserPlus, X } from 'lucide-react';

export default function QuickShiftCreateForm({ currentUser, onShiftCreated }) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [shiftDate, setShiftDate] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [staffAssignments, setStaffAssignments] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingTemplates(true);
        const [allTemplates, allUsers] = await Promise.all([
          ShiftTemplate.list(),
          User.list()
        ]);

        if (allTemplates && Array.isArray(allTemplates)) {
          const activeTemplates = allTemplates.filter(t => t.is_active === true);
          setTemplates(activeTemplates);
        } else {
          setTemplates([]);
        }

        setUsers(allUsers || []);
      } catch (error) {
        console.error("Error fetching templates and users:", error);
        setTemplates([]);
        setUsers([]);
      } finally {
        setLoadingTemplates(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      setSelectedTemplate(template);
      
      // Initialize staff assignments based on template required roles
      if (template?.required_roles) {
        const assignments = template.required_roles.flatMap(roleReq => 
          Array.from({ length: roleReq.count }, (_, index) => ({
            id: `${roleReq.role_id}_${index}`,
            role_id: roleReq.role_id,
            role_name: roleReq.role_id, // You might want to map this to actual role names
            user_id: '',
            assignment_type: 'specific_user'
          }))
        );
        setStaffAssignments(assignments);
      }
    } else {
      setSelectedTemplate(null);
      setStaffAssignments([]);
    }
  }, [selectedTemplateId, templates]);

  const updateStaffAssignment = (assignmentId, userId) => {
    setStaffAssignments(prev => 
      prev.map(assignment => 
        assignment.id === assignmentId 
          ? { ...assignment, user_id: userId }
          : assignment
      )
    );
  };

  const addCustomStaffMember = () => {
    const newAssignment = {
      id: `custom_${Date.now()}`,
      role_id: 'custom',
      role_name: 'תפקיד מותאם',
      user_id: '',
      assignment_type: 'specific_user'
    };
    setStaffAssignments(prev => [...prev, newAssignment]);
  };

  const removeStaffAssignment = (assignmentId) => {
    setStaffAssignments(prev => prev.filter(a => a.id !== assignmentId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTemplateId || !shiftDate) {
      alert("יש לבחור תבנית ותאריך למשמרת.");
      return;
    }

    // Check that all assignments have users
    const unassignedRoles = staffAssignments.filter(a => !a.user_id);
    if (unassignedRoles.length > 0) {
      alert("יש להקצות משתמש לכל התפקידים במשמרת.");
      return;
    }

    setSubmitting(true);
    try {
      const template = selectedTemplate;
      const [startHour, startMinute] = template.start_time.split(':').map(Number);
      const [endHour, endMinute] = template.end_time.split(':').map(Number);

      const startDateObj = new Date(shiftDate);
      const startTime = new Date(startDateObj);
      startTime.setHours(startHour, startMinute, 0, 0);

      const endTime = new Date(startDateObj);
      endTime.setHours(endHour, endMinute, 0, 0);
      if (endTime <= startTime) {
        endTime.setDate(endTime.getDate() + 1);
      }
      
      // Create staff array with specific user assignments
      const staffArray = staffAssignments.map(assignment => ({
        user_id: assignment.user_id,
        role: assignment.role_name,
        assignment_type: 'specific_user',
        targets_assigned: [] // Will be populated when targets are assigned
      }));

      // Create user-specific targets from template targets
      const userTargets = [];
      if (template.shift_targets) {
        staffAssignments.forEach(assignment => {
          template.shift_targets.forEach(templateTarget => {
            // Check if this target is for this user's role or is general
            if (!templateTarget.target_role_id || templateTarget.target_role_id === assignment.role_id) {
              userTargets.push({
                target_id: `${templateTarget.id}_${assignment.user_id}`,
                assigned_user_id: assignment.user_id,
                target_role_id: templateTarget.target_role_id,
                target_definition: templateTarget,
                completed_count: 0,
                related_incident_ids: [],
                notes: '',
                last_updated: new Date().toISOString()
              });
            }
          });
        });
      }

      const newShift = {
        template_id: template.id,
        site: template.site,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        manager_id: currentUser.id,
        staff: staffArray,
        status: 'scheduled',
        notes: `נוצרה במהירות מתבנית: ${template.name} ע"י ${currentUser.full_name}`,
        shift_targets_status: userTargets
      };

      const createdShift = await Shift.create(newShift);
      alert(`משמרת נוצרה בהצלחה באתר ${createdShift.site} עם ${staffArray.length} משתמשים מוקצים.`);
      if (onShiftCreated) {
        onShiftCreated(createdShift);
      }
    } catch (error) {
      console.error("Error creating shift:", error);
      alert("שגיאה ביצירת המשמרת: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.full_name : 'לא נמצא';
  };

  return (
    <Card className="clay-card w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <CalendarPlus className="w-6 h-6 ml-2 text-primary-500" />
          פתיחת משמרת מהירה
        </CardTitle>
        <CardDescription>בחר תבנית, תאריך והקצה משתמשים ספציפיים למשמרת.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="template-select" className="block text-sm font-medium text-neutral-700 mb-1">תבנית משמרת</label>
            {loadingTemplates ? (
              <p className="text-sm text-neutral-500">טוען תבניות...</p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-neutral-500">לא נמצאו תבניות פעילות.</p>
            ) : (
              <Select onValueChange={setSelectedTemplateId} value={selectedTemplateId}>
                <SelectTrigger id="template-select" className="clay-input">
                  <SelectValue placeholder="בחר תבנית..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.site})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <label htmlFor="shift-date" className="block text-sm font-medium text-neutral-700 mb-1">
              תאריך התחלה למשמרת
            </label>
            <Input
              type="date"
              id="shift-date"
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
              className="clay-input"
            />
          </div>

          {selectedTemplate && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">הקצאת צוות</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={addCustomStaffMember}
                  className="clay-button"
                >
                  <UserPlus className="w-4 h-4 ml-1" />
                  הוסף תפקיד
                </Button>
              </div>

              <div className="space-y-2">
                {staffAssignments.map((assignment, index) => (
                  <div key={assignment.id} className="flex items-center gap-3 p-3 border rounded-lg bg-neutral-50">
                    <div className="flex-1">
                      <Badge variant="outline" className="mb-2">
                        {assignment.role_name}
                      </Badge>
                      <Select
                        value={assignment.user_id}
                        onValueChange={(userId) => updateStaffAssignment(assignment.id, userId)}
                      >
                        <SelectTrigger className="clay-input">
                          <SelectValue placeholder="בחר משתמש..." />
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
                    {assignment.role_id === 'custom' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStaffAssignment(assignment.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {selectedTemplate.shift_targets && selectedTemplate.shift_targets.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">יעדים שיוקצו:</h4>
                  <div className="space-y-1 text-sm text-neutral-600">
                    {selectedTemplate.shift_targets.map(target => (
                      <div key={target.id} className="flex items-center justify-between">
                        <span>{target.description}</span>
                        <Badge variant="outline">{target.count} פעמים</Badge>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">
                    * יעדים יוקצו לכל משתמש בהתאם לתפקידו או כיעדים כלליים
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            className="clay-button" 
            onClick={() => navigate(createPageUrl('Shifts'))}
          >
            <ChevronLeft className="w-4 h-4 ml-1" /> 
            מעבר לניהול משמרות מלא
          </Button>
          <Button 
            type="submit" 
            className="clay-button bg-primary-600 hover:bg-primary-700 text-white" 
            disabled={submitting || loadingTemplates || !selectedTemplateId || !shiftDate || staffAssignments.some(a => !a.user_id)}
          >
            {submitting ? "יוצר..." : "צור משמרת"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}