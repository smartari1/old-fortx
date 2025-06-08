

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { User } from "@/api/entities";
import { CustomDataType } from "@/api/entities";
import { Role } from "@/api/entities";
import {
  ChevronDown,
  ChevronUp,
  LogOut as LogOutIcon,
  Menu,
  X,
  AlertCircle,
  Users,
  Map,
  Calendar,
  FileText,
  Shield,
  Home,
  Database,
  Settings,
  LayoutGrid,
  Box,
  Briefcase,
  Car,
  ListChecks,
  ClipboardEdit,
  Plus,
  Monitor,
  BarChart3,
  CheckSquare,
  UserCircle as UserCircleIcon,
  Bell as BellIcon, // Renamed to BellIcon to avoid conflict
  Moon,
  Sun,
  Search,
  FileCog,
  MessageSquare,
  BrainCircuit,
  Route as RouteIcon,
  Zap, // Added Zap icon
  Workflow, // Added Workflow icon
  Building // Added Building icon for Organization Settings
} from "lucide-react";
import AIAssistant from "@/components/ai/AIAssistant";
import { Notification } from '@/api/entities';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

// Add Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Ensure createPageUrl is robust enough if it's defined here
// This is the definition from the original layout provided.
export const createPageUrl = (pageName) => {
  if (!pageName) return "/";
  const [path, queryParams] = pageName.split("?"); // This might be the problematic part if pageName itself has params.
  const base = path.startsWith("/") ? path : `/${path}`;
  // If the original pageName already had queryParams, this might overwrite or misconstruct.
  // However, in the CustomDataView.jsx fix, we are now passing only the base page name
  // to createPageUrl and appending query params separately, which should be safer.
  return queryParams ? `${base}?${queryParams}` : base;
};

