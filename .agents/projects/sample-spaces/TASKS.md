# Sample spaces — tasks

Design: [DESIGN.md](./DESIGN.md)

## Phase 0 — housekeeping

- [x] Rename onboarding content: `readme.md` → `README.md`, `about-bramble.md` → `sample/ABOUT.md`,
      `space-tour.md` → `sample/README.md`, `exemplar-space.dx.json` → `sample/space.dx.json`,
      `build-exemplar-space.ts` → `build-sample-space.ts`; update every call site.
- [x] Rename the moon task and npm script `build-exemplar` → `build-sample`.
- [x] Rename `import-exemplar-space.ts` → `import-sample-space.ts`, `ExemplarSettings` →
      `SampleSettings`, `ImportExemplarSpace` → `ImportSampleSpace`, `EXEMPLAR_SPACE_TAG` →
      `SAMPLE_SPACE_TAG`, `isExemplarSpace` → `isSampleSpace`, `generateExemplarSpace` →
      `generateSampleSpace`, `settings.recreate-exemplar.*` → `settings.recreate-sample.*`.
      **Two persisted strings deliberately keep the `exemplar` spelling**, each with a comment
      saying why: the tag value `org.dxos.space.exemplar` (already in every onboarded profile's
      space metadata — changing it makes the import's idempotency check miss the existing space and
      flips `isVisibleSpace`) and the operation key
      `org.dxos.operation.onboarding.importExemplarSpace` (operation keys can be referenced from
      persisted user-side state). Renaming either needs a migration, not an edit.

## Phase 1 — the builder

- [x] `@dxos/app-toolkit/SampleSpace`: `Clock`, `Feeds`, `Root`, `Tags` services; `collection`,
      `children`, `seed` helpers; `phase`/`make`/`applyTo`; `BASE_SCHEMAS`.
- [x] `app-toolkit/testing`: `ephemeralClient`, `buildArchive`, `histogram`.
- [x] `SampleSpace.test.ts` — 7 tests: schema derivation, clock, live-space apply, children,
      root wiring, feed drain, headless archive histogram. Green.
- [ ] Fold `WithProperties` (`app-toolkit/testing`) onto `SampleSpace.Root` so the root-collection
      bootstrap has one implementation rather than two.

## Phase 2 — port the onboarding builder

- [x] Split the Bramble content out of `build-sample-space.ts` into phase modules under
      `scripts/sample/` — 12 modules: docs, organizations, people, contacts-views, mailbox,
      calendar, tasks, notes, drawings, sheets, roast-log, util.
      **Content stays under `scripts/`, not `src/`**: the builder must never run in the browser
      (that is the whole point of the committed snapshot) and `composer-app:check-boot-budget`
      is a real gate. A debug-plugin preset should be its own smaller definition, not Bramble.
- [x] Define the space with `SampleSpace.make` (`scripts/sample/index.ts`); the hand-maintained
      `SCHEMAS` array is gone — types are derived from the phase map.
- [x] Reduce the script to file-in/file-out: 1810 → 50 lines.
- [x] Verified with the type histogram: 77 objects, 3 feeds, 127 typed entities — identical to the
      previous snapshot. Only delta is `org.dxos.type.task` 0.3.0 → 0.5.0, a schema version the
      committed fixture had drifted behind (the regeneration fixes it).
- [x] The stale `org.dxos.type.sketch` refs noted in `plugin-tldraw/TASKS.md:126` are already gone —
      the fixture seeds `org.dxos.type.drawing` directly. That note can be struck.
- [x] `composer-app:check-boot-budget` after the port: 21 entries / 4.15 MB (budget 25 / 4.35 MB),
      unchanged — nothing eager reaches `SampleSpace`.
- [ ] `makeCalendar`'s `PEOPLE_SEEDS.find(...)!` was replaced by `personActor`, but `makeNotes` and
      `makeRoastLogs` still carry pre-existing `!` and inline `Record<PersonKey, …>` params. Tidy
      when next touched.
- [x] `SampleSpace.children` writes the membership array BEFORE the parent edges: `Obj.setParent`
      warns for a parent that does not yet reference the child, which was one WARN per item on every
      build (12 on the Bramble build, now 0).

## Phase 3 — port the mbox importer

