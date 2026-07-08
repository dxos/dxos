# Configurable Email-Pipeline Story Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Storybook harness in `@dxos/stories-brain` that runs the full email pipeline (summarize → extract-contacts → stats → extract-facts → threads → topics) over sample emails in the browser, with a per-stage output viewer.

**Architecture:** A stage **registry** pairs each stage's `@dxos/pipeline` `Stage` with its output React component. A `runPipeline` helper composes the enabled stages and provides one merged layer — an `AiService` chosen by config (edge / ollama / fixture-mock), `FactStore.layerMemory`, and an ECHO `Database` from a `ClientPlugin` space. Layout is master-detail: `PipelinePanel` (stage list) selects a stage; the detail pane renders that stage's registry view. Config is variant-driven (Storybook args), read-only in the panel.

**Tech Stack:** TypeScript, Effect (`Stream`/`Layer`/`Effect`), `@dxos/pipeline`, `@dxos/pipeline-rdf` (`FactStore`, `extractFactsStage`), `@dxos/crawler` (`extractTopics`), `@dxos/pipeline-email` (`buildThreads`, `emailToMessage`), `@dxos/extractor-lib` (`extractContact`), `@dxos/echo` + `@dxos/plugin-client/testing` (ECHO space), `@dxos/react-ui*`, Storybook + Playwright.

**Spec:** `docs/superpowers/specs/2026-07-06-email-pipeline-story-design.md`. Part of DX-1078.

---

## File structure

All paths under `packages/stories/stories-brain/src/`.

- `components/EmailList/{EmailList.tsx,EmailList.stories.tsx,index.ts}` — fixture email list + selection (presentational).
- `components/SummaryView/{SummaryView.tsx,SummaryView.stories.tsx,index.ts}` — summary + spam + keywords for one message.
- `components/StatsView/{StatsView.tsx,StatsView.stories.tsx,index.ts}` — sender/recipient/spam tallies.
- `components/TopicsView/{TopicsView.tsx,TopicsView.stories.tsx,index.ts}` — `TopicReport` rendering.
- `components/EchoObjectsView/{EchoObjectsView.tsx,EchoObjectsView.stories.tsx,index.ts}` — object list from ECHO (props-driven; no `useQuery` inside, so it stays storybook-mountable).
- `components/StageOutput/{StageOutput.tsx,index.ts}` — detail host: renders the registry view for the selected stage.
- `components/PipelinePanel/PipelinePanel.tsx` — MODIFY: add `selected` + `onSelect`.
- `components/index.ts` — MODIFY: export the new components.
- `email-pipeline/config.ts` — config + registry types.
- `email-pipeline/stages.ts` — the six stage adapters (Stage + typed result), backend-agnostic.
- `email-pipeline/run.ts` — `runPipeline` helper + `EmailPipelineCtx`.
- `email-pipeline/registry.tsx` — the stage → OutputView registry.
- `email-pipeline/fixtures.ts` — sample emails + recorded fixture LLM outputs for the `Fixture` variant.
- `stories/EmailPipeline.stories.tsx` — composite story + variants + ECHO-space decorator.

**Design note:** stage _logic_ (`stages.ts`, backend-agnostic Effects) is separated from _view_ (`components/*`), joined only in `registry.tsx`. This keeps stages unit-testable without React and views storybook-mountable without a pipeline.

---

## Task 1: Config & registry types

**Files:**

- Create: `packages/stories/stories-brain/src/email-pipeline/config.ts`

- [ ] **Step 1: Write the config/types module**

