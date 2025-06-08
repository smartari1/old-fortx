import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CustomDataType } from '@/api/entities';
import { CustomDataRecord } from '@/api/entities';
import { Incident } from '@/api/entities';
import { User } from '@/api/entities';
import { InvokeLLM } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Loader2, Info, History, MessageSquare, Wand2, Edit, Trash2, Plus, Send, 
  ArrowLeft, MapPin, Calendar, User as UserIcon, Clock, FileText, 
  AlertCircle, CheckCircle, Eye, ExternalLink, Sparkles, RefreshCw
} from 'lucide-react';
import Markdown from 'react-markdown';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { createPageUrl } from '@/utils';

// Helper function to render field value based on type with enhanced styling
const renderFieldValue = (value, fieldSchema, allDataTypes, allRecords) => {
  if (value === undefined || value === null) {
    return <span className="italic text-gray-400 text-sm">אין ערך</span>;
  }

  switch (fieldSchema.type) {
    case 'string':
      if (fieldSchema.format === 'url') {
        return (
          <a href={String(value)} target="_blank" rel="noopener noreferrer" 
             className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1">
            {String(value)} <ExternalLink className="w-3 h-3" />
          </a>
        );
      }
      if (fieldSchema.format === 'email') {
        return (
          <a href={`mailto:${String(value)}`} 
             className="text-blue-600 hover:text-blue-800 hover:underline">
            {String(value)}
          </a>
        );
      }
      if (fieldSchema.format === 'textarea') {
        return <div className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded-lg border">{String(value)}</div>;
      }
      if (fieldSchema.format === 'phone') {
        return (
          <a href={`tel:${String(value)}`} 
             className="text-blue-600 hover:text-blue-800 hover:underline font-mono">
            {String(value)}
          </a>
        );
      }
      return <span className="text-gray-800">{String(value)}</span>;
    case 'number':
    case 'integer':
      return <span className="font-mono text-gray-800">{Number(value).toLocaleString('he-IL')}</span>;
    case 'boolean':
      return (
        <Badge variant={value ? "default" : "secondary"} className="text-xs">
          {value ? (
            <><CheckCircle className="w-3 h-3 mr-1" />כן</>
          ) : (
            <><AlertCircle className="w-3 h-3 mr-1" />לא</>
          )}
        </Badge>
      );
    case 'date':
      try {
        const date = new Date(value);
        return (
          <div className="flex items-center gap-1 text-gray-800">
            <Calendar className="w-4 h-4 text-gray-500" />
            {format(date, 'dd/MM/yyyy', { locale: he })}
          </div>
        );
      } catch {
        return <span className="text-gray-600">{String(value)}</span>;
      }
    case 'time':
      return (
        <div className="flex items-center gap-1 text-gray-800">
          <Clock className="w-4 h-4 text-gray-500" />
          {String(value)}
        </div>
      );
    case 'location':
      if (typeof value === 'object' && value.latitude && value.longitude) {
        return (
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center gap-1 text-blue-800 font-medium mb-1">
              <MapPin className="w-4 h-4" />
              מיקום
            </div>
            <div className="text-sm text-gray-600 font-mono">
              קו רוחב: {value.latitude}<br />
              קו אורך: {value.longitude}
            </div>
          </div>
        );
      }
      return <div className="bg-gray-50 p-2 rounded text-sm font-mono">{JSON.stringify(value)}</div>;
    case 'enum':
      return <Badge variant="outline" className="text-sm">{String(value)}</Badge>;
    case 'parent_record_reference':
      if (typeof value === 'string') {
        const parentDataTypeSlug = fieldSchema.parent_data_type_slug;
        return (
          <Link 
            to={createPageUrl(`CustomRecordViewPage?dataTypeSlug=${parentDataTypeSlug}&recordId=${value}`)} 
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-2 py-1 rounded border border-blue-200"
          >
            <FileText className="w-3 h-3" />
            רשומה מקושרת: {value.substring(0,8)}...
          </Link>
        );
      }
      return <span className="text-gray-600">{String(value)}</span>;
    case 'array':
    case 'object':
      return (
        <details className="bg-gray-50 border rounded-lg">
          <summary className="p-2 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-100">
            הצג נתונים מורכבים
          </summary>
          <pre className="whitespace-pre-wrap text-xs p-3 border-t bg-white overflow-x-auto">
            {JSON.stringify(value, null, 2)}
          </pre>
        </details>
      );
    default:
      return <span className="text-gray-800">{String(value)}</span>;
  }
};

