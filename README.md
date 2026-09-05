# Bayanko Uptime

A private Next.js dashboard and persistent Node checker backed by PostgreSQL. No SaaS, registration, billing, external cron, or Redis. Production deployment targets `https://uptime.bayanko.ph` on the existing `bayanko` VM.

Current configuration (5 September 2026): all six targets are configured. The local app connects to the owner's Amazon RDS `uptime_db` over verified TLS. Six monitor records, 268 historical checks and two notification delivery records were copied and verified from local PostgreSQL; the original local database remains intact. Secrets stay in `.env.local`. Discord's webhook and sender are named **Mang Tani**. Email and Discord are configured, and automatic outage/recovery alerts are enabled. They can be paused in Settings.

## Local use

Use Node.js 22.16 or newer and PostgreSQL. Install with `npm ci`, copy `.env.example` to `.env.local` if that file does not already exist, and fill the connection settings. Never overwrite an existing secret file. The verified local account is `postgres`, host `localhost`, port `5432`, without a password.

```sh
npm run db:setup
npm run local
```

Open http://127.0.0.1:3100. `local` starts both the development dashboard and checker. For a production build, run `npm run build`, then run `npm start` and `npm run worker` in separate terminals. Only run one worker: a PostgreSQL advisory lock rejects another instance. The local worker launcher restarts after unexpected exits with a five-second delay; losing the lock connection stops that worker before a replacement reacquires the lock. The VM uses systemd for the same restart responsibility. `npm run check` performs one check round while the persistent worker is stopped.

The current session's background production processes are recorded in the ignored `.local/processes.json`; their logs are in `.local/`. Stop those exact processes before using `npm run local` on the same port. Process IDs can be reused after exit, so verify the process command before stopping it.

## Six starting monitors

The names came from https://stats.uptimerobot.com/xKcrfn6ZAX. Its public API hides every actual target URL. These are explicit starting targets, not an export of the hidden original configuration:

| Monitor | Starting URL |
| --- | --- |
| emarket-svc.philgeps.gov.ph | https://emarket-svc.philgeps.gov.ph/ |
| emarket.philgeps.gov.ph | https://emarket.philgeps.gov.ph/ |
| FACT PROD | http://126.52.131.6/ (owner supplied) |
| FACT UAT | http://136.158.228.120/ (owner supplied) |
| philgeps.gov.ph | https://philgeps.gov.ph/ |
| training.philgeps.gov.ph | https://training.philgeps.gov.ph/ |

Expand a monitor and choose **Edit monitor** to supply its exact endpoint, rename it, set its project, or pause/resume checks. Blank URLs remain unconfigured. The application independently probes each target; it does not scrape UptimeRobot repeatedly or import its historical percentages.

## Public status pages

Open **Settings → Public status pages → Create public page**. Set a name, URL slug, optional description, and selected services. Save and publish to make `/status/<slug>` readable without signing in. Edit and uncheck **Publish this page** to make that URL return 404. The initial six-service page is `/status/philgeps`.

Public visitors see current service status, 30 daily observation bars, and generic incident history. There are no management actions, monitor target URLs, response errors, latency details, or notification settings. A read-only Daily details selector provides accessible date navigation. Service names are public, so use names suitable for sharing. History distinguishes healthy observations (green), mixed results (amber), failed observations (red), and no observations (gray). Percentages use observed checks across the displayed 30 days, excluding gaps. Daily details appear on hover, tap or keyboard focus with arrow-key navigation. The view refreshes every 30 seconds with a visible countdown.

Admin login is enabled for `admin@bayanko.ph` through `/login`. Opening `/` while signed out redirects to the email/password form. Credentials and a random `SESSION_SECRET` are stored only in ignored server configuration; all three are required. A successful login creates an eight-hour server session whose random token is hashed in PostgreSQL. Its browser cookie is HttpOnly and SameSite=Lax, and Secure when `APP_URL` uses HTTPS. Sign out revokes the database session; expiry or changing credentials/SESSION_SECRET invalidates it too. Login is limited to ten attempts per minute across this single-admin app. There is no browser Basic-auth popup or registration flow. Published status pages remain public. Before VM exposure, configure `APP_URL` to the HTTPS origin, admin credentials and a randomly generated session secret. The reverse proxy must preserve the configured Host and use HTTPS. The app stays bound to loopback behind nginx.

