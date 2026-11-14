import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, serverTimestamp, writeBatch, Timestamp } from 'firebase/firestore';
import * as fs from 'fs';

let testEnv: RulesTestEnvironment;

const ADMIN_UID = 'admin_uid_1';
const USER_A_UID = 'user_a_uid';
const USER_B_UID = 'user_b_uid';

function buildValidUserPayload(uid: string, overrides: Record<string, unknown> = {}) {
  return {
    id: uid,
    name: 'Test Customer',
    email: `${uid}@example.com`,
    phone: '+91 98765 43210',
    role: 'user',
    kycStatus: 'pending',
    availableBalance: 25000,
    totalDeposited: 25000,
    totalWithdrawn: 0,
    pendingWithdrawals: 0,
    dailyWithdrawalLimit: 500000,
    withdrawnToday: 0,
    registeredAt: new Date().toISOString(),
    bankBeneficiaries: [],
    upiBeneficiaries: [],
    isFrozen: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

describe('PayFlow Firestore Security Rules - Dirty Dozen Adversarial Suite', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'payflow-security-test',
      firestore: {
        rules: fs.readFileSync('firestore.rules', 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'users', USER_A_UID), {
        ...buildValidUserPayload(USER_A_UID),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      await setDoc(doc(db, 'users', USER_B_UID), {
        ...buildValidUserPayload(USER_B_UID),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      await setDoc(doc(db, 'withdrawals', 'TXN-1001'), {
        id: 'TXN-1001',
        userId: USER_A_UID,
        userName: 'Test Customer',
        userEmail: 'user_a_uid@example.com',
        amount: 1000,
        feeAmount: 15,
        gstAmount: 2.7,
        netPayableAmount: 982.3,
        paymentMethod: 'upi',
        paymentDetails: { upiId: 'test@okaxis', holderName: 'Test Customer' },
        status: 'pending',
        statusTimeline: [{ status: 'pending', timestamp: new Date().toISOString(), title: 'Initiated', description: 'Init', actor: 'User' }],
        referenceNumber: 'REF-UP-1001',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      await setDoc(doc(db, 'withdrawals', 'TXN-COMPLETED'), {
        id: 'TXN-COMPLETED',
        userId: USER_A_UID,
        userName: 'Test Customer',
        userEmail: 'user_a_uid@example.com',
        amount: 1000,
        feeAmount: 15,
        gstAmount: 2.7,
        netPayableAmount: 982.3,
        paymentMethod: 'upi',
        paymentDetails: { upiId: 'test@okaxis', holderName: 'Test Customer' },
        status: 'completed',
        utrNumber: 'UTR1234567890',
        statusTimeline: [{ status: 'completed', timestamp: new Date().toISOString(), title: 'Settled', description: 'Done', actor: 'Admin' }],
        referenceNumber: 'REF-UP-1002',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });
  });

  test('1. Self-Assigned Admin Role on Signup -> PERMISSION_DENIED', async () => {
    const db = testEnv.authenticatedContext('new_user_1', { email: 'new@example.com', email_verified: true }).firestore();
    await assertFails(setDoc(doc(db, 'users', 'new_user_1'), buildValidUserPayload('new_user_1', { role: 'admin' })));
  });

  test('2. Shadow / Ghost Field Injection -> PERMISSION_DENIED', async () => {
    const db = testEnv.authenticatedContext(USER_A_UID, { email: 'a@example.com', email_verified: true }).firestore();
    await assertFails(updateDoc(doc(db, 'users', USER_A_UID), { name: 'Hacked', isAdminSecret: true, updatedAt: serverTimestamp() }));
  });

  test('3. Unverified Admin Email Spoof -> PERMISSION_DENIED', async () => {
    const db = testEnv.authenticatedContext('spoof_uid', { email: 'vgdxfgf@gmail.com', email_verified: false }).firestore();
    await assertFails(getDocs(collection(db, 'users')));
  });

  test('4. Cross-User PII Read & List Scraping -> PERMISSION_DENIED', async () => {
    const db = testEnv.authenticatedContext(USER_A_UID, { email: 'a@example.com', email_verified: true }).firestore();
    await assertFails(getDoc(doc(db, 'users', USER_B_UID)));
    await assertFails(getDocs(collection(db, 'users')));
  });

  test('5. Free Money Balance Inflation -> PERMISSION_DENIED', async () => {
    const db = testEnv.authenticatedContext(USER_A_UID, { email: 'a@example.com', email_verified: true }).firestore();
    await assertFails(updateDoc(doc(db, 'users', USER_A_UID), { availableBalance: 9999999, updatedAt: serverTimestamp() }));
  });

  test('6. Orphan Withdrawal Without Atomic Balance Reservation -> PERMISSION_DENIED', async () => {
    const db = testEnv.authenticatedContext(USER_A_UID, { email: 'a@example.com', email_verified: true }).firestore();
    await assertFails(setDoc(doc(db, 'withdrawals', 'TXN-ORPHAN'), {
      id: 'TXN-ORPHAN',
      userId: USER_A_UID,
      userName: 'Test Customer',
      userEmail: 'user_a_uid@example.com',
      amount: 500,
      feeAmount: 12.5,
      gstAmount: 2.25,
      netPayableAmount: 485.25,
      paymentMethod: 'upi',
      paymentDetails: { upiId: 'test@okaxis', holderName: 'Test Customer' },
      status: 'pending',
      statusTimeline: [{ status: 'pending', timestamp: new Date().toISOString(), title: 'Init', description: 'Init', actor: 'User' }],
      referenceNumber: 'REF-999',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
  });

  test('7. Withdrawal State Shortcutting (pending -> completed by user) -> PERMISSION_DENIED', async () => {
    const db = testEnv.authenticatedContext(USER_A_UID, { email: 'a@example.com', email_verified: true }).firestore();
    await assertFails(updateDoc(doc(db, 'withdrawals', 'TXN-1001'), {
      status: 'completed',
      utrNumber: 'FAKEUTR123',
      updatedAt: serverTimestamp(),
    }));
  });

  test('8. Terminal State Mutation by User -> PERMISSION_DENIED', async () => {
    const db = testEnv.authenticatedContext(USER_A_UID, { email: 'a@example.com', email_verified: true }).firestore();
    await assertFails(updateDoc(doc(db, 'withdrawals', 'TXN-COMPLETED'), {
      statusTimeline: [{ status: 'pending', timestamp: new Date().toISOString(), title: 'Tamper', description: 'Tamper', actor: 'User' }],
      updatedAt: serverTimestamp(),
    }));
  });

  test('9. ID Poisoning (Oversized or Invalid Document ID) -> PERMISSION_DENIED', async () => {
    const db = testEnv.authenticatedContext(USER_A_UID, { email: 'a@example.com', email_verified: true }).firestore();
    const oversizedId = 'a'.repeat(200);
    await assertFails(getDoc(doc(db, 'withdrawals', oversizedId)));
  });

  test('10. Array Exhaustion Attack (> 10 bank beneficiaries) -> PERMISSION_DENIED', async () => {
    const db = testEnv.authenticatedContext(USER_A_UID, { email: 'a@example.com', email_verified: true }).firestore();
    const elevenBanks = Array.from({ length: 11 }, (_, i) => ({
      id: `bnk_${i}`,
      accountHolderName: 'Test',
      accountNumber: '1234567890',
      ifscCode: 'HDFC0000060',
      bankName: 'HDFC',
      accountType: 'savings',
    }));
    await assertFails(updateDoc(doc(db, 'users', USER_A_UID), {
      bankBeneficiaries: elevenBanks,
      updatedAt: serverTimestamp(),
    }));
  });

  test('11. Client-Forged Backdated Timestamp -> PERMISSION_DENIED', async () => {
    const db = testEnv.authenticatedContext('new_user_2', { email: 'new2@example.com', email_verified: true }).firestore();
    await assertFails(setDoc(doc(db, 'users', 'new_user_2'), {
      ...buildValidUserPayload('new_user_2'),
      createdAt: Timestamp.fromDate(new Date('2020-01-01')),
      updatedAt: Timestamp.fromDate(new Date('2020-01-01')),
    }));
  });

  test('12. Non-Admin Forged AdminLog or FeeConfig Write -> PERMISSION_DENIED', async () => {
    const db = testEnv.authenticatedContext(USER_A_UID, { email: 'a@example.com', email_verified: true }).firestore();
    await assertFails(setDoc(doc(db, 'adminLogs', 'log_fake'), {
      id: 'log_fake',
      timestamp: new Date().toISOString(),
      adminName: 'Spoofed',
      action: 'FAKE',
      details: 'Fake',
      ipAddress: '1.1.1.1',
      createdAt: serverTimestamp(),
    }));
    await assertFails(setDoc(doc(db, 'config', 'fees'), {
      feeType: 'flat',
      flatFee: 0,
      percentageFee: 0,
      gstRatePercent: 0,
      minWithdrawalAmount: 1,
      maxWithdrawalAmountPerTxn: 99999999,
      dailyCeilingLimit: 99999999,
      freeWithdrawalsPerMonth: 999,
      updatedAt: serverTimestamp(),
    }));
  });

  test('Valid Atomic Withdrawal Batch & Admin Operations -> SUCCEED', async () => {
    const userDb = testEnv.authenticatedContext(USER_A_UID, { email: 'a@example.com', email_verified: true }).firestore();
    const batch = writeBatch(userDb);
    batch.update(doc(userDb, 'users', USER_A_UID), {
      availableBalance: 24000,
      pendingWithdrawals: 1000,
      withdrawnToday: 1000,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(userDb, 'withdrawals', 'TXN-VALID-1'), {
      id: 'TXN-VALID-1',
      userId: USER_A_UID,
      userName: 'Test Customer',
      userEmail: 'user_a_uid@example.com',
      amount: 1000,
      feeAmount: 15,
      gstAmount: 2.7,
      netPayableAmount: 982.3,
      paymentMethod: 'upi',
      paymentDetails: { upiId: 'test@okaxis', holderName: 'Test Customer' },
      status: 'pending',
      statusTimeline: [{ status: 'pending', timestamp: new Date().toISOString(), title: 'Init', description: 'Init', actor: 'User' }],
      referenceNumber: 'REF-VALID-1',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());

    const adminDb = testEnv.authenticatedContext(ADMIN_UID, { email: 'vgdxfgf@gmail.com', email_verified: true }).firestore();
    await assertSucceeds(getDocs(collection(adminDb, 'users')));
  });
});
