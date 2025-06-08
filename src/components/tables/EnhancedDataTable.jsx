import React, { useState, useEffect, useMemo } from 'react';
import { User } from '@/api/entities';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Plus
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import ViewsManager from './ViewsManager';

const EnhancedDataTable = ({
  data = [],
  columns = [],
  tableType,
  customDataTypeSlug = null,
  onRowClick,
  onRowEdit,
  onRowDelete,
  onCreateNew,
  loading = false,
  enableViews = true,
  enableExport = true,
  enableSearch = true,
  className = ""
}) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });
  const [filters, setFilters] = useState({});
  const [visibleColumns, setVisibleColumns] = useState(columns.map(col => col.field));
  const [selectedRows, setSelectedRows] = useState(new Set());

  useEffect(() => {
    User.me().then(setCurrentUser).catch(console.error);
  }, []);

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchTerm && enableSearch) {
      result = result.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([field, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        result = result.filter(row => {
          const rowValue = row[field];
          if (Array.isArray(value)) {
            return value.includes(rowValue);
          }
          return String(rowValue).toLowerCase().includes(String(value).toLowerCase());
        });
      }
    });

    // Apply sorting
    if (sortConfig.field) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.field];
        const bValue = b[sortConfig.field];
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        const comparison = String(aValue).localeCompare(String(bValue), 'he');
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchTerm, filters, sortConfig, enableSearch]);

  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleViewSelect = (view) => {
    setFilters(view.filters || {});
    setSortConfig(view.sort_config || { field: null, direction: 'asc' });
    if (view.visible_columns) {
      setVisibleColumns(view.visible_columns);
    }
  };

  const handleFiltersChange = (newFilters, newSort) => {
    setFilters(newFilters);
    if (newSort) {
      setSortConfig(newSort);
    }
  };

  const exportToCSV = () => {
    if (processedData.length === 0) {
      alert('אין נתונים לייצוא');
      return;
    }

    const headers = columns.filter(col => visibleColumns.includes(col.field)).map(col => col.title);
    const rows = processedData.map(row =>
      columns
        .filter(col => visibleColumns.includes(col.field))
        .map(col => {
          const value = row[col.field];
          return `"${String(value || '').replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" +
      headers.join(',') + "\n" +
      rows.join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderCellValue = (value, column) => {
    if (value === null || value === undefined) return '-';
    
    if (column.type === 'badge') {
      const badgeConfig = column.badgeConfig?.[value] || { class: 'bg-gray-100 text-gray-800', label: value };
      return <Badge className={badgeConfig.class}>{badgeConfig.label}</Badge>;
    }
    
    if (column.type === 'date') {
      return new Date(value).toLocaleDateString('he-IL');
    }
    
    if (column.type === 'array' && Array.isArray(value)) {
      return value.join(', ');
    }
    
    return String(value);
  };

  return (
    <Card className={`clay-card ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-semibold">
              {tableType === 'CustomDataRecord' && customDataTypeSlug ? 
                `רשומות ${customDataTypeSlug}` : 
                'טבלת נתונים'
              }
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {enableExport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={processedData.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  ייצוא
                </Button>
              )}
              
              {onCreateNew && (
                <Button
                  onClick={onCreateNew}
                  size="sm"
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  הוסף חדש
                </Button>
              )}
            </div>
          </div>

          {/* Views Manager */}
          {enableViews && (
            <ViewsManager
              tableType={tableType}
              customDataTypeSlug={customDataTypeSlug}
              currentFilters={filters}
              currentSort={sortConfig}
              visibleColumns={visibleColumns}
              onViewSelect={handleViewSelect}
              onFiltersChange={handleFiltersChange}
            />
          )}

          {/* Search and filters */}
          <div className="flex gap-4">
            {enableSearch && (
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="חיפוש..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
            )}
            
            {Object.keys(filters).length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-600">
                  {Object.keys(filters).length} פילטרים פעילים
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({})}
                  className="text-blue-600 hover:text-blue-700"
                >
                  נקה הכל
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {columns
                      .filter(col => visibleColumns.includes(col.field))
                      .map(column => (
                        <th
                          key={column.field}
                          className="px-4 py-3 text-right text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                          onClick={() => column.sortable !== false && handleSort(column.field)}
                        >
                          <div className="flex items-center justify-between">
                            <span>{column.title}</span>
                            {sortConfig.field === column.field && (
                              sortConfig.direction === 'asc' ? 
                                <ChevronUp className="w-4 h-4" /> : 
                                <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </th>
                      ))}
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-20">
                      פעולות
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {processedData.map((row, index) => (
                    <tr
                      key={row.id || index}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => onRowClick && onRowClick(row)}
                    >
                      {columns
                        .filter(col => visibleColumns.includes(col.field))
                        .map(column => (
                          <td key={column.field} className="px-4 py-3 text-sm text-gray-900">
                            {renderCellValue(row[column.field], column)}
                          </td>
                        ))}
                      <td className="px-4 py-3 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onRowClick && onRowClick(row)}>
                              <Eye className="w-4 h-4 mr-2" />
                              צפה
                            </DropdownMenuItem>
                            {onRowEdit && (
                              <DropdownMenuItem onClick={() => onRowEdit(row)}>
                                <Edit className="w-4 h-4 mr-2" />
                                ערוך
                              </DropdownMenuItem>
                            )}
                            {onRowDelete && (
                              <DropdownMenuItem 
                                onClick={() => onRowDelete(row)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                מחק
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {processedData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  אין נתונים להצגה
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedDataTable;