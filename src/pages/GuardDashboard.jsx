
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Clock, MapPin, ListChecks, AlertTriangle, PlusCircle, CheckCircle, MessageSquare,
  UserCircle, Briefcase, Target as TargetIcon, Zap, Eye, LogOut, ClipboardList, Calendar, Home as HomeIcon,
  ListChecks as ListChecksIcon, Target as TargetIconFromMenu, Plus, Info, Wrench, Phone, FileText, Globe, Activity, LogIn
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { User } from '@/api/entities';
import { Shift } from '@/api/entities';
import { Incident } from '@/api/entities';
import { IncidentCategory } from '@/api/entities';
import { IncidentSubCategory } from '@/api/entities';
import { DashboardShortcut } from '@/api/entities';
import { Role } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Location } from '@/api/entities';
import { ResourceItem } from '@/api/entities';
import { Procedure } from '@/api/entities';
import { Contact } from '@/api/entities';
import { UserProfile } from '@/api/entities';
import { Institution } from '@/api/entities';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import UserProfileCard from '@/components/users/UserProfileCard';

const iconComponentsForShortcuts = {
  PlusCircle, AlertTriangle, ListChecks, CheckCircle, MessageSquare, ClipboardList
};

// SectionCard component for reusability
const SectionCard = ({ title, icon, children, actions, description, className = '', headerClassName = '' }) => (
  <Card className={`clay-card bg-white bg-opacity-90 ${className}`}>
    <CardHeader className={`pb-2 pt-3 px-4 md:pb-3 md:pt-4 md:px-6 ${headerClassName}`}>
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center text-base md:text-lg font-semibold text-neutral-700">
          {icon}
          {title}
        </CardTitle>
        {actions && <div className="flex gap-2 items-center">{actions}</div>}
      </div>
      {description && <CardDescription className="text-xs md:text-sm mt-1">{description}</CardDescription>}
    </CardHeader>
    <CardContent className="px-3 py-3 md:px-4 md:py-4">
      {children}
    </CardContent>
  </Card>
);

