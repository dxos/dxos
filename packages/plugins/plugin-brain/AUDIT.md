# Topic → Project refactor — usage audit

_2026-07-14. Inventory of every current `Topic` usage ahead of moving the type to `@dxos/types`
(Project-style class), moving the UI to `plugin-brain`, and giving Topics their own app-graph subtree._

> Scope note: the asks named "Project", but the object being refactored is today's `Topic`. This audit
> covers **`Topic`** usages (the migration target) and references the existing `@dxos/types` `Project`
> as the **model** to converge on (and the eventual rename target). Existing `Project` consumers are
> listed last so the rename's separate blast radius is visible.

## 1. The type today

- **Definition:** [`packages/core/compute/pipeline-email/src/types/Topic.ts`](../../core/compute/pipeline-email/src/types/Topic.ts)
  - `Topic` is already a class: `class Topic extends Type.makeObject<Topic>(DXN.make('org.dxos.type.topic', '0.1.0'))(TopicProps) {}`.
  - **`TopicProps`** — an exported `Schema.Struct` (`label, summary, threadIds[], participants[],
    keywords[], questions[], tasks[]`) — is **shared**: `Topic` is built from it AND
    `Mailbox.topicSuggestions` is `Schema.optional(Schema.Array(TopicProps))`. The comment states the
    intent: promotion is `Obj.make(Topic, suggestion)` with no field mapping.
  - Exported from the package index (`@dxos/pipeline-email`): `Topic`, `TopicProps` (+ `deriveThreadId`,
    `normalizeSubject`).
- **Registration:** `InboxPlugin.tsx` adds `Topic` to the client type set (`addTypes`).
- **Gap vs the target model** (`@dxos/types` `Project`, [`Project.ts`](../../sdk/types/src/types/Project.ts)):
  Project inlines its `Schema.Struct` in the class with `LabelAnnotation`, `IconAnnotation`, a `title`
  annotation, and ships a `make` factory. `Topic` has none of these (no label/icon annotation, no
  factory; callers hand-roll `Obj.make(Topic, {...})`).

## 2. The `TopicProps` coupling (the key decision)

`Mailbox.topicSuggestions` reuses `TopicProps` directly. Any move/reshape of `Topic` must keep this
working. Options for when `Topic` becomes a Project-style class in `@dxos/types`:

- **(A) Keep a shared props struct** — export `TopicProps` (or `Topic.Props`) from `@dxos/types`;
  `Mailbox.topicSuggestions` imports it from there. Smallest change; preserves `Obj.make(Topic, suggestion)`.
- **(B) Inline into the class + reshape Mailbox** — Project-style inlines the struct; then
  `topicSuggestions` needs its own struct or a `Schema.encodedSchema(Topic)` derivation, and promotion
  needs explicit field copying. More faithful to Project, more churn + a new mapping seam.

Recommendation captured for the plan: **(A)** unless we want suggestions to diverge from Topic fields.

## 3. Consumers by category

### Type / schema consumers
| File | Uses |
| --- | --- |
| `plugin-inbox/src/types/Mailbox.ts` | `TopicProps` → `topicSuggestions` field |
| `plugin-inbox/src/InboxPlugin.tsx` | registers `Topic` in `addTypes` |
| `plugin-inbox/src/types/InboxOperation.ts` | operation I/O referencing Topic |

### Operations (plugin-inbox)
| File | Uses |
| --- | --- |
| `operations/analyze/analyze-topics.ts` | materializes `Topic` objects + `AnchoredTo` |
| `operations/analyze/create-topic-from-message.ts` | creates one `Topic` from a thread |
| `operations/analyze/suggestions.ts` (+ `.test.ts`) | orders/dedupes suggestion drafts (TopicProps shape) |

