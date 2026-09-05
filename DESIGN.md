---
name: Bayanko Uptime
description: A quiet operations register for private service monitoring.
colors:
  bg: "#f5f7fa"
  surface: "#fff"
  ink: "#202d42"
  muted: "#5c687b"
  line: "#e0e6ee"
  navy: "#254875"
  blue: "#365f95"
  green: "#17734d"
  green-soft: "#edf7f1"
  red: "#b3293e"
  red-soft: "#fff0f1"
  amber: "#805318"
  amber-soft: "#fff8e9"
  history-pass: "#319471"
  history-fail: "#c24a59"
  history-empty: "#e3e8ef"
  focus: "#7499ca"
  status-header: "#141c28"
  status-green: "#15834f"
  status-bar-green: "#258653"
  status-bar-mixed: "#a16d16"
  status-bar-red: "#d45164"
  status-bar-empty: "#d9e0e9"
  status-bar-outline: "#768395"
typography:
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "28px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "17px"
    fontWeight: 650
    lineHeight: 1.4
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "14px"
    lineHeight: 1.5
  monitor-name:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "13px"
    fontWeight: 600
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "11px"
  code:
    fontFamily: "Consolas, monospace"
    fontSize: "12px"
rounded:
  surface: "12px"
  primary: "7px"
  control: "6px"
  filter: "5px"
  tag: "4px"
spacing:
  control-gap: "6px"
  icon-gap: "8px"
  compact: "12px"
  row-gap: "24px"
  page-gutter: "40px"
  mobile-gutter: "18px"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.surface}"
    rounded: "{rounded.primary}"
    padding: "9px 14px"
  button-primary-hover:
    backgroundColor: "#173b69"
  button-small:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "6px 10px"
  button-small-hover:
    backgroundColor: "#edf2f8"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "7px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "7px 10px"
  filter-selected:
    backgroundColor: "#e9eff7"
    textColor: "{colors.navy}"
    rounded: "{rounded.filter}"
    padding: "6px 9px"
  register:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.surface}"
  health-summary:
    backgroundColor: "{colors.green-soft}"
    textColor: "{colors.green}"
    rounded: "{rounded.surface}"
    padding: "22px 25px"
  login-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.surface}"
    padding: "32px"
  login-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 12px"
---

# Design System: Bayanko Uptime

## Overview

**Creative North Star: "The Operations Register"**

A quiet, compact workspace for checking service health during a working day. Cool gray ground, clean white rows, blue ink, aligned measurements, and restrained outline icons keep six private monitors easy to scan. Status color carries meaning; decoration is minimal.

The existing implementation is the authority for this document: `src/app/globals.css`, the dashboard, monitor-row and settings-panel components, and the desktop/mobile captures in `.impeccable/review/`. This is a record of the built interface. Component behaviors described beyond the overview screenshots were verified from source.

**Key Characteristics:**

- Health and freshness appear before configuration detail.
- Stable rows align names, observations, response times, and pass rates.
- Pale surfaces, thin borders, and modest corners provide structure.
- Unknown and absent observations remain explicit.

## Colors

The palette combines muted blue navigation with functional green, red, and amber states. Frontmatter values preserve the source colors; names below describe their use.

### Primary

- **Navy ink (`navy`)** anchors the mark, primary actions, active navigation, links, and the uncertain-health summary.
- **Measured blue (`blue`)** identifies response-chart lines and supporting action icons.

### Neutral

- **Cool ground (`bg`)** fills the page; **white surface (`surface`)** holds the header and monitor register.
- **Dark ink (`ink`)** is the primary text color. **Slate (`muted`)** supports labels, timestamps, configuration context, paused states, and unknown states.
- **Quiet divider (`line`)** separates sections and rows without adding visual weight.
- **No-observation gray (`history-empty`)** marks missing history buckets. It is paired with a visible legend and accessible history description.

### Status colors

- **Operational green (`green`, `green-soft`)** communicates healthy services and successful delivery. The history uses its own brighter `history-pass` fill.
- **Incident red (`red`, `red-soft`)** communicates confirmed outages, failed deliveries, and errors. The history uses `history-fail` for individual failed checks.
- **Setup amber (`amber`, `amber-soft`)** identifies missing target URLs, confirmation in progress, pending delivery, and warnings.
- **Focus blue (`focus`)** is reserved for keyboard focus outlines.

The public board uses a dark `status-header` masthead and `status-green` operational emphasis. Its daily history has four distinct fills: `status-bar-green` for all recorded checks passing, `status-bar-mixed` for some failing, `status-bar-red` for all failing, and `status-bar-empty` for no observations. These public tokens do not replace the private dashboard palette.

**The Observation Rule.** An empty bucket is not a passed check. Preserve separate passed, failed, and no-observation treatments, and retain accompanying text.

## Typography

The interface uses the operating system sans-serif stack throughout. Consolas is reserved for technical examples. There is no display font or decorative type pairing.