export default function CustomRecordViewPage() {
  const [searchParams] = useSearchParams();
  const dataTypeSlug = searchParams.get('dataTypeSlug');
  const recordId = searchParams.get('recordId');
  
  const [dataType, setDataType] = useState(null);
  const [record, setRecord] = useState(null);
  const [linkedIncidents, setLinkedIncidents] = useState([]);
  const [aiSummary, setAiSummary] = useState('');
  const [newNote, setNewNote] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingAiSummary, setLoadingAiSummary] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [user, dt, rec] = await Promise.all([
        User.me(),
        CustomDataType.filter({ slug: dataTypeSlug }).then(res => res[0]),
        CustomDataRecord.get(recordId),
      ]);
      
      setCurrentUser(user);
      setDataType(dt);
      setRecord(rec);

      if (!dt || !rec) {
        setError("סוג דאטה או רשומה לא נמצאו.");
        setLoading(false);
        return;
      }

      // Fetch linked incidents
      const incidents = await Incident.filter({ 'tagged_entities.entity_id': recordId, 'tagged_entities.custom_data_type_slug': dataTypeSlug });
      setLinkedIncidents(incidents || []);

    } catch (err) {
      console.error("Error fetching data:", err);
      setError("שגיאה בטעינת נתוני הרשומה: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [dataTypeSlug, recordId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const generateAiSummary = useCallback(async () => {
    if (!dataType || !record || !dataType.ai_summary_prompt) return;

    setLoadingAiSummary(true);
    setAiSummary('');
    try {
      let prompt = dataType.ai_summary_prompt;
      Object.entries(record.data).forEach(([key, value]) => {
        prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), String(value));
      });
      
      const recordDataContext = `\n\nלהלן נתוני הרשומה לסיכום:\n${JSON.stringify(record.data, null, 2)}`;
      if (!dataType.ai_summary_prompt.toLowerCase().includes("נתוני הרשומה") && !dataType.ai_summary_prompt.toLowerCase().includes("record data")) {
         prompt += recordDataContext;
      }

      const summaryResult = await InvokeLLM({ prompt });
      setAiSummary(summaryResult || "לא התקבל סיכום מה-AI.");
    } catch (err) {
      console.error("Error generating AI summary:", err);
      setAiSummary("שגיאה ביצירת סיכום AI: " + err.message);
    } finally {
      setLoadingAiSummary(false);
    }
  }, [dataType, record]);

  useEffect(() => {
    if (dataType && record && dataType.ai_summary_prompt) {
      generateAiSummary();
    }
  }, [dataType, record, generateAiSummary]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !currentUser) return;
    setLoadingNotes(true);
    try {
      const noteToAdd = {
        note_id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        note_content: newNote,
        created_by_user_id: currentUser.id,
        created_by_user_name: currentUser.full_name,
        created_at: new Date().toISOString(),
      };
      const updatedNotes = [...(record.manual_notes || []), noteToAdd];
      await CustomDataRecord.update(record.id, { manual_notes: updatedNotes });
      setRecord(prev => ({ ...prev, manual_notes: updatedNotes }));
      setNewNote('');
    } catch (err) {
      console.error("Error adding note:", err);
      alert("שגיאה בהוספת הערה: " + err.message);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleDeleteNote = async (noteIdToDelete) => {
    if (!window.confirm("האם למחוק הערה זו?")) return;
    setLoadingNotes(true);
    try {
        const updatedNotes = (record.manual_notes || []).filter(note => note.note_id !== noteIdToDelete);
        await CustomDataRecord.update(record.id, { manual_notes: updatedNotes });
        setRecord(prev => ({ ...prev, manual_notes: updatedNotes }));
    } catch (err) {
        console.error("Error deleting note:", err);
        alert("שגיאה במחיקת הערה: " + err.message);
    } finally {
        setLoadingNotes(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex justify-center items-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-xl font-medium text-primary-700">טוען פרטי רשומה...</p>
          <p className="text-sm text-gray-500 mt-1">אנא המתן בזמן שאנחנו מביאים את המידע</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex justify-center items-center p-4">
        <Card className="clay-card bg-red-50 border-red-200 max-w-md w-full">
          <CardContent className="text-center p-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-700 mb-2">שגיאה</h2>
            <p className="text-red-600">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4 clay-button">
              נסה שוב
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dataType || !record) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex justify-center items-center p-4">
        <Card className="clay-card max-w-md w-full">
          <CardContent className="text-center p-8">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">לא נמצאו נתונים</h2>
            <p className="text-gray-500">לא נמצאו נתונים עבור רשומה זו.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const recordDisplayName = record.data[dataType.display_name_field_id] || `רשומה ${record.id.substring(0, 8)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
      <div className="container mx-auto p-4 md:p-6 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Link to={createPageUrl(`CustomDataView?dataTypeSlug=${dataTypeSlug}`)}>
              <Button variant="outline" className="clay-button flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                חזרה לרשימה
              </Button>
            </Link>
            <div className="h-6 w-px bg-gray-300"></div>
            <Badge variant="outline" className="text-sm">
              {dataType.name}
            </Badge>
          </div>
          
          <Card className="clay-card bg-white border-0 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center shadow-inner">
                    <FileText className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl md:text-3xl font-bold text-primary-700 mb-1">
                      {recordDisplayName}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 flex items-center gap-2">
                      <span>מזהה: {record.id.substring(0, 8)}...</span>
                      <span>•</span>
                      <span>נוצר: {format(new Date(record.created_date), 'dd/MM/yyyy', { locale: he })}</span>
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="clay-button">
                    <Edit className="w-4 h-4 mr-1" />
                    עריכה
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            {/* AI Summary Section */}
            {dataType.ai_summary_prompt && (
              <CardContent className="pt-0">
                <Card className="clay-card bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 shadow-sm">
                  <CardHeader className="py-4 px-5">
                    <CardTitle className="text-lg font-semibold text-indigo-700 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                      </div>
                      סיכום AI
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={generateAiSummary} 
                        disabled={loadingAiSummary}
                        className="mr-auto text-indigo-600 hover:bg-indigo-100"
                      >
                        {loadingAiSummary ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-3 px-5">
                    {loadingAiSummary ? (
                      <div className="flex items-center gap-3 py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                        <span className="text-indigo-700">מייצר סיכום בעזרת בינה מלאכותית...</span>
                      </div>
                    ) : aiSummary ? (
                      <div className="prose prose-sm max-w-none text-indigo-900">
                        <Markdown>{aiSummary}</Markdown>
                      </div>
                    ) : (
                      <p className="italic text-indigo-600">לא נוצר סיכום AI או שאין פרומפט מוגדר.</p>
                    )}
                  </CardContent>
                </Card>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="details" className="w-full">
          <div className="mb-6">
            <TabsList className="grid w-full grid-cols-3 md:max-w-lg mx-auto clay-card !p-1.5 h-auto">
              <TabsTrigger value="details" className="text-sm py-3 px-4 data-[state=active]:bg-primary-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all">
                <Info className="w-4 h-4 ml-2" />
                <span className="hidden md:inline">פרטי הרשומה</span>
                <span className="md:hidden">פרטים</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="text-sm py-3 px-4 data-[state=active]:bg-primary-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all">
                <History className="w-4 h-4 ml-2" />
                <span className="hidden md:inline">היסטוריה</span>
                <span className="md:hidden">היסטוריה</span>
              </TabsTrigger>
              <TabsTrigger value="notes" className="text-sm py-3 px-4 data-[state=active]:bg-primary-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all">
                <MessageSquare className="w-4 h-4 ml-2" />
                <span className="hidden md:inline">הערות</span>
                <span className="md:hidden">הערות</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="details">
            <Card className="clay-card bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary-600" />
                  פרטים מלאים
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(dataType.schema_definition.properties).map(([fieldName, fieldSchema]) => (
                  <div key={fieldName} className="group">
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-gray-700 text-sm">
                            {fieldSchema.description || fieldName}
                          </h3>
                          {dataType.schema_definition.required?.includes(fieldName) && (
                            <Badge variant="secondary" className="text-xs">חובה</Badge>
                          )}
                        </div>
                        <div className="text-gray-800">
                          {renderFieldValue(record.data[fieldName], fieldSchema, [], [])}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* System Fields */}
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <UserIcon className="w-5 h-5" />
                    מידע מערכת
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="text-sm text-gray-500 mb-1">נוצר על ידי</div>
                      <div className="font-medium text-gray-800">{record.created_by}</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="text-sm text-gray-500 mb-1">תאריך עדכון אחרון</div>
                      <div className="font-medium text-gray-800">
                        {format(new Date(record.updated_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="clay-card bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <History className="w-5 h-5 text-primary-600" />
                  אירועים וקישורים
                </CardTitle>
              </CardHeader>
              <CardContent>
                {linkedIncidents.length > 0 ? (
                  <div className="space-y-3">
                    {linkedIncidents.map(incident => (
                      <div key={incident.id} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 hover:shadow-md transition-all group">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <Link 
                              to={createPageUrl(`ManageIncidentPage?id=${incident.id}`)} 
                              className="font-medium text-blue-700 hover:text-blue-900 hover:underline text-lg group-hover:text-blue-800"
                            >
                              {incident.title}
                            </Link>
                            <div className="flex items-center gap-3 mt-2 text-sm">
                              <Badge variant={incident.status === 'closed' ? 'secondary' : 'default'} className="text-xs">
                                {incident.status === 'open' ? 'פתוח' : incident.status === 'in_progress' ? 'בטיפול' : 'סגור'}
                              </Badge>
                              <span className="text-gray-600">{incident.category}</span>
                              {incident.sub_category && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-gray-600">{incident.sub_category}</span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              נוצר: {format(new Date(incident.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">אין אירועים מקושרים</h3>
                    <p className="text-gray-500">לא נמצאו אירועים המקושרים לרשומה זו.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card className="clay-card bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary-600" />
                  הערות ידניות
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Existing Notes */}
                <div className="mb-8 space-y-4">
                  {record.manual_notes && record.manual_notes.length > 0 ? (
                    record.manual_notes.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map(note => (
                      <div key={note.note_id} className="group relative">
                        <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200 hover:shadow-md transition-all">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-primary-100 text-primary-700 text-xs font-medium">
                                  {note.created_by_user_name?.charAt(0)?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-gray-800 text-sm">{note.created_by_user_name}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(note.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                                </div>
                              </div>
                            </div>
                            {currentUser?.id === note.created_by_user_id && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteNote(note.note_id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                                disabled={loadingNotes}
                              >
                                <Trash2 className="w-4 h-4"/>
                              </Button>
                            )}
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{note.note_content}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-600 mb-2">אין הערות</h3>
                      <p className="text-gray-500">עדיין לא נוספו הערות לרשומה זו.</p>
                    </div>
                  )}
                </div>

                {/* Add New Note */}
                <div className="border-t pt-6">
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary-600" />
                    הוסף הערה חדשה
                  </h4>
                  <div className="space-y-4">
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="כתוב את הערתך כאן..."
                      className="clay-input min-h-[120px] resize-none"
                      disabled={loadingNotes}
                    />
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleAddNote} 
                        disabled={!newNote.trim() || loadingNotes} 
                        className="clay-button bg-primary-500 hover:bg-primary-600 text-white px-6"
                      >
                        {loadingNotes ? (
                          <Loader2 className="w-4 h-4 animate-spin ml-2" />
                        ) : (
                          <Send className="w-4 h-4 ml-2" />
                        )}
                        הוסף הערה
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}