### UI components (the move targets)
| File | Role |
| --- | --- |
| `containers/TopicArticle/TopicArticle.tsx` | **detail** view of one `Topic` (subject: Topic) |
| `containers/TopicArticle/resolve-threads.ts` (+ `.test.ts`) | groups a topic's `threadIds` → threads |
| `containers/TopicsArticle/TopicsArticle.tsx` | **master** list of Topics + suggestions (mailbox-scoped) |
| `components/MessageStack/MessageStack.tsx` | "Create Topic" affordance (emits create-topic) |
| `components/Row`, `Card.*` | presentational (keyword tags, sections) — no Topic coupling |

### App-graph (plugin-inbox `app-graph-builder.ts`)
- Topics **folder node** under each mailbox (`MAILBOX_TOPICS_TYPE`, `getTopicsId()`), `data: mailbox`.
- **`mailboxTopics`** companion extension: selected topic → `linkedSegment('topic')` companion whose
  `data` is the `Topic` (so `TopicArticle` renders it).
- `analyzeTopicsMailbox` action extension (runs `AnalyzeTopics`).
- **Refactor target:** replace the mailbox-folder wiring with a **virtual Topics root node + a child node
  per `Topic`**, rendered by a regular object/article surface.

### Surfaces (plugin-inbox `react-surface.tsx`)
- `topics` surface → `TopicsArticle` (mailbox-folder filter).
- `topic` surface → `TopicArticle` via `AppSurface.object(AppSurface.Article, Topic)` — **already the
  regular object/article pattern** the refactor wants; this binding moves to plugin-brain as-is.

### Translations
- `plugin-inbox/src/translations.ts` — `topics.*`, `topic.*` keys (label, summary, threads, questions,
  tasks, accept/dismiss, empty, suggested, count, analyze). Move the Topic-owned keys to plugin-brain.

### Stories / harness / tests
| File | Uses |
| --- | --- |
| `stories-inbox/src/stories/TopicsArticle.stories.tsx` | renders `TopicsArticle` (seeds Topics) |
| `stories-inbox/src/stories/CreateTopic.stories.tsx` | create-topic flow |
| `stories-inbox/src/modules/TopicsModule.tsx` | Topics surface module |
| `stories-brain/src/testing/harness/internal/active-topics.ts`, `pipelines/active-topics.ts` | research harness `Topic` assembly |
| `stories-brain/src/test/{active-topics,artifacts.bench}.test.ts` | harness tests |
| `plugin-inbox/src/{sync/sync.test.ts,util/util.test.ts}` | incidental references |

## 4. Blast radius

- **~20 files import `Topic`/`TopicProps`.** Moving the type to `@dxos/types` updates every import path
  (`@dxos/pipeline-email` → `@dxos/types`). `pipeline-email` itself is a heavy consumer (corpus pipeline).
- **Deps:** `plugin-brain` currently depends on `@dxos/types` but **not** `react-ui-mosaic` /
  `react-ui-attention` / `react-ui-list` / `react-ui-menu` — these must be added to host the moved
  articles. It also must not need `@dxos/pipeline-email` once `Topic` lives in `@dxos/types`.
- **`pipeline-email` re-export:** per repo rule "never leave compatibility re-exports" — update every
  `@dxos/pipeline-email` `Topic` importer to `@dxos/types` in the same change; do not shim.

## 5. Existing `Project` (`@dxos/types`) — rename reference

- Definition: `packages/sdk/types/src/types/Project.ts` — `name?, description?, image?`; DXN
  `org.dxos.type.project@0.1.0`; `LabelAnnotation(['name'])`, `IconAnnotation(check-square-offset/indigo)`,
  `make` factory.
- Consumers: `plugin-linear/src/operations/materialize-target.ts`,
  `plugin-github/src/operations/materialize-target.ts`.
- A future `Topic`→`Project` **rename** would collide with this existing `Project` (different field shape,
  different DXN). Renaming is deferred (tracked); this refactor keeps the `Topic` name/DXN and only moves
  + restyles it. Reconciling the two `Project`s is its own decision.
