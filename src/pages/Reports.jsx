
import React, { useState, useEffect } from "react";
import { Report } from "@/api/entities";
import { Procedure } from "@/api/entities";
import { Contact } from "@/api/entities";
import { Vehicle } from "@/api/entities";
import { Institution } from "@/api/entities";
import { createPageUrl } from "@/utils";
import { 
  FileText, 
  Plus, 
  Filter, 
  Search, 
  Calendar,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Save,
  User,
  Car,
  Building,
  Edit,
  Trash,
  ArrowDownCircle
} from "lucide-react";

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [procedures, setProcedures] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [filters, setFilters] = useState({
    status: "all",
    classification: "all",
    search: ""
  });
  const [viewReport, setViewReport] = useState(null);

  // New report form state
  const [newReport, setNewReport] = useState({
    title: "",
    type: "",
    classification: "security",
    description: "",
    procedures: [],
    status: "open",
    involved_entities: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedReports = await Report.list("-created_date");
        setReports(fetchedReports);
        
        const fetchedProcedures = await Procedure.list();
        setProcedures(fetchedProcedures);
        
        const fetchedContacts = await Contact.list();
        setContacts(fetchedContacts);
        
        const fetchedVehicles = await Vehicle.list();
        setVehicles(fetchedVehicles);
        
        const fetchedInstitutions = await Institution.list();
        setInstitutions(fetchedInstitutions);
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const filteredReports = reports.filter(report => {
    const matchesStatus = filters.status === "all" || report.status === filters.status;
    const matchesClassification = filters.classification === "all" || report.classification === filters.classification;
    const matchesSearch = !filters.search || 
      report.title?.toLowerCase().includes(filters.search.toLowerCase()) || 
      report.description?.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesStatus && matchesClassification && matchesSearch;
  });

  const handleCreateReport = async () => {
    try {
      if (!newReport.title || !newReport.description) {
        alert("יש למלא כותרת ותיאור");
        return;
      }
      
      if (isEditing && currentReport) {
        await Report.update(currentReport.id, newReport);
        setReports(prev => prev.map(report => 
          report.id === currentReport.id ? { ...report, ...newReport } : report
        ));
      } else {
        const created = await Report.create(newReport);
        setReports(prev => [created, ...prev]);
      }
      
      resetForm();
    } catch (error) {
      console.error("Error saving report:", error);
    }
  };

  const handleEditReport = (report) => {
    setCurrentReport(report);
    setNewReport({
      title: report.title || "",
      type: report.type || "",
      classification: report.classification || "security",
      description: report.description || "",
      procedures: report.procedures || [],
      status: report.status || "open",
      involved_entities: report.involved_entities || []
    });
    setIsEditing(true);
    setIsCreating(true);
  };

  const resetForm = () => {
    setNewReport({
      title: "",
      type: "",
      classification: "security",
      description: "",
      procedures: [],
      status: "open",
      involved_entities: []
    });
    setIsCreating(false);
    setIsEditing(false);
    setCurrentReport(null);
  };

  const handleAddEntity = (entityType) => {
    setNewReport(prev => ({
      ...prev,
      involved_entities: [
        ...prev.involved_entities,
        { entity_type: entityType, entity_id: "", role: "involved" }
      ]
    }));
  };

  const handleRemoveEntity = (index) => {
    setNewReport(prev => ({
      ...prev,
      involved_entities: prev.involved_entities.filter((_, i) => i !== index)
    }));
  };

  const handleEntityChange = (index, field, value) => {
    setNewReport(prev => {
      const updated = [...prev.involved_entities];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return {
        ...prev,
        involved_entities: updated
      };
    });
  };

  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ניהול דוחות</h1>
        <p className="text-gray-600">צפייה ועריכה של דוחות אבטחה</p>
      </div>

      {/* Filters and actions */}
      <div className="clay-card bg-white bg-opacity-80 p-6 mb-6">
        <div className="flex flex-wrap justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            {/* Status filter */}
            <div className="clay-card bg-white px-3 py-2 flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-500" />
              <select 
                className="bg-transparent border-none outline-none"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">כל הסטטוסים</option>
                <option value="open">פתוח</option>
                <option value="in_progress">בטיפול</option>
                <option value="closed">סגור</option>
                <option value="archived">בארכיון</option>
              </select>
            </div>

            {/* Classification filter */}
            <div className="clay-card bg-white px-3 py-2 flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-500" />
              <select 
                className="bg-transparent border-none outline-none"
                value={filters.classification}
                onChange={(e) => handleFilterChange('classification', e.target.value)}
              >
                <option value="all">כל הסיווגים</option>
                <option value="security">ביטחוני</option>
                <option value="safety">בטיחותי</option>
                <option value="criminal">פלילי</option>
                <option value="maintenance">תחזוקה</option>
                <option value="other">אחר</option>
              </select>
            </div>

            {/* Search */}
            <div className="clay-card bg-white px-3 py-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-500" />
              <input 
                type="text" 
                placeholder="חיפוש..."
                className="bg-transparent border-none outline-none"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
          </div>

          {/* Add report button */}
          <button 
            className="clay-button flex items-center gap-2 bg-indigo-100 text-indigo-700 font-medium"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="w-4 h-4" />
            דוח חדש
          </button>
        </div>
      </div>

      {/* Reports list */}
      <div className="space-y-4 mb-8">
        {loading ? (
          <div className="clay-card bg-white bg-opacity-80 p-6 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p>טוען דוחות...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="clay-card bg-white bg-opacity-80 p-6 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>לא נמצאו דוחות מתאימים</p>
          </div>
        ) : (
          filteredReports.map(report => (
            <div 
              key={report.id} 
              className="clay-card bg-white bg-opacity-80 p-6 transition-all cursor-pointer"
              onClick={() => setViewReport(report)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${report.status === 'open' ? 'bg-red-100 text-red-800' : 
                        report.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 
                        report.status === 'closed' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'}`}>
                      {report.status === 'open' ? 'פתוח' : 
                       report.status === 'in_progress' ? 'בטיפול' : 
                       report.status === 'closed' ? 'סגור' : 'בארכיון'}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${report.classification === 'security' ? 'bg-indigo-100 text-indigo-800' : 
                        report.classification === 'safety' ? 'bg-orange-100 text-orange-800' : 
                        report.classification === 'criminal' ? 'bg-red-100 text-red-800' :
                        report.classification === 'maintenance' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'}`}>
                      {report.classification === 'security' ? 'ביטחוני' : 
                       report.classification === 'safety' ? 'בטיחותי' : 
                       report.classification === 'criminal' ? 'פלילי' : 
                       report.classification === 'maintenance' ? 'תחזוקה' : 'אחר'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{report.title}</h3>
                  <p className="text-gray-600 line-clamp-2">{report.description}</p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(report.created_date).toLocaleDateString('he-IL')}
                  </div>
                  <div className="flex mt-4">
                    <button 
                      className="clay-button p-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditReport(report);
                      }}
                    >
                      <Edit className="w-4 h-4 text-indigo-500" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Report Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="clay-card bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">
                {isEditing ? 'עריכת דוח' : 'יצירת דוח חדש'}
              </h2>
              <button 
                className="clay-button p-2" 
                onClick={resetForm}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Report Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">כותרת</label>
                  <input 
                    type="text" 
                    className="clay-card w-full p-3" 
                    value={newReport.title}
                    onChange={(e) => setNewReport({...newReport, title: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">סוג דוח</label>
                    <input 
                      type="text" 
                      className="clay-card w-full p-3" 
                      value={newReport.type}
                      onChange={(e) => setNewReport({...newReport, type: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">סיווג</label>
                    <select 
                      className="clay-card w-full p-3"
                      value={newReport.classification}
                      onChange={(e) => setNewReport({...newReport, classification: e.target.value})}
                    >
                      <option value="security">ביטחוני</option>
                      <option value="safety">בטיחותי</option>
                      <option value="criminal">פלילי</option>
                      <option value="maintenance">תחזוקה</option>
                      <option value="other">אחר</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">תיאור</label>
                  <textarea 
                    className="clay-card w-full p-3 min-h-[120px]" 
                    value={newReport.description}
                    onChange={(e) => setNewReport({...newReport, description: e.target.value})}
                  ></textarea>
                </div>
                
                {isEditing && (
                  <div>
                    <label className="block text-sm font-medium mb-1">סטטוס</label>
                    <select 
                      className="clay-card w-full p-3"
                      value={newReport.status}
                      onChange={(e) => setNewReport({...newReport, status: e.target.value})}
                    >
                      <option value="open">פתוח</option>
                      <option value="in_progress">בטיפול</option>
                      <option value="closed">סגור</option>
                      <option value="archived">בארכיון</option>
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium mb-1">סדרי פעולות קשורים</label>
                  <select 
                    className="clay-card w-full p-3"
                    multiple
                    value={newReport.procedures}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setNewReport({...newReport, procedures: selected});
                    }}
                  >
                    {procedures.map(procedure => (
                      <option key={procedure.id} value={procedure.id}>
                        {procedure.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Involved Entities */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium">ישויות מעורבות</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        className="clay-button p-1 text-xs flex items-center gap-1 bg-blue-50 text-blue-700"
                        onClick={() => handleAddEntity('person')}
                      >
                        <User className="w-3 h-3" /> איש קשר
                      </button>
                      <button 
                        type="button"
                        className="clay-button p-1 text-xs flex items-center gap-1 bg-green-50 text-green-700"
                        onClick={() => handleAddEntity('vehicle')}
                      >
                        <Car className="w-3 h-3" /> רכב
                      </button>
                      <button 
                        type="button"
                        className="clay-button p-1 text-xs flex items-center gap-1 bg-purple-50 text-purple-700"
                        onClick={() => handleAddEntity('institution')}
                      >
                        <Building className="w-3 h-3" /> מוסד
                      </button>
                    </div>
                  </div>
                  
                  {newReport.involved_entities.length === 0 ? (
                    <div className="clay-card bg-gray-50 p-4 text-center text-gray-500">
                      <p>לא נוספו ישויות מעורבות</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {newReport.involved_entities.map((entity, index) => (
                        <div key={index} className="clay-card bg-white p-3 flex items-center gap-3">
                          {entity.entity_type === 'person' && <User className="w-4 h-4 text-blue-500" />}
                          {entity.entity_type === 'vehicle' && <Car className="w-4 h-4 text-green-500" />}
                          {entity.entity_type === 'institution' && <Building className="w-4 h-4 text-purple-500" />}
                          
                          <select
                            className="border-none bg-transparent flex-1"
                            value={entity.entity_id}
                            onChange={(e) => handleEntityChange(index, 'entity_id', e.target.value)}
                          >
                            <option value="">בחר {entity.entity_type === 'person' ? 'איש קשר' : 
                                              entity.entity_type === 'vehicle' ? 'רכב' : 'מוסד'}</option>
                            {entity.entity_type === 'person' && contacts.map(contact => (
                              <option key={contact.id} value={contact.id}>{contact.full_name}</option>
                            ))}
                            {entity.entity_type === 'vehicle' && vehicles.map(vehicle => (
                              <option key={vehicle.id} value={vehicle.id}>{vehicle.license_plate}</option>
                            ))}
                            {entity.entity_type === 'institution' && institutions.map(institution => (
                              <option key={institution.id} value={institution.id}>{institution.name}</option>
                            ))}
                          </select>
                          
                          <select
                            className="border-none bg-transparent w-28"
                            value={entity.role}
                            onChange={(e) => handleEntityChange(index, 'role', e.target.value)}
                          >
                            <option value="reporter">מדווח</option>
                            <option value="involved">מעורב</option>
                            <option value="witness">עד</option>
                            <option value="responder">מגיב</option>
                            <option value="other">אחר</option>
                          </select>
                          
                          <button
                            type="button"
                            className="clay-button p-1 text-red-500"
                            onClick={() => handleRemoveEntity(index)}
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button 
                className="clay-button px-4 py-2 bg-gray-100" 
                onClick={resetForm}
              >
                ביטול
              </button>
              <button 
                className="clay-button px-4 py-2 bg-indigo-100 text-indigo-700 flex items-center gap-2" 
                onClick={handleCreateReport}
              >
                <Save className="w-4 h-4" />
                {isEditing ? 'עדכן דוח' : 'צור דוח'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Report Modal */}
      {viewReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="clay-card bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">פרטי דוח</h2>
              <button 
                className="clay-button p-2" 
                onClick={() => setViewReport(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${viewReport.status === 'open' ? 'bg-red-100 text-red-800' : 
                    viewReport.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 
                    viewReport.status === 'closed' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'}`}>
                  {viewReport.status === 'open' ? 'פתוח' : 
                   viewReport.status === 'in_progress' ? 'בטיפול' : 
                   viewReport.status === 'closed' ? 'סגור' : 'בארכיון'}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${viewReport.classification === 'security' ? 'bg-indigo-100 text-indigo-800' : 
                    viewReport.classification === 'safety' ? 'bg-orange-100 text-orange-800' : 
                    viewReport.classification === 'criminal' ? 'bg-red-100 text-red-800' :
                    viewReport.classification === 'maintenance' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'}`}>
                  {viewReport.classification === 'security' ? 'ביטחוני' : 
                   viewReport.classification === 'safety' ? 'בטיחותי' : 
                   viewReport.classification === 'criminal' ? 'פלילי' : 
                   viewReport.classification === 'maintenance' ? 'תחזוקה' : 'אחר'}
                </span>
              </div>
              
              <h1 className="text-2xl font-bold">{viewReport.title}</h1>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">סוג דוח:</span>
                  <span className="font-medium mr-2">{viewReport.type || 'לא צוין'}</span>
                </div>
                <div>
                  <span className="text-gray-500">תאריך יצירה:</span>
                  <span className="font-medium mr-2">
                    {new Date(viewReport.created_date).toLocaleDateString('he-IL')}
                  </span>
                </div>
              </div>
              
              <div className="clay-card bg-white p-4">
                <h3 className="font-medium mb-2">תיאור</h3>
                <p className="whitespace-pre-wrap">{viewReport.description}</p>
              </div>
              
              {viewReport.involved_entities && viewReport.involved_entities.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">ישויות מעורבות</h3>
                  <div className="space-y-2">
                    {viewReport.involved_entities.map((entity, index) => {
                      let entityName = "לא ידוע";
                      let entityIcon = null;
                      
                      if (entity.entity_type === 'person') {
                        const contact = contacts.find(c => c.id === entity.entity_id);
                        entityName = contact ? contact.full_name : "איש קשר לא ידוע";
                        entityIcon = <User className="w-4 h-4 text-blue-500" />;
                      } else if (entity.entity_type === 'vehicle') {
                        const vehicle = vehicles.find(v => v.id === entity.entity_id);
                        entityName = vehicle ? vehicle.license_plate : "רכב לא ידוע";
                        entityIcon = <Car className="w-4 h-4 text-green-500" />;
                      } else if (entity.entity_type === 'institution') {
                        const institution = institutions.find(i => i.id === entity.entity_id);
                        entityName = institution ? institution.name : "מוסד לא ידוע";
                        entityIcon = <Building className="w-4 h-4 text-purple-500" />;
                      }
                      
                      return (
                        <div key={index} className="clay-card bg-white p-3 flex items-center gap-3">
                          {entityIcon}
                          <span>{entityName}</span>
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                            {entity.role === 'reporter' ? 'מדווח' :
                             entity.role === 'involved' ? 'מעורב' :
                             entity.role === 'witness' ? 'עד' :
                             entity.role === 'responder' ? 'מגיב' : 'אחר'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {viewReport.updates && viewReport.updates.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">עדכונים</h3>
                  <div className="space-y-2">
                    {viewReport.updates.map((update, index) => (
                      <div key={index} className="clay-card bg-white p-3">
                        <div className="flex justify-between text-sm text-gray-500 mb-1">
                          <span>{new Date(update.timestamp).toLocaleDateString('he-IL')}</span>
                          <span>משתמש: {update.user_id}</span>
                        </div>
                        <p>{update.content}</p>
                        {update.changed_fields && update.changed_fields.length > 0 && (
                          <div className="mt-2 text-sm">
                            <span className="text-gray-500">שינויים:</span>
                            <ul className="list-disc list-inside">
                              {update.changed_fields.map((change, idx) => (
                                <li key={idx}>
                                  {change.field}: מ-{change.old_value} ל-{change.new_value}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t flex justify-between">
              <button 
                className="clay-button px-4 py-2 flex items-center gap-2" 
                onClick={() => {
                  setViewReport(null);
                  handleEditReport(viewReport);
                }}
              >
                <Edit className="w-4 h-4" />
                ערוך דוח
              </button>
              <button 
                className="clay-button px-4 py-2 bg-red-50 text-red-700" 
                onClick={() => setViewReport(null)}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