- [x] `plugin-google/scripts/import-mbox-space.ts` onto the builder. The harness is gone; the file
      is now parseArgs + one phase + write.
- [x] Streaming preserved, and now expressed as an Effect `Stream`: `Stream.fromAsyncIterable` →
      `Stream.take(limit)` → `Stream.grouped(BATCH_SIZE)` → `Stream.runForEach`. A `for await` loop
      is illegal inside `Effect.gen`'s non-async generator, which forced the rewrite — and the
      stream version caps `--limit` exactly rather than rounding up to the next batch.
      **This phase deliberately bypasses `SampleSpace.Feeds`** and appends eagerly: queuing a
      multi-GB mailbox until the end of the build is the thing the streaming import exists to avoid.
- [x] Bespoke tag cache replaced with `SampleSpace.Tags`. Side effect: membership is now keyed by
      space-relative URIs instead of `Mailbox.tagUri`'s absolute ones. Behaviour is unchanged
      because `TagIndex` normalizes both to a relative EID (`TagIndex.ts:153`), but the archive is
      now space-agnostic like the onboarding one.
- [x] Verified against the bundled fixture: 3 messages in the feed, 3 tags (Inbox/Important/
      Finance), index keyed `echo:///01M1…` with no space id.
      Run it with proto's Node 24 on PATH — `node:sqlite` does not exist on the PATH Node 20.

## Phase 4 — debug plugin

- [x] Sample spaces are a **contribution**, not a plugin-debug import: `AppCapabilities.SampleSpace` + `AppCapability.sampleSpaces(loader)`, gated on a new
      `ActivationEvents.SampleSpacesRequested`. plugin-debug lists whatever was contributed and
      depends on none of the contributors.
- [x] The capability carries a **bound closure**, not the definition:
      `{ id, label, description?, apply({ client, space }) }`, built by `SampleSpace.preset`. Handing
      it the definition instead would drag the builder, its phase map and Effect into every picker —
      and `Definition<Phases, A>` is contravariant in `Phases` through `build`, so a common
      `Definition<PhaseMap, unknown>` supertype does not exist. The closure sidesteps both.
- [x] plugin-crm and plugin-projects each contribute via `src/capabilities/sample-spaces.ts`, added
      to their plugin module list. `dx-plugin gen` stubs the module for node/workerd on its own.
- [x] `SpaceGenerator` fires the event on mount (same shape as `useCliApp` firing
      `CommandsRequested`) and folds the presets into its existing `typeMap` — a sample space is
      just a generator that ignores the count, so the container's structure is untouched.
- [x] **Loader-only, and verified lazy**: boot graph still 21 entries / 4.15 MB (budget 25 / 4.35),
      with the content in its own chunks (`sample-spaces-*.js`, 6.5 KB for the CRM one). An inline
      contribution array would have been a static import in the plugin definition and charged every
      session for it.
- [x] The two new definitions moved `scripts/sample/` → `src/sample/` so a loader can reach them;
      each `scripts/build-sample-space.ts` is now the only thing under `scripts/` and imports
      `../src/sample`. That also reverted the `tsconfig` `include` and `files` additions.
      **Bramble stays in `scripts/`** — 1600 lines whose whole point is not shipping.
- [ ] Port a scripted preset (`DXOS_TEAM`) to a phase. Not needed for the proof any more: the two
      real sample spaces are the proof, and `presets.items` still works as it did.

## Phase 5 — the further spaces

Both reuse nothing of Bramble but the builder — the seeds, the phases and the worlds are their own,
which is the honest version of "shareable phases": what is shared is the mechanism.

- [x] **CRM pipeline** — the Northwind Sales space, in `plugin-crm/src/sample/` (accounts, pipeline,
      inbox), built by `scripts/build-sample-space.ts` and asserted by `src/sample/sample.test.ts`.
      28 objects, 2 tests green, built on demand.
- [x] It uses `Pipeline` from `@dxos/types` — a board of View-backed columns, each
      `{ name, order, view }`. Every column's view is `Filter.type(Organization, { status })`, so a
      stage IS a query and moving a card is a status change rather than a membership edit; `order` is
      stored explicitly so a rearranged board keeps its order. `Organization.status` is
      `prospect | qualified | active | commit | reject`, and `reject` is what gives the board its
      Closed-lost column. `@dxos/effect` had to be added to plugin-crm (`workspace:*`) for
      `EffectEx.runPromise`; every other dep was already there.
