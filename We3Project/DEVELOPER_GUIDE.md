# Developer Guide - Volunteer & Role Management

## Static Content Pages
The static marketing/content pages are imported as raw HTML and rendered through React wrappers:

* `src/content/news.html` with `src/styles/news.css`
* `src/content/blog.html` with `src/styles/blog.css`
* `src/content/article1.html` through `src/content/article6.html` with `src/styles/article.css`

Typography should stay consistent across these pages. Blog, Article, and News pages use the `Inter` font family and page-scoped heading rules.

Recent styling fixes:

* News carousel hero text is forced to white with `.news-page .hero-carousel-section` scoped selectors so the global News heading rule does not turn the hero title black.
* Blog hero eyebrow, title, and subtitle are forced to white only inside `.blog-page .blog-hero`; lower Blog sections keep their normal colors.
* Article hero titles in `article1` through `article6` are forced to white with `.article-page .article-hero .article-hero-title`; related article cards and other lower sections remain unchanged.
* Blog article card titles intentionally remain black/default on the Blog listing page.

## Volunteer Approval Logic
The volunteer approval process is managed in `src/components/AdminPanel.tsx`.

### How it works
1. **Application update:** When an admin approves or rejects a volunteer, the matching document in the `volunteers` collection is updated.
2. **User synchronization:** Approval is written in the same Firestore batch to `users/{uid}` so posting permissions are granted immediately:
   * `role` is set to `volunteer`.
   * `isVolunteer` is set to `true`.
   * `isVerified` is set to `true`.
   * `volunteerApplicationId` and `volunteerApprovedAt` are stored for traceability.
3. **Rejection:** Rejected applications set the user back to `role: supporter`, `isVolunteer: false`, and `isVerified: false`.
4. **Active volunteer management:** The admin panel has an `Active` tab that reads active volunteers from the `users` collection. `Remove Perms` changes the user back to `supporter`, removes volunteer flags, and marks approved volunteer applications as `revoked`.

## Firestore Rules
The enforced security model lives in `firestore.rules`.

Important role-management rules:

* Admins can create/update `users/{uid}` role fields.
* Normal users can create their own profile, but cannot grant themselves `role`, `isVolunteer`, or `isVerified`.
* Normal users can submit a pending document in `volunteers`.
* Only admins can update volunteer applications after submission.
* Discussion and volunteer-only group access checks read `users/{uid}.role` and `users/{uid}.isVolunteer`.

Deploy rules after changing the admin permission flow:

```bash
firebase deploy --only firestore:rules
```

## Admin Access
Administrative access is managed in both `src/lib/useUserRole.ts` and `firestore.rules`.

### Hardcoded Admins
The following emails are currently granted administrative privileges regardless of their Firestore role:

* `maazology@gmail.com`
* `maazstepback@gmail.com`

The same emails are recognized in `firestore.rules` so the admin panel can update roles even if the user document is missing or stale.

### Role Precedence
In the `useUserRole` hook, the calculated role from email overrides takes precedence over the Firestore document role to ensure development access is not locked out.
