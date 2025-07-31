import React, { useState, useEffect } from 'react';
import { useApplications } from '../hooks/useApplications';
import { useAuth } from '../lib/auth';
import { useNotifications } from '../hooks/useNotifications';

interface ApplicationsListProps {
  requestId: string;
  requestTitle?: string;
  onApplicationUpdate?: () => void;
}

const ApplicationsList: React.FC<ApplicationsListProps> = ({ 
  requestId, 
  requestTitle = 'Request',
  onApplicationUpdate 
}) => {
  const { user } = useAuth();
  const { 
    applications, 
    loading, 
    error, 
    updateApplicationStatus, 
    refreshApplications 
  } = useApplications(requestId);
  const { notifications } = useNotifications();
  
  const [expandedApplication, setExpandedApplication] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Listen for notifications about offer updates
  useEffect(() => {
    const offerNotifications = notifications.filter(notif => 
      notif.data?.offerType === 'offer_updated' || 
      notif.data?.offerType === 'offer_cancelled'
    );
    
    if (offerNotifications.length > 0) {
      console.log('🔄 Detected offer update notifications, refreshing applications...');
      refreshApplications();
    }
  }, [notifications, refreshApplications]);

  const handleAcceptApplication = async (applicationId: string) => {
    setActionLoading(applicationId);
    try {
      const success = await updateApplicationStatus(applicationId, 'accepted');
      if (success) {
        onApplicationUpdate?.();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectApplication = async (applicationId: string) => {
    setActionLoading(applicationId);
    try {
      const success = await updateApplicationStatus(applicationId, 'rejected');
      if (success) {
        onApplicationUpdate?.();
      }
    } finally {
      setActionLoading(null);
    }
  };

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

  if (loading && applications.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded"></div>
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
            onClick={refreshApplications}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Yet</h3>
          <p className="text-gray-600">
            No nurses have applied to this request yet. Check back later!
          </p>
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
        <h3 className="text-lg font-semibold text-gray-900">
          Applications ({applications.length})
        </h3>
        <button
          onClick={refreshApplications}
          disabled={loading}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
        >
          {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Pending Applications */}
      {pendingApplications.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="font-medium text-gray-900">
              Pending Applications ({pendingApplications.length})
            </h4>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingApplications.map((application) => (
              <div key={application.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h5 className="font-medium text-gray-900">
                        {application.nurseName}
                      </h5>
                      {getStatusBadge(application.status)}
                      {application.updatedAt && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          Updated
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Price:</span> ${application.price}
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
                </div>

                {/* Contact Info (expandable) */}
                <div className="mb-4">
                  <button
                    onClick={() => setExpandedApplication(
                      expandedApplication === application.id ? null : application.id
                    )}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    {expandedApplication === application.id ? '▼ Hide Contact' : '▶ Show Contact'}
                  </button>
                  
                  {expandedApplication === application.id && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                      {application.nurseEmail && (
                        <div className="mb-1">
                          <span className="font-medium">Email:</span> {application.nurseEmail}
                        </div>
                      )}
                      {application.nursePhone && (
                        <div>
                          <span className="font-medium">Phone:</span> {application.nursePhone}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions (only for patients and pending applications) */}
                {user?.role === 'patient' && application.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAcceptApplication(application.id)}
                      disabled={actionLoading === application.id}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                      {actionLoading === application.id ? '⏳ Accepting...' : '✅ Accept'}
                    </button>
                    <button
                      onClick={() => handleRejectApplication(application.id)}
                      disabled={actionLoading === application.id}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                      {actionLoading === application.id ? '⏳ Rejecting...' : '❌ Reject'}
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
            <h4 className="font-medium text-gray-900">
              Processed Applications ({processedApplications.length})
            </h4>
          </div>
          <div className="divide-y divide-gray-200">
            {processedApplications.map((application) => (
              <div key={application.id} className="p-6 opacity-75">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h5 className="font-medium text-gray-900">
                        {application.nurseName}
                      </h5>
                      {getStatusBadge(application.status)}
                    </div>
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
          Auto-updating every 5 seconds
        </div>
      </div>
    </div>
  );
};

export default ApplicationsList;