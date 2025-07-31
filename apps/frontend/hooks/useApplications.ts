import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/auth';

interface Application {
  id: string;
  requestId: string;
  nurseId: string;
  nurseName: string;
  nursePhone?: string;
  nurseEmail?: string;
  price: number;
  estimatedTime: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt?: string;
}

interface ApplicationsResponse {
  applications: Application[];
  message?: string;
}

export const useApplications = (requestId?: string) => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug logging
  console.log('useApplications hook:', { 
    user: !!user, 
    requestId, 
    applicationsCount: applications.length 
  });

  // Fetch applications for a specific request
  const fetchApplications = useCallback(async (reqId?: string) => {
    const targetRequestId = reqId || requestId;
    if (!user || !targetRequestId) return;
    
    console.log('📡 Fetching applications for request:', targetRequestId);
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/applications/request/${targetRequestId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: Application[] = await response.json();
        console.log('✅ Applications loaded:', data.length);
        setApplications(data);
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to load applications:', response.status, errorData);
        setError(errorData.message || 'Failed to load applications');
        setApplications([]);
      }
    } catch (err) {
      console.error('❌ Error loading applications:', err);
      setError('Network error occurred');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [user, requestId]);

  // Update application (for nurses)
  const updateApplication = useCallback(async (applicationId: string, updateData: { price: number; estimatedTime: number }) => {
    if (!user) return null;
    
    console.log('🔄 Updating application:', applicationId, updateData);
    setLoading(true);
    setError(null);
    
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
        const result = await response.json();
        console.log('✅ Application updated successfully');
        
        // Update local state
        setApplications(prev => 
          prev.map(app => 
            app.id === applicationId 
              ? { ...app, ...updateData, updatedAt: new Date().toISOString() }
              : app
          )
        );
        
        return result;
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to update application:', errorData);
        setError(errorData.message || 'Failed to update application');
        return null;
      }
    } catch (err) {
      console.error('❌ Error updating application:', err);
      setError('Network error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Cancel application (for nurses)
  const cancelApplication = useCallback(async (applicationId: string) => {
    if (!user) return false;
    
    console.log('🗑️ Cancelling application:', applicationId);
    setLoading(true);
    setError(null);
    
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
      setLoading(false);
    }
  }, [user]);

  // Update application status (for patients)
  const updateApplicationStatus = useCallback(async (applicationId: string, status: 'accepted' | 'rejected') => {
    if (!user) return false;
    
    console.log('🔄 Updating application status:', applicationId, status);
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        console.log('✅ Application status updated successfully');
        
        // Update local state
        setApplications(prev => 
          prev.map(app => 
            app.id === applicationId 
              ? { ...app, status }
              : app
          )
        );
        
        return true;
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to update application status:', errorData);
        setError(errorData.message || 'Failed to update application status');
        return false;
      }
    } catch (err) {
      console.error('❌ Error updating application status:', err);
      setError('Network error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Auto-fetch applications when requestId changes
  useEffect(() => {
    if (requestId) {
      fetchApplications(requestId);
      
      // Set up polling for real-time updates every 5 seconds
      const interval = setInterval(() => {
        console.log('🔄 Polling for application updates...');
        fetchApplications(requestId);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [requestId, fetchApplications]);

  // Refresh applications manually
  const refreshApplications = useCallback(() => {
    if (requestId) {
      fetchApplications(requestId);
    }
  }, [requestId, fetchApplications]);

  return {
    applications,
    loading,
    error,
    fetchApplications,
    updateApplication,
    cancelApplication,
    updateApplicationStatus,
    refreshApplications,
    // Helper functions
    getPendingApplications: () => applications.filter(app => app.status === 'pending'),
    getAcceptedApplications: () => applications.filter(app => app.status === 'accepted'),
    getRejectedApplications: () => applications.filter(app => app.status === 'rejected'),
  };
};