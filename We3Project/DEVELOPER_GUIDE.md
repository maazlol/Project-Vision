# Developer Guide — Volunteer & Role Management

## Volunteer Approval Logic
The volunteer approval process is managed in the `AdminPanel.tsx`. 

### How it works:
1.  **Collection Update:** When an admin approves or rejects a volunteer, the status is updated in the `volunteers` collection.
2.  **User Synchronization:** Upon approval, the system automatically updates the user's document in the `users` collection:
    *   `role` is set to `'volunteer'`.
    *   `isVolunteer` is set to `true`.
    *   `isVerified` is set to `true`.
3.  **Role Reversion:** If a volunteer is rejected, their role is reverted to `'supporter'` and `isVolunteer` is set to `false`.

## Admin Access (Development)
For development and testing, administrative access is managed in `src/lib/useUserRole.ts`.

### Hardcoded Admins:
The following emails are currently granted administrative privileges regardless of their Firestore role:
*   `maazology@gmail.com`
*   `maazstepback@gmail.com`

### Role Precedence:
In the `useUserRole` hook, the calculated role (e.g., from email overrides) takes precedence over the Firestore document role to ensure development access is never locked out.
