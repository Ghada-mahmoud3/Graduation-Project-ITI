import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument, NotificationType, NotificationPriority } from '../schemas/notification.schema';
import { User, UserDocument } from '../schemas/user.schema';

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  relatedEntityId?: string;
  relatedEntityType?: string;
  actionUrl?: string;
  data?: Record<string, any>;
  expiresAt?: Date;
}

@Injectable()
export class NotificationsService {
  private notificationsGateway: any; // Will be injected later to avoid circular dependency

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // Method to set the gateway reference (called from the gateway)
  setGateway(gateway: any) {
    this.notificationsGateway = gateway;
  }

  // Create a new notification
  async createNotification(createNotificationDto: CreateNotificationDto): Promise<NotificationDocument> {
    const notification = new this.notificationModel(createNotificationDto);
    const savedNotification = await notification.save();

    // Send real-time notification if gateway is available
    if (this.notificationsGateway) {
      try {
        await this.notificationsGateway.sendNotificationToUser(createNotificationDto.userId, {
          id: savedNotification._id,
          type: savedNotification.type,
          title: savedNotification.title,
          message: savedNotification.message,
          priority: savedNotification.priority,
          actionUrl: savedNotification.actionUrl,
          data: savedNotification.data,
          createdAt: savedNotification.createdAt,
          isRead: savedNotification.isRead
        });
      } catch (error) {
        console.error('Failed to send real-time notification:', error);
        // Don't fail the notification creation if WebSocket fails
      }
    }

    return savedNotification;
  }

