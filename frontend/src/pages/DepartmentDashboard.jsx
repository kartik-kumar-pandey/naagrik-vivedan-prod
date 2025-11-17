import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Building2, Users, AlertTriangle, CheckCircle, Clock, TrendingUp, Filter, Search, Eye, MapPin, ListFilter } from 'lucide-react';
import { subscribeToAllComplaints, updateComplaintStatus, updateComplaint } from '../services/complaintsService';
import toast from 'react-hot-toast';
import ComplaintDetails from '../components/ComplaintDetails.jsx';

const DepartmentDashboard = () => {
  const { user, getDepartment } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    search: ''
  });
  const [sortView, setSortView] = useState('all'); // 'all', 'resolved', 'non-resolved'
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    urgent: 0
  });
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const department = getDepartment();

  useEffect(() => {
    if (department) {
      setIsLoading(true);
      
      // Subscribe to real-time updates - onValue fires immediately with current data
      // Filter by department (case-insensitive matching for robustness)
      const unsubscribe = subscribeToAllComplaints((allComplaints) => {
        // Filter complaints for this department
        // Use case-insensitive matching to handle any variations
        const departmentComplaints = allComplaints.filter(complaint => {
          const complaintDept = (complaint.department || '').toString().trim();
          const userDept = (department || '').toString().trim();
          return complaintDept.toLowerCase() === userDept.toLowerCase();
        });
        
        setComplaints(departmentComplaints);
        calculateStats(departmentComplaints);
        setIsLoading(false); // Set loading to false when data is received
      });

      return () => unsubscribe();
    } else {
      setIsLoading(false);
      setComplaints([]);
    }
  }, [department]);

  const calculateStats = (complaints) => {
    const stats = {
      total: complaints.length,
      pending: complaints.filter(c => c.status === 'pending').length,
      inProgress: complaints.filter(c => c.status === 'in_progress').length,
      resolved: complaints.filter(c => c.status === 'resolved').length,
      urgent: complaints.filter(c => c.priority === 'urgent').length
    };
    setStats(stats);
  };

  const handleStatusUpdate = async (complaintId, newStatus, newPriority = null) => {
    try {
      // Update in Firebase (real-time sync for all officials)
      await updateComplaintStatus(complaintId, newStatus, user?.uid);
      
      // If priority is provided, update it as well
      if (newPriority) {
        await updateComplaint(complaintId, { priority: newPriority });
      }
      
      toast.success('Complaint status updated successfully');
      // Note: The real-time subscription will automatically update the UI
      // No need to manually update state - Firebase handles it
    } catch (error) {
      console.error('Error updating complaint status:', error);
      toast.error('Failed to update complaint status. Please try again.');
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

  const filteredComplaints = complaints.filter(complaint => {
    if (filters.status !== 'all' && complaint.status !== filters.status) {
      return false;
    }
    if (filters.priority !== 'all' && complaint.priority !== filters.priority) {
      return false;
    }
    if (filters.search && !complaint.description.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Separate resolved and non-resolved complaints
  const resolvedComplaints = filteredComplaints.filter(complaint => complaint.status === 'resolved');
  const nonResolvedComplaints = filteredComplaints.filter(complaint => complaint.status !== 'resolved');

  // Get complaints to display based on sort view
  const getDisplayedComplaints = () => {
    if (sortView === 'resolved') {
      return resolvedComplaints;
    } else if (sortView === 'non-resolved') {
      return nonResolvedComplaints;
    }
    return filteredComplaints;
  };

  const displayedComplaints = getDisplayedComplaints();

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="glass rounded-2xl shadow-modern p-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading {department} complaints...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="glass rounded-2xl shadow-modern p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              <span>{department} Dashboard</span>
            </h1>
            <p className="text-gray-600 mt-2">Manage and track complaints for your department</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Users className="w-4 h-4" />
            <span>Welcome, {user?.email}</span>
          </div>
        </div>


        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-100 rounded-2xl p-6 text-center shadow-lg hover:scale-105 transition-transform duration-300">
            <div className="text-4xl font-bold text-blue-600 mb-2">{stats.total}</div>
            <div className="text-sm font-semibold text-gray-700">Total Issues</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-2xl p-6 text-center shadow-lg hover:scale-105 transition-transform duration-300">
            <div className="text-4xl font-bold text-yellow-600 mb-2">{stats.pending}</div>
            <div className="text-sm font-semibold text-gray-700">Pending</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 text-center shadow-lg hover:scale-105 transition-transform duration-300">
            <div className="text-4xl font-bold text-blue-600 mb-2">{stats.inProgress}</div>
            <div className="text-sm font-semibold text-gray-700">In Progress</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 text-center shadow-lg hover:scale-105 transition-transform duration-300">
            <div className="text-4xl font-bold text-green-600 mb-2">{stats.resolved}</div>
            <div className="text-sm font-semibold text-gray-700">Resolved</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-2xl p-6 text-center shadow-lg hover:scale-105 transition-transform duration-300">
            <div className="text-4xl font-bold text-red-600 mb-2">{stats.urgent}</div>
            <div className="text-sm font-semibold text-gray-700">Urgent</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Search complaints..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
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
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sort/View Toggle */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 mb-6 border-2 border-blue-200">
          <div className="flex items-center space-x-2 mb-3">
            <ListFilter className="w-5 h-5 text-blue-600" />
            <label className="block text-sm font-semibold text-gray-700">
              View Complaints
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSortView('all')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 ${
                sortView === 'all'
                  ? 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow-lg shadow-blue-400/50 scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
              }`}
            >
              <span>All Complaints</span>
              <span className="bg-white/20 px-2 py-1 rounded-full text-xs font-bold">
                {filteredComplaints.length}
              </span>
            </button>
            <button
              onClick={() => setSortView('non-resolved')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 ${
                sortView === 'non-resolved'
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-lg shadow-yellow-400/50 scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Non-Resolved</span>
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                sortView === 'non-resolved' ? 'bg-white/20' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {nonResolvedComplaints.length}
              </span>
            </button>
            <button
              onClick={() => setSortView('resolved')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 ${
                sortView === 'resolved'
                  ? 'bg-gradient-to-r from-green-400 to-emerald-400 text-white shadow-lg shadow-green-400/50 scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>Resolved</span>
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                sortView === 'resolved' ? 'bg-white/20' : 'bg-green-100 text-green-700'
              }`}>
                {resolvedComplaints.length}
              </span>
            </button>
          </div>
        </div>

        {/* Complaints List */}
        <div className="space-y-4">
          {displayedComplaints.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-700">
                {sortView === 'resolved' && `Resolved Complaints (${resolvedComplaints.length})`}
                {sortView === 'non-resolved' && `Non-Resolved Complaints (${nonResolvedComplaints.length})`}
                {sortView === 'all' && `All Complaints (${filteredComplaints.length})`}
              </h3>
            </div>
          )}
          {displayedComplaints.map((complaint) => {
            const statusConfig = getStatusIcon(complaint.status);
            const StatusIcon = statusConfig.icon;
            
            return (
              <div key={complaint.id} className="modern-card p-6 border-2 border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {complaint.issue_type ? complaint.issue_type.replace('_', ' ').toUpperCase() : 'Unknown'}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(complaint.priority)}`}>
                        {complaint.priority ? complaint.priority.toUpperCase() : 'Unknown'}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                        <StatusIcon className="w-4 h-4 inline mr-1" />
                        {complaint.status ? complaint.status.replace('_', ' ').toUpperCase() : 'Unknown'}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-2">{complaint.description}</p>
                    <p className="text-sm text-gray-500 mb-3">{complaint.address}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>ID: #{complaint.id}</span>
                      <span>Created: {formatDate(complaint.created_at)}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => setSelectedComplaint(complaint)}
                      className="bg-gradient-to-r from-blue-400 to-cyan-400 text-white px-5 py-2 rounded-xl text-sm font-bold hover:from-blue-500 hover:to-cyan-500 transition-all duration-300 flex items-center space-x-2 shadow-lg shadow-blue-400/50 hover:scale-105"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        if (complaint.latitude && complaint.longitude) {
                          // Open Google Maps with the complaint coordinates
                          const mapsUrl = `https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`;
                          window.open(mapsUrl, '_blank');
                        } else {
                          // If no coordinates, try to geocode the address
                          const encodedAddress = encodeURIComponent(complaint.address);
                          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
                          window.open(mapsUrl, '_blank');
                        }
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>View on Map</span>
                    </button>
                    
                    {complaint.status === 'pending' && (
                      <button
                        onClick={() => handleStatusUpdate(complaint.id, 'in_progress')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        Start Work
                      </button>
                    )}
                    {complaint.status === 'in_progress' && (
                      <button
                        onClick={() => handleStatusUpdate(complaint.id, 'resolved')}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                      >
                        Mark Resolved
                      </button>
                    )}
                    {complaint.status === 'resolved' && (
                      <span className="text-green-600 text-sm font-medium">
                        ✓ Completed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {displayedComplaints.length === 0 && (
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {complaints.length === 0 
                  ? 'No complaints yet' 
                  : sortView === 'resolved'
                    ? 'No resolved complaints found'
                    : sortView === 'non-resolved'
                      ? 'No non-resolved complaints found'
                      : 'No complaints found'
                }
              </h3>
              <p className="text-gray-600">
                {complaints.length === 0 
                  ? `No complaints have been assigned to ${department} yet.`
                  : sortView === 'resolved'
                    ? 'There are no resolved complaints matching your filters.'
                    : sortView === 'non-resolved'
                      ? 'There are no non-resolved complaints matching your filters.'
                      : 'No complaints match your current filters.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Complaint Details Modal */}
      {selectedComplaint && (
        <ComplaintDetails
          complaint={selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
};

export default DepartmentDashboard;
