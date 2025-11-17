import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { MapPin, User, AlertTriangle, CheckCircle, Clock, Eye, Map, List, Filter, Search } from 'lucide-react';
import { getUserComplaints, subscribeToUserComplaints } from '../services/complaintsService';
import 'leaflet/dist/leaflet.css';
import ensureLeafletIcons from '../utils/leafletIcons';

ensureLeafletIcons();

const CitizenDashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    search: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0
  });

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return; // Still loading auth state
    }

    // User not authenticated
    if (!user?.uid) {
      setIsLoading(false);
      setComplaints([]);
      return;
    }

    // User is authenticated, subscribe to complaints
    setIsLoading(true);
    
    // Subscribe to real-time updates - onValue fires immediately with current data
    const unsubscribe = subscribeToUserComplaints(user.uid, (updatedComplaints) => {
      setComplaints(updatedComplaints);
      calculateStats(updatedComplaints);
      setIsLoading(false); // Set loading to false when data is received
    });

    return () => unsubscribe();
  }, [user?.uid, authLoading]);

  const calculateStats = (complaints) => {
    const stats = {
      total: complaints.length,
      pending: complaints.filter(c => c.status === 'pending').length,
      inProgress: complaints.filter(c => c.status === 'in_progress').length,
      resolved: complaints.filter(c => c.status === 'resolved').length
    };
    setStats(stats);
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
      // ML Model Classes
      damaged_signs: '🚧',
      fallen_trees: '🌳',
      garbage: '🗑️',
      graffiti: '🎨',
      illegal_parking: '🚗',
      potholes: '🕳️',
      // Additional types
      pothole: '🕳️', // Legacy support
      street_light: '💡',
      water_leak: '💧',
      traffic_signal: '🚦',
      sidewalk_damage: '🚶',
      drainage: '🌊',
      other: '⚠️'
    };
    return icons[issueType] || '⚠️';
  };

  const filteredComplaints = complaints.filter(complaint => {
    if (filters.status !== 'all' && complaint.status !== filters.status) {
      return false;
    }
    if (filters.priority !== 'all' && complaint.priority !== filters.priority) {
      return false;
    }
    if (filters.search && 
        !(complaint.description || '').toLowerCase().includes(filters.search.toLowerCase()) &&
        !(complaint.address || '').toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    // Ensure only current user's complaints are shown
    if (complaint.userId && complaint.userId !== user?.uid) {
      return false;
    }
    return true;
  });

  // Calculate map center from complaints with valid coordinates
  const getMapCenter = () => {
    const complaintsWithLocation = filteredComplaints.filter(c => c.latitude && c.longitude);
    if (complaintsWithLocation.length === 0) {
      // Default to Kanpur, India if no complaints
      return [26.4499, 80.3319];
    }
    
    // Calculate center point of all complaint locations
    const avgLat = complaintsWithLocation.reduce((sum, c) => sum + c.latitude, 0) / complaintsWithLocation.length;
    const avgLng = complaintsWithLocation.reduce((sum, c) => sum + c.longitude, 0) / complaintsWithLocation.length;
    return [avgLat, avgLng];
  };

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
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your complaints...</p>
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
              <User className="w-8 h-8 text-blue-600" />
              <span>My Complaints</span>
            </h1>
            <p className="text-gray-600 mt-2">Track and manage your submitted complaints</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <User className="w-4 h-4" />
            <span>Welcome, {user?.email}</span>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-100 rounded-2xl p-6 text-center shadow-lg hover:scale-105 transition-transform duration-300">
            <div className="text-4xl font-bold text-blue-600 mb-2">{stats.total}</div>
            <div className="text-sm font-semibold text-gray-700">Total Complaints</div>
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
        </div>

        {/* View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'list' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <List className="w-4 h-4" />
              <span>List View</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'map' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Map className="w-4 h-4" />
              <span>Map View</span>
            </button>
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

        {/* Content */}
        {viewMode === 'list' ? (
          /* List View */
          <div className="space-y-4">
            {filteredComplaints.map((complaint) => {
              const statusConfig = getStatusIcon(complaint.status);
              const StatusIcon = statusConfig.icon;
              
              return (
                <div key={complaint.id} className="modern-card p-6 border-2 border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="text-2xl">{getIssueIcon(complaint.issueType || complaint.issue_type)}</span>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {(complaint.issueType || complaint.issue_type || 'Unknown').replace(/_/g, ' ').toUpperCase()}
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
                        <span>Submitted: {formatDate(complaint.createdAt || complaint.created_at)}</span>
                        {complaint.latitude && complaint.longitude && (
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-4 h-4" />
                            <span>Location: {complaint.latitude.toFixed(4)}, {complaint.longitude.toFixed(4)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => setViewMode('map')}
                        className="bg-gradient-to-r from-blue-400 to-cyan-400 text-white px-5 py-2 rounded-xl text-sm font-bold hover:from-blue-500 hover:to-cyan-500 transition-all duration-300 flex items-center space-x-2 shadow-lg shadow-blue-400/50 hover:scale-105"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View on Map</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {filteredComplaints.length === 0 && (
              <div className="text-center py-12">
                <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {complaints.length === 0 ? 'No complaints yet' : 'No complaints found'}
                </h3>
                <p className="text-gray-600">
                  {complaints.length === 0 
                    ? "You haven't submitted any complaints yet. Start by reporting an issue!"
                    : 'No complaints match your current filters.'
                  }
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Map View */
          <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
            <MapContainer
              center={getMapCenter()}
              zoom={filteredComplaints.length === 0 ? 10 : filteredComplaints.length === 1 ? 15 : 13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {filteredComplaints.map((complaint) => {
                // Use camelCase or snake_case for latitude/longitude
                const lat = complaint.latitude;
                const lng = complaint.longitude;
                
                if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;
                
                const statusConfig = getStatusIcon(complaint.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <Marker
                    key={complaint.id}
                    position={[lat, lng]}
                  >
                    <Popup>
                      <div className="p-2">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xl">{getIssueIcon(complaint.issueType || complaint.issue_type)}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {(complaint.issueType || complaint.issue_type || 'Unknown').replace(/_/g, ' ').toUpperCase()}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(complaint.priority)}`}>
                              {complaint.priority ? complaint.priority.toUpperCase() : 'Unknown'}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{complaint.description}</p>
                        <p className="text-xs text-gray-500 mb-2">{complaint.address}</p>
                        <div className="flex items-center space-x-2">
                          <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                          <span className={`text-sm font-medium ${statusConfig.color}`}>
                            {complaint.status ? complaint.status.replace('_', ' ').toUpperCase() : 'Unknown'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          ID: #{complaint.id} | {formatDate(complaint.createdAt || complaint.created_at)}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default CitizenDashboard;
