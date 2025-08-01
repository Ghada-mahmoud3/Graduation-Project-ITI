import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import { apiService } from '../lib/api';
import Link from 'next/link';
import Layout from '../components/Layout';
import { LoadingSpinner } from '../components/Layout';

interface Application {
  id: string;
  price: number;
  estimatedTime: number;
  status: string; // Allow any status string
  createdAt: string;
  request: {
    id: string;
    title: string;
    description: string;
    address: string;
    scheduledDate: string;
    estimatedDuration: number;
    budget: number;
    status: string;
    serviceType?: string;
    patientCompleted?: boolean;
    patientCompletedAt?: string;
    nurseCompleted?: boolean;
    nurseCompletedAt?: string;
    patient: {
      id: string;
      name: string;
      phone: string;
    };
    nurse?: {
      id: string;
      name: string;
      phone: string;
    };
  };
}

interface Service {
  id: string;
  title: string;
  description: string;
  status: string;
  address: string;
  scheduledDate: string;
  estimatedDuration: number;
  budget: number;
  patient?: {
    id: string;
    name: string;
    phone: string;
  };
  nurse?: {
    id: string;
    name: string;
    phone: string;
  };
}

export default function MyOffers() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const router = useRouter();

  // Health check function to test backend connectivity
  const testBackendHealth = async () => {
    try {
      console.log('🏥 Testing backend health...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }),
        },
      });

      console.log('🏥 Backend health check response:', response.status);
      return response.status < 500; // Return true if not a server error
    } catch (error) {
      console.error('🏥 Backend health check failed:', error);
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      // Test backend health first, then load data
      testBackendHealth().then(isHealthy => {
        if (isHealthy) {
          console.log('✅ Backend is healthy, loading data...');
          loadData();
        } else {
          console.error('❌ Backend health check failed');
          setError('Server is currently unavailable. Please try again later.');
          setLoading(false);
        }
      });
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔍 Starting loadData...');
      console.log('🔍 User object:', user);
      console.log('🔍 User authenticated:', !!user);
      console.log('🔍 User role:', user?.role);
      console.log('🔍 User ID:', user?.id);

      if (!user) {
        console.error('❌ User not authenticated');
        throw new Error('User not authenticated');
      }

      console.log(`✅ Loading data for ${user.role} with ID ${user.id}`);

      if (user.role === 'nurse') {
        // For nurses, load all applications they've made (pending, accepted, rejected)
        console.log('Fetching nurse applications...');
        try {
          const data = await apiService.getApplicationsByNurse();
          console.log('Nurse applications data received:', data);
          
          if (!data) {
            console.warn('No applications data received from API');
            setApplications([]);
          } else {
            // Show all applications, not just accepted ones
            const nurseApps = Array.isArray(data) ? data : [];
            
            console.log(`Found ${nurseApps.length} total nurse applications`);
            setApplications(nurseApps);
          }
        } catch (apiError: any) {
          console.error('API error when fetching nurse applications:', apiError);
          console.error('Error details:', {
            message: apiError.message,
            stack: apiError.stack,
            name: apiError.name,
            code: apiError.code,
            status: apiError.status
          });

          // Show more detailed error information
          const errorMessage = apiError.userMessage || apiError.message || 'Unknown error occurred';
          setError(`Failed to load applications: ${errorMessage}`);
          setApplications([]);
        }
      } else if (user.role === 'patient') {
        // For patients, load their requests with accepted applications
        console.log('Fetching patient requests...');
        try {
          const requestsData = await apiService.getRequests();
          console.log('Patient requests data received:', requestsData);
          
          let requests = Array.isArray(requestsData) ? requestsData : [];
          
          // Filter for requests with accepted applications or in_progress status
          const acceptedRequests = requests.filter(req => 
            req.status === 'accepted' || req.status === 'in_progress' || req.status === 'nurse_completed'
          );
          
          console.log(`Found ${acceptedRequests.length} requests with accepted/in-progress status`);
          
          // Convert to a format compatible with our UI
          const formattedRequests = acceptedRequests.map(req => ({
            id: req.id + '-app', // Add suffix to make unique from actual application IDs
            requestId: req.id,
            nurseId: req.nurse?.id || '',
            price: req.budget || 0,
            estimatedTime: req.estimatedDuration || 0,
            status: 'accepted',
            createdAt: req.createdAt,
            request: req
          }));
          
          setApplications(formattedRequests);
        } catch (apiError: any) {
          console.error('API error when fetching patient requests:', apiError);
          console.error('Error details:', {
            message: apiError.message,
            stack: apiError.stack,
            name: apiError.name,
            code: apiError.code,
            status: apiError.status
          });

          // Show more detailed error information
          const errorMessage = apiError.userMessage || apiError.message || 'Unknown error occurred';
          setError(`Failed to load requests: ${errorMessage}`);
          setApplications([]);
        }
      }
    } catch (err: any) {
      console.error('❌ Error in loadData:', err);
      console.error('❌ Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
        code: err.code,
        status: err.status,
        userMessage: err.userMessage
      });

      // Handle specific error types
      let errorMessage = 'Failed to load data';
      if (err.userMessage) {
        errorMessage = err.userMessage;
      } else if (err.message) {
        if (err.message.includes('Internal server error')) {
          errorMessage = 'Server is temporarily unavailable. Please try again in a few moments.';
        } else if (err.message.includes('Network')) {
          errorMessage = 'Network connection issue. Please check your internet connection.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      setApplications([]);
    } finally {
      setLoading(false);
    }
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

  // Handler for nurse to mark a request as completed
  const handleCompleteByNurse = async (requestId: string) => {
    try {
      setProcessing(requestId);
      console.log('🏥 Nurse completing request:', requestId);

      if (confirm('Are you sure you want to mark this request as completed? This action cannot be undone.')) {
        console.log('✅ User confirmed completion');

        // Mark as completed via API
        const result = await apiService.markRequestCompletedByNurse(requestId);
        console.log('✅ API response:', result);

        alert('Request marked as completed by nurse. Waiting for patient confirmation.');

        // Reload data to ensure UI is updated
        await loadData();
        console.log('✅ Data reloaded');

        // Redirect to completed requests page
        console.log('🔄 Redirecting to completed requests...');
        await router.push('/completed-requests');
        console.log('✅ Redirect completed');
      } else {
        console.log('❌ User cancelled completion');
      }
    } catch (err: any) {
      console.error('❌ Complete request error:', err);
      const errorMessage = err.message || 'Failed to complete request';
      alert(`❌ Failed to complete request: ${errorMessage}`);
    } finally {
      setProcessing(null);
    }
  };
  
  // Handler for patient to mark a request as completed
  const handleCompleteByPatient = async (requestId: string) => {
    try {
      setProcessing(requestId);
      console.log('🏥 Patient completing request:', requestId);

      if (confirm('Are you sure you want to mark this request as completed? This action will finalize the service.')) {
        console.log('✅ User confirmed completion');

        // Mark as completed via API
        const result = await apiService.markRequestCompletedByPatient(requestId);
        console.log('✅ API response:', result);

        alert('Request marked as completed. Thank you for using our service!');

        // Reload data to ensure UI is updated
        await loadData();
        console.log('✅ Data reloaded');

        // Redirect to patient completed requests page
        console.log('🔄 Redirecting to patient completed requests...');
        await router.push('/patient-completed-requests');
        console.log('✅ Redirect completed');
      } else {
        console.log('❌ User cancelled completion');
      }
    } catch (err: any) {
      console.error('❌ Complete request error:', err);
      const errorMessage = err.message || 'Failed to complete request';
      alert(`❌ Failed to complete request: ${errorMessage}`);
    } finally {
      setProcessing(null);
    }
  };
  
  // Handler for nurse to cancel a pending application
  const handleCancelApplication = async (applicationId: string) => {
    try {
      console.log('🗑️ Cancel application clicked for ID:', applicationId);
      setCancelingId(applicationId);

      if (confirm('Are you sure you want to cancel this application?')) {
        console.log('✅ User confirmed cancellation');

        const result = await apiService.cancelApplication(applicationId);
        console.log('✅ Cancel API response:', result);

        alert('Application cancelled successfully');
        await loadData(); // Reload to get updated data
        console.log('✅ Data reloaded after cancellation');
      } else {
        console.log('❌ User cancelled the cancellation');
      }
    } catch (err: any) {
      console.error('❌ Error cancelling application:', err);
      console.error('❌ Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      alert(`Failed to cancel application: ${err.message}`);
    } finally {
      setCancelingId(null);
    }
  };

  // Handler for nurse to edit a pending application
  const handleUpdateApplication = async (applicationId: string, price: number, estimatedTime: number) => {
    try {
      console.log('🔄 Update application clicked for ID:', applicationId);
      console.log('🔄 New values:', { price, estimatedTime });

      // Validate inputs
      if (!price || price <= 0) {
        alert('❌ Please enter a valid price greater than 0');
        return;
      }
      if (!estimatedTime || estimatedTime <= 0) {
        alert('❌ Please enter a valid estimated time greater than 0');
        return;
      }

      const result = await apiService.updateApplication(applicationId, { price, estimatedTime });
      console.log('✅ Update API response:', result);

      alert('✅ Offer updated successfully! The patient has been notified.');
      setEditingApplication(null);
      await loadData(); // Reload to get updated data
      console.log('✅ Data reloaded after update');
    } catch (err: any) {
      console.error('❌ Failed to update application:', err);
      console.error('❌ Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      const errorMessage = err.message || 'Failed to update application';
      alert(`❌ Failed to update offer: ${errorMessage}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'nurse_completed': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'accepted': return '✅';
      case 'rejected': return '❌';
      case 'in_progress': return '🔄';
      case 'nurse_completed': return '⌛';
      case 'completed': return '✅';
      default: return '❓';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Please log in to view your offers.</p>
          <Link href="/login" className="text-blue-600 hover:text-blue-800">Login</Link>
        </div>
      </div>
    );
  }

  // Check if user is logged in
  if (!user) {
    return (
      <Layout title="My Offers">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">Please log in to view your offers.</p>
            <Link href="/login" className="text-blue-600 hover:text-blue-800">Login</Link>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Now allowing both nurses and patients to access this page
  if (user.role !== 'nurse' && user.role !== 'patient') {
    return (
      <Layout title="My Offers">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">This page is only available for nurses and patients.</p>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">Go to Dashboard</Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={user.role === 'nurse' ? 'My Applications' : 'My Active Services'}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href={user.role === 'nurse' ? "/requests" : "/dashboard"} className="text-gray-500 hover:text-gray-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">
                  {user.role === 'nurse' ? 'My Applications' : 'My Active Services'}
                </h1>
              </div>
              <div className="text-sm text-gray-500">
                {applications.length} {user.role === 'nurse' ? 'applications' : 'active services'}
              </div>
            </div>
          </div>
        </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              type="button"
              onClick={loadData}
              className="text-blue-600 hover:text-blue-800"
            >
              Try Again
            </button>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {user.role === 'nurse' 
                ? "No applications yet" 
                : "No active services yet"
              }
            </h3>
            <p className="text-gray-500 mb-4">
              {user.role === 'nurse'
                ? "Start applying to patient requests to see your applications here."
                : "Create a request to find a nurse for your needs."
              }
            </p>
            <Link 
              href={user.role === 'nurse' ? "/requests" : "/requests/create"}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {user.role === 'nurse' ? "Browse Requests" : "Create Request"}
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            {user.role === 'nurse' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="text-2xl font-bold text-blue-600">{applications.length}</div>
                  <div className="text-sm text-gray-500">Total Applications</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="text-2xl font-bold text-yellow-600">
                    {applications.filter(app => app.status === 'pending').length}
                  </div>
                  <div className="text-sm text-gray-500">Pending</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="text-2xl font-bold text-green-600">
                    {applications.filter(app => app.status === 'accepted').length}
                  </div>
                  <div className="text-sm text-gray-500">Accepted</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="text-2xl font-bold text-red-600">
                    {applications.filter(app => app.status === 'rejected').length}
                  </div>
                  <div className="text-sm text-gray-500">Rejected</div>
                </div>
              </div>
            )}

            {/* All Applications */}
            <div className="space-y-4">
              {applications
                .map((application) => (
                  <div key={application.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {application.request.title}
                            </h3>
                            {/* Application Status (for nurses) */}
                            {user.role === 'nurse' && (
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(application.status)}`}>
                                <span className="mr-1">{getStatusIcon(application.status)}</span>
                                {application.status === 'pending' ? 'Pending' :
                                 application.status === 'accepted' ? 'Accepted' :
                                 application.status === 'rejected' ? 'Rejected' : application.status}
                              </span>
                            )}
                            
                            {/* Request Status */}
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(application.request.status)}`}>
                              <span className="mr-1">{getStatusIcon(application.request.status)}</span>
                              {application.request.status === 'in_progress' ? 'In Progress' : 
                               application.request.status === 'nurse_completed' ? 'Awaiting Confirmation' : 
                               application.request.status === 'completed' ? 'Completed' : 'Active'}
                            </span>
                          </div>
                          <p className="text-gray-600 mb-3">{application.request.description}</p>

                          {/* Patient Completion Notification */}
                          {application.request.patientCompleted && (
                            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center">
                                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                  <p className="text-sm font-medium text-green-800">Patient marked as complete</p>
                                  <p className="text-xs text-green-600">
                                    {application.request.patientCompletedAt &&
                                      `Completed on ${new Date(application.request.patientCompletedAt).toLocaleDateString()}`
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Location and Schedule Info */}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                            {user.role === 'nurse' && (
                              <div className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>{application.request.patient.name}</span>
                              </div>
                            )}
                            {user.role === 'patient' && application.request.nurse && (
                              <div className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>{application.request.nurse.name}</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>{application.request.address}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{formatDate(application.request.scheduledDate)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Service Details */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h4 className="font-medium text-gray-900 mb-3">
                          {user.role === 'nurse' ? 'Your Offer Details' : 'Service Details'}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Price</span>
                            <div className="font-semibold text-green-600 text-lg">${application.price}</div>
                          </div>
                          {user.role === 'nurse' && (
                            <div>
                              <span className="text-gray-500">Patient Budget</span>
                              <div className="font-medium text-gray-700">${application.request.budget}</div>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500">Estimated Time</span>
                            <div className="font-semibold text-blue-600 text-lg">{application.estimatedTime}h</div>
                          </div>
                          <div>
                            <span className="text-gray-500">{user.role === 'nurse' ? 'Applied On' : 'Service Type'}</span>
                            <div className="font-medium text-gray-700">
                              {user.role === 'nurse' 
                                ? formatDate(application.createdAt)
                                : application.request.serviceType || 'General Care'
                              }
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Contact Information */}
                      {user.role === 'nurse' && application.request.patient && (
                        <div className="bg-blue-50 p-4 rounded-md mb-4">
                          <h4 className="font-medium text-blue-900 mb-2">Patient Contact Information</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <span className="text-sm font-medium text-blue-700">Name:</span>
                              <p className="text-blue-900">{application.request.patient.name}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-blue-700">Contact:</span>
                              <p className="text-blue-900">{application.request.patient.phone}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {user.role === 'patient' && application.request.nurse && (
                        <div className="bg-green-50 p-4 rounded-md mb-4">
                          <h4 className="font-medium text-green-900 mb-2">Assigned Nurse Information</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <span className="text-sm font-medium text-green-700">Name:</span>
                              <p className="text-green-900">{application.request.nurse.name}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-green-700">Contact:</span>
                              <p className="text-green-900">{application.request.nurse.phone}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-3">
                          <Link
                            href={`/requests/${application.request.id}`}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                          >
                            View Details
                          </Link>
                          
                          {/* Nurse actions */}
                          {user.role === 'nurse' && application.status === 'accepted' && application.request.status === 'in_progress' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCompleteByNurse(application.request.id)}
                                disabled={processing === application.request.id}
                                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                              >
                                {processing === application.request.id ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Mark as Completed
                                  </>
                                )}
                              </button>
                            </>
                          )}
                          
                          {/* Patient actions */}
                          {user.role === 'patient' && application.request.status === 'nurse_completed' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCompleteByPatient(application.request.id)}
                                disabled={processing === application.request.id}
                                className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors disabled:bg-green-300"
                              >
                                {processing === application.request.id ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Confirm Completion
                                  </>
                                )}
                              </button>
                            </>
                          )}
                          
                          {application.request.status === 'completed' && (
                            <div className="inline-flex items-center px-3 py-2 bg-green-100 text-green-800 rounded-md text-sm font-medium">
                              ✅ Service Completed
                            </div>
                          )}
                        </div>
                        
                        {/* Status indicators */}
                        {/* Debug: Log application status */}
                        {console.log('🔍 Application status:', application.status, 'for application:', application.id)}
                        {console.log('🔍 User role:', user.role)}
                        {console.log('🔍 Should show buttons:', application.status === 'pending' && user.role === 'nurse')}

                        {(application.status === 'pending' || application.status === 'accepted') && (
                          <div className="flex items-center space-x-3">
                            <div className="text-sm text-gray-500">
                              {application.status === 'pending' ? 'Waiting for response...' : 'Application accepted'}
                            </div>
                            {user.role === 'nurse' && (
                              <div className="flex space-x-2">
                                {/* Debug indicator */}
                                <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                  Buttons Available
                                </div>
                                {application.status === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      console.log('✏️ Edit button clicked for application:', application.id);
                                      console.log('✏️ Application data:', application);
                                      setEditingApplication(application);
                                    }}
                                    className="inline-flex items-center px-3 py-2 border border-blue-300 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors"
                                  >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit Offer
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    console.log('🗑️ Cancel button clicked for application:', application.id);
                                    console.log('🗑️ Application data:', application);
                                    handleCancelApplication(application.id);
                                  }}
                                  disabled={cancelingId === application.id}
                                  className="inline-flex items-center px-3 py-2 border border-red-300 text-red-700 rounded-md text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                  {cancelingId === application.id ? (
                                    <>
                                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-700" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Canceling...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                      {application.status === 'pending' ? 'Cancel Application' : 'Withdraw from Job'}
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        {application.request.status === 'in_progress' && user.role === 'patient' && (
                          <div className="text-sm text-gray-500">
                            Service in progress...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Edit Application Modal */}
    {editingApplication && (
      <EditApplicationModal
        application={editingApplication}
        onUpdate={handleUpdateApplication}
        onClose={() => setEditingApplication(null)}
      />
    )}

    </Layout>
  );
}

// Edit Application Modal Component
function EditApplicationModal({
  application,
  onUpdate,
  onClose
}: {
  application: Application;
  onUpdate: (applicationId: string, price: number, estimatedTime: number) => Promise<void>;
  onClose: () => void;
}) {
  const [price, setPrice] = useState(application.price);
  const [estimatedTime, setEstimatedTime] = useState(application.estimatedTime);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (price <= 0 || estimatedTime <= 0) {
      alert('Please enter valid price and time values');
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdate(application.id, price, estimatedTime);
    } catch (error) {
      console.error('Failed to update application:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Edit Your Offer</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Price ($)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              min="1"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Time (hours)
            </label>
            <input
              type="number"
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(Number(e.target.value))}
              min="0.5"
              step="0.5"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Updating...' : 'Update Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
