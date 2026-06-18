import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export type UserRole = 'ngo' | 'volunteer' | 'supporter' | 'admin';

export interface UserProfile {
  uid: string;
  role: UserRole;
  isVerified: boolean;
  displayName: string;
  email: string;
  photoURL?: string;
  credits?: number;
  totalDonated?: number;
  isVolunteer?: boolean;
  lastAdReset?: any;
  videosToday?: number;
  avatarType?: string;
  avatarValue?: string;
  avatarBg?: string;
  username?: string;
  name?: string;
  city?: string;
  streak?: number;
}

export const useUserRole = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Use onSnapshot for real-time updates if the user's role or verification changes
        const docRef = doc(db, 'users', user.uid);
        const unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
          let role: UserRole = 'supporter';
          let userData: any = {};

          if (docSnap.exists()) {
            userData = docSnap.data();
            role = userData.role as UserRole;
            
            // If the user has registered as a volunteer but role isn't set, treat as volunteer
            if (!role && userData.isVolunteer) {
              role = 'volunteer';
            }
          }

          // Admin/Volunteer Quick Access Logic (Overrides Firestore role for dev/testing)
          const emailLower = (userData.email || user.email || '').toLowerCase();
          const nameLower = (userData.name || user.displayName || '').toLowerCase();
          
          if (
            emailLower === 'maazology@gmail.com' || 
            emailLower === 'maazstepback@gmail.com'
          ) {
            role = 'admin';
          } else if (nameLower.includes('blah') || emailLower.includes('blah')) {
            role = 'volunteer';
          }

          if (docSnap.exists()) {
            setProfile({
              uid: user.uid,
              displayName: userData.name || user.displayName || '',
              email: user.email || '',
              photoURL: userData.avatarValue || user.photoURL || '',
              credits: userData.credits || 0,
              totalDonated: userData.totalDonated || 0,
              isVolunteer: userData.isVolunteer || false,
              isVerified: userData.isVerified || false,
              ...userData,
              role: role // Role must be last to ensure it takes precedence
            } as UserProfile);
          } else {
            // Default profile for new users
            setProfile({
              uid: user.uid,
              role: role,
              isVerified: false,
              displayName: user.displayName || '',
              email: user.email || '',
              photoURL: user.photoURL || '',
              credits: 0,
              totalDonated: 0,
              isVolunteer: false
            });
          }
          setLoading(false);
        }, (err) => {
          console.error("Error fetching user profile:", err);
          setLoading(false);
        });

        return () => unsubscribeDoc();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return { profile, loading };
};
