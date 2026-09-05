# Public status board redesign — 5 September 2026

User reference: UptimeRobot screenshot supplied in conversation. Applied dark masthead, overlapping overall status, aligned service name/percentage/history/current-state rows, refresh countdown and compact incident section. Private dashboard remains separate.

Data: 30 Philippine-calendar days, matching retained checks. Percentages are successful recorded checks divided by observed checks, not time-weighted availability. Missing days remain unobserved. Hover/tap/keyboard details show date, percentage and successful/total counts. Daily palette distinguishes all healthy, mixed results, failed and no observations.

Verification:
- All 14 automated tests passed; added daily/total pass counts and missing-day assertions in disposable PostgreSQL. Public URL privacy assertion retained.
- Production build/typecheck passed.
- Browser: six services, no command controls, no private target IPs or configuration secrets in public HTML. Anonymous management API remains 401.
- Responsive at 1440, 900 and 390 pixels: no overflow or JavaScript errors.
- Countdown changed and the server-rendered refreshed timestamp advanced after 30 seconds.
- Keyboard Home/End selected earliest/latest date; Escape dismissed tooltip.
- Review found first-tap focus overwrite. Reproduced in touch context; fixed focus order. Retest first tap on oldest day displayed Aug 7 / No observations; End showed Sep 5 percentage; Escape dismissed.
- Captures in .impeccable/review/status-board-*.png. No new notification messages or monitor changes.
