# 🔔 نظام الإشعارات - دليل شامل

## نظرة عامة

تم تطوير نظام إشعارات شامل للمنصة يدعم الإشعارات الفورية والمخزنة مع واجهة مستخدم تفاعلية.

## ✨ المميزات المطبقة

### 🎯 إشعارات المرضى
- ✅ إشعار عند تقديم ممرضة عرض على الطلب
- ✅ عرض اسم الممرضة والسعر والوقت المقدر
- ✅ رابط لعرض وإدارة الطلب

### 👩‍⚕️ إشعارات الممرضات
- ✅ إشعار عند قبول المريض للعرض
- ✅ إشعار عند اكتمال الطلب
- ✅ إشعار عند إلغاء الطلب

### 👑 إشعارات المدراء
- ✅ إشعار عند تسجيل مريض جديد
- ✅ إشعار عند تقديم ممرضة طلب انضمام

### 🔧 مميزات تقنية
- ✅ WebSocket للإشعارات الفورية
- ✅ REST API شامل
- ✅ قاعدة بيانات MongoDB
- ✅ واجهة مستخدم تفاعلية
- ✅ إشعارات المتصفح
- ✅ إحصائيات وتحليلات

## 🏗️ البنية التقنية

### Backend (NestJS)
```
apps/backend/src/
├── notifications/
│   ├── notifications.controller.ts    # REST API endpoints
│   ├── notifications.service.ts       # Business logic
│   ├── notifications.gateway.ts       # WebSocket gateway
│   ├── notifications.module.ts        # Module configuration
│   └── README.md                      # Technical documentation
├── schemas/
│   └── notification.schema.ts         # Database schema
└── dto/
    └── notification.dto.ts            # Data transfer objects
```

### Frontend (Next.js + React)
```
apps/frontend/
├── components/
│   └── NotificationBell.tsx          # Notification bell component
├── hooks/
│   └── useNotifications.ts           # Custom hook for notifications
├── pages/
│   └── notifications.tsx             # Full notifications page
└── .env.local                        # Environment configuration
```

## 🚀 كيفية الاستخدام

### 1. تشغيل النظام

```bash
# تشغيل الخادم الخلفي
cd apps/backend
npm run dev

# تشغيل الواجهة الأمامية (في terminal آخر)
cd apps/frontend
npm run dev
```

### 2. الوصول للنظام

- الواجهة الأمامية: http://localhost:3000
- API الخلفي: http://localhost:3001
- WebSocket: ws://localhost:3001/notifications

### 3. اختبار النظام

```bash
# تشغيل اختبارات النظام
node test-notifications-system.js
```

## 🎨 واجهة المستخدم

### أيقونة الجرس في الـ Navbar
- 🔔 أيقونة جرس بيضاء في الـ navbar
- 🔴 رقم أحمر يظهر عدد الإشعارات غير المقروءة
- 📱 قائمة منسدلة تظهر آخر 10 إشعارات
- ⚡ تحديث فوري عبر WebSocket

### صفحة الإشعارات الكاملة
- 📋 عرض جميع الإشعارات مع التصفح
- 🔍 فلترة (الكل / غير المقروءة)
- ✅ تحديد متعدد وإجراءات جماعية
- 🗑️ حذف الإشعارات
- 📊 إحصائيات مفصلة

## 📡 API Endpoints

### إشعارات المستخدم
```http
GET    /api/notifications              # جلب الإشعارات
GET    /api/notifications/unread-count # عدد غير المقروءة
PATCH  /api/notifications/:id/read     # تحديد كمقروءة
PATCH  /api/notifications/mark-all-read # تحديد الكل كمقروءة
DELETE /api/notifications/:id          # حذف إشعار
DELETE /api/notifications/clear-all    # حذف الكل
```

### تفضيلات الإشعارات
```http
GET    /api/notifications/preferences  # جلب التفضيلات
PATCH  /api/notifications/preferences  # تحديث التفضيلات
```

### إشعارات المدراء
```http
POST   /api/notifications/broadcast    # إرسال إشعار عام
GET    /api/notifications/admin/stats  # إحصائيات الإشعارات
```

## 🔌 WebSocket Events

### من العميل للخادم
```javascript
// الانضمام لغرفة
socket.emit('join_room', { room: 'request_123' });

// تحديد إشعار كمقروء
socket.emit('mark_notification_read', { notificationId: 'id' });

// جلب الإشعارات
socket.emit('get_notifications', { page: 1, limit: 20 });
```

### من الخادم للعميل
```javascript
// إشعار جديد
socket.on('new_notification', (notification) => {
  // معالجة الإشعار الجديد
});

// تحديث عدد غير المقروءة
socket.on('unread_count', (data) => {
  // تحديث العداد
});
```

