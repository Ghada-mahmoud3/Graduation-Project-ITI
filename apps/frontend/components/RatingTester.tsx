import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { apiService } from '../lib/api';

const RatingTester: React.FC = () => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [testData, setTestData] = useState({
    requestId: '',
    nurseId: '',
    rating: 5,
    feedback: 'Test review - excellent service!'
  });
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [completedRequests, setCompletedRequests] = useState<any[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [message, ...prev.slice(0, 9)]);
  };

  // Load completed requests for easy testing
  useEffect(() => {
    if (user && isVisible) {
      loadCompletedRequests();
    }
  }, [user, isVisible]);

  const loadCompletedRequests = async () => {
    try {
      if (user?.role === 'patient') {
        const response = await apiService.getPatientCompletedRequests();
        const requests = response?.data || [];
        setCompletedRequests(requests);
        addResult(`📋 Loaded ${requests.length} completed requests`);
        
        if (requests.length > 0) {
          const firstRequest = requests[0];
          setTestData(prev => ({
            ...prev,
            requestId: firstRequest.id,
            nurseId: firstRequest.nurse?.id || ''
          }));
          addResult(`🎯 Auto-filled: Request ${firstRequest.id.slice(-8)}...`);
        }
      }
    } catch (error) {
      addResult(`❌ Error loading requests: ${error}`);
    }
  };

  const testRatingSubmission = async () => {
    if (!testData.requestId || !testData.nurseId) {
      addResult('❌ Please fill Request ID and Nurse ID');
      return;
    }

    setIsRunning(true);
    addResult('🧪 Testing rating submission...');

    try {
      addResult(`📝 Submitting: ${testData.rating}⭐ "${testData.feedback}"`);
      
      const result = await apiService.submitRating(
        testData.requestId,
        testData.nurseId,
        testData.rating,
        testData.feedback
      );

      if (result.success) {
        addResult('✅ Rating submitted successfully!');
        addResult('⏳ Check nurse page in 10 seconds for update');
      } else {
        addResult(`❌ Submission failed: ${result.message}`);
      }
    } catch (error) {
      addResult(`❌ Error: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testRatingFetch = async () => {
    if (!testData.nurseId) {
      addResult('❌ Please fill Nurse ID');
      return;
    }

    setIsRunning(true);
    addResult('🔍 Testing rating fetch...');

    try {
      const result = await apiService.getNurseReviews(testData.nurseId, 1, 10);
      
      if (result.reviews && result.reviews.length > 0) {
        addResult(`✅ Found ${result.reviews.length} reviews`);
        addResult(`📊 Average: ${result.stats?.averageRating}⭐`);
        
        result.reviews.forEach((review: any, index: number) => {
          addResult(`📝 Review ${index + 1}: ${review.rating}⭐ "${review.feedback?.slice(0, 30)}..."`);
        });
      } else {
        addResult('📭 No reviews found for this nurse');
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
    <div className="fixed bottom-44 right-4 z-20">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-yellow-600 text-white p-3 rounded-full shadow-lg hover:bg-yellow-700 transition-colors"
        title="Rating Tester"
      >
        ⭐
      </button>

      {/* Tester Panel */}
      {isVisible && (
        <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-96">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">⭐ Rating Tester</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Quick Fill */}
          {completedRequests.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded">
              <div className="text-sm font-medium text-blue-800 mb-2">Quick Fill:</div>
              <select
                onChange={(e) => {
                  const request = completedRequests[parseInt(e.target.value)];
                  if (request) {
                    setTestData(prev => ({
                      ...prev,
                      requestId: request.id,
                      nurseId: request.nurse?.id || ''
                    }));
                  }
                }}
                className="w-full text-xs p-2 border rounded"
              >
                <option value="">Select a completed request</option>
                {completedRequests.map((req, index) => (
                  <option key={req.id} value={index}>
                    {req.title?.slice(0, 30)}... - {req.nurse?.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Input Fields */}
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Request ID:
              </label>
              <input
                type="text"
                value={testData.requestId}
                onChange={(e) => setTestData(prev => ({ ...prev, requestId: e.target.value }))}
                placeholder="Enter request ID"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nurse ID:
              </label>
              <input
                type="text"
                value={testData.nurseId}
                onChange={(e) => setTestData(prev => ({ ...prev, nurseId: e.target.value }))}
                placeholder="Enter nurse ID"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating: {testData.rating}⭐
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={testData.rating}
                onChange={(e) => setTestData(prev => ({ ...prev, rating: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Feedback:
              </label>
              <textarea
                value={testData.feedback}
                onChange={(e) => setTestData(prev => ({ ...prev, feedback: e.target.value }))}
                placeholder="Enter review text"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                rows={2}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 mb-4">
            <button
              onClick={testRatingSubmission}
              disabled={isRunning || !testData.requestId || !testData.nurseId || user.role !== 'patient'}
              className="w-full bg-yellow-600 text-white py-2 px-4 rounded hover:bg-yellow-700 transition-colors disabled:opacity-50 text-sm"
            >
              {isRunning ? '⏳ Submitting...' : '📝 Submit Test Rating'}
            </button>
            
            <button
              onClick={testRatingFetch}
              disabled={isRunning || !testData.nurseId}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
            >
              {isRunning ? '⏳ Fetching...' : '🔍 Fetch Nurse Reviews'}
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
          <div className="text-xs text-gray-600 bg-yellow-50 p-3 rounded">
            <div className="font-medium mb-1">Instructions:</div>
            <div className="space-y-1">
              <div>1. Select completed request (auto-fills IDs)</div>
              <div>2. Adjust rating and feedback</div>
              <div>3. As patient: Submit rating</div>
              <div>4. Check nurse page for update (10s)</div>
              <div>5. Use "Fetch Reviews" to verify</div>
            </div>
          </div>

          {/* Role Warning */}
          {user.role !== 'patient' && (
            <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
              ⚠️ Rating submission only works for patients
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RatingTester;