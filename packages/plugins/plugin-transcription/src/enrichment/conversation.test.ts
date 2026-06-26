//
// Copyright 2024 DXOS.org
//

// Headless test that simulates a two-speaker conversation as a pair of Whisper streams and
// drives them through the (currently stubbed) Pass A enrichment and Pass B summarization
// operations. The handlers are deterministic placeholders — they don't call an LLM — so the
// test runs offline; switching to the real LLM-backed handlers later doesn't change the
// harness, just the assertions.
//
// What this verifies today:
//   - Conversation fixture parses to entities + speaker-tagged utterances.
//   - Stream simulator emits per-batch transcript blocks in chronological order.
//   - Pass A's sliding-window enrichment links seeded ECHO entities by name and surfaces
//     remaining capitalised tokens as candidates.
//   - Pass B accumulates a per-speaker summary and resolves "I" → speaker display name.

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

import { Skill, Operation, OperationHandlerSet } from '@dxos/compute';
import { Database, Feed, Obj, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { EntityId } from '@dxos/keys';
import { Organization, Person } from '@dxos/types';

import { EnrichTranscript, EnrichmentHandlers, SummarizeConversation } from './operations';
import { parseConversation } from './parser';
import { simulateStream } from './stream-simulator';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: OperationHandlerSet.make(...EnrichmentHandlers),
  types: [Person.Person, Organization.Organization, Skill.Skill, Feed.Feed],
  disableLlmMemoization: true,
});

describe('Transcript enrichment — conversation simulation', () => {
  it.scoped(
    'streams a two-speaker conversation through Pass A and Pass B (stub handlers)',
    Effect.fnUntraced(
      function* ({ expect }) {
        // 1. Load and parse the fixture.
        const fixturePath = path.join(path.dirname(url.fileURLToPath(import.meta.url)), 'conversation.txt');
        const conversation = parseConversation(fs.readFileSync(fixturePath, 'utf8'));
        expect(conversation.speakers).toEqual(['A', 'B']);
        expect(conversation.utterances.length).toBeGreaterThan(0);
        expect(conversation.entities.length).toBeGreaterThan(0);

        // 2. Seed the ECHO space with the fixture's entities. Map fixture types → schema types.
        const seeded: { id: string; typename: string; name: string }[] = [];
        for (const entity of conversation.entities) {
          if (entity.kind === 'Person') {
            const fullName = entity.fields.fullName ?? entity.fields.name;
            if (!fullName) {
              continue;
            }
            const person = yield* Database.add(Obj.make(Person.Person, { fullName }));
            seeded.push({ id: person.id, typename: Type.getTypename(Person.Person), name: fullName });
          } else if (entity.kind === 'Organization') {
            const name = entity.fields.name;
            if (!name) {
              continue;
            }
            const org = yield* Database.add(Obj.make(Organization.Organization, { name }));
            seeded.push({ id: org.id, typename: Type.getTypename(Organization.Organization), name });
          }
        }
        yield* Database.flush();
        expect(seeded.map((s) => s.name)).toContain('Chad');
        expect(seeded.map((s) => s.name)).toContain('Blue Yard');

        // 3. Generate the per-batch Whisper schedule. Batch by speaker so each batch maps to
        //    a single Pass-A invocation, mimicking what the live `useTranscriptEnrichment`
        //    hook will receive from the transcriber.
        const batches = simulateStream(conversation, { wordsPerSecond: 2.5, gapSeconds: 0.5 });
        expect(batches.length).toBe(conversation.utterances.length);
        expect(batches[0].offsetMs).toBe(0);
        expect(batches.every((b) => b.blocks.length > 0)).toBe(true);

        // 4. Run Pass A over each batch — sliding window of the last 4 blocks across speakers.
        const slidingWindow: { speaker: string; text: string; started: string }[] = [];
        const enrichments: {
          speaker: string;
          corrected: string;
          referenceIds: string[];
          candidates: { text: string }[];
        }[] = [];
        for (const batch of batches) {
          for (const block of batch.blocks) {
            slidingWindow.push({ speaker: batch.speaker, text: block.text, started: block.started });
            if (slidingWindow.length > 4) {
              slidingWindow.shift();
            }
          }
          const result = yield* Operation.invoke(EnrichTranscript, {
            window: slidingWindow,
            knownEntities: seeded,
          });
          // The new batch's entries are the *last* `batch.blocks.length` items in the window.
          const newEntries = result.blocks.slice(-batch.blocks.length);
          for (const block of newEntries) {
            const windowEntry = slidingWindow[block.index];
            enrichments.push({
              speaker: windowEntry.speaker,
              corrected: block.corrected,
              referenceIds: [...block.referenceIds],
              candidates: block.candidates.map((c) => ({ text: c.text })),
            });
          }
        }

        // 4a. Every block got a terminal-punctuated `corrected` value.
        for (const e of enrichments) {
          expect(e.corrected).toMatch(/[.!?]$/);
        }

        // 4b. The block containing "Chad" links to the seeded Person.
        const chadId = seeded.find((s) => s.name === 'Chad')!.id;
        const chadMention = enrichments.find((e) => /\bChad\b/.test(e.corrected));
        expect(chadMention).toBeDefined();
        expect(chadMention!.referenceIds).toContain(chadId);

        // 4c. Place names surface as candidates (not in our seed).
        const allCandidates = enrichments.flatMap((e) => e.candidates.map((c) => c.text));
        expect(allCandidates).toContain('Munich');
        expect(allCandidates).toContain('Los Angeles');

        // 5. Run Pass B once at the end of the conversation (the real pipeline would fire it
        //    after silence + interval; here we trigger it manually after the last batch).
        const speakerNames = { A: 'Speaker A', B: 'Speaker B' };
        const summary = yield* Operation.invoke(SummarizeConversation, {
          previousSummary: '',
          newUtterances: enrichments.map((e) => ({ speaker: e.speaker, text: e.corrected })),
          speakerNames,
          recentReferences: seeded.map((s) => ({ id: s.id, name: s.name })),
        });

        // 5a. Summary is non-empty and mentions both speakers.
        expect(summary.summary.length).toBeGreaterThan(0);
        expect(summary.summary).toContain('Speaker A');
        expect(summary.summary).toContain('Speaker B');

        // 5b. Resolved referents: every utterance that contains "I" picks up the speaker's name.
        const iUtterances = enrichments.filter((e) => /\bI\b/.test(e.corrected));
        expect(summary.resolvedReferents.length).toBe(iUtterances.length);
        for (const referent of summary.resolvedReferents) {
          expect(referent.surface).toBe('I');
          expect([speakerNames.A, speakerNames.B]).toContain(referent.referent);
        }
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );
});