  // Get notifications for a user
  async getUserNotifications(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
      type?: NotificationType;
    } = {}
  ) {
    const { page = 1, limit = 20, unreadOnly = false, type } = options;
    const skip = (page - 1) * limit;

    const query: any = { userId };
    if (unreadOnly) query.isRead = false;
    if (type) query.type = type;

    const [notifications, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(query).exec(),
      this.notificationModel.countDocuments({ userId, isRead: false }).exec()
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    };
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<NotificationDocument | null> {
    return await this.notificationModel.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    ).exec();
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    const result = await this.notificationModel.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    ).exec();
    
    return { modifiedCount: result.modifiedCount };
  }

  // Delete a notification
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.notificationModel.deleteOne({
      _id: notificationId,
      userId
    }).exec();
    
    return result.deletedCount > 0;
  }

  // Get unread count for a user
  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationModel.countDocuments({
      userId,
      isRead: false
    }).exec();
  }

  // Specific notification creators for different events
  async notifyNurseApproved(nurseId: string): Promise<NotificationDocument> {
    return await this.createNotification({
      userId: nurseId,
      type: NotificationType.NURSE_APPROVED,
      title: '🎉 Application Approved!',
      message: 'Congratulations! Your nurse application has been approved. You can now start accepting patient requests.',
      priority: NotificationPriority.HIGH,
      actionUrl: '/dashboard',
      data: { approved: true }
    });
  }

  async notifyNurseRejected(nurseId: string, reason?: string): Promise<NotificationDocument> {
    return await this.createNotification({
      userId: nurseId,
      type: NotificationType.NURSE_REJECTED,
      title: '❌ Application Rejected',
      message: reason 
        ? `Unfortunately, your nurse application has been rejected. Reason: ${reason}`
        : 'Unfortunately, your nurse application has been rejected. Please contact support for more information.',
      priority: NotificationPriority.HIGH,
      actionUrl: '/profile',
      data: { rejected: true, reason }
    });
  }

  async notifyRequestApplication(patientId: string, nurseId: string, nurseName: string, requestId: string, requestTitle: string): Promise<NotificationDocument> {
    return await this.createNotification({
      userId: patientId,
      type: NotificationType.REQUEST_APPLICATION,
      title: '👩‍⚕️ New Application Received',
      message: `${nurseName} has applied to your request "${requestTitle}". Review their application now.`,
      priority: NotificationPriority.MEDIUM,
      relatedEntityId: requestId,
      relatedEntityType: 'request',
      actionUrl: `/requests/${requestId}`,
      data: { nurseId, nurseName, requestTitle }
    });
  }

  async notifyRequestAccepted(nurseId: string, patientName: string, requestId: string, requestTitle: string): Promise<NotificationDocument> {
    return await this.createNotification({
      userId: nurseId,
      type: NotificationType.REQUEST_ACCEPTED,
      title: '✅ Request Accepted',
      message: `Great news! ${patientName} has accepted your application for "${requestTitle}".`,
      priority: NotificationPriority.HIGH,
      relatedEntityId: requestId,
      relatedEntityType: 'request',
      actionUrl: `/requests/${requestId}`,
      data: { patientName, requestTitle }
    });
  }

  async notifyRequestRejected(nurseId: string, patientName: string, requestId: string, requestTitle: string): Promise<NotificationDocument> {
    return await this.createNotification({
      userId: nurseId,
      type: NotificationType.REQUEST_REJECTED,
      title: '❌ Application Declined',
      message: `${patientName} has declined your application for "${requestTitle}".`,
      priority: NotificationPriority.MEDIUM,
      relatedEntityId: requestId,
      relatedEntityType: 'request',
      actionUrl: `/requests`,
      data: { patientName, requestTitle }
    });
  }

  async notifyRequestCompleted(userId: string, requestId: string, requestTitle: string, isPatient: boolean): Promise<NotificationDocument> {
    const role = isPatient ? 'patient' : 'nurse';
    const otherRole = isPatient ? 'nurse' : 'patient';
    
    return await this.createNotification({
      userId,
      type: NotificationType.REQUEST_COMPLETED,
      title: '🎯 Request Completed',
      message: `The request "${requestTitle}" has been marked as completed. You can now leave a review for the ${otherRole}.`,
      priority: NotificationPriority.MEDIUM,
      relatedEntityId: requestId,
      relatedEntityType: 'request',
      actionUrl: `/requests/${requestId}/reviews`,
      data: { requestTitle, role }
    });
  }

  async notifyReviewReceived(userId: string, reviewerName: string, rating: number, requestTitle: string): Promise<NotificationDocument> {
    const stars = '⭐'.repeat(rating);
    
    return await this.createNotification({
      userId,
      type: NotificationType.REVIEW_RECEIVED,
      title: '⭐ New Review Received',
      message: `${reviewerName} left you a ${rating}-star review ${stars} for "${requestTitle}".`,
      priority: NotificationPriority.LOW,
      actionUrl: '/profile',
      data: { reviewerName, rating, requestTitle }
    });
  }

  async notifySystemAnnouncement(userIds: string[], title: string, message: string, actionUrl?: string): Promise<NotificationDocument[]> {
    const notifications = userIds.map(userId => ({
      userId,
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title,
      message,
      priority: NotificationPriority.MEDIUM,
      actionUrl,
      data: { isSystemAnnouncement: true }
    }));

    return await this.notificationModel.insertMany(notifications);
  }

  // Enhanced notification for nurse offers with price and time
  async notifyNurseOffer(patientId: string, nurseId: string, nurseName: string, requestId: string, requestTitle: string, price: number, estimatedTime: number): Promise<NotificationDocument> {
    console.log('🔔 Creating nurse offer notification for patient:', patientId);
    console.log('📋 Notification details:', { nurseName, requestTitle, price, estimatedTime });
    
    const notification = await this.createNotification({
      userId: patientId,
      type: NotificationType.REQUEST_APPLICATION,
      title: '💰 New Offer Received',
      message: `${nurseName} has submitted an offer for "${requestTitle}" - Price: $${price}, Estimated time: ${estimatedTime} hours. Review and manage your request now.`,
      priority: NotificationPriority.HIGH,
      relatedEntityId: requestId,
      relatedEntityType: 'request',
      actionUrl: `/requests/${requestId}`,
      data: { 
        nurseId, 
        nurseName, 
        requestTitle, 
        price, 
        estimatedTime,
        offerType: 'nurse_offer'
      }
    });
    
    console.log('✅ Nurse offer notification created:', notification._id);
    return notification;
  }

  // Notification when patient accepts an offer
  async notifyOfferAccepted(nurseId: string, patientName: string, requestId: string, requestTitle: string, acceptedPrice: number): Promise<NotificationDocument> {
    console.log('🔔 Creating offer accepted notification for nurse:', nurseId);
    const notification = await this.createNotification({
      userId: nurseId,
      type: NotificationType.REQUEST_ACCEPTED,
      title: '🎉 Offer Accepted!',
      message: `Congratulations! ${patientName} has accepted your offer for "${requestTitle}" at $${acceptedPrice}. You can now start providing the service.`,
      priority: NotificationPriority.HIGH,
      relatedEntityId: requestId,
      relatedEntityType: 'request',
      actionUrl: `/requests/${requestId}`,
      data: { 
        patientName, 
        requestTitle, 
        acceptedPrice,
        offerAccepted: true
      }
    });
    console.log('✅ Offer accepted notification created:', notification._id);
    return notification;
  }

  // Notification when nurse updates their offer
  async notifyOfferUpdated(patientId: string, nurseName: string, requestId: string, requestTitle: string, newPrice: number, newEstimatedTime: number): Promise<NotificationDocument> {
    console.log('🔄 Creating offer update notification for patient:', patientId);
    
    const notification = await this.createNotification({
      userId: patientId,
      type: NotificationType.REQUEST_APPLICATION,
      title: '🔄 Offer Updated',
      message: `${nurseName} has updated their offer for "${requestTitle}" - New Price: $${newPrice}, New Estimated time: ${newEstimatedTime} hours. Review the updated offer now.`,
      priority: NotificationPriority.MEDIUM,
      relatedEntityId: requestId,
      relatedEntityType: 'request',
      actionUrl: `/requests/${requestId}`,
      data: { 
        nurseName, 
        requestTitle, 
        newPrice, 
        newEstimatedTime,
        offerType: 'offer_updated'
      }
    });
    
    console.log('✅ Offer update notification created:', notification._id);
    return notification;
  }

  // Notification when nurse cancels their offer
  async notifyOfferCancelled(patientId: string, nurseName: string, requestId: string, requestTitle: string): Promise<NotificationDocument> {
    console.log('🗑️ Creating offer cancellation notification for patient:', patientId);
    
    const notification = await this.createNotification({
      userId: patientId,
      type: NotificationType.REQUEST_APPLICATION,
      title: '🗑️ Offer Cancelled',
      message: `${nurseName} has cancelled their offer for "${requestTitle}". You can still review other offers or wait for new ones.`,
      priority: NotificationPriority.LOW,
      relatedEntityId: requestId,
      relatedEntityType: 'request',
      actionUrl: `/requests/${requestId}`,
      data: { 
        nurseName, 
        requestTitle,
        offerType: 'offer_cancelled'
      }
    });
    
    console.log('✅ Offer cancellation notification created:', notification._id);
    return notification;
  }

  // Notification when request is marked as completed
  async notifyRequestMarkedCompleted(nurseId: string, patientName: string, requestId: string, requestTitle: string): Promise<NotificationDocument> {
    return await this.createNotification({
      userId: nurseId,
      type: NotificationType.REQUEST_COMPLETED,
      title: '✅ Request Completed',
      message: `${patientName} has marked the request "${requestTitle}" as completed. Thank you for your excellent service!`,
      priority: NotificationPriority.MEDIUM,
      relatedEntityId: requestId,
      relatedEntityType: 'request',
      actionUrl: `/requests/${requestId}`,
      data: { 
        patientName, 
        requestTitle,
        completedByPatient: true
      }
    });
  }

  // Notification when request is cancelled
  async notifyRequestCancelled(nurseId: string, patientName: string, requestId: string, requestTitle: string, reason?: string): Promise<NotificationDocument> {
    const reasonText = reason ? ` Reason: ${reason}` : '';
    return await this.createNotification({
      userId: nurseId,
      type: NotificationType.REQUEST_CANCELLED,
      title: '❌ Request Cancelled',
      message: `${patientName} has cancelled the request "${requestTitle}".${reasonText} We apologize for any inconvenience.`,
      priority: NotificationPriority.HIGH,
      relatedEntityId: requestId,
      relatedEntityType: 'request',
      actionUrl: `/requests`,
      data: { 
        patientName, 
        requestTitle, 
        cancellationReason: reason,
        cancelledByPatient: true
      }
    });
  }

  // Admin notification for new patient registration
  async notifyAdminNewPatient(adminIds: string[], patientId: string, patientName: string, patientEmail: string): Promise<NotificationDocument[]> {
    const notifications = adminIds.map(adminId => ({
      userId: adminId,
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title: '👤 New Patient Registered',
      message: `A new patient "${patientName}" (${patientEmail}) has registered on the platform. Review their profile and welcome them to the community.`,
      priority: NotificationPriority.MEDIUM,
      relatedEntityId: patientId,
      relatedEntityType: 'user',
      actionUrl: `/admin/users/${patientId}`,
      data: { 
        patientId, 
        patientName, 
        patientEmail,
        userType: 'patient',
        registrationType: 'new_patient'
      }
    }));

    return await this.notificationModel.insertMany(notifications);
  }

  // Admin notification for new nurse application/registration
  async notifyAdminNewNurse(adminIds: string[], nurseId: string, nurseName: string, nurseEmail: string, licenseNumber?: string): Promise<NotificationDocument[]> {
    const notifications = adminIds.map(adminId => ({
      userId: adminId,
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title: '👩‍⚕️ New Nurse Application',
      message: `A new nurse "${nurseName}" (${nurseEmail}) has applied to join the platform${licenseNumber ? ` with license ${licenseNumber}` : ''}. Please review and approve their application.`,
      priority: NotificationPriority.HIGH,
      relatedEntityId: nurseId,
      relatedEntityType: 'user',
      actionUrl: `/admin/nurses/${nurseId}`,
      data: { 
        nurseId, 
        nurseName, 
        nurseEmail, 
        licenseNumber,
        userType: 'nurse',
        registrationType: 'new_nurse_application',
        requiresApproval: true
      }
    }));

    return await this.notificationModel.insertMany(notifications);
  }

  // Get notification statistics for admin
  async getNotificationStats(): Promise<any> {
    const [
      totalNotifications,
      unreadNotifications,
      notificationsByType,
      notificationsByPriority,
      recentNotifications
    ] = await Promise.all([
      this.notificationModel.countDocuments().exec(),
      this.notificationModel.countDocuments({ isRead: false }).exec(),
      this.notificationModel.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).exec(),
      this.notificationModel.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).exec(),
      this.notificationModel.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'name email role')
        .exec()
    ]);

    return {
      totalNotifications,
      unreadNotifications,
      readRate: totalNotifications > 0 ? ((totalNotifications - unreadNotifications) / totalNotifications * 100).toFixed(2) : 0,
      notificationsByType,
      notificationsByPriority,
      recentNotifications: recentNotifications.map(notification => ({
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        user: notification.userId ? {
          id: (notification.userId as any)._id,
          name: (notification.userId as any).name,
          email: (notification.userId as any).email,
          role: (notification.userId as any).role
        } : null
      }))
    };
  }

  // Get notification preferences for a user
  async getNotificationPreferences(userId: string): Promise<any> {
    // For now, return default preferences
    // In a real implementation, you might store these in a separate collection
    return {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      notificationTypes: {
        [NotificationType.REQUEST_APPLICATION]: true,
        [NotificationType.REQUEST_ACCEPTED]: true,
        [NotificationType.REQUEST_REJECTED]: true,
        [NotificationType.REQUEST_COMPLETED]: true,
        [NotificationType.REQUEST_CANCELLED]: true,
        [NotificationType.NURSE_APPROVED]: true,
        [NotificationType.NURSE_REJECTED]: true,
        [NotificationType.REVIEW_RECEIVED]: true,
        [NotificationType.PAYMENT_RECEIVED]: true,
        [NotificationType.SYSTEM_ANNOUNCEMENT]: true,
        [NotificationType.REMINDER]: true
      }
    };
  }

  // Update notification preferences for a user
  async updateNotificationPreferences(userId: string, preferences: any): Promise<any> {
    // For now, just return the updated preferences
    // In a real implementation, you would store these in a database
    return {
      message: 'Notification preferences updated successfully',
      preferences
    };
  }

  // Clear all notifications for a user
  async clearAllNotifications(userId: string): Promise<{ deletedCount: number }> {
    const result = await this.notificationModel.deleteMany({ userId }).exec();
    return { deletedCount: result.deletedCount };
  }

  // Clean up old notifications (can be called by a cron job)
  async cleanupOldNotifications(daysOld: number = 30): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.notificationModel.deleteMany({
      createdAt: { $lt: cutoffDate },
      isRead: true
    }).exec();

    return { deletedCount: result.deletedCount };
  }
}
