
import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/api/entities';
import { Contact } from '@/api/entities';
import { Shift } from '@/api/entities';
import { IncidentCategory } from '@/api/entities';
import { IncidentSubCategory } from '@/api/entities';
import { Location } from '@/api/entities';
import { Procedure } from '@/api/entities';
import {
  User as UserIcon,
  MapPin,
  Tag,
  Info,
  Calendar,
  AlertTriangle,
  File,
  ChevronDown,
  X,
  Search,
  Save,
  Clock
} from 'lucide-react';

import IntelligentLocationSelector from '@/components/forms/IntelligentLocationSelector'; // New import for the dedicated component

// --- Start: Minimal Card components for self-containment ---
// These components mimic a UI library's Card structure for the purpose of this file.
const Card = ({ className = '', children }) => (
  <div className={`clay-card bg-white ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ className = '', children }) => (
  <div className={`mb-4 pb-4 border-b border-neutral-200 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ className = '', children }) => (
  <h3 className={`text-lg font-bold ${className}`}>
    {children}
  </h3>
);

const CardContent = ({ className = '', children }) => (
  <div className={className}>
    {children}
  </div>
);
// --- End: Minimal Card components ---

// IntelligentLocationSelector component definition has been moved to its own file.

export default function IncidentCreationForm({ onSubmit, onCancel }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [activeShift, setActiveShift] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [locations, setLocations] = useState([]); // This state will be passed to IntelligentLocationSelector
  const [filteredSubcategories, setFilteredSubcategories] = useState([]);
  const [searchContact, setSearchContact] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procedureSteps, setProcedureSteps] = useState([]);
  // 'gettingLocation' state is now managed internally by IntelligentLocationSelector

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    shift_id: '',
    reporter_id: '',
    field_agent_id: '',
    handling_team: [],
    contact_id: '',
    location: {
      latitude: null,
      longitude: null,
      location_id: '',
      description: ''
    },
    category: '',
    sub_category: '',
    description: '',
    status: 'open',
    procedure_steps: []
  });

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const user = await User.me();
        setCurrentUser(user);
        
        // Set reporter ID to current user
        setFormData(prev => ({
          ...prev,
          reporter_id: user.id,
          handling_team: [user.id]
        }));

        // Get active shift
        const now = new Date();
        const shifts = await Shift.list();
        const activeShift = shifts.find(shift => {
          const startTime = new Date(shift.start_time);
          const endTime = new Date(shift.end_time);
          return startTime <= now && endTime >= now;
        });
        
        if (activeShift) {
          setActiveShift(activeShift);
          setFormData(prev => ({
            ...prev,
            shift_id: activeShift.id
          }));
        }

        // Get contacts
        const allContacts = await Contact.list();
        setContacts(allContacts);
        setFilteredContacts(allContacts);

        // Get incident categories
        const incidentCategories = await IncidentCategory.list();
        setCategories(incidentCategories);

        // Get incident subcategories
        const incidentSubcategories = await IncidentSubCategory.list();
        setSubcategories(incidentSubcategories);

        // Get locations
        const allLocations = await Location.list();
        setLocations(allLocations);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter subcategories based on selected category
  useEffect(() => {
    if (formData.category) {
      const filtered = subcategories.filter(
        subcat => subcat.parent_category_id === formData.category
      );
      setFilteredSubcategories(filtered);

      // Reset subcategory if the current one doesn't match the selected category
      const currentSubcatValid = filtered.some(
        subcat => subcat.id === formData.sub_category
      );
      
      if (!currentSubcatValid) {
        setFormData(prev => ({
          ...prev,
          sub_category: ''
        }));
      }
    } else {
      setFilteredSubcategories([]);
    }
  }, [formData.category, subcategories]);

  // Update procedure steps when subcategory is selected
  useEffect(() => {
    const loadProcedureSteps = async () => {
      if (!formData.sub_category) {
        setProcedureSteps([]);
        setFormData(prev => ({ ...prev, procedure_steps: [] }));
        return;
      }

      const subcategory = subcategories.find(
        sc => sc.id === formData.sub_category
      );

      if (subcategory && subcategory.procedure_id) {
        try {
          const procedure = await Procedure.get(subcategory.procedure_id);
          
          if (procedure && procedure.steps) {
            setProcedureSteps(procedure.steps);
            
            // Initialize procedure steps in form data
            const initializedSteps = procedure.steps.map(step => ({
              step_id: step.step_number.toString(), // Using step number as ID
              completed: false,
              completed_at: null,
              completed_by: null,
              notes: ''
            }));
            
            setFormData(prev => ({
              ...prev,
              procedure_steps: initializedSteps
            }));
          }
        } catch (error) {
          console.error("Error loading procedure:", error);
        }
      }
    };

    loadProcedureSteps();
  }, [formData.sub_category, subcategories]);

  // Filter contacts based on search
  useEffect(() => {
    if (!searchContact.trim()) {
      setFilteredContacts(contacts);
    } else {
      const filtered = contacts.filter(contact => 
        contact.full_name.toLowerCase().includes(searchContact.toLowerCase()) ||
        contact.phone?.toLowerCase().includes(searchContact.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchContact.toLowerCase())
      );
      setFilteredContacts(filtered);
    }
  }, [searchContact, contacts]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // This handler remains for other form fields not managed by IntelligentLocationSelector
    // Location related inputs are now handled by IntelligentLocationSelector's onChange.
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Removed handleLocationDetection and calculateDistance from here as they are now
  // encapsulated within the IntelligentLocationSelector component.

  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title) {
      alert('יש להזין כותרת לאירוע');
      return;
    }
    
    if (!formData.category) {
      alert('יש לבחור קטגוריית אירוע');
      return;
    }
    
    if (!formData.sub_category) {
      alert('יש לבחור תת-קטגוריה');
      return;
    }
    
    onSubmit(formData);
  };

  if (loading) {
    return (
      <div className="clay-card bg-white p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">טוען נתונים...</p>
      </div>
    );
  }

  return (
    <div className="clay-card bg-white">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-200">
        <h2 className="text-xl font-bold flex items-center">
          <AlertTriangle className="w-5 h-5 ml-2 text-primary-500" />
          דיווח על אירוע חדש
        </h2>
        <button 
          onClick={onCancel}
          className="clay-button p-2 text-neutral-500 hover:bg-neutral-100"
          aria-label="סגור"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Basic information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-700">כותרת האירוע</label>
            <input 
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="clay-input w-full"
              placeholder="תיאור קצר של האירוע"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center text-neutral-700">
              <Calendar className="w-4 h-4 ml-1 text-primary-500" />
              משמרת נוכחית
            </label>
            {activeShift ? (
              <div className="clay-card bg-white p-3 flex items-center !shadow-sm border-neutral-200">
                <div className="w-8 h-8 rounded-full bg-success-100 flex items-center justify-center mr-3">
                  <Clock className="w-4 h-4 text-success-700" />
                </div>
                <div>
                  <p className="font-medium">
                    {new Date(activeShift.start_time).toLocaleDateString('he-IL')} 
                    {" - "}
                    {new Date(activeShift.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    {" עד "}
                    {new Date(activeShift.end_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm text-neutral-500">
                    אתר: {activeShift.site}
                  </p>
                </div>
              </div>
            ) : (
              <div className="clay-card bg-white p-3 text-center text-neutral-500 !shadow-sm border-neutral-200">
                <p>לא נמצאה משמרת פעילה</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Reporter and field agent */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center text-neutral-700">
              <UserIcon className="w-4 h-4 ml-1 text-primary-500" />
              מדווח
            </label>
            <div className="clay-card bg-white p-3 flex items-center !shadow-sm border-neutral-200">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                {currentUser.full_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <p className="font-medium">{currentUser.full_name}</p>
                <p className="text-sm text-neutral-500">{currentUser.email}</p>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-700">איש שטח מדווח (אופציונלי)</label>
            <input 
              type="text"
              name="field_agent_id"
              value={formData.field_agent_id}
              onChange={handleInputChange}
              className="clay-input w-full"
              placeholder="הכנס שם איש שטח"
            />
          </div>
        </div>
        
        {/* Contact selection */}
        <div>
          <label className="block text-sm font-medium mb-2 text-neutral-700">איש קשר</label>
          <div className="clay-card bg-white p-3 !shadow-sm border-neutral-200">
            <div className="flex items-center mb-3">
              <Search className="w-4 h-4 text-neutral-400 ml-2" />
              <input 
                type="text"
                value={searchContact}
                onChange={(e) => setSearchContact(e.target.value)}
                className="flex-grow outline-none bg-transparent"
                placeholder="חיפוש איש קשר לפי שם, טלפון או אימייל"
              />
            </div>
            
            <div className="max-h-40 overflow-y-auto space-y-2">
              <div 
                className={`p-2 rounded-lg cursor-pointer ${
                  formData.contact_id === 'anonymous' ? 'bg-primary-50' : 'hover:bg-neutral-50'
                }`}
                onClick={() => setFormData({ ...formData, contact_id: 'anonymous' })}
              >
                <p className="font-medium">אנונימי</p>
                <p className="text-xs text-neutral-500">דיווח ללא פרטי קשר</p>
              </div>
              
              {filteredContacts.map(contact => (
                <div 
                  key={contact.id}
                  className={`p-2 rounded-lg cursor-pointer ${
                    formData.contact_id === contact.id ? 'bg-primary-50' : 'hover:bg-neutral-50'
                  }`}
                  onClick={() => setFormData({ ...formData, contact_id: contact.id })}
                >
                  <p className="font-medium">{contact.full_name}</p>
                  <div className="flex flex-wrap text-xs text-neutral-500 gap-2">
                    {contact.phone && <span>{contact.phone}</span>}
                    {contact.email && <span>{contact.email}</span>}
                  </div>
                </div>
              ))}
              
              {filteredContacts.length === 0 && (
                <p className="text-center text-neutral-500 p-2">לא נמצאו אנשי קשר מתאימים</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Location Section - Enhanced */}
        <Card className="clay-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              מיקום האירוע
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <IntelligentLocationSelector
              value={formData.location}
              onChange={(locationData) => setFormData(prev => ({ ...prev, location: locationData }))}
              placeholder="הזן כתובת או בחר מיקום במפה"
              showNearbyResources={true}
              allLocations={locations} // Passing the fetched locations data to the new component
            />
          </CardContent>
        </Card>
        
        {/* Category and subcategory */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center text-neutral-700">
              <Tag className="w-4 h-4 ml-1 text-primary-500" />
              קטגוריית האירוע
            </label>
            <select 
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="clay-input w-full"
              required
            >
              <option value="">בחר קטגוריה...</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center text-neutral-700">
              <Tag className="w-4 h-4 ml-1 text-primary-500" />
              אופי האירוע
            </label>
            <select 
              name="sub_category"
              value={formData.sub_category}
              onChange={handleInputChange}
              className="clay-input w-full"
              disabled={!formData.category}
              required
            >
              <option value="">בחר אופי אירוע...</option>
              {filteredSubcategories.map(subcategory => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center text-neutral-700">
            <Info className="w-4 h-4 ml-1 text-primary-500" />
            תיאור האירוע
          </label>
          <textarea 
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="clay-input w-full h-32 resize-none"
            placeholder="תאר בפירוט את מהות האירוע, הנסיבות והפרטים הרלוונטיים..."
            required
          />
        </div>
        
        {/* Procedure steps (will be shown if a procedure is linked to the selected subcategory) */}
        {procedureSteps.length > 0 && (
          <div>
            <label className="block text-md font-medium mb-3 flex items-center text-neutral-700">
              <File className="w-4 h-4 ml-2 text-primary-500" />
              שלבי סדר הפעולות טיפול באירוע
            </label>
            
            <div className="clay-card bg-white !shadow-sm border-neutral-200">
              <div className="p-4 bg-info-100 text-info-700 text-sm">
                <p>סדר הפעולות להלן יישמר כחלק מהאירוע. ניתן לעדכן את ביצוע השלבים במהלך הטיפול באירוע.</p>
              </div>
              
              <div className="divide-y divide-neutral-200">
                {procedureSteps.map((step, index) => (
                  <div key={index} className="p-4 flex">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold ml-3">
                      {step.step_number}
                    </div>
                    
                    <div>
                      <div className="flex items-center mb-1">
                        <h4 className="font-medium">{step.title}</h4>
                        {step.is_required && (
                          <span className="inline-block px-2 py-0.5 bg-danger-100 text-danger-700 text-xs rounded-full mr-2">
                            חובה
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-neutral-600">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <div className="pt-6 flex justify-end gap-3 border-t border-neutral-200">
          <button 
            type="button"
            onClick={onCancel}
            className="clay-button bg-neutral-100"
          >
            ביטול
          </button>
          
          <button 
            type="submit"
            className="clay-button bg-primary-100 text-primary-700 border-primary-200 flex items-center"
          >
            <Save className="w-4 h-4 ml-2" />
            פתח אירוע
          </button>
        </div>
      </form>
    </div>
  );
}
