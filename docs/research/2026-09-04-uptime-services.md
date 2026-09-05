# Uptime monitoring service research

Research date: 4 September 2026. Scope: the publicly documented behavior of UptimeRobot, Better Stack, and Pingdom, applied to a custom dashboard supporting multiple projects, Discord webhooks, and email.

These findings describe published product behavior. They do not establish which databases, queues, infrastructure topology, or private algorithms the vendors use. The companion [proposed design](../superpowers/specs/2026-09-04-uptime-design.md) is our engineering recommendation.

## What the three services do

| Area | UptimeRobot | Better Stack | Pingdom |
| --- | --- | --- | --- |
| Availability checks | Scheduled HTTP and other checks; configurable success criteria | HTTP checks plus configurable content, API, and other checks | Scheduled availability checks, with additional transaction and performance products |
| Confirming failure | Rotates selected regions; performs confirmation retries within the region detecting the issue | By default, checks from at least four locations and creates an incident after failures from at least three | A second server in another location checks the initial failure before downtime is logged |
| Organizing many services | Groups, tags, and bulk actions | Monitor groups and configurable monitor policies | Tags and per-check settings |
| Alert lifecycle | Down, up, expiry events; delay and recurring options | Incident creation, acknowledgement, resolution, reopening, and configurable confirmation/recovery periods | Configurable alert delay, reminders, recovery alerts, and contacts |
| Diagnostic context | Check errors, timestamps, regions, HTTP status | Error responses, screenshots, incident timelines; some diagnostics depend on monitor type | Second-opinion results and diagnostic reports, including traceroute where available |

The sources below support the individual observations and the limits of the comparison.

### UptimeRobot

