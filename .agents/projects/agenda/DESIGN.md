# Agenda — Design

_Status: design only. No implementation, no PR._

## 1. Premise

`Journal` (`plugin-outliner`) is a **backward-facing** spine: one date-keyed
outline per day, recording what happened. It is authored by hand (or appended to
by the sidekick agent) and read retrospectively.

**Agenda is the same shape pointed the other way.** A date-keyed outline per
period, recording what is _coming_ — commitments, prep, intentions — at three
horizons (day / week / month). The difference that matters is authorship: a
journal entry is written by the user, whereas an agenda entry is **drafted by an
assistant agent** that aggregates signals already present in the space, and then
edited by the user.

The two are complements on one calendar spine: `Agenda[2026-07-29]` is the plan,
`Journal[2026-07-29]` is the record, and the gap between them is the material for
the weekly review.

### Non-goals

- Not a task manager. `Plan` (`@dxos/assistant-toolkit`) already models
  hierarchical tasks; Agenda **references** plans, it does not replace them.
- Not a calendar. `Calendar` (`plugin-inbox`) owns events; Agenda reads them.
- Not a second inbox. Agenda summarises what the mailbox implies about your week;
  it does not triage mail.

## 2. Prior art in-repo

| Piece                | Location                                              | What we take                                                    |
| -------------------- | ----------------------------------------------------- | --------------------------------------------------------------- |
| `Journal` / `JournalEntry` | `plugin-outliner/src/types/Journal.ts`          | Record of `Ref<Entry>` keyed by sortable date string; `addBullet`, `getOrCreateEntry`, `getEntries(range)`. |
| `Journal` component  | `plugin-outliner/src/components/Journal/Journal.tsx`  | Scrolling column of per-date `Outline.Root` blocks; today affordance. |
| `JournalArticle`     | `plugin-outliner/src/containers/JournalArticle`        | `Panel` + toolbar + optional `Calendar.Grid` side rail.          |
| `QuickJournalEntry`  | `plugin-outliner/src/operations/quick-entry.ts`        | Root-level graph action → dialog → append a bullet to today.     |
| `Sidekick` skill     | `plugin-sidekick/src/skills/sidekick-skill.ts`         | Prompt-only companion skill; already claims "day-ahead summary". |
| `planning` / `alarm` skills | `assistant-toolkit/src/skills/{planning,alarm}` | Canonical `Skill.make` shape, `agentCanEnable`, end-request hooks. |
| `Routine` + `Trigger` | `@dxos/compute` `src/types/{Routine,Trigger}.ts`     | Timer (cron) triggers to run the agent on a cadence.             |
| `Calendar`           | `plugin-inbox/src/types/Calendar.ts`                   | Feed-backed events, the strongest day-ahead signal.              |

`plugin-sidekick` overlaps: it maintains profiles + a journal and promises a
"day-ahead summary on the dashboard" that has no implementation. Agenda is that
promise, extracted into a first-class object with its own skill. **Decision owed
(§7 D1): does Agenda absorb sidekick's journal responsibility, or sit beside it?**

## 3. Data model

New package `plugin-agenda`, types under `src/types/Agenda.ts`.

### Period keys

One key grammar across all three horizons, sortable as strings and unambiguous
about which horizon a key belongs to:

| Horizon | Key form   | Example     |
| ------- | ---------- | ----------- |
| day     | `YYYY-MM-DD` | `2026-07-29` |
| week    | `YYYY-Www`   | `2026-W31`   |
| month   | `YYYY-MM`    | `2026-07`    |

The horizon is derivable from the key shape, so a single `entries` record holds
all three — matching `Journal.entries` exactly rather than inventing three
parallel maps. `date-fns` (already a dependency of `plugin-outliner`) supplies
`format`/`parseISO` and ISO week numbering.