```ts
//
// Copyright 2026 DXOS.org
//

import { type FC } from 'react';

import { type Stage } from '@dxos/pipeline';
import { type Message } from '@dxos/types';

/** Ordered stage ids of the full email pipeline. */
export type StageId = 'summarize' | 'extract-contacts' | 'stats' | 'extract-facts' | 'threads' | 'topics';

/** AiService backend a run uses. `fixture` swaps in recorded outputs (offline, deterministic). */
export type Backend = 'edge' | 'ollama' | 'fixture';

/** Per-stage configuration (variant-driven; read-only in the panel). */
export type StageConfig = {
  readonly id: StageId;
  readonly enabled: boolean;
  /** Model DXN passed to AiService-backed stages; ignored by pure stages. */
  readonly model?: string;
};

/** Whole-run configuration set by a story variant. */
export type PipelineConfig = {
  readonly backend: Backend;
  readonly stages: readonly StageConfig[];
};

/** Props every stage OutputView receives: the accumulated result for that stage (or undefined pre-run). */
export type StageOutputProps = {
  readonly result: unknown;
};

/** Registry entry: a stage's metadata, its Stage factory, and its output view. */
export type StageDef = {
  readonly id: StageId;
  readonly label: string;
  readonly description: string;
  /** True for AiService-backed stages (panel shows backend/model; pure stages don't). */
  readonly usesAi: boolean;
  readonly OutputView: FC<StageOutputProps>;
};

/** A message plus per-stage accumulated results, keyed by stage id. */
export type RunState = {
  readonly messages: readonly Message.Message[];
  readonly results: Partial<Record<StageId, unknown>>;
  /** Whole-pipeline running flag (drives PipelinePanel's toolbar spinner; no per-stage indicator). */
  readonly busy?: boolean;
};
// NOTE: config.ts (Task 1) currently has `active?: StageId` here — Task 6 must change it to `busy?: boolean`.

export type { Stage };
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/burdon/Code/dxos/dxos/.claude/worktrees/lucid-vaughan-efcdee && moon run stories-brain:build`
Expected: PASS (module compiles; unused until later tasks import it).

- [ ] **Step 3: Commit**

```bash
git add packages/stories/stories-brain/src/email-pipeline/config.ts
git commit -m "feat(stories-brain): email-pipeline config and registry types"
```

---

## Task 2: Stage adapters (backend-agnostic Effects)

Each adapter is a `Stage` over a `Message` stream plus a typed result accumulated via a shared `EmailPipelineCtx`. Adapted from `pipeline-email/src/testing/email-pipeline.test.ts` (the node worked test), but with the summarize model call going through `AiService`/`LanguageModel` so it is backend-agnostic.

**Files:**

- Create: `packages/stories/stories-brain/src/email-pipeline/run.ts` (Ctx + result types; runner added in Task 3)
- Create: `packages/stories/stories-brain/src/email-pipeline/stages.ts`
- Test: `packages/stories/stories-brain/src/email-pipeline/stages.test.ts`

- [ ] **Step 1: Write `EmailPipelineCtx` + result types in `run.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';

import { type Database } from '@dxos/echo';

/** Summary produced by the summarize stage. */
export type Summary = { readonly summary: string; readonly isSpam: boolean; readonly keywords: readonly string[] };

/** Running tallies produced by the stats stage (mutable accumulator). */
export type Stats = { from: Map<string, number>; to: Map<string, number>; total: number; spam: number };

/** Per-message summary result keyed by messageId, for the SummaryView. */
export type SummaryResult = { readonly summaries: ReadonlyArray<{ messageId: string; summary: Summary }> };

/**
 * Shared context threaded through the stages via Effect's Requirements channel. `db` is the ECHO
 * space database (browser-safe); `stats` is the mutable accumulator read after the run.
 */
export class EmailPipelineCtx extends Context.Tag('@dxos/stories-brain/EmailPipelineCtx')<
  EmailPipelineCtx,
  {
    readonly db: Database.Database;
    readonly stats: Stats;
    readonly summaries: Array<{ messageId: string; summary: Summary }>;
  }
>() {}

export const emptyStats = (): Stats => ({ from: new Map(), to: new Map(), total: 0, spam: 0 });
```

