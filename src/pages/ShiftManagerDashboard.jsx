
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  Users,
  ListChecks,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  UserCircle,
  FileText as FileTextIcon,
  CheckCircle2,
  Target,
  Calendar,
  MapPin,
  User as UserIcon,
  MessageSquare,
  Activity,
  Briefcase,
  Info,
  Goal, // Add Goal import
  X,
  RotateCw,
  Zap,
  BookOpen,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Eye as EyeIcon,
  LogIn,
  LogOut,
  Settings as SettingsIcon,
  Save,
  Minus // Make sure Minus is imported here from lucide-react
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from '@/components/ui/checkbox';

import { DashboardShortcut } from '@/api/entities';
import { User } from '@/api/entities';
import { UserProfile } from '@/api/entities';
import { Role } from '@/api/entities';
import { Shift } from '@/api/entities';
import { Incident } from '@/api/entities';
import { IncidentCategory } from '@/api/entities';
import { IncidentSubCategory } from '@/api/entities';
import { Location } from '@/api/entities';
import { UserGroup } from '@/api/entities';
import { Institution } from '@/api/entities';
import { createPageUrl } from '@/utils';
import UserProfileCard from '@/components/users/UserProfileCard';
import QuickShiftCreateForm from '@/components/shifts/QuickShiftCreateForm';
import { format, parseISO, differenceInMinutes } from 'date-fns';

const iconComponents = {
  Plus, FileTextIcon, AlertTriangle, Users, ListChecks, ShieldCheck, Zap, BookOpen, EyeIcon, MessageSquare, SettingsIcon,
};

// SectionCard component (can be moved to a shared components folder later)
const SectionCard = ({ title, icon, children, actions, fullHeight = false, className = '' }) => (
  <Card className={`clay-card bg-white bg-opacity-90 ${fullHeight ? 'h-full flex flex-col' : ''} ${className}`}>
    <CardHeader className="pb-3 pt-4">
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center text-lg font-semibold text-neutral-700">
          {icon}
          {title}
        </CardTitle>
        {actions && <div className="flex gap-2 items-center">{actions}</div>}
      </div>
    </CardHeader>
    <CardContent className={`${fullHeight ? 'flex-grow overflow-y-auto' : ''} pt-2`}>
      {children}
    </CardContent>
  </Card>
);


