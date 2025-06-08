
import React from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MapPin as MapPinIconLucide } from 'lucide-react'; // Specific import

export default function DataTypeGeneralSettingsForm({
  currentType,
  handleInputChange,
  handleSelectChange,
  handleIconChange,
  handleSpatialConfigChange,
  availableIcons,
  availableMapIcons,
  iconComponents,
  locationFieldsInCurrentSchema,
  stringFieldsInCurrentSchema
}) {

  const renderButtonIcon = (iconNameString) => {
    const IconComponent = iconComponents[iconNameString] || iconComponents['ListChecks']; // Default to ListChecks
    return <IconComponent className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="typeName" className="block text-sm font-medium mb-1">שם סוג הדאטה</label>
          <Input id="typeName" name="name" type="text" value={currentType.name} onChange={handleInputChange} className="clay-input w-full p-3" required />
        </div>
        <div>
          <label htmlFor="typeSlug" className="block text-sm font-medium mb-1">כינוי (Slug)</label>
          <Input id="typeSlug" name="slug" type="text" value={currentType.slug} onChange={handleInputChange} className="clay-input w-full p-3" required dir="ltr" />
          <p className="text-xs text-gray-500 mt-1">באנגלית, ללא רווחים (למשל: 'equipment_list').</p>
        </div>
      </div>
      <div>
        <label htmlFor="typeDescription" className="block text-sm font-medium mb-1">תיאור</label>
        <Textarea id="typeDescription" name="description" value={currentType.description} onChange={handleInputChange} className="clay-input w-full p-3 h-24"></Textarea>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">בחר אייקון</label>
        <div className="flex flex-wrap gap-2">
          {availableIcons.map(iconName => (
            <Button
              key={iconName}
              type="button"
              onClick={() => handleIconChange(iconName)}
              title={iconName}
              className={`clay-button p-2 ${currentType.icon === iconName ? 'bg-indigo-100 ring-2 ring-indigo-500' : 'bg-gray-100'}`}
            >
              {renderButtonIcon(iconName)}
            </Button>
          ))}
        </div>
      </div>

      {/* Spatial Configuration */}
      <fieldset className="border p-4 rounded-xl clay-card bg-green-50 !shadow-sm">
        <legend className="text-sm font-medium px-1 text-green-700">הגדרות תצוגה מרחבית (מפה)</legend>
        <div className="space-y-4 mt-3">
          <div className="flex items-center">
            <Checkbox
              id="isSpatial"
              checked={currentType.spatial_config?.is_spatial || false}
              onCheckedChange={(checked) => handleSpatialConfigChange('is_spatial', checked)}
              className="ml-2"
            />
            <label htmlFor="isSpatial" className="text-sm font-medium">
              סוג דאטה זה יוצג על המפה (יש לו ביטוי במרחב)
            </label>
          </div>

          {(currentType.spatial_config?.is_spatial) && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="locationType" className="block text-xs font-medium mb-1">סוג ייצוג מרחבי</label>
                  <Select
                    value={currentType.spatial_config.location_type}
                    onValueChange={(val) => handleSpatialConfigChange('location_type', val)}
                  >
                    <SelectTrigger className="clay-select w-full p-2 text-sm">
                      <SelectValue placeholder="בחר סוג" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="point">נקודה</SelectItem>
                      <SelectItem value="area">אזור</SelectItem>
                      <SelectItem value="route">מסלול</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="mapIcon" className="block text-xs font-medium mb-1">אייקון על המפה</label>
                  <Select
                    value={currentType.spatial_config.map_icon}
                    onValueChange={(val) => handleSpatialConfigChange('map_icon', val)}
                  >
                    <SelectTrigger className="clay-select w-full p-2 text-sm">
                      <SelectValue placeholder="בחר אייקון" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMapIcons.map(iconName => (
                        <SelectItem key={iconName} value={iconName}>{iconName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="mapColor" className="block text-xs font-medium mb-1">צבע על המפה</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      id="mapColor"
                      value={currentType.spatial_config.map_color}
                      onChange={(e) => handleSpatialConfigChange('map_color', e.target.value)}
                      className="w-10 h-8 rounded clay-input"
                    />
                    <Input
                      type="text"
                      value={currentType.spatial_config.map_color}
                      onChange={(e) => handleSpatialConfigChange('map_color', e.target.value)}
                      className="clay-input flex-1 p-2 text-sm"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="popupTemplate" className="block text-xs font-medium mb-1">תבנית חלונית מידע על המפה</label>
                <Textarea
                  id="popupTemplate"
                  value={currentType.spatial_config.popup_template || ''}
                  onChange={(e) => handleSpatialConfigChange('popup_template', e.target.value)}
                  className="clay-input w-full p-2 text-sm h-20"
                  placeholder="<h4>{display_name}</h4><p>{description}</p>"
                  dir="ltr"
                />
                <p className="text-xs text-gray-500 mt-1">השתמש ב-{`{field_name}`} כדי להציג נתונים מהרשומה.</p>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center">
                  <Checkbox
                    checked={currentType.spatial_config.clustering_enabled}
                    onCheckedChange={(checked) => handleSpatialConfigChange('clustering_enabled', checked)}
                    className="ml-2"
                  />
                  <span className="text-sm">אפשר קיבוץ (clustering) של רשומות קרובות</span>
                </label>
                <label className="flex items-center">
                  <Checkbox
                    checked={currentType.spatial_config.show_in_legend}
                    onCheckedChange={(checked) => handleSpatialConfigChange('show_in_legend', checked)}
                    className="ml-2"
                  />
                  <span className="text-sm">הצג בקבוצת הסינון של המפה</span>
                </label>
              </div>
            </>
          )}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="mainLocationField" className="block text-sm font-medium mb-1">שדה מיקום ראשי (להצגה במפה)</label>
          <Select
            value={currentType.main_location_field_id || ''}
            onValueChange={(val) => handleSelectChange('main_location_field_id', val || null)} // Ensure null if empty
          >
            <SelectTrigger className="clay-select w-full p-3">
              <SelectValue placeholder="ללא שדה מיקום ראשי" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>ללא שדה מיקום ראשי</SelectItem> {/* Use empty string for SelectItem value if it represents clearing */}
              {locationFieldsInCurrentSchema.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {locationFieldsInCurrentSchema.length === 0 && <p className="text-xs text-gray-500 mt-1">אין שדות מסוג 'מיקום' בסכמה הנוכחית.</p>}
        </div>
        <div>
          <label htmlFor="displayNameField" className="block text-sm font-medium mb-1">שדה שם תצוגה (לזיהוי רשומות)</label>
          <Select
            value={currentType.display_name_field_id || ''}
            onValueChange={(val) => handleSelectChange('display_name_field_id', val || null)}
          >
            <SelectTrigger className="clay-select w-full p-3">
              <SelectValue placeholder="בחר שדה לשם תצוגה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>ללא שדה שם תצוגה</SelectItem>
              {stringFieldsInCurrentSchema.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {stringFieldsInCurrentSchema.length === 0 && <p className="text-xs text-gray-500 mt-1">אין שדות מסוג 'טקסט' בסכמה הנוכחית.</p>}
        </div>
      </div>
    </div>
  );
}