- [ ] **Step 2: Write `stages.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { extractContact } from '@dxos/extractor-lib';
import { Stage } from '@dxos/pipeline';
import { ContentBlock, Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { EmailPipelineCtx, type Summary } from './run';

const SUMMARIZE_PROMPT = trim`
  Summarize the following email in one sentence, decide whether it is spam, and list up to five keywords.
  Respond with ONLY a JSON object of the form {"summary": string, "isSpam": boolean, "keywords": string[]}.
`;

// Local models often wrap JSON in prose; extract the first object and coerce leniently.
const parseSummary = (raw: string): Summary => {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return { summary: '', isSpam: false, keywords: [] };
  }
  try {
    const parsed = JSON.parse(match[0]);
    const keywords = parsed.keywords;
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      isSpam: parsed.isSpam === true || parsed.spam === true || parsed.is_spam === true,
      keywords: Array.isArray(keywords) ? keywords.map((keyword: unknown) => String(keyword)) : [],
    };
  } catch {
    return { summary: '', isSpam: false, keywords: [] };
  }
};

/** Summarize via AiService/LanguageModel; append a summary block and record spam/keywords + result. */
export const summarizeStage: Stage.Stage<
  Message.Message,
  Message.Message,
  never,
  EmailPipelineCtx | AiService.AiService
> = Stage.map('summarize', (message) =>
  Effect.gen(function* () {
    const ctx = yield* EmailPipelineCtx;
    const text = Message.extractText(message);
    const raw = yield* Effect.scoped(LanguageModel.generateText({ prompt: `${SUMMARIZE_PROMPT}\n\n${text}` })).pipe(
      Effect.map((response) => response.text),
      Effect.orElse(() => Effect.succeed('')),
    );
    const summary = parseSummary(raw);
    const messageId = String(message.properties?.messageId ?? message.id);
    ctx.summaries.push({ messageId, summary });
    const summaryBlock: ContentBlock.Text = { _tag: 'text', text: summary.summary };
    return Message.make({
      created: message.created,
      sender: message.sender,
      blocks: [...message.blocks, summaryBlock],
      properties: { ...message.properties, spam: summary.isSpam, keywords: summary.keywords },
    });
  }),
);

/** Extract a Person (+ Organization) from the sender and persist to the ECHO space; pass message through. */
export const extractContactsStage: Stage.Stage<Message.Message, Message.Message, never, EmailPipelineCtx> = Stage.map(
  'extract-contacts',
  (message) =>
    Effect.gen(function* () {
      const { db } = yield* EmailPipelineCtx;
      const result = yield* extractContact({ db, source: message });
      for (const object of result.created) {
        db.add(object);
      }
      return message;
    }),
);

/** Pure-JS running tallies (senders, recipients, spam); pass message through. */
export const statsStage: Stage.Stage<Message.Message, Message.Message, never, EmailPipelineCtx> = Stage.map(
  'stats',
  (message) =>
    Effect.gen(function* () {
      const { stats } = yield* EmailPipelineCtx;
      stats.total += 1;
      const sender = message.sender.email;
      if (sender) {
        stats.from.set(sender, (stats.from.get(sender) ?? 0) + 1);
      }
      const recipients = message.properties?.to;
      if (Array.isArray(recipients)) {
        for (const recipient of recipients) {
          const address = String(recipient);
          stats.to.set(address, (stats.to.get(address) ?? 0) + 1);
        }
      }
      if (message.properties?.spam) {
        stats.spam += 1;
      }
      return message;
    }),
);
```

- [ ] **Step 3: Write the failing test for `statsStage` (pure, no AI/ECHO)**

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { Pipeline } from '@dxos/pipeline';
import { Message } from '@dxos/types';

import { EmailPipelineCtx, emptyStats } from './run';
import { statsStage } from './stages';

