# Composer CRX: bug capture

Extend `packages/apps/composer-crx` to capture Composer bugs (DOM, console, app state), store them as
objects in a Composer table synced with GitHub issues, and hand them to agents to resolve.

Requirements are derived from real issues found in the `ui-fixes` session (2026-10-28); each issue
below records what an agent needed to diagnose it, and which requirement that implies.

## Issue log

| #   | Issue                                                                                                  | Area                               | Status          |
| --- | ------------------------------------------------------------------------------------------------------ | ---------------------------------- | --------------- |
| 1   | Navtree "Database" section shows `org.dxos.type.kan…` instead of "Kanbans"                             | plugin-space / plugin-kanban       | Root-caused     |
| 2   | Create Project dialog lists "Composer Plugin" twice; both rows highlight together                      | plugin-projects / plugin-dev-shell | Root-caused     |
| 3   | Fallback article for a type gives no way to find or enable the plugin that provides it                 | plugin-deck / app-framework        | Fixed |
| 4   | Hue picker popover grid is malformed (clipped column, blank highlighted cell, reset overlaps a swatch) | react-ui-pickers / react-ui        | Located         |

### 1. Kanban type label missing in navtree

- **Seen:** Database section lists types; Calendars, Documents, Drawings, Mailboxes have plural labels;
  Kanban shows its raw typename (truncated).
- **Code path:** `createSchemaNode` (`plugin-space/.../extensions/database.ts`) labels the node
  `['typename.label', { ns: typename, count: 2, defaultValue: typename }]`, so the raw typename means
  the `org.dxos.type.kanban` namespace did not resolve at render time.
- **Static check:** `plugin-kanban/src/translations.ts` defines `typename.label_other`, and the
  `Translations` module is wired the same way as plugin-inbox's. The schema annotations match too. The
  cause is not visible from source alone.
- **What the agent needed and could not get from a screenshot:**
  1. The full, untruncated label text and the node's graph id / `data` typename (incl. version).
  2. Whether the i18n resource for the namespace was loaded (`i18n.hasResourceBundle`).
  3. Which plugins were active vs. lazy-unloaded at capture time.
  4. The persisted navtree cache entry for the node (`label` is in `CACHEABLE_PROPS`).
- **Cause (from reporter):** plugin-kanban was not enabled, so its translations were never registered,
  while Kanban objects already in the space still surfaced the type in the Database section. Item 3 above
  alone would have answered it; the agent spent its time on static checks that could not.
- **Fix:** the Database section lists a static type only while an enabled plugin contributes it (`database.ts`).

### 2. Duplicate "Composer Plugin" project template

- **Seen:** Create Project's template list shows "Composer Plugin" twice; hovering or selecting one
  highlights both.
- **Cause:** two different templates share the id `org.dxos.project.composerPlugin` and the label.
  plugin-projects contributes the registry variant (browser with an EDGE URL and a stamped toolchain);
  plugin-dev-shell contributes the dev-server variant (any browser). Both come from
  `Templates.makeComposerPlugin`, which hard-codes the id and label. The list keys selection by id, so
  the two rows act as one.
- **What the agent needed:**
  1. The `data-value` / React key of each row, to see that the ids collide (not visible in a screenshot).
  2. Which plugin contributed each capability instance.
  3. The runtime conditions that select variants (Tauri or browser, EDGE URL, toolchain stamp).

### 3. Fallback article should offer to enable the type's plugin (feature request)

