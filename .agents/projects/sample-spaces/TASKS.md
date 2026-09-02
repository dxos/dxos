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

- [ ] Split the Bramble content out of `build-sample-space.ts` into phase modules under
      `plugin-onboarding/src/sample/phases/` (organizations, people, mailbox, calendar, taskSet,
      notes, sketches, sheets, roastLog).
- [ ] Define the space with `SampleSpace.make`; drop the hand-maintained `SCHEMAS` array.
- [ ] Reduce the script to: build the definition, write the archive.
- [ ] Verify with `histogram()` — the rebuilt archive must match the committed snapshot's type
      counts (23 typenames, 77 objects, 3 feeds at time of writing).
- [ ] Regenerate the snapshot; check whether the stale `org.dxos.type.sketch` refs noted in
      `plugin-tldraw/TASKS.md:126` clear as a side effect.

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
