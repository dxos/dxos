# The Project nexus — design

_2026-07-14. Design for reconciling `Topic` / `Project` / `Task` into a single primary "nexus" object:
the focus of attention from which users manage complex, multi-source workflows. Companion to
[`AUDIT.md`](./AUDIT.md) (the Topic refactor inventory) and the CRM spec
(`agents/superpowers/specs/2026-07-13-crm-workflow-design.md`)._

## 1. Concept

A **Project** (the reconciled `Topic`/`Project`) is a durable workspace that **connects** the things a
piece of work touches and **hosts** the analysis run over them:

- **Connects** — Email conversations and other Message **threads**; **Contacts** (Person/Organization);
  related **Collections** of objects (Sketch, Sheet, Table, files); sibling/child Projects.
- **Contains** — a **Task list** (via `@dxos/plugin-outliner` `Outline`), **Notes** (documents), a
  rolled-up **Summary**, open **Questions**, and extracted **Facts**.
- **Is the landing point for pipelines** — `pipeline-email` summarizes the Project's conversations;
  `pipeline-rdf` extracts facts and drives research + Person/Organization entity extraction; results are
  written back onto the Project (summary, facts, contacts, tasks).
- **Has an Agent** — a Project-scoped assistant whose working set is the Project's threads, facts, tasks,
  and notes.

### Schema reconciliation (`Topic` → `Project`)

Today: `Topic` = `{ label, summary, threadIds[], participants[], keywords[], questions[], tasks[] }`
(string-keyed); `Project` (`@dxos/types`) = `{ name, description, image }`; `Task` (`@dxos/types`).
Target `Project` (in `@dxos/types`), string arrays promoted to **Relations/Refs** where an entity exists:

| Field            | Now                      | Target                                                         |
| ---------------- | ------------------------ | -------------------------------------------------------------- |
| `name` / `label` | `Topic.label`            | `name` (reconcile the two)                                     |
| `summary`        | string                   | string (pipeline-written)                                      |
| threads          | `threadIds: string[]`    | `Ref<Thread>[]` / `AnchoredTo` relations to `Message`/`Thread` |
| contacts         | `participants: string[]` | `Ref` to `Person` / `Organization` (entity-resolved)          |
| tasks            | `tasks: string[]`        | `Ref<Outline>` (Outliner task list)                            |
| notes            | —                        | `Ref<Document>[]`                                              |
| collections      | —                        | `Ref<Collection>` (Sketch/Sheet/Table/File)                    |
| facts            | —                        | Project-scoped FactStore (via plugin-brain)                    |
| questions        | `questions: string[]`    | keep; later reified questions                                  |
| keywords         | `keywords: string[]`     | keep (search/cluster)                                          |
| status           | —                        | enum (active/paused/done) + dates/milestones                   |

`Task` reconciliation: the Project's task list is an `Outline` of `Task`s (Outliner already models nested
checklists); `Topic.tasks` string rollup becomes the seed for that Outline. Keep `Topic.Props` (the
shared struct with `Mailbox.topicSuggestions`) until suggestions migrate to Ref-based fields.

## 2. Workflows / activities driven from a Project (brainstorm)

1. **Attach conversations** — cluster inbound email/threads and attach (or suggest attaching) them to a
   Project by participant/keyword match.
2. **Summarize the Project** — `pipeline-email` rolls up all attached conversations into the Project
   summary (refreshed incrementally as threads arrive).
3. **Extract action items** — pull tasks from threads/notes into the Project's Outliner task list.
4. **Draft replies with context** — generate replies to outstanding threads using the whole-Project
   context (facts, prior decisions, tone).
5. **Extract facts** — `pipeline-rdf` builds a Project-scoped fact store from its sources.
6. **Entity resolution** — discover Person/Organization mentions → materialize/link Contacts to the
   Project (dedup against existing).
7. **Research agent** — given the Project's facts + open questions, run web/tool research and append
   findings as Notes with citations.
8. **Meeting prep** — for a calendar event linked to the Project, assemble recent threads + open tasks +
   involved contacts into a prep note.