## Notification configuration

Automatic alerts start paused for local setup. **Settings** shows channel readiness, delivery history, test buttons, and the automatic alert switch. Enabling alerts applies to future incident transitions; it does not replay historical events. Pausing cancels pending automatic deliveries, but a send already in progress may complete. Test sends are independent of the automatic alert switch and are limited to one request per channel per minute.

In **Settings → Test notifications**, select a monitor and preview an HTTP error, timeout, DNS error, TLS certificate error, connection error, redirect error, invalid target, or recovery. Choose **All 8 scenarios** to send a batch, spaced three seconds apart. Samples use the same templates as real alerts, marked `[TEST]`, without checking the target or changing monitor health or incidents. Alerts show a status emoji, service name, failure reason or recovery message, URL, and Philippine time. Recoveries also show downtime. Discord uses colored embeds; email includes formatted HTML and a plain-text alternative.

Use **Settings → Edit Discord** to replace the webhook, or **Edit Email** to change SMTP, sender, and recipients. Leave a secret field blank to keep its saved value. Each channel can be disabled independently. Changes apply to subsequent deliveries without a restart; an in-progress send may finish using its previous connection. Existing environment values are used until a channel is first saved in Settings. Saved channel settings override those values, including when disabled. Passwords and webhook URLs are never returned to the browser. The Test notifications controls verify delivery after saving.

For initial setup, set `DISCORD_WEBHOOK_URL` only in `.env.local`. Discord receives embeds from **Mang Tani**, with mentions disabled. The webhook uses the Mang Tani name and the owner-provided `tani.webp` profile photo, stored by Discord. `wait=true` requires a provider message receipt; the database records acceptance. Do not put the webhook into client code or commit it.

For real email, configure:

```dotenv
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-user
SMTP_PASSWORD=your-password
MAIL_FROM=Uptime <alerts@your-domain.com>
MAIL_TO=you@your-domain.com
```

Use `SMTP_SECURE=true` for port 465. SMTP STARTTLS is required on non-local plain connections. Comma-separated recipients are supported. Dashboard edits take effect immediately. Restart the dashboard and worker only after changing environment variables. A successful SMTP result means the receiving mail server accepted the message, not that a person read it. Without sender/recipient/provider details, email remains visibly unconfigured. Saved connections use AES-256-GCM encryption in PostgreSQL. Set `NOTIFICATION_ENCRYPTION_KEY` to a random 32-byte hex key in the private environment file, use the same key for every app instance sharing the database, and back it up separately from the database. Never commit the key or regenerate it over existing encrypted settings. The tests verify real SMTP delivery to an isolated local capture server; no mail credentials are needed for that test.

## Discord overview

**Settings → Discord overview** maintains one live Discord message with a compact entry per service: a status symbol, response time or exception status, and the percentage of observed checks that passed in the past 24 hours. Detailed history and coverage remain on the dashboard, linked from the message title. It refreshes every 60 seconds through the existing worker. It is enabled by default and uses the incident webhook unless a separate encrypted webhook is saved. It is independent of the automatic incident alert switch.

The message ID is saved in PostgreSQL and reused across restarts. A Discord Unknown Message response recreates a deleted post; other errors retain the message ID and honor retry delays. If initial creation may have succeeded but Discord did not confirm it, automatic creation stops to avoid duplicates. Settings then allows entering the existing message ID or explicitly retrying creation. Disabling the overview stops updates and leaves its last message intact. Changing the destination creates a new overview there and leaves the previous message unchanged.

For existing installations, apply `db/migrations/002-discord-overview.sql` as the database owner and grant the app role SELECT, INSERT, UPDATE, DELETE on `overview_message` before starting the new worker. No new environment key is required.

## Check and incident behavior

