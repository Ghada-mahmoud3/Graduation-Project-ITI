import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useNotifications } from '../hooks/useNotifications';

const SyncTester: React.FC = () => {
  const { user } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const [isVisible, setIsVisible] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Monitor notifications for offer updates
  useEffect(() => {
    const offerNotifications = notifications.filter(notif => 
      notif.data?.offerType === 'offer_updated' || 
      notif.data?.offerType === 'offer_cancelled' ||
      notif.data?.offerType === 'nurse_offer'
    );
    
    if (offerNotifications.length > 0) {
      const latest = offerNotifications[0];
      const message = `🔔 Detected: ${latest.title} - ${latest.data?.offerType}`;
      setTestResults(prev => [message, ...prev.slice(0, 9)]);
    }
  }, [notifications]);

  const runSyncTest = async () => {
    if (!user) return;
    
    setIsRunning(true);
    setTestResults(['🧪 Starting sync test...']);
    
    try {
      // Test 1: Create test notification
      setTestResults(prev => [...prev, '📡 Step 1: Creating test notification...']);
      
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '🔄 Sync Test',
          message: 'Testing real-time synchronization',
          type: 'sync_test'
        })
      });

      if (response.ok) {
        setTestResults(prev => [...prev, '✅ Step 1: Test notification created']);
        
        // Test 2: Wait for notification to appear
        setTestResults(prev => [...prev, '⏳ Step 2: Waiting for notification (10s)...']);
        
        setTimeout(() => {
          setTestResults(prev => [...prev, '✅ Step 2: Check notification bell for updates']);
          setTestResults(prev => [...prev, '🎉 Sync test completed!']);
          setIsRunning(false);
        }, 10000);
        
      } else {
        setTestResults(prev => [...prev, '❌ Step 1: Failed to create test notification']);
        setIsRunning(false);
      }
    } catch (error) {
      setTestResults(prev => [...prev, `❌ Error: ${error}`]);
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
        title="Sync Tester"
      >
        🔄
      </button>

      {/* Tester Panel */}
      {isVisible && (
        <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-96">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">🔄 Sync Tester</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Status */}
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">User:</span> {user.name}
              </div>
              <div>
                <span className="font-medium">Role:</span> {user.role}
              </div>
              <div>
                <span className="font-medium">Notifications:</span> {notifications.length}
              </div>
              <div>
                <span className="font-medium">Unread:</span> {unreadCount}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 mb-4">
            <button
              onClick={runSyncTest}
              disabled={isRunning}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {isRunning ? '⏳ Running Test...' : '🧪 Run Sync Test'}
            </button>
            
            <button
              onClick={clearResults}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors"
            >
              🗑️ Clear Results
            </button>
          </div>

          {/* Test Results */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Test Results:</h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {testResults.length === 0 ? (
                <div className="text-gray-500 text-center py-4 text-sm">
                  No test results yet
                </div>
              ) : (
                testResults.map((result, index) => (
                  <div
                    key={index}
                    className="text-xs p-2 bg-gray-100 rounded font-mono"
                  >
                    {result}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded">
            <div className="font-medium mb-1">Quick Test Instructions:</div>
            <div className="space-y-1">
              <div>1. Click "Run Sync Test"</div>
              <div>2. Watch notification bell 🔔</div>
              <div>3. Should update within 10 seconds</div>
              <div>4. Check results above</div>
            </div>
          </div>

          {/* Real-time Monitoring */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-600">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Real-time Monitoring Active</span>
              </div>
              <div className="text-xs">
                • Notifications: Every 10s
              </div>
              <div className="text-xs">
                • Applications: Every 15s
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncTester;