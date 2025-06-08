import React, { useState, useEffect } from 'react';
import { UserGroup } from '@/api/entities';
import { User } from '@/api/entities';
import { Report } from '@/api/entities'; // Import for report selection
import { CustomDataType } from '@/api/entities'; // Import for data type display
import { 
  Users, 
  PlusSquare, 
  Edit2, 
  Trash2, 
  Bell, 
  Save, 
  X,
  Search,
  UserCheck,
  UserX,
  FileText,
  Database,
  Info
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Notification settings structure
const notificationTypes = {
  incidents: 'התראות על אירועים',
  maintenance: 'התראות על תחזוקה',
  shifts: 'התראות על משמרות',
  reports: 'קבלת דוחות תקופתיים',
};

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]); // For member selection
  const [reportTypes, setReportTypes] = useState([]); // List of available report types
  const [availableReports, setAvailableReports] = useState([]); // List of specific reports
  const [customDataTypes, setCustomDataTypes] = useState([]); // List of custom data types
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(''); // For searching users in modal
  const [activeTab, setActiveTab] = useState("general");
  
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: '',
    members: [],
    managers: [],
    notification_settings: {
      incidents: false,
      maintenance: false,
      shifts: false,
      reports: false,
    },
    report_subscriptions: [], // Array of report IDs this group is subscribed to
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsData, usersData, reportsData, dataTypesData] = await Promise.all([
        UserGroup.list(),
        User.list(),
        Report.list(),
        CustomDataType.list()
      ]);
      
      // Process groups data
      setGroups(groupsData.map(group => ({
        ...group,
        member_count: group.members?.length || 0
      })));
      
      setUsers(usersData);
      
      // Extract report types and group reports
      const reportTypesSet = new Set();
      reportsData.forEach(report => {
        if (report.type) reportTypesSet.add(report.type);
      });
      setReportTypes(Array.from(reportTypesSet));
      setAvailableReports(reportsData);
      
      setCustomDataTypes(dataTypesData);
      
    } catch (err) {
      console.error("Error loading data:", err);
      setError("שגיאה בטעינת נתונים: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setGroupFormData({
      name: '',
      description: '',
      members: [],
      managers: [],
      notification_settings: {
        incidents: false,
        maintenance: false,
        shifts: false,
        reports: false,
      },
      report_subscriptions: [],
      is_active: true
    });
    setEditingGroup(null);
    setSearchTerm('');
    setActiveTab("general");
  };

  useEffect(() => {
    if (editingGroup) {
      setGroupFormData({
        name: editingGroup.name || '',
        description: editingGroup.description || '',
        members: editingGroup.members || [],
        managers: editingGroup.managers || [],
        notification_settings: editingGroup.notification_settings || {
          incidents: false,
          maintenance: false,
          shifts: false,
          reports: false,
        },
        report_subscriptions: editingGroup.report_subscriptions || [],
        is_active: editingGroup.is_active !== undefined ? editingGroup.is_active : true
      });
    }
  }, [editingGroup]);

  const handleGroupSubmit = async (e) => {
    e.preventDefault();

    if (!groupFormData.name.trim()) {
      alert("שם הקבוצה הוא שדה חובה.");
      return;
    }

    try {
      if (editingGroup) {
        await UserGroup.update(editingGroup.id, groupFormData);
      } else {
        await UserGroup.create(groupFormData);
      }
      
      await loadData();
      setShowGroupForm(false);
      resetForm();
    } catch (err) {
      console.error("Error saving group:", err);
      alert("שגיאה בשמירת הקבוצה: " + err.message);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק קבוצה זו?")) {
      try {
        await UserGroup.delete(groupId);
        await loadData();
      } catch (err) {
        console.error("Error deleting group:", err);
        alert("שגיאה במחיקת הקבוצה: " + err.message);
      }
    }
  };

  const handleMemberToggle = (userId) => {
    setGroupFormData(prev => ({
      ...prev,
      members: prev.members.includes(userId)
        ? prev.members.filter(id => id !== userId)
        : [...prev.members, userId]
    }));
  };

  const handleManagerToggle = (userId) => {
     setGroupFormData(prev => ({
      ...prev,
      managers: prev.managers.includes(userId)
        ? prev.managers.filter(id => id !== userId)
        : [...prev.managers, userId]
    }));
  };

  const handleNotificationSettingChange = (settingKey, value) => {
    setGroupFormData(prev => ({
      ...prev,
      notification_settings: {
        ...prev.notification_settings,
        [settingKey]: value
      }
    }));
  };

  const handleReportSubscriptionToggle = (reportId) => {
    setGroupFormData(prev => ({
      ...prev,
      report_subscriptions: prev.report_subscriptions.includes(reportId)
        ? prev.report_subscriptions.filter(id => id !== reportId)
        : [...prev.report_subscriptions, reportId]
    }));
  };

  const filteredUsersForModal = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
    </div>
  );

  if (error) return <div className="clay-card bg-red-50 p-4 text-red-700 text-center">{error}</div>;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 flex items-center">
            <Users className="w-8 h-8 ml-3 text-teal-500" />
            ניהול קבוצות משתמשים
          </h1>
          <p className="text-gray-600">יצירה וניהול של קבוצות לתקשורת והתראות ממוקדות.</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowGroupForm(true);
          }}
          className="clay-button bg-teal-100 text-teal-700 font-medium flex items-center gap-2"
        >
          <PlusSquare className="w-5 h-5" />
          קבוצה חדשה
        </Button>
      </div>

      {groups.length === 0 && !loading ? (
        <div className="clay-card bg-white text-center p-10">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-700">לא נמצאו קבוצות</h3>
          <p className="text-gray-500 mt-2">צור קבוצה חדשה כדי להתחיל.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map(group => (
            <Card key={group.id} className="clay-card bg-white flex flex-col justify-between">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl font-semibold text-teal-700 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {group.name}
                  </CardTitle>
                  <Badge className={group.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {group.is_active ? "פעילה" : "לא פעילה"}
                  </Badge>
                </div>
                {group.description && (
                  <CardDescription className="text-sm text-gray-600 pt-1">
                    {group.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <UserCheck className="w-4 h-4 ml-2" />
                  <span>{group.member_count || 0} חברים בקבוצה</span>
                </div>
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <Bell className="w-4 h-4 ml-2" />
                  <span>{Object.values(group.notification_settings || {}).filter(v => v).length} הגדרות התראות</span>
                </div>
                {group.report_subscriptions?.length > 0 && (
                  <div className="flex items-center text-sm text-gray-500">
                    <FileText className="w-4 h-4 ml-2" />
                    <span>{group.report_subscriptions.length} דוחות מנויים</span>
                  </div>
                )}
              </CardContent>
              <DialogFooter className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-between items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:bg-blue-50"
                  onClick={() => {
                    setEditingGroup(group);
                    setShowGroupForm(true);
                  }}
                >
                  <Edit2 className="w-4 h-4 ml-1" /> ערוך
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => handleDeleteGroup(group.id)}
                >
                  <Trash2 className="w-4 h-4 ml-1" /> מחק
                </Button>
              </DialogFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showGroupForm} onOpenChange={setShowGroupForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-2xl font-semibold text-teal-700">
              {editingGroup ? 'עריכת קבוצה' : 'יצירת קבוצה חדשה'}
            </DialogTitle>
            <DialogDescription>
              נהל את פרטי הקבוצה, חברים, מנהלים והגדרות התראות.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="general">פרטים כלליים</TabsTrigger>
              <TabsTrigger value="members">חברים ומנהלים</TabsTrigger>
              <TabsTrigger value="notifications">התראות ודוחות</TabsTrigger>
            </TabsList>
            
            <form onSubmit={handleGroupSubmit} className="overflow-y-auto pr-2" style={{maxHeight: "calc(70vh - 120px)"}}>
              <TabsContent value="general" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700">שם הקבוצה</label>
                    <Input
                      value={groupFormData.name}
                      onChange={(e) => setGroupFormData({...groupFormData, name: e.target.value})}
                      className="clay-input mt-1"
                      required
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <Checkbox
                      id="group-is-active"
                      checked={groupFormData.is_active}
                      onCheckedChange={(checked) => setGroupFormData({...groupFormData, is_active: !!checked})}
                      className="clay-checkbox"
                    />
                    <label htmlFor="group-is-active" className="mr-2 text-sm text-gray-700 select-none">
                      קבוצה פעילה
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">תיאור הקבוצה</label>
                  <Textarea
                    value={groupFormData.description}
                    onChange={(e) => setGroupFormData({...groupFormData, description: e.target.value})}
                    className="clay-textarea mt-1 h-24"
                    placeholder="מטרת הקבוצה, למי מיועדת וכו'..."
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="members" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Members Selection */}
                  <Card className="clay-card shadow-sm">
                    <CardHeader className="!p-3 bg-teal-50 rounded-t-lg">
                      <CardTitle className="text-md font-medium text-teal-700">חברי קבוצה</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <Input 
                        placeholder="חפש משתמשים לשיוך..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="clay-input mb-3"
                      />
                      <ScrollArea className="h-48 border rounded-md clay-card !p-0">
                        <div className="p-2 space-y-1">
                        {filteredUsersForModal.map(user => (
                          <div key={user.id} className="flex items-center justify-between p-2 hover:bg-teal-50 rounded-md">
                            <label htmlFor={`member-${user.id}`} className="text-sm select-none cursor-pointer flex-grow">
                              {user.full_name} <span className="text-xs text-gray-500">({user.email})</span>
                            </label>
                            <Checkbox
                              id={`member-${user.id}`}
                              checked={groupFormData.members.includes(user.id)}
                              onCheckedChange={() => handleMemberToggle(user.id)}
                              className="clay-checkbox"
                            />
                          </div>
                        ))}
                        {filteredUsersForModal.length === 0 && <p className="text-xs text-gray-500 text-center py-4">לא נמצאו משתמשים</p>}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Managers Selection */}
                  <Card className="clay-card shadow-sm">
                    <CardHeader className="!p-3 bg-orange-50 rounded-t-lg">
                      <CardTitle className="text-md font-medium text-orange-700">מנהלי קבוצה</CardTitle>
                      <CardDescription className="text-xs">מנהלים יכולים לערוך את הקבוצה וחבריה.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3">
                      <ScrollArea className="h-48 border rounded-md clay-card !p-0">
                        <div className="p-2 space-y-1">
                          {groupFormData.members.length > 0 ? 
                            users.filter(user => groupFormData.members.includes(user.id)).map(user => (
                              <div key={user.id} className="flex items-center justify-between p-2 hover:bg-orange-50 rounded-md">
                                <label htmlFor={`manager-${user.id}`} className="text-sm select-none cursor-pointer flex-grow">
                                  {user.full_name}
                                </label>
                                <Checkbox
                                  id={`manager-${user.id}`}
                                  checked={groupFormData.managers.includes(user.id)}
                                  onCheckedChange={() => handleManagerToggle(user.id)}
                                  className="clay-checkbox"
                                />
                              </div>
                            )) : <p className="text-xs text-gray-500 text-center py-4">יש לבחור חברים תחילה</p>
                          }
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="notifications" className="space-y-6 mt-0">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <Bell className="w-5 h-5 ml-2 text-teal-600" />
                    הגדרות התראות כלליות
                  </h3>
                  <Card className="clay-card bg-white shadow-sm">
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 p-4">
                      {Object.entries(notificationTypes).map(([key, label]) => (
                        <div key={key} className="flex items-center">
                          <Checkbox
                            id={`notification-${key}`}
                            checked={groupFormData.notification_settings[key] || false}
                            onCheckedChange={(checked) => handleNotificationSettingChange(key, !!checked)}
                            className="clay-checkbox"
                          />
                          <label htmlFor={`notification-${key}`} className="mr-2 text-sm text-gray-700 select-none">
                            {label}
                          </label>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <FileText className="w-5 h-5 ml-2 text-teal-600" />
                    מנוי לדוחות ספציפיים
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-gray-400 mr-2" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm w-64">בחר דוחות ספציפיים שהקבוצה תקבל התראות עליהם</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </h3>
                  <Card className="clay-card bg-white shadow-sm">
                    <CardContent className="p-4">
                      <div className="mb-4">
                        <Input
                          placeholder="חיפוש דוחות..."
                          className="clay-input mb-2"
                        />
                      </div>
                      
                      <Accordion type="multiple" className="w-full">
                        {reportTypes.map((reportType, index) => (
                          <AccordionItem key={index} value={`report-type-${index}`}>
                            <AccordionTrigger className="hover:bg-gray-50 px-3 py-2 rounded-md">
                              {reportType || "דוחות כלליים"}
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-1 pl-6 mt-1">
                                {availableReports
                                  .filter(report => report.type === reportType)
                                  .map(report => (
                                    <div key={report.id} className="flex items-center py-1">
                                      <Checkbox
                                        id={`report-${report.id}`}
                                        checked={groupFormData.report_subscriptions?.includes(report.id) || false}
                                        onCheckedChange={() => handleReportSubscriptionToggle(report.id)}
                                        className="clay-checkbox ml-2"
                                      />
                                      <label 
                                        htmlFor={`report-${report.id}`} 
                                        className="text-sm select-none cursor-pointer flex-1"
                                      >
                                        {report.title}
                                      </label>
                                      <Badge className="bg-blue-100 text-blue-800 text-xs mr-auto">
                                        {new Date(report.created_date).toLocaleDateString()}
                                      </Badge>
                                    </div>
                                  ))}
                                {availableReports.filter(report => report.type === reportType).length === 0 && (
                                  <div className="text-sm text-gray-500 p-2">אין דוחות זמינים בקטגוריה זו</div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                      
                      {availableReports.length === 0 && (
                        <div className="text-center text-gray-500 p-4">
                          לא נמצאו דוחות במערכת
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </form>
          </Tabs>
          
          <DialogFooter className="pt-6 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="clay-button">
                ביטול
              </Button>
            </DialogClose>
            <Button 
              type="button" 
              onClick={handleGroupSubmit}
              className="clay-button bg-teal-600 text-white hover:bg-teal-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingGroup ? 'שמור שינויים' : 'צור קבוצה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}