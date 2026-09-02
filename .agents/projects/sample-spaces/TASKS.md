# Sample spaces — tasks

Design: [DESIGN.md](./DESIGN.md)

## Phase 0 — housekeeping

- [x] Rename onboarding content: `readme.md` → `README.md`, `about-bramble.md` → `sample/ABOUT.md`,
      `space-tour.md` → `sample/README.md`, `exemplar-space.dx.json` → `sample/space.dx.json`,
      `build-exemplar-space.ts` → `build-sample-space.ts`; update every call site.
- [ ] Rename the moon task and npm script `build-exemplar` → `build-sample`.
- [ ] Rename `import-exemplar-space.ts` and the `ImportExemplarSpace` operation / `EXEMPLAR_SPACE_TAG`
      identifiers (spreads into `app-toolkit` and other plugins).

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

## Phase 3 — port the mbox importer

- [ ] `plugin-google/scripts/import-mbox-space.ts` onto the builder, keeping the streaming/batched
      append (a Takeout export is too large to hold in memory) and the `--limit` guard.
- [ ] Replace its bespoke tag cache with `SampleSpace.Tags`.

## Phase 4 — debug plugin

- [ ] Expose sample-space definitions in `SpaceGenerator` alongside `staticGenerators` and the
      existing presets, applied via `SampleSpace.applyTo`.
- [ ] Port one scripted preset (`DXOS_TEAM`) to a phase as the proof.

## Phase 5 — the second space

- [ ] Add a second sample space (vertical TBD) to prove phases compose across definitions.
