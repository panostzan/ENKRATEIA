# ENKRATEIA

Eight seconds between impulse and intention. A complete, local-only Chrome Manifest V3 extension. No build step, account, server, remote fonts, or runtime dependencies.

## Install in Chrome

Download this repository with **Code → Download ZIP** and extract it, or clone it with `git clone https://github.com/panostzan/ENKRATEIA.git`.

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select the extracted repository's `extension` folder (the folder containing `manifest.json`).
4. Pin ENKRATEIA from Chrome's extensions menu.
5. Open the popup, select your working tabs, and **Begin focus session**.

Keep the extension folder in place. After updating its files, use Reload on the extensions page. Refresh existing web pages once after installation to enable their optional interaction shield; the interruption tab works immediately without refreshing.

## The experience

- Selected tabs are approved by **tab identity**, not website. Navigation within an approved tab stays approved. A new tab, even on the same site, requires a conscious choice.
- Switching to an unapproved tab opens an ENKRATEIA interruption tab in the same window. The destination remains open with its document, scroll position, and form state intact.
- **Stay focused** immediately returns to the last available approved tab. **Continue** unlocks after eight wall-clock seconds, enforced in the worker and UI.
- Continue grants that visit only. Returning to approved tabs or attempting a different destination resets the grant.
- **Finish session** opens the longest focus streak, supporting metrics, and a proportional timeline. The last session is accessible from the popup. Summaries support JSON export and local history deletion.

## Measurement and recovery

Focus time includes only approved-tab time while Chrome is focused and the workstation is not locked. Other applications, countdowns, and distractions do not count. Away time breaks a continuous browsing streak; ordinary inactivity does not, so reading is not penalized. Approved-tab switching preserves the streak. Every unauthorized attempt ends it, even a resisted attempt.

Resistance = explicit Stay focused choices / all interruption attempts. Returning via the tab strip, closing a destination, or ending the session records a separate choice, not an invented Stay. With no attempts, resistance is a dash. Zero-length streaks are excluded from the average.

The worker serializes events and commands. Timing uses timestamps, never UI timer ticks. Versioned records contain focus/interruption/distraction/away intervals, attempt timestamps and choices, and streak durations. Worker suspension retains the session through persistence. Closing all approved tabs ends it. Tab replacement preserves approval.

A 30-second alarm checkpoints active sessions. A full browser restart or extension reload ends an unfinished session at its last checkpoint instead of counting offline time. A crash can lose approximately one checkpoint interval (Chrome can delay alarms). Computer lock is excluded; abnormal system sleep without a lock or focus event can be indistinguishable from stationary reading.

## Browser boundaries

This is voluntary friction, not a security boundary. Chrome delivers activation events **after** activation: zero-frame exposure cannot be guaranteed. Ordinary web pages receive an interaction shield while the interruption takes focus. Chrome-owned pages, the Chrome Web Store, other extensions, and pages open before installation cannot receive that shield; they still receive the separate interruption tab. Background media is not paused. File URL shielding requires Chrome's optional file-access setting. Incognito is outside the MVP.

## Privacy

All data stays in Chrome local storage. No network calls, remote fonts, analytics, or external services. Titles label selections and the current destination; no URLs, page content, or destination titles remain in finished session records.

Permissions:
- tabs: list and observe tabs.
- storage: local persistence and worker recovery.
- alarms: recovery checkpoints.
- idle: workstation lock detection, without penalizing reading.
- HTTP/HTTPS content scripts: interaction shielding. No page text is collected.

History stays local until deleted or the extension is uninstalled. Chrome's local-storage quota applies; export and delete old history if needed.

## Development

The extension directory is the distributable. Plain ES modules, HTML, CSS. model.js owns timing; background.js coordinates Chrome; popup, gate, and summary render the views. The versioned timeline records can support future analysis.

Run `npm test` for deterministic timing tests. Run `npm run test:browser` for an isolated Chromium journey. Browser tests need Playwright and Chromium (`npm install --no-save playwright` and `npx playwright install chromium`). Set SCREENSHOTS=1 for captures in test-results. Tests never use your normal browser profile.

References: [tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs), [windows](https://developer.chrome.com/docs/extensions/reference/api/windows), [service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle).

## Summary metric definitions

The hero is the longest uninterrupted focus streak. Supporting metrics include total focused time, average streak, attempts per elapsed session hour, resistance rate, and focused time as a percentage of elapsed session time. Both normalized metrics include away time in the denominator. Zero-duration sessions show a dash for rates; sessions with no attempts show a dash for resistance. Display rounding does not alter stored timestamps or raw exported rates.

Derived metrics carry metricsVersion: 1. Existing version-1 session records need no migration; future progress analysis can recompute rates from their raw durations and counts (aggregate counts/durations, rather than averaging session percentages). Timeline positions use exact timestamps, with separate ticks for attempts so brief interruptions remain visible without distorting durations.

Run `node tests/summary.mjs` for representative desktop/mobile summary, metric, timeline, and export verification.
