# Sample spaces

Generalize the two hand-written space builders and the debug plugin's object generators onto one
mechanism, so a new themed sample space is a phase list rather than a 1800-line script.

## Problem

Three mechanisms build test/demo content today, and the two that matter overlap heavily:

| Mechanism                                         | Shape                                                                                      | Lines |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----- |
| `plugin-onboarding/scripts/build-sample-space.ts` | one coherent narrative world (Bramble Coffee Roasters), exported to a committed `.dx.json` | 1810  |
| `plugin-google/scripts/import-mbox-space.ts`      | file in → archive out, one Mailbox from an mbox                                            | 174   |
| `plugin-debug/src/components/SpaceGenerator/*`    | `(space, n) => T[]` — n random objects per typename, plus scripted presets                 | ~1000 |

Roughly 200 of the onboarding script's 1810 lines are mechanism; the rest is content. The mechanism
is duplicated or near-duplicated:

- **The harness** — boot an in-memory client, create an identity, `addTypes`, create the space,
  populate, flush, export, minify to one line, write. ~35 near-identical lines in both scripts.
- **Root-collection bootstrap** — replicating plugin-space's identity-created capability headlessly.
  Also existed as an Effect-flavoured twin, `WithProperties`, in `app-toolkit/testing`.
- **Tag resolution** — resolve each tag once, store the URI space-relative so membership survives
  the space-id remap on import. Both scripts, with different helpers.
- **Feed append ordering** — feed entities only get DXNs after `db.flush()`, so appends must run
  last. Enforced by a comment.
- **`db.addType()` + a View over it** — three variants across the two scripts and `ObjectGenerator`.
- **Parent edge + membership array** — `Obj.setParent` plus a `Ref` push, written out per type.
- **Deterministic clock** — `NOW` env override with `daysAgo`/`daysFromNow`.
- **Seed tables** — `ORG_SEEDS`/`PEOPLE_SEEDS` keyed by a short discriminant so later sections
  reference `people.kai` rather than an array index. This is the structure the script already has
  informally, and the one worth making explicit.

## Decisions

1. **Home: `@dxos/app-toolkit/SampleSpace`.** Public, already depends on `@dxos/client`, `@dxos/echo`
   and `@dxos/schema`, and already hosts `AppSpace`/`AppAnnotation` and a `testing` subpath. A new
   package was not an option — a private package cannot be imported by published ones.
2. **A phase builder, not just extracted helpers.** The threading of one phase's output into the
   next is the actual structure; expressing it directly is what makes a second sample space cheap.
3. **Effect.** `Database` already exposes `add`/`addType`/`appendToFeed`/`flush` as Effects and
   `Database.Service`/`Database.layer` exist, so the services compose with the rest of the stack.
4. **Debug presets become phases.** One definition runs headless (archive) or against a live space,
   which is the only abstraction the narrative builder and the count-driven generator need to share.
   `ObjectGenerator`'s `(space, n) => T[]` contract stays as it is — "n random widgets" is a
   different job from "one coherent world" and unifying the two interfaces would help neither.
5. **More sample spaces is the driver**, so phases are shareable across definitions rather than
   private to one.

## Shape

```ts
const Organizations = SampleSpace.phase('organizations', {
  schemas: [Organization.Organization],
  run: () => SampleSpace.seed(ORG_SEEDS, ({ name }) => Database.add(Obj.make(Organization.Organization, { name }))),
});

const definition = SampleSpace.make({
  space: { name: 'Bramble Coffee Roasters', icon: 'potted-plant', hue: 'amber' },
  reference: '2026-05-20T15:00:00Z',
  phases: { organizations: Organizations, people: People, mailbox: Mailbox },
  build: (phases) =>
    Effect.gen(function* () {
      const organizations = yield* phases.organizations();
      const people = yield* phases.people(organizations);
      const { mailbox } = yield* phases.mailbox(people);
      yield* SampleSpace.collection('Welcome', [Ref.make(mailbox)]);
      return { organizations, people };
    }),
});
```

- **The phase map is the single source of truth.** `definition.schemas` is derived from it (plus the
  builder's own `BASE_SCHEMAS`), so a phase cannot contribute content without its types registered —
  replacing the hand-maintained `SCHEMAS` array that has already drifted once.
- **Services**, all satisfiable in the browser as well as headless: `Clock` (fixed reference date),
  `Feeds` (appends queued and drained after the final flush — the ordering hazard becomes
  structural), `Root` (root collection, seeded when absent), `Tags` (URIs resolved once, stored
  space-relative).
- **Runners**: `SampleSpace.applyTo(definition, space)` against a live or test database;
  `buildArchive(definition)` in `app-toolkit/testing` boots an ephemeral client and returns the
  archive as one line of JSON. `histogram(json)` counts per typename across both the archive's
  `objects` and `feeds` sections, which is how a port is verified as faithful.

## Verification strategy

A port is faithful when the rebuilt archive's type histogram matches the old one — object ids and
timestamps necessarily differ, so byte comparison is meaningless. `histogram()` exists for that
assertion, and the committed snapshot is regenerated only when content actually changes.

## Open questions

- Which second sample space proves shareability (the phase catalog is only justified by a second
  consumer).
- Whether the Bramble RoastLog pattern (a custom schema defined in the builder, persisted via
  `db.addType()`, with Table/Kanban views over it) becomes a `SampleSpace` helper or stays content.
