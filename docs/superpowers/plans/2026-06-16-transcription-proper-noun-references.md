# Transcription Proper-Noun References Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A mic-less Storybook story that extracts proper nouns from each incoming transcript message with Haiku, full-text-searches the space for matches, and renders them as inline reference chips — backed by reusable extraction code.

**Architecture:** Three reusable units in `@dxos/assistant/extraction` — an `ExtractProperNouns` Operation (LLM), a `findReferences` full-text DB search, and a `processTranscriptMessage` Effect orchestrator that rewrites matched nouns as `[noun](dxn)` markdown via the existing `insertReferences`. A new story replays `seedTestData`'s transcript through the orchestrator with a live `AiServiceTestingPreset('edge-remote')` and renders via `<Transcription>` (its `preview()` extension renders the DXN links).

**Tech Stack:** TypeScript, Effect, `@effect/ai` `LanguageModel`, `@dxos/compute` Operations, `@dxos/echo` `Filter.text`, Storybook, vitest + `AssistantTestLayer` memoized LLM.

**Spec:** `docs/superpowers/specs/2026-06-16-transcription-proper-noun-references-design.md`

---

## File Structure

- `packages/core/compute/assistant/src/extraction/quotes.ts` — **modify**: replace `findQuotes` with `findReferences(nouns, db, { searchKind })` (default `'full-text'`).
- `packages/core/compute/assistant/src/extraction/extraction.ts` — **modify**: add `ProperNouns` schema, `ExtractProperNouns` Operation, `extractProperNouns` core effect, `ExtractionHandlers`; rewrite `processTranscriptMessage` as an Effect; remove the `extractionAnthropicFunction` placeholder. Keep `extractionNerFunction`/NER untouched.
- `packages/core/compute/assistant/src/extraction/extraction.test.ts` — **create**: memoized `ExtractProperNouns` test.
- `packages/core/compute/assistant/src/extraction/quotes.test.ts` — **create**: full-text `findReferences` test.
- `packages/plugins/plugin-transcription/src/testing/testing.ts` — **modify**: point `EntityExtractionMessageBuilder` at the new orchestrator.
- `packages/plugins/plugin-transcription/src/stories/LiveTranscription.stories.tsx` — **modify**: drop the never-enabled entity-extraction code path (it imported the removed symbols).
- `packages/plugins/plugin-transcription/src/stories/ProperNounExtraction.stories.tsx` — **create**: the demo story.

---

## Task 1: `findReferences` full-text search

**Files:**
- Modify: `packages/core/compute/assistant/src/extraction/quotes.ts`
- Test: `packages/core/compute/assistant/src/extraction/quotes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { Organization, Person } from '@dxos/types';

import { findReferences } from './quotes';

const TestLayer = AssistantTestLayer({
  types: [Person.Person, Organization.Organization],
  disableLlmMemoization: true,
});

describe('findReferences', () => {
  it.scoped(
    'links proper nouns to seeded objects via full-text search',
    Effect.fnUntraced(function* ({ expect }) {
      const amco = yield* Database.add(Obj.make(Organization.Organization, { name: 'Amco' }));
      yield* Database.add(Obj.make(Person.Person, { fullName: 'Sarah Johnson' }));
      yield* Database.flush({ indexes: true });

      const db = yield* Database.Database;
      const { references } = yield* Effect.promise(() => findReferences(['Amco', 'Nonexistent'], db));

      expect(references.map((r) => r.quote)).toContain('Amco');
      expect(references.map((r) => r.quote)).not.toContain('Nonexistent');
      expect(references.find((r) => r.quote === 'Amco')?.id).toEqual(amco.id);
    }, Effect.provide(TestLayer)),
  );
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `moon run assistant:test -- quotes.test.ts`
Expected: FAIL — `findReferences` is not exported.

- [ ] **Step 3: Replace `findQuotes` with `findReferences`**

In `quotes.ts`, replace the `findQuotes` export (no external callers) with:

```ts
export type FindReferencesOptions = {
  /** Search backend. Full-text matches proper nouns precisely; vector matches semantically. */
  searchKind?: 'full-text' | 'vector';
};

/**
 * For each noun, finds the best-matching context object and returns it as a reference.
 */