- Page headlines use the frontmatter `headline` role, reducing to 24px at the mobile breakpoint.
- Section titles use `title`; local headings and prominent monitor names are smaller and moderately weighted.
- The base body is 14px. Most operational copy sits at 11–13px, with 10px timestamps and history labels on desktop. Mobile secondary labels can reach 9px in the current implementation.
- Metric values use tabular numerals, with units and observation age on quieter adjacent lines.
- Monitor names and URLs wrap when needed. Do not truncate the identity needed to distinguish services.

## Layout

The desktop page and header share a centered container capped at 1328px with 40px side padding. At a viewport of at least 1450px, the cap becomes 1400px. The white header is 76px high, followed by a 62px horizontal navigation row. The main heading, overall-health strip, setup note, monitor register, and supporting incident/connection information follow in normal document flow.

The desktop register uses five aligned grid columns: monitor identity, past-hour history, response, 24-hour pass rate, and an expansion control. The standard grid is `minmax(265px, 1.35fr) minmax(175px, 1fr) 105px 108px 26px`, with 24px gaps and 22px side padding. Rows have a 96px minimum height. The lower overview uses a flexible incident column beside a 330px connection column. Settings narrows to 940px.

Responsive changes are deliberate:

- At 1100px and below, page gutters shrink to 25px and the register becomes denser.
- At 800px and below, the header becomes 65px high, navigation context is hidden, the search field moves below the filters, and the pass-rate column is temporarily hidden.
- At 720px and below, gutters become 18px and the table header disappears. Each monitor reflows into identity plus expansion control, a full-width history strip, and two explicitly labeled metric blocks. The pass rate returns in this mobile arrangement. Summary totals become a horizontal line beneath the message; lower overview sections, detail columns, and edit fields stack.

Expanded details remain directly beneath their monitor. Editing stays within that expanded area so the service identity and surrounding context remain visible.

The public status board has a full-width dark masthead with a 1240px inner cap. Its main container is capped at 1304px including 32px side gutters, aligning a 1240px content area with the masthead. A white overall-health summary overlaps the masthead by 52px. The compact service table aligns service name, checks-passed percentage, daily history, and current status in four columns, with 83px minimum row heights. At 1050px and below, columns and gaps tighten. At 760px and below, the masthead stacks, main gutters become 20px, and the overlap becomes 50px; service rows place identity and status first, the labeled percentage second, and full-width history third. The legend, incident history, and footer follow below. The Settings page editor and service choices retain their separate 600px stacking breakpoint.

The sign-in surface uses the same Operations Register palette and mark in a single column capped at 410px. The page centers this column within a minimum height of 100svh, with 48px vertical and 24px horizontal padding. The brand precedes a white bordered panel with 32px padding; a quiet private-access footnote follows it. At 600px and below, page padding becomes 30px 20px, panel padding becomes 26px 22px, and field text increases from 15px to 16px. The dashboard header retains Sign out at this breakpoint while hiding its worker indicator; the sign-out button has a 36px minimum height.

## Elevation & Depth

The implementation uses no box shadows. White surfaces, pale detail backgrounds, one-pixel dividers, and spacing establish hierarchy. Hover changes are small tonal shifts; keyboard focus uses a visible three-pixel outline with a three-pixel offset. The search wrapper uses a two-pixel outline with a one-pixel offset.

Motion is limited to button color transitions (160ms), history-bar hover scaling (120ms), the expanding chevron (180ms), the switch thumb (160ms), and a busy refresh icon. Reduced-motion preferences disable animations and transitions.

## Shapes

The monitor register, incident container, and health summary share gently rounded 12px surfaces. Primary buttons use 7px corners; fields and small/icon buttons use 6px; filters and small status tags use tighter corners. Rows themselves remain flat and rectangular within the shared container.

Status dots are circles; history buckets are slim vertical bars with subtly rounded ends. Outline icons accompany concrete meanings and actions. There are no photographic assets, illustrations, gradients, or ornamental hero regions in this interface.

## Components

### Navigation and actions

Overview, Incidents, and Settings use text tabs with a navy underline for the active page. The active incident count uses a small red-tinted badge. The navigation remains horizontal on mobile.

The navy primary button carries the prominent task, such as Run checks or Save monitor. White bordered small buttons carry local actions; icon buttons serve compact controls such as expand and dismiss. Hover treatments adjust background or text color. Disabled buttons lower opacity and use an unavailable cursor. Keyboard focus remains visible on buttons, links, fields, and expandable summaries.

### Health summary and feedback

The overall-health strip combines an icon, a short headline, supporting context, and Healthy/Down/Total counts. Its surface changes from pale green to pale red for outages or pale blue for unknown/freshness states. Color always accompanies an icon and words. Success, error, and warning notices use the same restrained semantic approach, with status/alert roles in the markup.

### Filters, search, and fields

The register toolbar holds compact status filters and a bordered search field. Selected filters have a pale blue fill and navy text. Empty searches show a clear explanatory state and a Clear filters action.

