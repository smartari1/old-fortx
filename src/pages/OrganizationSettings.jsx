
import React, { useState, useEffect } from 'react';
import { OrganizationSettings } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { User } from '@/api/entities';
import {
  Settings,
  Building,
  Upload,
  Save,
  Image as ImageIcon,
  Phone,
  Mail,
  MapPin,
  Globe,
  Palette,
  Shield,
  Cog,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function OrganizationSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSmallLogo, setUploadingSmallLogo] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const user = await User.me();
        setCurrentUser(user);
        
        // Try to get existing settings
        const existingSettings = await OrganizationSettings.list();
        
        if (existingSettings.length > 0) {
          setSettings(existingSettings[0]);
        } else {
          // Create default settings with required organization_name
          const defaultSettings = {
            organization_name: "מערכת אבטחה", // This is required!
            organization_name_en: "Security System",
            primary_color: "#0ea5e9",
            secondary_color: "#64748b",
            address: {
              street: "",
              city: "",
              postal_code: "",
              country: "ישראל"
            },
            contact_info: {
              phone: "",
              fax: "",
              email: "",
              website: ""
            },
            business_info: {
              registration_number: "",
              tax_id: "",
              industry: "אבטחה וביטחון",
              established_date: ""
            },
            system_settings: {
              timezone: "Asia/Jerusalem",
              default_language: "he",
              date_format: "DD/MM/YYYY",
              enable_rtl: true
            },
            security_settings: {
              require_two_factor: false,
              session_timeout_minutes: 480,
              password_policy: {
                min_length: 8,
                require_uppercase: true,
                require_numbers: true,
                require_symbols: false
              }
            },
            features_enabled: {
              incidents: true,
              shifts: true,
              resources: true,
              reports: true,
              maps: true,
              ai_assistant: true
            },
            is_active: true
          };
          setSettings(defaultSettings);
        }
      } catch (error) {
        console.error("Error fetching organization settings:", error);
        setMessage({ type: 'error', text: 'שגיאה בטעינת הגדרות הארגון' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (path, value) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });

    // Clear any previous error messages when user makes changes
    if (message.type === 'error') {
      setMessage({ type: '', text: '' });
    }
  };

  const handleLogoUpload = async (file, type = 'main') => {
    try {
      if (type === 'main') {
        setUploadingLogo(true);
      } else {
        setUploadingSmallLogo(true);
      }

      const result = await UploadFile({ file });
      
      if (type === 'main') {
        handleInputChange('logo_url', result.file_url);
      } else {
        handleInputChange('logo_small_url', result.file_url);
      }
      
      setMessage({ type: 'success', text: 'הלוגו הועלה בהצלחה' });
    } catch (error) {
      console.error("Error uploading logo:", error);
      setMessage({ type: 'error', text: 'שגיאה בהעלאת הלוגו' });
    } finally {
      if (type === 'main') {
        setUploadingLogo(false);
      } else {
        setUploadingSmallLogo(false);
      }
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validate required fields before saving
      if (!settings.organization_name || settings.organization_name.trim() === '') {
        setMessage({ type: 'error', text: 'שם הארגון הוא שדה חובה' });
        setSaving(false);
        return;
      }

      // Ensure all required nested objects exist
      const settingsToSave = {
        ...settings,
        organization_name: settings.organization_name.trim(),
        address: settings.address || {
          street: "",
          city: "",
          postal_code: "",
          country: "ישראל"
        },
        contact_info: settings.contact_info || {
          phone: "",
          fax: "",
          email: "",
          website: ""
        },
        business_info: settings.business_info || {
          registration_number: "",
          tax_id: "",
          industry: "אבטחה וביטחון",
          established_date: ""
        },
        system_settings: settings.system_settings || {
          timezone: "Asia/Jerusalem",
          default_language: "he",
          date_format: "DD/MM/YYYY",
          enable_rtl: true
        },
        security_settings: settings.security_settings || {
          require_two_factor: false,
          session_timeout_minutes: 480,
          password_policy: {
            min_length: 8,
            require_uppercase: true,
            require_numbers: true,
            require_symbols: false
          }
        },
        features_enabled: settings.features_enabled || {
          incidents: true,
          shifts: true,
          resources: true,
          reports: true,
          maps: true,
          ai_assistant: true
        },
        is_active: settings.is_active !== undefined ? settings.is_active : true
      };

      let savedSettings;
      if (settings.id) {
        savedSettings = await OrganizationSettings.update(settings.id, settingsToSave);
      } else {
        savedSettings = await OrganizationSettings.create(settingsToSave);
      }
      
      setSettings(savedSettings);
      setMessage({ type: 'success', text: 'ההגדרות נשמרו בהצלחה' });
      
      // Refresh page to apply new logo in sidebar
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error("Error saving settings:", error);
      let errorMessage = 'שגיאה בשמירת ההגדרות';
      
      if (error.response?.data?.message) {
        errorMessage += ': ' + error.response.data.message;
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
        <span className="mr-3">טוען הגדרות...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <Building className="w-8 h-8 ml-3 text-primary-600" />
          הגדרות הארגון
        </h1>
        <p className="text-gray-600">נהל את פרטי הארגון, לוגו והגדרות המערכת</p>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-5 clay-card mb-6">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            פרטים בסיסיים
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            מיתוג ועיצוב
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            יצירת קשר
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Cog className="w-4 h-4" />
            הגדרות מערכת
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            אבטחה
          </TabsTrigger>
        </TabsList>

        {/* Basic Information */}
        <TabsContent value="basic">
          <Card className="clay-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-primary-600" />
                פרטים בסיסיים של הארגון
              </CardTitle>
              <CardDescription>
                הזן את פרטי הארגון הבסיסיים ופרטים עסקיים
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="org-name">שם הארגון בעברית *</Label>
                  <Input
                    id="org-name"
                    value={settings?.organization_name || ''}
                    onChange={(e) => handleInputChange('organization_name', e.target.value)}
                    className="clay-input"
                    placeholder="הזן שם הארגון"
                  />
                </div>
                <div>
                  <Label htmlFor="org-name-en">שם הארגון באנגלית</Label>
                  <Input
                    id="org-name-en"
                    value={settings?.organization_name_en || ''}
                    onChange={(e) => handleInputChange('organization_name_en', e.target.value)}
                    className="clay-input"
                    placeholder="Enter organization name"
                    dir="ltr"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">פרטים עסקיים</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reg-number">מספר רישום/ח.פ.</Label>
                    <Input
                      id="reg-number"
                      value={settings?.business_info?.registration_number || ''}
                      onChange={(e) => handleInputChange('business_info.registration_number', e.target.value)}
                      className="clay-input"
                      placeholder="הזן מספר רישום"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tax-id">מספר עוסק מורשה</Label>
                    <Input
                      id="tax-id"
                      value={settings?.business_info?.tax_id || ''}
                      onChange={(e) => handleInputChange('business_info.tax_id', e.target.value)}
                      className="clay-input"
                      placeholder="הזן מספר עוסק"
                    />
                  </div>
                  <div>
                    <Label htmlFor="industry">תחום עיסוק</Label>
                    <Input
                      id="industry"
                      value={settings?.business_info?.industry || ''}
                      onChange={(e) => handleInputChange('business_info.industry', e.target.value)}
                      className="clay-input"
                      placeholder="הזן תחום עיסוק"
                    />
                  </div>
                  <div>
                    <Label htmlFor="established">תאריך הקמה</Label>
                    <Input
                      id="established"
                      type="date"
                      value={settings?.business_info?.established_date || ''}
                      onChange={(e) => handleInputChange('business_info.established_date', e.target.value)}
                      className="clay-input"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding */}
        <TabsContent value="branding">
          <Card className="clay-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary-600" />
                מיתוג ועיצוב
              </CardTitle>
              <CardDescription>
                העלה לוגו והגדר צבעי הארגון
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>לוגo ראשי</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    {settings?.logo_url ? (
                      <div className="space-y-3">
                        <img 
                          src={settings.logo_url} 
                          alt="לוגו הארגון" 
                          className="max-h-24 mx-auto object-contain"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('logo-upload').click()}
                          disabled={uploadingLogo}
                        >
                          {uploadingLogo ? 'מעלה...' : 'החלף לוגו'}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <ImageIcon className="w-12 h-12 mx-auto text-gray-400" />
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById('logo-upload').click()}
                          disabled={uploadingLogo}
                        >
                          {uploadingLogo ? 'מעלה...' : 'העלה לוגו'}
                        </Button>
                      </div>
                    )}
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          handleLogoUpload(e.target.files[0], 'main');
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    מומלץ: 200x60 פיקסלים, PNG או JPG
                  </p>
                </div>

                <div className="space-y-4">
                  <Label>לוגו קטן (לסיידבר)</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    {settings?.logo_small_url ? (
                      <div className="space-y-3">
                        <img 
                          src={settings.logo_small_url} 
                          alt="לוגו קטן" 
                          className="max-h-16 mx-auto object-contain"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('small-logo-upload').click()}
                          disabled={uploadingSmallLogo}
                        >
                          {uploadingSmallLogo ? 'מעלה...' : 'החלף לוגו'}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <ImageIcon className="w-8 h-8 mx-auto text-gray-400" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('small-logo-upload').click()}
                          disabled={uploadingSmallLogo}
                        >
                          {uploadingSmallLogo ? 'מעלה...' : 'העלה לוגו קטן'}
                        </Button>
                      </div>
                    )}
                    <input
                      id="small-logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          handleLogoUpload(e.target.files[0], 'small');
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    מומלץ: 40x40 פיקסלים, PNG או JPG
                  </p>
                </div>
              </div>

              <Separator />

              {/* Color Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">צבעי הארגון</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primary-color">צבע עיקרי</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary-color"
                        type="color"
                        value={settings?.primary_color || '#0ea5e9'}
                        onChange={(e) => handleInputChange('primary_color', e.target.value)}
                        className="w-20 h-10 clay-input"
                      />
                      <Input
                        value={settings?.primary_color || '#0ea5e9'}
                        onChange={(e) => handleInputChange('primary_color', e.target.value)}
                        className="clay-input flex-1"
                        placeholder="#0ea5e9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="secondary-color">צבע משני</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondary-color"
                        type="color"
                        value={settings?.secondary_color || '#64748b'}
                        onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                        className="w-20 h-10 clay-input"
                      />
                      <Input
                        value={settings?.secondary_color || '#64748b'}
                        onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                        className="clay-input flex-1"
                        placeholder="#64748b"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Information */}
        <TabsContent value="contact">
          <Card className="clay-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary-600" />
                פרטי יצירת קשר
              </CardTitle>
              <CardDescription>
                הזן את פרטי יצירת הקשר וכתובת הארגון
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">יצירת קשר</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">טלפון ראשי</Label>
                    <Input
                      id="phone"
                      value={settings?.contact_info?.phone || ''}
                      onChange={(e) => handleInputChange('contact_info.phone', e.target.value)}
                      className="clay-input"
                      placeholder="הזן מספר טלפון"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fax">פקס</Label>
                    <Input
                      id="fax"
                      value={settings?.contact_info?.fax || ''}
                      onChange={(e) => handleInputChange('contact_info.fax', e.target.value)}
                      className="clay-input"
                      placeholder="הזן מספר פקס"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">דואל ראשי</Label>
                    <Input
                      id="email"
                      type="email"
                      value={settings?.contact_info?.email || ''}
                      onChange={(e) => handleInputChange('contact_info.email', e.target.value)}
                      className="clay-input"
                      placeholder="הזן כתובת דואל"
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">אתר אינטרנט</Label>
                    <Input
                      id="website"
                      value={settings?.contact_info?.website || ''}
                      onChange={(e) => handleInputChange('contact_info.website', e.target.value)}
                      className="clay-input"
                      placeholder="הזן כתובת אתר"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">כתובת</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="street">רחוב ומספר בית</Label>
                    <Input
                      id="street"
                      value={settings?.address?.street || ''}
                      onChange={(e) => handleInputChange('address.street', e.target.value)}
                      className="clay-input"
                      placeholder="הזן רחוב ומספר"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">עיר</Label>
                    <Input
                      id="city"
                      value={settings?.address?.city || ''}
                      onChange={(e) => handleInputChange('address.city', e.target.value)}
                      className="clay-input"
                      placeholder="הזן שם העיר"
                    />
                  </div>
                  <div>
                    <Label htmlFor="postal">מיקוד</Label>
                    <Input
                      id="postal"
                      value={settings?.address?.postal_code || ''}
                      onChange={(e) => handleInputChange('address.postal_code', e.target.value)}
                      className="clay-input"
                      placeholder="הזן מיקוד"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system">
          <Card className="clay-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cog className="w-5 h-5 text-primary-600" />
                הגדרות מערכת
              </CardTitle>
              <CardDescription>
                הגדר העדפות מערכת ותכונות
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* System Preferences */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">העדפות מערכת</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="timezone">אזור זמן</Label>
                    <Select
                      value={settings?.system_settings?.timezone || 'Asia/Jerusalem'}
                      onValueChange={(value) => handleInputChange('system_settings.timezone', value)}
                    >
                      <SelectTrigger className="clay-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Jerusalem">ירושלים</SelectItem>
                        <SelectItem value="Europe/London">לונדון</SelectItem>
                        <SelectItem value="America/New_York">ניו יורק</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="language">שפת ברירת מחדל</Label>
                    <Select
                      value={settings?.system_settings?.default_language || 'he'}
                      onValueChange={(value) => handleInputChange('system_settings.default_language', value)}
                    >
                      <SelectTrigger className="clay-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="he">עברית</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ar">عربية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="date-format">פורמט תאריך</Label>
                    <Select
                      value={settings?.system_settings?.date_format || 'DD/MM/YYYY'}
                      onValueChange={(value) => handleInputChange('system_settings.date_format', value)}
                    >
                      <SelectTrigger className="clay-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Features */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">תכונות מופעלות</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries({
                    incidents: 'מודול אירועים',
                    shifts: 'מודול משמרות', 
                    resources: 'מודול משאבים',
                    reports: 'מודול דוחות',
                    maps: 'מודול מפות',
                    ai_assistant: 'עוזר AI'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                      <Label htmlFor={`feature-${key}`}>{label}</Label>
                      <Switch
                        id={`feature-${key}`}
                        checked={settings?.features_enabled?.[key] || false}
                        onCheckedChange={(checked) => handleInputChange(`features_enabled.${key}`, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <Card className="clay-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary-600" />
                הגדרות אבטחה
              </CardTitle>
              <CardDescription>
                הגדר מדיניות אבטחה וסיסמאות
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Security Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label htmlFor="two-factor">אימות דו-שלבי</Label>
                    <p className="text-sm text-gray-500">דרוש אימות דו-שלבי לכל המשתמשים</p>
                  </div>
                  <Switch
                    id="two-factor"
                    checked={settings?.security_settings?.require_two_factor || false}
                    onCheckedChange={(checked) => handleInputChange('security_settings.require_two_factor', checked)}
                  />
                </div>

                <div>
                  <Label htmlFor="session-timeout">זמן פקיעת הפעלה (דקות)</Label>
                  <Input
                    id="session-timeout"
                    type="number"
                    value={settings?.security_settings?.session_timeout_minutes || 480}
                    onChange={(e) => handleInputChange('security_settings.session_timeout_minutes', parseInt(e.target.value))}
                    className="clay-input max-w-32"
                    min="30"
                    max="1440"
                  />
                </div>
              </div>

              <Separator />

              {/* Password Policy */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">מדיניות סיסמאות</h3>
                <div>
                  <Label htmlFor="min-length">אורך מינימלי</Label>
                  <Input
                    id="min-length"
                    type="number"
                    value={settings?.security_settings?.password_policy?.min_length || 8}
                    onChange={(e) => handleInputChange('security_settings.password_policy.min_length', parseInt(e.target.value))}
                    className="clay-input max-w-32"
                    min="6"
                    max="20"
                  />
                </div>

                <div className="space-y-3">
                  {Object.entries({
                    require_uppercase: 'דרוש אותיות גדולות',
                    require_numbers: 'דרוש ספרות',
                    require_symbols: 'דרוש סימנים מיוחדים'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                      <Label htmlFor={`password-${key}`}>{label}</Label>
                      <Switch
                        id={`password-${key}`}
                        checked={settings?.security_settings?.password_policy?.[key] || false}
                        onCheckedChange={(checked) => handleInputChange(`security_settings.password_policy.${key}`, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end pt-6">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="clay-button bg-primary-100 text-primary-700"
        >
          {saving ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full ml-2"></div>
              שומר...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 ml-2" />
              שמור הגדרות
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