export const findReferences = async (
  nouns: string[],
  db: Database.Database,
  { searchKind = 'full-text' }: FindReferencesOptions = {},
): Promise<ReferencedQuotes> => {
  const references = await Promise.all(
    nouns.map(async (noun) => {
      const objects = await db.query(Query.select(Filter.text(noun, { type: searchKind }))).run();
      return objects.length > 0 ? [{ id: objects[0].id.toString(), quote: noun }] : [];
    }),
  );
  return { references: references.flat() };
};
```

(`Query` is already imported in `quotes.ts`; the `log` import becomes unused — remove it.)

- [ ] **Step 4: Run test, verify pass**

Run: `moon run assistant:test -- quotes.test.ts`
Expected: PASS. **If it fails because the test DB has no full-text index**, this is spec validation point 2 — check whether `AssistantTestLayer` needs a `QueryService` index config; if so add it to the test setup and note the same requirement for the story (`enableQueryIndexes`).

- [ ] **Step 5: Commit**

```bash
git add packages/core/compute/assistant/src/extraction/quotes.ts packages/core/compute/assistant/src/extraction/quotes.test.ts
git commit -m "feat(assistant): generalize findQuotes to findReferences with full-text search"
```

---

## Task 2: `ExtractProperNouns` operation

**Files:**
- Modify: `packages/core/compute/assistant/src/extraction/extraction.ts`

- [ ] **Step 1: Add schema, operation, core effect, handler set**

Replace the `extractionAnthropicFunction` placeholder block with:

```ts
import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Operation, OperationHandlerSet } from '@dxos/compute';
import { trim } from '@dxos/util';

const EXTRACTION_MODEL = 'ai.claude.model.claude-haiku-4-5';

export const ProperNouns = Schema.Struct({
  properNouns: Schema.Array(Schema.String).annotations({
    description: 'Proper nouns (names of people, organizations, places, products) mentioned in the text.',
  }),
});
export type ProperNouns = Schema.Schema.Type<typeof ProperNouns>;

export const ExtractProperNouns = Operation.make({
  meta: {
    key: 'org.dxos.function.extraction.proper-nouns',
    name: 'Extract Proper Nouns',
    description: 'Extract proper nouns from transcript text using a small LLM.',
    icon: 'ph--text-t--regular',
  },
  input: Schema.Struct({ text: Schema.String }),
  output: ProperNouns,
  services: [AiService.AiService],
});

/** Core extraction effect; provides the LanguageModel internally, leaving AiService as the requirement. */
export const extractProperNouns = (text: string) =>
  Effect.gen(function* () {
    const { value } = yield* Effect.scoped(
      LanguageModel.generateObject({
        schema: ProperNouns,
        prompt: trim`
          Extract every proper noun (people, organizations, places, products) mentioned in the transcript text below.
          Return only the surface strings exactly as they appear. Exclude common nouns and pronouns.

          Transcript:
          ${text}
        `,
      }),
    );
    return value.properNouns;
  }).pipe(Effect.provide(AiService.model(EXTRACTION_MODEL)));

const extractProperNounsHandler: Operation.WithHandler<typeof ExtractProperNouns> = ExtractProperNouns.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ text }) {
      return { properNouns: yield* extractProperNouns(text) };
    }),
  ),
);

export const ExtractionHandlers = OperationHandlerSet.make(extractProperNounsHandler);
```

- [ ] **Step 2: Typecheck**

Run: `moon run assistant:build`
Expected: PASS (no TS2742; if it appears, append `Operation.opaqueHandler` to the handler pipe).

- [ ] **Step 3: Commit**

```bash
git add packages/core/compute/assistant/src/extraction/extraction.ts
git commit -m "feat(assistant): add ExtractProperNouns operation (Haiku)"
```

---

## Task 3: Memoized test for `ExtractProperNouns`

**Files:**
- Create: `packages/core/compute/assistant/src/extraction/extraction.test.ts`

- [ ] **Step 1: Write the test (memoization ON)**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';

import { ExtractProperNouns, ExtractionHandlers } from './extraction';

const TestLayer = AssistantTestLayer({
  operationHandlers: ExtractionHandlers,
});

describe('ExtractProperNouns', () => {
  it.scoped(
    'extracts people and organizations from a transcript line',
    Effect.fnUntraced(function* ({ expect }) {
      const { properNouns } = yield* Operation.invoke(ExtractProperNouns, {
        text: 'I see Sarah and Emma are here from Amco. Are we still waiting for David?',
      });
      expect(properNouns).toEqual(expect.arrayContaining(['Sarah', 'Emma', 'Amco', 'David']));
    }, Effect.provide(TestLayer)),
  );
});
```

