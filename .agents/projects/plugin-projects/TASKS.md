# plugin-projects — Tasks

_Resume: design approved + spec written (agents/superpowers/specs/2026-07-24-plugin-projects-design.md). Next: user reviews spec, then writing-plans → implementation._

## Phase 1: Core plugin + Project type

New core plugin: interactive, long-running processes using Routines, Agents, and
artifacts. Project succeeds `Topic` (@dxos/compute); loosely modeled on Claude
Desktop projects. Obviates stalled plugin-sidekick. Rename name-squatting
`@dxos/types` `Project` → `ExternalProject`.

### Tasks

- [ ] **Design spec** — brainstorming in progress; write to agents/superpowers/specs.

## Follow-ups / deferred

- [ ] **Possibly move Project type from @dxos/compute to plugin-projects at end** — revisit the core-vs-plugin placement decision once the plugin's shape settles.
- [ ] **Review CompanionTo reuse for project chats** — decided Chat→Project uses the existing `org.dxos.relation.assistant.companionTo`; revisit vs a dedicated relation once the design is complete.
- [ ] **Remove plugin-sidekick** — obviated by plugin-projects; this pass only notes the obviation in packages/plugins/AUDIT.md, deletion is a separate change.
- [ ] **Consider merging plugin-routine into plugin-projects** — revisit once plugin-projects settles; Routine schema already moves to @dxos/compute, so the plugin boundary is thin.
