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

- [ ] Expose sample-space definitions in `SpaceGenerator` alongside `staticGenerators` and the
      existing presets, applied via `SampleSpace.applyTo`.
- [ ] Port one scripted preset (`DXOS_TEAM`) to a phase as the proof.

## Phase 5 — the further spaces

Two chosen, both of which reuse Bramble's `organizations`/`people` phases — which is the point:
the phase catalog only earns its keep with a second consumer.

- [x] **CRM pipeline** — the Northwind Sales space, in `plugin-crm/scripts/sample/` (accounts,
      pipeline, inbox) + `scripts/build-sample-space.ts` + `src/sample.test.ts`. 28 objects,
      2 tests green, built on demand.
      - Uses `Pipeline` from `@dxos/types` — a board of View-backed columns, each `{ name, order,
        view }`. Every column's view is `Filter.type(Organization, { status })`, so a stage IS a
        query and moving a card is a status change, not a membership edit. `order` is stored
        explicitly so a rearranged board keeps its order.
      - `Organization.status` is `prospect | qualified | active | commit | reject` — five stages,
        so `reject` gives the board its Closed-lost column.
      - `@dxos/effect` had to be added to plugin-crm (`workspace:*`) for `EffectEx.runPromise`;
        every other dep was already there.
      - Note the `Pipeline` naming TODOs in `@dxos/types/Pipeline.ts`: it collides with
        `@dxos/pipeline` and is slated to move into its owning plugin. If it is renamed, this space
        and its test move with it.
- [x] **Software project management** — the Tidepool space, in `plugin-projects/scripts/sample/`
      (team, people, docs, tasks, project) + `scripts/build-sample-space.ts` + `src/sample.test.ts`.
      42 objects. Built on demand rather than committed — no fixture to keep in step with schemas;
      `src/sample.test.ts` asserts the shape instead (2 tests, green). - `Project` lives in `@dxos/compute/Project` (0.6.0), NOT `@dxos/types`, and there is no
      `ExternalProject` — that name survives only in two comments. `Project.make` creates its own
      empty TaskSet unless one is passed, so the tasks phase's set is handed to it explicitly. - `Task` has **no due-date field**. Its dates are `history` entries
      (`{ date, event: 'created' | 'updated', description }`) — that is where the sample dates go. - Hierarchy needs no `SampleSpace` helper after all: seeds are nested for legibility and
      flattened depth-first onto `Task.parentTask`, because `parentTask` is a Task field a generic
      helper would have nothing to say about. `SampleSpace.children` still writes the flat
      membership array. Two levels deep, verified: 6 roots, 11 sub-tasks, 3 grandchildren. - Diagrams are **mermaid blocks inside markdown**, not tldraw canvases: a real canvas needs
      `plugin-illustrator` + `plugin-tldraw` + the `@tldraw/*` packages as new deps, and mermaid-in-
      markdown is how software projects actually carry architecture diagrams. Swap later if wanted. - `tsconfig.json`'s `include` is hand-maintained (the toolbox only manages `references`), so
      `scripts/**/*.ts` had to be added by hand — and `scripts` added to `files`, since the
      published `src` now contains a test that imports it.

## Phase 6 — content authoring for phases in `src`

Bramble's content stays under `scripts/` because the builder must never reach the browser. A phase
that a plugin wants to run in-app (Phase 4) has to live in `src` behind a lazily-imported subpath,
and `composer-app:check-boot-budget` (21 entries / 4.15 MB against 25 / 4.35 MB today) is the gate
that proves it stayed lazy.

- [ ] Decide the convention: a `./Sample` subpath per plugin, or one definition inside plugin-debug.
