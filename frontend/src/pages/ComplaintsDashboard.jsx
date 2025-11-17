import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { MapPin, AlertTriangle, Eye, Filter, Search, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { getAllComplaints, subscribeToAllComplaints } from '../services/complaintsService';
import 'leaflet/dist/leaflet.css';
import ensureLeafletIcons from '../utils/leafletIcons';

ensureLeafletIcons();

const ComplaintsDashboard = () => {
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    issueType: 'all',
    status: 'all',
    priority: 'all',
    search: ''
  });
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'

  // Default center (Kanpur, India)
  const defaultCenter = [26.4499, 80.3319];
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  useEffect(() => {
    getCurrentLocation();
    setIsLoading(true);
    
    // Subscribe to real-time updates - onValue fires immediately with current data
    const unsubscribe = subscribeToAllComplaints((updatedComplaints) => {
      setComplaints(updatedComplaints);
      
      // Update map center based on complaints
      const complaintsWithLocation = updatedComplaints.filter(c => c.latitude && c.longitude);
      if (complaintsWithLocation.length > 0) {
        const avgLat = complaintsWithLocation.reduce((sum, c) => sum + c.latitude, 0) / complaintsWithLocation.length;
        const avgLng = complaintsWithLocation.reduce((sum, c) => sum + c.longitude, 0) / complaintsWithLocation.length;
        setMapCenter([avgLat, avgLng]);
      }
      
      setIsLoading(false); // Set loading to false when data is received
    });

    return () => unsubscribe();
  }, []);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    // Use watchPosition for better accuracy with auto-stop
    let watchId;
    let accuracyCheckTimeout;
    
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const location = [latitude, longitude];
        
        setUserLocation(location);
        
        // Only update map center if we don't have complaints yet
        if (complaints.length === 0) {
          setMapCenter(location);
        }
        
        // Stop watching if accuracy is good (<= 20 meters)
        if (accuracy != null && accuracy <= 20) {
          if (watchId != null) {
            navigator.geolocation.clearWatch(watchId);
          }
          if (accuracyCheckTimeout) {
            clearTimeout(accuracyCheckTimeout);
          }
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        if (watchId != null) {
          navigator.geolocation.clearWatch(watchId);
        }
        if (accuracyCheckTimeout) {
          clearTimeout(accuracyCheckTimeout);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );

    // Safety timeout - stop after 10 seconds
    accuracyCheckTimeout = setTimeout(() => {
      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId);
      }
    }, 10000);
  };


  const fetchHeatmapData = () => {
    // Generate heatmap data from complaints
    const complaintsWithLocation = complaints.filter(c => c.latitude && c.longitude);
    
    // Group complaints by location (rounded to 3 decimal places ~100m)
    const locationGroups = {};
    complaintsWithLocation.forEach(complaint => {
      const lat = Math.round(complaint.latitude * 1000) / 1000;
      const lng = Math.round(complaint.longitude * 1000) / 1000;
      const key = `${lat},${lng}`;
      
      if (!locationGroups[key]) {
        locationGroups[key] = {
          lat,
          lng,
          count: 0,
          complaints: []
        };
      }
      
      locationGroups[key].count++;
      locationGroups[key].complaints.push(complaint);
    });
    
    setHeatmapData(Object.values(locationGroups));
  };

  // Update heatmap when complaints change
  useEffect(() => {
    fetchHeatmapData();
  }, [complaints]);

  const getStatusIcon = (status) => {
    const icons = {
      pending: { icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
      in_progress: { icon: AlertCircle, color: 'text-blue-600', bgColor: 'bg-blue-100' },
      resolved: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
      rejected: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' }
    };
    return icons[status] || icons.pending;
  };

  const getPriorityColor = (priority) => {
    if (!priority) return 'text-gray-600 bg-gray-100';
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
    if (!complaint) return false;
    
    // Support both camelCase and snake_case field names
    const issueType = complaint.issueType || complaint.issue_type;
    
    if (filters.issueType !== 'all' && issueType !== filters.issueType) {
      return false;
    }
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
    return true;
  });

  // Calculate map center from filtered complaints
  const getMapCenterFromComplaints = () => {
    const complaintsWithLocation = filteredComplaints.filter(c => c.latitude && c.longitude);
    if (complaintsWithLocation.length === 0) {
      return mapCenter;
    }
    
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

  const issueTypes = [
    'all', 'pothole', 'street_light', 'garbage', 'water_leak', 
    'traffic_signal', 'sidewalk_damage', 'drainage', 'other'
  ];

  const statuses = ['all', 'pending', 'in_progress', 'resolved', 'rejected'];
  const priorities = ['all', 'low', 'normal', 'high', 'urgent'];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading complaints...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="glass rounded-2xl shadow-modern p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Complaints Dashboard</h1>
          <div className="flex items-center space-x-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'map' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Map View
              </button>
            </div>
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                showHeatmap 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-100 rounded-2xl p-6 text-center shadow-lg hover:scale-105 transition-transform duration-300">
            <div className="text-4xl font-bold text-blue-600 mb-2">{complaints.length}</div>
            <div className="text-sm font-semibold text-gray-700">Total Issues</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 text-center shadow-lg hover:scale-105 transition-transform duration-300">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {complaints.filter(c => c.status === 'resolved').length}
            </div>
            <div className="text-sm font-semibold text-gray-700">Resolved</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-2xl p-6 text-center shadow-lg hover:scale-105 transition-transform duration-300">
            <div className="text-4xl font-bold text-yellow-600 mb-2">
              {complaints.filter(c => c.status === 'pending').length}
            </div>
            <div className="text-sm font-semibold text-gray-700">Pending</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-2xl p-6 text-center shadow-lg hover:scale-105 transition-transform duration-300">
            <div className="text-4xl font-bold text-red-600 mb-2">
              {complaints.filter(c => c.priority === 'urgent').length}
            </div>
            <div className="text-sm font-semibold text-gray-700">Urgent</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                Issue Type
              </label>
              <select
                value={filters.issueType}
                onChange={(e) => setFilters(prev => ({ ...prev, issueType: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {issueTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Types' : type.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
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
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All Statuses' : status.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
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
                {priorities.map(priority => (
                  <option key={priority} value={priority}>
                    {priority === 'all' ? 'All Priorities' : priority.toUpperCase()}
                  </option>
                ))}
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
                <div
                  key={complaint.id}
                  className="modern-card p-6 border-2 border-gray-100 cursor-pointer"
                  onClick={() => setSelectedComplaint(complaint)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="text-2xl">{getIssueIcon(complaint.issueType || complaint.issue_type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {(complaint.issueType || complaint.issue_type || 'Unknown').replace(/_/g, ' ').toUpperCase()}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(complaint.priority)}`}>
                            {complaint.priority ? complaint.priority.toUpperCase() : 'Unknown'}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-2">{complaint.description}</p>
                        <p className="text-sm text-gray-500 mb-3">{complaint.address}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>ID: #{complaint.id}</span>
                          <span>Department: {complaint.department}</span>
                          <span>Created: {formatDate(complaint.createdAt || complaint.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                        {complaint.status ? complaint.status.replace('_', ' ').toUpperCase() : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Map View */
          <div className="relative">
            <MapContainer
              center={getMapCenterFromComplaints()}
              zoom={filteredComplaints.length === 0 ? 10 : filteredComplaints.length === 1 ? 15 : 13}
              style={{ height: '600px', width: '100%' }}
              key={`${filteredComplaints.length}-${mapCenter[0]}-${mapCenter[1]}`}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* User Location Marker */}
              {userLocation && (
                <Marker position={userLocation}>
                  <Popup>
                    <div className="text-center">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      <strong>Your Location</strong>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Complaint Markers */}
              {filteredComplaints.map((complaint) => {
                const lat = complaint.latitude;
                const lng = complaint.longitude;
                
                if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;
                
                return (
                  <Marker
                    key={complaint.id}
                    position={[lat, lng]}
                  >
                    <Popup>
                      <div className="p-2">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg">{getIssueIcon(complaint.issueType || complaint.issue_type)}</span>
                          <span className="font-semibold text-gray-900">
                            {(complaint.issueType || complaint.issue_type || 'Unknown').replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p><strong>Status:</strong> {complaint.status || 'Unknown'}</p>
                          <p><strong>Priority:</strong> {complaint.priority || 'Unknown'}</p>
                          <p><strong>Department:</strong> {complaint.department || 'Not assigned'}</p>
                          <p><strong>Created:</strong> {formatDate(complaint.createdAt || complaint.created_at)}</p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Red Zones (Heatmap Circles) */}
              {showHeatmap && heatmapData.map((zone, index) => {
                if (!zone.lat || !zone.lng || isNaN(zone.lat) || isNaN(zone.lng)) return null;
                
                return (
                  <Circle
                    key={index}
                    center={[zone.lat, zone.lng]}
                    radius={zone.count * 50} // Radius based on complaint count
                    pathOptions={{
                      color: zone.count > 3 ? '#dc2626' : '#f59e0b', // Red for high density, orange for medium
                      fillColor: zone.count > 3 ? '#dc2626' : '#f59e0b',
                      fillOpacity: zone.count > 3 ? 0.4 : 0.3,
                      weight: 2
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <div className="text-center">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                            zone.count > 3 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            {zone.count} Complaints
                          </div>
                        </div>
                        <div className="mt-2 text-sm">
                          <p className="font-semibold text-gray-900 mb-1">Issues in this area:</p>
                          <div className="space-y-1">
                            {(zone.complaints || []).map((complaint, idx) => (
                              <div key={idx} className="flex items-center space-x-2">
                                <span className="text-sm">{getIssueIcon(complaint.issueType || complaint.issue_type)}</span>
                                <span className="text-xs">
                                  {(complaint.issueType || complaint.issue_type || 'Unknown').replace(/_/g, ' ')} - {complaint.status || 'Unknown'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Circle>
                );
              })}
            </MapContainer>

            {/* Map Legend */}
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10">
              <h3 className="font-semibold text-gray-900 mb-2">Legend</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Resolved</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Pending/In Progress</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Rejected/Urgent</span>
                </div>
                {showHeatmap && (
                  <>
                    <div className="border-t pt-2 mt-2">
                      <p className="font-medium text-gray-700 mb-1">Heat Zones:</p>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-red-500 rounded-full opacity-40"></div>
                        <span>High Density (3+ complaints)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-orange-500 rounded-full opacity-30"></div>
                        <span>Medium Density (2-3 complaints)</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Complaint Details Modal */}
        {selectedComplaint && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Complaint Details</h2>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getIssueIcon(selectedComplaint.issueType || selectedComplaint.issue_type)}</span>
                  <h3 className="text-lg font-semibold">
                    {(selectedComplaint.issueType || selectedComplaint.issue_type || 'Unknown').replace(/_/g, ' ').toUpperCase()}
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Status</label>
                    <p className="text-gray-900">{selectedComplaint.status}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Priority</label>
                    <p className="text-gray-900">{selectedComplaint.priority}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Department</label>
                    <p className="text-gray-900">{selectedComplaint.department}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Complaint ID</label>
                    <p className="text-gray-900">#{selectedComplaint.id}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600">Description</label>
                  <p className="text-gray-900">{selectedComplaint.description}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600">Address</label>
                  <p className="text-gray-900">{selectedComplaint.address}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Created</label>
                    <p className="text-gray-900">{formatDate(selectedComplaint.createdAt || selectedComplaint.created_at)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Last Updated</label>
                    <p className="text-gray-900">{formatDate(selectedComplaint.updatedAt || selectedComplaint.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintsDashboard;
