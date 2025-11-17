import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, Clock, MapPin, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { getComplaintById } from '../services/complaintsService';

const TrackComplaint = () => {
  const [searchParams] = useSearchParams();
  const [complaintId, setComplaintId] = useState(searchParams.get('complaint_id') || '');
  const [complaint, setComplaint] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const statusConfig = {
    pending: { 
      icon: Clock, 
      color: 'text-yellow-600', 
      bgColor: 'bg-yellow-100',
      label: 'Pending Review'
    },
    in_progress: { 
      icon: AlertCircle, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-100',
      label: 'In Progress'
    },
    resolved: { 
      icon: CheckCircle, 
      color: 'text-green-600', 
      bgColor: 'bg-green-100',
      label: 'Resolved'
    },
    rejected: { 
      icon: XCircle, 
      color: 'text-red-600', 
      bgColor: 'bg-red-100',
      label: 'Rejected'
    }
  };

  const priorityConfig = {
    low: { color: 'text-green-600', bgColor: 'bg-green-100', label: 'Low' },
    normal: { color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Normal' },
    high: { color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'High' },
    urgent: { color: 'text-red-600', bgColor: 'bg-red-100', label: 'Urgent' }
  };

  const fetchComplaint = async (id) => {
    if (!id) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const complaintData = await getComplaintById(id);
      if (complaintData) {
        setComplaint(complaintData);
      } else {
        setError('Complaint not found. Please check your complaint ID.');
        toast.error('Complaint not found');
        setComplaint(null);
      }
    } catch (error) {
      console.error('Error fetching complaint:', error);
      setError('Failed to fetch complaint. Please try again.');
      toast.error('Failed to fetch complaint');
      setComplaint(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (complaintId) {
      fetchComplaint(complaintId);
    }
  }, [complaintId]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (complaintId) {
      fetchComplaint(complaintId);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getStatusIcon = (status) => {
    if (!status) return null;
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return <Icon className={`w-6 h-6 ${config.color}`} />;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass rounded-2xl shadow-modern p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Track Your Complaint</h1>
        
        {/* Search Form */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <form onSubmit={handleSearch} className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={complaintId}
                onChange={(e) => setComplaintId(e.target.value)}
                placeholder="Enter your complaint ID"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !complaintId}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Search className="w-5 h-5" />
              <span>{isLoading ? 'Searching...' : 'Search'}</span>
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading complaint details...</p>
          </div>
        )}

        {/* Complaint Details */}
        {complaint && (
          <div className="space-y-6">
            {/* Status Card */}
            <div className="modern-card p-6 border-2 border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Complaint Status</h2>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(complaint.status)}
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    statusConfig[complaint.status]?.bgColor || 'bg-gray-100'
                  } ${statusConfig[complaint.status]?.color || 'text-gray-600'}`}>
                    {statusConfig[complaint.status]?.label || complaint.status || 'Unknown'}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Complaint ID</p>
                  <p className="font-semibold text-gray-900">#{complaint.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Issue Type</p>
                  <p className="font-semibold text-gray-900 capitalize">
                    {(complaint.issueType || complaint.issue_type || 'Unknown').replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Priority</p>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    priorityConfig[complaint.priority]?.bgColor || 'bg-gray-100'
                  } ${priorityConfig[complaint.priority]?.color || 'text-gray-600'}`}>
                    {priorityConfig[complaint.priority]?.label || complaint.priority}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Department</p>
                  <p className="font-semibold text-gray-900">{complaint.department || 'Not assigned'}</p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="modern-card p-6 border-2 border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-blue-600 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-gray-900">Complaint Submitted</p>
                    <p className="text-sm text-gray-600">{formatDate(complaint.createdAt || complaint.created_at)}</p>
                  </div>
                </div>
                
                {complaint.status === 'in_progress' && (
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-yellow-600 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">Under Review</p>
                      <p className="text-sm text-gray-600">Your complaint is being reviewed by the department</p>
                    </div>
                  </div>
                )}
                
                {complaint.status === 'resolved' && (
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-green-600 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">Resolved</p>
                      <p className="text-sm text-gray-600">Your complaint has been resolved</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-gray-400 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-gray-900">Last Updated</p>
                    <p className="text-sm text-gray-600">{formatDate(complaint.updatedAt || complaint.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
              <p className="text-gray-800 mb-4">
                If you have any questions about your complaint or need to provide additional information, 
                please contact the {complaint.department} department.
              </p>
              <div className="flex space-x-4">
                <button className="bg-blue-400 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors font-semibold">
                  Contact Department
                </button>
                <button className="bg-white text-blue-700 px-4 py-2 rounded-lg border-2 border-blue-400 hover:bg-blue-50 transition-colors font-semibold">
                  Add Comment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Complaint State */}
        {!complaint && !isLoading && !error && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Track Your Complaint</h3>
            <p className="text-gray-600 mb-6">
              Enter your complaint ID above to view the status and updates.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackComplaint;
