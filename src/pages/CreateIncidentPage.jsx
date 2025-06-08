
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/api/entities';
import { Shift } from '@/api/entities'; 
import { IncidentCategory } from '@/api/entities';
import { IncidentSubCategory } from '@/api/entities';
import { Incident } from '@/api/entities';
import { createPageUrl } from '@/utils';
import {
  AlertTriangle,
  FileText,
  Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Simple ID generator as a replacement for nanoid
const generateSimpleId = (length = 8) => {
  return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
};

export default function CreateIncidentPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeShift, setActiveShift] = useState(null); // Keeping this state, but its logic is removed from initial fetch
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false); // Combined loading and submitting state
  const [error, setError] = useState(''); // For displaying errors

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [title, setTitle] = useState(''); // Will be auto-generated
  const [description, setDescription] = useState(''); // Optional description

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true); // Start loading
        const user = await User.me();
        setCurrentUser(user);

        const incidentCategories = await IncidentCategory.list();
        setCategories(incidentCategories || []);
        
        // Auto-generate initial title using the simple ID generator
        const newIncidentId = `מאורע #${generateSimpleId()}`;
        setTitle(newIncidentId);

        // Active shift fetching removed from initial creation as per outline
        // const now = new Date();
        // const shifts = await Shift.list();
        // const userSpecificActiveShift = shifts.find(shift => 
        //     shift.staff?.some(s => s.user_id === user.id) &&
        //     new Date(shift.start_time) <= now && 
        //     new Date(shift.end_time) >= now &&
        //     shift.status !== 'completed' && shift.status !== 'cancelled'
        // );
        // const userSpecificScheduledShift = shifts.find(shift => 
        //     shift.staff?.some(s => s.user_id === user.id) &&
        //     new Date(shift.start_time) > now &&
        //     shift.status === 'scheduled'
        // );
        // setActiveShift(userSpecificActiveShift || userSpecificScheduledShift || null);

      } catch (err) {
        console.error("Error fetching initial data for incident creation:", err);
        setError('שגיאה בטעינת נתונים ראשוניים.');
      } finally {
        setIsLoading(false); // Stop loading
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      IncidentSubCategory.filter({ parent_category_id: selectedCategory })
        .then(data => setSubCategories(data || []))
        .catch(err => {
          console.error("Error fetching sub-categories:", err);
          setSubCategories([]);
        });
    } else {
      setSubCategories([]);
    }
    setSelectedSubCategory(''); // Reset sub-category when category changes
  }, [selectedCategory]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear any previous errors

    if (!selectedCategory || !selectedSubCategory) {
      setError('יש לבחור קטגוריה ותת-קטגוריה.');
      return;
    }
    
    setIsLoading(true);

    try {
      const incidentData = {
        title: title, // Auto-generated title
        description: description, // Optional description
        category: selectedCategory,
        sub_category: selectedSubCategory,
        reporter_id: currentUser?.id,
        status: 'open',
        // shift_id: activeShift?.id, // Optional, as per outline
        // location and audio will be added later in ManageIncidentPage
      };

      const newIncident = await Incident.create(incidentData);
      console.log("Incident created successfully:", newIncident);
      setIsLoading(false);
      navigate(createPageUrl(`ManageIncidentPage?id=${newIncident.id}`));
    } catch (err) {
      console.error("Error creating incident:", err);
      setError('שגיאה ביצירת האירוע: ' + (err.message || 'אנא נסה שוב.'));
      setIsLoading(false);
    }
  };

  // Loading state for initial data fetch (before form is usable)
  if (isLoading && !currentUser && categories.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full"></div>
        <p className="mr-3 text-lg text-neutral-600">טוען טופס יצירת אירוע...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-stone-200 p-4 md:p-8" dir="rtl">
      <Card className="max-w-2xl mx-auto clay-card shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary-700 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 ml-3 text-red-500" />
            דיווח טיקט חדש
          </CardTitle>
          <CardDescription className="text-neutral-500">
            אנא מלא את הפרטים הבאים ליצירת אירוע חדש במערכת.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-sm" role="alert">
              <p className="font-bold">שגיאה</p>
              <p>{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-1">
                כותרת (נוצרת אוטומטית)
              </Label>
              <Input
                id="title"
                type="text"
                value={title}
                readOnly
                className="clay-input bg-neutral-100 cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="category" className="block text-sm font-medium text-neutral-700 mb-1">
                  קטגוריה <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isLoading}>
                  <SelectTrigger className="clay-select w-full">
                    <SelectValue placeholder="בחר קטגוריה..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subCategory" className="block text-sm font-medium text-neutral-700 mb-1">
                  אופי האירוע (תת-קטגוריה) <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedSubCategory} onValueChange={setSelectedSubCategory} disabled={isLoading || !selectedCategory || subCategories.length === 0}>
                  <SelectTrigger className="clay-select w-full">
                    <SelectValue placeholder={!selectedCategory ? "בחר קטגוריה תחילה" : subCategories.length === 0 ? "אין תתי-קטגוריות" : "בחר אופי אירוע..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {subCategories.map(subCat => (
                      <SelectItem key={subCat.id} value={subCat.id}>{subCat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-1">
                תיאור האירוע (אופציונלי)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="פרט את מהלך האירוע, מה קרה, מי מעורב וכו'..."
                className="clay-input min-h-[120px]"
                rows={5}
                disabled={isLoading}
              />
            </div>
            
            <div className="pt-4">
              <Button type="submit" className="w-full clay-button bg-red-600 hover:bg-red-700 text-white text-lg py-3" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="ml-2 h-5 w-5 animate-spin" /> יוצר אירוע...</>
                ) : (
                  <><FileText className="ml-2 h-5 w-5" /> פתח אירוע חדש</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