describe('statsStage', () => {
  test('tallies senders and spam across the stream', async ({ expect }) => {
    const stats = emptyStats();
    const ctx = Layer.succeed(EmailPipelineCtx, { db: {} as any, stats, summaries: [] });
    const messages = [
      Message.make({
        created: '2001-05-14T10:00:00.000Z',
        sender: { email: 'a@x.com' },
        blocks: [],
        properties: { spam: true },
      }),
      Message.make({ created: '2001-05-14T11:00:00.000Z', sender: { email: 'a@x.com' }, blocks: [] }),
    ];
    await Effect.runPromise(
      Stream.fromIterable(messages).pipe(statsStage, Pipeline.run({ sink: () => Effect.void }), Effect.provide(ctx)),
    );
    expect(stats.total).toBe(2);
    expect(stats.spam).toBe(1);
    expect(stats.from.get('a@x.com')).toBe(2);
  });
});
```

- [ ] **Step 4: Run test to verify it fails, then passes**

Run: `cd /Users/burdon/Code/dxos/dxos/.claude/worktrees/lucid-vaughan-efcdee && moon run stories-brain:test -- src/email-pipeline/stages.test.ts`
Expected: PASS (statsStage tallies). If `extractText`/`Message.make` signatures differ, fix imports against `@dxos/types`.

- [ ] **Step 5: Commit**

```bash
git add packages/stories/stories-brain/src/email-pipeline/run.ts packages/stories/stories-brain/src/email-pipeline/stages.ts packages/stories/stories-brain/src/email-pipeline/stages.test.ts
git commit -m "feat(stories-brain): email pipeline stage adapters (summarize/contacts/stats)"
```

---

## Task 3: `runPipeline` runner + AiService backend selection

**Files:**

- Modify: `packages/stories/stories-brain/src/email-pipeline/run.ts`
- Test: `packages/stories/stories-brain/src/email-pipeline/run.test.ts`

- [ ] **Step 1: Add the AiService layer resolver + `runPipeline` to `run.ts`**

Append:

```ts
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { FactStore, extractFactsStage } from '@dxos/pipeline-rdf';
import { Pipeline, type Stage } from '@dxos/pipeline';
import { type Message } from '@dxos/types';

import { type Backend, type PipelineConfig, type StageId } from './config';
import { extractContactsStage, statsStage, summarizeStage } from './stages';

/**
 * AiService layer for a backend. `edge` uses the edge-remote preset; `ollama` uses the ollama preset;
 * `fixture` expects a mock AiService layer to be supplied by the caller (see fixtures.ts).
 */
export const aiServiceLayer = (backend: Backend, fixtureLayer?: Layer.Layer<AiService.AiService>) => {
  switch (backend) {
    case 'edge':
      return Layer.fresh(AiServiceTestingPreset('edge-remote'));
    case 'ollama':
      return Layer.fresh(AiServiceTestingPreset('ollama'));
    case 'fixture':
      return fixtureLayer ?? Layer.fresh(AiServiceTestingPreset('edge-remote'));
  }
};
```

(Confirm the exact ollama preset key against `@dxos/ai/testing` `AiServiceTestingPreset` during implementation; fall back to the edge preset name if `'ollama'` is not a valid preset and note it in the `LocalOllama` variant.)

- [ ] **Step 2: Add the runner**

```ts
export type RunResult = {
  readonly summaries: ReadonlyArray<{ messageId: string; summary: Summary }>;
  readonly stats: Stats;
};

/**
 * Compose the enabled stages in config order, stream the messages through, and provide the merged
 * layer (AiService + FactStore.layerMemory + Ctx). The running indicator is whole-pipeline `busy`,
 * managed by the caller around this promise (see PipelinePanel `busy` — there is NO per-stage active
 * indicator). ECHO writes go through the `db` on `EmailPipelineCtx` (provided by the caller's space).
 */
