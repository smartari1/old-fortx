
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Incident } from "@/api/entities";
import { IncidentCategory } from "@/api/entities";
import { IncidentSubCategory } from "@/api/entities";
import { User } from "@/api/entities";
import { createPageUrl } from "@/utils";
import {
  AlertTriangle,
  Plus,
  Filter,
  Search,
  Calendar,
  MapPin,
  Tag,
  ArrowUp,
  ArrowDown,
  Clock,
  CheckCircle2,
  FileText,
  Eye,
  Layers,
  Users // Added Users icon for reporter filter
} from "lucide-react";
// Removed IncidentManagement import, as it's now a page
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react"; // For export button
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // For date range picker
import { Calendar as CalendarIcon } from "lucide-react"; // Renamed to avoid conflict with Calendar component
import { Calendar as ShadCalendar } from "@/components/ui/calendar"; // Shadcn Calendar component
import { format, parseISO } from 'date-fns'; // For date formatting

export default function IncidentsPage() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [users, setUsers] = useState([]); // Add users state
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    status: "all",
    category: "all",
    sub_category: "all",
    reporter: "all", // Add reporter filter
    search: "",
    dateRangePreset: "all",
    customDateStart: null,
    customDateEnd: null
  });

  const [filteredSubcategories, setFilteredSubcategories] = useState([]);

  // Sorting
  const [sortField, setSortField] = useState("created_date");
  const [sortDirection, setSortDirection] = useState("desc");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const user = await User.me();
        setCurrentUser(user);

        const sortOrder = `${sortDirection === "desc" ? "-" : ""}${sortField}`;
        const [fetchedIncidents, fetchedCategories, fetchedSubcategories, fetchedUsers] = await Promise.all([
          Incident.list(sortOrder),
          IncidentCategory.list(),
          IncidentSubCategory.list(),
          User.list() // Fetch all users for reporter filter
        ]);

        setIncidents(fetchedIncidents);
        setCategories(fetchedCategories);
        setSubcategories(fetchedSubcategories);
        setUsers(fetchedUsers);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sortField, sortDirection]);

  // Update filteredSubcategories when main category changes
  useEffect(() => {
    if (filters.category && filters.category !== "all") {
      const subs = subcategories.filter(sub => sub.parent_category_id === filters.category);
      setFilteredSubcategories(subs);
    } else {
      setFilteredSubcategories([]);
    }
    // Reset sub_category filter when category changes
    handleFilterChange("sub_category", "all");
  }, [filters.category, subcategories]);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const sortOrder = `${sortDirection === "desc" ? "-" : ""}${sortField}`;
      const fetchedIncidents = await Incident.list(sortOrder);
      setIncidents(fetchedIncidents);
    } catch (error) {
      console.error("Error reloading incidents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prevFilters => {
      const newFilters = { ...prevFilters, [filterType]: value };
      // If a date preset is chosen, clear custom dates
      if (filterType === "dateRangePreset" && value !== "custom") {
        newFilters.customDateStart = null;
        newFilters.customDateEnd = null;
      }
      // If a custom date is set, change preset to "custom"
      if ((filterType === "customDateStart" || filterType === "customDateEnd") && value) {
        newFilters.dateRangePreset = "custom";
      }
      return newFilters;
    });
  };

  const handleSortChange = (field) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    if (filters.status !== "all" && incident.status !== filters.status) return false;

    if (filters.category !== "all") {
        if (incident.category !== filters.category) return false;
        // Now filter by sub_category if a main category is selected
        if (filters.sub_category !== "all" && incident.sub_category !== filters.sub_category) return false;
    }

    // Add reporter filter
    if (filters.reporter !== "all" && incident.reporter_id !== filters.reporter) return false;

    // Date filtering logic
    const incidentDate = parseISO(incident.created_date); // Use parseISO for proper date object

    if (filters.dateRangePreset !== "all" && filters.dateRangePreset !== "custom") {
      const now = new Date();
      let rangeStart;
      switch (filters.dateRangePreset) {
        case "today":
          rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (incidentDate < rangeStart) return false;
          break;
        case "week":
          rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          if (incidentDate < rangeStart) return false;
          break;
        case "month":
          rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          if (incidentDate < rangeStart) return false;
          break;
        default: break;
      }
    } else if (filters.dateRangePreset === "custom") {
        if (filters.customDateStart && incidentDate < new Date(filters.customDateStart)) return false;
        if (filters.customDateEnd) {
            // Set end date to end of day for inclusive filtering
            const endDate = new Date(filters.customDateEnd);
            endDate.setHours(23, 59, 59, 999);
            if (incidentDate > endDate) return false;
        }
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const categoryName = categories.find(c => c.id === incident.category)?.name || '';
      const subCategoryName = subcategories.find(sc => sc.id === incident.sub_category)?.name || '';
      const reporterName = users.find(u => u.id === incident.reporter_id)?.full_name || '';

      return (
        incident.title?.toLowerCase().includes(searchLower) ||
        incident.description?.toLowerCase().includes(searchLower) ||
        (incident.location?.description && incident.location.description.toLowerCase().includes(searchLower)) ||
        categoryName.toLowerCase().includes(searchLower) ||
        subCategoryName.toLowerCase().includes(searchLower) ||
        reporterName.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Helper function to get user name by ID
  const getUserName = (userId) => {
    if (!userId) return 'לא ידוע';
    const user = users.find(u => u.id === userId);
    return user?.full_name || userId;
  };

  // Helper function to get handling team names
  const getHandlingTeamNames = (handlingTeam) => {
    if (!handlingTeam || !Array.isArray(handlingTeam) || handlingTeam.length === 0) {
      return 'לא הוקצה';
    }
    return handlingTeam.map(userId => getUserName(userId)).join(', ');
  };

  const exportToCSV = () => {
    if (filteredIncidents.length === 0) {
        alert("אין נתונים לייצוא.");
        return;
    }

    const headers = [
        "מזהה", "כותרת", "תיאור", "סטטוס",
        "קטגוריה ראשית", "תת קטגוריה",
        "תאריך יצירה", "תאריך עדכון אחרון", "נוצר על ידי", "צוות מטפל",
        "מיקום (תיאור)", "מזהה מיקום"
    ];

    const rows = filteredIncidents.map(incident => {
        const categoryName = categories.find(c => c.id === incident.category)?.name || incident.category;
        const subCategoryName = subcategories.find(sc => sc.id === incident.sub_category)?.name || incident.sub_category;
        const reporterName = getUserName(incident.reporter_id);
        const handlingTeamNames = getHandlingTeamNames(incident.handling_team);

        return [
            incident.id,
            `"${incident.title?.replace(/"/g, '""') || ''}"`, // Escape double quotes
            `"${incident.description?.replace(/"/g, '""') || ''}"`,
            incident.status,
            categoryName,
            subCategoryName,
            incident.created_date ? format(parseISO(incident.created_date), 'yyyy-MM-dd HH:mm:ss') : '',
            incident.updated_date ? format(parseISO(incident.updated_date), 'yyyy-MM-dd HH:mm:ss') : '',
            reporterName,
            `"${handlingTeamNames.replace(/"/g, '""')}"`, // Escape double quotes
            `"${incident.location?.description?.replace(/"/g, '""') || ''}"`,
            incident.location?.location_id || ''
        ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" // \uFEFF for BOM to ensure Excel reads UTF-8 correctly
        + headers.join(',') + "\n"
        + rows.join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `incidents_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="container mx-auto p-4 md:p-6" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center text-primary-700">
          <AlertTriangle className="w-8 h-8 ml-3 text-primary-500" />
          ניהול טיקטים
        </h1>
        <p className="text-neutral-600">יצירת אירועים, מעקב וטיפול בזמן אמת.</p>
      </div>

      {/* Filters and actions */}
      <div className="clay-card bg-white p-4 mb-6 shadow-lg">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Status filter */}
            <div className="flex items-center gap-1">
              <Filter className="w-4 h-4 text-primary-500" />
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger className="clay-input !py-2 !px-3 text-sm w-auto min-w-[130px]">
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="open">פתוח</SelectItem>
                  <SelectItem value="in_progress">בטיפול</SelectItem>
                  <SelectItem value="closed">סגור</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category filter */}
             <div className="flex items-center gap-1">
              <Tag className="w-4 h-4 text-primary-500" />
              <Select
                value={filters.category}
                onValueChange={(value) => handleFilterChange("category", value)}
              >
                <SelectTrigger className="clay-input !py-2 !px-3 text-sm w-auto min-w-[150px]">
                  <SelectValue placeholder="קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הקטגוריות</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SubCategory filter */}
            {filters.category !== 'all' && filteredSubcategories.length > 0 && (
                <div className="flex items-center gap-1">
                    <Layers className="w-4 h-4 text-primary-500" />
                    <Select
                        value={filters.sub_category}
                        onValueChange={(value) => handleFilterChange("sub_category", value)}
                    >
                        <SelectTrigger className="clay-input !py-2 !px-3 text-sm w-auto min-w-[150px]">
                        <SelectValue placeholder="תת-קטגוריה" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="all">כל תתי-הקטגוריות</SelectItem>
                        {filteredSubcategories.map(sub_category => (
                            <SelectItem key={sub_category.id} value={sub_category.id}>
                            {sub_category.name}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Reporter filter - NEW */}
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-primary-500" />
              <Select
                value={filters.reporter}
                onValueChange={(value) => handleFilterChange("reporter", value)}
              >
                <SelectTrigger className="clay-input !py-2 !px-3 text-sm w-auto min-w-[150px]">
                  <SelectValue placeholder="מדווח" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל המדווחים</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date range filter */}
            <div className="flex items-center gap-1">
              <CalendarIcon className="w-4 h-4 text-primary-500" />
               <Select
                value={filters.dateRangePreset}
                onValueChange={(value) => handleFilterChange("dateRangePreset", value)}
              >
                <SelectTrigger className="clay-input !py-2 !px-3 text-sm w-auto min-w-[130px]">
                  <SelectValue placeholder="טווח תאריכים" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הזמנים</SelectItem>
                  <SelectItem value="today">היום</SelectItem>
                  <SelectItem value="week">שבוע אחרון</SelectItem>
                  <SelectItem value="month">חודש אחרון</SelectItem>
                  <SelectItem value="custom">מותאם אישית</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range Pickers */}
            {filters.dateRangePreset === 'custom' && (
                <>
                    <div className="flex items-center gap-1">
                        <label htmlFor="dateStart" className="text-xs text-neutral-600">מ:</label>
                        <Input
                            id="dateStart"
                            type="date"
                            value={filters.customDateStart || ''}
                            onChange={(e) => handleFilterChange("customDateStart", e.target.value)}
                            className="clay-input !py-1 !px-2 text-xs w-auto"
                        />
                    </div>
                    <div className="flex items-center gap-1">
                         <label htmlFor="dateEnd" className="text-xs text-neutral-600">עד:</label>
                        <Input
                            id="dateEnd"
                            type="date"
                            value={filters.customDateEnd || ''}
                            onChange={(e) => handleFilterChange("customDateEnd", e.target.value)}
                            className="clay-input !py-1 !px-2 text-xs w-auto"
                        />
                    </div>
                </>
            )}

            {/* Search */}
            <div className="flex items-center gap-1 clay-input !p-0 !pl-2 focus-within:border-primary-500">
              <Search className="w-4 h-4 text-primary-500" />
              <input
                type="text"
                placeholder="חיפוש אירוע..."
                className="bg-transparent border-none outline-none text-sm py-2 pr-1"
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              className="clay-button flex items-center gap-2 bg-green-100 text-green-700 font-medium"
              onClick={exportToCSV}
              disabled={filteredIncidents.length === 0}
            >
              <Download className="w-4 h-4" />
              ייצוא CSV
            </Button>
            <Button
              className="clay-button flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-medium"
              onClick={() => navigate(createPageUrl('CreateIncidentPage'))}
            >
              <Plus className="w-4 h-4" />
             מאורע חדש
            </Button>
          </div>
        </div>
      </div>

      {/* Incidents list */}
      <div className="space-y-4 mb-8">
        {loading ? (
          <div className="clay-card bg-white p-6 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-neutral-600">טוען אירועים...</p>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="clay-card bg-white p-8 text-center">
            <FileText className="w-16 h-16 mx-auto mb-3 text-neutral-300" />
            <p className="text-xl font-semibold text-neutral-700">לא נמצאו אירועים</p>
            <p className="text-neutral-500">נסה לשנות את מסנני החיפוש או צור אירוע חדש.</p>
          </div>
        ) : (
          <div className="clay-card bg-white p-0 overflow-hidden shadow-xl">
            <div className="grid grid-cols-12 items-center p-4 border-b bg-neutral-50 text-sm font-medium text-neutral-700 sticky top-0 z-10 text-right">
              <div
                className="col-span-2 flex items-center cursor-pointer hover:text-primary-600"
                onClick={() => handleSortChange("title")}
              >
                כותרת
                {sortField === "title" && (
                  sortDirection === "asc" ?
                    <ArrowUp className="w-3 h-3 mr-1" /> :
                    <ArrowDown className="w-3 h-3 mr-1" />
                )}
              </div>
              <div className="col-span-1 text-center">סטטוס</div>
              <div className="col-span-1 text-center">קטגוריה</div>
              <div className="col-span-1 text-center">תת-קטגוריה</div>
              <div className="col-span-2 text-center">מדווח</div> {/* New column */}
              <div className="col-span-2 text-center">צוות מטפל</div> {/* New column */}
              <div
                className="col-span-2 text-center cursor-pointer flex items-center justify-center hover:text-primary-600"
                onClick={() => handleSortChange("created_date")}
              >
                תאריך
                {sortField === "created_date" && (
                  sortDirection === "asc" ?
                    <ArrowUp className="w-3 h-3 mr-1" /> :
                    <ArrowDown className="w-3 h-3 mr-1" />
                )}
              </div>
              <div className="col-span-1 text-left">פעולות</div>
            </div>

            <ScrollArea className="h-[calc(100vh-350px)]">
            {filteredIncidents.map(incident => {
              const category = categories.find(c => c.id === incident.category)?.name || incident.category;
              const subCategory = subcategories.find(sc => sc.id === incident.sub_category)?.name || incident.sub_category;
              const reporterName = getUserName(incident.reporter_id);
              const handlingTeamNames = getHandlingTeamNames(incident.handling_team);

              let statusText, statusColorClass;
              switch (incident.status) {
                case 'open': statusText = 'פתוח'; statusColorClass = 'bg-red-100 text-red-700'; break;
                case 'in_progress': statusText = 'בטיפול'; statusColorClass = 'bg-yellow-100 text-yellow-700'; break;
                case 'closed': statusText = 'סגור'; statusColorClass = 'bg-green-100 text-green-700'; break;
                default: statusText = incident.status; statusColorClass = 'bg-neutral-100 text-neutral-700';
              }

              return (
                <div
                  key={incident.id}
                  className="grid grid-cols-12 items-center p-4 border-b hover:bg-neutral-50/50 transition-colors text-right"
                >
                  <div className="col-span-2">
                    <h3 className="font-medium text-neutral-800 mb-0.5 line-clamp-1" title={incident.title}>{incident.title}</h3>
                    <p className="text-xs text-neutral-500 line-clamp-1" title={incident.description}>{incident.description}</p>
                  </div>

                  <div className="col-span-1 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColorClass}`}>
                      {statusText}
                    </span>
                  </div>

                  <div className="col-span-1 text-center">
                    <span className="text-sm text-neutral-600 line-clamp-1" title={category}>
                        {category}
                    </span>
                  </div>

                  <div className="col-span-1 text-center">
                    <span className="text-sm text-neutral-600 line-clamp-1" title={subCategory}>
                        {subCategory && subCategory !== incident.sub_category ? subCategory : (incident.sub_category ? 'לא ידוע' : '-')}
                    </span>
                  </div>

                  <div className="col-span-2 text-center">
                    <span className="text-sm text-neutral-600 line-clamp-1" title={reporterName}>
                        {reporterName}
                    </span>
                  </div>

                  <div className="col-span-2 text-center">
                    <span className="text-sm text-neutral-600 line-clamp-1" title={handlingTeamNames}>
                        {handlingTeamNames}
                    </span>
                  </div>

                  <div className="col-span-2 text-center text-sm text-neutral-600">
                    {new Date(incident.created_date).toLocaleDateString('he-IL')}
                    <div className="text-xs text-neutral-400">
                      {new Date(incident.created_date).toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit'})}
                    </div>
                  </div>

                  <div className="col-span-1 text-left">
                     <Button
                        variant="outline"
                        size="sm"
                        className="clay-button !text-xs !py-1 !px-2"
                        onClick={() => navigate(createPageUrl(`ManageIncidentPage?id=${incident.id}`))}
                      >
                        <Eye className="w-3.5 h-3.5 ml-1" />
                        צפה
                      </Button>
                  </div>
                </div>
              );
            })}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