export default function ShiftManagerDashboard() {
  const navigate = useNavigate();
  const [shortcuts, setShortcuts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeManagedShift, setActiveManagedShift] = useState(null);
  const [shiftIncidents, setShiftIncidents] = useState([]);
  const [shiftStaff, setShiftStaff] = useState([]);
  const [shiftTargets, setShiftTargets] = useState([]);
  const [shiftLog, setShiftLog] = useState([]);

  const [allUsers, setAllUsers] = useState([]);
  const [rolesData, setRolesData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [userProfiles, setUserProfiles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [userRoles, setUserRoles] = useState([]); // Roles of the current user

  const [loading, setLoading] = useState(true);
  const [loadingShiftDetails, setLoadingShiftDetails] = useState(false);
  const [error, setError] = useState(null);

  const [selectedStaffMemberForProfile, setSelectedStaffMemberForProfile] = useState(null);
  const [showStaffProfileModal, setShowStaffProfileModal] = useState(false);
  const [activeTab, setActiveTab] = useState("team"); // Default to team tab

  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffMember, setNewStaffMember] = useState({ user_id: '', role_id: '', notes: '', is_manual: false, manual_name: '', manual_email: '' });
  const [availableUsers, setAvailableUsers] = useState([]); // For adding staff dropdown

  // Helper to get icon component
  const getIcon = (iconName) => {
    const IconComponent = iconComponents[iconName] || Plus;
    return React.createElement(IconComponent, { className: "w-5 h-5" });
  };

  const getColorClass = (color) => {
    const colorMap = {
      blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200',
      green: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200',
      red: 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200',
      yellow: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200',
      purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200',
      orange: 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200',
      gray: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200',
    };
    return colorMap[color] || colorMap.blue;
  };


  const loadDashboardData = async (forceRefreshShift = false) => {
    setLoading(true);
    setError(null);
    try {
      const user = await User.me();
      setCurrentUser(user);

      const [
        fetchedAllUsers, fetchedRoles, allShortcutsData, allShiftsData,
        fetchedCategories, fetchedSubcategories, fetchedUserProfiles,
        fetchedLocations, fetchedGroups, fetchedInstitutions
      ] = await Promise.all([
        User.list(), Role.list(), DashboardShortcut.list('-order'), Shift.list('-start_time'),
        IncidentCategory.list(), IncidentSubCategory.list(), UserProfile.list(),
        Location.list(), UserGroup.list(), Institution.list()
      ]);

      setAllUsers(fetchedAllUsers || []);
      setRolesData(fetchedRoles || []);
      setCategories(fetchedCategories || []);
      setSubcategories(fetchedSubcategories || []);
      setUserProfiles(fetchedUserProfiles || []);
      setLocations(fetchedLocations || []);
      setGroups(fetchedGroups || []);
      setInstitutions(fetchedInstitutions || []);
      
      const userRoleIds = user.roles || [];
      const currentUserRoleObjects = (fetchedRoles || []).filter(role => userRoleIds.includes(role.id));
      setUserRoles(currentUserRoleObjects);

      const userShortcuts = (allShortcutsData || []).filter(shortcut =>
        shortcut.is_active && userRoleIds.includes(shortcut.target_role_id)
      );
      setShortcuts(userShortcuts);

      const now = new Date();
      // Filter shifts managed by the current user
      const managedShifts = (allShiftsData || []).filter(s => s.manager_id === user.id);
      
      let currentActiveShift = managedShifts.find(s => {
        const startTime = new Date(s.start_time);
        const endTime = new Date(s.end_time);
        return s.status === 'active' || (startTime <= now && endTime >= now && s.status !== 'completed' && s.status !== 'cancelled');
      });

      // If no active shift, look for the most recent upcoming one managed by the user (e.g., starting within 2 hours)
      if (!currentActiveShift) {
        const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
        const upcomingManagedShifts = managedShifts
          .filter(s => {
            const startTime = new Date(s.start_time);
            // Shift is scheduled, starts in the future, and within the next 2 hours
            return s.status === 'scheduled' && startTime >= now && startTime <= twoHoursFromNow;
          })
          .sort((a, b) => new Date(a.start_time) - new Date(b.start_time)); // Closest one first
        
        if (upcomingManagedShifts.length > 0) {
          currentActiveShift = upcomingManagedShifts[0];
        }
      }
      
      setActiveManagedShift(currentActiveShift);

      if (currentActiveShift && currentActiveShift.id) {
         const currentStaffUserIds = currentActiveShift.staff?.map(s => s.user_id).filter(id => id) || [];
         const availableForShift = (fetchedAllUsers || []).filter(u => 
            !currentStaffUserIds.includes(u.id) && u.id !== user.id // Exclude already assigned and self
         );
         setAvailableUsers(availableForShift);
      }


    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(`שגיאה בטעינת נתונים: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const loadShiftDetails = useCallback(async (shift) => {
    if (!shift || !shift.id) {
      setShiftIncidents([]);
      setShiftStaff([]);
      setShiftTargets([]);
      setShiftLog([]);
      return;
    }
    setLoadingShiftDetails(true);
    try {
      const [incidentsData, shiftDataWithDetails] = await Promise.all([
        Incident.filter({ shift_id: shift.id }, '-created_date'),
        Shift.get(shift.id) // Assuming Shift.get fetches staff, targets, log
      ]);

      setShiftIncidents(incidentsData || []);
      setShiftLog(shiftDataWithDetails?.shift_log || []);

      if (shiftDataWithDetails && shiftDataWithDetails.shift_targets_status) {
        const processedShiftTargets = shiftDataWithDetails.shift_targets_status.map(targetStatus => {
          const definition = targetStatus.target_definition || {};
          const categoryName = categories.find(c => c.id === definition.incident_category_id)?.name || 'לא ידוע';
          const progress = definition.count > 0 ? (targetStatus.completed_count / definition.count) * 100 : 0;
          return {
            id: targetStatus.template_target_id || targetStatus.target_id || definition.id, // Use template_target_id or target_id or definition.id as unique key
            definition_id: definition.id,
            description: definition.description || `יעד לקטגוריה: ${categoryName}`,
            required: definition.count,
            completed: targetStatus.completed_count,
            progress: Math.min(progress, 100),
            related_incident_ids: targetStatus.related_incident_ids || [],
            incident_category_id: definition.incident_category_id,
            target_role_id: definition.target_role_id,
            category_name: categoryName, // Add this for easier access
            assigned_user_id: targetStatus.assigned_user_id // Add this for user assignment
          };
        });
        setShiftTargets(processedShiftTargets); // Set global shift targets for 'targets' tab

        if (shiftDataWithDetails.staff) {
            const populatedStaff = shiftDataWithDetails.staff.map(member => {
            const userDetail = allUsers.find(u => u.id === member.user_id);
            const profile = userProfiles.find(p => p.user_id === member.user_id);
            const roleDetail = rolesData.find(r => r.id === member.role);
            
            // Get targets assigned to this specific user
            const userTargets = processedShiftTargets.filter(target => target.assigned_user_id === member.user_id);

            return {
                ...member,
                user_name: userDetail ? userDetail.full_name : (member.name || 'משתמש ידני'),
                user_email: userDetail ? userDetail.email : (member.email || ''),
                phone: profile?.phone || '',
                role_name: roleDetail ? roleDetail.name : member.role,
                is_manual: !member.user_id,
                targets: userTargets, // Add targets here - this was missing or incorrect before
            };
            });
            setShiftStaff(populatedStaff);
        } else {
            setShiftStaff([]);
        }
      } else {
        setShiftTargets([]);
        setShiftStaff([]);
      }
    } catch (err) {
      console.error("Error loading active shift details:", err);
      setShiftIncidents([]); setShiftStaff([]); setShiftTargets([]); setShiftLog([]);
    } finally {
      setLoadingShiftDetails(false);
    }
  }, [allUsers, rolesData, categories, userProfiles]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (activeManagedShift && activeManagedShift.id) {
      loadShiftDetails(activeManagedShift);
       // Update available users when staff changes within the active shift
      const currentStaffUserIds = activeManagedShift.staff?.map(s => s.user_id).filter(id => id) || [];
      const availableForShift = allUsers.filter(u => 
          !currentStaffUserIds.includes(u.id) && u.id !== currentUser?.id
      );
      setAvailableUsers(availableForShift);
    } else {
      setShiftIncidents([]);
      setShiftStaff([]);
      setShiftTargets([]);
      setShiftLog([]);
      setAvailableUsers(allUsers.filter(u => u.id !== currentUser?.id)); // Show all users except self if no active shift
    }
  }, [activeManagedShift?.id, loadShiftDetails, allUsers, currentUser?.id]);


  const handleShortcutClick = (shortcut) => {
    if (shortcut.shortcut_type === 'create_incident') {
      const params = new URLSearchParams();
      if (shortcut.incident_category_id) params.append('category', shortcut.incident_category_id);
      if (shortcut.incident_sub_category_id) params.append('subcategory', shortcut.incident_sub_category_id);
      if (activeManagedShift) {
        params.append('shift_id', activeManagedShift.id);
        if (activeManagedShift.site) params.append('site', activeManagedShift.site);
      }
      navigate(createPageUrl(`CreateIncidentPage?${params.toString()}`));
    } else if (shortcut.shortcut_type === 'custom_link' && shortcut.custom_url) {
        if (shortcut.custom_url.startsWith('/')) {
            navigate(createPageUrl(shortcut.custom_url.substring(1)));
        } else {
            window.open(shortcut.custom_url, '_blank');
        }
    }
  };
  
  const openStaffProfileModal = async (staffMember) => {
     if (!staffMember.user_id) {
        alert("לא ניתן להציג פרופיל עבור איש צוות ידני.");
        return;
    }
    const userDetail = allUsers.find(u => u.id === staffMember.user_id);
    const profile = userProfiles.find(p => p.user_id === staffMember.user_id);

    if (userDetail) {
        const staffMemberDetails = {
            ...userDetail,
            ...(profile || {}),
            roles: profile?.roles || userDetail.roles || [], 
            groups: profile?.groups || userDetail.groups || [],
            site_id: profile?.site_id || userDetail.site,
            institution_id: profile?.institution_id || userDetail.associated_institution,
            is_active: profile?.is_active !== undefined ? profile.is_active : userDetail.active,
            last_login: profile?.last_login,
            reports: profile?.reports || [],
        };
        setSelectedStaffMemberForProfile(staffMemberDetails);
        setShowStaffProfileModal(true);
    } else {
        alert("פרטי המשתמש לא נמצאו.");
    }
  };

  const getUserFullName = (userId) => allUsers.find(u => u.id === userId)?.full_name || 'לא ידוע';
  const getCategoryName = (categoryId) => categories.find(cat => cat.id === categoryId)?.name || 'לא ידוע';
  const getSubcategoryName = (subcategoryId) => subcategories.find(sub => sub.id === subcategoryId)?.name || 'לא ידוע';
  const getSiteName = (siteId) => locations.find(loc => loc.id === siteId)?.name || 'לא משויך לאתר';
  const getRoleName = (roleId) => rolesData.find(r => r.id === roleId)?.name || 'תפקיד לא ידוע';
  const getInstitutionName = (institutionId) => institutions.find(i => i.id === institutionId)?.name || 'לא משויך למוסד';
  const getGroupName = (groupId) => groups.find(g => g.id === groupId)?.name || 'קבוצה לא ידועה';

  const formatTime = (dateString) => dateString ? new Date(dateString).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('he-IL') : 'N/A';
  const formatDateTime = (dateString) => dateString ? new Date(dateString).toLocaleString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'}) : 'N/A';

  const getShiftStatusDetails = () => {
    if (!activeManagedShift) return null;

    const now = new Date();
    const startTime = new Date(activeManagedShift.start_time);
    const endTime = new Date(activeManagedShift.end_time);

    if (activeManagedShift.status === 'cancelled') return { status: 'cancelled', label: 'בוטלה', color: 'gray', icon: <X className="w-4 h-4 ml-1"/>, isOver: true };
    if (activeManagedShift.status === 'completed') return { status: 'completed', label: 'הסתיימה', color: 'gray', icon: <CheckCircle2 className="w-4 h-4 ml-1"/>, isOver: true };

    if (now < startTime && activeManagedShift.status === 'scheduled') {
      return { status: 'upcoming', label: 'מתוכננת', color: 'blue', icon: <Calendar className="w-4 h-4 ml-1"/>, isOver: false };
    } else if ((now >= startTime && now <= endTime && activeManagedShift.status !== 'completed' && activeManagedShift.status !== 'cancelled') || activeManagedShift.status === 'active') {
      return { status: 'active', label: 'פעילה', color: 'green', icon: <Activity className="w-4 h-4 ml-1"/>, isOver: false };
    } else if (now > endTime && activeManagedShift.status !== 'completed' && activeManagedShift.status !== 'cancelled') {
        return { status: 'pending_completion', label: 'ממתינה לסגירה', color: 'yellow', icon: <Clock className="w-4 h-4 ml-1"/>, isOver: true };
    }
    if (activeManagedShift.status === 'scheduled' && now > endTime) {
         return { status: 'past_scheduled', label: 'מתוכננת (עבר)', color: 'orange', icon: <Clock className="w-4 h-4 ml-1"/>, isOver: true };
    }

    return null;
  };

  const currentShiftStatus = getShiftStatusDetails();
  const isShiftOverOrNotActive = !activeManagedShift || currentShiftStatus?.isOver || (activeManagedShift.status !== 'active' && activeManagedShift.status !== 'scheduled');


  // Shift Management Actions
  const updateShiftStatus = async (newStatus) => {
    if (!activeManagedShift || !currentUser) return;
    try {
      setLoading(true);
      
      const logEntry = {
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        content: `סטטוס משמרת שונה ל: ${getShiftStatusLabel(newStatus)}`,
        event_type: 'status_change',
      };
      
      const updatedShift = await Shift.update(activeManagedShift.id, { 
          status: newStatus,
          shift_log: [...(activeManagedShift.shift_log || []), logEntry]
      });
      
      setActiveManagedShift(updatedShift);
      loadDashboardData(true);
    } catch (error) {
      console.error("Error updating shift status:", error);
      alert(`שגיאה בעדכון סטטוס משמרת: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getShiftStatusLabel = (statusKey) => {
    const statusMap = {
      scheduled: "מתוכננת",
      active: "פעילה",
      completed: "הושלמה",
      cancelled: "בוטלה",
      upcoming: "מתוכננת",
      pending_completion: "ממתינה לסגירה",
      past_scheduled: "מתוכננת (עבר)"
    };
    return statusMap[statusKey] || statusKey;
  };


  const addShiftNote = async () => {
     if (!activeManagedShift || !newNoteContent.trim() || !currentUser) return;
    try {
      setLoading(true);
      const logEntry = {
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        content: newNoteContent.trim(),
        event_type: 'note',
      };
      const updatedShift = await Shift.update(activeManagedShift.id, {
        shift_log: [...(activeManagedShift.shift_log || []), logEntry]
      });
      setActiveManagedShift(updatedShift); // Let useEffect trigger loadShiftDetails
      setNewNoteContent('');
      setShowAddNoteModal(false);
    } catch (error) {
      console.error("Error adding shift note:", error);
      alert(`שגיאה בהוספת הערה למשמרת: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddStaffSubmit = async () => {
    if (!activeManagedShift || !currentUser) return;
    if (!newStaffMember.is_manual && !newStaffMember.user_id) {
      alert("יש לבחור איש צוות או לסמן הוספה ידנית.");
      return;
    }
    if (newStaffMember.is_manual && !newStaffMember.manual_name.trim()) {
      alert("יש למלא שם עבור איש הצוות הידני.");
      return;
    }
    if (!newStaffMember.role_id) {
        alert("יש לבחור תפקיד.");
        return;
    }

    try {
        setLoading(true);
        let staffEntry;

        if (newStaffMember.is_manual) {
            staffEntry = {
                name: newStaffMember.manual_name.trim(),
                email: newStaffMember.manual_email?.trim() || null,
                role: newStaffMember.role_id,
                notes: newStaffMember.notes?.trim() || null,
                check_in_time: null,
                check_out_time: null,
            };
        } else {
            const isAlreadyInStaff = activeManagedShift.staff?.some(s => s.user_id === newStaffMember.user_id);
            if (isAlreadyInStaff) {
                alert("משתמש זה כבר משויך למשמרת.");
                setLoading(false);
                return;
            }

            staffEntry = {
                user_id: newStaffMember.user_id,
                role: newStaffMember.role_id,
                notes: newStaffMember.notes?.trim() || null,
                check_in_time: null,
                check_out_time: null,
            };
        }

        const updatedStaffList = [...(activeManagedShift.staff || []), staffEntry];
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            user_id: currentUser.id,
            content: `התווסף איש צוות: ${newStaffMember.is_manual ? newStaffMember.manual_name : getUserFullName(newStaffMember.user_id)} לתפקיד ${getRoleName(newStaffMember.role_id)}`,
            event_type: 'staff_update',
        };

        const result = await Shift.update(activeManagedShift.id, {
            staff: updatedStaffList,
            shift_log: [...(activeManagedShift.shift_log || []), logEntry]
        });
        
        setActiveManagedShift(result);
        
        setNewStaffMember({ user_id: '', role_id: '', notes: '', is_manual: false, manual_name: '', manual_email: '' });
        setShowAddStaffModal(false);

    } catch (error) {
        console.error("Error adding staff member:", error);
        alert(`שגיאה בהוספת איש צוות: ${error.message}`);
    } finally {
        setLoading(false);
    }
  };

  const handleRemoveStaff = async (staffMemberToRemove) => {
    if (!activeManagedShift || !currentUser) return;
    if (!staffMemberToRemove.user_id && !staffMemberToRemove.name) return;

    if (!window.confirm(`האם אתה בטוח שברצונך להסיר את ${staffMemberToRemove.user_name || staffMemberToRemove.name} מהמשמרת?`)) return;

    try {
        setLoading(true);
        const updatedStaffList = (activeManagedShift.staff || []).filter(member => {
            return member.user_id ? member.user_id !== staffMemberToRemove.user_id : member.name !== staffMemberToRemove.name;
        });

        const logEntry = {
            timestamp: new Date().toISOString(),
            user_id: currentUser.id,
            content: `הוסר איש צוות: ${staffMemberToRemove.user_name || staffMemberToRemove.name}`,
            event_type: 'staff_update',
        };
        
        const result = await Shift.update(activeManagedShift.id, {
            staff: updatedStaffList,
            shift_log: [...(activeManagedShift.shift_log || []), logEntry]
        });

        setActiveManagedShift(result);

    } catch (error) {
        console.error("Error removing staff member:", error);
        alert(`שגיאה בהסרת איש צוות: ${error.message}`);
    } finally {
        setLoading(false);
    }
  };

  const handleStaffCheckInOut = async (staffMember, action) => {
    if (!activeManagedShift || !currentUser) return;
    if (!staffMember.user_id && !staffMember.name) return;

    const now = new Date().toISOString();
    let updatedStaffList = [...activeManagedShift.staff];
    const staffIndex = updatedStaffList.findIndex(s => 
        s.user_id ? s.user_id === staffMember.user_id : s.name === staffMember.name
    );

    if (staffIndex === -1) return;

    let logContent = "";
    if (action === 'check_in') {
        updatedStaffList[staffIndex].check_in_time = now;
        logContent = `איש צוות ${staffMember.user_name || staffMember.name} נכנס למשמרת.`;
    } else if (action === 'check_out') {
        updatedStaffList[staffIndex].check_out_time = now;
        logContent = `איש צוות ${staffMember.user_name || staffMember.name} יצא מהמשמרת.`;
    } else {
        return;
    }

    try {
        setLoading(true);
        const logEntry = {
            timestamp: now,
            user_id: currentUser.id,
            content: logContent,
            event_type: action === 'check_in' ? 'check_in' : 'check_out',
        };

        const result = await Shift.update(activeManagedShift.id, {
            staff: updatedStaffList,
            shift_log: [...(activeManagedShift.shift_log || []), logEntry]
        });
        
        setActiveManagedShift(result);

    } catch (error) {
        console.error(`Error during ${action}:`, error);
        alert(`שגיאה ברישום ${action === 'check_in' ? 'כניסה' : 'יציאה'}: ${error.message}`);
    } finally {
        setLoading(false);
    }
  };
  
  const handleTargetUpdate = async (targetId, completedCountDelta) => {
    if (!activeManagedShift || !targetId || !currentUser) return;

    const targetToUpdateIndex = (activeManagedShift.shift_targets_status || []).findIndex(t => (t.template_target_id || t.target_definition.id) === targetId);
    if (targetToUpdateIndex === -1) return;

    let updatedTargetsStatus = [...activeManagedShift.shift_targets_status];
    const targetToUpdate = updatedTargetsStatus[targetToUpdateIndex];

    const newCompletedCount = Math.max(0, (targetToUpdate.completed_count || 0) + completedCountDelta);
    const requiredCount = targetToUpdate.target_definition.count;
    const finalCompletedCount = Math.min(newCompletedCount, requiredCount);

    updatedTargetsStatus[targetToUpdateIndex] = {
        ...targetToUpdate,
        completed_count: finalCompletedCount
    };

    try {
        setLoading(true);
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            user_id: currentUser.id,
            content: `יעד "${targetToUpdate.target_definition.description}" עודכן ל: ${finalCompletedCount}/${targetToUpdate.target_definition.count}`,
            event_type: 'target_update',
            related_entity_id: targetId
        };

        const result = await Shift.update(activeManagedShift.id, {
            shift_targets_status: updatedTargetsStatus,
            shift_log: [...(activeManagedShift.shift_log || []), logEntry]
        });

        setActiveManagedShift(result);

    } catch (error) {
        console.error("Error updating shift target:", error);
        alert(`שגיאה בעדכון יעד משמרת: ${error.message}`);
    } finally {
        setLoading(false);
    }
  };


  const handleShiftCreated = (newShift) => {
    loadDashboardData(true);
  };


  if (loading && !activeManagedShift) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(10vh-150px)]">
        <RotateCw className="w-12 h-12 text-primary-500 animate-spin mb-4" />
        <p className="text-lg text-neutral-600">טוען נתוני מנהל משמרת...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="clay-card bg-red-100 border border-red-200 text-red-700 p-6 text-center">
        <AlertTriangle className="w-8 h-8 inline-block ml-2"/>
        <p className="text-xl font-medium">{error}</p>
        <p className="mt-2">נסה לרענן את העמוד או פנה לתמיכה.</p>
      </div>
    );
  }

  if (isShiftOverOrNotActive && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 p-4 md:p-6" dir="rtl">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-800 flex items-center">
              <LayoutDashboard className="w-7 h-7 md:w-8 md:h-8 ml-3 text-sky-600" />
              ניהול משמרות
            </h1>
            <p className="text-neutral-600 text-sm md:text-base mt-1">
              {currentUser ? `שלום ${currentUser.full_name}, ` : ''}
              {activeManagedShift && (currentShiftStatus?.status === 'completed' || currentShiftStatus?.status === 'cancelled' || currentShiftStatus?.status === 'pending_completion' || currentShiftStatus?.status === 'past_scheduled')
                ? `המשמרת האחרונה שניהלת (${getSiteName(activeManagedShift.site)}, ${formatDate(activeManagedShift.start_time)}) ${currentShiftStatus?.label}.`
                : "לא קיימת משמרת פעילה בניהולך."
              }
            </p>
          </div>

          <Card className="clay-card bg-white/90">
            <CardHeader>
              <CardTitle className="text-xl text-sky-700">יצירת משמרת חדשה</CardTitle>
              <CardDescription className="text-neutral-500 mt-1">
                צור משמרת חדשה במהירות או עבור לדף ניהול המשמרות המלא.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuickShiftCreateForm 
                currentUser={currentUser} 
                onShiftCreated={handleShiftCreated}
                sites={locations.filter(loc => loc.type === 'site')}
                users={allUsers}
                roles={rolesData}
                templates={[]}
                incidentCategories={categories}
              />
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button variant="outline" className="clay-button" onClick={() => navigate(createPageUrl('Shifts'))}>
                    לניהול משמרות מלא
                </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 p-4 md:p-6" dir="rtl">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-800 flex items-center">
              <LayoutDashboard className="w-7 h-7 md:w-8 md:h-8 ml-3 text-sky-600" />
              ניהול משמרת פעילה
            </h1>
            {currentShiftStatus && (
              <Badge className={`${getColorClass(currentShiftStatus.color)} px-3 py-1.5 text-sm font-medium border flex items-center gap-2 mt-2 sm:mt-0 shadow-sm`}>
                {currentShiftStatus.icon}
                {currentShiftStatus.label}
              </Badge>
            )}
          </div>
          {currentUser && activeManagedShift && (
             <p className="text-neutral-600 text-sm md:text-base mt-1">
                מנהל: {currentUser.full_name} | אתר: {getSiteName(activeManagedShift.site)} | {formatDate(activeManagedShift.start_time)}
            </p>
          )}
        </div>

        {/* Shift Details Accordion */}
        <Accordion type="single" collapsible className="mb-6 clay-card bg-white/80 !p-0" defaultValue="shift-details">
          <AccordionItem value="shift-details" className="border-b-0">
            <AccordionTrigger className="px-4 py-3 hover:no-underline text-md font-medium text-neutral-700 data-[state=open]:bg-sky-50/50">
                <div className="flex items-center">
                    <Briefcase className="w-5 h-5 ml-2 text-sky-600" />
                    פרטי משמרת 
                    <span className="text-xs text-neutral-500 mr-2">({formatTime(activeManagedShift.start_time)} - {formatTime(activeManagedShift.end_time)})</span>
                </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 py-3 border-t border-neutral-200 bg-white/50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><strong className="text-neutral-500 block">אתר:</strong> {getSiteName(activeManagedShift.site)}</div>
                    <div><strong className="text-neutral-500 block">תאריך:</strong> {formatDate(activeManagedShift.start_time)}</div>
                    <div><strong className="text-neutral-500 block">שעות:</strong> {`${formatTime(activeManagedShift.start_time)} - ${formatTime(activeManagedShift.end_time)}`}</div>
                    <div><strong className="text-neutral-500 block">מנהל נוכחי:</strong> {getUserFullName(activeManagedShift.manager_id)}</div>
                    <div className="col-span-full md:col-span-2"><strong className="text-neutral-500 block">הערות למשמרת זו:</strong> {activeManagedShift.notes || "אין הערות"}</div>
                     <div className="md:col-span-2 flex items-center gap-2 justify-end">
                        {activeManagedShift.status === 'scheduled' && (
                             <Button size="sm" className="clay-button bg-green-100 text-green-700 hover:bg-green-200" onClick={() => updateShiftStatus('active')}>
                                <LogIn className="w-4 h-4 ml-1" /> התחל משמרת
                            </Button>
                        )}
                        {activeManagedShift.status === 'active' && (
                            <Button size="sm" className="clay-button bg-red-100 text-red-700 hover:bg-red-200" onClick={() => updateShiftStatus('completed')}>
                                <LogOut className="w-4 h-4 ml-1" /> סיים משמרת
                            </Button>
                        )}
                        {(activeManagedShift.status === 'scheduled' || activeManagedShift.status === 'active') && (
                            <Button size="sm" variant="outline" className="clay-button" onClick={() => updateShiftStatus('cancelled')}>
                                <X className="w-4 h-4 ml-1" /> בטל משמרת
                            </Button>
                        )}
                    </div>
                </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        
        {/* Main Content Area with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            <TabsTrigger value="team" className="clay-button data-[state=active]:bg-sky-100 data-[state=active]:text-sky-700 data-[state=active]:border-sky-300">
                <Users className="w-4 h-4 ml-2" />צוות ויעדים ({shiftStaff.length})
            </TabsTrigger>
            <TabsTrigger value="incidents" className="clay-button data-[state=active]:bg-sky-100 data-[state=active]:text-sky-700 data-[state=active]:border-sky-300">
                <ListChecks className="w-4 h-4 ml-2" />אירועים ({shiftIncidents.length})
            </TabsTrigger>
            <TabsTrigger value="targets" className="clay-button data-[state=active]:bg-sky-100 data-[state=active]:text-sky-700 data-[state=active]:border-sky-300">
                <Target className="w-4 h-4 ml-2" />יעדים ({shiftTargets.length})
            </TabsTrigger>
            <TabsTrigger value="log" className="clay-button data-[state=active]:bg-sky-100 data-[state=active]:text-sky-700 data-[state=active]:border-sky-300">
                <BookOpen className="w-4 h-4 ml-2" />יומן משמרת
            </TabsTrigger>
            <TabsTrigger value="shortcuts" className="clay-button data-[state=active]:bg-sky-100 data-[state=active]:text-sky-700 data-[state=active]:border-sky-300">
                <Zap className="w-4 h-4 ml-2" />פעולות מהירות
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team">
            <SectionCard
                title={`צוות ויעדים - סקירה מהירה (${shiftStaff.length})`}
                icon={<Users className="w-6 h-6 ml-2 text-green-500" />}
                actions={
                    <Button
                        variant="outline"
                        className="clay-button bg-green-100 text-green-700 hover:bg-green-200 border-green-200 text-sm"
                        onClick={() => setShowAddStaffModal(true)}
                    >
                        <Plus className="w-4 h-4 ml-1"/> הוסף איש צוות
                    </Button>
                }
            >
                {loadingShiftDetails && shiftStaff.length === 0 ? (
                    <div className="text-center text-neutral-500 py-4">טוען צוות...</div>
                ) : shiftStaff.length === 0 ? (
                    <div className="text-center text-neutral-500 py-8">
                        <Users className="w-12 h-12 mx-auto text-green-400 opacity-70 mb-2"/>
                        לא שובצו עובדים למשמרת זו.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {shiftStaff.map((staffMember, index) => {
                            const totalTargets = staffMember.targets?.length || 0;
                            const completedTargets = staffMember.targets?.filter(t => t.completed >= t.required).length || 0;
                            const overallProgress = totalTargets > 0 ? (completedTargets / totalTargets) * 100 : 0;
                            const totalRequired = staffMember.targets?.reduce((sum, t) => sum + t.required, 0) || 0;
                            const totalCompleted = staffMember.targets?.reduce((sum, t) => sum + t.completed, 0) || 0;
                            const detailedProgress = totalRequired > 0 ? (totalCompleted / totalRequired) * 100 : 0;
                            
                            return (
                                <Card key={staffMember.user_id || staffMember.name || index} className="clay-card bg-white/95 !p-4 shadow-sm">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold text-neutral-800 text-sm">
                                                {staffMember.user_name}
                                                {staffMember.is_manual && <Badge variant="outline" className="text-xs mr-1 bg-yellow-100 text-yellow-700 border-yellow-200">ידני</Badge>}
                                            </h3>
                                            <p className="text-xs text-sky-600">{staffMember.role_name}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {staffMember.check_in_time ? (
                                                <Badge className="bg-green-100 text-green-700 text-xs">נוכח</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-xs">לא נכנס</Badge>
                                            )}
                                            <div className="flex gap-1">
                                                {staffMember.user_id && (
                                                    <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => openStaffProfileModal(staffMember)}>
                                                        <UserCircle className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="icon" className="w-6 h-6 text-red-500" onClick={() => handleRemoveStaff(staffMember)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Check In/Out Actions */}
                                    <div className="mb-3">
                                        {staffMember.check_in_time ? (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-green-700">
                                                    <LogIn className="w-3 h-3 inline ml-1"/> {formatTime(staffMember.check_in_time)}
                                                </span>
                                                {!staffMember.check_out_time ? (
                                                    <Button size="xs" variant="outline" className="clay-button !text-xs !py-0.5 !px-1.5" onClick={() => handleStaffCheckInOut(staffMember, 'check_out')}>
                                                        <LogOut className="w-3 h-3 ml-1"/> יציאה
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-red-700 flex items-center">
                                                        <LogOut className="w-3 h-3 inline ml-1"/> {formatTime(staffMember.check_out_time)}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <Button size="xs" variant="outline" className="clay-button !text-xs !py-0.5 !px-1.5 w-full" onClick={() => handleStaffCheckInOut(staffMember, 'check_in')}>
                                                <LogIn className="w-3 h-3 ml-1"/> רשום כניסה
                                            </Button>
                                        )}
                                        {staffMember.notes && <p className="text-xs text-neutral-500 mt-2">הערה: {staffMember.notes}</p>}
                                    </div>

                                    {/* Targets Overview */}
                                    {totalTargets > 0 ? (
                                        <div className="space-y-2">
                                            {/* Overall Progress */}
                                            <div className="bg-neutral-50 rounded-lg p-2">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-medium text-neutral-700">התקדמות כללית</span>
                                                    <span className="text-xs text-neutral-600">{totalCompleted}/{totalRequired}</span>
                                                </div>
                                                <div className="w-full bg-neutral-200 rounded-full h-2">
                                                    <div 
                                                        className={`h-2 rounded-full transition-all duration-300 ${
                                                            detailedProgress >= 100 ? 'bg-green-500' : 
                                                            detailedProgress >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}
                                                        style={{ width: `${Math.min(detailedProgress, 100)}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs text-neutral-500">{Math.round(detailedProgress)}%</span>
                                            </div>

                                            {/* Individual Targets - Compact View */}
                                            <div className="space-y-1">
                                                {staffMember.targets.slice(0, 3).map((target, targetIndex) => (
                                                    <div key={target.id} className="flex items-center justify-between bg-indigo-50/50 rounded px-2 py-1">
                                                        <div className="flex-1">
                                                            <p className="text-xs font-medium text-indigo-800 truncate" title={target.description}>
                                                                {target.category_name}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-neutral-600">{target.completed}/{target.required}</span>
                                                            <div className="w-12 bg-neutral-200 rounded-full h-1.5">
                                                                <div 
                                                                    className={`h-1.5 rounded-full ${
                                                                        target.progress >= 100 ? 'bg-green-500' : 
                                                                        target.progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                                    }`}
                                                                    style={{ width: `${Math.min(target.progress, 100)}%` }}
                                                                ></div>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                {target.completed < target.required && (
                                                                    <Button size="xs" variant="outline" className="w-5 h-5 p-0" onClick={() => handleTargetUpdate(target.id, 1)}>
                                                                        <Plus className="w-3 h-3"/>
                                                                    </Button>
                                                                )}
                                                                {target.completed > 0 && (
                                                                    <Button size="xs" variant="outline" className="w-5 h-5 p-0" onClick={() => handleTargetUpdate(target.id, -1)}>
                                                                        <Minus className="w-3 h-3"/>
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {staffMember.targets.length > 3 && (
                                                    <p className="text-xs text-neutral-500 text-center">
                                                        +{staffMember.targets.length - 3} יעדים נוספים
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <Goal className="w-8 h-8 mx-auto text-neutral-300 mb-1"/>
                                            <p className="text-xs text-neutral-500">אין יעדים משויכים לתפקיד זה</p>
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )}
            </SectionCard>
          </TabsContent>

          <TabsContent value="incidents">
            <SectionCard
                title="אירועים במשמרת"
                icon={<ListChecks className="w-6 h-6 ml-2 text-orange-500" />}
                actions={
                    <Button
                        variant="outline"
                        className="clay-button bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200 text-sm"
                        onClick={() => {
                            const params = new URLSearchParams();
                            if (activeManagedShift) {
                                params.append('shift_id', activeManagedShift.id);
                                if (activeManagedShift.site) params.append('site', activeManagedShift.site);
                            }
                            navigate(createPageUrl(`CreateIncidentPage?${params.toString()}`));
                        }}
                    >
                        <Plus className="w-4 h-4 ml-1"/> צור אירוע חדש
                    </Button>
                }
            >
                {loadingShiftDetails && shiftIncidents.length === 0 ? (
                    <div className="text-center text-neutral-500 py-4">טוען אירועים...</div>
                ) : shiftIncidents.length === 0 ? (
                    <div className="text-center text-neutral-500 py-8">
                        <ShieldCheck className="w-12 h-12 mx-auto text-green-400 opacity-70 mb-2"/>
                        לא נפתחו אירועים במשמרת זו.
                    </div>
                ) : (
                    <ScrollArea className="max-h-[450px]">
                        <Table className="w-full">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">כותרת</TableHead>
                                    <TableHead className="text-right">קטגוריה</TableHead>
                                    <TableHead className="text-right hidden md:table-cell">תת-קטגוריה</TableHead>
                                    <TableHead className="text-right">סטטוס</TableHead>
                                    <TableHead className="text-right hidden sm:table-cell">זמן דיווח</TableHead>
                                    <TableHead className="text-center">פעולות</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {shiftIncidents.map(incident => {
                                    const categoryName = getCategoryName(incident.category);
                                    const subCategoryName = getSubcategoryName(incident.sub_category);
                                    let statusText, statusBadgeVariant;
                                    switch (incident.status) {
                                        case 'open': statusText = 'פתוח'; statusBadgeVariant = 'destructive'; break;
                                        case 'in_progress': statusText = 'בטיפול'; statusBadgeVariant = 'warning'; break;
                                        case 'closed': statusText = 'סגור'; statusBadgeVariant = 'success'; break;
                                        default: statusText = incident.status; statusBadgeVariant = 'secondary';
                                    }
                                    return (
                                    <TableRow key={incident.id} className="hover:bg-neutral-50/50 text-sm">
                                        <TableCell className="font-medium text-neutral-800 py-2.5">{incident.title}</TableCell>
                                        <TableCell className="py-2.5">{categoryName}</TableCell>
                                        <TableCell className="py-2.5 hidden md:table-cell">{subCategoryName || '-'}</TableCell>
                                        <TableCell className="py-2.5">
                                            <Badge variant={statusBadgeVariant} className="text-xs font-normal">{statusText}</Badge>
                                        </TableCell>
                                        <TableCell className="py-2.5 text-xs hidden sm:table-cell">{formatDateTime(incident.created_date)}</TableCell>
                                        <TableCell className="text-center py-2.5">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7"
                                                onClick={() => navigate(createPageUrl(`ManageIncidentPage?id=${incident.id}`))}
                                            >
                                                <EyeIcon className="w-4 h-4 text-neutral-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                )}
            </SectionCard>
          </TabsContent>

          <TabsContent value="targets">
            <SectionCard title="יעדי משמרת" icon={<Target className="w-6 h-6 ml-2 text-indigo-500" />}>
                {loadingShiftDetails && shiftTargets.length === 0 ? (
                    <div className="text-center text-neutral-500 py-4">טוען יעדים...</div>
                ) : shiftTargets.length === 0 ? (
                     <div className="text-center text-neutral-500 py-8">
                        <Goal className="w-12 h-12 mx-auto text-indigo-300 opacity-70 mb-2"/>
                        לא הוגדרו יעדים למ משמרת זו.
                    </div>
                ) : (
                    <ScrollArea className="max-h-[450px] pr-1">
                        <div className="space-y-3">
                        {shiftTargets.map(target => (
                            <Card key={target.id} className="clay-card bg-white/95 !p-3 shadow-sm">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-sm font-medium text-neutral-700 flex-grow">{target.description}</p>
                                    <p className="text-xs text-indigo-600 font-semibold shrink-0 ml-2">
                                        {target.completed} / {target.required}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-full bg-neutral-200 rounded-full h-2.5 overflow-hidden">
                                        <div 
                                            className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300" 
                                            style={{ width: `${target.progress || 0}%` }}
                                        ></div>
                                    </div>
                                    {target.completed < target.required && (
                                         <Button size="xs" variant="outline" className="clay-button !text-xs !py-0.5 !px-1.5 border-indigo-200 text-indigo-600" onClick={() => handleTargetUpdate(target.id, 1)}>
                                            <Plus className="w-3 h-3"/>
                                        </Button>
                                    )}
                                     {target.completed > 0 && (
                                        <Button size="xs" variant="outline" className="clay-button !text-xs !py-0.5 !px-1.5 border-orange-200 text-orange-600" onClick={() => handleTargetUpdate(target.id, -1)}>
                                            <Minus className="w-3 h-3"/>
                                        </Button>
                                    )}
                                </div>
                                {target.target_role_id && <Badge variant="outline" className="mt-1 text-xs bg-purple-50 text-purple-700 border-purple-200">משויך לתפקיד: {getRoleName(target.target_role_id)}</Badge>}
                            </Card>
                        ))}
                        </div>
                    </ScrollArea>
                )}
            </SectionCard>
          </TabsContent>
          
          <TabsContent value="log">
            <SectionCard 
                title="יומן משמרת" 
                icon={<BookOpen className="w-6 h-6 ml-2 text-purple-500" />}
                actions={
                    <Button
                        variant="outline"
                        className="clay-button bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200 text-sm"
                        onClick={() => { setNewNoteContent(''); setShowAddNoteModal(true); }}
                    >
                        <Plus className="w-4 h-4 ml-1"/> הוסף הערה ליומן
                    </Button>
                }
            >
                {loadingShiftDetails && shiftLog.length === 0 ? (
                    <div className="text-center text-neutral-500 py-4">טוען יומן...</div>
                ) : shiftLog.length === 0 ? (
                    <div className="text-center text-neutral-500 py-8">
                        <MessageSquare className="w-12 h-12 mx-auto text-purple-300 opacity-70 mb-2"/>
                        יומן המשמרת ריק.
                    </div>
                ) : (
                    <ScrollArea className="max-h-[450px] pr-2">
                        <div className="space-y-3">
                            {shiftLog.slice().reverse().map((entry, index) => ( // Show newest first
                                <div key={index} className="p-3 bg-purple-50/70 rounded-lg border border-purple-200 shadow-sm">
                                    <div className="flex justify-between items-center text-xs text-purple-700 mb-1">
                                        <span className="font-medium">{getUserFullName(entry.user_id)} • <Badge variant="secondary" className="text-xs">{entry.event_type || 'הערה'}</Badge></span>
                                        <span>{formatDateTime(entry.timestamp)}</span>
                                    </div>
                                    <p className="text-sm text-neutral-700 whitespace-pre-line">{entry.content}</p>
                                     {entry.related_entity_id && <p className="text-xs text-neutral-500 mt-1">קשור לישות: {entry.related_entity_id.substring(0,8)}...</p>}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </SectionCard>
          </TabsContent>
          
          <TabsContent value="shortcuts">
            <SectionCard title="פעולות מהירות" icon={<Zap className="w-6 h-6 ml-2 text-yellow-500" />}>
                {shortcuts.length === 0 ? (
                    <p className="text-neutral-500 text-center py-4">לא הוגדרו קיצורי דרך עבורך.</p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {shortcuts.map((shortcut) => (
                        <Button
                            key={shortcut.id}
                            onClick={() => handleShortcutClick(shortcut)}
                            className={`clay-button h-auto p-3 flex flex-col items-start justify-center text-right border-2 ${getColorClass(shortcut.color)} transition-all duration-150 hover:shadow-md`}
                            variant="outline"
                        >
                            <div className="flex items-center mb-1">
                            {getIcon(shortcut.icon)}
                            <span className="font-semibold text-sm mr-2">{shortcut.title}</span>
                            </div>
                            {shortcut.description && <span className="text-xs opacity-80 block w-full">{shortcut.description}</span>}
                        </Button>
                    ))}
                    </div>
                )}
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* Staff Profile Modal */}
      <Dialog open={showStaffProfileModal} onOpenChange={setShowStaffProfileModal}>
        <DialogContent className="clay-card sm:max-w-2xl md:max-w-3xl max-h-[85vh]">
            <DialogHeader>
                <DialogTitle className="text-xl flex items-center">
                    <UserCircle className="w-6 h-6 ml-2 text-primary-600"/>
                    פרופיל איש צוות: {selectedStaffMemberForProfile?.full_name}
                </DialogTitle>
            </DialogHeader>
            <ScrollArea className="pr-1 -mr-2 max-h-[70vh]">
                {selectedStaffMemberForProfile ? (
                    <UserProfileCard 
                        user={selectedStaffMemberForProfile} 
                        rolesData={rolesData} 
                        sitesData={locations} 
                        institutionsData={institutions} 
                        groupsData={groups} 
                    />
                ) : <p>טוען פרטי פרופיל...</p>}
            </ScrollArea>
             <DialogFooter>
                <Button variant="outline" className="clay-button" onClick={() => setShowStaffProfileModal(false)}>סגור</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Modal */}
      <Dialog open={showAddNoteModal} onOpenChange={setShowAddNoteModal}>
        <DialogContent className="clay-card">
          <DialogHeader>
            <DialogTitle>הוספת הערה ליומן המשמרת</DialogTitle>
          </DialogHeader>
          <Textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="כתוב את תוכן ההערה כאן..."
            className="min-h-[100px] clay-textarea"
          />
          <DialogFooter>
            <Button variant="outline" className="clay-button" onClick={() => setShowAddNoteModal(false)}>ביטול</Button>
            <Button className="clay-button bg-purple-600 text-white hover:bg-purple-700" onClick={addShiftNote}>הוסף הערה</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    {/* Add/Edit Staff Member Modal */}
    <Dialog open={showAddStaffModal} onOpenChange={setShowAddStaffModal}>
        <DialogContent className="clay-card sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>הוספת איש צוות למשמרת</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox 
                        id="is_manual_staff" 
                        checked={newStaffMember.is_manual} 
                        onCheckedChange={(checked) => setNewStaffMember(prev => ({...prev, is_manual: !!checked, user_id: ''}))}
                        className="clay-checkbox"
                    />
                    <label htmlFor="is_manual_staff" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        הוספה ידנית (לא משתמש מערכת)
                    </label>
                </div>

                {newStaffMember.is_manual ? (
                    <>
                        <div>
                            <label htmlFor="manual_name" className="block text-sm font-medium mb-1">שם מלא (ידני)</label>
                            <Input 
                                id="manual_name" 
                                value={newStaffMember.manual_name} 
                                onChange={(e) => setNewStaffMember(prev => ({...prev, manual_name: e.target.value}))}
                                className="clay-input"
                                placeholder="לדוגמה: ישראל ישראלי"
                            />
                        </div>
                        <div>
                            <label htmlFor="manual_email" className="block text-sm font-medium mb-1">אימייל (ידני, אופציונלי)</label>
                            <Input 
                                id="manual_email" 
                                type="email"
                                value={newStaffMember.manual_email} 
                                onChange={(e) => setNewStaffMember(prev => ({...prev, manual_email: e.target.value}))}
                                className="clay-input"
                            />
                        </div>
                    </>
                ) : (
                    <div>
                        <label htmlFor="user_id" className="block text-sm font-medium mb-1">בחר איש צוות</label>
                        <Select value={newStaffMember.user_id} onValueChange={(value) => setNewStaffMember(prev => ({...prev, user_id: value}))}>
                            <SelectTrigger className="clay-select">
                                <SelectValue placeholder="בחר איש צוות מהרשימה" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={null}>בחר איש צוות</SelectItem>
                                {availableUsers.map(user => (
                                    <SelectItem key={user.id} value={user.id}>{user.full_name} ({user.email})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                
                <div>
                    <label htmlFor="role_id" className="block text-sm font-medium mb-1">תפקיד</label>
                    <Select value={newStaffMember.role_id} onValueChange={(value) => setNewStaffMember(prev => ({...prev, role_id: value}))}>
                        <SelectTrigger className="clay-select">
                            <SelectValue placeholder="בחר תפקיד" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={null}>בחר תפקיד</SelectItem>
                            {rolesData.map(role => (
                                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label htmlFor="staff_notes" className="block text-sm font-medium mb-1">הערות (אופציונלי)</label>
                    <Textarea 
                        id="staff_notes" 
                        value={newStaffMember.notes} 
                        onChange={(e) => setNewStaffMember(prev => ({...prev, notes: e.target.value}))}
                        placeholder="הערות לגבי איש הצוות במשמרת זו"
                        className="clay-textarea"
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" className="clay-button" onClick={() => {
                    setShowAddStaffModal(false);
                    setNewStaffMember({ user_id: '', role_id: '', notes: '', is_manual: false, manual_name: '', manual_email: '' });
                }}>ביטול</Button>
                <Button className="clay-button bg-green-600 text-white hover:bg-green-700" onClick={handleAddStaffSubmit}>הוסף למשמרת</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