- [ ] **Step 2: Record the memoized fixture**

The first run must hit the live model to record the conversation. Use the `regenerate-memoized-llm` skill (sets the edge env + memoize-record mode), then:

Run: `moon run assistant:test -- extraction.test.ts`
Expected: PASS, and a `*.conversations.json` fixture is written next to the test.

- [ ] **Step 3: Verify offline replay**

Run again without network/record: `moon run assistant:test -- extraction.test.ts`
Expected: PASS using the recorded fixture (no live call).

- [ ] **Step 4: Commit**

```bash
git add packages/core/compute/assistant/src/extraction/extraction.test.ts packages/core/compute/assistant/src/extraction/*.conversations.json
git commit -m "test(assistant): memoized ExtractProperNouns test"
```

---

## Task 4: `processTranscriptMessage` orchestrator

**Files:**
- Modify: `packages/core/compute/assistant/src/extraction/extraction.ts`

- [ ] **Step 1: Replace the no-op `processTranscriptMessage` with an Effect orchestrator**

Delete the old `ProcessTranscriptMessageProps`/`processTranscriptMessage`/`ExtractionInput`/`ExtractionOutput`/`ExtractionFunction` placeholder surface and add:

```ts
import { Obj, type Database } from '@dxos/echo';
import { Message } from '@dxos/types';

import { findReferences, insertReferences } from './quotes';

/**
 * Enriches a transcript message: per transcript block, extracts proper nouns, links them to
 * objects in the space via full-text search, and rewrites the text with `[noun](dxn)` references.
 */
export const processTranscriptMessage = (message: Message.Message, { db }: { db: Database.Database }) =>
  Effect.gen(function* () {
    const blocks = yield* Effect.forEach(message.blocks, (block) =>
      Effect.gen(function* () {
        if (block._tag !== 'transcript') {
          return block;
        }
        const nouns = yield* extractProperNouns(block.text);
        const references = yield* Effect.promise(() => findReferences([...nouns], db));
        return { ...block, text: insertReferences(block.text, references) };
      }),
    );
    return Obj.make(Message.Message, { sender: message.sender, created: message.created, blocks });
  });
```

- [ ] **Step 2: Update the call site in plugin-transcription testing**

In `packages/plugins/plugin-transcription/src/testing/testing.ts`, change `EntityExtractionMessageBuilder.createMessage` to run the Effect with the space DB + a live AiService preset:

```ts
import * as Effect from 'effect/Effect';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { processTranscriptMessage } from '@dxos/assistant/extraction';

// inside createMessage(), replacing the old processTranscriptMessage call:
const message = this.transcriptMessages[this.currentMessage];
this.currentMessage = (this.currentMessage + 1) % this.transcriptMessages.length;

return Effect.runPromise(
  processTranscriptMessage(message, { db: this.space.db }).pipe(
    Effect.provide(AiServiceTestingPreset('edge-remote')),
  ),
);
```

Remove the now-unused `extractionAnthropicFunction` import and the unused `objects` query.

- [ ] **Step 3: Update LiveTranscription story to drop the removed API**

In `packages/plugins/plugin-transcription/src/stories/LiveTranscription.stories.tsx`, remove the `entityExtraction` prop, the `useMemo` resolving `extractionFunction`/`objects`, the extraction branch in `handleSegments` (keep the plain `appendMessage(message)` path), and the imports of `ExtractionFunction`/`extractionAnthropicFunction`/`extractionNerFunction`/`getNer`/`processTranscriptMessage`. (The `EntityExtraction` export is already commented out.)

- [ ] **Step 4: Typecheck both packages**

Run: `moon run assistant:build && moon run plugin-transcription:build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/compute/assistant/src/extraction/extraction.ts packages/plugins/plugin-transcription/src/testing/testing.ts packages/plugins/plugin-transcription/src/stories/LiveTranscription.stories.tsx
git commit -m "feat(assistant): restore processTranscriptMessage as reference-enrichment orchestrator"
```

---

## Task 5: `ProperNounExtraction` story

**Files:**
- Modify: `packages/sdk/types/src/testing/data.ts` (export `createTestData` if not already).
- Create: `packages/plugins/plugin-transcription/src/stories/ProperNounExtraction.stories.tsx`

- [ ] **Step 0: Export `createTestData`**

