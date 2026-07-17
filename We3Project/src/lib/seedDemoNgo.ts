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
/** .email stuff reason aalas firebase me dalne me. */
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

/** Realistic demo profiles keyed by common names / used as fallbacks for unlabeled NGOs. */
const DEMO_NGO_PROFILES: Array<{
  match: RegExp;
  name: string;
  description: string;
  city: string;
  address: string;
  phone: string;
  contact: string;
  website: string;
  bankDetails: string;
  easypaisa: string;
  jazzcash: string;
  registrationNumber: string;
  registrationType: string;
  yearEstablished: string;
  category: string;
  goal: number;
  latitude: number;
  longitude: number;
}> = [
  {
    match: /we3|demo/i,
    name: DEMO_NGO_NAME,
    description:
      'Community relief NGO focused on meal drives, school support, and emergency aid across Karachi.',
    city: 'Karachi',
    address: '12 Demo Street, Clifton Block 5, Karachi',
    phone: '021-34567890',
    contact: 'donations@we3demo.org',
    website: 'https://we3project-vision.web.app',
    bankDetails:
      'Bank: Meezan Bank\nTitle: We3 NGO (Demo)\nAccount: 0123456789012\nIBAN: PK36MEZN0000123456789012\nBranch: Clifton, Karachi',
    easypaisa: '0301-2345678',
    jazzcash: '0302-8765432',
    registrationNumber: 'RS/2021/WE3-DEMO',
    registrationType: 'Societies',
    yearEstablished: '2021',
    category: 'Community',
    goal: 500000,
    latitude: 24.8138,
    longitude: 67.0281,
  },
  {
    match: /hunger|food|meal|ration/i,
    name: 'FreeHunger Relief Network',
    description:
      'Daily meal distribution and monthly ration packs for underserved families in urban settlements.',
    city: 'Lahore',
    address: '45 Food Lane, Gulberg III, Lahore',
    phone: '042-35789012',
    contact: 'help@freehunger.demo',
    website: 'https://example.com/freehunger',
    bankDetails:
      'Bank: HBL\nTitle: FreeHunger Relief Network\nAccount: 1098765432101\nIBAN: PK12HABB001098765432101\nBranch: Gulberg, Lahore',
    easypaisa: '0311-5566778',
    jazzcash: '0321-9988776',
    registrationNumber: 'RS/2019/FH-441',
    registrationType: 'Trust',
    yearEstablished: '2019',
    category: 'Food Security',
    goal: 750000,
    latitude: 31.5204,
    longitude: 74.3587,
  },
  {
    match: /school|edu|child|orphan/i,
    name: 'Bright Path Education Trust',
    description:
      'Scholarships, stationery kits, and after-school tutoring for children in low-income neighborhoods.',
    city: 'Islamabad',
    address: '8 Knowledge Road, F-10, Islamabad',
    phone: '051-2345678',
    contact: 'admissions@brightpath.demo',
    website: 'https://example.com/brightpath',
    bankDetails:
      'Bank: UBL\nTitle: Bright Path Education Trust\nAccount: 2200112233445\nIBAN: PK90UNIL02200112233445\nBranch: F-10 Markaz',
    easypaisa: '0333-1122334',
    jazzcash: '0345-6677889',
    registrationNumber: 'SECP/2020/BPE-88',
    registrationType: 'SECP',
    yearEstablished: '2020',
    category: 'Education',
    goal: 400000,
    latitude: 33.6844,
    longitude: 73.0479,
  },
  {
    match: /water|health|clinic|medical/i,
    name: 'Safa Health & Water Initiative',
    description:
      'Clean water filters, mobile clinics, and maternal health camps in rural Sindh and Balochistan.',
    city: 'Hyderabad',
    address: '19 Wellness Avenue, Latifabad, Hyderabad',
    phone: '022-3866543',
    contact: 'care@safahealth.demo',
    website: 'https://example.com/safa',
    bankDetails:
      'Bank: Allied Bank\nTitle: Safa Health & Water Initiative\nAccount: 0011223344556\nIBAN: PK55ABPA0011223344556\nBranch: Latifabad',
    easypaisa: '0305-4433221',
    jazzcash: '0308-7788990',
    registrationNumber: 'RS/2018/SHW-12',
    registrationType: 'Societies',
    yearEstablished: '2018',
    category: 'Health',
    goal: 600000,
    latitude: 25.3960,
    longitude: 68.3578,
  },
];

