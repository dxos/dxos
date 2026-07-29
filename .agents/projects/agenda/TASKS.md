# Agenda — Tasks

_Resume: get answers to D1–D5 in DESIGN.md §7; nothing is implementable until D1 and D2 are settled. Uncommitted: none. Last: design doc authored (no code, no PR)._

## Phase 0: Design

Establish what Agenda is and how it differs from Journal, and settle the
decisions that gate any code. See `DESIGN.md`.

### Tasks

- [x] **Survey prior art** — Journal types/components/containers, `QuickJournalEntry`, sidekick skill, `planning`/`alarm` skill shape, `Routine`/`Trigger`, `Calendar`.
- [x] **Draft the data model** — period-key grammar across day/week/month, `Agenda`/`AgendaEntry`, `Signal`.
- [x] **Draft signal aggregation** — `SignalSource` capability + the contributor table.
- [x] **Draft the skill** — operations, instruction shape per horizon, cadence defaults.
- [ ] **Resolve D1** — relationship to `plugin-sidekick`. Blocks package layout.
- [ ] **Resolve D2** — agent/human write conflict. Blocks both the schema and the article UI.
- [ ] **Resolve D3–D5** — entry granularity, signal persistence, `SignalSource` home.
- [ ] **Walk the design past a real week** — take the user's actual last week (calendar + mailbox + journal) and hand-write the three outlines the agent would have produced. If the hand-written version is not obviously worth reading, the design is wrong before any code exists.

## Phase 1: Object + UI (no agent)

Agenda as a hand-authored forward journal. Proves the shape is worth reading
before any generation is wired up.

### Tasks

- [ ] **Scaffold `plugin-agenda`** — `private: true`, `workspace:*` deps, `moon.yml` mirroring `plugin-outliner`'s tags.
- [ ] **`types/Agenda.ts`** — `Agenda`, `AgendaEntry`, `Horizon`, period-key helpers (`periodKey`, `parsePeriodKey`, `windowFor`), `make`/`makeEntry`/`getOrCreateEntry`/`addBullet` mirroring `Journal.ts`.
- [ ] **Period-key unit tests** — DST boundaries, ISO week rollover at year end (`2026-W53`), month lengths.
- [ ] **`components/Agenda`** — horizon-scoped column of `Outline.Root` blocks, reusing `plugin-outliner`'s `Outline`; today/this-week affordance.
- [ ] **`containers/AgendaArticle`** — `Panel` + toolbar horizon toggle (day/week/month) + optional `Calendar.Grid` rail, following `JournalArticle`.
- [ ] **Graph + create-object + translations** — navtree node, create action, i18n keys.
- [ ] **Storybook** — one story per horizon with fixture entries.
- [ ] **`QuickAgendaItem` operation** — root-level action + dialog, the forward-facing twin of `QuickJournalEntry`.

## Phase 2: Signals

Aggregation without generation — the collected signals must be inspectable on
their own, otherwise a bad outline is undebuggable.

### Tasks

- [ ] **`SignalSource` capability** — type, registry, fan-out helper with per-source failure isolation.
- [ ] **In-package sources** — `agenda.parent` (enclosing horizon) and `outliner.journal` (carry-over of unchecked bullets).
- [ ] **`plugin-inbox` sources** — calendar events, unanswered threads.
- [ ] **`plugin-assistant` / `plugin-projects` / `plugin-routine` sources** — open plan tasks, project state, upcoming trigger firings.
- [ ] **Signals debug view** — a companion panel listing the raw signals for a period, grouped by source.

## Phase 3: Skill

### Tasks

- [ ] **`skills/agenda/operations`** — `CollectSignals`, `DraftOutline`, `GetOutline`, `AddItem`, `CarryForward`, `Reconcile` (definitions + handlers, per the `operations` skill).
- [ ] **`skills/agenda/skill.ts`** — `Skill.make`, `agentCanEnable`, per-horizon instructions.
- [ ] **`capabilities/skill-definition`** — contribute to `AppCapabilities.SkillDefinition`; register in `composer-app/src/plugin-defs.tsx`.
- [ ] **Tests** — deterministic operation tests over fixture signals (no memoized LLM), per `ai-testing-strategy`'s D-tier.
- [ ] **Eval** — a scored `assistant-evals` eval: given a fixture week of signals, does the draft cite every commitment and invent none?

## Phase 4: Cadence + reconcile

### Tasks

- [ ] **`EnableDrafting` operation** — creates the per-horizon `Routine` + timer `Trigger`, off by default, cron user-editable.
- [ ] **`Reconcile`** — agenda-vs-journal diff for a closed period; feed it into the next week/month draft.
- [ ] **Settings** — per-horizon enable, cron override, source opt-in list (`Agenda.sources`).
- [ ] **Changeset** — consumer-relevant; name the new plugin package.

## References

- `DESIGN.md` — model, signal contract, horizon nesting, open decisions D1–D5.
- `packages/plugins/plugin-outliner/src/types/Journal.ts` — the shape being mirrored.
- `packages/plugins/plugin-sidekick/src/skills/sidekick-skill.ts` — the overlapping companion agent (see D1).
- `packages/core/compute/assistant-toolkit/src/skills/{planning,alarm}` — skill structure reference.
- `packages/core/compute/compute/src/types/{Routine,Trigger}.ts` — cadence primitives.
- `packages/plugins/plugin-inbox/src/types/Calendar.ts` — primary day-ahead signal.
