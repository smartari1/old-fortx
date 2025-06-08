import React from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, BarChart3 } from 'lucide-react'; // Assuming BarChart3 is available or replaced
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Ensure all icons used for data_cubes are available and mapped if dynamic
const availableCubeIcons = ["BarChart3", "Users", "Car", "Building", "FileText", "Box", "Shield", "MapPin", "Calendar", "ListChecks", "Settings", "Database", "AlertTriangle"];


export default function DataTypeViewConfigForm({
  currentType,
  handleViewConfigChange,
  addViewConfigListItem,
  updateViewConfigListItem,
  removeViewConfigListItem,
  handleTableColumnDragEnd,
  currentSchemaFieldOptions,
  currentStringSchemaFieldOptions,
  availableIcons // Pass availableIcons for data cube icon selection
}) {

  return (
    <div className="space-y-6">
      <Card className="clay-card bg-purple-50">
        <CardHeader><CardTitle className="text-md text-purple-700">הגדרות חיפוש ומיון</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">שדות לחיפוש</label>
            {currentStringSchemaFieldOptions.length > 0 ? (
              currentStringSchemaFieldOptions.map(opt => (
                <div key={opt.value} className="flex items-center gap-2 mb-1">
                  <Checkbox
                    id={`searchable-${opt.value}`}
                    checked={currentType.view_config?.searchable_fields?.includes(opt.value) || false}
                    onCheckedChange={(checked) => {
                      const currentFields = currentType.view_config?.searchable_fields || [];
                      const newFields = checked
                        ? [...currentFields, opt.value]
                        : currentFields.filter(f => f !== opt.value);
                      handleViewConfigChange('searchable_fields', newFields);
                    }}
                  />
                  <label htmlFor={`searchable-${opt.value}`}>{opt.label}</label>
                </div>
              ))
            ) : <p className="text-xs text-gray-500">הוסף שדות מסוג טקסט לסכמה כדי לאפשר חיפוש.</p>}
            <p className="text-xs text-gray-500 mt-1">אם לא נבחרו שדות, החיפוש יתבצע בכל שדות הטקסט.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">שדה מיון ברירת מחדל</label>
              <Select value={currentType.view_config?.default_sort_field || 'created_date'} onValueChange={(val) => handleViewConfigChange('default_sort_field', val)}>
                <SelectTrigger className="clay-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_date">תאריך יצירה</SelectItem>
                  <SelectItem value="updated_date">תאריך עדכון</SelectItem>
                  {currentSchemaFieldOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">כיוון מיון ברירת מחדל</label>
              <Select value={currentType.view_config?.default_sort_direction || 'desc'} onValueChange={(val) => handleViewConfigChange('default_sort_direction', val)}>
                <SelectTrigger className="clay-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">עולה</SelectItem>
                  <SelectItem value="desc">יורד</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters Management */}
      <Card className="clay-card bg-purple-50">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="text-md text-purple-700">ניהול פילטרים</CardTitle>
          <Button type="button" size="sm" onClick={() => addViewConfigListItem('filters')} className="clay-button bg-purple-100 text-purple-600">
            <Plus className="w-4 h-4 ml-1" /> פילטר חדש
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentType.view_config?.filters?.map((filter, index) => (
            <Card key={filter.id || index} className="clay-card bg-white p-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <Input placeholder="תווית פילטר (יוצג למשתמש)" value={filter.label || ''} onChange={e => updateViewConfigListItem('filters', index, 'label', e.target.value)} className="clay-input" />
                <Select value={filter.field_name || ''} onValueChange={val => updateViewConfigListItem('filters', index, 'field_name', val)}>
                  <SelectTrigger className="clay-select"><SelectValue placeholder="בחר שדה לפילטור..." /></SelectTrigger>
                  <SelectContent>{currentSchemaFieldOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={filter.filter_type || 'search'} onValueChange={val => updateViewConfigListItem('filters', index, 'filter_type', val)}>
                  <SelectTrigger className="clay-select"><SelectValue placeholder="בחר סוג פילטר..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="search">חיפוש טקסט</SelectItem>
                    <SelectItem value="select">בחירה מרשימה</SelectItem>
                    <SelectItem value="boolean">כן/לא</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filter.filter_type === 'select' && (
                <div className="mt-2">
                  <label className="text-xs font-medium">אפשרויות (ערך=תווית, לדוגמא: active=פעיל)</label>
                  <Textarea
                    placeholder="הכנס כל אפשרות בשורה חדשה, בפורמט: value=Label. הערך (value) לא יכול להיות ריק."
                    value={filter.options?.map(opt => `${opt.value}=${opt.label}`).join('\n') || ''}
                    onChange={e => {
                      const optionsArray = e.target.value.split('\n').map(line => {
                        const parts = line.split('=');
                        const value = parts[0]?.trim();
                        const label = parts[1]?.trim() || value;
                        return { value: value || '', label: label || '' };
                      }).filter(opt => opt.value || opt.label);
                      updateViewConfigListItem('filters', index, 'options', optionsArray);
                    }}
                    className="clay-input text-xs mt-1 h-20"
                  />
                  <p className="text-xxs text-gray-500 mt-0.5">הערך (value) של כל אפשרות לא יכול להיות ריק.</p>
                </div>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={() => removeViewConfigListItem('filters', index)} className="text-red-500 hover:text-red-700 mt-2 text-xs">
                <Trash2 className="w-3 h-3 ml-1" /> מחק פילטר
              </Button>
            </Card>
          ))}
          {(currentType.view_config?.filters?.length === 0) && <p className="text-xs text-gray-500 text-center py-2">אין פילטרים מוגדרים.</p>}
        </CardContent>
      </Card>

      {/* Data Cubes Management */}
      <Card className="clay-card bg-purple-50">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="text-md text-purple-700">ניהול קוביות נתונים</CardTitle>
          <Button type="button" size="sm" onClick={() => addViewConfigListItem('data_cubes')} className="clay-button bg-purple-100 text-purple-600">
            <Plus className="w-4 h-4 ml-1" /> קוביה חדשה
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentType.view_config?.data_cubes?.map((cube, index) => (
            <Card key={cube.id || index} className="clay-card bg-white p-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <Input placeholder="כותרת קוביה" value={cube.title || ''} onChange={e => updateViewConfigListItem('data_cubes', index, 'title', e.target.value)} className="clay-input" />
                <Select value={cube.cube_type || 'count'} onValueChange={val => updateViewConfigListItem('data_cubes', index, 'cube_type', val)}>
                  <SelectTrigger className="clay-select"><SelectValue placeholder="בחר סוג קוביה..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count">ספירה כללית</SelectItem>
                    <SelectItem value="count_by_field">ספירה לפי ערך בשדה</SelectItem>
                    <SelectItem value="sum">סכום (לשדות מספריים)</SelectItem>
                    <SelectItem value="average">ממוצע (לשדות מספריים)</SelectItem>
                    <SelectItem value="latest_record">רשומה אחרונה (לפי תאריך יצירה)</SelectItem>
                    <SelectItem value="oldest_record">רשומה ראשונה (לפי תאריך יצירה)</SelectItem>
                  </SelectContent>
                </Select>
                {(cube.cube_type === 'count_by_field' || cube.cube_type === 'sum' || cube.cube_type === 'average') && (
                  <Select value={cube.field_name || ''} onValueChange={val => updateViewConfigListItem('data_cubes', index, 'field_name', val)}>
                    <SelectTrigger className="clay-select"><SelectValue placeholder="בחר שדה רלוונטי..." /></SelectTrigger>
                    <SelectContent>
                      {currentSchemaFieldOptions
                        .filter(opt => (cube.cube_type === 'sum' || cube.cube_type === 'average') ? (opt.type === 'number' || opt.type === 'integer') : true)
                        .map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)
                      }
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <Select value={cube.icon || 'BarChart3'} onValueChange={val => updateViewConfigListItem('data_cubes', index, 'icon', val)}>
                  <SelectTrigger className="clay-select"><SelectValue placeholder="בחר אייקון..." /></SelectTrigger>
                  <SelectContent>{availableCubeIcons.map(iconName => <SelectItem key={iconName} value={iconName}>{iconName}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={cube.color || 'blue'} onValueChange={val => updateViewConfigListItem('data_cubes', index, 'color', val)}>
                  <SelectTrigger className="clay-select"><SelectValue placeholder="בחר צבע..." /></SelectTrigger>
                  <SelectContent>
                    {['blue', 'green', 'red', 'yellow', 'purple', 'orange', 'gray'].map(color => <SelectItem key={color} value={color}>{color}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeViewConfigListItem('data_cubes', index)} className="text-red-500 hover:text-red-700 mt-2 text-xs">
                <Trash2 className="w-3 h-3 ml-1" /> מחק קוביה
              </Button>
            </Card>
          ))}
          {(currentType.view_config?.data_cubes?.length === 0) && <p className="text-xs text-gray-500 text-center py-2">אין קוביות נתונים מוגדרות.</p>}
        </CardContent>
      </Card>

      {/* Table Columns Management */}
      <Card className="clay-card bg-purple-50">
        <CardHeader>
          <CardTitle className="text-md text-purple-700">ניהול עמודות טבלה</CardTitle>
          <CardDescription className="text-xs">סדר את העמודות כפי שיוצגו. אם רשימה זו ריקה, יוצגו 5 השדות הראשונים מהסכמה.</CardDescription>
        </CardHeader>
        <CardContent>
          <DragDropContext onDragEnd={handleTableColumnDragEnd}>
            <Droppable droppableId="tableColumns">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {currentType.view_config?.table_columns?.map((col, index) => (
                    <Draggable key={col.id || col.field_name || `col-${index}`} draggableId={col.id || col.field_name || `col-${index}`} index={index}>
                      {(providedDraggable) => (
                        <Card
                          ref={providedDraggable.innerRef}
                          {...providedDraggable.draggableProps}
                          className="clay-card bg-white p-3"
                        >
                          <div className="flex items-center gap-2">
                            <div {...providedDraggable.dragHandleProps} className="cursor-grab p-1">
                              <GripVertical className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                              <Select value={col.field_name || ''} onValueChange={val => updateViewConfigListItem('table_columns', index, 'field_name', val)}>
                                <SelectTrigger className="clay-select text-xs"><SelectValue placeholder="בחר שדה..." /></SelectTrigger>
                                <SelectContent>{currentSchemaFieldOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                              </Select>
                              <Input placeholder="תווית עמודה (אופציונלי)" value={col.label || ''} onChange={e => updateViewConfigListItem('table_columns', index, 'label', e.target.value)} className="clay-input text-xs" />
                              <Input placeholder="רוחב (למשל: 150px, 20%)" value={col.width || ''} onChange={e => updateViewConfigListItem('table_columns', index, 'width', e.target.value)} className="clay-input text-xs" />
                            </div>
                            <div className="flex flex-col gap-1 ml-2">
                              <label className="flex items-center gap-1 text-xs">
                                <Checkbox checked={col.sortable} onCheckedChange={val => updateViewConfigListItem('table_columns', index, 'sortable', val)} className="h-3 w-3 ml-1" /> ניתן למיון
                              </label>
                              <label className="flex items-center gap-1 text-xs">
                                <Checkbox checked={col.visible} onCheckedChange={val => updateViewConfigListItem('table_columns', index, 'visible', val)} className="h-3 w-3 ml-1" /> גלוי
                              </label>
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeViewConfigListItem('table_columns', index)} className="text-red-500 hover:text-red-700 w-6 h-6">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          <Button type="button" size="sm" onClick={() => addViewConfigListItem('table_columns')} className="clay-button bg-purple-100 text-purple-600 mt-3">
            <Plus className="w-4 h-4 ml-1" /> הוסף עמודה
          </Button>
          {(currentType.view_config?.table_columns?.length === 0) && <p className="text-xs text-gray-500 text-center py-2 mt-2">אם לא יוגדרו עמודות, יוצגו 5 השדות הראשונים אוטומטית.</p>}
        </CardContent>
      </Card>
    </div>
  );
}