import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export type UserRole = 'ngo' | 'volunteer' | 'supporter';

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
          if (docSnap.exists()) {
            const data = docSnap.data();
            let role = data.role as UserRole;
            
            // If the user has registered as a volunteer but role isn't set, treat as volunteer
            if (!role && data.isVolunteer) {
              role = 'volunteer';
            }

            // Test User 'blah' Logic
            const nameLower = (data.name || '').toLowerCase();
            const emailLower = (data.email || '').toLowerCase();
            if (nameLower.includes('blah') || emailLower.includes('blah') || emailLower === 'maazstepback@gmail.com') {
              role = 'volunteer';
            }

            setProfile({
              uid: user.uid,
              displayName: data.name || user.displayName || '',
              email: user.email || '',
              photoURL: data.avatarValue || user.photoURL || '',
              role: role || 'supporter',
              isVerified: data.isVerified || false,
              credits: data.credits || 0,
              totalDonated: data.totalDonated || 0,
              isVolunteer: data.isVolunteer || false,
              ...data
            } as UserProfile);
          } else {
            // Default profile for new users who haven't been added to 'users' collection yet
            setProfile({
              uid: user.uid,
              role: 'supporter',
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
