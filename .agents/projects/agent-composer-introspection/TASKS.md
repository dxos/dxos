# Agent Composer Introspection — Tasks

_Resume: start Composer in debug mode and assess current capabilities (task 3), then diagnose the plugin-enable operation (task 1)._

## Phase 1: Assessment & plugin management

The agent must be able to manage plugins over the debug port: list all available
plugins, list currently active/enabled ones, and enable/disable individual
plugins. An operation exists that should do this, but a prior session reported
it does not work — verify, diagnose, and fix.

### Tasks

- [ ] **Start Composer in debug mode and assess current capabilities**
  - Dev server from this worktree; drive the page directly (browser pane) or via the debug port.
  - Inventory: `composer.plugins()`, `composer.operations()`, registry-related operations.
- [ ] **Verify the plugin enable/disable operation failure**
  - Find the operation (plugin-registry / Plugin.Service), invoke it, capture the exact failure.
- [ ] **Diagnose and fix so the agent can list all / list active / enable / disable plugins**
  - Verify the effect (plugin activates/deactivates live), not the return value.

## Phase 2: App-graph state introspection design

Replace screenshot-driven state inspection with structured introspection: the
app is driven by the app graph, so the agent should interrogate which surfaces
are visible, their context objects, and which operations are reachable
(toolbars/menus). Deliverable is a concise design doc.

### Tasks

- [ ] **Survey what state is already reachable** (app graph, layout state, Surface registry, attention)
- [ ] **Design a debugging API** returning a JSON document of live surface tree + context + data
- [ ] **Design ARIA / data- attribute conventions** for reliable DOM navigation
- [ ] **Write DESIGN.md with evaluation criteria vs. the screenshot approach**

### References

- `.claude/skills/composer-debug/SKILL.md` — debug port mechanics.
- `packages/sdk/app-framework` — PluginManager, Surface, app graph.