- **Seen:** opening an object whose type has no surface (its plugin is disabled, as in #1) renders the
  generic fallback article with no path forward.
- **Ask:** in any fallback article for a type, show an action to search for / enable the plugin that
  provides it, when that plugin is not enabled.
- **Related:** #1 (same root condition: object type present, providing plugin disabled).
- **Candidate area:** `plugin-deck/src/containers/Deck/PlankFallback.tsx` (not confirmed).
- **What the agent needed:**
  1. Which surface actually rendered, and which roles/surfaces were tried for the object.
  2. The type → providing-plugin mapping, including plugins that are installed but disabled.

### 4. Hue picker grid layout invalid

- **Seen:** the hue swatch popover renders 6 columns but the 6th is clipped by the popover edge; one cell
  in row 2 is a blank highlighted square (selected/hovered item without its swatch?); the reset `X`
  overlaps the last swatch instead of taking its own cell.
- **Code path:** `react-ui-pickers/src/components/PickerButton/PickerButton.tsx` renders swatches as
  `Menu.CheckboxItem`s inside `Menu.Content columns={6}`, with the reset as a trailing `Menu.Item`.
  `HuePicker` only draws the swatch. `react-ui/src/components/ColorPicker` is a separate implementation.
- **Ask (deferred):** reconcile with react-ui's `ColorPicker`; add a hue-only variant and use it here.
- **What the agent needed:**
  1. Computed layout of the popover: grid template, container width, each cell's rect, overflow (which
     cells fall outside the visible box).
  2. Per-cell state attributes (`data-state`, `data-highlighted`, `aria-checked`) to explain the blank
     highlighted cell.
  3. The component tree from the cell up to the menu root, to find which primitive owns the grid.
  4. Which call site opened it (several plugins use `HuePicker`), to reproduce in a story.

## Requirements

Each requirement cites the issue(s) that motivated it.

