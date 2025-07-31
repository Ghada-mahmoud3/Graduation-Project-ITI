import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';

const ApplicationSyncTester: React.FC = () => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [testData, setTestData] = useState({
    requestId: '',
    applicationId: '',
    currentPrice: 0,
    currentTime: 0
  });
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [message, ...prev.slice(0, 9)]);
  };

  const testApplicationSync = async () => {
    if (!testData.requestId) {
      addResult('❌ Please enter a Request ID first');
      return;
    }

    setIsRunning(true);
    addResult('🧪 Starting application sync test...');

    try {
      // Step 1: Fetch current applications
      addResult('📡 Step 1: Fetching current applications...');
      
      const response = await fetch(`/api/applications/request/${testData.requestId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const applications = await response.json();
        addResult(`✅ Step 1: Found ${applications.length} applications`);
        
        if (applications.length > 0) {
          const firstApp = applications[0];
          setTestData(prev => ({
            ...prev,
            applicationId: firstApp.id,
            currentPrice: firstApp.price,
            currentTime: firstApp.estimatedTime
          }));
          
          addResult(`📋 Application ID: ${firstApp.id}`);
          addResult(`💰 Current Price: $${firstApp.price}`);
          addResult(`⏰ Current Time: ${firstApp.estimatedTime}h`);
        } else {
          addResult('⚠️ No applications found for this request');
        }
      } else {
        addResult('❌ Step 1: Failed to fetch applications');
      }
    } catch (error) {
      addResult(`❌ Error: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testApplicationUpdate = async () => {
    if (!testData.applicationId) {
      addResult('❌ Please run sync test first to get Application ID');
      return;
    }

    setIsRunning(true);
    addResult('🔄 Testing application update...');

    try {
      const newPrice = testData.currentPrice + 5;
      const newTime = testData.currentTime + 0.5;

      addResult(`📝 Updating to: $${newPrice}, ${newTime}h`);

      const response = await fetch(`/api/applications/${testData.applicationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price: newPrice,
          estimatedTime: newTime
        }),
      });

      if (response.ok) {
        addResult('✅ Application updated successfully');
        addResult('⏳ Check patient view for updates (5s polling)');
        
        setTestData(prev => ({
          ...prev,
          currentPrice: newPrice,
          currentTime: newTime
        }));
      } else {
        const errorData = await response.json();
        addResult(`❌ Update failed: ${errorData.message}`);
      }
    } catch (error) {
      addResult(`❌ Error: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testApplicationCancel = async () => {
    if (!testData.applicationId) {
      addResult('❌ Please run sync test first to get Application ID');
      return;
    }

    if (!confirm('This will delete the application. Continue?')) {
      return;
    }

    setIsRunning(true);
    addResult('🗑️ Testing application cancellation...');

    try {
      const response = await fetch(`/api/applications/${testData.applicationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        addResult('✅ Application cancelled successfully');
        addResult('⏳ Check patient view - application should disappear (5s polling)');
        
        setTestData(prev => ({
          ...prev,
          applicationId: '',
          currentPrice: 0,
          currentTime: 0
        }));
      } else {
        const errorData = await response.json();
        addResult(`❌ Cancel failed: ${errorData.message}`);
      }
    } catch (error) {
      addResult(`❌ Error: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-32 right-4 z-30">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-orange-600 text-white p-3 rounded-full shadow-lg hover:bg-orange-700 transition-colors"
        title="Application Sync Tester"
      >
        📋
      </button>

      {/* Tester Panel */}
      {isVisible && (
        <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-96">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">📋 Application Sync Tester</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Request ID:
            </label>
            <input
              type="text"
              value={testData.requestId}
              onChange={(e) => setTestData(prev => ({ ...prev, requestId: e.target.value }))}
              placeholder="Enter request ID to test"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            />
          </div>

          {/* Current Data */}
          {testData.applicationId && (
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="text-sm">
                <div><strong>App ID:</strong> {testData.applicationId.slice(-8)}...</div>
                <div><strong>Price:</strong> ${testData.currentPrice}</div>
                <div><strong>Time:</strong> {testData.currentTime}h</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 mb-4">
            <button
              onClick={testApplicationSync}
              disabled={isRunning || !testData.requestId}
              className="w-full bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-700 transition-colors disabled:opacity-50 text-sm"
            >
              {isRunning ? '⏳ Testing...' : '🔍 Fetch Applications'}
            </button>
            
            <button
              onClick={testApplicationUpdate}
              disabled={isRunning || !testData.applicationId || user.role !== 'nurse'}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
            >
              {isRunning ? '⏳ Updating...' : '🔄 Test Update (+$5, +0.5h)'}
            </button>
            
            <button
              onClick={testApplicationCancel}
              disabled={isRunning || !testData.applicationId || user.role !== 'nurse'}
              className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors disabled:opacity-50 text-sm"
            >
              {isRunning ? '⏳ Cancelling...' : '🗑️ Test Cancel'}
            </button>
            
            <button
              onClick={clearResults}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors text-sm"
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
          <div className="text-xs text-gray-600 bg-orange-50 p-3 rounded">
            <div className="font-medium mb-1">Instructions:</div>
            <div className="space-y-1">
              <div>1. Enter Request ID from patient's request</div>
              <div>2. Click "Fetch Applications"</div>
              <div>3. As nurse: Test "Update" or "Cancel"</div>
              <div>4. Check patient view for changes (5s)</div>
            </div>
          </div>

          {/* Role Warning */}
          {user.role !== 'nurse' && (
            <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
              ⚠️ Update/Cancel only work for nurses
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ApplicationSyncTester;