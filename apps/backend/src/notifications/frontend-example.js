// Frontend Integration Example for Notification System
// This file shows how to integrate the notification system in a React frontend

// 1. Install required dependencies:
// npm install socket.io-client axios

// 2. Notification Hook (useNotifications.js)
import { useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

export const useNotifications = (token) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(false);

  // Initialize WebSocket connection
  useEffect(() => {
    if (token) {
      const newSocket = io(`${process.env.REACT_APP_API_URL}/notifications`, {
        auth: { token }
      });

      // Handle connection events
      newSocket.on('connect', () => {
        console.log('Connected to notifications');
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from notifications');
      });

      // Handle notification events
      newSocket.on('new_notification', (notification) => {
        setNotifications(prev => [notification, ...prev]);
        // Show toast notification
        showToast(notification);
      });

      newSocket.on('unread_count', (data) => {
        setUnreadCount(data.count);
      });

      newSocket.on('notification_marked_read', (data) => {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === data.notificationId 
              ? { ...notif, isRead: true }
              : notif
          )
        );
        setUnreadCount(data.unreadCount);
      });

      newSocket.on('notifications_list', (data) => {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [token]);

  // Fetch notifications via REST API
  const fetchNotifications = useCallback(async (options = {}) => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
        params: options
      });
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId) => {
    if (socket) {
      socket.emit('mark_notification_read', { notificationId });
    }
  }, [socket]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    
    try {
      await axios.patch('/api/notifications/mark-all-read', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, [token]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    if (!token) return;
    
    try {
      await axios.delete(`/api/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }, [token]);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };
};

// Helper function to show toast notifications
const showToast = (notification) => {
  // You can use any toast library like react-toastify
  console.log('New notification:', notification.title);
  
  // Example with react-toastify:
  // toast(notification.message, {
  //   type: notification.priority === 'high' ? 'warning' : 'info'
  // });
};

// 3. Notification Component (NotificationList.jsx)
import React from 'react';
import { useNotifications } from './useNotifications';

const NotificationList = ({ token }) => {
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications(token);

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'request_application': return '💰';
      case 'request_accepted': return '✅';
      case 'request_rejected': return '❌';
      case 'request_completed': return '🎯';
      case 'request_cancelled': return '🚫';
      case 'nurse_approved': return '🎉';
      case 'nurse_rejected': return '❌';
      case 'system_announcement': return '📢';
      default: return '📬';
    }
  };

  if (loading) {
    return <div className="p-4">Loading notifications...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">
          Notifications {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-sm px-2 py-1 rounded-full ml-2">
              {unreadCount}
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Mark All Read
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No notifications yet
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 border rounded-lg ${
                notification.isRead ? 'bg-gray-50' : 'bg-white border-blue-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-2">
                      {getTypeIcon(notification.type)}
                    </span>
                    <h3 className="font-semibold text-lg">
                      {notification.title}
                    </h3>
                    <span className={`ml-2 text-sm ${getPriorityColor(notification.priority)}`}>
                      {notification.priority}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-2">
                    {notification.message}
                  </p>
                  <div className="flex items-center text-sm text-gray-500">
                    <span>
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                    {notification.actionUrl && (
                      <a
                        href={notification.actionUrl}
                        className="ml-4 text-blue-500 hover:underline"
                      >
                        View Details →
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex flex-col space-y-2 ml-4">
                  {!notification.isRead && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="text-blue-500 hover:text-blue-700 text-sm"
                    >
                      Mark Read
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// 4. Notification Badge Component (NotificationBadge.jsx)
const NotificationBadge = ({ token }) => {
  const { unreadCount } = useNotifications(token);

  return (
    <div className="relative">
      <button className="p-2 text-gray-600 hover:text-gray-800">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M15 17h5l-5 5v-5zM11 19H6.414a1 1 0 01-.707-.293L4 17V6a2 2 0 012-2h12a2 2 0 012 2v5" />
        </svg>
      </button>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </div>
  );
};

// 5. Usage in App.jsx
const App = () => {
  const [token, setToken] = useState(localStorage.getItem('token'));

  return (
    <div className="App">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-semibold">Nursing Platform</h1>
            <NotificationBadge token={token} />
          </div>
        </div>
      </header>
      
      <main>
        <NotificationList token={token} />
      </main>
    </div>
  );
};

// 6. API Service Example (notificationService.js)
class NotificationService {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async getNotifications(options = {}) {
    const params = new URLSearchParams(options);
    const response = await fetch(`${this.baseURL}/api/notifications?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  }

  async markAsRead(notificationId) {
    const response = await fetch(`${this.baseURL}/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  }

  async updatePreferences(preferences) {
    const response = await fetch(`${this.baseURL}/api/notifications/preferences`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferences)
    });
    return response.json();
  }
}

export { NotificationList, NotificationBadge, NotificationService };