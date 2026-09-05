# Public status page technical audit

Audited September 6, 2026 (Philippine time), at http://127.0.0.1:3100/status/philgeps. Scope: public status route, history interaction, refresh component, public CSS and public data mapping. This is a report-only Impeccable audit; no application code, configuration, or database records were changed.

## Implementation integrity verdict: pass

The implementation is coherent with the requested public monitoring board: six services, current health, real recorded-check percentages, Philippine calendar history, and generic incidents. No management buttons, inputs, or forms appear. Unobserved days are explicit, and the percentage disclaimer avoids presenting missing observations as uptime. Private target URLs remain excluded from the public data mapping.

## Audit health score

| Dimension | Score | Evidence |
|---|---:|---|
| Accessibility | 2/4 | Keyboard navigation and sampled text contrast pass; hover persistence and graphical contrast need work. |
| Performance | 3/4 | Small client interaction boundaries, no large media or animation effects; only local cached timing observed. |
| Responsive design | 3/4 | Tested widths fit; date targets are too narrow for comfortable touch use. |
| Theming | 3/4 | Semantic history tokens and intentional light theme; some public colors remain literal. |
| Implementation integrity | 4/4 | Honest metrics, explicit missing data, product-specific structure, read-only public surface. |
| **Total** | **15/20** | **Good: address weak dimensions.** |

Three actionable findings: **0 P0, 2 P1, 1 P2, 0 P3**. This score is a bounded technical assessment, not WCAG certification.

## Findings

### [P1] Tooltip cannot remain open while the pointer moves onto it

- Location: `src/components/public-history.tsx:14` (`onMouseLeave`), `src/app/globals.css:19` (`.public-day-tooltip`).
- Category: accessibility.
- Evidence: hovering a bar creates one tooltip; moving the pointer to the tooltip's center removes it. The tooltip has `pointer-events:none`, is separated from the strip by 12px, and the strip clears selection on mouse leave.
- Impact: people using magnification or a large pointer cannot move onto the detail text to read it. Keyboard Home/End and Escape work when the strip is focused, but do not resolve the hover problem.
- Standard: [WCAG 1.4.13, Content on Hover or Focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html) requires hover-triggered additional content to remain available when the pointer moves onto it.
- Recommendation: give the trigger and tooltip a continuous hover region, allow pointer interaction on the tooltip, and keep it open while either area is hovered or the strip is focused. Preserve Escape dismissal and the existing first-tap focus fix.
- Suggested command: `$impeccable harden`.

### [P1] History bars have insufficient graphical contrast

- Location: `src/app/globals.css:19`, `--status-bar-green`, `--status-bar-mixed`, `--status-bar-empty`, and their history/legend selectors.
- Category: accessibility.
- Evidence: measured computed fill colors against the white service surface: healthy `#31b776` **2.57:1**, mixed `#da9e36` **2.35:1**, and unobserved `#d9e0e9` **1.33:1**. These are below 3:1. They are meaningful daily data and selectable date areas, not decoration.
- Impact: users with low vision can lose the boundaries and presence of daily observations, especially missing-data bars. Hover details require locating those bars first.
- Standard: [WCAG 1.4.11, Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) covers visual information needed to identify controls and understand meaningful graphics.
- Recommendation: use compliant darker boundaries or fills while retaining the four semantic states. Add a non-color distinction for missing/mixed history where feasible; preserve the exact percentage tooltip.
- Suggested command: `$impeccable colorize`.

### [P2] Daily date targets demand excessive touch precision

- Location: `src/components/public-history.tsx:15`, `src/app/globals.css:19` and `:21` (`.public-day`, `.public-history`).
- Category: responsive design / accessibility.
- Evidence: each date handles its own pointer event. At a 390px viewport the measured target was about **7.2 × 23px**, separated by 3px. At 320px it was about **4.9 × 23px**. Desktop targets were about 14.8 × 24px at 1440px.
- Impact: users can select an adjacent date accidentally; the first-tap focus correction does not increase the hit area. Keyboard navigation is a useful workaround for keyboard users, but not a touch equivalent.
- Standard reference: [WCAG 2.5.8, Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) describes a 24px minimum with exceptions; dense charts require assessing applicable exceptions and equivalent pointer access. This report records the concrete usability defect without claiming that every narrow chart mark independently violates that criterion.
- Recommendation: preserve the compact overview, but add a larger read-only date detail interaction on touch, such as a date selector or previous/next day controls with at least 44px touch areas. These are viewing controls, not administrative commands.
- Suggested command: `$impeccable adapt`.

