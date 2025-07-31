# Notification System Documentation

## Overview
This notification system provides comprehensive real-time and persistent notifications for the nursing platform. It supports both REST API endpoints and WebSocket connections for real-time updates.

## Features
- ✅ Patient notifications for nurse offers
- ✅ Nurse notifications for offer acceptance/rejection
- ✅ Request completion and cancellation notifications
- ✅ Admin notifications for new registrations
- ✅ Real-time WebSocket support
- ✅ Notification preferences management
- ✅ Comprehensive filtering and pagination
- ✅ Admin analytics and statistics

## Database Schema

### Notification Model
```typescript
{
  userId: ObjectId,           // Recipient user ID
  type: NotificationType,     // Type of notification
  title: string,              // Notification title
  message: string,            // Notification message
  priority: NotificationPriority, // Priority level
  isRead: boolean,            // Read status
  relatedEntityId: ObjectId,  // Related entity (request, user, etc.)
  relatedEntityType: string,  // Type of related entity
  data: Object,               // Additional data
  actionUrl: string,          // Action URL or deep link
  readAt: Date,               // When notification was read
  expiresAt: Date,            // Expiration date (optional)
  createdAt: Date,            // Creation timestamp
  updatedAt: Date             // Update timestamp
}
```

### Notification Types
```typescript
enum NotificationType {
  NURSE_APPROVED = 'nurse_approved',
  NURSE_REJECTED = 'nurse_rejected',
  NURSE_VERIFIED = 'nurse_verified',
  REQUEST_CREATED = 'request_created',
  REQUEST_APPLICATION = 'request_application',
  REQUEST_ACCEPTED = 'request_accepted',
  REQUEST_REJECTED = 'request_rejected',
  REQUEST_COMPLETED = 'request_completed',
  REQUEST_CANCELLED = 'request_cancelled',
  REVIEW_RECEIVED = 'review_received',
  PAYMENT_RECEIVED = 'payment_received',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  REMINDER = 'reminder'
}
```

### Priority Levels
```typescript
enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}
```

## REST API Endpoints

### Get User Notifications
```http
GET /api/notifications
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `unread` (optional): Filter unread only (boolean)
- `type` (optional): Filter by notification type
- `priority` (optional): Filter by priority level

**Response:**
```json
{
  "notifications": [
    {
      "id": "notification_id",
      "type": "request_application",
      "title": "💰 New Offer Received",
      "message": "Sarah has submitted an offer for...",
      "priority": "high",
      "isRead": false,
      "actionUrl": "/requests/123",
      "data": {
        "nurseId": "nurse_id",
        "price": 50,
        "estimatedTime": 2
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  },
  "unreadCount": 12
}
```

### Get Unread Count
```http
GET /api/notifications/unread-count
Authorization: Bearer <token>
```

**Response:**
```json
{
  "unreadCount": 5
}
```

### Mark Notification as Read
```http
PATCH /api/notifications/:id/read
Authorization: Bearer <token>
```

### Mark All Notifications as Read
```http
PATCH /api/notifications/mark-all-read
Authorization: Bearer <token>
```

### Delete Notification
```http
DELETE /api/notifications/:id
Authorization: Bearer <token>
```

### Clear All Notifications
```http
DELETE /api/notifications/clear-all
Authorization: Bearer <token>
```

### Get Notification Preferences
```http
GET /api/notifications/preferences
Authorization: Bearer <token>
```

### Update Notification Preferences
```http
PATCH /api/notifications/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "emailNotifications": true,
  "pushNotifications": true,
  "smsNotifications": false,
  "notificationTypes": {
    "request_application": true,
    "request_accepted": true,
    "request_completed": false
  }
}
```

## Admin Endpoints

### Broadcast Notification
```http
POST /api/notifications/broadcast
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "System Maintenance",
  "message": "The system will be down for maintenance...",
  "userIds": ["user1", "user2"], // Optional, if not provided, broadcasts to all
  "priority": "high",
  "actionUrl": "/maintenance"
}
```

### Get Notification Statistics
```http
GET /api/notifications/admin/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "totalNotifications": 1250,
  "unreadNotifications": 340,
  "readRate": "72.80",
  "notificationsByType": [
    { "_id": "request_application", "count": 450 },
    { "_id": "request_accepted", "count": 320 }
  ],
  "notificationsByPriority": [
    { "_id": "medium", "count": 600 },
    { "_id": "high", "count": 400 }
  ],
  "recentNotifications": [...]
}
```

## WebSocket Integration

### Connection
Connect to the WebSocket server at `/notifications` namespace:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001/notifications', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events

#### Client to Server Events

**Join Room:**
```javascript
socket.emit('join_room', { room: 'request_123' });
```

**Leave Room:**
```javascript
socket.emit('leave_room', { room: 'request_123' });
```

**Mark Notification as Read:**
```javascript
socket.emit('mark_notification_read', { notificationId: 'notification_id' });
```

**Get Notifications:**
```javascript
socket.emit('get_notifications', { 
  page: 1, 
  limit: 20, 
  unreadOnly: false 
});
```

#### Server to Client Events

**New Notification:**
```javascript
socket.on('new_notification', (notification) => {
  console.log('New notification:', notification);
  // Update UI with new notification
});
```

**Unread Count Update:**
```javascript
socket.on('unread_count', (data) => {
  console.log('Unread count:', data.count);
  // Update notification badge
});
```

**Notification Marked as Read:**
```javascript
socket.on('notification_marked_read', (data) => {
  console.log('Notification marked as read:', data.notificationId);
  console.log('New unread count:', data.unreadCount);
});
```

**Notifications List:**
```javascript
socket.on('notifications_list', (notifications) => {
  console.log('Notifications:', notifications);
  // Update notifications list in UI
});
```

**Room Events:**
```javascript
socket.on('joined_room', (data) => {
  console.log('Joined room:', data.room);
});

