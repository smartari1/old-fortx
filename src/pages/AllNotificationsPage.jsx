
import React, { useState, useEffect } from 'react';
import { Notification } from '@/api/entities';
import { User } from '@/api/entities';
import { 
  Bell, 
  Check, 
  Archive, 
  Filter, 
  RefreshCw, 
  XCircle, 
  ExternalLink,
  Info,        
  AlertCircle, 
  Shield,      
  Clock,       
  FileText,    
  Loader2      
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function AllNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'unread', 'read'
  const [filterPriority, setFilterPriority] = useState('all'); // 'all', 'low', 'medium', 'high', 'critical'

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const user = await User.me();
        setCurrentUser(user);
        if (user) {
          await loadNotifications(user.id);
        }
      } catch (err) {
        console.error("Error fetching current user:", err);
        setError("שגיאה בטעינת פרטי משתמש.");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const loadNotifications = async (userId) => {
    if (!userId) return;
    setLoading(true);
    try {
      let apiFilters = { user_id: userId };
      if (filterStatus !== 'all') {
        apiFilters.status = filterStatus;
      }
      if (filterPriority !== 'all') {
        apiFilters.priority = filterPriority;
      }
      
      const fetchedNotifications = await Notification.filter(apiFilters, '-created_date'); // Sort by most recent
      setNotifications(fetchedNotifications || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError("שגיאה בטעינת התראות.");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadNotifications(currentUser.id);
    }
  }, [filterStatus, filterPriority, currentUser]);


  const handleMarkAsRead = async (notificationId) => {
    try {
      await Notification.update(notificationId, { status: 'read', read_at: new Date().toISOString() });
      loadNotifications(currentUser.id); // Refresh list
    } catch (err) {
      console.error("Error marking notification as read:", err);
      alert("שגיאה בסימון ההתראה כנקראה.");
    }
  };
  
  const handleMarkAsUnread = async (notificationId) => {
    try {
      await Notification.update(notificationId, { status: 'unread', read_at: null });
      loadNotifications(currentUser.id); // Refresh list
    } catch (err) {
      console.error("Error marking notification as unread:", err);
      alert("שגיאה בסימון ההתראה כלא נקראה.");
    }
  };

  const handleArchiveNotification = async (notificationId) => {
    if (window.confirm("האם לארכב התראה זו?")) {
      try {
        await Notification.update(notificationId, { status: 'archived' });
        loadNotifications(currentUser.id); // Refresh list
      } catch (err) {
        console.error("Error archiving notification:", err);
        alert("שגיאה בארכוב ההתראה.");
      }
    }
  };
  
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'low': return <Badge variant="outline" className="border-blue-500 text-blue-500">נמוכה</Badge>;
      case 'medium': return <Badge variant="outline" className="border-yellow-500 text-yellow-500">בינונית</Badge>;
      case 'high': return <Badge variant="outline" className="border-orange-500 text-orange-500">גבוהה</Badge>;
      case 'critical': return <Badge variant="destructive" className="bg-red-500 text-white">קריטית</Badge>;
      default: return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'incident_assigned': return <Shield className="w-4 h-4 text-purple-500" />;
      case 'task_due': return <Clock className="w-4 h-4 text-orange-500" />;
      case 'new_report': return <FileText className="w-4 h-4 text-green-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };


  return (
    <div className="container mx-auto p-4 md:p-6" dir="rtl">
      <Card className="clay-card">
        <CardHeader className="border-b">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-7 h-7 text-primary-600" />
            כל ההתראות
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-6 p-4 clay-card bg-white rounded-lg flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
                <Filter className="w-5 h-5 text-primary-500" />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="clay-select min-w-[150px]">
                    <SelectValue placeholder="סנן לפי סטטוס" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסטטוסים</SelectItem>
                    <SelectItem value="unread">לא נקראו</SelectItem>
                    <SelectItem value="read">נקראו</SelectItem>
                    <SelectItem value="archived">בארכיון</SelectItem>
                  </SelectContent>
                </Select>
                 <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="clay-select min-w-[150px]">
                    <SelectValue placeholder="סנן לפי עדיפות" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל העדיפויות</SelectItem>
                    <SelectItem value="low">נמוכה</SelectItem>
                    <SelectItem value="medium">בינונית</SelectItem>
                    <SelectItem value="high">גבוהה</SelectItem>
                    <SelectItem value="critical">קריטית</SelectItem>
                  </SelectContent>
                </Select>
            </div>
            <Button onClick={() => loadNotifications(currentUser?.id)} variant="outline" className="clay-button">
              <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
              רענן
            </Button>
          </div>

          {loading && (
            <div className="text-center py-10">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary-500" />
              <p className="mt-2 text-neutral-600">טוען התראות...</p>
            </div>
          )}
          {!loading && error && (
            <div className="text-center py-10 clay-card bg-red-50 text-red-700 p-4">
              <XCircle className="w-10 h-10 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          )}
          {!loading && !error && notifications.length === 0 && (
            <div className="text-center py-10 clay-card bg-neutral-50 p-6">
              <Bell className="w-12 h-12 mx-auto mb-3 text-neutral-400" />
              <p className="text-xl text-neutral-600">אין התראות להצגה לפי הסינון הנוכחי.</p>
            </div>
          )}
          {!loading && !error && notifications.length > 0 && (
            <ScrollArea className="max-h-[calc(100vh-350px)] pr-2">
              <div className="space-y-3">
                {notifications.map(notif => (
                  <Card key={notif.id} className={`clay-card shadow-sm transition-all hover:shadow-md ${notif.status === 'unread' ? 'border-primary-300 bg-primary-50/30' : 'bg-white'}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getTypeIcon(notif.type)}
                            <h3 className={`font-semibold ${notif.status === 'unread' ? 'text-primary-700' : 'text-neutral-800'}`}>{notif.title}</h3>
                            {getPriorityBadge(notif.priority)}
                          </div>
                          <p className="text-sm text-neutral-600 mb-2">{notif.message}</p>
                          <p className="text-xs text-neutral-500">
                            התקבלה: {format(new Date(notif.created_date || notif.sent_at), 'd בMMMM, yyyy HH:mm', { locale: he })}
                            {notif.status === 'read' && notif.read_at && ` | נקראה: ${format(new Date(notif.read_at), 'd בMMMM, yyyy HH:mm', { locale: he })}`}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0 mt-2 sm:mt-0">
                          {notif.action_url && (
                            <Button asChild variant="outline" size="sm" className="clay-button !text-xs">
                              <Link to={notif.action_url}><ExternalLink className="w-3.5 h-3.5 ml-1"/> עבור לפעולה</Link>
                            </Button>
                          )}
                          {notif.status === 'unread' && (
                            <Button onClick={() => handleMarkAsRead(notif.id)} variant="outline" size="sm" className="clay-button !text-xs">
                              <Check className="w-3.5 h-3.5 ml-1" /> סמן כנקרא
                            </Button>
                          )}
                           {notif.status === 'read' && (
                            <Button onClick={() => handleMarkAsUnread(notif.id)} variant="outline" size="sm" className="clay-button !text-xs">
                              <Bell className="w-3.5 h-3.5 ml-1" /> סמן כלא נקרא
                            </Button>
                          )}
                          {notif.status !== 'archived' && (
                             <Button onClick={() => handleArchiveNotification(notif.id)} variant="ghost" size="sm" className="text-neutral-500 hover:text-neutral-700 !text-xs">
                              <Archive className="w-3.5 h-3.5 ml-1" /> ארכב
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
