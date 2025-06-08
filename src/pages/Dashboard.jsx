
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Report } from "@/api/entities";
import { ResourceItem } from "@/api/entities";
import { Shift } from "@/api/entities";
import { Incident } from "@/api/entities"; 
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom"; // Added useNavigate
import { 
  AlertCircle, 
  FileText, 
  Users, 
  Calendar, 
  CheckCircle2,
  Clock,
  ChevronRight,
  AlertTriangle,
  Shield,
  Box,
  Map,
  ArrowUpRight,
  FileWarning, 
  ClipboardEdit, 
  Database, 
  ListChecks,
  Briefcase, 
  Wrench 
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate(); // Initialize useNavigate
  const [stats, setStats] = useState({
    openIncidents: 0,
    totalIncidents: 0,
    mostCriticalOpenIncidentTitle: "", // New detail
    activeShifts: 0,
    totalStaffInActiveShifts: 0, // New detail
    maintainableResources: 0,
    oldestMaintainableResourceName: "", // New detail
    openReports: 0,
    oldestOpenReportTitle: "" // New detail
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentOpenIncidents, setRecentOpenIncidents] = useState([]);
  const [upcomingShifts, setUpcomingShifts] = useState([]);
  const [resourceAlerts, setResourceAlerts] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
        
        // Fetch Incidents
        const incidents = await Incident.list("-created_date");
        const openIncidents = incidents.filter(incident => incident.status === "open" || incident.status === "in_progress");
        setRecentOpenIncidents(openIncidents.slice(0, 3)); 
        // Logic to find most critical open incident can be complex, for now, take the newest if priority isn't defined.
        // If Incident entity had a 'priority' field, we'd use that.
        const mostCriticalIncident = openIncidents.length > 0 ? openIncidents[0] : null;

        // Fetch shifts
        const now = new Date();
        const shifts = await Shift.list(); 
        const activeShifts = shifts.filter(shift => {
          const startTime = new Date(shift.start_time);
          const endTime = new Date(shift.end_time);
          return startTime <= now && endTime >= now;
        });
        const totalStaffInActive = activeShifts.reduce((sum, shift) => sum + (shift.staff?.length || 0), 0);

        const nextDay = new Date(now);
        nextDay.setHours(nextDay.getHours() + 24);
        const upcoming = shifts.filter(shift => {
          const startTime = new Date(shift.start_time);
          return startTime > now && startTime <= nextDay;
        }).sort((a,b) => new Date(a.start_time) - new Date(b.start_time)).slice(0, 3);
        setUpcomingShifts(upcoming);
        
        // Resource alerts
        const resources = await ResourceItem.list();
        const alertResources = resources.filter(resource => 
          resource.status === "דרוש בדיקה" || resource.status === "דרוש תיקון" || resource.status === "בתיקון"
        );
        setResourceAlerts(alertResources.slice(0, 3));
        // Find oldest maintainable resource for detail
        const oldestMaintainable = alertResources.length > 0 
            ? alertResources.sort((a,b) => new Date(a.created_date) - new Date(b.created_date))[0] 
            : null;
        
        // Fetch reports
        // const reports = await Report.list("-created_date", 5); // For recent list if needed
        const allReports = await Report.list();
        const openReports = allReports.filter(report => 
          report.status === "open" || report.status === "in_progress"
        );
        const oldestOpenReport = openReports.length > 0
            ? openReports.sort((a,b) => new Date(a.created_date) - new Date(b.created_date))[0]
            : null;
        
        // Fetch users
        const usersList = await User.list();
        setUsers(usersList);

        setStats({
          openIncidents: openIncidents.length,
          totalIncidents: incidents.length,
          mostCriticalOpenIncidentTitle: mostCriticalIncident ? mostCriticalIncident.title : "אין אירועים דחופים",
          activeShifts: activeShifts.length,
          totalStaffInActiveShifts: totalStaffInActive,
          maintainableResources: alertResources.length,
          oldestMaintainableResourceName: oldestMaintainable ? oldestMaintainable.item_identifier : "אין משאבים לטיפול",
          openReports: openReports.length,
          oldestOpenReportTitle: oldestOpenReport ? oldestOpenReport.title : "אין דוחות פתוחים"
        });
        
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'לא ידוע';
    const date = new Date(dateString);
    return `${date.toLocaleDateString('he-IL')} ${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
  };
  
  const renderFocusedStatCard = (title, value, icon, detailText = '', linkUrl = null, color = 'indigo') => (
    <div className="clay-card bg-white bg-opacity-80 p-6 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className={`w-12 h-12 rounded-2xl bg-${color}-100 flex items-center justify-center shadow-inner`}>
            {React.cloneElement(icon, { className: `w-7 h-7 text-${color}-600`})}
          </div>
          <span className={`text-4xl font-bold text-${color}-700`}>{loading ? "..." : value}</span>
        </div>
        <h3 className="text-xl font-semibold text-neutral-700 mb-2">{title}</h3>
        {detailText && !loading && (
          <p className="text-sm text-neutral-500 line-clamp-2" title={detailText}>
            {detailText}
          </p>
        )}
        {loading && <div className="h-8 bg-neutral-100 rounded-lg animate-pulse mt-2"></div>}
      </div>
      {linkUrl && (
         <a href={linkUrl} className={`text-sm text-${color}-600 hover:text-${color}-800 flex items-center mt-4 font-medium group`}>
            מעבר לניהול <ChevronRight className="w-4 h-4 mr-1 transform transition-transform group-hover:translate-x-1" />
          </a>
      )}
    </div>
  );

  return (
    <div className="container mx-auto" dir="rtl">
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-2 text-neutral-800">שלום, {currentUser?.full_name || 'משתמש'}</h1>
        <p className="text-lg text-neutral-600">תמונת מצב עדכנית של מערכת האבטחה.</p>
      </div>

      {/* Focused Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        {renderFocusedStatCard(
          "טיקטים פתוחים", 
          stats.openIncidents, 
          <FileWarning />, 
          stats.mostCriticalOpenIncidentTitle, 
          createPageUrl("Incidents"), 
          "red"
        )}
        {renderFocusedStatCard(
          "משמרות פעילות", 
          stats.activeShifts, 
          <Briefcase />, 
          `${stats.totalStaffInActiveShifts} אנשי צוות במשמרות כעת`, 
          createPageUrl("Shifts"), 
          "green"
        )}
        {renderFocusedStatCard(
          "משאבים לטיפול", 
          stats.maintainableResources, 
          <Wrench />, // Replaced Tool with Wrench
          `הישן ביותר: ${stats.oldestMaintainableResourceName}`, 
          createPageUrl("Resources"), 
          "yellow"
        )}
        {renderFocusedStatCard(
          "דוחות פתוחים", 
          stats.openReports, 
          <FileText />, 
          `הישן ביותר: ${stats.oldestOpenReportTitle}`, 
          createPageUrl("Reports"), 
          "orange"
        )}
      </div>

      {/* Main Content - Simplified to two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Open Incidents */}
        <div>
          <div className="clay-card bg-white bg-opacity-80 h-full">
            <div className="flex items-center justify-between mb-4 p-5 border-b">
              <h2 className="text-xl font-bold flex items-center text-neutral-700">
                <FileWarning className="w-5 h-5 ml-2 text-red-500" />
                3 אירועים פתוחים אחרונים
              </h2>
              <a href={createPageUrl("Incidents")} className="text-red-600 text-sm flex items-center hover:underline">
                כל האירועים <ChevronRight className="w-4 h-4" />
              </a>
            </div>
            
            <div className="p-5">
            {loading ? (
              <div className="animate-pulse space-y-4">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="bg-rose-50 h-20 rounded-2xl"></div>
                ))}
              </div>
            ) : recentOpenIncidents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileWarning className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>אין אירועים פתוחים כעת</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOpenIncidents.map(incident => (
                  <div 
                    key={incident.id} 
                    className="clay-card bg-white p-4 hover:shadow-md transition-all duration-200 border border-neutral-200 cursor-pointer"
                    onClick={() => navigate(createPageUrl(`ManageIncidentPage?id=${incident.id}`))} // Added onClick to navigate
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-neutral-800">{incident.title}</h3>
                        <p className="text-sm text-gray-500 line-clamp-1 mt-1">{incident.category_name || incident.category} - {incident.sub_category_name || incident.sub_category}</p> {/* Added category_name and sub_category_name for better display */}
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${incident.status === 'open' ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'}`}>
                          {incident.status === 'open' ? 'פתוח' : 'בטיפול'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                      <span>נוצר: {formatDate(incident.created_date)}</span>
                      <span>מדווח: {users.find(u => u.id === incident.reporter_id)?.full_name || incident.reporter_id || 'לא ידוע'}</span> {/* Display reporter name */}
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Combined Sidebar Info: Upcoming Shifts & Resource Alerts */}
        <div className="space-y-8">
          {/* Upcoming Shifts */}
          <div className="clay-card bg-white bg-opacity-80">
            <div className="flex items-center justify-between mb-4 p-5 border-b">
              <h2 className="text-xl font-bold flex items-center text-neutral-700">
                <Calendar className="w-5 h-5 ml-2 text-indigo-500" />
                משמרות קרובות (24 שעות)
              </h2>
              <a href={createPageUrl("Shifts")} className="text-indigo-600 text-sm flex items-center hover:underline">
                לו״ז מלא <ChevronRight className="w-4 h-4" />
              </a>
            </div>
            <div className="p-5">
            {loading ? (
              <div className="animate-pulse space-y-3">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="bg-indigo-50 h-16 rounded-2xl"></div>
                ))}
              </div>
            ) : upcomingShifts.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>אין משמרות קרובות</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingShifts.map(shift => (
                  <div key={shift.id} className="clay-card bg-white p-3 hover:shadow-md transition-all duration-200 border border-neutral-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-neutral-800">אתר: {shift.site || "לא צוין"}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {formatDate(shift.start_time)} - {new Date(shift.end_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
                        {shift.staff?.length || 0} אנשי צוות
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>

          {/* Resource Alerts */}
          <div className="clay-card bg-white bg-opacity-80">
             <div className="flex items-center justify-between mb-4 p-5 border-b">
              <h2 className="text-xl font-bold flex items-center text-neutral-700">
                <AlertTriangle className="w-5 h-5 ml-2 text-yellow-500" />
                התראות משאבים (3 מובילים)
              </h2>
              <a href={createPageUrl("Resources")} className="text-yellow-600 text-sm flex items-center hover:underline">
                כל המשאבים <ChevronRight className="w-4 h-4" />
              </a>
            </div>
            <div className="p-5">
            {loading ? (
              <div className="animate-pulse space-y-3">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="bg-yellow-50 h-16 rounded-2xl"></div>
                ))}
              </div>
            ) : resourceAlerts.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>כל המשאבים תקינים</p>
              </div>
            ) : (
              <div className="space-y-3">
                {resourceAlerts.map(resource => (
                  <div key={resource.id} className="clay-card bg-white p-3 hover:shadow-md transition-all duration-200 border border-neutral-200">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3
                          ${resource.status === 'דרוש בדיקה' ? 'bg-yellow-100' : 'bg-red-100'}`}>
                          <AlertTriangle className={`w-5 h-5 
                            ${resource.status === 'דרוש בדיקה' ? 'text-yellow-500' : 'text-red-500'}`} />
                        </div>
                        <div>
                          <h3 className="font-medium text-neutral-800">{resource.item_identifier}</h3>
                          <p className="text-sm text-gray-600">{resource.site}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs
                        ${resource.status === 'דרוש בדיקה' ? 'bg-yellow-100 text-yellow-800' : 
                          resource.status === 'דרוש תיקון' ? 'bg-red-100 text-red-800' :
                          'bg-orange-100 text-orange-800'}`}>
                        {resource.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Buttons - Reduced to essential & most frequent */}
      <div className="mt-12 pt-8 border-t border-neutral-200">
        <h2 className="text-xl font-semibold mb-4 text-neutral-700 text-center">קיצורי דרך מהירים</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            <a href={createPageUrl("Incidents")} className="clay-card bg-white bg-opacity-80 p-4 text-center hover:shadow-lg transition-all duration-200 flex flex-col items-center justify-center">
                <FileWarning className="w-10 h-10 mb-2 text-red-500" />
                <span className="font-medium text-neutral-700">ניהול טיקטים</span>
            </a>
            <a href={createPageUrl("Shifts")} className="clay-card bg-white bg-opacity-80 p-4 text-center hover:shadow-lg transition-all duration-200 flex flex-col items-center justify-center">
                <Calendar className="w-10 h-10 mb-2 text-indigo-500" />
                <span className="font-medium text-neutral-700">לוח משמרות</span>
            </a>
            <a href={createPageUrl("Resources")} className="clay-card bg-white bg-opacity-80 p-4 text-center hover:shadow-lg transition-all duration-200 flex flex-col items-center justify-center">
                <Box className="w-10 h-10 mb-2 text-green-500" />
                <span className="font-medium text-neutral-700">ניהול משאבים</span>
            </a>
            <a href={createPageUrl("Reports")} className="clay-card bg-white bg-opacity-80 p-4 text-center hover:shadow-lg transition-all duration-200 flex flex-col items-center justify-center">
                <FileText className="w-10 h-10 mb-2 text-orange-500" />
                <span className="font-medium text-neutral-700">ניהול דוחות</span>
            </a>
        </div>
      </div>
    </div>
  );
}