export const runPipeline = ({
  messages,
  config,
  db,
  fixtureLayer,
}: {
  messages: readonly Message.Message[];
  config: PipelineConfig;
  db: import('@dxos/echo').Database.Database;
  fixtureLayer?: Layer.Layer<AiService.AiService>;
}): Promise<RunResult> => {
  const enabled = new Set(config.stages.filter((stage) => stage.enabled).map((stage) => stage.id));
  const stats = emptyStats();
  const summaries: Array<{ messageId: string; summary: Summary }> = [];
  const ctx = Layer.succeed(EmailPipelineCtx, { db, stats, summaries });

  let stream: Stream.Stream<Message.Message, any, any> = Stream.fromIterable(messages);
  if (enabled.has('summarize')) {
    stream = stream.pipe(summarizeStage);
  }
  if (enabled.has('extract-contacts')) {
    stream = stream.pipe(extractContactsStage);
  }
  if (enabled.has('stats')) {
    stream = stream.pipe(statsStage);
  }
  // extract-facts persists into FactStore; convert each message to an ExtractDocument first
  // (messageToDocument lives in pipeline-email — import it here).

  const program = stream.pipe(
    Pipeline.run({ sink: () => Effect.void }),
    Effect.provide(Layer.mergeAll(ctx, aiServiceLayer(config.backend, fixtureLayer), FactStore.layerMemory)),
  );

  // Use EffectEx.runPromise (repo lint rule: no bare Effect.runPromise). Do NOT cast the error
  // channel to silence it — map/catch the stages' domain errors (e.g. SemanticIndexError) so the
  // program's E is discharged honestly before running.
  return EffectEx.runPromise(program).then(() => ({ summaries, stats }));
};
```

**Note for implementer:** `extract-facts`, `threads`, and `topics` need the fact stream + ECHO writes + a post-stream aggregation (topics runs over the whole `FactStore` after ingest; threads runs over all messages after the stream). Implement `extract-facts` with `extractFactsStage()` feeding `indexFactsStage` semantics against the run's `FactStore`, then after `Pipeline.run` completes, run `extractTopics()` and `buildThreads(messages, { ownerEmail, now })` and include their results in `RunResult`. Keep `FactStore.layerMemory` as a single scoped layer for the whole run so topics see the ingested facts. Extend `RunResult` with `facts`, `topics`, `threads` accordingly. This is the one genuinely stateful part — build it against the `run.test.ts` below.

- [ ] **Step 3: Write the runner test (fixture-mode, deterministic)**

```ts
//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { mockAiService } from '@dxos/pipeline-rdf/testing';
import { Message } from '@dxos/types';

import { type PipelineConfig } from './config';
import { runPipeline } from './run';