const FALLBACK_DEMO_PROFILE = {
  description:
    'Registered community organization supporting local relief, education, and livelihood programs.',
  city: 'Karachi',
  address: 'Community Center, Saddar, Karachi',
  phone: '021-111222333',
  contact: 'info@demo-ngo.org',
  website: 'https://example.com/ngo',
  bankDetails:
    'Bank: Bank Alfalah\nTitle: Community NGO Account\nAccount: 9988776655443\nIBAN: PK71ALFH009988776655443\nBranch: Saddar',
  easypaisa: '0300-1122334',
  jazzcash: '0300-5566778',
  registrationNumber: 'RS/2022/GEN-001',
  registrationType: 'Societies',
  yearEstablished: '2022',
  category: 'Community',
  goal: 250000,
  latitude: 24.8607,
  longitude: 67.0011,
};

function pickDemoProfile(name: string, id: string) {
  const haystack = `${name} ${id}`;
  return (
    DEMO_NGO_PROFILES.find((p) => p.match.test(haystack)) || {
      match: /.*/,
      name: name || 'Community NGO',
      ...FALLBACK_DEMO_PROFILE,
    }
  );
}

/**
 * Fills realistic NGO Profile + payment methods on existing Ngos docs (demo catalog).
 * Safe to re-run; always refreshes payment fields for demo-ready data.
 */
export async function enrichExistingNgoProfiles(): Promise<number> {
  const snap = await getDocs(collection(db, 'Ngos'));
  if (snap.empty) return 0;

  let batch = writeBatch(db);
  let ops = 0;
  let updated = 0;

  for (const d of snap.docs) {
    const data = d.data();
    const profile = pickDemoProfile(String(data.name || ''), d.id);
    batch.set(
      d.ref,
      {
        name: data.name || profile.name,
        description: data.description || profile.description,
        city: data.city || profile.city,
        address: data.address || profile.address,
        phone: data.phone || profile.phone,
        contact: data.contact || profile.contact,
        website: data.website || profile.website,
        // Always ensure payment methods for demo / individual donation flow
        bankDetails: profile.bankDetails,
        easypaisa: profile.easypaisa,
        jazzcash: profile.jazzcash,
        registrationNumber: data.registrationNumber || profile.registrationNumber,
        registrationType: data.registrationType || profile.registrationType,
        yearEstablished: data.yearEstablished || profile.yearEstablished,
        category: data.category || profile.category,
        goal: data.goal || profile.goal,
        verified: data.verified !== false,
        type: data.type || 'ngo',
        latitude: data.latitude ?? profile.latitude,
        longitude: data.longitude ?? profile.longitude,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    ops += 1;
    updated += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  }

  if (ops > 0) await batch.commit();
  return updated;
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
        'Bank: Meezan Bank\nTitle: We3 NGO (Demo)\nAccount: 0123456789012\nIBAN: PK36MEZN0000123456789012\nBranch: Clifton, Karachi',
      easypaisa: '0301-2345678',
      jazzcash: '0302-8765432',
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
      registrationNumber: 'RS/2021/WE3-DEMO',
      registrationType: 'Societies',
      yearEstablished: '2021',
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

  const enriched = await enrichExistingNgoProfiles();

  return {
    uid,
    ngoId: DEMO_NGO_ID,
    email,
    createdNgoDoc: !priorNgo.exists(),
    roleUpdated: true,
    message: `Demo NGO "${DEMO_NGO_NAME}" linked to ${email} (uid ${uid}). Updated profiles/payment methods on ${enriched} NGO(s). Log in with that account and open NGO Portal.`,
  };
}
