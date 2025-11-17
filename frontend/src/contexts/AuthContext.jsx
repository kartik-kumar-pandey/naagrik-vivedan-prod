import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { ref, set, get, update } from 'firebase/database';
import { auth, database } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if Firebase is initialized
    if (!auth || !database) {
      console.warn('[AuthContext] Firebase not initialized. Please set Firebase environment variables.');
      setIsLoading(false);
      return;
    }

    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch additional user data from Realtime Database
        try {
          const userRef = ref(database, `users/${firebaseUser.uid}`);
          const snapshot = await get(userRef);
          
          if (snapshot.exists()) {
            const userData = snapshot.val();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || userData.displayName || '',
              userType: userData.userType || 'citizen',
              department: userData.department || null,
              isAuthenticated: true
            });
          } else {
            // New user, set default values
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || '',
              userType: 'citizen',
              department: null,
              isAuthenticated: true
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || '',
            userType: 'citizen',
            department: null,
            isAuthenticated: true
          });
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    if (!auth) {
      return { success: false, error: 'Firebase is not initialized. Please check environment variables.' };
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signUp = async (email, password, userData = {}) => {
    if (!auth || !database) {
      return { success: false, error: 'Firebase is not initialized. Please check environment variables.' };
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update Firebase Auth profile if display name is provided
      if (userData.displayName) {
        await updateProfile(userCredential.user, {
          displayName: userData.displayName
        });
      }

      // Save additional user data to Realtime Database
      const userRef = ref(database, `users/${userCredential.user.uid}`);
      const userProfile = {
        email: email,
        displayName: userData.displayName || '',
        userType: userData.userType || 'citizen',
        department: userData.department || null,
        createdAt: new Date().toISOString()
      };
      await set(userRef, userProfile);

      // Public profile (readable by officials for attribution)
      const publicRef = ref(database, `users_public/${userCredential.user.uid}`);
      await set(publicRef, {
        displayName: userProfile.displayName || email,
        userType: userProfile.userType || 'citizen',
        department: userProfile.department || null
      });

      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    if (!auth) {
      setUser(null);
      return;
    }
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateUserData = async (userData) => {
    if (!user?.uid || !database) return;

    try {
      const userRef = ref(database, `users/${user.uid}`);
      const profileUpdate = {
        ...userData,
        updatedAt: new Date().toISOString()
      };
      await update(userRef, profileUpdate);

      const publicRef = ref(database, `users_public/${user.uid}`);
      await update(publicRef, {
        displayName: userData.displayName || user?.displayName || userData.email || '',
        userType: userData.userType || user?.userType || 'citizen',
        department: userData.department || user?.department || null,
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setUser(prev => ({ ...prev, ...userData }));
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  };

  // Legacy method for backward compatibility
  const login = (userData) => {
    // This is now handled by Firebase Auth, but kept for compatibility
    console.warn('login() method is deprecated. Use signIn() or signUp() instead.');
  };

  const isAuthenticated = () => {
    return user && user.isAuthenticated;
  };

  const isCitizen = () => {
    return user && user.userType === 'citizen';
  };

  const isOfficial = () => {
    return user && user.userType === 'official';
  };

  const getDepartment = () => {
    return user?.department || null;
  };

  const value = {
    user,
    isLoading,
    signIn,
    signUp,
    logout,
    login, // Kept for backward compatibility
    updateUserData,
    isAuthenticated,
    isCitizen,
    isOfficial,
    getDepartment
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