9. **Digest / status report** — periodic "what changed, blockers, next steps" digest for the Project.
10. **Question tracking** — surface open questions from threads; track answered vs unanswered.
11. **Timeline** — chronological view of Project events (emails, meetings, docs, task completions).
12. **Relationship graph** — who is involved, org affiliations, interaction cadence.
13. **Task delegation** — assign tasks to contacts; track status; roll up to Project status.
14. **Notes & decisions** — freeform documents; promote decisions to a first-class decision log.
15. **Collection curation** — attach Sketches, Sheets, Tables, files as Project artifacts.
16. **Cross-project linking** — dependencies, sub-projects, "related to".
17. **Auto-attach triggers** — new mail matching a Project's participants/keywords auto-attaches + notifies.
18. **Scoped search** — query facts/threads/notes/tasks within a single Project's context.
19. **Project-scoped agent chat** — an assistant working set bounded to the Project.
20. **Handoff / onboarding doc** — auto-generate a "current state" brief from Project data.
21. **Milestone / deadline tracking** — dates from tasks/events → reminders.
22. **Templates** — instantiate a Project from a template (preset task list, note stubs, pipelines).

## 3. Navtree structure

A space-level **Projects** root (the virtual app-graph node from the current refactor), a node per
Project, and per-Project **facet** child nodes. The Project object itself opens a **dashboard** article
(summary + counts + recent activity); facets open their own articles and/or companions.

```
<Space>
└─ Projects                      (virtual root; lists all Project objects in the space)
   ├─ <Project: "Acme renewal">  (object → dashboard article; master/detail)
   │  ├─ Threads                 (attached conversations; opens MessageStack)
   │  ├─ Tasks                   (Outliner task list)
   │  ├─ Notes                   (documents)
   │  ├─ Contacts                (Person/Organization refs)
   │  ├─ Research / Facts        (Project-scoped FactStore + research notes)
   │  ├─ Collections             (Sketch / Sheet / Table / File)
   │  └─ Agent                   (Project-scoped assistant chat)
   └─ <Project: "Q3 planning">
      └─ …
```

- **Dashboard vs facets** — the Project node's article is a dashboard; facet child nodes give direct nav.
  In simple/multi layout, facets open as companions of the dashboard (reuse the `linkedSegment` companion
  pattern already used for the Topic detail).
- **Cross-surfacing** — Threads/Contacts/Collections are refs to objects owned by other plugins
  (inbox/CRM/sketch/sheet); the Project facet nodes are _views_ over those refs, not new object stores.
- **Suggestions stay in inbox** — mailbox-scoped topic suggestions + Analyze remain an inbox concern
  (decided in the current refactor); accepting a suggestion creates/links a Project.

## 4. Near-term roadmap

- **Phase 0 — Topic relocation (in progress).** `Topic` → `@dxos/types` (Project-style class); UI in
  plugin-brain; space-level Topics root + per-Topic child nodes + regular object/article. (`6f904da7d3`,
  `2b92f80605`; 2B/2C pending.)
- **Phase 1 — Reconcile the type.** Land the `Project` nexus schema in `@dxos/types`: promote string
  arrays to Refs/Relations (threads, contacts, tasks→Outline, notes, collections), add `status`. Decide
  `Topic`→`Project` rename vs. `Topic` as an alias (reconcile the two DXNs / field shapes). Migration for
  existing `Topic` data.
- **Phase 2 — Navtree + dashboard.** Projects root, per-Project facet nodes, Project dashboard article,
  companion wiring.
- **Phase 3 — Pipeline landing.** `AnalyzeProject` operation: `pipeline-email` summarize scoped to the
  Project's threads; `pipeline-rdf` facts scoped to the Project; entity extraction → Contacts. Write
  results back onto the Project. (Generalize the existing `AnalyzeTopics`.)
- **Phase 4 — Containment.** Wire the Outliner task list, Notes (documents), and Collections facets.
- **Phase 5 — Agent + research.** Project-scoped assistant chat; research agent appending cited notes.
- **Phase 6 — Automation.** Auto-attach triggers, digests, templates, milestones.

### Open questions

1. `Topic` vs `Project` — rename (one type, migrate the existing `topic` DXN) or keep `Topic` as an
   inbox-facing subtype of a general `Project`? Affects the existing `@dxos/types` `Project` consumers
   (plugin-linear/github `materialize-target`).
2. Threads as Refs — do we need a first-class `Thread` object (vs. the current derived `threadId`
   grouping) before Projects can hold thread Refs?
3. FactStore scoping — per-Project fact store vs. a space store filtered by Project — affects research.
4. Ownership — does `Project` live in plugin-brain (analysis) or a dedicated projects plugin, given it
   spans inbox/CRM/outliner/sketch?