In `packages/sdk/types/src/testing/data.ts`, change `const createTestData = …` to `export const createTestData = …` and confirm it's re-exported from the `@dxos/types/testing` barrel. (It builds the fixture without seeding — the story uses it for the transcript script only.)

- [ ] **Step 1: Write the story**

Model on `Transcription.stories.tsx` (render shell + `useFeedModelAdapter`) and `common.ts` (`createStoryDecorators({ enableVectorIndex: true })`). Replay `seedTestData`'s `transcriptMessages` on an interval, each piped through the orchestrator with the live preset, appended to the model.

```tsx
//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useMemo, useState } from 'react';

import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { processTranscriptMessage } from '@dxos/assistant/extraction';
import { useSpaces } from '@dxos/react-client/echo';
import { IconButton, Panel, Toolbar } from '@dxos/react-ui';
import { createTestData } from '@dxos/types/testing';

import { createStoryDecorators, useStoryMessageModel } from './common';
import { Transcription } from '../components/Transcription';

const DefaultStory = ({ interval = 3_000 }: { interval?: number }) => {
  const [space] = useSpaces();
  const { model, appendMessage } = useStoryMessageModel();
  const [running, setRunning] = useState(true);
  // The decorator already seeds the objects; we only need the transcript *script* (static text),
  // so build it directly via createTestData — calling seedTestData again would double-seed.
  const messages = useMemo(() => createTestData().transcriptMessages, []);

  useEffect(() => {
    if (!space || !running || messages.length === 0) {
      return;
    }
    let index = 0;
    const id = setInterval(() => {
      const message = messages[index % messages.length];
      index++;
      void Effect.runPromise(
        processTranscriptMessage(message, { db: space.db }).pipe(Effect.provide(AiServiceTestingPreset('edge-remote'))),
      ).then(appendMessage);
    }, interval);
    return () => clearInterval(id);
  }, [space, running, messages, interval, appendMessage]);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root classNames='justify-end'>
          <IconButton
            icon={running ? 'ph--pause--regular' : 'ph--play--regular'}
            label={running ? 'Pause' : 'Start'}
            onClick={() => setRunning((value) => !value)}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content className='dx-document'>
        <Transcription model={model} />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-transcription/stories/ProperNounExtraction',
  render: DefaultStory,
  decorators: createStoryDecorators({ enableVectorIndex: true }),
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
```

- [ ] **Step 2: Verify in Storybook**

Run: `moon run storybook-react:serve` (port 9009), open `plugins/plugin-transcription/stories/ProperNounExtraction`.
Expected: messages stream in; "Amco", "Cyberdyne", "Sarah", "Emma", "David", "Peter", "Ink and Switch" render as reference chips; "Alex"/"Jennifer"/"TechGiant" render as plain text. Use the preview verification workflow (snapshot/screenshot) to confirm chips appear; check console for errors.

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-transcription/src/stories/ProperNounExtraction.stories.tsx
git commit -m "feat(plugin-transcription): proper-noun reference extraction story"
```

---

## Task 6: Index exports & final checks

**Files:**
- Modify (if needed): `packages/core/compute/assistant/src/extraction/index.ts` or the package's extraction entrypoint.

- [ ] **Step 1: Export the new public surface**

Ensure `ExtractProperNouns`, `ProperNouns`, `extractProperNouns`, `ExtractionHandlers`, `findReferences`, `insertReferences`, `processTranscriptMessage` are exported from the `@dxos/assistant/extraction` entrypoint; drop any export of the removed `extractionAnthropicFunction`/`ExtractionInput`/`ExtractionOutput`.

- [ ] **Step 2: Audit for casts**

Run: `git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'`
Expected: no new casts (the inferred Effect types avoid them). Justify or remove any hit.

- [ ] **Step 3: Lint + full package tests**

Run: `moon run :lint -- --fix` then `moon run assistant:test && moon run plugin-transcription:test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(assistant): export proper-noun extraction surface; cleanup"
```

---

## Validation points (from spec)

1. **Edge access** — Tasks 3/5 require the storybook/test identity to reach the edge AI service (`edge-remote`). If unreachable, recording the memoized fixture (Task 3) and the live story (Task 5) won't work; surface this immediately rather than faking output.
2. **Full-text tokenization** — Task 1 Step 4 is the gate. If "Sarah" → "Sarah Johnson" or "Ink and Switch" → "Ink & Switch" misses, adjust the query (per-token search, like the assistant DB-query blueprint) or accept the miss; record the decision.
