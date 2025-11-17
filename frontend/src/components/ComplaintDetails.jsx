import React, { useState, useEffect, useMemo } from 'react';
import { X, MapPin, Calendar, User, Building2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { database } from '../firebase';
import { ref, get } from 'firebase/database';

const ComplaintDetails = ({ complaint, onClose, onStatusUpdate }) => {
  const [localComplaint, setLocalComplaint] = useState(complaint);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState(complaint?.status || 'pending');
  const [newPriority, setNewPriority] = useState(complaint?.priority || 'normal');
  const [submitterName, setSubmitterName] = useState(
    complaint?.userName ||
    complaint?.submittedBy ||
    complaint?.user_name ||
    complaint?.userId ||
    complaint?.user_id ||
    'Concerned Citizen'
  );

  useEffect(() => {
    setLocalComplaint(complaint);
    setNewStatus(complaint?.status || 'pending');
    setNewPriority(complaint?.priority || 'normal');
    const initialName =
      complaint?.userName ||
      complaint?.submittedBy ||
      complaint?.user_name ||
      complaint?.userId ||
      complaint?.user_id;
    if (initialName) {
      setSubmitterName(initialName);
    }

    const userId = complaint?.user_id || complaint?.userId;
    if (!userId) {
      if (!initialName) {
        setSubmitterName('Concerned Citizen');
      }
      return;
    }

    let cancelled = false;
    const fetchSubmitter = async () => {
      try {
        const snapshot = await get(ref(database, `users_public/${userId}`));
        if (!cancelled) {
          if (snapshot.exists()) {
            const data = snapshot.val();
            setSubmitterName(data.displayName || data.email || userId);
          } else {
            setSubmitterName(userId);
          }
        }
      } catch (error) {
        console.error('Failed to load submitter profile:', error);
        if (!cancelled) setSubmitterName(userId);
      }
    };

    fetchSubmitter();
    return () => {
      cancelled = true;
    };
  }, [complaint]);

  const handleStatusUpdate = async () => {
    if (!localComplaint?.id || !onStatusUpdate) return;
    try {
      setIsUpdating(true);
      await onStatusUpdate(localComplaint.id, newStatus, newPriority);

      setLocalComplaint(prev => ({
        ...prev,
        status: newStatus,
        priority: newPriority,
        updated_at: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error updating complaint status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: { icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
      in_progress: { icon: AlertTriangle, color: 'text-blue-600', bgColor: 'bg-blue-100' },
      resolved: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' }
    };
    return icons[status] || icons.pending;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-green-600 bg-green-100',
      normal: 'text-blue-600 bg-blue-100',
      high: 'text-orange-600 bg-orange-100',
      urgent: 'text-red-600 bg-red-100'
    };
    return colors[priority] || colors.normal;
  };

  const getIssueIcon = (issueType) => {
    if (!issueType) return '⚠️';
    const icons = {
      pothole: '🕳️',
      street_light: '💡',
      garbage: '🗑️',
      water_leak: '💧',
      traffic_signal: '🚦',
      sidewalk_damage: '🚶',
      drainage: '🌊',
      other: '⚠️'
    };
    return icons[issueType] || '⚠️';
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

  if (!localComplaint) {
    return (
      <div 
        className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <div 
          className="bg-white rounded-2xl p-8 max-w-md w-full shadow-modern"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Complaint Not Found</h3>
            <p className="text-gray-600 mb-4">The requested complaint could not be found.</p>
            <button
              onClick={onClose}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const issueType = localComplaint.issue_type || localComplaint.issueType;
  const formattedIssueLabel = issueType ? issueType.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN';
  const departmentName = localComplaint.department || 'Department';
  const trackingId = `${(departmentName || 'Department').replace(/\s+/g, '')}-TICKET-${localComplaint.id}`;
  const submittedDate = formatDate(localComplaint.created_at || localComplaint.createdAt);
  const citizenName = localComplaint.user_id || localComplaint.userId || 'Concerned Citizen';
  const citizenAddress = localComplaint.address || 'Not Provided';
  const complaintDescription = localComplaint.description || 'Not provided';
  const priorityLabel = (localComplaint.priority || 'normal').toUpperCase();

  const statusConfig = getStatusIcon(localComplaint.status);
  const StatusIcon = statusConfig.icon;

  const formalComplaintText = useMemo(() => {
    if (localComplaint.formal_complaint) return localComplaint.formal_complaint;

    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return (
`Date: ${today}

To,
The ${departmentName} Department
City Administration

Subject: Immediate attention required for ${formattedIssueLabel.toLowerCase()} at ${citizenAddress}

Respected Sir/Madam,

This is to inform you that a ${formattedIssueLabel.toLowerCase()} has been reported through the Nagrik Nivedan Platform with tracking ID ${trackingId}. The issue details are as follows:

- Category: ${formattedIssueLabel} (AI-Identified)
- Priority: ${priorityLabel}
- Description: ${complaintDescription}
- Location: ${citizenAddress}
- Reported By: ${citizenName}
- Submission Time: ${submittedDate}

Given the potential impact of this issue, I request your department to kindly initiate prompt inspection and necessary remedial measures. Please keep the citizen informed through the portal regarding actions taken.

Thank you for your prompt attention to civic welfare.

Sincerely,
Nagrik Nivedan Platform
Complaint ID: ${trackingId}`
    );
  }, [localComplaint, departmentName, formattedIssueLabel, citizenAddress, citizenName, submittedDate, complaintDescription, trackingId, priorityLabel]);

  const imageSrc = useMemo(() => {
    if (!localComplaint) return null;
    if (localComplaint.image_path) {
      return `${API_BASE_URL}/api/image/${localComplaint.image_path}`;
    }
    if (localComplaint.image) {
      const trimmed = localComplaint.image.trim();
      if (trimmed.startsWith('data:image')) return trimmed;
      return `data:image/jpeg;base64,${trimmed}`;
    }
    return null;
  }, [localComplaint]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg max-w-4xl w-full h-full overflow-y-auto mx-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{getIssueIcon(issueType)}</span>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Complaint #{localComplaint.id}
              </h2>
              <p className="text-gray-600">
                {formattedIssueLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors bg-gray-50 hover:bg-gray-200"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Professional Report Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Professional Semantic Report</h2>
                <p className="text-blue-100">AI-Generated Complaint Analysis</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-100">Report ID</p>
                <p className="text-lg font-mono">{trackingId}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm overflow-x-auto">
              <div>
                <span className="text-blue-200">To:</span>
                <p className="font-semibold">{departmentName} Department</p>
              </div>
              <div>
                <span className="text-blue-200">From:</span>
                <p className="font-semibold">Nagrik Nivedan Platform</p>
              </div>
              <div>
                <span className="text-blue-200">Category:</span>
                <p className="font-semibold">{formattedIssueLabel} (AI-Identified)</p>
              </div>
            </div>
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Current Status</h3>
              <div className="flex items-center space-x-2">
                <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                  {localComplaint.status ? localComplaint.status.replace('_', ' ').toUpperCase() : 'Unknown'}
                </span>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Priority</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(localComplaint.priority)}`}>
                {localComplaint.priority ? localComplaint.priority.toUpperCase() : 'Unknown'}
              </span>
            </div>
          </div>

          {/* AI-Generated Semantic Report */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
              <span>🤖</span>
              <span>AI-Generated Semantic Report</span>
            </h3>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <div className="space-y-4">
                {/* AI-Identified Category */}
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-600">Category:</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                    {formattedIssueLabel} (AI-Identified)
                  </span>
                </div>
                
                {/* Urgency & Sentiment Analysis */}
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-600">Urgency:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    localComplaint.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    localComplaint.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    localComplaint.priority === 'normal' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {priorityLabel} Priority
                  </span>
                  <span className="text-sm text-gray-500">• Sentiment: Neutral</span>
                </div>
              </div>
            </div>
          </div>

          {/* Precise Geolocation */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <span>Precise Geolocation</span>
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-x-auto">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Address:</h4>
                  <p className="text-gray-700">{citizenAddress}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Coordinates:</h4>
                  {localComplaint.latitude && localComplaint.longitude ? (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Latitude:</span> {localComplaint.latitude.toFixed(6)}° N
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Longitude:</span> {localComplaint.longitude.toFixed(6)}° E
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        📍 Captured from user's device GPS
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Coordinates not available</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Visual Evidence */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
              <span>📸</span>
              <span>Visual Evidence</span>
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              {imageSrc ? (
                <div className="space-y-3">
                  <div className="relative">
                    <img 
                      src={imageSrc}
                      alt="Complaint Evidence"
                      className="w-full max-w-md h-64 object-cover rounded-lg border border-gray-200 shadow-sm"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                    <div 
                      className="hidden w-full max-w-md h-64 bg-gray-200 rounded-lg border border-gray-200 flex items-center justify-center"
                      style={{display: 'none'}}
                    >
                      <div className="text-center">
                        <span className="text-4xl mb-2 block">📷</span>
                        <p className="text-gray-600">Image not available</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Photo Evidence</p>
                      <p className="text-sm text-gray-600">Submitted by citizen</p>
                    </div>
                    {imageSrc && (
                      <a 
                        href={imageSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        View Full Size →
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📷</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">No Photo Available</p>
                    <p className="text-sm text-gray-600">No visual evidence was submitted with this complaint</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tracking Information */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
              <span>🔍</span>
              <span>Tracking Information</span>
            </h3>
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-x-auto">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Unique Tracking ID:</h4>
                  <p className="text-lg font-mono text-blue-600 bg-white px-3 py-2 rounded border">
                    {trackingId}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Public Dashboard:</h4>
                  <p className="text-sm text-gray-600">
                    Track progress at: <span className="text-blue-600">nagrik-nivedan.gov.in/track/{localComplaint.id}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Formal Complaint Letter */}
          {formalComplaintText && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                <span>📝</span>
                <span>Formal Complaint Letter</span>
              </h3>
              <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="font-mono text-sm text-gray-800 leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded border-l-4 border-blue-500 overflow-x-auto break-words">
                  {formalComplaintText}
                </div>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Submitted</h3>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">{formatDate(localComplaint.created_at || localComplaint.createdAt)}</span>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Last Updated</h3>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">{formatDate(localComplaint.updated_at || localComplaint.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* User Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Submitted By</h3>
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">{submitterName}</span>
            </div>
          </div>

          {/* Department Assignment */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Assigned Department</h3>
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">{departmentName}</span>
            </div>
          </div>

          {/* Status Update Form */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Update Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-x-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex space-x-3">
              <button
                onClick={handleStatusUpdate}
                disabled={isUpdating}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Update Status</span>
                  </>
                )}
              </button>
              
              <button
                onClick={onClose}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetails;
