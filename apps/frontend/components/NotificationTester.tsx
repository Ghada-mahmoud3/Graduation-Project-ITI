import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useNotifications } from '../hooks/useNotifications';

const NotificationTester: React.FC = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, fetchNotifications, loadUnreadCount } = useNotifications();
  const [isVisible, setIsVisible] = useState(false);

  if (!user) return null;

  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    loadUnreadCount();
    fetchNotifications({ limit: 10 });
  };

  const handleTestNotification = async () => {
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Test Notification',
          message: 'This is a test notification to verify the system works',
          type: 'test'
        })
      });

      if (response.ok) {
        console.log('✅ Test notification created');
        setTimeout(handleRefresh, 1000);
      } else {
        console.error('❌ Failed to create test notification');
      }
    } catch (error) {
      console.error('❌ Error creating test notification:', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="Notification Tester"
      >
        🧪
      </button>

      {/* Tester Panel */}
      {isVisible && (
        <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">🧪 Notification Tester</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* User Info */}
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">
              <strong>User:</strong> {user.name} ({user.role})
            </p>
            <p className="text-sm text-gray-600">
              <strong>Unread:</strong> {unreadCount}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Total:</strong> {notifications.length}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={handleRefresh}
              className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors"
            >
              🔄 Refresh Notifications
            </button>

            <button
              onClick={handleTestNotification}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 transition-colors"
            >
              ✨ Create Test Notification
            </button>
          </div>

          {/* Recent Notifications */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Notifications:</h4>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {notifications.slice(0, 3).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-2 rounded text-xs ${
                    notification.isRead ? 'bg-gray-100' : 'bg-blue-50 border-l-2 border-blue-500'
                  }`}
                >
                  <div className="font-medium">{notification.title}</div>
                  <div className="text-gray-600 truncate">{notification.message}</div>
                  <div className="text-gray-400 text-xs mt-1">
                    {new Date(notification.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="text-gray-500 text-center py-4">
                  No notifications yet
                </div>
              )}
            </div>
          </div>

          {/* Debug Info */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                Debug Info
              </summary>
              <div className="mt-2 p-2 bg-gray-100 rounded font-mono text-xs">
                <div>API URL: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}</div>
                <div>Token: {localStorage.getItem('token') ? '✅ Present' : '❌ Missing'}</div>
                <div>Polling: Every 10 seconds</div>
                <div>Last Update: {new Date().toLocaleTimeString()}</div>
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationTester;