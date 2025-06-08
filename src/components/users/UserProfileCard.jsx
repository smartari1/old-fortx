import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Briefcase, Users as UsersIcon, MapPin, Building, FileText as FileTextIcon, CalendarDays } from 'lucide-react';

export default function UserProfileCard({ user, rolesData, sitesData, institutionsData, groupsData }) {
  if (!user) return null;

  const getRoleNames = (roleIds) => {
    if (!roleIds || !Array.isArray(roleIds) || !rolesData) return 'לא מוגדר';
    return roleIds.map(id => rolesData.find(r => r.id === id)?.name || id).join(', ');
  };

  const getGroupNames = (groupIds) => {
    if (!groupIds || !Array.isArray(groupIds) || !groupsData) return 'לא מוגדר';
    return groupIds.map(id => groupsData.find(g => g.id === id)?.name || id).join(', ');
  };

  const getSiteName = (siteId) => {
    if (!siteId || !sitesData) return 'לא משויך';
    return sitesData.find(s => s.id === siteId)?.name || siteId;
  };

  const getInstitutionName = (institutionId) => {
    if (!institutionId || !institutionsData) return 'לא משויך';
    return institutionsData.find(i => i.id === institutionId)?.name || institutionId;
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return dateString; // fallback
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'on_patrol': return 'bg-blue-100 text-blue-800';
      case 'on_break': return 'bg-yellow-100 text-yellow-800';
      case 'responding_to_incident': return 'bg-red-100 text-red-800';
      case 'unavailable': return 'bg-gray-100 text-gray-800';
      case 'offline': return 'bg-gray-200 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'זמין';
      case 'on_patrol': return 'בסיור';
      case 'on_break': return 'בהפסקה';
      case 'responding_to_incident': return 'מגיב לאירוע';
      case 'unavailable': return 'לא זמין';
      case 'offline': return 'לא מחובר';
      default: return status || 'לא ידוע';
    }
  };

  return (
    <div className="space-y-4 p-1" dir="rtl">
      <Card className="clay-card shadow-none border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-primary-700">{user.full_name}</CardTitle>
          <CardDescription className="text-sm text-neutral-500">{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-neutral-500" />
                <span>טלפון: {user.phone || 'לא הוזן'}</span>
            </div>
            <div className="flex items-center gap-2">
                <Badge variant={user.is_active || user.active ? "success" : "destructive"} className="text-xs">
                {user.is_active || user.active ? 'פעיל' : 'לא פעיל'}
                </Badge>
                {user.current_status && (
                  <Badge className={`text-xs ${getStatusBadgeColor(user.current_status)}`}>
                    {getStatusText(user.current_status)}
                  </Badge>
                )}
            </div>
            {user.last_login && (
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>התחברות אחרונה: {formatDate(user.last_login)}</span>
                </div>
            )}
            {user.current_location?.timestamp && (
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>מיקום עודכן: {new Date(user.current_location.timestamp).toLocaleString('he-IL')}</span>
                </div>
            )}
        </CardContent>
      </Card>

      <Card className="clay-card shadow-none border-0">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-md font-medium text-neutral-700 flex items-center">
            <Briefcase className="w-5 h-5 ml-2 text-primary-500" />
            שיוך ארגוני ותפקידים
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong className="font-normal text-neutral-600">אתר:</strong> {user.site || 'לא משויך'}</p>
          <p><strong className="font-normal text-neutral-600">מוסד:</strong> {user.associated_institution || 'לא משויך'}</p>
          <div>
            <strong className="font-normal text-neutral-600 block mb-1">תפקידים:</strong>
            <div className="flex flex-wrap gap-1">
                {(user.roles || []).map((roleName, index) => (
                    <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-700">{roleName}</Badge>
                ))}
                {(user.roles?.length === 0 || !user.roles) && <span className="text-xs text-neutral-500">אין תפקידים משויכים</span>}
            </div>
          </div>
           <div>
            <strong className="font-normal text-neutral-600 block mb-1">קבוצות:</strong>
            <div className="flex flex-wrap gap-1">
                {(user.groups || []).map((groupName, index) => (
                    <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-700">{groupName}</Badge>
                ))}
                {(user.groups?.length === 0 || !user.groups) && <span className="text-xs text-neutral-500">אין קבוצות משויכות</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="clay-card shadow-none border-0">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-md font-medium text-neutral-700 flex items-center">
            <FileTextIcon className="w-5 h-5 ml-2 text-orange-500" />
            דוחות ופעולות משמעת ({user.reports?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user.reports && user.reports.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {user.reports.map((report, index) => (
                <div key={index} className="p-2.5 border rounded-lg bg-orange-50/50 text-xs">
                  <div className="flex justify-between items-center mb-0.5">
                    <strong className="text-orange-700">{report.report_type}</strong>
                    <span className="text-neutral-500">{formatDate(report.created_at)}</span>
                  </div>
                  <p className="text-neutral-600 line-clamp-3">{report.content}</p>
                  {report.document_url && (
                    <a href={report.document_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-[11px] mt-1 block">
                      צפה במסמך
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500 text-center py-3">אין דוחות רשומים עבור משתמש זה.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}