# Agent Composer Introspection — Tasks

_Resume: decide whether to implement INTROSPECTION.md Phase A (`snapshot()` in plugin-debug). Uncommitted: none. Last: disablePlugins landed on the branch + design doc moved to packages/sdk/app-framework/docs/INTROSPECTION.md._

## Phase 1: Assessment & plugin management

The agent must be able to manage plugins over the debug port: list all available
plugins, list currently active/enabled ones, and enable/disable individual
plugins. An operation exists that should do this, but a prior session reported
it does not work — verify, diagnose, and fix.

### Tasks

- [x] **Start Composer in debug mode and assess current capabilities** — dev server from this
      worktree (`composer-agent-debug` launch entry); drove the page directly and via the loopback
      debug port (`composer-recovery.js` round-trip verified). Found: boot stalls in a backgrounded
      tab (visibility-gated) — front the tab before waiting on boot.
- [x] **Verify the plugin enable/disable operation failure** — `queryPlugins` /
      `queryDisabledPlugins` / `enablePlugins` all work at head (chess + `game` dependency enabled
      live, operations appeared). The reported failure predates #12775, which is when these
      operations landed; there was no disable operation at all.
- [x] **Diagnose and fix so the agent can list all / list active / enable / disable plugins** —
      added `org.dxos.operation.registry.disablePlugins` (definition + handler + 5 node tests,
      mirrors enable semantics: end-state reply, dependents cascade, core/not-installed rejected).
      Live-verified: chess deactivates, its operations vanish from the host.

## Phase 2: App-graph state introspection design

Replace screenshot-driven state inspection with structured introspection: the
app is driven by the app graph, so the agent should interrogate which surfaces
are visible, their context objects, and which operations are reachable
(toolbars/menus). Deliverable is a concise design doc.

### Tasks

- [x] **Survey what state is already reachable** — INTROSPECTION.md §2 table, all verified live (layout
      atom, attention, graph actions carrying operation DXNs, `dx-surface` wrappers, testids/ARIA).
- [x] **Design a debugging API** — INTROSPECTION.md §3.1 `composer.snapshot()` + twin read-only
      `org.dxos.operation.debug.snapshot`; §3.2 surface registry closing DOM ↔ graph ↔ data.
- [x] **Design ARIA / data- attribute conventions** — INTROSPECTION.md §3.3 (`data-node-id`,
      `data-action`, keep `dx-surface` attrs + `data-testid` + ARIA state).
- [x] **Write the design doc with evaluation criteria vs. the screenshot approach** — §4 criteria table
  - acceptance test; §5 sequencing (Phase A/B/C).
- [ ] **Implement Phase A** (`snapshot()` in plugin-debug) — awaiting go-ahead.

### References

- `.claude/skills/composer-debug/SKILL.md` — debug port mechanics.
- `packages/sdk/app-framework` — PluginManager, Surface, app graph.