Its current troubleshooting guide says connection failures can trigger up to three retries spaced 20 seconds apart, and application failures up to three spaced 10 seconds apart. It describes exceptions for certificate errors and already-down monitors. Confirmation occurs within the checking region; there is no cross-region voting requirement. Its separate location documentation also describes round-robin regions and regional confirmation. [Failure confirmation](https://help.uptimerobot.com/en/articles/11358466-how-to-debug-a-monitor-showing-as-down-in-uptimerobot), [locations](https://help.uptimerobot.com/en/articles/11358522-understanding-uptimerobot-locations-and-multi-location-feature).

Groups support visible organization and bulk actions; tags supply additional classification. This is a useful pattern for a portfolio of unrelated projects. [Monitor groups](https://help.uptimerobot.com/en/articles/11358543-how-to-group-monitors-in-uptimerobot-organize-your-monitors-easily).

Notification destinations must be assigned to monitors. Outgoing webhooks can include incident times, HTTP status, regions, tags, groups, and dashboard links. The test-notification documentation explicitly distinguishes a submitted request from proof that the destination received it. [Notification channels](https://help.uptimerobot.com/en/articles/11360978-understanding-notification-channels-in-uptimerobot), [webhook integration](https://help.uptimerobot.com/en/articles/14498593-webhook-integration), [notification testing](https://help.uptimerobot.com/en/articles/11602913-how-to-test-notifications-in-uptimerobot-quick-guide).

Application assertions can inspect JSON fields, response headers, status codes, or response content. A successful HTTP response alone need not prove the application is functioning. [API monitoring](https://help.uptimerobot.com/en/articles/13628553-uptimerobot-api-monitoring).

### Better Stack

Its default location policy uses at least four locations and requires failure from at least three before creating an incident. The exact behavior of restricted-location configurations should be checked before assuming the default still applies. [Locations and regions](https://betterstack.com/docs/uptime/locations-and-regions/).

Confirmation and recovery are separate settings. Confirmation delays incident creation; recovery requires a sustained healthy period, with another failure resetting recovery. This is a useful way to reduce repeated down/up alerts during unstable recovery. [Confirmation and recovery](https://betterstack.com/docs/uptime/confirmation-and-recovery-period/).

The monitor API exposes groups, check frequency, request timeouts, accepted status codes, request headers, selected regions, and maintenance settings. Its outgoing incident webhooks cover incident lifecycle events, separately from monitor configuration changes. [Monitor configuration API](https://betterstack.com/docs/uptime/api/create-a-new-monitor/), [outgoing webhooks](https://betterstack.com/docs/uptime/webhooks/).

The product also advertises incident screenshots, API error capture, and network diagnostics. These are broader features than a basic HTTP checker. [Uptime product](https://betterstack.com/uptime).

### Pingdom

Pingdom documents a second check from a different location after a connection problem or HTTP error. It records downtime after that second opinion confirms the issue. Its diagnostic reports can show the checking servers, responses, redirects, and traceroute results. This reduces some false positives; it cannot establish that every alert is correct for every user location. [Downtime and diagnostics](https://www.pingdom.com/tutorial/downtime-root-cause/).

Checks have configurable intervals, selected geographic groups, optional IPv6, and tags. Notifications can be delayed and repeated, and a recovery message can follow an outage. Generic outgoing webhooks are attached to individual checks and fire on status changes. [Check setup](https://documentation.solarwinds.com/en/success_center/pingdom/content/gsg/create-check.htm), [alerting](https://www.pingdom.com/product/alerting/), [webhooks](https://documentation.solarwinds.com/en/success_center/pingdom/content/topics/webhooks-or-slack-integration.htm).

## Lessons for this project

1. Separate the individual probe result, the monitor's interpreted health, the incident, and the notification delivery. Each has a different lifecycle.
2. Confirm failures and require stable recovery. Preserve regional disagreement instead of declaring it universally up or down.
3. Make project grouping, environment labels, and destination routing first-class features.
4. Include failure evidence and an incident link in each alert.
5. Test notifications through the real delivery path and expose delivery failures.
6. Describe measurement coverage honestly. A silent or stopped checker must not create apparent 100% uptime.

These are recommendations inferred from the documented product behaviors and the project's requirements.

## Platform and integration findings

**Scheduling.** Vercel documents possible overlapping runs, missed or duplicate cron deliveries, and no automatic retry of a failed invocation. Hobby cron schedules run at most daily. These constraints support using separate persistent monitoring workers for a minute-by-minute service, while retaining Next.js for the dashboard. [Cron behavior](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

**Hosting portability.** Next.js supports self-hosting. Choosing Next.js does not require putting monitoring workers inside a dashboard request handler or selecting one hosting vendor. [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting).

**Discord.** Execute Webhook supports `wait=true` to request confirmation and a returned message object. Use restricted `allowed_mentions` when formatting user-provided names or messages. Rate limits can change: consume response headers and `retry_after` instead of assuming a fixed requests-per-second allowance. [Execute Webhook](https://docs.discord.com/developers/resources/webhook#execute-webhook), [rate limits](https://docs.discord.com/developers/topics/rate-limits).

**Email.** Read-only Vercel Marketplace discovery returned `resend/resend-email` in the messaging category during this research. No integration was provisioned. Resend supports verified sending domains, a 24-hour provider idempotency window, and delivery/bounce/failure events. A delivered event means the recipient's mail server accepted the email; it does not prove inbox placement or that a person read it. [Verified domains](https://resend.com/docs/dashboard/domains/introduction), [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys), [email events](https://resend.com/docs/webhooks/event-types).

**Persistence.** PostgreSQL explicitly documents `SKIP LOCKED` as useful for multiple consumers of queue-like tables. This supports a bounded initial design using PostgreSQL-backed jobs and a durable notification outbox; it does not imply end-to-end exactly-once message delivery. [PostgreSQL SELECT](https://www.postgresql.org/docs/current/sql-select.html).

**Security.** A service fetching configured URLs needs SSRF defenses, including protocol/address validation, attention to DNS changes, and network restrictions. Every redirect needs equivalent treatment. [OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

**Access control.** Next.js recommends established authentication/session libraries. Authentication must be accompanied by authorization at the server data and mutation boundaries. [Next.js authentication](https://nextjs.org/docs/app/guides/authentication).

## Research boundaries

No paid accounts, production monitors, webhooks, email recipients, or hosting resources were created. No messages were sent. Vendor runtime behavior was researched from official sources rather than independently tested. Current pricing was not used to produce a hosting quote; cost depends on the chosen deployment and monitor volume.

## SaaS scope update: public registration and commercial readiness

The product scope now includes independent customers registering and creating their own workspaces. Registration, authorization, quotas, and paid-access state therefore form part of the foundation. The updated design separates a public beta from the additional payment and operating gates required to sell subscriptions.

Read-only Marketplace discovery returned Clerk among authentication options, Stripe in payments, and Neon among PostgreSQL storage options. These discoveries do not prove account eligibility, pricing suitability, or completed provisioning. Clerk is the proposed identity provider; the application owns workspace membership and product entitlements. [Clerk organization concepts](https://clerk.com/docs/guides/organizations/overview).

PostgreSQL row-level security applies per-row access policies, with important exceptions for superusers, roles with `BYPASSRLS`, and normally table owners. Tenant isolation must be exercised using the actual runtime database roles. [Row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

Multi-tenant isolation needs to include cache keys, asynchronous jobs, resource limits, and operational access. Workspace ownership checks alone on dashboard pages are insufficient coverage for the background monitoring and notification paths. [OWASP multi-tenant guidance](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html).

Stripe documents subscription events for successful payments and failed renewals. Its webhooks can be delivered more than once and out of order, so paid access needs durable event deduplication and reconciliation. Merchant-country eligibility remains a provider-selection prerequisite. [Subscription events](https://docs.stripe.com/billing/subscriptions/webhooks), [webhook handling](https://docs.stripe.com/webhooks), [availability](https://stripe.com/global).
