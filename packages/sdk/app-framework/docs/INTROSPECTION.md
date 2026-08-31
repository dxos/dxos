# Agent introspection of live Composer state

Goal: an agent driving Composer (debug port or in-app browser) should infer the full UI state —
visible surfaces, their context objects, and reachable operations — from structured data instead of
screenshots.

## 1. Problem

Screen capture is the agent's current fallback for "what is on screen": it is slow (front + paint +
capture), token-expensive, theme/viewport dependent, and yields pixels with no data identity — the
agent must OCR its way back to objects it could have addressed by id. DOM scraping is better but
brittle: labels are localized, Radix ids are random, and structure varies per plugin. Meanwhile the
app is _already driven by structured state_ — the app graph, the layout atom, attention, and the
Surface dispatch — so the ground truth exists in memory on every page.

## 2. What is already reachable (verified live, 2026-08-30)

| State                        | Mechanism                                                                                                                                      | Gap                                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Plugins (all/enabled/active) | `composer.plugins()`; registry operations `queryPlugins` / `queryDisabledPlugins` / `enablePlugins` / `disablePlugins` (added by this project) | none                                                                                                                         |
| Operations + input/output    | `composer.operations()`, `composer.invoke()`                                                                                                   | `services` not reported (needs introspect MCP)                                                                               |
| Layout                       | `Layout` atom capability (`org.dxos.app-framework.capability.layout`): mode, sidebars, dialogOpen, workspace, `active`/`inactive` plank ids    | reachable only via capability + atom-registry plumbing; not surfaced on `composer.*`                                         |
| Attention                    | `composer.attention.attended` (graph path ids)                                                                                                 | none                                                                                                                         |
| App graph                    | `composer.graph` — `node(id)` / `connections(id)` / `actions(id)` atoms; actions embed **operation DXNs**, icon, disabled, i18n label          | atoms must be read through the atom registry; labels unresolved (i18n tuples); node `data` is a live object (unserializable) |
| Mounted surfaces             | `<dx-surface data-id data-role data-component>` wrappers (dev builds) + `__DX__.surfaces()`                                                    | DOM-only: no link to the graph node / context object; nothing outside dev builds                                             |
| DOM anchors                  | `data-testid` conventions; some elements carry graph paths (`navtree` rows, tab triggers); `aria-selected` / `aria-current`                    | inconsistent: many components have neither a testid nor a node id                                                            |

The fragmentation is the problem: answering "what is the user looking at and what can I do here"
takes four probes, two of which require knowing internal capability identifiers.

## 3. Design

### 3.1 `composer.snapshot()` — one JSON document (Phase A)

A devtools helper (and twin read-only operation `org.dxos.operation.debug.snapshot` in
`plugin-debug`, so it is reachable via `composer.invoke`, MCP projection, and QA flows) that returns:

```jsonc
{
  "layout": {
    "mode": "solo",
    "sidebarOpen": true,
    "dialogOpen": false,
    "workspace": "root/…",
    "active": ["root/…/home"],
    "inactive": [],
  },
  "attention": ["root/…/home"],
  "planks": [
    {
      "id": "root/BF6…/home", // graph path — the id `layout.open` accepts
      "type": "…", // graph node type
      "label": "Home", // resolved via the Translator capability
      "subject": { "dxn": "echo://…", "typename": "org.dxos.type.document", "name": "Notes" },
      "actions": [
        // graph actions = toolbar/menu entries
        { "operation": "dxn:org.dxos.operation.support.startWelcomeTour", "label": "Start tour", "disabled": false },
      ],
    },
  ],
  // Mounted surfaces, flat for now — the Phase B surface registry adds the per-plank association
  // (and dialog subjects) once the DOM ↔ graph ↔ data link exists.
  "surfaces": [{ "id": "article", "role": "org.dxos.role.article", "component": "HomeContainer" }],
  "plugins": { "installed": 96, "enabled": 39, "active": 39 },
}
```

Rules:

- **Summarize, never serialize.** ECHO objects appear as `{ dxn, typename, name }` — a snapshot
  must be O(planks), not O(space).
