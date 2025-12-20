import React, { useState, useEffect } from 'react';
import { getDhakaDate } from './utils/timezoneUtils';
import { Clock, Calendar } from 'lucide-react';

export default function DhakaClock() {
  const [time, setTime] = useState(getDhakaDate());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getDhakaDate());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => {
    const hours = date.getUTCHours();
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    
    // Convert to 12-hour format
    const displayHours = hours % 12 || 12;
    const ampm = hours < 12 ? 'AM' : 'PM';
    
    return `${displayHours}:${minutes}:${seconds} ${ampm}`;
  };

  const formatDate = (date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDayName = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getUTCDay()];
  };

  return (
    <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-lg p-4 text-slate-100 shadow-lg w-full">
      <div className="flex items-center gap-4">
        {/* Time Section */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={20} className="text-slate-300" />
            <span className="text-sm font-semibold opacity-90 text-slate-300">Dhaka Time (UTC+6)</span>
          </div>
          <div className="text-3xl font-mono font-bold text-white">{formatTime(time)}</div>
        </div>

        {/* Divider */}
        <div className="w-px h-16 bg-slate-400 opacity-30"></div>

        {/* Date Section */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={20} className="text-slate-300" />
            <span className="text-sm font-semibold opacity-90 text-slate-300">Today</span>
          </div>
          <div className="text-2xl font-mono font-bold text-white">{formatDate(time)}</div>
          <div className="text-sm mt-1 opacity-90 text-slate-300">{getDayName(time)}</div>
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-3 pt-3 border-t border-slate-400 border-opacity-20 text-xs opacity-75 text-slate-300">
        System Reference Time - All timestamps synchronized to this clock
      </div>
    </div>
  );
}
