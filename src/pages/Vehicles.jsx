
import React from 'react';
import { Car, PlusCircle } from 'lucide-react';

export default function VehiclesPage() {
  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <Car className="w-8 h-8 ml-3 text-sky-500" />
          ניהול רכבים
        </h1>
        <p className="text-gray-600">מעקב אחר פרטי רכבים, סטטוס וקישור לדוחות.</p>
      </div>

      <div className="clay-card bg-white bg-opacity-80 p-6 mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">רשימת רכבים</h2>
          <button className="clay-button flex items-center gap-2 bg-sky-100 text-sky-700 font-medium">
            <PlusCircle className="w-4 h-4" />
            רכב חדש
          </button>
        </div>
      </div>

      <div className="clay-card bg-white bg-opacity-80 p-10 text-center">
        <Car className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-xl font-semibold text-gray-700">תוכן יתווסף בקרוב</h3>
        <p className="text-gray-500">כאן יוצג מאגר הרכבים ומידע רלוונטי.</p>
      </div>
    </div>
  );
}
