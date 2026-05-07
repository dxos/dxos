# Before you build

Plugins are easy to generate; the architectural choices around them are not. Read this before scaffolding anything — most of the value is in **what you don't build**.

## Survey first, scaffold second

Before writing a new plugin, **read the relevant existing plugins** in `packages/plugins/` (or in the community monorepo). Look for:

- A plugin that already targets the same domain (kanban, mailbox, sketch, …).
- Shared UI primitives or plugin-level patterns you can reuse.
- Domain types in `@dxos/types` or another plugin's `./types` export that already model your entities.

If a similar plugin exists, your job is usually to **factor out a shared abstraction**, not to duplicate it. Copy-paste produces drift; abstraction produces leverage.

## Don't invent duplicate domain types

When integrating an external service (Trello, GitHub, Linear, Gmail), do **not** create service-prefixed echoes of types that already exist (`Trello.Card`, `Trello.Board`). That's a smell:

- Composer users will end up with parallel, incompatible "card" types they can't move between.
- Other plugins (kanban, table, board) won't recognise your types.
- The next service integration will repeat the mistake.

The right move:

- **Map onto an existing internal type** (e.g. `Kanban.Card`, `Markdown.Document`).
- If no internal type fits, **propose a new shared type** and place it in a neutral location, not in your plugin.

## Prefer headless sync over bespoke UI

If you're integrating a service whose entities map onto an existing internal type, **don't ship a new UI for them**. Build a **headless sync layer** that reads/writes the existing types, and let the existing plugin (e.g. kanban) render them.

Concretely, a Trello integration should look like:

- A sync operation: pulls Trello → writes/updates `Kanban.Card` objects in ECHO.
- An `AccessToken` for the Trello API (see [external-services.md](./external-services.md)).
- A **sync-state object** that records the cursor / last-sync timestamp / per-record IDs (see below).
- **No** custom Trello article surface. The kanban plugin already has one.

This keeps the experience uniform, and it makes the next sync integration (Linear, GitHub Projects, …) a much smaller change.

## Build reusable sync infrastructure

When your plugin syncs with an external store, model the sync state as an ECHO object:

- Cursor / etag / last-sync timestamp.
- Per-record mapping (external ID ↔ ECHO object ID).
- Conflict / failure log, if needed.

A clean sync-state schema is groundwork for **every future OAuth/sync plugin**, not a one-off. If you find yourself stuffing this state into ad-hoc fields on the domain object, stop and lift it out.

## Architecture is not solved — don't paint yourself into a corner

The store currently has open issues, notably:

- **Non-atomic writes across the store.** Code that assumes "I can mutate N objects atomically" will hit edge cases. Sync layers in particular need to be tolerant of partial writes (idempotent, replayable, cursor-driven).

Avoid patterns that make these problems worse: cross-object invariants enforced from UI code, "transactional" multi-object mutations, monolithic agents that touch everything in one go.

When in doubt, **flag the open question** to a human reviewer rather than encoding a guess into the plugin.

## Repo layout — current preference (v1)

For v1, the team's preference is an **external monorepo** containing multiple community plugins (similar to how `packages/plugins/` works in-repo) — **not** a per-plugin standalone repo.

Why:

- One PR can refactor many plugins together.
- Shared utilities, sync infrastructure, and design tokens live in one place.
- Search-and-replace across the plugin family is trivial.

Standalone per-plugin repos (like `dxos/plugin-excalidraw`) are still supported and may become the preferred shape in v2 once the shared abstractions stabilise. For now, default to a monorepo unless you have a specific reason not to.

The mechanical authoring guidance in this skill (Vite + `composerPlugin`, manifest emission, `Load by URL`, registry PR) applies in both setups — it's per-plugin, not per-repo.

## Expect architectural intervention

There will be cases where the obvious-looking plugin is **the wrong plugin to build**. The agent should not generate it just because it can. Surface trade-offs to a human when:

- A natural mapping exists onto an existing internal type, but the user asked for a service-prefixed copy.
- The proposed UI duplicates an existing plugin's UI.
- Cross-object atomicity would be required for correctness.
- The plugin's scope overlaps materially with an existing plugin.

Stop and ask. The cost of a 30-second clarification is much lower than the cost of a wrongly-shaped plugin entrenched in users' Spaces.

## Checklist before scaffolding

- [ ] Read 2-3 existing plugins in the same neighbourhood.
- [ ] Identified which existing types the new plugin should reuse.
- [ ] Decided whether this is a **new UI** or a **headless sync layer** for an existing UI.
- [ ] Designed the sync-state object (if applicable) before writing handlers.
- [ ] Flagged any cross-object atomicity needs to a human.
- [ ] Confirmed the repo layout (external monorepo unless told otherwise).
- [ ] Spec written and approved (see [specification.md](./specification.md)).

Only then proceed to [scaffolding.md](./scaffolding.md).