- **Resolve labels** through the Translator capability so the agent sees what the user sees, while
  ids stay canonical.
- **Actions come from the app graph** (`graph.actions(nodeId)`), so the snapshot lists exactly the
  operations the UI would offer, with their disabled state — the agent invokes them by DXN via the
  existing invoker (with `spaceId` where the definition declares `Database.Service`).
- Read-only; `Operation.mutation('none')`.

### 3.2 Surface registry (Phase B)

`SurfaceComponent` already wraps every mounted surface in dev builds. Extend that wrapper to
register `{ id, role, component, nodeId?, subject? }` in a live map on the `SurfaceManager`,
exposed as `composer.surfaces()` and consumed by `snapshot()`. This closes the DOM ↔ graph ↔ data
link: given a `dx-surface` element the agent can find its context object, and given a graph node it
can find where (and whether) it is rendered. Ship it in dev + debug-enabled builds (same gate as the
wrapper today).

### 3.3 DOM attribute conventions (Phase C)

For flows that must touch the DOM (clicks, typing), make the anchors deterministic:

- `data-node-id=<graph path>` on every plank container and navtree row (tab triggers already embed
  the path in Radix ids — promote it to a first-class attribute).
- Keep `dx-surface[data-id|data-role|data-component]` as the surface anchor.
- Every interactive control rendered from a graph action gets
  `data-action=<operation DXN>` — the agent can then map snapshot → selector mechanically.
- `data-testid` remains for hand-written test anchors; ARIA state (`aria-selected`,
  `aria-current`, `aria-expanded`) remains the truth for selection/expansion, as today.

### 3.4 Non-goals

- Visual QA (rendering regressions, layout glitches) stays with screenshots.
- No always-on production surface registry; production keeps the current opt-in debug switch.

## 4. Evaluation criteria vs. screen capture

| Criterion           | Screenshot                                                                                                                 | Snapshot API                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Latency             | seconds (front tab, paint, capture)                                                                                        | ms (one eval)                                                              |
| Token cost          | high (image) per look                                                                                                      | small JSON, diffable across steps                                          |
| Data identity       | none — pixels; must re-derive objects                                                                                      | canonical ids (graph path, DXN, typename)                                  |
| Actionability       | infer a click target                                                                                                       | operation DXN ready to `invoke`, disabled state included                   |
| Determinism         | theme/viewport/scroll dependent                                                                                            | stable across themes and viewports                                         |
| Visibility          | requires the tab to be fronted and painted (background tabs throttle rAF — boot itself stalls hidden, observed 2026-08-30) | works in background tabs and headless flows                                |
| Verifying an effect | before/after diff by eye                                                                                                   | assert on ids/values                                                       |
| Visual defects      | **catches them**                                                                                                           | blind to them                                                              |
| Trust boundary      | pixels are honest                                                                                                          | snapshot claims mount state — the DOM attrs (3.3) let the agent spot-check |

Acceptance test for Phase A: an agent executes a QA flow (open object, run toolbar action, verify)
using only `snapshot()` + `invoke()` + at most one screenshot, where today the same flow takes
repeated screenshots; the flow's verification asserts on object ids rather than rendered text.

## 5. Sequencing

1. **Phase A** — `snapshot()` in `plugin-debug` (layout + attention + graph actions + plugin
   counts; surfaces from the existing `dx-surface` DOM as an interim source).
2. **Phase B** — surface registry in `app-framework` (adds `subject`/`nodeId` fidelity).
3. **Phase C** — attribute sweep (`data-node-id`, `data-action`) across plugin containers,
   starting with deck planks and navtree.

## 6. Findings logged along the way

- `enablePlugins` worked all along at head; the reported failure predates #12775 (operations only
  landed then) — a session against a deployed build could not see them. `disablePlugins` did not
  exist; added by this project with tests.
- Boot completion is visibility-gated: a backgrounded tab sits on the boot screen ("Still starting
  after …s") with the plugin manager fully active (`startup` + `idle` fired, 215 modules) until the
  tab is fronted. Relevant to the #12845 freeze probes, and to any agent that boots Composer in a
  background tab — front the tab before waiting on boot.