## 🎭 سيناريوهات الاستخدام

### 1. ممرضة تقدم عرض
```javascript
// يتم تشغيله تلقائياً عند تقديم العرض
await notificationsService.notifyNurseOffer(
  patientId,
  nurseId, 
  nurseName,
  requestId,
  requestTitle,
  price,
  estimatedTime
);
```

### 2. مريض يقبل العرض
```javascript
// يتم تشغيله تلقائياً عند قبول العرض
await notificationsService.notifyOfferAccepted(
  nurseId,
  patientName,
  requestId, 
  requestTitle,
  acceptedPrice
);
```

### 3. اكتمال الطلب
```javascript
// يتم تشغيله تلقائياً عند اكتمال الطلب
await notificationsService.notifyRequestMarkedCompleted(
  nurseId,
  patientName,
  requestId,
  requestTitle
);
```

## 🔧 التخصيص والإعدادات

### متغيرات البيئة

#### Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/nurse-platform
JWT_SECRET=your-secret-key
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### إعدادات الإشعارات
```javascript
// في useNotifications hook
const notificationSettings = {
  enableBrowserNotifications: true,
  enableSound: false,
  updateInterval: 30000, // 30 seconds
  maxNotificationsInDropdown: 10
};
```

## 🧪 الاختبار

### اختبار يدوي
1. سجل دخول كمريض
2. أنشئ طلب جديد
3. سجل دخول كممرضة (في متصفح آخر)
4. قدم عرض على الطلب
5. ارجع للمريض وتحقق من الإشعار
6. اقبل العرض وتحقق من إشعار الممرضة

### اختبار تلقائي
```bash
# تشغيل اختبارات النظام
node test-notifications-system.js

# اختبار WebSocket
node test-websocket-notifications.js
```

## 📊 الإحصائيات والتحليلات

### إحصائيات المدراء
- إجمالي الإشعارات
- عدد غير المقروءة
- معدل القراءة
- الإشعارات حسب النوع
- الإشعارات حسب الأولوية

### تحليلات الأداء
- سرعة التسليم
- معدل التفاعل
- أوقات الذروة
- أنواع الإشعارات الأكثر شيوعاً

## 🔒 الأمان

### المصادقة
- JWT tokens مطلوبة لجميع العمليات
- WebSocket authentication
- Role-based access control

### الخصوصية
- المستخدمون يرون إشعاراتهم فقط
- المدراء لديهم صلاحيات إضافية
- تشفير البيانات الحساسة

## 🚀 التطوير المستقبلي

### مميزات مخططة
- [ ] إشعارات البريد الإلكتروني
- [ ] إشعارات SMS
- [ ] Push notifications للموبايل
- [ ] جدولة الإشعارات
- [ ] قوالب إشعارات قابلة للتخصيص
- [ ] تحليلات متقدمة
- [ ] API webhooks

### تحسينات الأداء
- [ ] Redis caching
- [ ] Database indexing optimization
- [ ] WebSocket clustering
- [ ] CDN للأصول الثابتة

## 🐛 استكشاف الأخطاء

### مشاكل شائعة

#### الإشعارات لا تظهر
```bash
# تحقق من حالة الخادم
curl http://localhost:3001/api/notifications/unread-count \
  -H "Authorization: Bearer YOUR_TOKEN"

# تحقق من WebSocket
# افتح Developer Tools > Network > WS
```

#### مشاكل WebSocket
```javascript
// في المتصفح Console
const socket = io('http://localhost:3001/notifications', {
  auth: { token: 'YOUR_TOKEN' }
});

socket.on('connect', () => console.log('Connected'));
socket.on('error', (error) => console.error('Error:', error));
```

#### مشاكل قاعدة البيانات
```bash
# تحقق من اتصال MongoDB
mongosh mongodb://localhost:27017/nurse-platform

# تحقق من الإشعارات
db.notifications.find().limit(5)
```

## 📞 الدعم

للحصول على المساعدة:
1. تحقق من الـ logs في الخادم
2. استخدم Developer Tools في المتصفح
3. راجع ملف README.md في مجلد notifications
4. شغل اختبارات النظام

## 🎉 الخلاصة

تم تطبيق نظام إشعارات شامل ومتطور يدعم:
- ✅ جميع أنواع الإشعارات المطلوبة
- ✅ واجهة مستخدم تفاعلية وجميلة
- ✅ إشعارات فورية عبر WebSocket
- ✅ API شامل ومرن
- ✅ قابلية التوسع والتخصيص
- ✅ أمان وخصوصية عالية

النظام جاهز للاستخدام ويمكن تشغيله مباشرة! 🚀