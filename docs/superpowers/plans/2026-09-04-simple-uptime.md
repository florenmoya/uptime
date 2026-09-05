# Personal uptime implementation plan

**Goal:** Run a working private dashboard and checker locally for the six source monitors.
**Architecture:** Next.js web process and one Node worker, sharing PostgreSQL and a transactional notification outbox.
**Tech stack:** TypeScript, React, Next.js, node-postgres, Nodemailer, Node test runner.
**Spec:** ../specs/2026-09-04-simple-uptime-design.md

## Tasks

- [x] Monitoring core and persistence: create src/lib/{state,probe,db,monitoring}.ts, db/schema.sql, scripts/setup.ts and tests/core.test.ts. Verify two-failure opening, two-success recovery, stale reset, timeout and SSRF behavior with `npm test`. Create the dedicated database and six idempotent seeds.
- [x] Delivery and scheduling: create src/lib/notifications.ts and src/worker.ts. Add persistent outbox retries, isolated channel delivery and worker heartbeat; verify Discord payloads and SMTP using local fixtures in tests/notifications.test.ts. Exercise incident and outbox persistence using tests/database.test.ts against a disposable database.
- [x] Dashboard: create src/app and src/components with all-monitor overview, filtering, details, editing/pause/resume, incidents, delivery history and configuration status. Add private-host and same-origin API guards. Verify real browser flows on desktop and mobile.
- [x] Local operation and VM readiness: run production build and real checks, store webhook only in .env.local, provide local start commands and loopback-only systemd units. Document missing FACT targets and SMTP settings explicitly. Do not deploy to the VM during local testing.
