# Refactor

We have a complex refactor of `react-ui-mosaic` and `plugin-inbox`.
Think deeply about the problem and ask clarifying questions.
Use this document to plan and track the refactor.

## Phase 1 (Stack)

MessageStack tracks the current (aria-current) focused item via MessageStackContextValue.
It contains some complex logic to detect and track the current focus and restore it when the virtual stack scrolls the item back into view.

- [x] Remove `MessageStackContextValue` and instead track the `currentItem` in `Mosaic.Container`'s context.
- [x] Remove the custom focus management, `useLayoutEffect`, and `onChange` callback in `MessageStack`.
- [x] `useMosaicContainerContext` should expose `setCurrent` to allow Tiles to set the current item (e.g., if clicked).
- [x] `Mosaic.Tile` should be passed a boolean, `current` if it is the current item.
- [x] `MessageTile` should use `setCurrent` to set the current item when clicked (via `Focus.Item`'s callback).

## Phase 2 (Calendar)

In `plugin-inbox` `MessageStack` uses `Mosaic.VirtualStack`;

- [x] `EventStack` should follow the same structure and `EventComponent` should become `EventTile` simlilar to `MessageTile`
- [x] `EventArticle` should similarly track the currentItem via `useSelected`.

## Phase 3 (Focus)

We have multiple ways to visually represent focused/current/selected items, including:

1. Specific focus styles: `focusRingStyles` in `Focus.tsx` (react-ui)
2. Custom fragments: `fragments/focus.ts` (ui-theme)
3. Tailwind component classes: `selected.css` (ui-theme)
4. Tailwind classes in `focus-ring.css` (ui-theme)

### 3a. Create `ui-theme/src/theme/components/focus.ts`

Move `focusRingStyles` from `Focus.tsx` into a theme component, following the same pattern as `card.ts`, `list.ts`, etc.

`Focus.tsx` currently defines styles inline via `mx()`:

```typescript
const focusRingStyles = (border: boolean) =>
  mx(
    'relative outline-hidden',
    border && 'border border-separator',
    'after:content-[""] after:absolute after:inset-0 after:rounded-[inherit] after:pointer-events-none after:ring after:ring-inset after:ring-transparent',
    'focus:after:ring-neutral-focus-indicator',
    'data-[focus-state=active]:after:ring-neutral-focus-indicator',
    'data-[focus-state=error]:after:ring-rose-500',
  );
```

This should become a `focusTheme` in `ui-theme/src/theme/components/focus.ts` with:

- `focus.group` — styles for `Focus.Group`.
- `focus.item` — styles for `Focus.Item`.

Both currently use the same `focusRingStyles(border)` call, so initially they can share.

`Focus.tsx` would then import `focusTheme` and use `tx('focus.group', { border }, className)` / `tx('focus.item', { border }, className)` like other themed components.

- [x] Create `ui-theme/src/theme/components/focus.ts` with `FocusStyleProps` and `focusTheme`.
- [x] Export from `ui-theme/src/theme/components/index.ts`.
- [x] Register in the theme (`ui-theme/src/theme/theme.ts`).
- [x] Update `Focus.tsx` to use `tx('focus.group', ...)` and `tx('focus.item', ...)` instead of `focusRingStyles`.
- [x] Remove `focusRingStyles` from `Focus.tsx`.

### 3b. Delete `fragments/focus.ts`

`fragments/focus.ts` exports three string constants:

- `focusRing = 'dx-focus-ring'` — used in 5 internal theme components + 2 external files.
- `subduedFocus` — used in 2 internal theme components (`input.ts`, `menu.ts`).
- `staticFocusRing` — used only in `input.ts`.

Replace all usages with CSS class references.

- [x] Replace `focusRing` usages with `'dx-focus-ring'` in: `link.ts`, `list.ts`, `popover.ts`, `toast.ts`, `react-ui-thread/Message.tsx`, `shell/InvitationListItem.tsx`.
- [x] Create `.dx-focus-subdued` class in `focus.css` equivalent to `subduedFocus` value; use in `input.ts` and `menu.ts`.
- [x] Create `.dx-focus-static` class in `focus.css` equivalent to `staticFocusRing` value; use in `input.ts`.
- [x] Delete `fragments/focus.ts`.
- [x] Remove `focus` re-export from `fragments/index.ts`.
- [x] Rename `focus-ring.css` to `focus.css`.

### 3c. Use-case taxonomy (recommendations)

Four distinct visual states, each with a clear mechanism:

| State              | Attribute/Mechanism    | CSS Class                        | When                                                            |
| ------------------ | ---------------------- | -------------------------------- | --------------------------------------------------------------- |
| **Keyboard focus** | `:focus-visible`       | `dx-focus-ring` (focus-ring.css) | Element receives keyboard focus.                                |
| **Current/active** | `aria-current="true"`  | `dx-current` (selected.css)      | Item is the active item in a navigable list (e.g., arrow keys). |
| **Selected**       | `aria-selected="true"` | `dx-selected` (selected.css)     | Item is part of a multi-selection.                              |
| **Hover**          | `:hover`               | `dx-hover` (selected.css)        | Mouse hover.                                                    |

Recommendations:

- These four states are orthogonal and should remain separate CSS classes.
- `dx-focus-ring` handles keyboard focus via `:focus-visible` — well-established, 106 usages, no change needed.
- `dx-current` handles current/active via `aria-current` — set by `Focus.Item`, styled in `selected.css`.
- `dx-selected` handles multi-selection via `aria-selected` — styled in `selected.css`.
- `dx-hover` handles mouse hover — styled in `selected.css`.
- The `::after` pseudo-element ring in `Focus.Group`/`Focus.Item` (from `focusRingStyles`) is a **separate concern** from `dx-focus-ring`. It provides a container-level focus indicator for grouped navigation. After Phase 3a, this will live in `focus.ts` theme component.
- `focus-ring.css` should remain the single source for element-level keyboard focus rings.
- `selected.css` should remain the single source for state-driven visual feedback (current, selected, hover).

## Phase 4

- [ ] In `CalendarArticle` when clicking on a date in the `NaturalCalendar.Grid` we should scroll into view the first event that matches that date in `EventStack`

## Phase 5 (Selection)

- [ ] Review remaining ui-theme fragments.
- [ ] Review `useSelected` and `AttentionOperation.Select` (currently conflates active and selected).

---

# Mailbox pipelines → product

_Added 2026-08-12. The sections above are the mosaic/focus refactor; this is a separate workstream._

## Where we are

Six pipelines exist as operations, each cursored/idempotent, unit-tested, and driveable from the
`MailboxAnalyze` storybook workbench — but **none is reachable by a user**:

| operation                   | cost          | what it does                                                             |
| --------------------------- | ------------- | ------------------------------------------------------------------------ |
| `ExtractCorrespondents`     | deterministic | Person (+ Organization) per sender the user has sent or replied to       |
| `ExtractSubscriptions`      | deterministic | unsubscribe affordances → `mailbox.subscriptions`                        |
| `ClassifyMailbox`           | cheap LLM     | spam verdict + category tags; known-Person senders never reach the model |
| `AnalyzeMailbox`            | LLM           | RDF facts per message                                                    |
| `CrmOperation.EnrichImages` | network       | avatars/logos                                                            |
| `EnrichMailbox`             | —             | **orchestrator**: spawns the above in cascade order                      |

Storage for derived text is settled: an **annotations feed** on the Mailbox (`Mailbox.annotations`),
holding immutable `Message`s whose `parentMessage` names the subject and whose text block carries
`disposition: 'summary'` and `mimeType: 'text/markdown'` (generated summaries may carry inline
emphasis or links, and the text-block renderers select the markdown view over the plaintext one).
`Mailbox.mergeAnnotations` merges the two feeds on read; a re-derived summary appends and supersedes
rather than overwriting. See `Mailbox.test.ts` → "Mailbox annotations".

## Deliverable 1 — trigger the cascade from the mailbox

The user syncs a mailbox, then runs enrichment manually (automation comes later, via a routine).

- [x] `app-graph-builder.ts`: an **Enrich** action on the Mailbox alongside the existing
      Process/Stop toggle — `Operation.schedule(EnrichMailbox)` so the run is a cancellable process,
      Stop wired to `ProgressRegistry.cancel(createEnrichProgressKey(mailbox))`.
- [x] `MailboxArticle` statusbar: surface `#enrich` alongside `#sync` / `#process`.
- [x] Routine template `org.dxos.routine.enrichMailbox` (disabled timer trigger, runnable =
      `EnrichMailbox`), mirroring `org.dxos.routine.processMailbox`, so the same cascade can later
      run unattended.
- [ ] Live verification against a synced mailbox: meter appears, Stop mid-cascade leaves committed
      cursors intact, re-run resumes.

**Resolved — the `me` input.** `Mailbox.identityAddresses` reads the mailbox name, which the
connectors seed from the connection's `accessToken.account`, so a synced mailbox names its own
account. Anything else yields none and the cascade reports the correspondent stage as `skipped`
rather than deriving against a wrong identity (which would invert every sent/received judgement).
Still worth adding: HALO profile emails as a second source for mailboxes named by hand.

## Deliverable 2 — show summaries in the message article

- [x] `SummarizeMailbox` operation (tier 2): per-thread summary over **contact mail only** (gated on
      a Person existing for the sender), writing `makeSummary` annotations to the annotations feed.
      Budgeted per run like `ClassifyMailbox`; cursored on its own tag.
- [x] Container-resolved summary index (`Mailbox.summaryIndex`) queried from the annotation feed in
      `MessageArticle` and threaded through `ConversationStack` context (components hold no capability
      hooks, so the container resolves it).
- [x] `ConversationStack` renders the newest summary: in place of the provider snippet when
      collapsed, and as a distinct block above the body when expanded.
- [ ] Show provenance (model, date) on the expanded summary block — currently the annotation carries
      it (`properties.model`) but the UI does not surface it.
- [ ] Empty/stale states: no summary is the common case — the affordance must not imply failure.

## Deliverable 3 — create a project from a message, with a chosen pipeline

`CreateTrackingProject` already does this for one shape (track a sender's domain → tasks). Generalize
it into a user-chosen pipeline.

- [x] Extend the operation with `scope` (`sender` | `domain`) and `pipeline`
      (`tasks` | `summaries` | `contacts`), selecting which operation the scaffolded routine binds
      as its runnable and with which inputs (`PIPELINES` registry in `create-tracking-project.ts`).
      A free-mail domain degrades `domain` scope to the individual — it identifies no organization.
- [ ] Message-context action **Create project…** opening a schema-driven form (name prefilled from
      the sender/subject, scope, pipeline, schedule: manual | on new mail).
- [ ] Keep artifact ownership as-is: tasks upserted by message-keyed foreign key (user edits survive
      re-runs), documents regenerated wholesale.
- [ ] The mailbox-global defaults stay available; the project supplies overrides (decision below).

## How we develop pipelines and projects

Three layers, each answering a **different question**. They are not maturity stages: a pipeline can
pass every unit test and still be broken in the workbench, and can work in the workbench yet be
unusable as a product feature.

| layer               | question it answers                     | what it catches                                                | cost                     |
| ------------------- | --------------------------------------- | -------------------------------------------------------------- | ------------------------ |
| node unit tests     | Is the logic right?                     | idempotency, cursor semantics, gates, ordering, degradation    | seconds; always in CI    |
| storybook workbench | Does it run in a real runtime?          | service wiring, progress/cancel, ECHO writes, layer collisions | ~1 min; play tests in CI |
| product feature     | Can a user reach it and use the result? | discoverability, granularity, scheduling, artifact ownership   | manual + e2e             |

Each layer earned its place empirically:

- **Unit** found every logic defect that mattered: `AnalyzeMailbox` adopting another consumer's feed
  cursor, the fact pipeline's order dependence (newest-first feed advanced the cursor past
  everything), NaN timestamps poisoning a cursor. All are regression-tested.
- **Workbench** found everything the unit layer structurally cannot: an `AiService` LayerSpec
  collision (installing `AssistantPlugin` displaced the story's AI service and broke trip
  extraction), unregistered surfaces, the invoker's first-invocation wedge, index-query timeouts
  during an import backlog, and messages without `threadId` never rendering.
- **Product** is the layer this plan exists to close: the pipelines were complete, green and
  invisible.

### The loop for a new pipeline

1. **Pure core first.** Put the decisions in pure functions (`deriveCorrespondents`,
   `mergeAnnotations`, `parseClassification`) and keep the Effect handler thin. The pure core is what
   a unit test can pin without a database, and what survives refactors of the runtime around it.
2. **Node test**: idempotency, the gate, and failure degradation. LLM stages record a **model
   fixture** (committed under `.store/conversations`) so CI replays them offline with no key.
3. **Workbench action** in `MailboxAnalyze`, plus a play test whenever the pipeline has cursor
   semantics (run → re-run is a no-op → reset → re-run).
4. **Product affordance last** — menu action, article surface, or project routine.
5. **Update `AUDIT.md`** at each step; it is the index that keeps the test surface legible.

### The fixture ladder — use the cheapest rung that proves the point

| rung           | contents                                                   | used by                 |
| -------------- | ---------------------------------------------------------- | ----------------------- |
| demo seed      | 4 in-repo messages                                         | play tests, CI          |
| canned-AI seed | trip fixture with scripted payloads                        | deterministic LLM paths |
| model fixtures | recorded real turns, replayed offline                      | LLM unit tests in CI    |
| real corpus    | 391 messages, git-ignored, PII                             | local development only  |
| live LLM       | double-gated env (`DX_ANTHROPIC_API_KEY` + an opt-in flag) | costed runs, never CI   |

### Pipelines vs projects — the dividing line

- A **pipeline is a capability**: mailbox-global, parameterized, policy-free. It must never hard-code
  which senders, domains or artifacts matter.
- A **project is a policy** over pipelines: which scope, which artifacts, how often. It supplies the
  parameters by binding an operation as a routine runnable with fixed inputs.
- **Corollary**: when a pipeline needs a judgment call ("is this an investor?", "is this a request?"),
  that parameter belongs in the project. Decided: **mailbox-global defaults plus project overrides**.
- Cost class maps onto CI policy: deterministic tiers run in CI unconditionally, cheap-LLM tiers run
  from fixtures, expensive tiers never run in CI.

### Model policy

Three cost tiers now want three different models, so per-stage routing should stop being ad hoc:
`resolveModel(stageId)` (`@dxos/pipeline-email`) already exists — seed it from the model-ladder
findings and let a run override it. Note the measured inversion: **labeling is where open weights
fail** (best open model scored 0.70 against haiku's 1.00), while drafts and message summaries are
where they are competitive. So the cheap-volume tier wants a cheap _hosted_ model, not a local one.

## Known gaps carried into this work

- **Single-flight per mailbox.** Nothing serializes a routine-triggered run against a manual one; the
  cascade makes this more visible because a later tier consumes an earlier one's output.
- **Watermark enforcement.** Ordering holds by construction inside `EnrichMailbox`, but nothing stops
  a directly-invoked `ClassifyMailbox` from running ahead of contact extraction.
- **Invoker first-invocation wedge** (dev storybook): the first invocation after a server restart can
  hang, and results occasionally marshal as `{}` even when the operation completes.
