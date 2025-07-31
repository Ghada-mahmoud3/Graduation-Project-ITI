import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/auth';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
  readAt?: string;
  data?: any;
}

interface NotificationResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Debug logging
  console.log('useNotifications hook:', { user: !!user, unreadCount, notificationsCount: notifications.length });

  // Fetch notifications via REST API
  const fetchNotifications = useCallback(async (options: { page?: number; limit?: number; unreadOnly?: boolean } = {}) => {
    if (!user) return;
    
    console.log('📡 Fetching notifications for user:', user.name);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.unreadOnly) params.append('unread', 'true');

      const response = await fetch(`/api/notifications?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: NotificationResponse = await response.json();
        console.log('✅ Notifications loaded:', data.notifications?.length || 0, 'unread:', data.unreadCount || 0);
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } else {
        console.error('❌ Failed to load notifications:', response.status, response.statusText);
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/notifications/unread-count', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  }, [user]);

  // Load initial data when user changes
  useEffect(() => {
    if (user) {
      loadUnreadCount();
      fetchNotifications({ limit: 10 });
      
      // Set up polling for new notifications every 10 seconds
      const interval = setInterval(() => {
        console.log('🔄 Polling for new notifications...');
        loadUnreadCount();
        fetchNotifications({ limit: 10 });
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [user, loadUnreadCount, fetchNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId
              ? { ...notif, isRead: true, readAt: new Date().toISOString() }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [user]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, isRead: true, readAt: new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [user]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        // Update unread count if the deleted notification was unread
        const deletedNotification = notifications.find(notif => notif.id === notificationId);
        if (deletedNotification && !deletedNotification.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }, [user, notifications]);

  // Get notifications (alias for fetchNotifications)
  const getNotifications = useCallback((options: { page?: number; limit?: number; unreadOnly?: boolean } = {}) => {
    fetchNotifications(options);
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    loadUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotifications
  };
};