socket.on('left_room', (data) => {
  console.log('Left room:', data.room);
});
```

**Error Handling:**
```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error.message);
});
```

## Notification Triggers

### Patient Notifications
1. **Nurse Offer Received** - When a nurse submits an offer on a patient's request
2. **Request Status Updates** - When request status changes

### Nurse Notifications
1. **Offer Accepted** - When a patient accepts the nurse's offer
2. **Offer Rejected** - When a patient rejects the nurse's offer
3. **Request Completed** - When a patient marks the request as completed
4. **Request Cancelled** - When a patient cancels the request

### Admin Notifications
1. **New Patient Registration** - When a new patient registers
2. **New Nurse Application** - When a new nurse applies to join the platform

## Integration Examples

### Frontend React Hook
```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export const useNotifications = (token) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (token) {
      const newSocket = io('/notifications', {
        auth: { token }
      });

      newSocket.on('new_notification', (notification) => {
        setNotifications(prev => [notification, ...prev]);
      });

      newSocket.on('unread_count', (data) => {
        setUnreadCount(data.count);
      });

      setSocket(newSocket);

      return () => newSocket.close();
    }
  }, [token]);

  const markAsRead = (notificationId) => {
    if (socket) {
      socket.emit('mark_notification_read', { notificationId });
    }
  };

  return { notifications, unreadCount, markAsRead };
};
```

### Backend Service Integration
```typescript
// In your service
constructor(
  private notificationsService: NotificationsService
) {}

// Send notification when nurse submits offer
await this.notificationsService.notifyNurseOffer(
  patientId,
  nurseId,
  nurseName,
  requestId,
  requestTitle,
  price,
  estimatedTime
);
```

## Error Handling

All notification operations include proper error handling:
- Database errors are logged but don't fail the main operation
- WebSocket errors are caught and logged
- Invalid tokens result in connection rejection
- Missing permissions return appropriate HTTP status codes

## Performance Considerations

- Notifications are indexed by userId and createdAt for fast queries
- TTL index automatically removes expired notifications
- WebSocket connections are managed efficiently
- Pagination prevents large data transfers
- Real-time notifications are sent asynchronously

## Security

- JWT authentication required for all operations
- Users can only access their own notifications
- Admin endpoints require admin role
- WebSocket connections are authenticated
- Input validation on all endpoints