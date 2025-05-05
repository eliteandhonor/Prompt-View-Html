# LLM Prompt Sharing & Community App

## Modular Architecture Overview

This project is architected for maintainability, security, and rapid feature extension. Its modular design centers around three pillars:

- **Single Markdown Handling Source (js/util/markdown.js):**  
  All markdown parsing, sanitization, and output filtering is centralized in a single, robust utility. This eliminates legacy duplication and guarantees consistent, secure user content rendering across the entire UI.

- **Core Helpers Module (js/util/helpers.js):**  
  General-purpose, stateless helpers are consolidated in one module, providing formatting, validation, token management, and other utility functions consumed by UI and API logic.

- **Modular UI Event & Rendering Pipeline (js/ui/util/domEvents.js & js/ui/):**  
  UI event binding, dispatch, and DOM update logic are now strictly modular—no global event listeners or ad hoc query/select spaghetti. All event-driven UI flows (including prompt CRUD, theme toggling, modal handling) are composed from discreet, testable modules.

### Security/XSS Pipeline

- **Centralized & Defensive:**  
  All user-generated content is filtered through a single security pipeline, leveraging escape and sanitize routines in `js/util/markdown.js` and core helpers. UI modules never insert raw user input; backend flows re-validate as an extra safety net. No dynamic HTML is injected without passing the sanitize pipeline.

- **Pipeline Highlights:**
  - Only a strict subset of markdown/HTML is supported.
  - XSS vectors are neutered with both frontend and backend escapes.
  - All comments/results/prompts use consistent security logic (no divergent/legacy flows remain).
  - Robust cross-module auditability: any output-to-DOM path is secured at source.

## Frontend State Management & Error Handling (2025 refactor)

Robust, scalable app state and error handling are now managed via a modular, observable micro-store (`js/state/store.js`).  
All core UI and logic modules interact only with this store—no global state mutation remains. This pattern eliminates hidden side effects and makes all state changes explicit, debuggable, and testable.

### Key Principles

- **Single Source of Truth:**  
  App-wide UI state (prompts, filters, selection, pagination, error/fallback, loading) is managed in `js/state/store.js`.
- **Observability:**  
  All components subscribe to store changes using `subscribe(fn)`, which triggers re-renders and fallback logic automatically on every state update.
- **Immutable Pattern:**  
  State updates use `setState(patch)`, merging and diffing only the necessary parts for clarity and reliability.  
  No direct mutation of any state objects is allowed.
- **Robust Error and Fallbacks:**  
  Asynchronous operations always call `setError({ message, type, ... })` on failure; UI and modules subscribe and react accordingly, ensuring obvious, actionable feedback for users and developers.
- **Undo & Recovery:**  
  Destructive actions (e.g. prompt delete) use temporary local state with undo, only committing backend changes after the undo window expires.  
  State is resynced from backend on finalization or recoverable failure.

### Store API (js/state/store.js)

```js
import { getState, subscribe, setState, setError, clearError } from './state/store.js';

subscribe((newState, patch) => { ... }) // React to state changes anywhere
setState({ prompts: [...] }) // Update state immutably
setError({ type, message }) // Register recoverable or fatal application errors and triggers fallback UI
clearError() // Remove displayed error after handled
```

### Example: Using/Extending State in UI Modules

```js
// In any UI module:
import { getState, setState, subscribe } from '../state/store.js';
const state = getState();
setState({ filter: { ...state.filter, category: "Chatbot" } });

subscribe((state) => { renderSidebarUI(state); });
```

### Patterns and Extensibility

- All new UI logic should use this observable pattern for reading/updating app state.
- Asynchronous backend errors and UI validation errors must always go through setError. Never silently swallow or log errors—each is shown to the user and can be recovered or debugged.
- Any new features can add fields to the store’s state object; use subscribe to update UI as needed.
- Undo/redo logic is implemented by patching temporary keys in state and finalizing/aborting on user action or timeout.

See code comments in `js/state/store.js` and `js/ui/ui.js` for in-depth examples and extension best practices.
## Primary Modules and Their Roles