describe('runPipeline', () => {
  test('runs enabled stages and returns per-stage results (fixture backend)', async ({ expect }) => {
    const config: PipelineConfig = {
      backend: 'fixture',
      stages: [
        { id: 'summarize', enabled: false },
        { id: 'stats', enabled: true },
        { id: 'extract-facts', enabled: false },
      ],
    };
    const messages = [
      Message.make({
        created: '2001-05-14T10:00:00.000Z',
        sender: { email: 'a@x.com' },
        blocks: [{ _tag: 'text', text: 'hi' }],
      }),
    ];
    const result = await runPipeline({
      messages,
      config,
      db: {} as any, // stats stage does not touch db.
      fixtureLayer: Layer.fresh(mockAiService({ facts: [] })),
    });
    expect(result.stats.total).toBe(1);
  });
});
```

- [ ] **Step 4: Run the test; iterate until green**

Run: `cd /Users/burdon/Code/dxos/dxos/.claude/worktrees/lucid-vaughan-efcdee && moon run stories-brain:test -- src/email-pipeline/run.test.ts`
Expected: PASS. Add fact/topic/thread assertions once those branches are implemented (enable a fixture-backed `mockAiService` returning one fact, assert `result.facts.length` and `result.topics.topics.length`).

- [ ] **Step 5: Commit**

```bash
git add packages/stories/stories-brain/src/email-pipeline/run.ts packages/stories/stories-brain/src/email-pipeline/run.test.ts
git commit -m "feat(stories-brain): runPipeline runner with AiService backend selection"
```

---

## Task 4: Output view components (presentational)

Each is a pure component (props in, no capability hooks) mirroring `FactViewer` structure: `Panel.Root` + `Panel.Content` + `ScrollArea` + `Empty` for empty state, tokens from `@dxos/react-ui`. Each gets a `.stories.tsx` with `withTheme()` + `withLayout({ layout: 'column' })` and fixture args.

**Files (per component):** `components/<Name>/<Name>.tsx`, `<Name>.stories.tsx`, `index.ts`.

- [ ] **Step 1: `SummaryView`** — props `{ summaries: ReadonlyArray<{ messageId: string; summary: { summary: string; isSpam: boolean; keywords: readonly string[] } }> }`. Render a list: each row shows the summary text, a spam `Tag` (`hue='error'` when `isSpam`), and keyword `Tag`s. Empty → `Empty label='No summaries.'`.

- [ ] **Step 2: `StatsView`** — props `{ stats: { total: number; spam: number; from: ReadonlyMap<string,number>; to: ReadonlyMap<string,number> } }`. Render total/spam counts and two ranked lists (top senders, top recipients). Empty when `total === 0`.

- [ ] **Step 3: `TopicsView`** — props `{ report?: { topics: ReadonlyArray<{ entity: string; label: string; mentions: number; agents: number }>; factCount: number } }`. Render ranked topic rows (label, `mentions`, `agents`), `factCount` in the toolbar. Empty → `Empty label='No topics.'`.

- [ ] **Step 4: `EchoObjectsView`** — props `{ objects: ReadonlyArray<{ id: string; typename: string; label: string }>; title: string }`. Pure list (the container does the `useQuery` and maps to this shape, keeping the view storybook-mountable). Empty → `Empty label='No objects.'`.

- [ ] **Step 5: For each component, run its story headlessly** (see Task 8 harness) and confirm it renders with fixtures. Commit each component with its story:

```bash
git add packages/stories/stories-brain/src/components/<Name>
git commit -m "feat(stories-brain): <Name> output component"
```

**Contract example (SummaryView.tsx) — follow this shape for all four:**

```tsx
//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Panel, ScrollArea, Tag, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { Empty } from '@dxos/react-ui-list';

export type SummaryViewProps = ThemedClassName<{
  summaries: ReadonlyArray<{
    messageId: string;
    summary: { summary: string; isSpam: boolean; keywords: readonly string[] };
  }>;
}>;

