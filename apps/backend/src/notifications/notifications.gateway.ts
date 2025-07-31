import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';
import { UserRole } from '../schemas/user.schema';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: UserRole;
  userName?: string;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, AuthenticatedSocket>();

  constructor(
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
  ) {
    // Set this gateway in the service to avoid circular dependency
    this.notificationsService.setGateway(this);
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake auth
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        console.log('WebSocket connection rejected: No token provided');
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.userRole = payload.role;
      client.userName = payload.name || 'User';

      // Store the connection
      this.connectedUsers.set(client.userId, client);

      // Join user to their personal room
      client.join(`user_${client.userId}`);

      // Join role-based rooms
      if (client.userRole === UserRole.ADMIN) {
        client.join('admins');
      } else if (client.userRole === UserRole.NURSE) {
        client.join('nurses');
      } else if (client.userRole === UserRole.PATIENT) {
        client.join('patients');
      }

      console.log(`User ${client.userId} (${client.userRole}) connected to notifications`);

      // Send initial unread count
      try {
        const unreadCount = await this.notificationsService.getUnreadCount(client.userId);
        client.emit('unread_count', { count: unreadCount });
      } catch (error) {
        console.error('Failed to send initial unread count:', error);
      }

    } catch (error) {
      console.log('WebSocket authentication failed:', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      console.log(`User ${client.userId} disconnected from notifications`);
    }
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { room: string }) {
    // Allow users to join specific rooms (e.g., for specific requests)
    if (client.userId) {
      client.join(data.room);
      client.emit('joined_room', { room: data.room });
    }
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { room: string }) {
    if (client.userId) {
      client.leave(data.room);
      client.emit('left_room', { room: data.room });
    }
  }

  @SubscribeMessage('mark_notification_read')
  async handleMarkNotificationRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string }
  ) {
    if (!client.userId) return;

    try {
      await this.notificationsService.markAsRead(data.notificationId, client.userId);
      const unreadCount = await this.notificationsService.getUnreadCount(client.userId);
      
      client.emit('notification_marked_read', { 
        notificationId: data.notificationId,
        unreadCount 
      });
    } catch (error) {
      client.emit('error', { message: 'Failed to mark notification as read' });
    }
  }

  @SubscribeMessage('get_notifications')
  async handleGetNotifications(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { page?: number; limit?: number; unreadOnly?: boolean }
  ) {
    if (!client.userId) return;

    try {
      const notifications = await this.notificationsService.getUserNotifications(
        client.userId,
        {
          page: data.page || 1,
          limit: data.limit || 20,
          unreadOnly: data.unreadOnly || false
        }
      );
      
      client.emit('notifications_list', notifications);
    } catch (error) {
      client.emit('error', { message: 'Failed to fetch notifications' });
    }
  }

  // Method to send real-time notification to a specific user
  async sendNotificationToUser(userId: string, notification: any) {
    const userSocket = this.connectedUsers.get(userId);
    if (userSocket) {
      userSocket.emit('new_notification', notification);
      
      // Update unread count
      try {
        const unreadCount = await this.notificationsService.getUnreadCount(userId);
        userSocket.emit('unread_count', { count: unreadCount });
      } catch (error) {
        console.error('Failed to update unread count:', error);
      }
    }
  }

  // Method to send notification to multiple users
  async sendNotificationToUsers(userIds: string[], notification: any) {
    for (const userId of userIds) {
      await this.sendNotificationToUser(userId, notification);
    }
  }

  // Method to broadcast to all users of a specific role
  async broadcastToRole(role: UserRole, notification: any) {
    let room: string;
    switch (role) {
      case UserRole.ADMIN:
        room = 'admins';
        break;
      case UserRole.NURSE:
        room = 'nurses';
        break;
      case UserRole.PATIENT:
        room = 'patients';
        break;
      default:
        return;
    }

    this.server.to(room).emit('new_notification', notification);
  }

  // Method to broadcast to all connected users
  async broadcastToAll(notification: any) {
    this.server.emit('new_notification', notification);
  }

  // Method to send notification to a specific room (e.g., request-specific)
  async sendNotificationToRoom(room: string, notification: any) {
    this.server.to(room).emit('new_notification', notification);
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Get connected users by role
  getConnectedUsersByRole(role: UserRole): AuthenticatedSocket[] {
    return Array.from(this.connectedUsers.values()).filter(socket => socket.userRole === role);
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}