export default function Layout({ children, currentPageName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [customDataTypes, setCustomDataTypes] = useState([]);
  const location = useLocation();
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [allSystemRoles, setAllSystemRoles] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isNotificationsPopoverOpen, setIsNotificationsPopoverOpen] = useState(false);
  const [organizationSettings, setOrganizationSettings] = useState(null); // Add organization settings


  const iconComponents = {
    Users,
    Car,
    Box,
    Shield,
    Map,
    Calendar,
    ListChecks,
    Settings,
    Database,
    AlertCircle,
    FileText,
    Briefcase,
    LayoutGrid,
    Home,
    ClipboardEdit,
    Cog: Settings,
    MessageSquare,
    BrainCircuit,
    Route: RouteIcon,
    Bell: BellIcon, // Ensure Bell is mapped if used dynamically in customDataTypes
    Zap, // Added Zap
    Workflow, // Added Workflow
    Building // Added Building
  };
  const DefaultIcon = ListChecks;


  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    const fetchOrganizationSettings = async () => {
      try {
        // Import OrganizationSettings entity dynamically
        const { OrganizationSettings } = await import('@/api/entities');
        const settings = await OrganizationSettings.list();
        if (settings.length > 0) {
          setOrganizationSettings(settings[0]);
        }
      } catch (error) {
        console.error("Error fetching organization settings:", error);
      }
    };

    const fetchCustomDataTypes = async () => {
      try {
        const types = await CustomDataType.list();
        // Mocking 'Guards' custom data type for development/testing
        const mockGuardsType = {
          id: 'mock-guards-id', // Unique ID for mock data
          name: 'מאבטחים', // Hebrew for Guards
          slug: 'guards',
          icon: 'Shield', // Using Shield icon as it's appropriate for guards
          fields: [] // Can be empty or defined for full mock
        };
        // Add mock type if it doesn't already exist from the backend response
        const updatedTypes = types.some(type => type.slug === 'guards') ? types : [...types, mockGuardsType];
        setCustomDataTypes(updatedTypes);
      } catch (error) {
        console.error("Error fetching custom data types for layout:", error);
        // If an error occurs, still set mock data to ensure functionality for dev
        // This ensures the "Guards" menu item appears even if the API call fails
        setCustomDataTypes([{
          id: 'mock-guards-id',
          name: 'מאבטחים',
          slug: 'guards',
          icon: 'Shield',
          fields: []
        }]);
      }
    };

    const fetchRoles = async () => {
      try {
        const roles = await Role.list();
        setAllSystemRoles(roles);
      } catch (error) {
        console.error("Layout: Error fetching system roles:", error);
      }
    };
    fetchUser();
    fetchOrganizationSettings(); // Add this call
    fetchCustomDataTypes();
    fetchRoles();
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (currentUser) {
        try {
          // Fetch latest 20 notifications for the current user, sorted by most recent unread first, then most recent read
          const userNotifications = await Notification.filter(
            { user_id: currentUser.id },
            ['-status', '-created_date'], // Sort by status (unread first), then by creation date
            20 // Limit to 20
          );
          setNotifications(userNotifications);
          const unreadCount = userNotifications.filter(n => n.status === 'unread').length;
          setUnreadNotificationsCount(unreadCount);
        } catch (error) {
          console.error("Error fetching notifications:", error);
        }
      }
    };

    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 60000); // Refresh notifications every minute

    return () => clearInterval(intervalId);
  }, [currentUser]);

  const markNotificationAsRead = async (notificationId) => {
    try {
      await Notification.update(notificationId, { status: 'read', read_at: new Date().toISOString() });
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, status: 'read' } : n))
      );
      setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUser || unreadNotificationsCount === 0) return;
    try {
      const unreadNotifs = notifications.filter(n => n.status === 'unread');
      for (const notif of unreadNotifs) {
        await Notification.update(notif.id, { status: 'read', read_at: new Date().toISOString() });
      }
      setNotifications(prev => prev.map(n => n.status === 'unread' ? { ...n, status: 'read' } : n));
      setUnreadNotificationsCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const toggleSubMenu = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = async () => {
    await User.logout();
  };

  const toggleAiAssistant = () => {
    setIsAiAssistantOpen(prev => !prev);
  };

  const menuItems = [
    {
      name: "Dashboard",
      label: "לוח מחוונים",
      icon: <Home className="w-5 h-5" />,
      url: createPageUrl("Dashboard")
    },
    {
      name: "GuardDashboard",
      label: "דשבורד מאבטח",
      icon: <Shield className="w-5 h-5" />,
      url: createPageUrl("GuardDashboard"),
    },
    {
      name: "ShiftManagerDashboard",
      label: "ניהול משמרת",
      icon: <LayoutGrid className="w-5 h-5" />,
      url: createPageUrl("ShiftManagerDashboard"),
    },
    {
      name: "DispatcherDashboard",
      label: "לוח מוקדן",
      icon: <MessageSquare className="w-5 h-5" />,
      url: createPageUrl("DispatcherDashboard"),
    },
    {
      name: "SiteMapPage",
      label: "מפת האתר",
      icon: <Map className="w-5 h-5" />,
      url: createPageUrl("SiteMapPage"),
    },
    {
      name: "incidents-group",
      label: "ניהול טיקטים",
      icon: <AlertCircle className="w-5 h-5" />,
      children: [
        { name: "Incidents", label: "טיקטים ודיווחים", url: createPageUrl("Incidents") },
        { name: "CreateIncidentPage", label: "דיווח טיקט חדש", icon: <Plus className="w-4 h-4" />, url: createPageUrl("CreateIncidentPage") },
        { name: "IncidentDefinitions", label: "הגדרות אירוע", url: createPageUrl("IncidentDefinitions") },
        { name: "Procedures", label: "נהלים ופעולות", url: createPageUrl("Procedures") },
        { name: "FormBuilder", label: "בונה טפסים", icon: <ClipboardEdit className="w-5 h-5" />, url: createPageUrl("FormBuilder") },
        { name: "AutomatedReportsPage", label: "דוחות אוטומטיים", icon: <FileCog className="w-4 h-4" />, url: createPageUrl("AutomatedReportsPage") }
      ]
    },
    {
      name: "automations-group",
      label: "מערכת אוטומציות",
      icon: <Zap className="w-5 h-5" />,
      children: [
        { name: "AutomationsPage", label: "ניהול אוטומציות", icon: <Workflow className="w-5 h-5" />, url: createPageUrl("AutomationsPage") }
      ]
    },
    {
      name: "users-group",
      label: "ניהול משתמשים",
      icon: <Users className="w-5 h-5" />,
      children: [
        { name: "Users", label: "משתמשים", url: createPageUrl("Users") },
        { name: "Roles", label: "תפקידים", url: createPageUrl("Roles") },
        { name: "Groups", label: "קבוצות", url: createPageUrl("Groups") }
      ]
    },
    {
      name: "organizational-data-group",
      label: "נתונים ארגוניים",
      icon: <Database className="w-5 h-5" />,
      children: [
        { name: "ManageDataTypes", label: "ניהול סוגי דאטה", icon: <Settings className="w-5 h-5" />, url: createPageUrl("ManageDataTypes") },
        ...customDataTypes.map(cdt => {
          const IconComponent = iconComponents[cdt.icon] || DefaultIcon;
          return {
            name: `CustomDataView_${cdt.slug}`,
            label: cdt.name,
            icon: <IconComponent className="w-5 h-5" />,
            url: createPageUrl(`CustomDataView?dataTypeSlug=${cdt.slug}`)
          };
        })
      ]
    },
    {
      name: "system-settings-group",
      label: "הגדרות מערכת",
      icon: <Settings className="w-5 h-5" />,
      children: [
        { name: "OrganizationSettings", label: "הגדרות הארגון", icon: <Building className="w-5 h-5" />, url: createPageUrl("OrganizationSettings") },
        { name: "DashboardManagement", label: "ניהול לוחות מחוונים", icon: <Monitor className="w-5 h-5" />, url: createPageUrl("DashboardManagement") },
        { name: "ShiftTemplatesPage", label: "ניהול משמרות ותבניות", icon: <FileText className="w-5 h-5" />, url: createPageUrl("ShiftTemplatesPage") },
        { name: "RoutesPage", label: "ניהול מסלולים", icon: <RouteIcon className="w-5 h-5" />, url: createPageUrl("Routes") }
      ]
    },
    {
      name: "Resources",
      label: "ניהול משאבים",
      icon: <Box className="w-5 h-5" />,
      url: createPageUrl("Resources")
    },
    {
      name: "Locations",
      label: "מפות ומיקומים",
      icon: <Map className="w-5 h-5" />,
      url: createPageUrl("Locations")
    }
  ];

  const processedMenuItems = menuItems;

  const styles = {
    sidebar: `fixed top-0 right-0 h-full transform transition-transform duration-300 ease-in-out z-50 
              w-72 text-right 
              bg-lavender-50 backdrop-blur-md
              shadow-[0_8px_30px_rgb(0,0,0,0.12)]
              ${isOpen ? "translate-x-0" : "translate-x-full"} 
              md:translate-x-0 flex flex-col`, // Ensures flex column layout
    logoContainer: `p-5 pt-5 pb-3 border-b border-lavender-200`, // Container for logo, with bottom padding/border
    logo: `flex items-center justify-between 
           bg-white bg-opacity-70 backdrop-blur-sm 
           rounded-2xl shadow-inner border-2 border-lavender-100 p-3`,
    navContainer: `flex-grow overflow-y-auto p-5 pt-3`, // This will contain the scrollable menu items
    menuItem: `mb-2 rounded-2xl text-gray-700 font-medium relative
              hover:text-indigo-600 transition-all duration-200`,
    menuButton: `flex items-center justify-between w-full p-4 
                rounded-2xl text-right transition-all duration-200
                hover:bg-white hover:bg-opacity-60 hover:shadow-md`,
    activeItem: `bg-white bg-opacity-70 text-indigo-600 shadow-md
                border-l-4 border-indigo-500`,
    submenu: `mt-1 mb-2 pl-5 space-y-1 text-sm`,
    submenuItem: `block p-3 rounded-xl hover:bg-white hover:bg-opacity-60
                 transition-all duration-200 text-gray-600`,
    activeSubmenuItem: `bg-white bg-opacity-70 text-indigo-600 font-medium shadow-sm`,
    content: `min-h-screen transition-all duration-300 md:mr-72`,
    mobileHeader: `flex justify-between items-center p-4 md:hidden
                  bg-white bg-opacity-90 backdrop-blur-md 
                  shadow-md rounded-b-2xl`,
    bottomUserInfo: `p-5 pt-3 border-t border-lavender-200`, // Container for user info, with top padding/border
    userInfoButton: `flex items-center w-full p-2 rounded-xl hover:bg-white hover:bg-opacity-50 
                     transition-all duration-200 text-sm`,
    logoutButton: `clay-button w-full flex items-center justify-center gap-1.5 
                   !py-1.5 !px-2 text-xs bg-red-50 text-red-600 hover:bg-red-100 border-red-100 mt-2`,
    // Added for notification popover styling
    notificationIconContainer: `relative`,
    notificationBadge: `absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center`,
    notificationPopoverContent: `w-80 md:w-96 clay-card p-0`,
    notificationHeader: `p-3 border-b flex justify-between items-center`,
    notificationTitle: `font-semibold text-neutral-700`,
    notificationLink: `text-xs text-primary-600 hover:underline`,
    notificationItem: `p-3 border-b last:border-b-0 hover:bg-neutral-50/50 transition-colors cursor-pointer`,
    notificationItemUnread: `bg-primary-50`, // Highlight for unread notifications
    notificationItemContent: `text-sm text-neutral-700 mb-0.5`,
    notificationItemTime: `text-xs text-neutral-500`,
    notificationEmptyState: `p-6 text-center text-neutral-500`,
  };


  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 text-gray-800">
      <style jsx="true">{`
        :root {
          --color-primary-50: #f0f9ff;
          --color-primary-100: #e0f2fe;
          --color-primary-200: #bae6fd;
          --color-primary-300: #7dd3fc;
          --color-primary-400: #38bdf8;
          --color-primary-500: #0ea5e9;
          --color-primary-600: #0284c7;
          --color-primary-700: #0369a1;
          
          --color-neutral-50: #f8fafc;
          --color-neutral-100: #f1f5f9;
          --color-neutral-200: #e2e8f0;
          --color-neutral-300: #cbd5e1;
          --color-neutral-400: #94a3b8;
          --color-neutral-500: #64748b;
          --color-neutral-600: #475569;
          --color-neutral-700: #334155;
          --color-neutral-800: #1e293b;
          --color-neutral-900: #0f172a;

          --color-success-100: #dcfce7;
          --color-success-700: #15803d;
          --color-warning-100: #fef9c3;
          --color-warning-700: #a16207;
          --color-danger-100: #fee2e2;
          --color-danger-700: #b91c1c;
          --color-info-100: #dbeafe;
          --color-info-700: #1d4ed8;
        }
        body {
          font-family: 'Assistant', 'Segoe UI', sans-serif;
          color: var(--color-neutral-800);
        }
        .clay-card {
          border-radius: 1rem;
          background-color: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(8px);
          padding: 1.25rem;
          box-shadow: 
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -2px rgba(0, 0, 0, 0.05),
            inset 0 0 0 1px rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.2s ease-in-out;
        }
        .clay-card:hover {
          box-shadow: 
            0 10px 15px -3px rgba(0, 0, 0, 0.1),
            0 4px 6px -4px rgba(0, 0, 0, 0.05),
            inset 0 0 0 1px rgba(255, 255, 255, 0.6);
        }
        .clay-button {
          border-radius: 0.75rem;
          padding: 0.625rem 1rem;
          font-weight: 500;
          background-color: white;
          box-shadow: 
            0 1px 3px rgba(0, 0, 0, 0.1),
            0 1px 2px rgba(0, 0, 0, 0.06);
          border: 1px solid var(--color-neutral-200);
          transition: all 0.2s ease;
          color: var(--color-primary-600);
        }
        .clay-button:hover {
          background-color: var(--color-primary-50);
          border-color: var(--color-primary-200);
          transform: translateY(-1px);
          box-shadow: 
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -2px rgba(0, 0, 0, 0.05);
        }
        .clay-button:active {
          transform: translateY(0px);
          box-shadow: 
            0 1px 2px rgba(0, 0, 0, 0.05);
        }
        .clay-input, .clay-select, .clay-textarea {
          border-radius: 0.5rem;
          padding: 0.625rem 0.875rem;
          background-color: white;
          border: 1px solid var(--color-neutral-200);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
        }
        .clay-input:focus, .clay-select:focus, .clay-textarea:focus {
          outline: none;
          border-color: var(--color-primary-500);
          box-shadow: 
            0 0 0 3px rgba(14, 165, 233, 0.15);
        }
        /* Custom scrollbar for navContainer */
        .nav-container-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .nav-container-scrollbar::-webkit-scrollbar-track {
          background: transparent; /* Make track transparent */
        }
        .nav-container-scrollbar::-webkit-scrollbar-thumb {
          background: var(--color-neutral-300);
          border-radius: 8px;
        }
        .nav-container-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--color-neutral-400);
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: var(--color-neutral-100);
          border-radius: 8px;
        }
        ::-webkit-scrollbar-thumb {
          background: var(--color-neutral-300);
          border-radius: 8px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: var(--color-neutral-400);
        }
        .modal-overlay {
          backdrop-filter: blur(4px);
        }
        .modal-content {
          border-radius: 1rem;
          box-shadow:
            0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 8px 10px -6px rgba(0, 0, 0, 0.05);
        }
        .status-indicator {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .status-open {
          background-color: var(--color-danger-100);
          color: var(--color-danger-700);
        }
        .status-in-progress {
          background-color: var(--color-warning-100);
          color: var(--color-warning-700);
        }
        .status-closed {
          background-color: var(--color-success-100);
          color: var(--color-success-700);
        }
      `}</style>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm z-40 md:hidden"
          onClick={toggleMenu}
        />
      )}

      <button
        onClick={toggleAiAssistant}
        className="fixed bottom-5 left-5 z-[99] p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 ease-in-out transform hover:scale-110 clay-button"
        aria-label="Open AI Assistant"
      >
        {isAiAssistantOpen ? <ChevronDown className="w-7 h-7" /> : <BrainCircuit className="w-7 h-7" />}
      </button>

      <AIAssistant isOpen={isAiAssistantOpen} onClose={toggleAiAssistant} />

      <div className={styles.sidebar}>
        <div className={styles.logoContainer}>
          <div className={styles.logo}>
            <div className="flex items-center gap-3">
              {organizationSettings?.logo_small_url ? (
                <img 
                  src={organizationSettings.logo_small_url} 
                  alt="לוגו הארגון" 
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <Shield className="w-8 h-8 text-primary-600" />
              )}
              <div className="flex flex-col">
                <span className="font-bold text-lg">
                  {organizationSettings?.organization_name || 'מערכת אבטחה'}
                </span>
                <span className="text-xs text-neutral-500">ניהול אבטחה וביטחון</span>
              </div>
            </div>
            {/* Notification Icon in Sidebar (Desktop) */}
            <div className="hidden md:flex items-center gap-2">
              <Popover open={isNotificationsPopoverOpen} onOpenChange={setIsNotificationsPopoverOpen}>
                <PopoverTrigger asChild>
                  <button className={`${styles.notificationIconContainer} p-2 rounded-full hover:bg-neutral-100`}>
                    <BellIcon className="w-5 h-5 text-neutral-600" />
                    {unreadNotificationsCount > 0 && (
                      <span className={styles.notificationBadge}>{unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className={styles.notificationPopoverContent} side="bottom" align="end">
                  <div className={styles.notificationHeader}>
                    <h3 className={styles.notificationTitle}>התראות</h3>
                    {unreadNotificationsCount > 0 && (
                      <button onClick={markAllAsRead} className={styles.notificationLink}>סמן הכל כנקרא</button>
                    )}
                  </div>
                  <ScrollArea className="max-h-80">
                    {notifications.length > 0 ? (
                      notifications.map(notif => (
                        <Link
                          to={notif.action_url || '#'}
                          key={notif.id}
                          className={`${styles.notificationItem} ${notif.status === 'unread' ? styles.notificationItemUnread : ''}`}
                          onClick={() => {
                            if (notif.status === 'unread') markNotificationAsRead(notif.id);
                            setIsNotificationsPopoverOpen(false); // Close popover on click
                          }}
                        >
                          <p className={styles.notificationItemContent}>
                            <strong className="font-medium">{notif.title}</strong>: {notif.message}
                          </p>
                          <p className={styles.notificationItemTime}>
                            {formatDistanceToNow(new Date(notif.created_date || notif.sent_at || Date.now()), { addSuffix: true, locale: he })}
                          </p>
                        </Link>
                      ))
                    ) : (
                      <div className={styles.notificationEmptyState}>
                        <BellIcon className="w-10 h-10 mx-auto mb-2 text-neutral-300" />
                        אין התראות חדשות
                      </div>
                    )}
                  </ScrollArea>
                  <div className="p-2 border-t text-center">
                    <Link to={createPageUrl("AllNotificationsPage")} onClick={() => setIsNotificationsPopoverOpen(false)} className={styles.notificationLink}>
                      כל ההתראות
                    </Link>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <button // Mobile menu toggle
              className="md:hidden p-1 rounded-full hover:bg-neutral-100"
              onClick={toggleMenu}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className={`${styles.navContainer} nav-container-scrollbar`}>
          {processedMenuItems.map((item) => {
            const isParentActive = item.children?.some(child => location.pathname === child.url || (child.url && location.pathname.startsWith(child.url.split('?')[0])));
            const isActive = (item.url && (location.pathname === item.url || location.pathname.startsWith(item.url.split('?')[0]))) || isParentActive;

            return (
              <div key={item.name} className={`${styles.menuItem}`}>
                {item.children ? (
                  <>
                    <button
                      className={`${styles.menuButton} ${isActive ? styles.activeItem : ''}`}
                      onClick={() => toggleSubMenu(item.name)}
                    >
                      <span className="flex items-center gap-3">
                        {item.icon}
                        {item.label}
                      </span>
                      {expanded[item.name] || isParentActive ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {(expanded[item.name] || isParentActive) && (
                      <div className={styles.submenu}>
                        {item.children.map((child) => {
                          const isChildActive = child.url && (location.pathname === child.url || location.pathname.startsWith(child.url.split('?')[0]));
                          return (
                            <Link
                              key={child.name}
                              to={child.url}
                              className={`${styles.submenuItem} ${isChildActive ? styles.activeSubmenuItem : ''}`}
                              onClick={() => isOpen && toggleMenu()}
                            >
                              <span className="flex items-center gap-2">
                                {child.icon && React.cloneElement(child.icon, { className: "w-4 h-4" })}
                                {child.label}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.url}
                    className={`${styles.menuButton} ${isActive ? styles.activeItem : ''}`}
                    onClick={() => isOpen && toggleMenu()}
                  >
                    <span className="flex items-center gap-3">
                      {item.icon}
                      {item.label}
                    </span>
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        <div className={styles.bottomUserInfo}>
          {currentUser && (
            <button className={styles.userInfoButton}>
              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs">
                {currentUser.full_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="mr-2 flex-1 min-w-0 text-right">
                <p className="font-medium text-xs truncate text-neutral-700">{currentUser.full_name}</p>
                <p className="text-xs text-neutral-500 truncate">{currentUser.email}</p>
              </div>
            </button>
          )}
          <button
            onClick={handleLogout}
            className={styles.logoutButton}
          >
            <LogOutIcon className="w-3.5 h-3.5" />
            <span>התנתק</span>
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <header className={styles.mobileHeader}>
          <button
            className="clay-button p-2 flex items-center justify-center"
            onClick={toggleMenu}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            {organizationSettings?.logo_small_url ? (
              <img 
                src={organizationSettings.logo_small_url} 
                alt="לוגו הארגון" 
                className="w-6 h-6 object-contain"
              />
            ) : (
              <Shield className="w-6 h-6 text-primary-600" />
            )}
            <span className="font-bold">
              {organizationSettings?.organization_name || 'מערכת אבטחה'}
            </span>
          </div>
          {/* Notification Icon in Mobile Header */}
          <Popover open={isNotificationsPopoverOpen} onOpenChange={setIsNotificationsPopoverOpen}>
            <PopoverTrigger asChild>
              <button className={`${styles.notificationIconContainer} p-2 rounded-full hover:bg-neutral-100`}>
                <BellIcon className="w-6 h-6 text-neutral-600" />
                {unreadNotificationsCount > 0 && (
                  <span className={styles.notificationBadge}>{unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className={styles.notificationPopoverContent} side="bottom" align="end">
              <div className={styles.notificationHeader}>
                <h3 className={styles.notificationTitle}>התראות</h3>
                {unreadNotificationsCount > 0 && (
                  <button onClick={markAllAsRead} className={styles.notificationLink}>סמן הכל כנקרא</button>
                )}
              </div>
              <ScrollArea className="max-h-80">
                {notifications.length > 0 ? (
                  notifications.map(notif => (
                    <Link
                      to={notif.action_url || '#'}
                      key={notif.id}
                      className={`${styles.notificationItem} ${notif.status === 'unread' ? styles.notificationItemUnread : ''}`}
                      onClick={() => {
                        if (notif.status === 'unread') markNotificationAsRead(notif.id);
                        setIsNotificationsPopoverOpen(false);
                      }}
                    >
                      <p className={styles.notificationItemContent}>
                        <strong className="font-medium">{notif.title}</strong>: {notif.message}
                      </p>
                      <p className={styles.notificationItemTime}>
                        {formatDistanceToNow(new Date(notif.created_date || notif.sent_at || Date.now()), { addSuffix: true, locale: he })}
                      </p>
                    </Link>
                  ))
                ) : (
                  <div className={styles.notificationEmptyState}>
                    <BellIcon className="w-10 h-10 mx-auto mb-2 text-neutral-300" />
                    אין התראות חדשות
                  </div>
                )}
              </ScrollArea>
              <div className="p-2 border-t text-center">
                <Link to={createPageUrl("AllNotificationsPage")} onClick={() => setIsNotificationsPopoverOpen(false)} className={styles.notificationLink}>
                  כל ההתראות
                </Link>
              </div>
            </PopoverContent>
          </Popover>
        </header>
        <main className="p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

