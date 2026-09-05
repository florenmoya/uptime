# Production deployment

Deployed September 6, 2026 (Philippine time).

- Repository: `git@github.com:florenmoya/uptime.git`, branch `main`.
- Application release: `8f21819`, archived from Git and built on Linux.
- Dashboard: https://uptime.bayanko.ph/
- Public status: https://uptime.bayanko.ph/status/philgeps
- VM: existing `ssh bayanko`, origin `18.143.58.31`.
- Runtime: isolated Node 24.20.0 at `/opt/uptime/runtime/node`, checksum verified against the vendor release.
- Release: `/opt/uptime/releases/8f21819`; `/opt/uptime/current` points to it.
- Services: `uptime-web` and `uptime-worker`, running as dedicated OS user `uptime`, enabled on boot. Existing nginx, PM2, PHP and CSC queue services remained active.
- nginx proxies HTTPS to loopback `127.0.0.1:3100`. The app port is not publicly bound.
- Let's Encrypt origin certificate expires December 4, 2026. Certbot timer is enabled, with webroot challenges and a deploy hook to validate/reload nginx after renewal. Hook source: `deploy/uptime-nginx-renew-hook.sh`.
- Cloudflare A record is proxied to the requested IP. Added an active Configuration Rule named `Uptime HTTPS origin`, matching only `http.host eq "uptime.bayanko.ph"`, with SSL mode Strict. This resolves the inherited HTTP-origin redirect loop without changing the zone-wide mode or other hostnames.
- Secrets are in `/opt/uptime/shared/.env.local`, mode 600, owned by uptime; releases use a symlink. No credentials were committed.
- RDS application role `uptime_app` has application table/sequence privileges, with no superuser, create-database, or create-role permission. Existing monitor records, settings, published page and historical checks were preserved. No seed or migration was run on the production database during deployment.
- Local checker supervisor and child stopped before the VM checker took over. The local web dashboard may still read the shared database; it is not the monitoring scheduler.

## Verified

- All 14 local tests passed before deployment. Linux production build and TypeScript passed with one build worker.
- Public HTTPS returns 200; HTTP redirects to HTTPS. `/api/health` reports database connected and worker running.
- Signed-out private API returns 401; production login returns 200; authenticated private API returns 200 with `Cache-Control: no-store`.
- Session cookie is Secure, HttpOnly and SameSite=Lax. Cross-origin login request returns 403. Logout returns 200 and replaying the revoked cookie returns 401.
- Browser login, six-service dashboard, logout, and signed-out public page passed on the production domain.
- The VM worker recorded fresh healthy checks for all six services. Initial web/worker restart counts were zero; observed combined service memory was about 188 MiB.
- SMTP authentication and STARTTLS handshake passed from the VM. Discord endpoint was reachable and returned webhook name Mang Tani. No extra test messages were sent during deployment.

Verification did not reboot the shared VM, send new notification tests, perform a full accessibility recertification, or establish a new database backup/restore policy. Systemd enablement and the existing certificate renewal timer were checked without disrupting unrelated services.