## Diagnostic evidence and boundaries

- Tested viewport widths: 1440, 1050, 900, 820, 800, 790, 780, 761, 760, 390, and 320px. No document horizontal overflow or inspected elements extending beyond the viewport.
- Captured and visually inspected desktop and mobile screenshots in `.impeccable/review/audit-desktop.png` and `audit-mobile.png`.
- Temporarily doubled computed text sizes in browser DOM at 1440 and 390px. No detected clipped text or service-name/current-status overlap; restored original styles afterward. This is a text-scaling probe, not a complete OS/browser zoom matrix.
- Verified Home selects the earliest day, End selects today, Escape dismisses, and the history strip has a visible focus outline.
- Sampled text contrast: operational green on white 4.78:1; muted history labels 5.64:1; refresh countdown on navy 6.72:1. Those samples pass AA normal-text contrast. This was not an exhaustive automated accessibility scan.
- Performance: server-rendered content with two small client components, 180 history bars, no large image/font downloads in the inspected route, and a one-second timer isolated to refresh UI. Observed cached local navigation: roughly 81ms TTFB and 99ms load. Asset transfer sizes were zero from cache, so this does not establish cold-load weight, mobile network performance, field Core Web Vitals, or production capacity.
- No screen-reader session, forced-colors test, or offline/server-error browser scenario was performed. Actual assistive-technology announcement behavior remains unverified.
- The root explicitly uses `color-scheme:light`; there is no promised theme switch. Lack of dark mode is not treated as a defect.

## Detector findings versus verified defects

Ran the bundled detector on the public route, both client components, and shared `globals.css`. It returned 27 advisory records and exit code 1, with no non-advisory records. No records came from the public TSX files. The shared stylesheet scan also includes private dashboard and login rules outside this audit's surface.

Many public typography/radius notices are false positives or documentation-parser limitations: DESIGN.md already describes the public title, summary, responsive type sizes, and compact history geometry. They are not independent UI defects. Literal public colors such as `#b8c5d6` and `#f4c574` could be promoted to named tokens for consistency, but no failed text contrast was established for them. No token/document drift was automatically repaired.

## Patterns and positive findings

The important issues share one cause: the dense history visualization has stronger visual compactness than pointer accessibility. Address the strip as one component rather than applying unrelated cosmetic changes across the page.

Preserve the clear heading hierarchy and main landmark, explicit status words beside colored dots, real check counts, unknown-day treatment, hidden management functions, responsive row reflow, and keyboard date navigation. The public surface does not need a broader redesign.

## Recommended order

1. `$impeccable harden`: repair tooltip hover persistence and dismissal behavior.
2. `$impeccable colorize`: improve meaningful history contrast.
3. `$impeccable adapt`: provide comfortable touch access to individual dates.
4. `$impeccable polish`: verify the combined changes in one bounded desktop/mobile pass.

You can ask me to run these one at a time, all at once, or in any order you prefer. Re-run `$impeccable audit` after fixes to reassess the score.

## Follow-up verification: September 6, 2026

All three findings have been addressed in the public history component and scoped public CSS. The original audit above remains the pre-fix record.

- Hover-to-tooltip travel now retains the tooltip. Escape dismisses without requiring focus first; focused history stays visible when the pointer leaves. Home/End still select earliest/latest dates.
- Computed contrast against white: healthy 4.55:1, mixed 4.45:1, failed 4.07:1, empty-day boundary 3.85:1. All exceed the 3:1 graphical threshold.
- Daily details offers an equivalent native date picker on every viewport. Measured disclosure 110 by 44px and mobile picker about 313 by 44px. Verified first tap on an old bar, an unobserved date, and today's real check counts in a fresh touch-enabled browser context.
- No horizontal overflow at 320, 390, 760, 761, 900, and 1440px. Desktop and mobile screenshots inspected: history-fixed-desktop.png and history-fixed-mobile.png under .impeccable/review.
- Production build and TypeScript passed. The history component detector returned no findings. No backend changes or full database test rerun were needed for these presentation fixes.
- Screen-reader speech and real-device native picker presentation remain outside this browser verification. This is targeted closure of the three findings, not a new full conformance certification or rescored audit.
