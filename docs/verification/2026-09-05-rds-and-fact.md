# RDS and FACT configuration — 5 September 2026

## Completed

- Discord's actual webhook was renamed to Mang Tani with a token-authenticated PATCH and independently read back. Outgoing application messages also use Mang Tani as the username override. No extra live notification was necessary for the rename.
- FACT PROD is configured at http://126.52.131.6/ and FACT UAT at http://136.158.228.120/. Both passed the normal application probe with HTTP 200.
- The supplied RDS endpoint first rejected the untrusted certificate chain. The public regional CA bundle was downloaded from AWS's official HTTPS trust store; the connection now uses verify-full with the bundle. A live pg_stat_ssl query confirmed TLSv1.3 against uptime_db. No TLS verification, database firewall or access control was disabled.
- The destination contained no public tables. With the local web process and worker stopped, a consistent source snapshot was saved under ignored .local/backups/uptime-before-rds-2026-09-05.json. Schema and data were copied transactionally into the empty destination. Ordered row-content hashes matched for every table, preserving timestamp precision. Identity sequences were reset above the copied values.
- Verified copy counts: six monitors, 268 checks, zero incidents, two delivery records, one settings record and one worker-health record. The original local database was not deleted or modified by the copy.
- The active .env.local connection now points to RDS and remains Git-ignored. Web and worker were restarted, and FACT URLs were saved through the application API. The running application independently reported uptime_db and TLSv1.3; all six current observations returned HTTP 200.
- Browser verification showed all six targets healthy, the “All services are operational” heading, no remaining target-setup notice, and both email and Discord configured. With setup complete, the requested automatic outage/recovery alerts were enabled through Settings' application API and independently read back as enabled. The notification record count remained two: historical events were not replayed.
- Twelve automated tests passed and the production build passed after the sender/default-target changes. The app health endpoint reports the database connected and the worker running.

The application still runs on the local computer at http://127.0.0.1:3100. The VM has not been deployed or changed. Historical email and Discord tests were accepted before migration; their records were copied without replaying them.
