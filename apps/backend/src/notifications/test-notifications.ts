import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import { NotificationsService } from './notifications.service';
import { NotificationType, NotificationPriority } from '../schemas/notification.schema';

async function testNotifications() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const notificationsService = app.get(NotificationsService);

  console.log('🧪 Testing Notification System...\n');

  try {
    // Test 1: Create a basic notification
    console.log('📝 Test 1: Creating a basic notification...');
    const notification1 = await notificationsService.createNotification({
      userId: '507f1f77bcf86cd799439011', // Replace with actual user ID
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title: 'Test Notification',
      message: 'This is a test notification to verify the system works.',
      priority: NotificationPriority.MEDIUM,
      actionUrl: '/test'
    });
    console.log('✅ Basic notification created:', notification1._id);

    // Test 2: Create a nurse offer notification
    console.log('\n📝 Test 2: Creating a nurse offer notification...');
    const notification2 = await notificationsService.notifyNurseOffer(
      '507f1f77bcf86cd799439011', // Patient ID
      '507f1f77bcf86cd799439012', // Nurse ID
      'Sarah Johnson',
      '507f1f77bcf86cd799439013', // Request ID
      'Home Care Service',
      75, // Price
      3   // Estimated time
    );
    console.log('✅ Nurse offer notification created:', notification2._id);

    // Test 3: Get user notifications
    console.log('\n📝 Test 3: Retrieving user notifications...');
    const userNotifications = await notificationsService.getUserNotifications(
      '507f1f77bcf86cd799439011',
      { page: 1, limit: 10 }
    );
    console.log('✅ Retrieved notifications:', userNotifications.notifications.length);
    console.log('📊 Unread count:', userNotifications.unreadCount);

    // Test 4: Mark notification as read
    console.log('\n📝 Test 4: Marking notification as read...');
    const readNotification = await notificationsService.markAsRead(
      notification1._id.toString(),
      '507f1f77bcf86cd799439011'
    );
    console.log('✅ Notification marked as read:', readNotification?.isRead);

    // Test 5: Get unread count
    console.log('\n📝 Test 5: Getting unread count...');
    const unreadCount = await notificationsService.getUnreadCount('507f1f77bcf86cd799439011');
    console.log('✅ Unread count:', unreadCount);

    // Test 6: Test admin notifications
    console.log('\n📝 Test 6: Creating admin notifications...');
    const adminNotifications = await notificationsService.notifyAdminNewPatient(
      ['507f1f77bcf86cd799439014'], // Admin IDs
      '507f1f77bcf86cd799439015',   // Patient ID
      'John Doe',
      'john.doe@example.com'
    );
    console.log('✅ Admin notifications created:', adminNotifications.length);

    // Test 7: Get notification statistics
    console.log('\n📝 Test 7: Getting notification statistics...');
    const stats = await notificationsService.getNotificationStats();
    console.log('✅ Notification statistics:');
    console.log('   Total notifications:', stats.totalNotifications);
    console.log('   Unread notifications:', stats.unreadNotifications);
    console.log('   Read rate:', stats.readRate + '%');

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await app.close();
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testNotifications().catch(console.error);
}

export { testNotifications };