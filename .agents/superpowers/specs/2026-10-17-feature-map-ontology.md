# Feature map ontology (projects × plugins prototype)

Status: proposal, revised 2026-10-19. Feeds the projects/plugins feature-map prototype.

## The one-line answer

**A feature is a goal state, a task is work toward it, and a showcase is the evidence
that it was reached.** Features are ECHO objects that people and agents author;
specs stay in the repo and a feature only points at them.

## Types

All three object types and the three relations live in plugin-projects
(`src/types/`), next to `ProjectView`. They depend on `@dxos/types` (`Task`, `File`,
`PullRequest`) and `@dxos/schema` (`Text`); nothing in `@dxos/types` depends on them.

```text
Feature     (org.dxos.type.feature)
  name:        string
  description?: string            short markdown
  status:      planned | in-progress | prototype | operational | failing
  specs:       string[]           repo paths, e.g. packages/plugins/plugin-inbox/PLUGIN.mdl#F-3 (open on GitHub)
  subfeatures: { name, status }[] embedded records, ordered; one level, no specs

Showcase    (org.dxos.type.showcase)
  name:         string
  content:      Ref<Text>          owned markdown body
  artifacts:    Ref<Obj>[]         files, PRs and other evidence; not owned (like Task.artifacts)

FeatureMap  (org.dxos.type.featureMap)
  name:      string
  features:  Ref<Feature>[]       the board's members, in card order
  positions: Record<featureId, { x, y }>   canvas positions the user dragged

DependsOn   (org.dxos.relation.dependsOn)    Feature → Feature
Implements  (org.dxos.relation.implements)   Task → Feature
Demonstrates (org.dxos.relation.demonstrates) Showcase → Feature | Task
```

Tags are the standard ECHO meta tags (`Obj.getMeta(obj).tags`, `Tagging`,
`Filter.tag`); no type declares a `tags` field.

```text
FeatureMap ─▶ Feature { subfeatures: [{ name, status }] }
                │ ▲  ▲
     DependsOn ─┘ │  └── Demonstrates ── Showcase ── artifacts ─▶ File | PullRequest | …
                  │                      │
           Implements                Demonstrates
                  │                      │
                 Task ◀──────────────────┘
```

## Decisions and why

1. **Features are authored in ECHO; specs stay in the repo.** A feature is the
   goal ("Compose & send works against Gmail"), which a person or an agent states
   and revises in Composer. The `.mdl` spec is the contract for how one plugin
   meets it and is reviewed in PRs, so it stays in git and a feature only lists
   repo paths in `specs`. There is no importer and no ECHO `Spec` copy, so the two
   cannot drift: if a spec moves, the path is stale and the card says so.

2. **Status is one authored word with five values.** It answers "where is this
   now?", and it is set by whoever knows, usually the agent that shipped or
   checked the work.

   | Status      | Meaning                                             |
   | ----------- | --------------------------------------------------- |
   | planned     | Wanted; no work started.                            |
   | in-progress | Someone is building it.                             |
   | prototype   | It works in a demo or behind a flag; not relied on. |
   | operational | It works and people rely on it.                     |
   | failing     | It used to be operational and does not work now.    |

   `failing` replaces "regressed" and "broken": it is a present-tense fact about
   the feature that pairs naturally with a failing test or QA run, and it does not
   imply who broke it.

3. **Two levels: features, then subfeatures; dependencies are a DAG.** A
   subfeature is a record inside its feature (`{ name, status }`), not a feature
   of its own: it has a status, but specs, dependencies, tasks and showcases
   belong to the feature. Two levels keep the map readable and keep every edge
   between objects that can be opened. "Depends on" crosses plugins, so it is a
   `DependsOn` relation; the add-dependency operation rejects an edge that would
   close a cycle and names the features in it.

4. **Joins to work and evidence are relations.** A task can move several
   features and a feature has many tasks, so `Implements` is many-to-many. A
   showcase can demonstrate a feature, a task, or both, so `Demonstrates` targets
   either. Relations also keep `Task` in `@dxos/types` free of a projects
   dependency.

5. **A showcase is what an agent makes to prove a result.** A markdown body says
   what was shown and how to reproduce it, and `artifacts` lists the evidence —
   screenshot and video files, synced PRs, anything else — as plain refs, like
   `Task.artifacts`: the showcase points at them and does not own them.

6. **A feature map is a board, not a hierarchy.** It lists the features to show
   and remembers where the user dragged them on the canvas. A feature can be on
   several maps. Membership is explicit rather than "every feature in the space"
   so a map can be scoped to one plugin, one product or one release, and its refs
   are also the query scope: the views load only those features and their
   relations, so cost follows the map, not the space.

7. **Derived warnings stay derived.** The card still computes, never stores:
   - **blocked**: a dependency is `planned` or `failing`;
   - **ahead of a dependency**: it is `operational` while a dependency is not;
   - **missing dependency**: a `DependsOn` target was deleted;
   - **no evidence**: `operational` with no showcase;
   - **no work planned**: `planned` with no implementing task.

## Rendering

`FeatureMap` gets one article with two views, switched from the toolbar and
remembered per map:

- **Cards (default).** Feature cards in map order. A card shows the status, the
  most serious warning plus a "+N" count, a "Depends on N" row, open tasks with
  their milestones, and the latest showcase. Expanded and selected cards list
  everything.
- **Canvas.** The same cards inside `@dxos/react-ui-canvas` boxes, laid out by
  dependency rank with straight arrows for `DependsOn`. The only edit is moving
  a box; positions are written to `FeatureMap.positions`. It reuses the dynamic
  projection (`layoutGraph`, `createDynamicProjection`) and needs three small
  extension points there:
  1. a node factory, so graph nodes can be a `feature` node type rather than `rect`;
  2. link type and arrow ends, so edges are `line` with an end arrow rather than `curve`;
  3. a capabilities option, so the projection allows `move` only.

  The node view renders the object through `Surface` (`CardContent`), the same
  pattern as plugin-canvas's frame nodes.

## Prototype scope

1. Types and relations above, registered in plugin-projects, with create entries
   and translations.
2. `FeatureMapArticle` with the Cards view on live objects.
3. The canvas extension points in `react-ui-canvas`, then the Canvas view.
4. Operations for agents: create a feature, link a task (`Implements`), add a
   dependency (cycle-checked), and create a showcase from text, files and PRs.
5. A sample space with the inbox/connector/projects features used in the stories.

## Open questions

1. Should a `Project` list the feature maps it moves, or is "features reached
   through its tasks" enough? Proposal: derived, as before.
2. Should `failing` be set automatically when a QA test that covers a linked spec
   fails? Proposal: later; for now an agent sets it when it observes the failure.