```ts
export const Horizon = Schema.Literal('day', 'week', 'month');

export class AgendaEntry extends Type.makeObject<AgendaEntry>(
  DXN.make('org.dxos.type.agendaEntry', '0.1.0'),
)(
  Schema.Struct({
    id: Schema.String,
    /** Period key; horizon is derivable from its shape. */
    period: Schema.String,
    horizon: Horizon,
    /** The outline the user reads and edits. Markdown checkbox bullets, same as a journal entry. */
    content: Ref.Ref(Text.Text),
    /** Agent's latest proposal, pending acceptance. See D2. */
    draft: Schema.optional(Ref.Ref(Text.Text)),
    /** When the agent last drafted; absent for a hand-authored entry. */
    generated: Schema.optional(Schema.String),
    /** Signals the draft was derived from, so the outline is traceable back to its evidence. */
    signals: Schema.optional(Schema.Array(Signal)),
  }).pipe(HiddenAnnotation.set(true)),
) {}

export class Agenda extends Type.makeObject<Agenda>(DXN.make('org.dxos.type.agenda', '0.1.0'))(
  Schema.Struct({
    id: Schema.String,
    name: Schema.optional(Schema.String),
    entries: Schema.Record({ key: Schema.String, value: Ref.Ref(AgendaEntry) }),
    /** Objects the agent may read as signal sources (calendars, mailboxes, projects, journals). */
    sources: Schema.optional(Schema.Array(Ref.Ref(Type.Expando))),
  }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--calendar-star--regular', hue: 'amber' }),
    CollectionItemAnnotation.set(true),
  ),
) {}
```

`Journal.entries` carries a standing `TODO(burdon)` to become a map of refs
indexed by sortable ISO date — Agenda is built that way from the start, and
whichever shape lands should land in both.

### Signal

A normalised, source-agnostic record. This is the contract between signal
producers and the drafting agent:

```ts
export const Signal = Schema.Struct({
  /** Producing source id, e.g. `org.dxos.plugin.inbox.calendar`. */
  source: Schema.String,
  kind: Schema.Literal('event', 'commitment', 'deadline', 'task', 'thread', 'carryover', 'run'),
  /** When it lands (ISO). Absent for undated backlog signals. */
  at: Schema.optional(Schema.String),
  title: Schema.String,
  /** The object it came from, so the outline can link back. */
  subject: Schema.optional(Ref.Ref(Type.Expando)),
  /** 0..1, source-relative; the agent ranks across sources, it does not trust this absolutely. */
  weight: Schema.optional(Schema.Number),
});
```

## 4. Signal aggregation

The agenda plugin must **not** depend on every plugin that has something to say
about your week. Instead it declares a capability that others contribute to:

```ts
// AgendaCapabilities.SignalSource
export type SignalSource = {
  id: string;
  /** Horizons this source is useful at; a calendar is not useful monthly. */
  horizons: readonly Horizon[];
  collect: (window: { from: Date; to: Date }) => Effect.Effect<readonly Signal[], ...>;
};
```

Contributors and what each yields:

| Source                  | Plugin             | Signals                                                     |
| ----------------------- | ------------------ | ------------------------------------------------------------ |
| `…inbox.calendar`       | `plugin-inbox`     | `event` per `Calendar` feed item in the window.               |
| `…inbox.mailbox`        | `plugin-inbox`     | `thread` for unanswered threads; `commitment` for promises the agent extracts from sent mail. |
| `…outliner.journal`     | `plugin-outliner`  | `carryover` per unchecked `- [ ]` bullet in the preceding period. |
| `…assistant.plan`       | `plugin-assistant` | `task` per open `Plan` task.                                  |
| `…projects.project`     | `plugin-projects`  | `task`/`run` from project routines and artifacts.             |
| `…routine.trigger`      | `plugin-routine`   | `run` per timer `Trigger` firing inside the window.           |
| `…agenda.parent`        | `plugin-agenda`    | `task` per item in the enclosing week/month outline (see §5).  |

Only the last is in-package; the rest ship as small contributions in their own
plugins, so a space without `plugin-inbox` simply produces fewer signals rather
than failing.

## 5. Horizon nesting

Outlines cascade downward and reconcile upward.

- **Month → week.** Drafting a week seeds it from the month's outline: each
  monthly objective becomes a `task` signal for the weeks it spans.
- **Week → day.** Same relation one level down: weekly commitments plus that
  day's calendar produce the daily outline.
- **Day → day (carry-forward).** Unchecked bullets in yesterday's entry arrive as
  `carryover` signals in today's draft, marked so the user can see what slipped.
- **Agenda → Journal (reconcile).** After a period closes, `Reconcile` diffs the
  agenda entry against the same-keyed journal entry: planned-and-done,
  planned-and-not-done, done-but-unplanned. That diff is the input to the weekly
  and monthly drafts, which is what makes the outlines improve over time rather
  than restate the calendar.

## 6. Skill

`org.dxos.skill.agenda`, following `assistant-toolkit`'s structure
(`skills/agenda/{index.ts,skill.ts,operations/}`). It lives in `plugin-agenda`
rather than `assistant-toolkit` because it depends on the plugin's capability
registry for signal sources.

