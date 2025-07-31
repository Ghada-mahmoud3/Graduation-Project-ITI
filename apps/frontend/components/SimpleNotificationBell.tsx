import React, { useState } from 'react';
import { useAuth } from '../lib/auth';

const SimpleNotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount] = useState(3); // Mock data for testing

  console.log('SimpleNotificationBell rendered for user:', user?.name);

  if (!user) {
    console.log('No user, not showing notification bell');
    return null;
  }

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => {
          console.log('Notification bell clicked');
          setIsOpen(!isOpen);
        }}
        className="relative p-2 text-white hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 rounded-full transition duration-300"
        title="Notifications"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Simple Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          </div>
          <div className="p-4">
            <div className="text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <p>Notification system is working!</p>
              <p className="text-sm mt-2">User: {user.name}</p>
              <p className="text-sm">Role: {user.role}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleNotificationBell;