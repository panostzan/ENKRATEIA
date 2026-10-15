<a name="readme-top"></a>

[![Stars][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
![Chrome 120+][chrome-shield]

<br />
<div align="center">
  <a href="https://github.com/panostzan/ENKRATEIA">
    <img src="extension/icons/128.png" alt="ENKRATEIA logo" width="80" height="80">
  </a>
  <h1 align="center">ENKRATEIA</h1>
  <p align="center">
    Inspired by a reel sent by my mom; throughout human history being fat was a status symbol. then it flipped. Attention span is the new status symbol
    <br />
    <strong>Attention is the new status symbol.</strong>
    <br /><br />
    <a href="#getting-started">Install the extension</a>
    ·
    <a href="docs/BEHAVIOR.md">Explore the docs</a>
    ·
    <a href="https://github.com/panostzan/ENKRATEIA/issues">Report a bug</a>
    ·
    <a href="https://github.com/panostzan/ENKRATEIA/issues">Request a feature</a>
  </p>
</div>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About the Project</a></li>
    <li><a href="#built-with">Built With</a></li>
    <li><a href="#getting-started">Getting Started</a></li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#privacy-and-measurement">Privacy and Measurement</a></li>
    <li><a href="#development">Development</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

## About the Project

![The eight-second interruption screen][interruption-screenshot]

I'm a chronic tab switcher and will be operating in countless tabs at once every time I open my computer so I decided to make an extension to prevent that. ENKRATEIA is a minimal Chrome extension that puts an eight-second pause between your ability to tab switch. The goal is once you begin a focus session you preselect the tabs you are allowed to use and ENKRATIEA blocks all others behind an 8 second wall. 

Choose your productive tabs, start a session, and work freely within that workspace. When you switch elsewhere, you can return immediately or wait eight seconds and deliberately continue.

**The goal is added friction, not prohibition.**

- A calm interruption screen that preserves the destination's page state.
- Focused browsing time and uninterrupted streaks, with pauses when Chrome loses focus.
- A session reflection with a proportional timeline and locally stored records.
- No account, cloud service, tracking, or runtime dependencies.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

Chrome Manifest V3, JavaScript ES modules, HTML, and CSS. Node's built-in test runner checks measurement and worker behavior; Playwright checks the browser journey and summary rendering.

## Getting Started

### Prerequisites

Chrome 120 or later on a desktop computer. **No Node.js installation or build step is needed to use the extension.**

### Installation

1. [Download the repository ZIP][download-url] and extract it somewhere you will keep.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extracted **`extension` folder**, which contains `manifest.json`.
5. Pin ENKRATEIA from the extensions menu.
6. Refresh existing web pages once so their optional interaction shield is available.

Alternatively, clone the repository:

```sh
git clone https://github.com/panostzan/ENKRATEIA.git
```

Then load its `extension` folder using the same steps. After updating the files, click **Reload** on the ENKRATEIA card at `chrome://extensions`.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Usage

1. Open the popup and select the tabs you intend to work in.
2. Choose **Begin focus session**.
3. Switch freely between approved tabs.
4. On an unapproved tab, choose **Stay focused** immediately or **Continue** after eight seconds.
5. Choose **Finish session** to review your session.

The summary puts your **longest uninterrupted focus streak** first, supported by total focused time, average streak, distraction attempts per hour, resistance rate, and focus percentage.

![Session summary showing a representative one-hour session][summary-screenshot]

*Illustrative test session: 45 minutes focused, a 20-minute longest streak, two attempts, and 75% focused browsing.*

The timeline separates focused periods, interruptions, distractions, and time away. Hover or keyboard-focus a period to inspect it. Export a session as JSON or delete local history from the summary.

## Privacy and Measurement

All browsing/session data stays in Chrome's local storage. The extension makes no network requests and requires no account.

Approval is by **tab identity**: navigation within an approved tab remains approved; a new tab receives a pause. Continue allows that visit, rather than approving the tab for the whole session.

Focused time excludes countdowns, distractions, other applications, and workstation lock. Attempts per hour and focus percentage use total elapsed session time, including time away. Resistance measures explicit **Stay focused** choices.

Chrome reports tab activation after it happens, so a brief destination flash is possible. Restricted pages receive the interruption tab but cannot receive the interaction shield. A browser restart ends unfinished sessions at the last checkpoint rather than counting offline time.

See [behavior, permissions, recovery, and metric definitions](docs/BEHAVIOR.md) for the full details.

## Development

Use Node.js 22+ for development. The distributable is the `extension` directory; there is no build pipeline.

```sh
npm test
```

For browser and visual checks:

```sh
npm install --no-save playwright
npx playwright install chromium
npm run test:browser
node tests/summary.mjs
```

To capture the extension journey, run `node tests/browser.mjs --screenshots`. Captures go to the ignored `test-results` directory. Tests use isolated browser profiles, never your usual browsing session.

| File | Responsibility |
| --- | --- |
| `extension/model.js` | Timestamp-based measurement and derived metrics |
| `extension/background.js` | Session state, browser events, persistence, and recovery |
| `extension/shield.js` | Interaction shielding on unapproved web pages |
| `extension/popup.*` | Tab selection and live session controls |
| `extension/gate.*` | The eight-second choice |
| `extension/summary.*` | Session reflection, timeline, and export |

Versioned raw session records and derived metrics leave room for future progress tracking without requiring a dashboard today.

## Roadmap

- [x] Approved tabs and voluntary eight-second interruptions
- [x] Focus tracking, streaks, resistance, and local persistence
- [x] Refined session summary and timeline
- [x] Measurement, recovery, browser, and visual checks
- [ ] Gather feedback from everyday sessions
- [ ] Refine reliability and usability based on that feedback

Accounts, leaderboards, and cloud synchronization are outside the current MVP. Suggestions can be discussed in [issues][issues-url].

## Contributing

Report a reproducible bug or propose a focused improvement in [issues][issues-url]. For a code change, fork the repository, create a branch, run the relevant checks, and open a pull request explaining the behavior before and after.

Keep the product small, the interaction deliberate, and session data local.

## License

An application license has not been selected. The README layout is adapted from the MIT-licensed template credited below; its [license notice](docs/README-TEMPLATE-LICENSE.txt) applies to that template.

## Contact

Maintained by [@panostzan](https://github.com/panostzan). Use [GitHub issues][issues-url] for feedback.

## Acknowledgments

- [Best-README-Template](https://github.com/gtzan/Best-README-Template), originally by [Othneil Drew](https://github.com/othneildrew), for this README's structure.
- [Chrome Extensions documentation](https://developer.chrome.com/docs/extensions).
- [Playwright](https://playwright.dev/) for browser testing.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

[stars-shield]: https://img.shields.io/github/stars/panostzan/ENKRATEIA?style=flat-square&color=363c2f
[stars-url]: https://github.com/panostzan/ENKRATEIA/stargazers
[issues-shield]: https://img.shields.io/github/issues/panostzan/ENKRATEIA?style=flat-square&color=363c2f
[issues-url]: https://github.com/panostzan/ENKRATEIA/issues
[chrome-shield]: https://img.shields.io/badge/Chrome-120%2B-363c2f?style=flat-square
[download-url]: https://github.com/panostzan/ENKRATEIA/archive/refs/heads/main.zip
[interruption-screenshot]: docs/images/interruption.png
[summary-screenshot]: docs/images/summary.png
