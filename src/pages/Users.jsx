
import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { UserProfile } from '@/api/entities';
import { Role } from '@/api/entities';
import { UserGroup } from '@/api/entities';
import { Institution } from '@/api/entities';
import { Location } from '@/api/entities';
import { 
  Users as UsersIcon,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  FileText,
  Upload,
  Save,
  X,
  AlertCircle,
  Phone,
  Mail,
  Building,
  MapPin,
  UserCheck,
  Group,
  History,
  Info
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function UsersPage() {
  // State
  const [users, setUsers] = useState([]);
  const [userProfiles, setUserProfiles] = useState([]);
  const [roles, setRoles] = useState([]);
  const [groups, setGroups] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Form state - Now only for editing existing users' profiles
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    phone: '',
    site_id: '',
    institution_id: '',
    roles: [],
    groups: [],
    is_active: true
  });
  
  // View state
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  
  // Report state
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportFormData, setReportFormData] = useState({
    report_type: '',
    content: '',
    document: null
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all necessary data
      const [
        usersData,
        userProfilesData,
        rolesData,
        groupsData,
        institutionsData,
        sitesData
      ] = await Promise.all([
        User.list(),
        UserProfile.list(),
        Role.list(),
        UserGroup.list(),
        Institution.list(),
        Location.list('-created_date')
      ]);
      
      setUsers(usersData);
      setUserProfiles(userProfilesData);
      setRoles(rolesData);
      setGroups(groupsData);
      setInstitutions(institutionsData);
      setSites(sitesData.filter(site => site.type === 'site'));
      
      setLoading(false);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("שגיאה בטעינת נתונים: " + err.message);
      setLoading(false);
    }
  };

  // Get user profile for a specific user
  const getUserProfile = (userId) => {
    return userProfiles.find(profile => profile.user_id === userId);
  };

  // Get extended user data (combining User + UserProfile)
  const getExtendedUserData = (user) => {
    const profile = getUserProfile(user.id);
    return {
      ...user,
      phone: profile?.phone || '',
      site_id: profile?.site_id || '',
      institution_id: profile?.institution_id || '',
      roles: profile?.roles || [],
      groups: profile?.groups || [],
      is_active: profile?.is_active !== undefined ? profile.is_active : true,
      profile_id: profile?.id
    };
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const extendedUser = getExtendedUserData(user);
    
    if (searchTerm && !user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !user.email.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    if (roleFilter !== 'all' && !extendedUser.roles?.includes(roleFilter)) {
      return false;
    }
    
    if (siteFilter !== 'all' && extendedUser.site_id !== siteFilter) {
      return false;
    }
    
    if (statusFilter !== 'all' && extendedUser.is_active !== (statusFilter === 'active')) {
      return false;
    }
    
    return true;
  });

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const existingProfile = getUserProfile(editingUser.id);
      
      if (existingProfile) {
        // Update existing profile
        await UserProfile.update(existingProfile.id, {
          ...userFormData,
          user_id: editingUser.id
        });
      } else {
        // Create new profile for existing user
        await UserProfile.create({
          ...userFormData,
          user_id: editingUser.id
        });
      }
      
      await loadData();
      setShowUserForm(false);
      resetForm();
    } catch (err) {
      console.error("Error saving user profile:", err);
      alert("שגיאה בשמירת פרופיל משתמש: " + err.message);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (!selectedUser) return;
      
      // If there's a document, upload it first
      let document_url = null;
      if (reportFormData.document) {
        const formData = new FormData();
        formData.append('file', reportFormData.document);
        // Implement file upload logic if needed
      }
      
      const report = {
        ...reportFormData,
        document_url,
        created_at: new Date().toISOString()
      };
      
      // Add report to user's profile
      const existingProfile = getUserProfile(selectedUser.id);
      if (existingProfile) {
        const updatedReports = [...(existingProfile.reports || []), report];
        await UserProfile.update(existingProfile.id, {
          ...existingProfile,
          reports: updatedReports
        });
      } else {
        // Create profile with report if none exists
        await UserProfile.create({
          user_id: selectedUser.id,
          reports: [report]
        });
      }
      
      setShowReportForm(false);
      setReportFormData({
        report_type: '',
        content: '',
        document: null
      });
      
      // Refresh data
      await loadData();
      
      // Refresh selected user details
      const refreshedUser = users.find(u => u.id === selectedUser.id);
      setSelectedUser(refreshedUser);
      
    } catch (err) {
      console.error("Error submitting report:", err);
      alert("שגיאה בשמירת דוח: " + err.message);
    }
  };

  const handleDeactivateUser = async (userId) => {
    if (!window.confirm("האם אתה בטוח שברצונך להשבית משתמש זה?")) {
      return;
    }
    
    try {
      const existingProfile = getUserProfile(userId);
      if (existingProfile) {
        await UserProfile.update(existingProfile.id, { is_active: false });
      } else {
        await UserProfile.create({
          user_id: userId,
          is_active: false
        });
      }
      await loadData();
    } catch (err) {
      console.error("Error deactivating user:", err);
      alert("שגיאה בהשבתת המשתמש: " + err.message);
    }
  };

  const resetForm = () => {
    setUserFormData({
      phone: '',
      site_id: '',
      institution_id: '',
      roles: [],
      groups: [],
      is_active: true
    });
    setEditingUser(null);
  };

  const handleEditUser = (user) => {
    const extendedUser = getExtendedUserData(user);
    setEditingUser(user);
    setUserFormData({
      phone: extendedUser.phone,
      site_id: extendedUser.site_id,
      institution_id: extendedUser.institution_id,
      roles: extendedUser.roles,
      groups: extendedUser.groups,
      is_active: extendedUser.is_active
    });
    setShowUserForm(true);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <UsersIcon className="w-8 h-8 ml-3 text-blue-500" />
          ניהול משתמשים
        </h1>
        <p className="text-gray-600">ניהול פרופילי משתמשים, תפקידים והרשאות במערכת</p>
        
        {/* Info Alert */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start">
          <Info className="w-5 h-5 text-blue-500 mt-0.5 ml-2 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">הוספת משתמשים חדשים</p>
            <p>משתמשים חדשים מתווספים רק דרך הזמנה. עבור לעמוד "הזמנת משתמשים" כדי להזמין משתמשים חדשים למערכת.</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="clay-card bg-white p-6 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="חיפוש לפי שם או אימייל..."
                className="pr-10"
              />
            </div>
          </div>
          
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="סנן לפי תפקיד" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל התפקידים</SelectItem>
              {roles.map(role => (
                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="סנן לפי אתר" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל האתרים</SelectItem>
              {sites.map(site => (
                <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="סנן לפי סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="active">פעיל</SelectItem>
              <SelectItem value="inactive">לא פעיל</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Users List */}
      <div className="clay-card bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  משתמש
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  פרטי התקשרות
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  תפקידים
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  אתר
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  סטטוס
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map(user => {
                const extendedUser = getExtendedUserData(user);
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                            {user.full_name?.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{extendedUser.phone || 'לא הוזן'}</div>
                      <div className="text-sm text-gray-500">
                        {institutions.find(i => i.id === extendedUser.institution_id)?.name || 'לא שויך'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {extendedUser.roles?.map(roleId => {
                          const role = roles.find(r => r.id === roleId);
                          return role ? (
                            <Badge key={roleId} className="bg-blue-100 text-blue-800">
                              {role.name}
                            </Badge>
                          ) : null;
                        })}
                        {(!extendedUser.roles || extendedUser.roles.length === 0) && (
                          <span className="text-sm text-gray-500">לא הוגדרו תפקידים</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {sites.find(s => s.id === extendedUser.site_id)?.name || 'לא משויך'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={extendedUser.is_active ? 
                          "bg-green-100 text-green-800" : 
                          "bg-red-100 text-red-800"}
                      >
                        {extendedUser.is_active ? 'פעיל' : 'לא פעיל'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserDetails(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivateUser(user.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Form Dialog - Now only for editing profiles */}
      <Dialog open={showUserForm} onOpenChange={setShowUserForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              עריכת פרופיל משתמש: {editingUser?.full_name}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleUserSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium">טלפון</label>
                <Input
                  value={userFormData.phone}
                  onChange={(e) => setUserFormData({...userFormData, phone: e.target.value})}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">אתר</label>
                <Select
                  value={userFormData.site_id}
                  onValueChange={(value) => setUserFormData({...userFormData, site_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר אתר" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>ללא אתר</SelectItem>
                    {sites.map(site => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-2">
                <label className="text-sm font-medium">מוסד</label>
                <Select
                  value={userFormData.institution_id}
                  onValueChange={(value) => setUserFormData({...userFormData, institution_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מוסד" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>ללא מוסד</SelectItem>
                    {institutions.map(institution => (
                      <SelectItem key={institution.id} value={institution.id}>
                        {institution.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">תפקידים</label>
              <div className="mt-2 space-y-2">
                {roles.map(role => (
                  <div key={role.id} className="flex items-center">
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={userFormData.roles.includes(role.id)}
                      onCheckedChange={(checked) => {
                        setUserFormData({
                          ...userFormData,
                          roles: checked
                            ? [...userFormData.roles, role.id]
                            : userFormData.roles.filter(id => id !== role.id)
                        });
                      }}
                    />
                    <label htmlFor={`role-${role.id}`} className="mr-2 text-sm">
                      {role.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">קבוצות</label>
              <div className="mt-2 space-y-2">
                {groups.map(group => (
                  <div key={group.id} className="flex items-center">
                    <Checkbox
                      id={`group-${group.id}`}
                      checked={userFormData.groups.includes(group.id)}
                      onCheckedChange={(checked) => {
                        setUserFormData({
                          ...userFormData,
                          groups: checked
                            ? [...userFormData.groups, group.id]
                            : userFormData.groups.filter(id => id !== group.id)
                        });
                      }}
                    />
                    <label htmlFor={`group-${group.id}`} className="mr-2 text-sm">
                      {group.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center">
              <Checkbox
                id="is-active"
                checked={userFormData.is_active}
                onCheckedChange={(checked) => setUserFormData({...userFormData, is_active: checked})}
              />
              <label htmlFor="is-active" className="mr-2 text-sm">
                משתמש פעיל
              </label>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowUserForm(false);
                  resetForm();
                }}
              >
                ביטול
              </Button>
              <Button type="submit">
                עדכן פרופיל
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog - Keep existing implementation */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                    {selectedUser.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl">{selectedUser.full_name}</h2>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="details">פרטי משתמש</TabsTrigger>
                  <TabsTrigger value="reports">דוחות</TabsTrigger>
                  <TabsTrigger value="activity">היסטוריית פעילות</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Phone className="w-5 h-5" />
                          פרטי התקשרות
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p><strong>טלפון:</strong> {selectedUser.phone || 'לא הוזן'}</p>
                          <p><strong>דוא״ל:</strong> {selectedUser.email}</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building className="w-5 h-5" />
                          שיוך ארגוני
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p>
                            <strong>מוסד:</strong>{' '}
                            {institutions.find(i => i.id === selectedUser.institution_id)?.name || 'לא משויך'}
                          </p>
                          <p>
                            <strong>אתר:</strong>{' '}
                            {sites.find(s => s.id === selectedUser.site_id)?.name || 'לא משויך'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <UserCheck className="w-5 h-5" />
                          תפקידים וקבוצות
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">תפקידים:</h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedUser.roles?.map(roleId => {
                                const role = roles.find(r => r.id === roleId);
                                return role ? (
                                  <Badge key={roleId} className="bg-blue-100 text-blue-800">
                                    {role.name}
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-2">קבוצות:</h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedUser.groups?.map(groupId => {
                                const group = groups.find(g => g.id === groupId);
                                return group ? (
                                  <Badge key={groupId} className="bg-purple-100 text-purple-800">
                                    {group.name}
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="reports">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">דוחות על המשתמש</h3>
                      <Button
                        onClick={() => setShowReportForm(true)}
                        className="clay-button bg-blue-100 text-blue-700"
                      >
                        <FileText className="w-4 h-4 ml-2" />
                        דוח חדש
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {selectedUser.reports?.length > 0 ? (
                        selectedUser.reports.map((report, index) => (
                          <Card key={index}>
                            <CardHeader>
                              <CardTitle className="text-base flex items-center justify-between">
                                <span>{report.report_type}</span>
                                <span className="text-sm text-gray-500">
                                  {new Date(report.created_at).toLocaleDateString('he-IL')}
                                </span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-gray-700">{report.content}</p>
                              {report.document_url && (
                                <a
                                  href={report.document_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-sm flex items-center mt-2"
                                >
                                  <FileText className="w-4 h-4 ml-1" />
                                  צפה במסמך מצורף
                                </a>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
                          <p>אין דוחות על משתמש זה</p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="activity">
                  <div className="text-center py-8 text-gray-500">
                    <History className="w-12 h-12 mx-auto mb-2 opacity-40" />
                    <p>היסטוריית פעילות תתווסף בקרוב</p>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Report Form Dialog - Keep existing implementation */}
      <Dialog open={showReportForm} onOpenChange={setShowReportForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הוספת דוח חדש</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleReportSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">סוג הדוח</label>
              <Select
                value={reportFormData.report_type}
                onValueChange={(value) => setReportFormData({...reportFormData, report_type: value})}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר סוג דוח" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="הערכת ביצועים">הערכת ביצועים</SelectItem>
                  <SelectItem value="אירוע משמעתי">אירוע משמעתי</SelectItem>
                  <SelectItem value="הערכה תקופתית">הערכה תקופתית</SelectItem>
                  <SelectItem value="אחר">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">תוכן הדוח</label>
              <textarea
                value={reportFormData.content}
                onChange={(e) => setReportFormData({...reportFormData, content: e.target.value})}
                className="clay-input w-full h-32"
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">מסמך מצורף (אופציונלי)</label>
              <Input
                type="file"
                onChange={(e) => setReportFormData({...reportFormData, document: e.target.files[0]})}
                accept=".pdf,.doc,.docx"
              />
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowReportForm(false)}
              >
                ביטול
              </Button>
              <Button type="submit">
                שמור דוח
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
