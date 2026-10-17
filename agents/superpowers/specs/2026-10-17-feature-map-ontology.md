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
  stage:  planned | preview | stable     (default: planned)
  dependsOn: Ref<Feature>[] features this one needs, in this spec or another
  requirements: Requirement[]   embedded { key: 'F-3.1', text }
  scenarios:    Scenario[]      embedded { key: 'T-1', given, when, then }

Implements  (org.dxos.relation.implements — NEW relation)
  source: Task  →  target: Feature
  requirement?: string      optional req key, e.g. 'F-3.2'
```

Nothing changes on `Project`, `TaskSet`, `Milestone` or `Task`.

### The map, as levels

```text
Spec ─ owns ─▶ Feature ─ dependsOn ─▶ Feature (any spec)
                  │  ▲
     requirements ┘  └── Implements ── Task ── milestone ─▶ Milestone
                                         └── TaskSet ◀── Project
```

Spec → Feature → Requirement is the "what" axis, and `dependsOn` turns the
features into a graph across plugins. Project → Milestone → Task is the
"when/who" axis. `Implements` is the only join between the two.

### Writing it in the mdl

```mdl
feat F-4: Compose & send
  stage: preview
  depends: [F-1, org.dxos.plugin.connector#F-2]
  req F-4.1: ...
```

A bare id (`F-1`) is a feature in the same spec. A qualified id
(`<spec.key>#F-n`) is a feature in another spec. Both resolve to a `Ref<Feature>`
on import.

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

4. **Maturity is three words, authored; progress is derived.** `stage` answers
   one question: can a user rely on this? `planned` means it does not exist yet,
   `preview` means it exists but may change or break, and `stable` means it is
   supported. That is all a map needs to colour a card. The plugin tags
   (`labs`, `alpha`, `beta`) all mean `preview` here, and a feature that is going
   away is deleted from the spec rather than flagged. `stage` is a claim a person
   makes, so it lives in the mdl next to the feature, like
   `op … status: unimplemented` does today. Progress is never stored. The map
   computes it:

   | Signal      | Derived from                                            |
   | ----------- | ------------------------------------------------------- |
   | in flight   | any open `Task` with `Implements` → feature             |
   | shipping in | the milestones of those tasks                           |
   | covered     | every `req` appears in some `test … covers:`            |
   | untested    | `stable`, and no `req` of it is covered                 |
   | unplanned   | `planned`, and no task implements it                    |
   | blocked     | a feature it depends on is `planned`                    |
   | overclaimed | its stage is above the stage of a feature it depends on |

   Coverage is counted per requirement. A `covers:` entry naming the feature
   (`F-3`) or a scenario does not count, because neither says which requirement
   was checked.

5. **No `Plugin` type.** A plugin on the map is a `Spec` with `kind: plugin`; its
   key equals `dx.config.ts` `plugin.key` (e.g. `org.dxos.plugin.inbox`), which is
   the join to the runtime registry when the map needs install state or version.
   A separate catalog type would be a third copy of the same id.

6. **Dependencies are one edge between features, authored in the spec.**
   `dependsOn` means "this feature does not work without that one". It is the
   only edge between features, so it also covers cross-plugin capabilities: one
   that spans plugins ("delegate a task to an agent": projects + assistant +
   agent) is a feature in a `kind: product` spec that depends on the plugin
   features it needs. Every feature still belongs to exactly one spec. Four rules
   keep the edge trustworthy:
   - **Authored, not inferred.** The dependency is a design claim, so it lives in
     the mdl and is reviewed in the PR that makes it. Package imports or shared
     operations are evidence for the claim, not the claim itself.
   - **A ref on the dependent feature.** Every other structural edge in the
     projects model is a ref stored once on one side, and this one can be too,
     because the importer writes the whole projection. Dependents ("what breaks
     if I change F-3?") are a reverse lookup and are not stored.
   - **Feature to feature only.** A requirement or a task cannot be a dependency.
     When one requirement is all that matters, it goes in the prose of the
     dependent feature.
   - **Acyclic.** The importer rejects a cycle and names the features in it, the
     same way the mdl linter rejects an unresolved `[id]`. A dependency on a
     feature that no longer exists is reported, not silently dropped.

7. **Projects do not list features.** "Features in this project" is the set
   reached through its tasks. A stored `Project.features` array would be a second
   statement of the same fact and would drift exactly like the old
   `parentTask`/`tasks` pair did.

## Prototype scope

1. Add `key`/`kind`/`repo`/`path` to `Spec`; add `Feature` and `Implements`; add
   `stage` and `depends` to the mdl `feat` extension.
2. Importer: mdl → `Spec` + `Feature` upsert by meta key; deleted feats are removed
   and their `Implements` relations need no sweep: ECHO treats a relation with a
   deleted endpoint as deleted at read time, so default queries drop it (unlike
   milestone delete, which clears `task.milestone` explicitly).
3. A seed that imports the repo's 96 `PLUGIN.mdl` files into a sample space.
4. One map view: plugins as columns, features as cards coloured by `stage`, with
   dependency edges drawn between them, the derived signals as badges, and the
   project's milestones as a filter.
5. A project-skill verb `feature-link` (task, feature, requirement?) so agents
   create the edge when they pick up work.

## Open questions

1. Should the prototype live in plugin-projects, plugin-code (which owns `Spec`),
   or a new plugin-features? Proposal: types in `@dxos/types` next to `Task`, the
   view in plugin-projects.
2. Should dependencies be backfilled for the 502 existing feats? Proposal: no.
   Write them as features are touched, and let an agent propose a first pass
   from package imports for a person to review.
3. Do `test QA-n` blocks need to be objects too, so a map can show pass/fail from
   the last QA run? Proposal: not for the prototype — coverage only.