export const SummaryView = ({ classNames, summaries }: SummaryViewProps) => (
  <Panel.Root classNames={classNames}>
    <Panel.Toolbar asChild>
      <Toolbar.Root>
        <Toolbar.Text>Summaries</Toolbar.Text>
      </Toolbar.Root>
    </Panel.Toolbar>
    <Panel.Content asChild>
      <ScrollArea.Root padding>
        <ScrollArea.Viewport classNames='flex flex-col gap-2 py-1'>
          {summaries.length === 0 && <Empty label='No summaries.' />}
          {summaries.map(({ messageId, summary }) => (
            <div
              key={messageId}
              className='flex flex-col gap-1 bg-card-surface border border-subdued-separator rounded-sm p-2'
            >
              <div className='flex items-center justify-between gap-2'>
                <span className='text-sm'>{summary.summary || '(no summary)'}</span>
                {summary.isSpam && <Tag hue='error'>spam</Tag>}
              </div>
              <div className='flex flex-wrap gap-1'>
                {summary.keywords.map((keyword) => (
                  <Tag key={keyword} hue='neutral'>
                    {keyword}
                  </Tag>
                ))}
              </div>
            </div>
          ))}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Panel.Content>
  </Panel.Root>
);
```

---

## Task 5: EmailList + DocumentEditor message binding + fixtures

**Files:**

- Create: `components/EmailList/{EmailList.tsx,EmailList.stories.tsx,index.ts}`
- Create: `email-pipeline/fixtures.ts`
- Modify: `components/DocumentEditor/DocumentEditor.tsx`

- [ ] **Step 1: `fixtures.ts`** — export `SAMPLE_EMAILS: Message.Message[]` built with `Message.make` (3–4 short emails with distinct senders/subjects, one spammy), reusing `emailToMessage`-shaped fields. Export `messageText(message): string` = `Message.extractText(message)` and `withMessageText(message, text): Message.Message` (returns a new Message with the first text block replaced) — the editor↔message binding. Also export `FIXTURE_LLM` (recorded summary + facts outputs) for the `Fixture` variant's `queuedAiService`.

- [ ] **Step 2: `EmailList.tsx`** — props `{ messages; selectedId?; onSelect }`. Render `OrderedList`/`Listbox` rows (sender · subject); selecting sets `selectedId`. Presentational.

- [ ] **Step 3: DocumentEditor** — add optional props `{ value?; onChange? }` already exist; the story owns the binding via `withMessageText`. No structural change if `value`/`onChange` suffice — otherwise thread a `message` prop. Keep minimal.

- [ ] **Step 4: Component stories + headless render check; commit.**

```bash
git add packages/stories/stories-brain/src/components/EmailList packages/stories/stories-brain/src/email-pipeline/fixtures.ts
git commit -m "feat(stories-brain): email fixtures + EmailList"
```

---

## Task 6: PipelinePanel selection + StageOutput host + registry

**Files:**

- Modify: `components/PipelinePanel/PipelinePanel.tsx`
- Create: `components/StageOutput/{StageOutput.tsx,index.ts}`
- Create: `email-pipeline/registry.tsx`
- Modify: `components/index.ts`

- [ ] **Step 1: PipelinePanel** — add props `selected?: string` and `onSelect?: (id: string) => void`. On row click set selected; apply `selected` styling on the matching `OrderedList.Item` (`selected` prop already supported by the item). Keep checkbox + drag. Show each stage's backend/model text (read-only) when present in the `StageInfo` (extend `StageInfo` with optional `backend?`/`model?`).

- [ ] **Step 2: `registry.tsx`** — export `STAGE_REGISTRY: Record<StageId, StageDef>` wiring each stage id to `{ label, description, usesAi, OutputView }`: summarize→SummaryView, extract-contacts→EchoObjectsView(Person/Org), stats→StatsView, extract-facts→FactViewer + EntityList + PredicateList (stacked; entities via `entitiesFromFacts`, predicates via `predicatesFromFacts`), threads→EchoObjectsView(Thread), topics→TopicsView. Each `OutputView` reads its slice from `props.result`. NOTE: `EntityList`, `FactViewer`, and `PredicateList` (+ `entitiesFromFacts`/`predicatesFromFacts` in `components/util`) already exist — reuse them; Task 4 does NOT rebuild them.

- [ ] **Step 3: `StageOutput.tsx`** — props `{ stageId?: StageId; result: unknown }`. Look up `STAGE_REGISTRY[stageId]` and render its `OutputView` with `result`; render `Empty label='Select a stage.'` when none selected.

- [ ] **Step 4: Export new components from `components/index.ts`; build + lint.**

Run: `moon run stories-brain:build stories-brain:lint -- --fix`
Expected: PASS / 0 warnings.

- [ ] **Step 5: Commit.**

```bash
git add packages/stories/stories-brain/src/components/PipelinePanel packages/stories/stories-brain/src/components/StageOutput packages/stories/stories-brain/src/email-pipeline/registry.tsx packages/stories/stories-brain/src/components/index.ts
git commit -m "feat(stories-brain): PipelinePanel selection + StageOutput registry host"
```

---

## Task 7: Composite EmailPipeline story + ECHO-space decorator + variants

**Files:**

- Create: `stories/EmailPipeline.stories.tsx`

- [ ] **Step 1: Decorator** — reuse `createMarkdownStoryDecorators` (or a trimmed `withPluginManager` + `ClientPlugin`) registering types `Person`, `Organization`, `Thread` and seeding nothing; expose the space so the story's Run gets `space.db`.

- [ ] **Step 2: Story component** — three columns: `EmailList` + `DocumentEditor` (left, bound to selected message text via `withMessageText`), `PipelinePanel` (middle, `selected`/`onSelect`, `busy`, stages from the variant config), `StageOutput` (right, `stageId={selected}` `result={runState.results[selected]}`). Run trigger sets `busy=true`, calls `runPipeline({ messages, config, db, fixtureLayer })`, stores results keyed by stage id, and clears `busy` in `finally`. The panel's toolbar spinner shows while `busy` (whole-pipeline; no per-stage indicator).

- [ ] **Step 3: Variants** —
  - `AllEdge`: `{ backend: 'edge', stages: all 6 enabled }`.
  - `Fixture`: `{ backend: 'fixture', stages: all 6 enabled }` with `fixtureLayer = queuedAiService(FIXTURE_LLM)`.
  - `LocalOllama`: `{ backend: 'ollama', … }`.

- [ ] **Step 4: Build + lint + format.**

Run: `moon run stories-brain:build stories-brain:lint -- --fix && pnpm format`

- [ ] **Step 5: Commit.**

```bash
git add packages/stories/stories-brain/src/stories/EmailPipeline.stories.tsx
git commit -m "feat(stories-brain): configurable EmailPipeline story with variants"
```

---

## Task 8: Verification (headless storybook)

- [ ] **Step 1: Serve worktree storybook.**

Run (background): `cd tools/storybook-react && pnpm storybook dev --port 9019 --no-open`
Wait until `curl -sf http://localhost:9019/index.json` returns.