- [ ] Watch the `Pipeline` naming TODOs in `@dxos/types/Pipeline.ts`: the name collides with
      `@dxos/pipeline` and the type is slated to move into its owning plugin. If it is renamed, this
      space and its test move with it.
- [x] **Software project management** — the Tidepool space, in `plugin-projects/src/sample/` (team,
      people, docs, tasks, project), same script + test shape. 42 objects, 2 tests green.
- [x] `Project` lives in `@dxos/compute/Project` (0.6.0), NOT `@dxos/types`, and there is no
      `ExternalProject` — that name survives only in two comments. `Project.make` creates its own
      empty TaskSet unless one is passed, so the tasks phase's set is handed to it explicitly.
- [x] `Task` has **no due-date field**. Its dates are `history` entries
      (`{ date, event: 'created' | 'updated', description }`), which is where the sample dates go.
- [x] Hierarchy needs no `SampleSpace` helper after all: seeds are nested for legibility and
      flattened depth-first onto `Task.parentTask`, because `parentTask` is a Task field a generic
      helper would have nothing to say about. `SampleSpace.children` still writes the flat membership
      array. Two levels deep, verified: 6 roots, 11 sub-tasks, 3 of them grandchildren.
- [x] Diagrams are **mermaid blocks inside markdown**, not tldraw canvases: a real canvas needs
      `plugin-illustrator` + `plugin-tldraw` + the `@tldraw/*` packages as new deps, and
      mermaid-in-markdown is how software projects actually carry architecture diagrams. Swap later
      if a real canvas is wanted.

## Phase 6 — content authoring for phases in `src` — SETTLED

The convention, as shipped in Phase 4: content a plugin wants to run **in-app** lives in
`src/sample/` and is reached only through a `sampleSpaces(loader)` contribution, so it stays in its
own chunk. Content that exists **only to generate a committed snapshot** stays in `scripts/`. No
`./Sample` export subpath is needed — the loader is internal to the plugin, and nothing outside it
imports the definition.

`composer-app:check-boot-budget` is the gate that proves the gating held.

## Phase 7 — viewing a sample space

- [x] `plugin-debug/src/stories/SampleSpaces.stories.tsx` — the existing `SpaceGenerator` story
      already had the whole stack (client, identity, space), so the sample spaces host there rather
      than needing a new home. The story pairs the generator with `DebugSpaceObjectsPanel`, the same
      object tree the debug plugin shows in the app, so the collections, refs and feeds a sample
      space builds are inspectable without exporting an archive.
- [x] `Default` renders the empty space plus the picker; `Tidepool` and `Northwind` carry
      `tags: ['test']` and a `play` that applies the space and waits for its content.
      `moon run plugin-debug:test-storybook` — 12 passed (6 files).
- [x] Verified in a real browser via Playwright MCP against a storybook on port 9019 (the user's own
      on 9009 serves a different checkout and cannot see worktree files — start a second one, never
      kill theirs). The tree showed all 17 Tidepool tasks, 3 milestones, the repo, the project, the
      three documents with their Text bodies, and both collections.
- [x] `SchemaTable` rows can carry a `presetLabel` so sample spaces list by name rather than preset
      id, and the count column shows `—` for them (a preset has no object count).
      **Use `presetLabel`, not `name`**: a class-based type entity already has `name` — its JS class
      name — so keying off that suppressed the count on every real type row.

Three defects this story surfaced, all fixed:

1. `plugin-crm` will not activate without `plugin-inbox`, and `plugin-projects` without
   `plugin-tasks`. A missing plugin dependency fails activation silently — only a console warning —
   so the contributed sample spaces simply never appeared.
2. `getByText` throws on multiple matches, and Tidepool names two objects "Offline sync v2" (its
   task set and its project). The play test read as a 64s timeout; it was an assertion error
   retrying. `getAllByText` fixed it and the test runs in ~3s.
3. A per-package `storybook: { timeout }` raise was added while mis-diagnosing (2) and then
   reverted — the default 15s is 5x the actual runtime.