| Module                                         | Responsibility                                                    |
|------------------------------------------------|-------------------------------------------------------------------|
| `js/util/markdown.js`                          | Markdown parsing, XSS filtering, HTML sanitization, output rules  |
| `js/util/helpers.js`                           | Utility functions: formatting, ID generation, token ops, validation|
| `js/ui/util/domEvents.js`                      | UI global/dom event mapping and handler registration              |
| `js/ui/ui.js`                                 | Main UI orchestrator: overall state and cross-component flows     |
| `js/ui/renderPromptBlock.js`                   | Rendering reusable prompt grid items/blocks                       |
| `js/ui/grid.js`, `js/ui/sidebar.js`, `js/ui/banners.js`, `js/ui/modals.js`, `js/ui/progress.js` | Modular UI: each handles a single facet of user interaction or feedback |
| `js/api/db.js`, `js/api/prompts.js`            | Backend API communication; persistence abstraction                |
| `js/config.js`                                 | Environment and deployment config                                 |

## Best Practices In Effect

- **Modular, Single-Source Logic:** Duplications removed; all common logic in dedicated modules.
- **Explicit DOM Event Management:** Handlers modularized, not inlined or global.
- **Centralized Security:** All content passed through a single, auditable pipeline.
- **No Legacy/Obsolete Files:** Previous files (`js/markdown.js`, `js/db.js`, etc.) are deleted; no split logic remains.
- **Strict Separation of Concerns:** API, UI, and utility layers communicate via clear, minimal interfaces.
- **Accessibility First:** Full keyboard/ARIA support, animation and focus management tested across devices.
- **Atomic, Testable Functions:** Critical logic is stateless and easily unit-tested.
- **Up-to-date Documentation:** README and AUDIT_LOG.md reflect current codebase and workflows.

## Automated Testing, CI/Linting, and Reliability

### Frontend & Core Logic Automated Tests

- **Location:** All critical modules (`js/util/helpers.js`, `js/util/markdown.js`, `js/state/store.js`, `js/auth/session.js`, `js/api/db.js`, `js/api/prompts.js`) have unit and API contract tests in `/test/`.
- **How to Run:** Open [`/test/index.html`](./test/index.html) in any modern browser to execute the full QUnit-based test suite.
- **Coverage:** All stateless logic and API boundaries must be covered by tests for PR acceptance. Integration with backend is tested with smoke tests.

### Code Quality and Linting

- **Linting:** All JavaScript code must pass ESLint checks before commit. Use `npx eslint .` (Node required) or any editor/browser-integrated lint tool.
- **Style:** Follow code patterns and formatting of the existing modules. Contributions must not add new lint errors.

### Continuous Integration (CI) / Workflow

- **Manual Local Workflow:** Before submitting PRs or merging changes, contributors must:
  1. Run all tests in `/test/index.html` and ensure 100% pass rate.
  2. Run `npx eslint .` and resolve any code style or error flags.
  3. Confirm backend and frontend are healthy (see below).
- **GitHub Actions:** For projects using GitHub, consider adding `.github/workflows/ci.yml` to automatically run these checks on push/PR.

### Health and Liveness Checks

- **Backend Endpoint:** `db.php?action=health` and `db.php?action=selftest` — returns JSON health status for API, file system, and logger.
- **Frontend Smoke:** Test suite `/test/index.html` and application status banner surface live status to end-users/admins.

### Coverage and Reliability Requirements

- All business-critical logic must have associated unit or contract tests.
- All PRs must maintain or improve test and lint pass rates—no regressions allowed.
- New endpoints/features should include new or extended tests.
## Features & Usage

- **Navigation:** Navbar (search/login), collapsible sidebar (category/tag), animated grid/list with live search and filters.
- **Prompt Details:** Modal view, comments (threaded, markdown-safe), and output results.
- **Actions (CRUD):** Add/edit/delete for prompts/comments, gated by auth where required; animated feedback.
- **Theming & Accessibility:** Modular CSS (including dark theme), custom animations, mobile-friendly/responsive.
- **Extensible Core:** New modules/UI extensions can be added without modifying legacy files or global state.

## Running & Deployment

