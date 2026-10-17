# Feature map ontology (projects × plugins prototype)

Status: proposal, 2026-10-17. Feeds the projects/plugins feature-map prototype.

## The one-line answer

**A spec says what exists, a project says what is being done, and one relation joins
them.** A `Feature` is a block in a spec, not a task and not a milestone; a `Task`
points at the features it changes; everything a map shows beyond that is derived.

## What already exists

| Layer | Thing                                                        | Where                          | Authored in |
| ----- | ------------------------------------------------------------ | ------------------------------ | ----------- |
| Spec  | `PLUGIN.mdl` / `SPEC.mdl` (130 files, 96 plugins)            | git                            | `.mdl` text |
| Spec  | `feat F-n` → `req F-n.m` (502 feats)                         | inside the mdl                 | `.mdl` text |
| Spec  | `scenario T-n`, `test QA-n` with `covers: [F-1.1, T-1]`      | inside the mdl                 | `.mdl` text |
| Spec  | `Spec` object (`org.dxos.type.spec`, body is a `Text`)       | plugin-code                    | ECHO        |
| Work  | `Project` → `TaskSet` → `Milestone[]`, `Task[]` (`subtasks`) | `@dxos/compute`, `@dxos/types` | ECHO        |
| Work  | `Repo`, `Issue`, `PullRequest`                               | `@dxos/types`                  | synced      |

The gap is the edge between the two halves: nothing says "this task changes
inbox F-3", so there is no way to draw which features a project moves, or which
features have no work, no tests, or no owner.

## Proposed model

```text
Spec  (org.dxos.type.spec — existing, extended)
  key:    string            frontmatter id, e.g. org.dxos.plugin.inbox
  kind:   plugin | package | product | dialect
  name, version
  content: Ref<Text>        the mdl source (owned)
  repo?:  Ref<Repo>, path?: string

Feature  (org.dxos.type.feature — NEW; parent = Spec)
  key:    string            block id, e.g. F-3      (global id: <spec.key>#F-3)
  name:   string            the block title
  description?: Text        inline prose
  stage?: planned | labs | alpha | beta | stable | deprecated
  requirements: Requirement[]   embedded { key: 'F-3.1', text }
  scenarios:    Scenario[]      embedded { key: 'T-1', given, when, then }
  uses?:  Ref<Feature>[]    cross-spec composition (product-level features)

Implements  (org.dxos.relation.implements — NEW relation)
  source: Task  →  target: Feature
  requirement?: string      optional req key, e.g. 'F-3.2'
```

Nothing changes on `Project`, `TaskSet`, `Milestone` or `Task`.

### The map, as levels

```text
product spec ─ uses ─▶ Feature (plugin spec) ─ requirements ─▶ req
     │                      ▲
     │                      └── Implements ── Task ── milestone ─▶ Milestone
     └ Spec(kind: product)                        └── TaskSet ◀── Project
```

Product → Plugin (Spec) → Feature → Requirement is the "what" axis.
Project → Milestone → Task is the "when/who" axis. `Implements` is the only join.

## Decisions and why

1. **Git is the source of truth for features; ECHO holds a projection.** The 502
   feats already live in `.mdl`, are reviewed in PRs, and are what agents read. A
   second, hand-edited copy in a space would drift on the first commit. An importer
   parses each `Spec.content` and upserts `Feature` objects keyed by
   `Obj.getMeta(feature).keys = [{ source: 'mdl', id: '<spec.key>#F-3' }]` — the
   same pattern the Linear/GitHub task sync already uses. Editing a feature in
   Composer means editing the spec text, then re-deriving.

2. **`Feature` is an object; `Requirement` and `Scenario` are embedded.** A feature
   needs identity so tasks can point at it, agents can query it, and the map can
   render a node for it. Requirements are atomic lines that are only ever read with
   their feature; making ~1,900 of them objects buys nothing. A task that targets one
   requirement says so with `Implements.requirement`. If requirements later sync out
   as Linear issues on their own, promote them then — the same outline → `Task`
   promotion rule the projects design already uses.

3. **The join is a relation, not a field on `Task`.** A task often touches more
   than one feature (moving sync to EDGE is inbox F-3 and F-6), so the edge is
   many-to-many. A relation also keeps user-authored links off the projected
   `Feature`, which the importer rewrites, and keeps `@dxos/types` `Task` free of a
   spec dependency. This is the one place the "structure as a ref on the child"
   rule in `plugin-projects/docs/DESIGN.md` does not fit, because that rule assumes
   many-to-one.

4. **Maturity is authored; progress is derived.** `stage` is a claim a person makes
   about a feature, so it lives in the mdl next to it (`feat F-3: Provider sync` +
   `stage: beta`), like `op … status: unimplemented` does today. Progress is never
   stored. The map computes it:

   | Signal      | Derived from                                 |
   | ----------- | -------------------------------------------- |
   | in flight   | any open `Task` with `Implements` → feature  |
   | shipping in | the milestones of those tasks                |
   | covered     | every `req` appears in some `test … covers:` |
   | orphan      | stage ≥ beta, no test covers it              |
   | unplanned   | stage = planned, no task implements it       |

5. **No `Plugin` type.** A plugin on the map is a `Spec` with `kind: plugin`; its
   key equals `dx.config.ts` `plugin.key` (e.g. `org.dxos.plugin.inbox`), which is
   the join to the runtime registry when the map needs install state or version.
   A separate catalog type would be a third copy of the same id.

6. **Cross-plugin features compose; they do not span.** Every feature belongs to
   exactly one spec. A capability that crosses plugins ("delegate a task to an
   agent": projects + assistant + agent) is a feature in a `kind: product` spec
   whose `uses` lists the plugin features it needs. One type, one owner per
   feature, and the map can roll up from either end.

7. **Projects do not list features.** "Features in this project" is the set
   reached through its tasks. A stored `Project.features` array would be a second
   statement of the same fact and would drift exactly like the old
   `parentTask`/`tasks` pair did.

## Prototype scope

1. Add `key`/`kind`/`repo`/`path` to `Spec`; add `Feature` and `Implements`.
2. Importer: mdl → `Spec` + `Feature` upsert by meta key; deleted feats are removed
   and a dangling `Implements` reads as unlinked (the milestone-delete rule).
3. A seed that imports the repo's 96 `PLUGIN.mdl` files into a sample space.
4. One map view: plugins as columns, features as cards coloured by derived signal,
   with the project's milestones as a filter.
5. A project-skill verb `feature-link` (task, feature, requirement?) so agents
   create the edge when they pick up work.

## Open questions

1. Should the prototype live in plugin-projects, plugin-code (which owns `Spec`),
   or a new plugin-features? Proposal: types in `@dxos/types` next to `Task`, the
   view in plugin-projects.
2. Is `stage` the right maturity vocabulary, or should a feature reuse the plugin
   tags in `dx.config.ts` (`labs` ×64, `alpha` ×20, `beta` ×5)? Proposal: reuse
   them — `labs | alpha | beta | stable | deprecated` — so a feature can never
   claim more maturity than the plugin that ships it.
3. Do `test QA-n` blocks need to be objects too, so a map can show pass/fail from
   the last QA run? Proposal: not for the prototype — coverage only.
