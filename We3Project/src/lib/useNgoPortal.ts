import { useEffect, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { useUserRole, type UserProfile } from './useUserRole';
import type { DonationRecord } from './donations';

export interface NgoDoc {
  id: string;
  name?: string;
  city?: string;
  logoUrl?: string;
  ownerUid?: string;
  received?: number;
  description?: string;
  contact?: string;
  phone?: string;
  address?: string;
  website?: string;
  bankDetails?: string;
  easypaisa?: string;
  jazzcash?: string;
  qrCodeUrl?: string;
}

interface UseNgoPortalOptions {
  /** Max donations to load. Omit or pass a high number for full history. */
  donationLimit?: number;
}

/**
 * Shared NGO Portal data: auth profile, linked Ngos doc (via ownerUid), donations.
 */
export function useNgoPortal(options: UseNgoPortalOptions = {}) {
  const { donationLimit = 50 } = options;
  const { profile, loading: authLoading } = useUserRole();
  const [ngo, setNgo] = useState<NgoDoc | null>(null);
  const [ngoLoading, setNgoLoading] = useState(true);
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [donationsLoading, setDonationsLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'ngo') {
      setNgo(null);
      setNgoLoading(false);
      return;
    }

    setNgoLoading(true);
    const q = query(collection(db, 'Ngos'), where('ownerUid', '==', profile.uid));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setNgo(null);
        } else {
          const docSnap = snapshot.docs[0];
          setNgo({ id: docSnap.id, ...docSnap.data() } as NgoDoc);
        }
        setNgoLoading(false);
      },
      (err) => {
        console.error('Error loading NGO profile:', err);
        setNgo(null);
        setNgoLoading(false);
      }
    );

    return () => unsub();
  }, [profile]);

  useEffect(() => {
    if (!ngo?.id) {
      setDonations([]);
      setDonationsLoading(false);
      return;
    }

    setDonationsLoading(true);
    const q = query(
      collection(db, 'donations'),
      where('ngoId', '==', ngo.id),
      orderBy('timestamp', 'desc'),
      limit(donationLimit)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setDonations(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DonationRecord))
        );
        setDonationsLoading(false);
      },
      (err) => {
        console.error('Error loading donations:', err);
        setDonations([]);
        setDonationsLoading(false);
      }
    );

    return () => unsub();
  }, [ngo?.id, donationLimit]);

  return {
    profile: profile as UserProfile | null,
    authLoading,
    ngo,
    ngoLoading,
    donations,
    donationsLoading,
    loading: authLoading || ngoLoading,
  };
}