- GET checks every 60 seconds; 10-second overall timeout; valid TLS; at most five redirects; healthy final response is HTTP 200–399.
- Public HTTP(S) targets only, ports 80/443. Reject private, loopback, metadata and reserved addresses, including redirect destinations and mapped IPv6. Pin the connection to a validated DNS result. No target credentials, arbitrary headers or response-body storage.
- Two consecutive failed scheduled checks open an incident. Two consecutive successful checks resolve it. A single failure displays confirmation in progress. A gap resets confirmation streaks.
- Incident changes and notification outbox entries commit in one transaction. Duplicate observations do not create duplicate incidents or deliveries. Notifications retry up to eight times; channels fail independently and respect Discord retry delays. A provider timeout after acceptance can cause a duplicate, so delivery is not exactly once.
- One probe location is the current machine. This does not establish worldwide availability. A dead monitoring machine cannot send its own outage alert. Dashboard observations become stale; `/api/health` returns 503 for a missing/stale worker or database failure. For unattended VM use, an independent external watchdog is recommended.
- **Passed · 24h** is successful observations divided by observed checks of the current target. It is not time-weighted uptime. Coverage counts observed minute buckets since monitor creation, capped at the preceding 24 hours; missing minutes remain unobserved. Gray bars are missing observations, not successful checks. Manual checks may add observations without increasing minute coverage.
- Target edits isolate displayed check history by URL. Pause/resume or URL changes invalidate in-flight results and close an open incident as a configuration change, not a verified recovery. Observations are kept for 30 days; resolved incidents and completed deliveries for 90 days.

## Validation

```sh
npm test
npm run typecheck
npm run build
```

Database tests create and remove a randomly named `uptime_test_*` database. They never clear the application database. By default, tests use the local `postgres` account; set `TEST_DATABASE_URL` to a PostgreSQL connection with database-creation permission if needed. HTTP, Discord and SMTP tests use local fixtures and send no real notifications. Tests cover confirmation/recovery, duplicate observations/outbox entries, outdated configuration results, scheduling timestamp precision, private-target rejection, HTTP timeouts and redirects, Discord retry timing, SMTP acceptance and request-origin guards.

## VM deployment

Repository: `git@github.com:florenmoya/uptime.git`. Production hostname: `uptime.bayanko.ph`, proxied through Cloudflare to the bayanko VM. Keep Cloudflare SSL/TLS set to Full (strict); the origin has its own publicly trusted certificate.

The dedicated `uptime` OS user runs `uptime-web.service` and `uptime-worker.service`. Source releases live in `/opt/uptime/releases/<commit>`, with `/opt/uptime/current` selecting the active release. An isolated Node runtime lives in `/opt/uptime/runtime/node`. Existing VM applications and their runtimes are independent. The web app binds only to `127.0.0.1:3100`; nginx terminates HTTPS using `deploy/uptime.nginx.conf`. Certbot renews through `/var/www/uptime-acme`.

Production credentials live in `/opt/uptime/shared/.env.local`, owned by uptime with mode 600, symlinked into each release. Configure `APP_URL=https://uptime.bayanko.ph`, the existing admin account, a session secret, notification credentials, and the dedicated RDS database. The production application role has access only to this application's schema objects, with no role or database creation permission. Keep verified TLS and the committed public AWS CA bundle.

Deploy the exact committed source archive to a new release directory. Run `npm ci --no-audit --no-fund` and `NODE_OPTIONS=--max-old-space-size=384 npm run build` using the isolated runtime. Next builds use one worker to limit memory on this shared VM. Do not run the database seed/setup script on an existing production database as part of a routine UI deployment.

For the editable notification settings release, apply `db/migrations/001-notification-settings.sql` as the database owner and grant the existing application role SELECT, INSERT, UPDATE, DELETE on `notification_settings`. Configure the encryption key before starting the updated services. This migration adds a table without modifying existing monitor data.

Switch `current` only after a successful build. Restart the two uptime services, then verify `systemctl is-active uptime-web uptime-worker`, `/api/health`, public `/status/philgeps`, and private login/logout. Run only one checker against this database; stop the local checker before starting the VM checker. The advisory lock is the final duplicate-worker guard.

For rollback, point `current` back to the previous verified release and restart only the uptime services. Keep database backups separately and review schema changes before any future migration. The initial application release uses the existing database and preserves all monitor history and settings.