- **R1 — Element capture.** Pick a DOM element; capture its outer HTML, computed text (untruncated),
  bounding box, and a cropped screenshot. (#1)
- **R2 — Graph-node context.** For an element inside a navtree/surface, resolve and capture the app-graph
  node: id, type, `properties` (label tuple before translation), and `data` typename + version. (#1)
- **R3 — i18n state.** For any translation tuple captured, record namespace, key, whether the bundle is
  loaded, and the resolved string. (#1)
- **R4 — Plugin state.** Snapshot enabled/active/lazy-pending plugins and activated modules. Highest
  value per byte: it alone resolved #1. Also flag ECHO types present in the space that no enabled plugin
  provides. (#1)
- **R14 — Reporter notes are first-class.** The reporter often knows the cause ("plugin wasn't enabled")
  or a direction ("hide these"); capture it as structured fields (suspected cause, suggested direction)
  alongside free notes, and let the reporter add them after filing. (#1)
- **R15 — Record kind and links.** A record is a `bug` or a `feature request`, and can link related
  records (#3 relates to #1). Map kind to a GitHub label on sync. (#3)
- **R16 — Surface provenance.** For a captured region, record which surface rendered it (plugin, surface
  id, role) and whether it is a fallback. (#3)
- **R17 — Layout capture.** For the picked element and its descendants: computed box, display/grid/flex
  properties, and which children overflow or are clipped by an ancestor. Include popovers and other
  portal content. (#4)
- **R18 — State attributes.** Capture `data-state`, `data-highlighted`, `aria-*` on the picked subtree;
  the hover/focus state at capture time matters, so capture before the picker overlay steals hover. (#4)
- **R19 — Component tree.** The React component chain from the element to its nearest surface (component
  names + source file in dev builds). Lets the agent jump from a pixel to `PickerButton.tsx`. (#4)
- **R20 — Story match.** Suggest the storybook story that renders the same component (from R19), so the
  agent can reproduce in isolation (extends R10). (#4)
- **R5 — Console capture.** Recent console entries (errors/warnings first), filtered to the capture window.
- **R6 — Persisted caches.** Optionally include relevant persisted UI caches (e.g. navtree node cache). (#1)
- **R11 — Element identity.** Capture each item's `data-value`, `data-testid`, React key, and the
  ids of its siblings, so colliding ids are visible. (#2)
- **R12 — Capability provenance.** For list items that come from capabilities, record the contributing
  plugin and module for each contribution. (#2)
- **R13 — Environment.** Record the runtime: Tauri or browser, config values that gate features (EDGE URL),
  and the build stamp (commit, toolchain). (#2)
- **R7 — Bug record.** Store each capture as an ECHO object (title, notes, screenshot, element/graph/i18n/
  plugin/console attachments, status) in a Composer table.
- **R8 — GitHub sync.** Two-way sync of bug records with GitHub issues (title, body, labels, status).
- **R9 — Agent hand-off.** A bug record is self-contained enough for an agent to start diagnosis without
  asking the reporter for more (the questions in each issue's "What the agent needed" list).
- **R10 — Story link.** Optionally attach a storybook story that reproduces the issue.

## Current CRX (reviewed 2026-10-28)

`packages/apps/composer-crx` (MV3, crxjs) + `packages/plugins/plugin-crx` (Composer side) +
`packages/common/crx-protocol` (wire types). Module map: `composer-crx/src/core/DESIGN.md`.

| Piece                                      | What it does today                                                                                                                                      | Reuse for bug capture                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Side panel (`Sidepanel.tsx`)               | Toolbar (clip, page actions, launch Composer), chat with EDGE agent, thumbnail view                                                                     | Host a "Report bug" action and a draft form (title, notes, kind)                       |
| Element picker (`core/picker`)             | Overlay with hover outline, freeze, floating action toolbar; Esc cancels                                                                                | R1 directly: already returns the picked `Element`                                      |
| Extractors (`core/extractors`)             | Named extractors → `Snapshot` (source, hints, selection, page HTML ≤500 KB)                                                                             | Add a `bug` extractor: element HTML, text, rect, `data-*` attrs, siblings (R1, R11)    |
| Page actions (`core/actions` ↔ plugin-crx) | Composer plugins contribute descriptors; CRX invokes an operation in the Composer tab via `window` CustomEvents; plugin-crx maps snapshot → ECHO object | The delivery path for R7: a `CreateBugReport` operation in Composer creates the record |
| Composer bridge (`core/bridge`)            | Find/focus the Composer tab by configured origins                                                                                                       | Unchanged                                                                              |
| Render proxy (`core/proxy`)                | Composer asks CRX to render a URL cross-origin                                                                                                          | Not needed                                                                             |
| Thumbnails (`core/image`)                  | Upload image to EDGE image service                                                                                                                      | Screenshot upload path for R1                                                          |
| Developer mode + debug preview             | Shows the snapshot JSON before delivery                                                                                                                 | Preview/redact a bug payload before filing                                             |

### Gaps

1. **No app-state access.** The content script runs in an isolated world: it sees the DOM but not
   Composer's JS state (graph, i18n, plugin manager, surfaces). R2–R4, R6, R12, R13, R16 all need a
   Composer-side responder. The page-actions bridge is the pattern: add a `diagnostics` request that
   plugin-crx (or app-framework) answers with a state snapshot for a given element.
2. **Element → app context mapping.** DOM nodes carry few app ids today. R2/R16 need surfaces and
   navtree items to expose stable `data-*` attrs (node id, surface id, plugin id) the picker can read.
3. **No screenshots.** Nothing calls `tabs.captureVisibleTab`; needed for R1 (crop to the picked rect).
4. **No console capture.** An isolated content script cannot see page `console.*`. Options: a
   Composer-side ring buffer exposed through the diagnostics request (preferred; `@dxos/log` already
   centralises logging), or a `chrome.debugger` attach (heavy permission, warning bar).
5. **Picker is action-gated.** It needs at least one picker action to show; "Report bug" must be an
   always-available built-in action rather than a plugin-contributed one.
6. **Picker scope.** The picker attaches to the page, not to Composer's overlays (dialogs, popovers in
   portals). #2 was in a dialog; confirm the picker reaches portal content.
7. **No bug type or table.** Needs an ECHO `BugReport` type (R7, R14, R15), a table view, and GitHub
   sync (R8). plugin-github exists; check whether it already syncs issues before building R8.
8. **Payload size.** Full-page HTML (≤500 KB) plus state snapshots plus screenshots: store large parts
   as blobs/attachments, not inline object fields.

## Open questions

1. Does capture talk to the app through the existing agent debug port (`composer-debug` skill) or a new
   content-script bridge? Leaning: extend the page-actions CustomEvent bridge (already origin-guarded and
   validated), since the debug port is opt-in per session.
2. Which space holds the bug table, and is it per-user or shared?