export default function GuardDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeGuardShift, setActiveGuardShift] = useState(null);
  const [allAvailableShifts, setAllAvailableShifts] = useState([]);
  const [showShiftSelection, setShowShiftSelection] = useState(false);
  const [shiftIncidents, setShiftIncidents] = useState([]);
  const [guardShortcuts, setGuardShortcuts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [userShiftRole, setUserShiftRole] = useState(null);
  const [shiftStaff, setShiftStaff] = useState([]);
  const [shiftLog, setShiftLog] = useState([]);
  const [allResourceItems, setAllResourceItems] = useState([]);
  const [allProcedures, setAllProcedures] = useState([]);
  const [allContacts, setAllContacts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allUserProfiles, setAllUserProfiles] = useState([]);
  const [allInstitutions, setAllInstitutions] = useState([]);

  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState('status');

  const [selectedStaffMemberForProfile, setSelectedStaffMemberForProfile] = useState(null);
  const [showStaffProfileModal, setShowStaffProfileModal] = useState(false);

  // Global data that is fetched once
  const [globalDataLoaded, setGlobalDataLoaded] = useState(false);
  const [allShifts, setAllShifts] = useState([]);
  const [allIncidents, setAllIncidents] = useState([]);
  const [allDashboardShortcuts, setAllDashboardShortcuts] = useState([]);


  // Effect 1: Fetch initial global data and user data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          user,
          shiftsData,
          incidentsData, 
          categoriesData,
          subcategoriesData,
          rolesData,
          shortcutsData,
          locationsData,
          resourceItemsData,
          proceduresData,
          contactsData,
          usersData,
          userProfilesData,
          institutionsData
        ] = await Promise.all([
          User.me(),
          Shift.list('-start_time'),
          Incident.list('-created_date'),
          IncidentCategory.list(),
          IncidentSubCategory.list(),
          Role.list(),
          DashboardShortcut.list('-order'),
          Location.list(),
          ResourceItem.list(),
          Procedure.list(),
          Contact.list(),
          User.list(),
          UserProfile.list(),
          Institution.list()
        ]);

        setCurrentUser(user);
        setAllUsers(usersData || []);
        setAllUserProfiles(userProfilesData || []);
        setCategories(categoriesData || []);
        setSubcategories(subcategoriesData || []);
        setAllRoles(rolesData || []);
        setAllLocations(locationsData || []);
        setAllResourceItems(resourceItemsData || []);
        setAllProcedures(proceduresData || []);
        setAllContacts(contactsData || []);
        setAllInstitutions(institutionsData || []);

        // Store all shifts, incidents, and shortcuts globally for subsequent processing
        setAllShifts(shiftsData || []);
        setAllIncidents(incidentsData || []);
        setAllDashboardShortcuts(shortcutsData || []);
        
        // Determine initial active shift
        const now = new Date();
        let foundShift = null;
        if (user && shiftsData) {
            // Try to find a shift the user is *actually* assigned to first
            // Active shift first
            const assignedActiveShift = (shiftsData || []).find(s =>
                s.staff?.some(member => member.user_id === user.id) &&
                (s.status === 'active' || (new Date(s.start_time) <= now && new Date(s.end_time) >= now && s.status !== 'completed' && s.status !== 'cancelled'))
            );
            if (assignedActiveShift) {
                foundShift = assignedActiveShift;
            } else {
                // Then scheduled shift
                const assignedScheduledShift = (shiftsData || []).find(s =>
                    s.staff?.some(member => member.user_id === user.id) &&
                    s.status === 'scheduled' && new Date(s.start_time) > now
                );
                if (assignedScheduledShift) {
                    foundShift = assignedScheduledShift;
                }
            }
        }
        
        if (foundShift) {
            setActiveGuardShift(foundShift);
            setShowShiftSelection(false);
        } else if (shiftsData) {
            // No assigned shift, prepare list for demo selection
            const availableForDemo = (shiftsData || []).filter(s => s.status === 'active' || s.status === 'scheduled');
            setAllAvailableShifts(availableForDemo);
            setShowShiftSelection(true);
        }

      } catch (err) {
        console.error("Error loading initial guard dashboard data:", err);
        setError("שגיאה בטעינת נתוני הדשבורד: " + (err.message || err));
      } finally {
        setLoading(false); // Initial loading is done
        setGlobalDataLoaded(true); // Mark global data as loaded
      }
    };

    fetchInitialData();
  }, []); // Run only once on component mount

  // Effect 2: Process data when activeGuardShift changes OR global data is loaded
  useEffect(() => {
    // Only process shift-specific data once global data and current user are loaded
    if (!globalDataLoaded || !currentUser) {
      return;
    }

    if (activeGuardShift) {
      const currentShiftIncidents = allIncidents.filter(
        incident => incident.shift_id === activeGuardShift.id
      );
      setShiftIncidents(currentShiftIncidents);
      
      const populatedStaff = (activeGuardShift.staff || []).map(staffMember => {
        const staffUserDetails = allUsers.find(u => u.id === staffMember.user_id);
        const staffProfileDetails = allUserProfiles.find(up => up.user_id === staffMember.user_id);
        return {
            ...staffMember,
            full_name: staffUserDetails?.full_name || 'שם לא ידוע',
            email: staffUserDetails?.email,
            phone: staffProfileDetails?.phone,
            site: staffProfileDetails?.site_id ? allLocations.find(l=>l.id === staffProfileDetails.site_id)?.name : null,
            roles: staffUserDetails?.roles?.map(roleId => allRoles.find(r => r.id === roleId)) || [],
            profile_image_url: staffProfileDetails?.profile_image_url
        };
      });
      setShiftStaff(populatedStaff);

      const userRoleInShiftObject = populatedStaff.find(m => m.user_id === currentUser.id);
      setUserShiftRole(userRoleInShiftObject?.role || null);
      setShiftLog(activeGuardShift.shift_log || []);

      const relevantShortcuts = (allDashboardShortcuts || []).filter(shortcut =>
        shortcut.is_active && (!shortcut.target_role_id || (userRoleInShiftObject && shortcut.target_role_id === userRoleInShiftObject.role))
      );
      setGuardShortcuts(relevantShortcuts);
    } else {
      // No active shift, clear shift-specific data
      setShiftIncidents([]);
      setShiftStaff([]);
      setUserShiftRole(null);
      setShiftLog([]);
      setGuardShortcuts([]);
    }
  }, [activeGuardShift, globalDataLoaded, currentUser, allIncidents, allUsers, allUserProfiles, allLocations, allRoles, allDashboardShortcuts]);


  const handleDemoShiftSelect = async (selectedShift) => {
    setActiveGuardShift(selectedShift); 
    setShowShiftSelection(false); 
    // The second useEffect will re-run due to activeGuardShift change and load all data for this new shift.
  };
  
  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || "לא ידוע";
  const getSubCategoryName = (id) => subcategories.find(sc => sc.id === id)?.name || "לא ידוע";
  const getRoleName = (id) => allRoles.find(r => r.id === id)?.name || "לא ידוע";
  const getSiteName = (id) => allLocations.find(l => l.id === id)?.name || "לא ידוע";
  const getUserName = (userId) => {
    const user = allUsers.find(u => u.id === userId);
    return user?.full_name || 'משתמש לא ידוע';
  };

  const calculateTargetProgress = (target) => {
    if (!activeGuardShift || !target || !target.target_definition || !target.target_definition.count) return 0;
    const targetDef = target.target_definition;
    const completedCount = target.completed_count || 0;
    if (targetDef.count === 0) return 100;
    return Math.min(Math.round((completedCount / targetDef.count) * 100), 100);
  };

  const getShortcutIcon = (iconName) => {
    const IconComponent = iconComponentsForShortcuts[iconName] || PlusCircle;
    return <IconComponent className="w-6 h-6" />;
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

  const handleShortcutClick = (shortcut) => {
    if (!activeGuardShift) {
        alert("אין משמרת פעילה לשיוך פעולה זו.");
        return;
    }
    if (shortcut.shortcut_type === 'create_incident') {
      let url = 'CreateIncidentPage';
      const params = new URLSearchParams();
      params.append('shift_id', activeGuardShift.id);
      params.append('site_id', activeGuardShift.site);
      if (shortcut.incident_category_id) params.append('category_id', shortcut.incident_category_id);
      if (shortcut.incident_sub_category_id) params.append('sub_category_id', shortcut.incident_sub_category_id);

      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      navigate(createPageUrl(url));
    } else if (shortcut.shortcut_type === 'custom_link' && shortcut.custom_url) {
      if (shortcut.custom_url.startsWith('/')) {
        navigate(createPageUrl(shortcut.custom_url.substring(1)));
      } else {
        window.open(shortcut.custom_url, '_blank');
      }
    }
  };

  const toggleFabMenu = () => setIsFabMenuOpen(!isFabMenuOpen);

  const handleFabAction = (actionType) => {
    if (!activeGuardShift) {
        alert("אין משמרת פעילה.");
        setIsFabMenuOpen(false);
        return;
    }
    if (actionType === 'create_incident_general') {
        navigate(createPageUrl(`CreateIncidentPage?shift_id=${activeGuardShift.id}&site_id=${activeGuardShift.site}`));
    } else if (actionType === 'check_in_out') {
        alert("פונקציית כניסה/יציאה למשמרת תמומש בקרוב עם עדכון לשרת (זהו מצב הדגמה).");
    } else if (actionType === 'log_task') {
        alert("פונקציית תיעוד משימה/סיור תמומש בקרוב (זהו מצב הדגמה).");
    }
    setIsFabMenuOpen(false);
  };
  
  const openStaffProfileModal = (staffMemberUserId) => {
     const staffMemberFullDetails = shiftStaff.find(s => s.user_id === staffMemberUserId);
     if (staffMemberFullDetails) {
        const userForProfile = {
            id: staffMemberFullDetails.user_id,
            full_name: staffMemberFullDetails.full_name,
            email: staffMemberFullDetails.email,
            phone: staffMemberFullDetails.phone,
            roles: staffMemberFullDetails.role ? [allRoles.find(r => r.id === staffMemberFullDetails.role)].filter(Boolean) : [],
        };
        setSelectedStaffMemberForProfile(userForProfile);
        setShowStaffProfileModal(true);
     } else {
        alert("פרטי איש צוות לא נמצאו.")
     }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-100 to-blue-100 p-6 text-neutral-700" dir="rtl">
        <Briefcase className="w-16 h-16 text-primary-500 animate-bounce mb-4" />
        <h1 className="text-2xl font-semibold mb-2">טוען דשבורד מאבטח...</h1>
        <p className="text-neutral-600">נא המתן.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-red-50 p-6 text-red-700" dir="rtl">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-semibold mb-2">שגיאה</h1>
        <p className="text-center">{error}</p>
        <Button onClick={() => navigate(createPageUrl('Dashboard'))} className="mt-6 clay-button bg-red-500 hover:bg-red-600 text-white">
          חזור לדשבורד הראשי
        </Button>
      </div>
    );
  }

  // Display shift selection if no assigned shift is found
  if (!activeGuardShift && showShiftSelection) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 to-blue-100 p-6 text-neutral-700" dir="rtl">
        <UserCircle className="w-16 h-16 text-primary-500 mb-4" />
        <h1 className="text-2xl font-semibold mb-2">שלום {currentUser?.full_name}, אין לך משמרת פעילה כרגע.</h1>
        <p className="text-neutral-600 text-center mb-6">לצורך הדגמה, באפשרותך לבחור להצטרף לאחת מהמשמרות הבאות:</p>
        
        {allAvailableShifts.length > 0 ? (
          <Card className="clay-card w-full max-w-lg">
            <CardHeader>
              <CardTitle>בחר משמרת להדגמה</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {allAvailableShifts.map(shift => (
                    <div key={shift.id} className="p-3 border rounded-lg flex justify-between items-center bg-white/70">
                      <div>
                        <p className="font-semibold">{getSiteName(shift.site) || 'אתר לא צוין'}</p>
                        <p className="text-sm text-neutral-600">
                          {new Date(shift.start_time).toLocaleDateString('he-IL')} | {new Date(shift.start_time).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})} - {new Date(shift.end_time).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}
                        </p>
                        <Badge variant={shift.status === 'active' ? 'success' : 'outline'} className="mt-1 text-xs">
                          {shift.status === 'active' ? 'פעילה' : 'מתוכננת'}
                        </Badge>
                      </div>
                      <Button className="clay-button" onClick={() => handleDemoShiftSelect(shift)}>הצטרף (הדגמה)</Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          <p className="text-neutral-500">לא נמצאו משמרות פעילות או מתוכננות במערכת להדגמה.</p>
        )}
        <Button onClick={() => navigate(createPageUrl('Dashboard'))} className="mt-8 clay-button">
            חזרה לדף הראשי
        </Button>
      </div>
    );
  }
  
  // If no active shift is found and selection isn't shown (e.g., no shifts available for demo)
  if (!activeGuardShift && !showShiftSelection && !loading) {
       return (
           <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 to-blue-100 p-6 text-neutral-700" dir="rtl">
             <Info className="w-16 h-16 text-primary-500 mb-4" />
             <h1 className="text-2xl font-semibold mb-2">בדיקת נתונים...</h1>
             <p className="text-neutral-600 text-center mb-6">נראה שאין לך משמרת פעילה כרגע ואין משמרות זמינות להדגמה.</p>
             <Button onClick={() => navigate(createPageUrl('Dashboard'))} className="mt-8 clay-button">
                 חזרה לדף הראשי
             </Button>
           </div>
       );
  }

  // Main dashboard content
  const personalShiftEntry = activeGuardShift ? shiftStaff.find(s => s.user_id === currentUser?.id) : null;
  const relevantShiftTargets = activeGuardShift?.shift_targets_status?.filter(target => {
    const targetDef = target.target_definition;
    if (!targetDef) return false;
    // If user has a specific role in this demo shift, filter by it. Otherwise show all for demo.
    const userRoleForDemo = userShiftRole || null;
    return !targetDef.target_role_id || (userRoleForDemo && targetDef.target_role_id === userRoleForDemo);
  }) || [];

  const fabActions = [
    { id: 'create_incident_general', label: 'דיווח אירוע חדש', icon: <AlertTriangle className="w-5 h-5 text-red-500" />, action: () => handleFabAction('create_incident_general') },
    { id: 'log_task', label: 'תיעוד משימה/סיור', icon: <ListChecksIcon className="w-5 h-5 text-blue-500" />, action: () => handleFabAction('log_task') },
    { id: 'check_in_out', label: personalShiftEntry?.check_in_time && !personalShiftEntry?.check_out_time ? 'יציאה מהמשמרת' : 'כניסה למשמרת', icon: personalShiftEntry?.check_in_time && !personalShiftEntry?.check_out_time ? <LogOut className="w-5 h-5 text-neutral-500" /> : <LogIn className="w-5 h-5 text-neutral-500" />, action: () => handleFabAction('check_in_out') },
  ];
  
  const relevantContacts = activeGuardShift ? allContacts.filter(contact => 
    contact.type === 'emergency' || contact.site_id === activeGuardShift.site
  ) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 pb-20 md:pb-6" dir="rtl">
      <div className="max-w-4xl mx-auto p-3 md:p-6">
        {/* Header */}
        <header className="mb-4 md:mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Shield className="w-7 h-7 md:w-8 md:h-8 text-primary-500" />
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-primary-700">
                  דשבורד מאבטח
                </h1>
                <p className="text-xs md:text-sm text-neutral-600">שלום, {currentUser?.full_name}!</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="clay-button hidden md:flex"
              onClick={() => navigate(createPageUrl('Dashboard'))}
            >
                <LogOut className="w-4 h-4 ml-1" /> חזרה לדשבורד ראשי
            </Button>
          </div>
          {activeGuardShift?.status === 'scheduled' && (
            <div className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full inline-block">
                <Calendar className="w-3 h-3 inline ml-1" />
                משמרת מתוכננת מתחילה ב: {new Date(activeGuardShift.start_time).toLocaleString('he-IL')}
            </div>
          )}
          {activeGuardShift?.status === 'active' && (
            <div className="mt-2 px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full inline-block">
                <Activity className="w-3 h-3 inline ml-1" />
                משמרת פעילה: {new Date(activeGuardShift.start_time).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})} - {new Date(activeGuardShift.end_time).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}
            </div>
          )}
        </header>

        {/* Real-time Status Section */}
        {activeBottomTab === 'status' && activeGuardShift && (
            <SectionCard
            title="מצב בזמן אמת"
            icon={<Clock className="w-5 h-5 md:w-6 md:h-6 ml-2 text-blue-500" />}
            className="mb-4 md:mb-6"
            >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm md:text-base">
                <div>
                <p className="text-neutral-500 font-medium">שיבוץ נוכחי:</p>
                <p className="text-neutral-700 font-semibold flex items-center">
                    <MapPin className="w-4 h-4 ml-1 text-neutral-400"/>
                    אתר: {getSiteName(activeGuardShift.site)}
                </p>
                <p className="text-neutral-700 font-semibold flex items-center">
                    <Calendar className="w-4 h-4 ml-1 text-neutral-400"/>
                    זמנים: {new Date(activeGuardShift.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} - {new Date(activeGuardShift.end_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-neutral-700 font-semibold flex items-center">
                    <Briefcase className="w-4 h-4 ml-1 text-neutral-400"/>
                    תפקידך: {personalShiftEntry ? getRoleName(personalShiftEntry.role) : 'לא משויך תפקיד (הדגמה)'}
                </p>
                </div>
                <div>
                    <p className="text-neutral-500 font-medium">סטטוס כניסה:</p>
                    {personalShiftEntry?.check_in_time ? (
                        <p className="text-green-600 font-semibold">
                            נכנסת למשמרת ב: {new Date(personalShiftEntry.check_in_time).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}
                        </p>
                    ) : (
                        <p className="text-orange-600 font-semibold">טרם נרשמה כניסה למשמרת (או הדגמה).</p>
                    )}
                </div>
                <div>
                <p className="text-neutral-500 font-medium">סטטוס מיקום:</p>
                <p className="text-orange-600 font-semibold flex items-center">
                    <Info className="w-4 h-4 ml-1"/>
                    מיקום GPS / NFC ימומש בעתיד
                </p>
                </div>
                 <div>
                    <p className="text-neutral-500 font-medium">הודעות מהמוקד:</p>
                    <div className="bg-yellow-50 border border-yellow-200 p-2 rounded-md max-h-24 overflow-y-auto">
                        {(shiftLog || []).filter(log => log.event_type === 'note' && log.is_urgent).length > 0 ? 
                            (shiftLog || []).filter(log => log.event_type === 'note' && log.is_urgent).map((log, idx) => (
                                <p key={idx} className="text-yellow-700 text-xs"><strong>{getUserName(log.user_id)}:</strong> {log.content}</p>
                            )) :
                            <p className="text-yellow-700 text-xs">אין הודעות דחופות חדשות מהמוקד.</p>
                        }
                    </div>
                </div>
            </div>
            </SectionCard>
        )}
        
        {/* My Tasks/Objectives Section */}
        {activeBottomTab === 'tasks' && activeGuardShift && (
            <SectionCard
            title="משימות ויעדים"
            icon={<TargetIcon className="w-5 h-5 md:w-6 md:h-6 ml-2 text-indigo-500" />}
            className="mb-4 md:mb-6"
            description="יעדים שהוגדרו למשמרת או לתפקידך האישי."
            >
            {relevantShiftTargets.length === 0 ? (
                <div className="text-center text-neutral-500 py-4 md:py-6">
                <CheckCircle className="w-8 h-8 md:w-10 md:h-10 mx-auto text-green-500 opacity-70 mb-1 md:mb-2"/>
                <p className="text-sm md:text-base">אין משימות או יעדים פתוחים עבורך במשמרת זו.</p>
                </div>
            ) : (
                <div className="space-y-3 md:space-y-4">
                {relevantShiftTargets.map((target, index) => {
                    const progress = calculateTargetProgress(target);
                    const targetDef = target.target_definition;
                    const completedCount = target.completed_count || 0;

                    return (
                    <div key={target.template_target_id || index} className="p-2.5 md:p-3 border rounded-xl bg-slate-50/70 shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                        <div>
                            <p className="font-medium text-neutral-800 text-xs md:text-sm leading-tight">
                            {targetDef.description || `השלם ${targetDef.count} אירועי ${getCategoryName(targetDef.incident_category_id)}`}
                            </p>
                            {targetDef.target_role_id && (
                            <Badge variant="outline" className="text-[10px] md:text-xs mt-1 px-1.5 py-0.5">יעד אישי</Badge>
                            )}
                            {!targetDef.target_role_id && (
                            <Badge variant="outline" className="text-[10px] md:text-xs mt-1 px-1.5 py-0.5 bg-blue-50 text-blue-700">יעד כללי</Badge>
                            )}
                        </div>
                        <Badge className={`text-[10px] md:text-xs px-1.5 py-0.5 ${progress === 100 ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {completedCount} / {targetDef.count}
                        </Badge>
                        </div>
                        <Progress value={progress} className="h-1.5 md:h-2 [&>*]:bg-gradient-to-r [&>*]:from-indigo-400 [&>*]:to-purple-500" />
                        {progress === 100 && <p className="text-[10px] md:text-xs text-green-600 mt-1 flex items-center"><CheckCircle className="w-2.5 h-2.5 md:w-3 md:h-3 ml-1"/>הושלם!</p>}
                         {progress < 100 && (
                            <div className="mt-2 flex justify-end gap-2">
                                <Button size="xs" variant="outline" className="clay-button !text-[10px] !py-0.5 !px-1.5">הוסף הערה</Button>
                                <Button size="xs" className="clay-button !text-[10px] !py-0.5 !px-1.5 bg-green-100 text-green-700">סמן כבוצע</Button>
                            </div>
                         )}
                    </div>
                    );
                })}
                </div>
            )}
            </SectionCard>
        )}

        {/* Incident Reporting Section */}
        {activeBottomTab === 'incidents' && activeGuardShift && (
            <>
            <SectionCard
                title="דיווח אירועים / חריגים"
                icon={<AlertTriangle className="w-5 h-5 md:w-6 md:h-6 ml-2 text-red-500" />}
                className="mb-4 md:mb-6"
                description="דווח במהירות על אירועים חריגים או צור אירוע חדש עם פרטים מלאים."
            >
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {guardShortcuts.length === 0 ? (
                    <p className="text-neutral-500 text-sm md:text-base col-span-full text-center">אין קיצורי דרך מוגדרים עבורך.</p>
                ) : (
                    guardShortcuts.map((shortcut) => (
                        <Button
                            key={shortcut.id}
                            onClick={() => handleShortcutClick(shortcut)}
                            className={`clay-button h-auto p-3 flex flex-col items-center justify-center text-center border-2 ${getColorClass(shortcut.color)} transition-all duration-150 hover:shadow-md`}
                            variant="outline"
                        >
                            {getShortcutIcon(shortcut.icon)}
                            <span className="font-semibold text-sm mt-1">{shortcut.title}</span>
                            {shortcut.description && <span className="text-xs opacity-80 block w-full mt-0.5">{shortcut.description}</span>}
                        </Button>
                    ))
                )}
                </div>
                <Button
                onClick={() => handleFabAction('create_incident_general')}
                className="clay-button w-full bg-red-100 text-red-700 hover:bg-red-200 border-red-200"
                >
                <Plus className="w-4 h-4 ml-2" />
                צור אירוע חדש (מפורט)
                </Button>
            </SectionCard>

            {/* Open/Relevant Incidents */}
            <Card className="clay-card bg-white bg-opacity-90">
              <CardHeader className="pb-2 pt-3 px-4 md:pb-3 md:pt-4 md:px-6">
                <CardTitle className="flex items-center text-base md:text-lg font-semibold text-neutral-700">
                  <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 ml-2 text-red-500" />
                  אירועים במשמרת ({shiftIncidents.length})
                </CardTitle>
                 <CardDescription className="text-xs md:text-sm">אירועים פתוחים או בטיפול במשמרת זו.</CardDescription>
              </CardHeader>
              <CardContent className="px-2 py-2 md:px-4 md:py-4">
                {shiftIncidents.length === 0 ? (
                  <div className="text-center text-neutral-500 py-4 md:py-6">
                    <CheckCircle className="w-8 h-8 md:w-10 md:h-10 mx-auto text-green-500 opacity-70 mb-1 md:mb-2"/>
                    <p className="text-sm md:text-base">אין אירועים רשומים במשמרת זו.</p>
                  </div>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {shiftIncidents.map(incident => (
                      <div key={incident.id} className="p-2.5 md:p-3 border rounded-xl hover:shadow-sm transition-shadow bg-white shadow">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-neutral-800 text-sm md:text-base leading-tight">{incident.title}</h3>
                            <p className="text-[11px] md:text-xs text-neutral-500">
                              {getCategoryName(incident.category)}
                              {incident.sub_category ? ` > ${getSubCategoryName(incident.sub_category)}` : ''}
                            </p>
                          </div>
                          <Badge 
                            className={`text-[10px] md:text-xs px-1.5 py-0.5 md:px-2 md:py-1 ${incident.status === 'open' ? 'bg-red-100 text-red-700' : 
                                            incident.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : 
                                            'bg-green-100 text-green-700'}`}
                          >
                            {incident.status === 'open' ? 'פתוח' : incident.status === 'in_progress' ? 'בטיפול' : 'סגור'}
                          </Badge>
                        </div>
                        <p className="text-xs md:text-sm text-neutral-600 mt-1 line-clamp-2">{incident.description}</p>
                        <div className="mt-1.5 md:mt-2 flex justify-between items-center text-[10px] md:text-xs text-neutral-500">
                          <span>נוצר: {new Date(incident.created_date).toLocaleDateString('he-IL', {day:'2-digit', month:'2-digit'})}, {new Date(incident.created_date).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}</span>
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="text-primary-600 hover:text-primary-700 p-0 h-auto text-[11px] md:text-xs"
                            onClick={() => navigate(createPageUrl(`ManageIncidentPage?id=${incident.id}`))}
                          >
                            <Eye className="w-3 h-3 md:w-3.5 h-3.5 ml-0.5 md:ml-1"/> פרטים
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </>
        )}

        {/* Equipment & Vital Information Section */}
        {activeBottomTab === 'info' && activeGuardShift && (
            <SectionCard
            title="ציוד ומידע חיוני"
            icon={<Wrench className="w-5 h-5 md:w-6 md:h-6 ml-2 text-orange-500" />}
            className="mb-4 md:mb-6"
            description="רשימת ציוד אישי, נהלי חירום ואנשי קשר."
            >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                    <p className="text-neutral-500 font-medium mb-1">הציוד שלי:</p>
                    {allResourceItems.filter(item => item.assigned_to_user_id === currentUser?.id || (item.assigned_to_shift_id === activeGuardShift.id && !item.assigned_to_user_id)).length === 0 ? (
                        <p className="text-neutral-600 text-sm">אין ציוד משויך כרגע.</p>
                    ) : (
                        <ScrollArea className="h-32">
                        <ul className="list-disc pr-4 text-sm text-neutral-700 space-y-1">
                        {allResourceItems.filter(item => item.assigned_to_user_id === currentUser?.id || (item.assigned_to_shift_id === activeGuardShift.id && !item.assigned_to_user_id)).map(item => (
                            <li key={item.id}>{item.item_identifier} ({item.status})</li>
                        ))}
                        </ul>
                        </ScrollArea>
                    )}
                </div>
                <div>
                    <p className="text-neutral-500 font-medium mb-1">אנשי קשר רלוונטיים:</p>
                    <ScrollArea className="h-32">
                    <ul className="text-sm text-neutral-700 space-y-1">
                        {activeGuardShift.manager_id && (
                        <li className="flex items-center">
                            <UserCircle className="w-4 h-4 ml-1 text-neutral-400"/>
                            <span className="font-semibold">מנהל משמרת:</span> {getUserName(activeGuardShift.manager_id)}
                        </li>
                        )}
                        <li className="flex items-center"><Phone className="w-4 h-4 ml-1 text-neutral-400"/><span className="font-semibold">מוקד ראשי:</span> 03-xxxxxxx</li>
                        <li className="flex items-center"><Phone className="w-4 h-4 ml-1 text-neutral-400"/><span className="font-semibold">משטרה:</span> 100</li>
                        {relevantContacts.map(contact => (
                             <li key={contact.id} className="flex items-center">
                                <UserCircle className="w-4 h-4 ml-1 text-neutral-400"/>
                                <span className="font-semibold">{contact.full_name}:</span> {contact.phone || 'לא זמין'}
                            </li>
                        ))}
                    </ul>
                    </ScrollArea>
                </div>
                <div className="md:col-span-2">
                    <p className="text-neutral-500 font-medium mb-1">נהלי חירום:</p>
                    {allProcedures.filter(proc => proc.is_emergency_procedure).length === 0 ? (
                        <p className="text-neutral-600 text-sm">אין נהלי חירום מוגדרים.</p>
                    ) : (
                        <ScrollArea className="h-32">
                        <ul className="list-disc pr-4 text-sm text-neutral-700 space-y-1">
                            {allProcedures.filter(proc => proc.is_emergency_procedure).map(proc => (
                                <li key={proc.id}>
                                    <a href={createPageUrl(`Procedures?id=${proc.id}`)} className="text-blue-600 hover:underline">{proc.name}</a>
                                </li>
                            ))}
                        </ul>
                        </ScrollArea>
                    )}
                </div>
            </div>
            </SectionCard>
        )}

        {/* General Site Info Section */}
        {activeBottomTab === 'site_info' && activeGuardShift && (
             <SectionCard
                title="מידע כללי על האתר"
                icon={<Globe className="w-5 h-5 md:w-6 md:h-6 ml-2 text-gray-500" />}
                className="mb-4 md:mb-6"
                description="סקירה מהירה של מצב האתר, אירועים ומזג אוויר."
            >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                <p className="text-neutral-500 font-medium">סטטוס אתר כללי:</p>
                <Badge className="bg-blue-100 text-blue-700 text-base">מצב שגרה</Badge>
                </div>
                <div>
                <p className="text-neutral-500 font-medium">סה"כ אירועים פתוחים באתר (במשמרת זו):</p>
                <p className="text-neutral-700 text-base font-semibold">
                    {shiftIncidents.filter(inc => inc.status !== 'closed').length}
                </p>
                </div>
                <div>
                <p className="text-neutral-500 font-medium">עדכון מזג אוויר:</p>
                <p className="text-neutral-600">שירות מזג אוויר ימומש בעתיד.</p>
                </div>
                <div>
                <p className="text-neutral-500 font-medium">מפה כללית של האתר:</p>
                <Button
                    variant="outline"
                    size="sm"
                    className="clay-button bg-blue-50 text-blue-700 hover:bg-blue-100"
                    onClick={() => navigate(createPageUrl(`Locations?site_id=${activeGuardShift.site}`))}
                >
                    <MapPin className="w-4 h-4 ml-1" />
                    פתח מפת אתר
                </Button>
                </div>
            </div>
            </SectionCard>
        )}
      </div>

      {/* Bottom Navigation Bar - Mobile Only */}
      {activeGuardShift && (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white shadow-top z-50 flex md:hidden items-center justify-around border-t border-neutral-200 clay-card !rounded-t-2xl !rounded-b-none">
            <button 
                onClick={() => setActiveBottomTab('status')}
                className={`flex flex-col items-center justify-center h-full px-3 transition-colors ${activeBottomTab === 'status' ? 'text-primary-600' : 'text-neutral-500 hover:text-primary-500'}`}
            >
            <Clock className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">סטטוס</span>
            </button>
            
            <button 
                onClick={() => setActiveBottomTab('incidents')}
                className={`flex flex-col items-center justify-center h-full px-3 transition-colors ${activeBottomTab === 'incidents' ? 'text-primary-600' : 'text-neutral-500 hover:text-primary-500'}`}
            >
            <AlertTriangle className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">אירועים</span>
            </button>

            <div className="w-16 h-16"></div> {/* FAB Area */}

            <button
                onClick={() => setActiveBottomTab('tasks')}
                className={`flex flex-col items-center justify-center h-full px-3 transition-colors ${activeBottomTab === 'tasks' ? 'text-primary-600' : 'text-neutral-500 hover:text-primary-500'}`}
            >
            <TargetIconFromMenu className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">משימות</span>
            </button>

            <button
                onClick={() => setActiveBottomTab('info')}
                className={`flex flex-col items-center justify-center h-full px-3 transition-colors ${activeBottomTab === 'info' ? 'text-primary-600' : 'text-neutral-500 hover:text-primary-500'}`}
            >
            <Wrench className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">מידע</span>
            </button>
        </div>
      )}

      {/* Floating Action Button (FAB) and its Menu */}
      {activeGuardShift && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[51] md:hidden">
            {isFabMenuOpen && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 w-56 space-y-2">
                {fabActions.map(action => (
                <button
                    key={action.id}
                    onClick={action.action}
                    className="w-full flex items-center gap-3 p-3 bg-white rounded-xl shadow-lg hover:bg-neutral-50 transition-colors clay-button"
                >
                    {action.icon}
                    <span className="text-sm font-medium text-neutral-700">{action.label}</span>
                </button>
                ))}
            </div>
            )}
            <button
            onClick={toggleFabMenu}
            className={`w-14 h-14 rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center shadow-xl transition-transform duration-200 ease-in-out transform hover:scale-105 active:scale-95 clay-button ${isFabMenuOpen ? 'rotate-45' : ''}`}
            aria-label="פעולות מהירות"
            >
            <Plus className={`w-7 h-7 transition-transform duration-200 ${isFabMenuOpen ? 'rotate-0' : ''}`} />
            </button>
        </div>
      )}

      {/* Staff Profile Modal */}
      {selectedStaffMemberForProfile && (
        <Dialog open={showStaffProfileModal} onOpenChange={setShowStaffProfileModal}>
            <DialogContent className="clay-card sm:max-w-md md:max-w-lg max-h-[85vh]">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center">
                        <UserCircle className="w-6 h-6 ml-2 text-primary-600"/>
                        פרופיל: {selectedStaffMemberForProfile.full_name}
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="pr-1 -mr-2 max-h-[70vh]">
                    <UserProfileCard
                        user={selectedStaffMemberForProfile}
                        rolesData={allRoles}
                        sitesData={allLocations}
                        institutionsData={allInstitutions}
                        groupsData={allUsers.find(u => u.id === selectedStaffMemberForProfile.id)?.groups || []}
                    />
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" className="clay-button" onClick={() => setShowStaffProfileModal(false)}>סגור</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
