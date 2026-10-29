import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, loginWithGoogle, logoutUser, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  activeRole: UserRole;
  isSimulatedRole: boolean;
  setSimulatedRole: (role: UserRole | null) => void;
  loading: boolean;
  canManageTeam: boolean;
  canEditInventory: boolean;
  canDeleteRecords: boolean;
  canViewFinancials: boolean;
  canManageVendors: boolean;
  canImportCSV: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserRole: (uid: string, newRole: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const OWNER_EMAIL = 'ecomtanger1@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [simulatedRole, setSimulatedRoleState] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userSnapshot = await getDoc(userDocRef);

          const isOwner = currentUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();

          if (userSnapshot.exists()) {
            const data = userSnapshot.data() as UserProfile;
            // Ensure owner always maintains admin role
            if (isOwner && data.role !== 'admin') {
              const updatedProfile: UserProfile = { ...data, role: 'admin' };
              await setDoc(userDocRef, updatedProfile, { merge: true });
              setProfile(updatedProfile);
            } else {
              setProfile(data);
            }
          } else {
            // New user registration
            const defaultRole: UserRole = isOwner ? 'admin' : 'manager';
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || 'user@marketplace.local',
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Team Member',
              role: defaultRole,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, newProfile);
            
            if (defaultRole === 'admin') {
              try {
                await setDoc(doc(db, 'admins', currentUser.uid), {
                  email: currentUser.email || '',
                  assignedAt: new Date().toISOString(),
                });
              } catch (e) {
                console.warn('Could not set admin doc flag:', e);
              }
            }
            setProfile(newProfile);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          // Fallback profile if offline
          setProfile({
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || 'Seller',
            role: currentUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase() ? 'admin' : 'manager',
          });
        }
      } else {
        // Guest default: Demo seller admin so the user can interact instantly
        setProfile({
          uid: 'demo-user-1',
          email: OWNER_EMAIL,
          displayName: 'Marketplace Owner (Demo)',
          role: 'admin',
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const activeRole: UserRole = simulatedRole || profile?.role || 'admin';
  const isSimulatedRole = simulatedRole !== null;

  const canManageTeam = activeRole === 'admin';
  const canEditInventory = ['admin', 'manager', 'staff'].includes(activeRole);
  const canDeleteRecords = ['admin', 'manager'].includes(activeRole);
  const canViewFinancials = ['admin', 'manager'].includes(activeRole);
  const canManageVendors = ['admin', 'manager'].includes(activeRole);
  const canImportCSV = ['admin', 'manager'].includes(activeRole);

  const login = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Google sign in error', err);
    }
  };

  const logout = async () => {
    await logoutUser();
    setSimulatedRoleState(null);
  };

  const setSimulatedRole = (role: UserRole | null) => {
    setSimulatedRoleState(role);
  };

  const updateUserRole = async (uid: string, newRole: UserRole) => {
    if (!canManageTeam && !user) {
      // Local fallback update for demo
      return;
    }
    const path = `users/${uid}`;
    try {
      await setDoc(doc(db, 'users', uid), { role: newRole, updatedAt: new Date().toISOString() }, { merge: true });
      if (newRole === 'admin') {
        await setDoc(doc(db, 'admins', uid), { assignedAt: new Date().toISOString() });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        activeRole,
        isSimulatedRole,
        setSimulatedRole,
        loading,
        canManageTeam,
        canEditInventory,
        canDeleteRecords,
        canViewFinancials,
        canManageVendors,
        canImportCSV,
        login,
        logout,
        updateUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