- **Always use an HTTP server** (never open index.html as file://):
  - VS Code Live Server,  
    `python3 -m http.server`,  
    `npx http-server`, etc.  
    Visit [http://localhost:8000](http://localhost:8000) or your port.
- **Production:** Upload `/public_html` to your web host’s `public_html`, overwriting if updating.

## Backend/Permissions

- Editing/saving (backend features) requires `db.php`, `prompts.json`, `comments.json`, and `results.json` to exist and be writeable (set `666` for dev, restrict for prod).
- Backend API/config/logging is described in inline file comments and AUDIT_LOG.md.
- **Never** commit secrets/logs; configure tokens/paths in `Logger.php`.

## Attribution, Access Control & Authentication Groundwork (2025)

### Attribution Model and Session Assignment

- All mutable entities (prompts, comments, results) are attributed using a required `user_id` at save/edit time. This is the authoritative source for user/session ownership and access checks.
- The optional `author` field is strictly for display/UI/legacy; it may be filled with a username for display, but MUST NOT be relied upon for any privilege checks.
- JS and backend (PHP) each provide a single “session/user assigner” function:
  - **Backend:** `getCurrentUserId()` in `db.php` (see code/TODOs)
  - **Frontend:** `getCurrentUserId()` in `js/auth/session.js` (import and use for all CRUD/muting actions)
- These assigners currently always return "anon", preserving anonymous flows, but are engineered for easy plug-in of real session/cookie/OAuth or SSO logic later.

### Authentication & RBAC Extension Points

- All entity mutations must assign `user_id` via the above assigner (never hardcode or set "anon" elsewhere; this guarantees future audit and plug-in of authentication mechanisms).
- There are stub functions for role/access checks (`canEdit(entity)`, `isAdmin()`), used for access checks and RBAC enforcement in the future. See `js/auth/session.js` and `db.php`.
- Contributors should extend only in these locations, never in scattered legacy code. Privilege enforcement is centralized and documented.

### Contributor Guidance

- To enable sign-in, OAuth, SSO, or privilege logic, expand the single assigner function on both backend and frontend. Use the stubs and TODOs to hook up external session or identity APIs.
- All flows and modules must consume attribution/session assignment through these helpers for correct access tracking, privilege checks, and audit.
- See `data/prompts-template.json` for canonical entity shapes and attribution comments for onboarding.

## Accessibility & Compliance Strategy (2025 Update)

### Principles and Practices

- **Keyboard Navigability:** All major actions (theme, sidebar, grid, modals, CRUD) are reachable via Tab/Shift+Tab, with visible focus for all interactive elements.
- **ARIA & Semantics:** All navigation/landmark elements (`nav`, `main`, `aside`, dialogs) use ARIA labels/roles. Modals enforce `role=dialog` and `aria-modal`, live regions have `aria-live`.
- **Focus Management:** Opening modals traps focus within dialog, restores to previous element after closing. ESC and Cancel close modals. Visible focus styles are enforced CSS-wide using `:focus-visible`.
- **Screen Reader Support:** Critical feedback areas (banner, loading, toasts) include `aria-live="polite"`. Visually hidden helpers (`.visually-hidden`) ensure screen reader exclusivity without visual clutter.
- **No JavaScript Fallback:** A `<noscript>` warning is displayed if JS is disabled.
- **Error Surfaces:** All API and validation errors use prominent, assertive alerts in modals and banners.
- **Documentation:** All accessibility, compliance, audit, onboarding, and policy standards are now documented solely in [AUDIT_LOG.md](../AUDIT_LOG.md) as the canonical source.

For all onboarding, accessibility, compliance, audit, and contributor or review policies and checklists, see [AUDIT_LOG.md](../AUDIT_LOG.md). That file is now the sole canonical source for these requirements. Summary: All UI, security, and access control compliance is implemented in accordance with those procedures. The codebase and workflow always enforce accessibility, audit, a11y, and review standards as described in AUDIT_LOG.md. Refer to AUDIT_LOG.md to understand policies, requirements, and the review/extension process.
## Troubleshooting

- “Cannot use import statement outside a module”? Run via HTTP, not file://.
- Save/edit errors: Check JSON file permissions/logs on the server.
