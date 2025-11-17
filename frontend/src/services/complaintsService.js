// Firebase Realtime Database service for complaints
import { ref, push, set, get, update, query, orderByChild, equalTo, onValue, off } from 'firebase/database';
import { database } from '../firebase';

/**
 * Create a new complaint in Firebase Realtime Database
 * @param {Object} complaintData - The complaint data to save
 * @param {string} userId - The user ID who created the complaint
 * @returns {Promise<string>} - The complaint ID
 */
export const createComplaint = async (complaintData, userId) => {
  try {
    const complaintsRef = ref(database, 'complaints');
    const newComplaintRef = push(complaintsRef);
    
    const complaint = {
      ...complaintData,
      userId,
      id: newComplaintRef.key,
      status: complaintData.status || 'pending',
      priority: complaintData.priority || 'normal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await set(newComplaintRef, complaint);
    return newComplaintRef.key;
  } catch (error) {
    console.error('Error creating complaint:', error);
    throw error;
  }
};

/**
 * Get a single complaint by ID
 * @param {string} complaintId - The complaint ID
 * @returns {Promise<Object|null>} - The complaint data or null if not found
 */
export const getComplaintById = async (complaintId) => {
  try {
    const complaintRef = ref(database, `complaints/${complaintId}`);
    const snapshot = await get(complaintRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error('Error getting complaint:', error);
    throw error;
  }
};

/**
 * Get all complaints for a specific user
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} - Array of complaints
 */
export const getUserComplaints = async (userId) => {
  try {
    const complaintsRef = ref(database, 'complaints');
    const userComplaintsQuery = query(complaintsRef, orderByChild('userId'), equalTo(userId));
    const snapshot = await get(userComplaintsQuery);
    
    if (snapshot.exists()) {
      const complaints = snapshot.val();
      return Object.keys(complaints).map(key => ({
        id: key,
        ...complaints[key]
      }));
    }
    return [];
  } catch (error) {
    console.error('Error getting user complaints:', error);
    throw error;
  }
};

/**
 * Get all complaints (for officials/admin)
 * @param {Object} filters - Optional filters (status, department, etc.)
 * @returns {Promise<Array>} - Array of all complaints
 */
export const getAllComplaints = async (filters = {}) => {
  try {
    const complaintsRef = ref(database, 'complaints');
    const snapshot = await get(complaintsRef);
    
    if (snapshot.exists()) {
      const complaints = snapshot.val();
      let allComplaints = Object.keys(complaints).map(key => ({
        id: key,
        ...complaints[key]
      }));

      // Apply filters
      if (filters.status) {
        allComplaints = allComplaints.filter(c => c.status === filters.status);
      }
      if (filters.department) {
        allComplaints = allComplaints.filter(c => c.department === filters.department);
      }
      if (filters.userId) {
        allComplaints = allComplaints.filter(c => c.userId === filters.userId);
      }

      return allComplaints;
    }
    return [];
  } catch (error) {
    console.error('Error getting all complaints:', error);
    throw error;
  }
};

/**
 * Update a complaint
 * @param {string} complaintId - The complaint ID
 * @param {Object} updates - The fields to update
 * @returns {Promise<void>}
 */
export const updateComplaint = async (complaintId, updates) => {
  try {
    const complaintRef = ref(database, `complaints/${complaintId}`);
    await update(complaintRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating complaint:', error);
    throw error;
  }
};

/**
 * Update complaint status
 * @param {string} complaintId - The complaint ID
 * @param {string} status - The new status
 * @param {string} updatedBy - The user ID who updated it
 * @returns {Promise<void>}
 */
export const updateComplaintStatus = async (complaintId, status, updatedBy = null) => {
  try {
    const updates = {
      status,
      updatedAt: new Date().toISOString()
    };
    
    if (updatedBy) {
      updates.updatedBy = updatedBy;
    }
    
    await updateComplaint(complaintId, updates);
  } catch (error) {
    console.error('Error updating complaint status:', error);
    throw error;
  }
};

/**
 * Listen to real-time updates for user complaints
 * @param {string} userId - The user ID
 * @param {Function} callback - Callback function that receives the complaints array
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToUserComplaints = (userId, callback) => {
  try {
    const complaintsRef = ref(database, 'complaints');
    const userComplaintsQuery = query(complaintsRef, orderByChild('userId'), equalTo(userId));
    
    const unsubscribe = onValue(userComplaintsQuery, (snapshot) => {
      if (snapshot.exists()) {
        const complaints = snapshot.val();
        const complaintsArray = Object.keys(complaints).map(key => ({
          id: key,
          ...complaints[key]
        }));
        callback(complaintsArray);
      } else {
        // No complaints found - still call callback with empty array
        callback([]);
      }
    }, (error) => {
      console.error('Error subscribing to complaints:', error);
      // On error, still call callback with empty array to indicate data was attempted
      callback([]);
    });

    return () => {
      try {
        off(userComplaintsQuery, 'value', unsubscribe);
      } catch (e) {
        console.error('Error unsubscribing:', e);
      }
    };
  } catch (error) {
    console.error('Error setting up subscription:', error);
    // If subscription setup fails, still call callback to stop loading
    callback([]);
    return () => {}; // Return empty unsubscribe function
  }
};

/**
 * Listen to real-time updates for all complaints (for officials)
 * @param {Function} callback - Callback function that receives the complaints array
 * @param {Object} filters - Optional filters
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToAllComplaints = (callback, filters = {}) => {
  try {
    const complaintsRef = ref(database, 'complaints');
    
    const unsubscribe = onValue(complaintsRef, (snapshot) => {
      if (snapshot.exists()) {
        const complaints = snapshot.val();
        let allComplaints = Object.keys(complaints).map(key => ({
          id: key,
          ...complaints[key]
        }));

        // Apply filters
        if (filters.status) {
          allComplaints = allComplaints.filter(c => c.status === filters.status);
        }
        if (filters.department) {
          allComplaints = allComplaints.filter(c => c.department === filters.department);
        }

        // Sort by createdAt (newest first)
        allComplaints.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.created_at || 0);
          const dateB = new Date(b.createdAt || b.created_at || 0);
          return dateB - dateA;
        });

        callback(allComplaints);
      } else {
        // No complaints found - still call callback with empty array
        callback([]);
      }
    }, (error) => {
      console.error('Error subscribing to all complaints:', error);
      // On error, still call callback with empty array to indicate data was attempted
      callback([]);
    });

    return () => {
      try {
        off(complaintsRef, 'value', unsubscribe);
      } catch (e) {
        console.error('Error unsubscribing:', e);
      }
    };
  } catch (error) {
    console.error('Error setting up subscription:', error);
    // If subscription setup fails, still call callback to stop loading
    callback([]);
    return () => {}; // Return empty unsubscribe function
  }
};

/**
 * Get complaints for map view (within a bounding box or all)
 * @returns {Promise<Array>} - Array of complaints with location data
 */
export const getComplaintsForMap = async () => {
  try {
    const complaintsRef = ref(database, 'complaints');
    const snapshot = await get(complaintsRef);
    
    if (snapshot.exists()) {
      const complaints = snapshot.val();
      const complaintsArray = Object.keys(complaints)
        .map(key => ({
          id: key,
          ...complaints[key]
        }))
        .filter(c => c.latitude && c.longitude); // Only return complaints with location data
      
      return complaintsArray;
    }
    return [];
  } catch (error) {
    console.error('Error getting complaints for map:', error);
    throw error;
  }
};