Monitor editing uses persistent field labels, white bordered inputs, a native checkbox, and explicit Save monitor/Cancel actions. The target field spans both desktop form columns. Settings groups channel configuration, delivery history, and monitoring facts using headings and dividers. Its alert switch has a green on-state and slate off-state.

### Sign in and sign out

Sign in uses a 27px heading, short supporting copy, and persistent Email address and Password labels. Fields and the full-width navy submit button have a 45px minimum height. Email and password fields support credential autofill. The password field reserves space for an inset outline-eye button with Show password/Hide password labels and an exposed pressed state. Fields, password reveal, and submit retain the shared visible keyboard focus outline.

Submission disables the credential fields and submit button, marks the form busy, and changes the action to Signing in… with the shared spinning indicator. Reduced-motion preferences suppress the animation. A failed attempt displays an inline red-on-pale-red alert above the submit action, then restores input and submission. The panel keeps the existing flat surface and 12px corners; it introduces no new visual identity.

The dashboard header uses the existing white bordered small-button treatment for Sign out, with an outline exit icon. While the request runs, the disabled button reads Signing out…. Failure places a compact textual alert directly beneath the control. Successful sign-in opens the dashboard, successful sign-out returns to Sign in, and an already signed-in visit to the login page returns to the dashboard.

### Monitor register and evidence

Each row pairs a status dot with the monitor name, project, and textual state. Both the identity and chevron expand its detail region. The history has 60 minute buckets, endpoint labels, hover descriptions, and an accessible summary of passed, failed, and unobserved minutes.

Response values show milliseconds and observation age. Pass rate always has coverage context; a monitor without observations shows an em dash and explicit empty wording. The detail region includes the target URL, local controls, a response chart, and latest-observation facts. A chart without samples states when data will appear. A lone sample remains a visible point.

### Incidents and delivery history

Incident entries and delivery rows use thin separators, compact metadata, and restrained status tags. Empty states explain what will appear and, where available, offer a next action. They do not show fabricated chart data or preexisting incidents.

### Public status and page editor

The public board pairs a dark masthead with an overlapping white overall-health summary and a compact service table. The page title is 29px, reducing to 25px at 760px; the summary headline is 31px, 27px at 1050px, and 23px at 760px. Summary and service container corners are 12px. Current status always includes words and a dot; unconfirmed health remains explicit.

Checks passed shows the percentage of recorded checks passing over the last 30 days, to three decimal places. Gaps are excluded; no observations displays an em dash. Thirty daily bars use Philippine calendar dates and the four-state public legend. Hover or tap selects a day; keyboard focus starts at the latest day, Left/Right moves between days, Home/End selects the endpoints, and Escape dismisses the tooltip. The dark tooltip reports the date, percentage, and passed/total checks, or No observations. The strip has one keyboard focus stop, a visible focus outline, and an associated tooltip description.

The masthead shows Last refreshed in Philippine time and a countdown to the next 30-second refresh. Refreshing… appears when due, and Updates delayed appears after 45 seconds without fresh data. Returning to a visible tab triggers a refresh. Incident history covers the last 60 days with Philippine-time timestamps; the footer carries Bayanko Uptime attribution.

Public page management belongs in Settings. The inline white bordered editor uses 8px corners, persistent labels, native service and publication checkboxes, a description count, and explicit Cancel and Save actions. Page rows show the public path, service count, and Published or Draft state; published rows offer Open page. Target URLs and technical errors stay outside the public view.

## Do's and Don'ts

### Do:

- **Do** keep status, observation age, and coverage visible alongside numeric results.
- **Do** preserve the responsive row reflow and explicit mobile metric labels.
- **Do** place monitor details and editing beneath the selected row.
- **Do** pair color with labels, icons, legends, or accessible descriptions.
- **Do** use the existing flat surfaces, compact type, and shared alignment for future screens.

### Don't:

- **Don't** fill missing history with successful checks or imply that local history was imported.
- **Don't** treat an individual failed history bucket as interchangeable with a confirmed incident.
- **Don't** turn unknown, paused, or unconfigured monitors into a healthy state.
- **Don't** add decorative hero regions, imagery, or shadowed cards to this operations register.

Public history accessibility refinement (September 6): tooltips accept hover through a continuous 12px bridge, remain while the strip has keyboard focus, and dismiss with Escape even when opened only by hover. Empty days retain their light fill with a status-bar-outline border. Healthy, mixed, failed fills and empty-day boundaries exceed 3:1 against white. Each service includes a collapsed Daily details disclosure with a native date selector and an announced percentage/count result; both disclosure and selector have a 44px minimum target height. These controls only change which historical date is viewed. Rows grow naturally to accommodate the disclosure or expanded details. Forced-colors mode supplies distinct solid, dashed, thick, and dotted history boundaries.

UI copy rule (owner request, September 6): keep labels limited to identity, status, actions, field names, and explanations needed to interpret data or make a decision. Do not add slogans, generic page subtitles, private-access badges, local-computer labels, or infrastructure narration. Public footer taglines/attribution and login promotional copy have been removed. Preserve actionable errors, form labels, time zones, and metric definitions.
