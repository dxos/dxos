# MOSAIC — Model-Oriented System for Adaptive Interface Composition — DESIGN

_Resume: see TASKS.md. Branch `claude/declarative-ui-abstraction-h28b9j`; PR #12484._

**MOSAIC** (not to be confused with the `react-ui-mosaic` package) is the
umbrella work-stream for making Composer's UI declaratively described and
eventually declaratively composed: the app reduces to data-driven idioms
(navigation = app-graph, presentation = queries/Views, action = operations);
this stream names the ontology, gives it a DEUS specification surface,
designs the missing composition layer (Scenes), and renders UI schematics
from the declarative app model (the illustrator `Ui` dialect).

The design itself lives in the linked documents — this file is the index and
the decision log.

## Documents

| Document                                                                                                                               | Content                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`2026-08-04-declarative-ui-abstraction-design.md`](../../../agents/superpowers/specs/2026-08-04-declarative-ui-abstraction-design.md) | Survey of the UI stack, prior art across ecosystems, Experiment 1 (MailboxController extraction — implemented, verified, parked) with bridge findings. |
| [`2026-08-06-scenes-app-ontology-design.md`](../../../agents/superpowers/specs/2026-08-06-scenes-app-ontology-design.md)               | The Scenes composition DSL (XML → typed model → interpreter), zag-style machines, MDL grounding, Experiment 2 walking-skeleton proposal.               |
| [`2026-08-13-hyperspace-app-ontology.md`](../../../agents/superpowers/specs/2026-08-13-hyperspace-app-ontology.md)                     | Data ontology (Hyperspace / Space / Schema / Feeds) + app ontology (Deck / Plugins / Components) with the layer↔MDL correspondence.                    |
| [`packages/reflect/deus/lang/app.mdl`](../../../packages/reflect/deus/lang/app.mdl)                                                    | The DEUS app dialect: `node`, `deck`, `plank`, `companion`, `surface`, `menu`.                                                                         |
| [`packages/plugins/plugin-inbox/PLUGIN.mdl`](../../../packages/plugins/plugin-inbox/PLUGIN.mdl)                                        | First full plugin description in the dialect (app graph, deck chain, surfaces, menus, ops, sync, skills).                                              |
| [`packages/plugins/plugin-illustrator/src/model/ui.ts`](../../../packages/plugins/plugin-illustrator/src/model/ui.ts)                  | UI-schematic dialect (phase 1): schema → Deck/Plank/Panel/Form/Control drawing → ASCII + tldraw renderers.                                             |

## Decisions

- **2026-08-05** — Experiment 1 (controller extraction) proved H1/H2/H4
  headlessly; parked in favor of composition-first framing.
- **2026-08-13** — Branch slimmed to docs; experiment code left in history
  (`49de0924`/`a5e7982a`) rather than re-ported across main's migration to
  `effect/unstable/reactivity/Atom`.
- **2026-08-13** — Descriptive-before-prescriptive: describe today's app in
  the DEUS app dialect (plugin-inbox first) before building the Scene DSL, so
  the composition vocabulary is derived from reality.
- **Naming** — `View` stays the query+projection object; `Scene` names
  authored composition; `Hyperspace` names the graph-of-spaces client layer.
