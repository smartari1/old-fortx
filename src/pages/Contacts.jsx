
import React from 'react';
import { Contact, UserPlus } from 'lucide-react'; // Changed icon to UserPlus for "Add Contact"

export default function ContactsPage() {
  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <Contact className="w-8 h-8 ml-3 text-orange-500" />
          ניהול אנשי קשר
        </h1>
        <p className="text-gray-600">איסוף וניהול של פרטי אנשי קשר רלוונטיים.</p>
      </div>

       <div className="clay-card bg-white bg-opacity-80 p-6 mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">רשימת אנשי קשר</h2>
          <button className="clay-button flex items-center gap-2 bg-orange-100 text-orange-700 font-medium">
            <UserPlus className="w-4 h-4" />
            איש קשר חדש
          </button>
        </div>
      </div>

      <div className="clay-card bg-white bg-opacity-80 p-10 text-center">
        <Contact className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-xl font-semibold text-gray-700">תוכן יתווסף בקרוב</h3>
        <p className="text-gray-500">כאן יוצג מאגר אנשי הקשר והלוגים הקשורים אליהם.</p>
      </div>
    </div>
  );
}
