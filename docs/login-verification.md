# Login page verification — 5 September 2026

Replaced browser Basic authentication with /login and revocable PostgreSQL sessions. Prior Basic-auth evidence in public-status-verification.md describes the earlier implementation.

- Production build and all 14 tests passed, including credential validation, atomic login throttling, session creation, expiry, revocation and credential-change invalidation in disposable PostgreSQL.
- Browser: / redirects to /login without WWW-Authenticate. Incorrect credentials render Email or password is incorrect. Password visibility toggle works.
- Existing admin credentials successfully open the dashboard with six monitors; reload preserves the session.
- Session cookie is HttpOnly, SameSite=Lax, and expires after eight hours. HTTPS configuration enables Secure.
- Sign out returns to /login. Both anonymous API access and replaying the revoked cookie return 401.
- Untrusted-Origin login POST returns 403.
- Signed-out public page returns 200 with zero controls.
- Login and dashboard at 1440px/390px have no horizontal overflow or browser page errors.
- Credentials remain server-only. No new real notification messages were sent.
- Screenshots: .impeccable/review/login-desktop.png, login-mobile.png, login-dashboard-desktop.png, login-dashboard-mobile.png, login-error-mobile.png.

Finish review disposition: ship for the login and dashboard header at desktop/mobile sizes. No material UI findings. Type check passed after all implementation changes.
