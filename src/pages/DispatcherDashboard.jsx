
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  Users,
  ListChecks,
  AlertTriangle,
  Plus,
  Eye,
  UserCircle,
  FileText as FileTextIcon,
  CheckCircle2,
  Target,
  Calendar,
  MapPin,
  User as UserIcon, // Renamed to avoid conflict with other User imports
  MessageSquare,
  Activity,
  Briefcase,
  Info,
  Goal,
  RotateCw,
  Zap,
  BookOpen,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Eye as EyeIcon, // Renamed to avoid conflict
  LogIn, // New import
  LogOut // New import
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress"; // Added Progress import

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
import { format, parseISO } from 'date-fns';

const iconComponents = {
  Plus, FileTextIcon, AlertTriangle, Users, ListChecks, ShieldCheck, Zap, BookOpen, EyeIcon,
};

export default function DispatcherDashboard() {
  const navigate = useNavigate();
  const [shortcuts, setShortcuts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeShift, setActiveShift] = useState(null); // Assuming one active shift relevant to dispatcher
  const [shiftIncidents, setShiftIncidents] = useState([]);
  const [shiftStaff, setShiftStaff] = useState([]);
  const [shiftTargets, setShiftTargets] = useState([]); // This will now include assigned_user_id
  
  const [allUsers, setAllUsers] = useState([]); // Existing state for users
  const [rolesData, setRolesData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [userProfiles, setUserProfiles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [institutions, setInstitutions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingShiftDetails, setLoadingShiftDetails] = useState(false);
  const [error, setError] = useState(null);

  const [selectedStaffMemberForProfile, setSelectedStaffMemberForProfile] = useState(null);
  const [showStaffProfileModal, setShowStaffProfileModal] = useState(false);
  const [activeTab, setActiveTab] = useState("team"); // Default tab changed to 'team'

  const getIcon = (iconName) => {
    const IconComponent = iconComponents[iconName] || Plus;
    return <IconComponent className="w-5 h-5" />;
  };

  const getColorClass = (color) => {
    const colorMap = {
      blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200',
      green: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200',
      red: 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200',
      yellow: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200',
      purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200',
      orange: 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200',
    };
    return colorMap[color] || colorMap.blue;
  };

  const getUserTargetProgress = (userId) => {
    // This function will still calculate progress for any targets stored in shiftTargets,
    // which might include unassigned targets or targets specifically fetched for this overview.
    // The detailed display within the combined 'team' tab will use the embedded targets in `shiftStaff`.
    const userTargets = (shiftTargets || []).filter(t => t.assigned_user_id === userId);
    if (userTargets.length === 0) return { completed: 0, total: 0, percentage: 0 };
    
    const completed = userTargets.reduce((sum, target) => sum + (target.completed || 0), 0);
    const total = userTargets.reduce((sum, target) => sum + (target.required || 0), 0);
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    return { completed, total, percentage };
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await User.me();
      setCurrentUser(user);

      const [
        fetchedAllUsers, fetchedRoles, allDbShortcuts, allShifts,
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
      const dispatcherShortcuts = (allDbShortcuts || []).filter(shortcut =>
        shortcut.is_active && userRoleIds.includes(shortcut.target_role_id) // Or a specific dispatcher role ID
      );
      setShortcuts(dispatcherShortcuts);

      const now = new Date();
      let currentActiveShift = (allShifts || []).find(s => {
        const startTime = new Date(s.start_time);
        const endTime = new Date(s.end_time);
        return (s.status === 'active' || (startTime <= now && endTime >= now && s.status !== 'completed' && s.status !== 'cancelled'));
      });
      
      if (!currentActiveShift && user.site_id) {
          const upcomingSiteShifts = (allShifts || [])
            .filter(s => s.site === user.site_id && new Date(s.start_time) > now && s.status === 'scheduled')
            .sort((a,b) => new Date(a.start_time) - new Date(b.start_time));
          if (upcomingSiteShifts.length > 0) currentActiveShift = upcomingSiteShifts[0];
      }
      if(!currentActiveShift) {
        const globallyUpcoming = (allShifts || [])
            .filter(s => new Date(s.start_time) > now && s.status === 'scheduled')
            .sort((a,b) => new Date(a.start_time) - new Date(b.start_time));
        if(globallyUpcoming.length > 0) currentActiveShift = globallyUpcoming[0];
      }

      setActiveShift(currentActiveShift);

    } catch (err) {
      console.error('Error loading dispatcher dashboard data:', err);
      setError(`שגיאה בטעינת נתונים: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveShiftDetails = async (shift) => {
    if (!shift || !shift.id) {
      setShiftIncidents([]);
      setShiftStaff([]);
      setShiftTargets([]);
      return;
    }
    setLoadingShiftDetails(true);
    try {
      const [incidentsData, shiftDataWithDetails] = await Promise.all([
        Incident.filter({ shift_id: shift.id }, '-created_date'),
        Shift.get(shift.id)
      ]);

      setShiftIncidents(incidentsData || []);

      if (shiftDataWithDetails && shiftDataWithDetails.staff) {
        const populatedStaff = shiftDataWithDetails.staff.map(member => {
          const userDetail = allUsers.find(u => u.id === member.user_id);
          const profile = userProfiles.find(p => p.user_id === member.user_id);
          const roleDetail = rolesData.find(r => r.id === member.role);
          
          // Get targets assigned to this user
          const userTargets = (shiftDataWithDetails.shift_targets_status || [])
            .filter(target => target.assigned_user_id === member.user_id)
            .map(targetStatus => {
              const definition = targetStatus.target_definition || {};
              const categoryName = categories.find(c => c.id === definition.incident_category_id)?.name || 'לא ידוע';
              const progress = definition.count > 0 ? (targetStatus.completed_count / definition.count) * 100 : 0;
              return {
                id: targetStatus.target_id,
                description: definition.description || `יעד לקטגוריה: ${categoryName}`,
                required: definition.count,
                completed: targetStatus.completed_count,
                progress: Math.min(progress, 100),
                related_incident_ids: targetStatus.related_incident_ids || [],
                category_name: categoryName
              };
            });

          return {
            ...member,
            user_name: userDetail ? userDetail.full_name : (member.name || 'משתמש ידני'),
            user_email: userDetail ? userDetail.email : (member.email || ''),
            phone: profile?.phone || '',
            role_name: roleDetail ? roleDetail.name : 'תפקיד לא ידוע',
            is_manual: !member.user_id,
            targets: userTargets // Add user targets to staff member
          };
        });
        setShiftStaff(populatedStaff);
      } else {
        setShiftStaff([]);
      }

      // We still set shift targets for the separate targets tab if needed
      // This state can hold all targets, including unassigned ones.
      if (shiftDataWithDetails && shiftDataWithDetails.shift_targets_status) {
        setShiftTargets(shiftDataWithDetails.shift_targets_status.map(targetStatus => {
          const definition = targetStatus.target_definition || {};
          const categoryName = categories.find(c => c.id === definition.incident_category_id)?.name || 'לא ידוע';
          const progress = definition.count > 0 ? (targetStatus.completed_count / definition.count) * 100 : 0;
          return {
            id: targetStatus.target_id,
            description: definition.description || `יעד לקטגוריה: ${categoryName}`,
            required: definition.count,
            completed: targetStatus.completed_count,
            progress: Math.min(progress, 100),
            related_incident_ids: targetStatus.related_incident_ids || [],
            assigned_user_id: targetStatus.assigned_user_id
          };
        }));
      } else {
        setShiftTargets([]);
      }
    } catch (err) {
      console.error("Error loading active shift details:", err);
      setShiftIncidents([]); setShiftStaff([]); setShiftTargets([]);
    } finally {
      setLoadingShiftDetails(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (activeShift && activeShift.id) {
      loadActiveShiftDetails(activeShift);
    } else {
      setShiftIncidents([]);
      setShiftStaff([]);
      setShiftTargets([]);
    }
  }, [activeShift?.id, allUsers, rolesData, categories, userProfiles]);

  const handleShortcutClick = (shortcut) => {
    if (shortcut.shortcut_type === 'create_incident') {
      const params = new URLSearchParams();
      if (shortcut.incident_category_id) params.append('category', shortcut.incident_category_id);
      if (shortcut.incident_sub_category_id) params.append('subcategory', shortcut.incident_sub_category_id);
      if (activeShift) {
        params.append('shift_id', activeShift.id);
        params.append('site', activeShift.site);
      }
      navigate(createPageUrl(`CreateIncidentPage?${params.toString()}`));
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
            role_names: profile?.roles?.map(roleId => rolesData.find(r => r.id === roleId)?.name).filter(Boolean) || [],
            group_names: profile?.groups?.map(groupId => groups.find(g => g.id === groupId)?.name).filter(Boolean) || [],
            site_name: profile?.site_id ? getSiteName(profile.site_id) : 'לא משויך',
            institution_name: profile?.institution_id ? getInstitutionName(profile.institution_id) : 'לא משויך',
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
  const getSiteName = (siteId) => locations.find(loc => loc.id === siteId)?.name || 'אתר לא ידוע';
  const getGroupName = (groupId) => groups.find(g => g.id === groupId)?.name || 'קבוצה לא ידועה';
  const getInstitutionName = (institutionId) => institutions.find(i => i.id === institutionId)?.name || 'מוסד לא ידוע';

  const formatTime = (dateString) => dateString ? new Date(dateString).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('he-IL') : 'N/A';
  const formatDateTime = (dateString) => dateString ? new Date(dateString).toLocaleString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'}) : 'N/A';

  const SectionCard = ({ title, icon, children, actions, fullHeight = false }) => (
      <Card className={`clay-card bg-white bg-opacity-90 ${fullHeight ? 'h-full flex flex-col' : ''}`}>
          <CardHeader>
              <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-xl font-semibold text-neutral-700">
                      {icon}
                      {title}
                  </CardTitle>
                  {actions && <div className="flex gap-2">{actions}</div>}
              </div>
          </CardHeader>
          <CardContent className={`${fullHeight ? 'flex-grow overflow-y-auto' : ''}`}>
              {children}
          </CardContent>
      </Card>
  );
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)]">
        <RotateCw className="w-12 h-12 text-primary-500 animate-spin mb-4" />
        <p className="text-lg text-neutral-600">טוען נתוני מוקדן...</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 p-4 md:p-6" dir="rtl">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-800 flex items-center">
              <LayoutDashboard className="w-7 h-7 md:w-8 md:h-8 ml-3 text-sky-600" />
              לוח בקרה - מוקדן
            </h1>
            {activeShift && (
              <Badge className="bg-sky-100 text-sky-700 border-sky-200 px-3 py-1.5 text-sm font-medium border flex items-center gap-2 mt-2 sm:mt-0 shadow-sm">
                <Activity className="w-4 h-4" />
                משמרת פעילה
              </Badge>
            )}
          </div>
          {currentUser && (
             <p className="text-neutral-600 text-sm md:text-base mt-1">
                שלום {currentUser.full_name}, מוקדן {activeShift ? `במשמרת באתר ${getSiteName(activeShift.site)}` : 'ללא משמרת פעילה כרגע'}
            </p>
          )}
        </div>

        {!activeShift && !loading && (
          <Card className="clay-card bg-white/80 text-center py-12">
            <CardHeader>
              <CardTitle className="text-2xl text-sky-700">אין משמרת פעילה</CardTitle>
              <CardDescription className="text-neutral-500 mt-2">
                כרגע אין משמרת פעילה המשויכת אליך או למערכת.
                <br />
                צור קשר עם מנהל המשמרת או המתן לתחילת המשמרת הבאה.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center mt-4">
                <Button variant="outline" className="clay-button" onClick={() => loadDashboardData()}>
                    <RotateCw className="w-4 h-4 ml-2"/> רענן נתונים
                </Button>
            </CardFooter>
          </Card>
        )}

        {activeShift && (
          <div className="space-y-6">
            {/* Shift Overview - Minimal */}
            <Card className="clay-card bg-white/90">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold text-neutral-700 flex items-center">
                        <Briefcase className="w-5 h-5 ml-2 text-sky-600" />
                        פרטי משמרת נוכחית
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><strong className="text-neutral-500 block">אתר:</strong> {getSiteName(activeShift.site)}</div>
                    <div><strong className="text-neutral-500 block">תאריך:</strong> {formatDate(activeShift.start_time)}</div>
                    <div><strong className="text-neutral-500 block">שעות:</strong> {`${formatTime(activeShift.start_time)} - ${formatTime(activeShift.end_time)}`}</div>
                    <div><strong className="text-neutral-500 block">מנהל:</strong> {getUserFullName(activeShift.manager_id)}</div>
                </CardContent>
            </Card>
            
            {/* Main Content Area with Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 gap-2 mb-4">
                <TabsTrigger value="team" className="clay-button data-[state=active]:bg-sky-100 data-[state=active]:text-sky-700 data-[state=active]:border-sky-300">
                    <Users className="w-4 h-4 ml-2" />צוות ויעדים ({shiftStaff.length})
                </TabsTrigger>
                <TabsTrigger value="incidents" className="clay-button data-[state=active]:bg-sky-100 data-[state=active]:text-sky-700 data-[state=active]:border-sky-300">
                    <ListChecks className="w-4 h-4 ml-2" />אירועים ({shiftIncidents.length})
                </TabsTrigger>
                <TabsTrigger value="shortcuts" className="clay-button data-[state=active]:bg-sky-100 data-[state=active]:text-sky-700 data-[state=active]:border-sky-300">
                    <Zap className="w-4 h-4 ml-2" />פעולות מהירות
                </TabsTrigger>
              </TabsList>

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
                                if (activeShift) {
                                    params.append('shift_id', activeShift.id);
                                    params.append('site', activeShift.site);
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
                                        <TableHead className="text-right">תת-קטגוריה</TableHead>
                                        <TableHead className="text-right">סטטוס</TableHead>
                                        <TableHead className="text-right">זמן דיווח</TableHead>
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
                                            <TableCell className="py-2.5">{subCategoryName || '-'}</TableCell>
                                            <TableCell className="py-2.5">
                                                <Badge variant={statusBadgeVariant} className="text-xs font-normal">{statusText}</Badge>
                                            </TableCell>
                                            <TableCell className="py-2.5 text-xs">{formatDateTime(incident.created_date)}</TableCell>
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

              <TabsContent value="team">
                <SectionCard title={`צוות ויעדים - סקירה מהירה (${shiftStaff.length})`} icon={<Users className="w-6 h-6 ml-2 text-green-500" />}>
                    {loadingShiftDetails && shiftStaff.length === 0 ? (
                        <div className="text-center text-neutral-500 py-4">טוען צוות...</div>
                    ) : shiftStaff.length === 0 ? (
                        <div className="text-center text-neutral-500 py-8">לא שובצו עובדים למשמרת זו.</div>
                    ) : (
                        <ScrollArea className="max-h-[600px] pr-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {shiftStaff.map((staffMember, index) => {
                                    const totalTargets = staffMember.targets?.length || 0;
                                    const completedTargets = staffMember.targets?.filter(t => t.completed >= t.required).length || 0;
                                    // overallProgress is for number of targets completed vs total targets
                                    const overallProgress = totalTargets > 0 ? (completedTargets / totalTargets) * 100 : 0; 
                                    // detailedProgress is for sum of completed items vs sum of required items across all targets
                                    const totalRequired = staffMember.targets?.reduce((sum, t) => sum + t.required, 0) || 0;
                                    const totalCompleted = staffMember.targets?.reduce((sum, t) => sum + t.completed, 0) || 0;
                                    const detailedProgress = totalRequired > 0 ? (totalCompleted / totalRequired) * 100 : 0;
                                    
                                    return (
                                        <Card key={staffMember.user_id || staffMember.name || index} className="clay-card bg-white/95 !p-4 shadow-sm">
                                            {/* Header */}
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <h3 className="font-semibold text-neutral-800 text-sm">{staffMember.user_name}</h3>
                                                    <p className="text-xs text-sky-600">{staffMember.role_name}</p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {staffMember.check_in_time ? (
                                                        <Badge className="bg-green-100 text-green-700 text-xs">נוכח</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-xs">לא נכנס</Badge>
                                                    )}
                                                    {staffMember.user_id && (
                                                        <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => openStaffProfileModal(staffMember)}>
                                                            <UserCircle className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
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

                                                    {/* Individual Targets */}
                                                    <div className="space-y-1">
                                                        {staffMember.targets.slice(0, 3).map((target, targetIndex) => (
                                                            <div key={target.id || targetIndex} className="flex items-center justify-between bg-indigo-50/50 rounded px-2 py-1">
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
                                                    <p className="text-xs text-neutral-500">אין יעדים</p>
                                                </div>
                                            )}
                                        </Card>
                                    );
                                })}
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
            
            {/* Shift Log (Optional - could be in a tab or separate section) */}
            {activeShift.shift_log && activeShift.shift_log.length > 0 && (
                <SectionCard title="יומן משמרת" icon={<BookOpen className="w-6 h-6 ml-2 text-purple-500" />}>
                    <ScrollArea className="max-h-80 pr-2">
                        <div className="space-y-3">
                            {activeShift.shift_log.slice().reverse().map((entry, index) => (
                                <div key={index} className="p-3 bg-purple-50/70 rounded-lg border border-purple-200 shadow-sm">
                                    <div className="flex justify-between items-center text-xs text-purple-700 mb-1">
                                        <span className="font-medium">{getUserFullName(entry.user_id)} • {entry.event_type}</span>
                                        <span>{formatDateTime(entry.timestamp)}</span>
                                    </div>
                                    <p className="text-sm text-neutral-700 whitespace-pre-line">{entry.content}</p>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </SectionCard>
            )}

          </div>
        )}
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

    </div>
  );
}