- [ ] **Step 2: Playwright-drive the `Fixture` variant.**

Navigate to `iframe.html?id=stories-stories-brain-stories-emailpipeline--fixture&viewMode=story`. Assert: email list renders; selecting an email populates the editor; clicking Run shows the toolbar busy spinner and populates `results`; selecting each enabled stage shows its output view (facts, topics, echo objects, summaries, stats) with no console errors. Screenshot to `temp/email-pipeline.png`.

- [ ] **Step 3: Confirm component stories render** (SummaryView/StatsView/TopicsView/EchoObjectsView/EmailList) via `index.json` ids; no console errors.

- [ ] **Step 4: Stop storybook; final `moon run stories-brain:build stories-brain:test stories-brain:lint` green; commit any fixups.**

---

## Self-review notes

- **Spec coverage:** input (EmailList+editor, Task 5) ✓; master-detail (PipelinePanel selection + StageOutput, Task 6) ✓; 6 stages (Tasks 2–3) ✓; backend via AiService only (Task 3 `aiServiceLayer`) ✓; ECHO space (Task 7 decorator) ✓; variant-driven config (Task 7) ✓; per-stage output views (Task 4) ✓; FactStore.layerMemory (Task 3) ✓; testing (Task 8) ✓.
- **Known implementation risk (flagged in spec):** `extract-facts`/`threads`/`topics` post-stream aggregation is the stateful core — Task 3 Step 2 note calls it out; build it against `run.test.ts` with a one-fact `mockAiService`. Confirm `extractContact` browser-bundles; if not, fall back to fixture output for the contacts stage and note it in the story.
- **Type consistency:** `StageId` union, `PipelineConfig`, `EmailPipelineCtx`, `RunResult`, `STAGE_REGISTRY` names are used identically across Tasks 1/2/3/6.
- **Ollama preset:** verify `AiServiceTestingPreset('ollama')` exists; else document `LocalOllama` as non-functional-in-browser.