### Operations (tools)

| Operation         | Input                              | Effect                                                            |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------ |
| `CollectSignals`  | `{ horizon, period }`              | Fans out over registered `SignalSource`s for the period's window.  |
| `DraftOutline`    | `{ horizon, period }`              | Writes `draft` (or `content` on an untouched entry) + `signals`.    |
| `GetOutline`      | `{ horizon, period }`              | Reads an entry's markdown for the agent to reason over.             |
| `AddItem`         | `{ period, text }`                 | Appends a checkbox bullet — the Journal `addBullet` analogue.       |
| `CarryForward`    | `{ from, to }`                     | Moves unchecked bullets between day entries.                        |
| `Reconcile`       | `{ period }`                       | Diffs the agenda entry against the journal entry for the same key.  |

### Instructions (shape, not final text)

The prompt is where the horizons get their character; the operations are
deliberately dumb.

- **Day** — time-ordered, anchored on calendar events, with prep items attached
  to the thing they prepare for; at most three "must", the rest under "if time".
  Carried-over items are marked as such, never silently re-listed.
- **Week** — themes and outcomes, not a flattened list of days. Names the
  commitments made to other people and the one thing that would make the week a
  success.
- **Month** — objectives and review. Opens with the previous month's `Reconcile`
  diff so the draft is grounded in what actually happened.
- **Always** — cite the signal behind each item (`subject` ref); never invent a
  commitment that no signal supports; leave the user's own bullets untouched.

### Cadence

A `Routine` per horizon with a timer `Trigger` (`plugin-routine`), created by an
`Agenda.EnableDrafting` operation rather than by hand:

| Horizon | Default cron    | Rationale                                     |
| ------- | --------------- | ---------------------------------------------- |
| day     | `0 6 * * *`     | Before the day starts, after overnight mail.   |
| week    | `0 17 * * 0`    | Sunday evening, ahead of the week.             |
| month   | `0 17 L * *`    | Last day of the month, paired with a review.   |

All three are user-editable and off by default — an agenda that drafts itself
without being asked is the failure mode to avoid.

## 7. Open decisions

Numbered so they can be answered by number.

**D1. Relationship to `plugin-sidekick`.**

1. Agenda is a standalone plugin; sidekick keeps its journal duty and gains the
   agenda skill. (Least disruption; two agents can both write to your days.)
2. Agenda absorbs sidekick's journal/day-ahead responsibility; sidekick's skill
   text is trimmed to profiles + communications.
3. Agenda ships _inside_ `plugin-outliner` next to Journal, and the skill lives
   in `assistant-toolkit`. (Fewest packages; couples the outliner to signals.)

**D2. Agent/human write conflict — the central product question.**

1. **Draft-and-accept.** Agent always writes `draft`; the UI shows it beside
   `content` with accept/merge. Safest, most UI.
2. **Write-until-touched.** Agent writes `content` directly while the entry is
   untouched; once the user edits, it falls back to `draft`. Least friction on the
   common path, needs a reliable "touched" signal.
3. **Sectioned.** One body; agent owns a fenced `<!-- agenda:generated -->`
   region and rewrites only that, user owns everything else. No second Text
   object, but merge behaviour is subtle under CRDT concurrency.

**D3. Entry granularity.** One `AgendaEntry` per period key (proposed), versus one
per horizon with an internal per-period section. The former reuses Journal's
model exactly; the latter makes a whole month readable as one document.

**D4. Signal persistence.** Store the `signals` array on the entry (proposed —
traceable, but duplicates data and grows the object), or recompute on demand and
keep only the refs actually cited in the outline.

**D5. Where `SignalSource` lives.** In `plugin-agenda` (contributors depend on
agenda) versus in `app-toolkit` (agenda depends on nobody). The latter is more
correct and more invasive.

## 8. Risks

- **Slop.** A daily outline that restates the calendar is worse than nothing.
  The `Reconcile` loop is the mitigation and should ship with the first draft
  path, not after it.
- **Cost.** Three cadences × per-space is a standing token spend. Off by default;
  day-only to start.
- **CRDT churn.** `Journal.entries` already carries a `TODO(burdon)` about merging
  entries with the same date; a agent rewriting entries on a timer will hit it
  harder. Resolve the record-of-refs question before enabling drafting.
- **Privacy.** The agent reads mail and calendar to draft. Source opt-in is
  per-object via `Agenda.sources`, never "everything in the space".
