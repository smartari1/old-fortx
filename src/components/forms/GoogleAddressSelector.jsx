import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Search, Loader2, X, Navigation } from 'lucide-react';
import { InvokeLLM } from '@/api/integrations';

const GoogleAddressSelector = ({ 
  value, 
  onChange, 
  placeholder = "חפש כתובת...", 
  className = "",
  label,
  required = false,
  disabled = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  
  const searchTimeoutRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize with existing value
  useEffect(() => {
    if (value && value.formatted_address) {
      setSearchTerm(value.formatted_address);
      setSelectedAddress(value);
    } else if (value === null || value === undefined) {
      // Reset state when value is cleared
      setSearchTerm('');
      setSelectedAddress(null);
    }
  }, [value]);

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search for addresses using Google Geocoding via AI integration
  const searchAddresses = async (query) => {
    if (!query.trim() || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const searchPrompt = `
חפש כתובות בישראל המתאימות לחיפוש: "${query}"

החזר רשימה של עד 5 כתובות רלוונטיות בפורמט JSON הבא:
{
  "addresses": [
    {
      "formatted_address": "כתובת מלאה כולל עיר ומיקוד",
      "street_name": "שם הרחוב",
      "house_number": "מספר בית",
      "city": "שם העיר",
      "postal_code": "מיקוד (אם זמין)",
      "latitude": קו רוחב,
      "longitude": קו אורך,
      "place_type": "סוג המקום (residential/commercial/landmark וכו')"
    }
  ]
}

חשוב:
- חפש רק בישראל
- תן עדיפות לכתובות מדויקות
- כלול קואורדינטות מדויקות
- אם החיפוש כולל שם עיר, תן עדיפות לכתובות באותה עיר
- החזר תוצאות גם אם החיפוש חלקי (למשל רק שם רחוב)
`;

      const response = await InvokeLLM({
        prompt: searchPrompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            addresses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  formatted_address: { type: "string" },
                  street_name: { type: "string" },
                  house_number: { type: "string" },
                  city: { type: "string" },
                  postal_code: { type: "string" },
                  latitude: { type: "number" },
                  longitude: { type: "number" },
                  place_type: { type: "string" }
                },
                required: ["formatted_address", "latitude", "longitude"]
              }
            }
          },
          required: ["addresses"]
        }
      });

      if (response && response.addresses && Array.isArray(response.addresses)) {
        setSuggestions(response.addresses);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error searching addresses:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle search input change with debouncing
  const handleSearchChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    
    // If input is cleared, clear selection
    if (!newValue.trim()) {
      setSelectedAddress(null);
      if (onChange) {
        onChange(null);
      }
    }
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      searchAddresses(newValue);
    }, 500);
  };

  // Handle address selection
  const handleAddressSelect = (address) => {
    // Validate that address has required fields
    if (!address || typeof address.latitude !== 'number' || typeof address.longitude !== 'number') {
      console.warn('Invalid address selected:', address);
      return;
    }

    setSelectedAddress(address);
    setSearchTerm(address.formatted_address || '');
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Call onChange with the selected address
    if (onChange) {
      onChange(address);
    }
  };

  // Clear selection
  const handleClear = () => {
    setSelectedAddress(null);
    setSearchTerm('');
    setShowSuggestions(false);
    setSuggestions([]);
    
    if (onChange) {
      onChange(null);
    }
  };

  // Get current location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('הדפדפן שלך לא תומך במיקום גיאוגרפי');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Try to reverse geocode the current location
          const reverseGeocodePrompt = `
המר את הקואורדינטות הבאות לכתובת:
קו רוחב: ${latitude}
קו אורך: ${longitude}

החזר כתובת בישראל בפורמט JSON:
{
  "formatted_address": "כתובת מלאה",
  "street_name": "שם רחוב",
  "house_number": "מספר בית",
  "city": "עיר",
  "postal_code": "מיקוד",
  "latitude": ${latitude},
  "longitude": ${longitude},
  "place_type": "current_location"
}
`;

          const response = await InvokeLLM({
            prompt: reverseGeocodePrompt,
            add_context_from_internet: true,
            response_json_schema: {
              type: "object",
              properties: {
                formatted_address: { type: "string" },
                street_name: { type: "string" },
                house_number: { type: "string" },
                city: { type: "string" },
                postal_code: { type: "string" },
                latitude: { type: "number" },
                longitude: { type: "number" },
                place_type: { type: "string" }
              },
              required: ["formatted_address", "latitude", "longitude"]
            }
          });

          if (response && response.formatted_address) {
            handleAddressSelect(response);
          } else {
            // Fallback if reverse geocoding fails
            const fallbackAddress = {
              formatted_address: `קואורדינטות: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
              latitude,
              longitude,
              place_type: "current_location"
            };
            handleAddressSelect(fallbackAddress);
          }
        } catch (error) {
          console.error('Error reverse geocoding:', error);
          // Fallback address
          const fallbackAddress = {
            formatted_address: `המיקום הנוכחי: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            latitude,
            longitude,
            place_type: "current_location"
          };
          handleAddressSelect(fallbackAddress);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error getting current location:', error);
        alert('לא ניתן לקבל את המיקום הנוכחי');
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium mb-1">
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder={placeholder}
              className="clay-input pr-10"
              disabled={disabled}
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              ) : (
                <Search className="w-4 h-4 text-gray-400" />
              )}
            </div>
            {selectedAddress && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={disabled}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGetCurrentLocation}
            disabled={loading || disabled}
            className="clay-button flex-shrink-0"
            title="השתמש במיקום הנוכחי"
          >
            <Navigation className="w-4 h-4" />
          </Button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto">
            <CardContent className="p-0">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  className="w-full text-right p-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                  onClick={() => handleAddressSelect(suggestion)}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {suggestion.formatted_address}
                      </div>
                      {suggestion.place_type && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {suggestion.place_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Selected address display */}
      {selectedAddress && selectedAddress.latitude && selectedAddress.longitude && (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-green-800">
                {selectedAddress.formatted_address}
              </div>
              <div className="text-xs text-green-600 mt-1 font-mono">
                {selectedAddress.latitude.toFixed(6)}, {selectedAddress.longitude.toFixed(6)}
              </div>
              {selectedAddress.place_type && (
                <Badge variant="outline" className="text-xs mt-1 bg-green-100 text-green-700">
                  {selectedAddress.place_type}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleAddressSelector;