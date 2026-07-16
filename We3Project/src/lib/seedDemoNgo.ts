/**
 * Links a real demo NGO document in Firestore to an existing Auth/users account.
 * Must be run while signed in as an admin (role assignment + Ngos create require admin).
 *
 * Does not hardcode the NGO into app UI — data lives in Firestore like any real NGO.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { buildDonationPayload, newDonationRef } from './donations';

export const DEMO_NGO_ID = 'we3-ngo-demo';
export const DEMO_NGO_NAME = 'We3 NGO (Demo)';
/** Existing account that should own the demo NGO portal. */
const DEMO_NGO_OWNER_EMAIL = import.meta.env.VITE_DEMO_NGO_OWNER_EMAIL;

export interface SeedDemoNgoResult {
  uid: string;
  ngoId: string;
  email: string;
  message: string;
  createdNgoDoc: boolean;
  roleUpdated: boolean;
}

export class DemoNgoSeedError extends Error {
  consoleSteps: string[];

  constructor(message: string, consoleSteps: string[] = []) {
    super(message);
    this.name = 'DemoNgoSeedError';
    this.consoleSteps = consoleSteps;
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Resolve UID for the owner email from the users collection.
 * Client SDK cannot look up Auth users by email without Admin SDK / password.
 */
async function resolveOwnerUidByEmail(email: string): Promise<{
  uid: string;
  existing: Record<string, unknown>;
}> {
  const target = normalizeEmail(email);

  // Prefer exact match on stored email field
  const byEmail = await getDocs(
    query(collection(db, 'users'), where('email', '==', email), limit(5))
  );

  let match = byEmail.docs.find(
    (d) => normalizeEmail(String(d.data().email || '')) === target
  );

  if (!match && byEmail.empty) {
    // Case-insensitive fallback: some profiles store mixed-case emails
    const byLower = await getDocs(
      query(collection(db, 'users'), where('email', '==', target), limit(5))
    );
    match = byLower.docs[0];
  }

  if (!match) {
    throw new DemoNgoSeedError(
      `No Firestore users document found for ${email}. Auth account may exist but has never signed into the app, or the email field is missing.`,
      [
        'Open Firebase Console → Authentication → Users.',
        `Find ${email} and copy the User UID.`,
        'Open Firestore → users collection.',
        'Create (or open) document users/{UID} with fields at least: uid, email, name/displayName.',
        `Set email to "${email}" exactly (or run Seed Demo NGO again after the user logs in once).`,
        'Then return to Admin Panel and click "Seed Demo NGO" again while signed in as admin.',
      ]
    );
  }

  return { uid: match.id, existing: match.data() as Record<string, unknown> };
}

/**
 * Seeds users/{uid} role=ngo, Ngos/we3-ngo-demo (ownerUid linked), and sample donations.
 * Caller must be authenticated as an admin.
 */
export async function seedDemoNgo(
  ownerEmail: string = DEMO_NGO_OWNER_EMAIL
): Promise<SeedDemoNgoResult> {
  const email = normalizeEmail(ownerEmail);
  const { uid, existing } = await resolveOwnerUidByEmail(email);

  const userRef = doc(db, 'users', uid);
  const ngoRef = doc(db, 'Ngos', DEMO_NGO_ID);
  const priorNgo = await getDoc(ngoRef);

  const batch = writeBatch(db);

  batch.set(
    userRef,
    {
      uid,
      email: existing.email || email,
      name: existing.name || existing.displayName || DEMO_NGO_NAME,
      displayName: existing.displayName || existing.name || DEMO_NGO_NAME,
      username: existing.username || 'we3ngodemo',
      role: 'ngo',
      isVerified: true,
      isVolunteer: existing.isVolunteer === true ? true : false,
      city: existing.city || 'Karachi',
      demoAccount: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  batch.set(
    ngoRef,
    {
      name: DEMO_NGO_NAME,
      ownerUid: uid,
      description:
        existing.description ||
        'Official We3 demo NGO for testing the NGO Portal. Accepts credit donations, individual payments, and in-kind gifts.',
      contact: existing.email || email,
      phone: (existing.phone as string) || '0300-0000000',
      address: (existing.address as string) || 'Demo Street, Clifton',
      city: (existing.city as string) || 'Karachi',
      website: (existing.website as string) || 'https://we3project-vision.web.app',
      bankDetails:
        (existing.bankDetails as string) ||
        'Bank: Demo Bank\nTitle: We3 NGO (Demo)\nIBAN: PK00DEMO0000000000000000',
      easypaisa: (existing.easypaisa as string) || '0300-1111111',
      jazzcash: (existing.jazzcash as string) || '0300-2222222',
      logoUrl: (existing.logoUrl as string) || null,
      qrCodeUrl: (existing.qrCodeUrl as string) || null,
      type: 'ngo',
      category: 'Community',
      verified: true,
      urgent: false,
      goal: 500000,
      received: priorNgo.exists() ? priorNgo.data()?.received ?? 0 : 0,
      latitude: 24.8138,
      longitude: 67.0281,
      demo: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();

  // Sample donations only if none exist yet for this NGO
  const existingSample = await getDoc(doc(db, 'donations', `${DEMO_NGO_ID}-sample-money`));
  if (!existingSample.exists()) {
    const sampleBatch = writeBatch(db);

    sampleBatch.set(
      doc(db, 'donations', `${DEMO_NGO_ID}-sample-money`),
      buildDonationPayload({
        ngoId: DEMO_NGO_ID,
        ngoName: DEMO_NGO_NAME,
        donorId: null,
        donorName: 'Demo Donor (Credits)',
        type: 'money',
        amount: 500,
        status: 'approved',
        source: 'credits',
      })
    );

    sampleBatch.set(
      doc(db, 'donations', `${DEMO_NGO_ID}-sample-review`),
      buildDonationPayload({
        ngoId: DEMO_NGO_ID,
        ngoName: DEMO_NGO_NAME,
        donorId: null,
        donorName: 'Demo Donor (Individual)',
        type: 'money',
        amount: 2000,
        status: 'under_review',
        source: 'individual',
        paymentMethod: 'JazzCash',
        transactionId: 'DEMO-TXN-001',
        adminNote: 'Awaiting receipt verification.',
      })
    );

    sampleBatch.set(
      doc(db, 'donations', `${DEMO_NGO_ID}-sample-food`),
      buildDonationPayload({
        ngoId: DEMO_NGO_ID,
        ngoName: DEMO_NGO_NAME,
        donorId: null,
        donorName: 'Demo Volunteer',
        type: 'food',
        items: 'Food Packages · 10 ration boxes',
        quantity: '10 boxes',
        status: 'under_review',
        source: 'in_kind',
      })
    );

    sampleBatch.set(
      newDonationRef(db),
      buildDonationPayload({
        ngoId: DEMO_NGO_ID,
        ngoName: DEMO_NGO_NAME,
        donorId: null,
        donorName: 'Demo Volunteer',
        type: 'clothes',
        items: 'Clothes · Winter jackets (mixed sizes)',
        quantity: '1 bag',
        status: 'approved',
        source: 'in_kind',
      })
    );

    if (!priorNgo.exists() || !priorNgo.data()?.received) {
      sampleBatch.set(ngoRef, { received: 500 }, { merge: true });
    }

    await sampleBatch.commit();
  }

  return {
    uid,
    ngoId: DEMO_NGO_ID,
    email,
    createdNgoDoc: !priorNgo.exists(),
    roleUpdated: true,
    message: `Demo NGO "${DEMO_NGO_NAME}" linked to ${email} (uid ${uid}). Log in with that account and open NGO Portal.`,
  };
}
