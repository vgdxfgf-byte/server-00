# PayFlow (Server 03) Security Specification

## 1. Data Invariants
1. **Identity & Privilege Integrity**:
   - Every write operation (excluding system test read `/test/connection`) requires `request.auth != null && request.auth.token.email_verified == true`.
   - A non-admin user can NEVER create or update a `/users/{userId}` document with `role == 'admin'`, modify `kycStatus`, `isFrozen`, `dailyWithdrawalLimit`, `totalDeposited`, or `totalWithdrawn`, or arbitrarily increase `availableBalance`.
   - Admin privileges are determined strictly server-side in Firestore rules via `exists(/databases/$(database)/documents/admins/$(request.auth.uid))` or verified bootstrapped admin email (`request.auth.token.email == 'vgdxfgf@gmail.com' && request.auth.token.email_verified == true`).
2. **PII Isolation**:
   - `/users/{userId}` contains sensitive PII (`email`, `phone`, `address`, `panNumber`, bank account numbers). `get` and `list` are strictly restricted to `isOwner(userId) || isAdmin()`. No blanket `isSignedIn()` reads exist anywhere.
3. **Atomic Balance Reservation & Terminal State Locking**:
   - A withdrawal request in `/withdrawals/{withdrawalId}` created by a regular user MUST have `userId == request.auth.uid`, `status == 'pending'`, and `getAfter(/users/{uid}).data.pendingWithdrawals > get(/users/{uid}).data.pendingWithdrawals` so funds cannot be withdrawn without reserving wallet balance atomically.
   - Regular users updating `/users/{uid}` for withdrawal reservation can only decrease `availableBalance` and shift the exact delta into `pendingWithdrawals` and `withdrawnToday`, within `dailyWithdrawalLimit`.
   - Once a withdrawal reaches a terminal state (`completed` or `rejected`), regular users cannot mutate it (`isAdmin()` override applies for administrative corrections).
4. **Immutable Audit Trail**:
   - `/adminLogs/{logId}` and `/adjustments/{adjustmentId}` can ONLY be created by `isAdmin()`. `/adminLogs` cannot be updated or deleted by any client.
5. **Bounded Arrays & String Limits**:
   - `bankBeneficiaries` and `upiBeneficiaries` are capped at `.size() <= 10`.
   - `statusTimeline` is capped at `.size() <= 20`.
   - `paymentMethods` in `config/system` is capped at `.size() <= 10`.
   - Every document ID matches `^[a-zA-Z0-9_\-]+$` (`<= 128` chars) and every string has explicit `.size()` bounds.
   - `createdAt` and `updatedAt` timestamps are strictly validated against `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Self-Assigned Admin Role on Signup**: User creates `/users/{myUid}` with `{ role: "admin", availableBalance: 999999 }`. -> **DENIED**
2. **Shadow / Ghost Field Injection**: User updates `/users/{myUid}` with `{ name: "Alice", isVerified: true, bonus: 5000 }`. -> **DENIED**
3. **Unverified Admin Email Spoof**: Request has `email: "vgdxfgf@gmail.com"` with `email_verified: false`. -> **DENIED**
4. **Cross-User PII Read / Scraping**: Authenticated user queries `collection(db, "users")` or `getDoc(doc(db, "users", "other_uid"))`. -> **DENIED**
5. **Free Money Balance Inflation**: User updates `/users/{myUid}` setting `availableBalance: 500000` directly. -> **DENIED**
6. **Orphan Withdrawal Without Balance Deduction**: User creates `/withdrawals/TXN-999` without atomically updating `/users/{myUid}` in the same batch. -> **DENIED**
7. **Withdrawal State Shortcutting**: User updates `/withdrawals/{txnId}` from `pending` directly to `completed` with a fake `utrNumber`. -> **DENIED**
8. **Terminal State Mutation**: User attempts to update `/withdrawals/{txnId}` where `existing.status == 'completed'`. -> **DENIED**
9. **ID Poisoning / Oversized Document ID**: Client writes to `/withdrawals/` with a 500-char ID or invalid characters (`../bad$id`). -> **DENIED**
10. **Array Exhaustion Attack**: User updates `/users/{myUid}` with 25 `bankBeneficiaries` entries (> 10 max). -> **DENIED**
11. **Backdated / Client-Forged Timestamp**: Client creates `/withdrawals/{txnId}` with `createdAt: Timestamp(2020-01-01)` instead of `serverTimestamp()` (`request.time`). -> **DENIED**
12. **Forged Admin Log / Fee Manipulation**: Non-admin user attempts to write to `/adminLogs/log_1` or `/config/fees`. -> **DENIED**

## 3. Test Runner
See `firestore.rules.test.ts` for the complete `@firebase/rules-unit-testing` test suite verifying all 12 adversarial payloads return `PERMISSION_DENIED`.
