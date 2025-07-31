import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';

interface Application {
  id: string;
  price: number;
  estimatedTime: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  request: {
    id: string;
    title: string;
    description: string;
    patient: {
      id: string;
      name: string;
      phone: string;
    };
  };
}

const NurseApplicationManager: React.FC = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingApplication, setEditingApplication] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ price: 0, estimatedTime: 0 });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch nurse's applications
  const fetchApplications = async () => {
    if (!user || user.role !== 'nurse') return;
    
    console.log('📡 Fetching nurse applications...');
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/applications/nurse', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: Application[] = await response.json();
        console.log('✅ Nurse applications loaded:', data.length);
        setApplications(data);
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to load applications:', errorData);
        setError(errorData.message || 'Failed to load applications');
      }
    } catch (err) {
      console.error('❌ Error loading applications:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Update application
  const updateApplication = async (applicationId: string, updateData: { price: number; estimatedTime: number }) => {
    console.log('🔄 Updating application:', applicationId, updateData);
    setActionLoading(applicationId);
    
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        console.log('✅ Application updated successfully');
        
        // Update local state
        setApplications(prev => 
          prev.map(app => 
            app.id === applicationId 
              ? { ...app, ...updateData, updatedAt: new Date().toISOString() }
              : app
          )
        );
        
        setEditingApplication(null);
        return true;
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to update application:', errorData);
        setError(errorData.message || 'Failed to update application');
        return false;
      }
    } catch (err) {
      console.error('❌ Error updating application:', err);
      setError('Network error occurred');
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  // Cancel application
  const cancelApplication = async (applicationId: string) => {
    if (!confirm('Are you sure you want to cancel this application? This action cannot be undone.')) {
      return;
    }
    
    console.log('🗑️ Cancelling application:', applicationId);
    setActionLoading(applicationId);
    
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('✅ Application cancelled successfully');
        
        // Remove from local state
        setApplications(prev => prev.filter(app => app.id !== applicationId));
        
        return true;
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to cancel application:', errorData);
        setError(errorData.message || 'Failed to cancel application');
        return false;
      }
    } catch (err) {
      console.error('❌ Error cancelling application:', err);
      setError('Network error occurred');
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  // Handle edit form submission
  const handleEditSubmit = (applicationId: string) => {
    if (editForm.price <= 0 || editForm.estimatedTime <= 0) {
      alert('Please enter valid price and estimated time');
      return;
    }
    
    updateApplication(applicationId, editForm);
  };

  // Start editing
  const startEditing = (application: Application) => {
    setEditingApplication(application.id);
    setEditForm({
      price: application.price,
      estimatedTime: application.estimatedTime
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingApplication(null);
    setEditForm({ price: 0, estimatedTime: 0 });
  };

  useEffect(() => {
    fetchApplications();
    
    // Set up polling for updates every 30 seconds
    const interval = setInterval(() => {
      console.log('🔄 Polling for application updates...');
      fetchApplications();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      accepted: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    };
    
    const labels = {
      pending: 'Pending',
      accepted: 'Accepted',
      rejected: 'Rejected'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user || user.role !== 'nurse') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">This page is only accessible to nurses.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <div className="text-center">
          <div className="text-red-600 mb-2">❌ Error loading applications</div>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <button
            onClick={fetchApplications}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const processedApplications = applications.filter(app => app.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          My Applications ({applications.length})
        </h2>
        <button
          onClick={fetchApplications}
          disabled={loading}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
        >
          {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {applications.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="text-gray-400 text-5xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Yet</h3>
            <p className="text-gray-600">
              You haven't applied to any requests yet. Browse available requests to get started!
            </p>
          </div>
        </div>
      )}

      {/* Pending Applications */}
      {pendingApplications.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">
              Pending Applications ({pendingApplications.length})
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              You can edit or cancel these applications
            </p>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingApplications.map((application) => (
              <div key={application.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-gray-900">
                        {application.request.title}
                      </h4>
                      {getStatusBadge(application.status)}
                      {application.updatedAt && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          Updated
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Patient: {application.request.patient.name}
                    </p>
                  </div>
                </div>

                {editingApplication === application.id ? (
                  /* Edit Form */
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h5 className="font-medium text-gray-900 mb-3">Edit Application</h5>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Price ($)
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={editForm.price}
                          onChange={(e) => setEditForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Estimated Time (hours)
                        </label>
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={editForm.estimatedTime}
                          onChange={(e) => setEditForm(prev => ({ ...prev, estimatedTime: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEditSubmit(application.id)}
                        disabled={actionLoading === application.id}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
                      >
                        {actionLoading === application.id ? '⏳ Saving...' : '💾 Save Changes'}
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={actionLoading === application.id}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display Mode */
                  <div className="mb-4">
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Your Price:</span> ${application.price}
                      </div>
                      <div>
                        <span className="font-medium">Estimated Time:</span> {application.estimatedTime} hours
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Applied: {formatDate(application.createdAt)}
                      {application.updatedAt && (
                        <span className="ml-2">
                          • Updated: {formatDate(application.updatedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {editingApplication !== application.id && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => startEditing(application)}
                      disabled={actionLoading === application.id}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => cancelApplication(application.id)}
                      disabled={actionLoading === application.id}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                      {actionLoading === application.id ? '⏳ Cancelling...' : '🗑️ Cancel'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processed Applications */}
      {processedApplications.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">
              Processed Applications ({processedApplications.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {processedApplications.map((application) => (
              <div key={application.id} className="p-6 opacity-75">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-gray-900">
                        {application.request.title}
                      </h4>
                      {getStatusBadge(application.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Patient: {application.request.patient.name}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
                      <div>
                        <span className="font-medium">Price:</span> ${application.price}
                      </div>
                      <div>
                        <span className="font-medium">Estimated Time:</span> {application.estimatedTime} hours
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Applied: {formatDate(application.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real-time indicator */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Auto-updating every 30 seconds
        </div>
      </div>
    </div>
  );
};

export default NurseApplicationManager;