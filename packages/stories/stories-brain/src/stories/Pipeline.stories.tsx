//
// Copyright 2026 DXOS.org
//

/**
 * Prototype harness for running the three pipeline packages over a shared ECHO space, one column per
 * concern:
 *
 * - `DocumentEditor`: markdown editor with POS decorations and a toolbar button that triggers the
 *   selected pipeline over the current text.
 * - `PipelinePanel`: a pipeline picker (RDF / Email / Transcription) + the selected pipeline's fixed
 *   stage list.
 * - `OutputPanel`: tabbed output — the `FactPanel` (facts + entities + predicates) or the live list
 *   of ECHO objects (`useQuery` over the space) the pipelines materialize.
 *
 * All three assemble via each package's uniform `.run()`:
 * - RDF (`FactPipeline` / `extractFactsStage` + normalize) extracts facts from the document text.
 * - Email (`EmailPipeline.run`) streams a fixed set of sample messages through summarize →
 *   extract-contacts → stats → extract-facts → buildThreads, persisting Person / Organization /
 *   Thread to the space (visible in the Objects tab) and surfacing extracted facts.
 * - Transcription (`TranscriptionPipeline.run`) drives the document lines as transcript events through
 *   the runtime, linking recognized entities against the space (seeded below). Its natural output is
 *   inline corrected/linked text (see the MarkdownTranscription story); here it demonstrates the
 *   assembly running against the shared space lookup.
 *
 * RDF and Email use the edge AI service (needs edge credentials); Transcription runs offline. POS
 * decorations use the offline stub tagger.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import React, { useCallback, useMemo, useState } from 'react';

import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { Obj, Query } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { stubParse } from '@dxos/nlp/testing';
import { Pipeline } from '@dxos/pipeline';
import { EmailPipeline, type FactIndexer, Thread } from '@dxos/pipeline-email';
import { type DocumentFacts, type Type, extractFactsStage, normalizeFactsStage } from '@dxos/pipeline-rdf';
import {
  type CommitFn,
  TranscriptEvent,
  TranscriptionPipeline,
  makeDatabaseLookup,
} from '@dxos/pipeline-transcription';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { type ContentBlock, Message, Organization, Person } from '@dxos/types';
import { trim } from '@dxos/util';

import { DocumentEditor, type EchoObjectItem, OutputPanel, type PipelineInfo, PipelinePanel } from '../components';
import { createMarkdownStoryDecorators } from '../testing/markdown-story-decorators';

const OWNER_EMAIL = 'alice@example.com';

const SAMPLE_CONTENT = trim`
  - Socrates was a Greek philosopher.
  - Plato was his student.
  - Aristotle was his student.
  - Socrates was a man.
  - All men are mortal.
  - Aristotle worked for the Lyceum.
`;

// Demo synonym table for the RDF normalize stage (keys are relation-key normalized, so inflections match).
const SYNONYMS: Record<string, string> = {
  'works for': 'works at',
  'employed by': 'works at',
};

const makeEmail = (messageId: string, email: string, subject: string, text: string): Message.Message =>
  Message.make({
    created: '2026-07-01T10:00:00.000Z',
    sender: { email },
    blocks: [{ _tag: 'text', text }],
    properties: { messageId, subject },
  });

// A small fixed inbox for the email pipeline (the story does not parse a dataset). Two messages
// share a subject so they group into one thread; the bodies carry obvious propositions to extract.
const SAMPLE_EMAILS: Message.Message[] = [
  makeEmail('<m-1@example.com>', OWNER_EMAIL, 'Q2 report', 'I will send the Q2 report to Bob by Friday.'),
  makeEmail('<m-2@example.com>', 'bob@example.com', 'Q2 report', 'Thanks Alice, Acme is looking forward to it.'),
  makeEmail(
    '<m-3@example.com>',
    'carol@globex.com',
    'Intro',
    'Carol from Globex here; Globex acquired Initech in 2021.',
  ),
];

const PIPELINES: PipelineInfo[] = [
  {
    id: 'rdf',
    label: 'RDF',
    stages: [
      { id: 'extract-facts', description: 'LLM proposition extraction (pipeline-rdf)', enabled: true },
      { id: 'normalize-predicates', description: 'Canonicalize predicate synonyms', enabled: true },
    ],
  },
  {
    id: 'email',
    label: 'Email',
    stages: [
      { id: 'summarize', description: 'Summarize + spam/keywords (LLM)', enabled: true },
      { id: 'extract-contacts', description: 'Person / Organization → ECHO space', enabled: true },
      { id: 'stats', description: 'Tally senders / recipients', enabled: true },
      { id: 'extract-facts', description: 'Index message facts (pipeline-rdf)', enabled: true },
      { id: 'threads', description: 'Group messages into canonical Threads', enabled: true },
    ],
  },
  {
    id: 'transcription',
    label: 'Transcription',
    stages: [
      { id: 'correction', description: 'Correct transcript text + link entities', enabled: true },
      { id: 'extraction', description: 'Extract structured references', enabled: true },
      { id: 'summarization', description: 'Summarize the transcript', enabled: true },
    ],
  },
];

type StoryArgs = {};

const DefaultStory = (_: StoryArgs) => {
  const [space] = useSpaces();
  const [pipelineId, setPipelineId] = useState(PIPELINES[0].id);
  const [facts, setFacts] = useState<Type.Fact[]>([]);
  const [busy, setBusy] = useState(false);

  // Live view of the ECHO objects the pipelines materialize (email creates Person/Org/Thread;
  // transcription links the seeded entities). Reactive: updates as stages persist to the space.
  const people = useQuery(space?.db, Query.type(Person.Person));
  const organizations = useQuery(space?.db, Query.type(Organization.Organization));
  const threads = useQuery(space?.db, Query.type(Thread));
  const objects = useMemo<EchoObjectItem[]>(
    () => [
      ...people.map((person) => ({ id: person.id, typename: 'Person', label: person.fullName ?? person.id })),
      ...organizations.map((org) => ({ id: org.id, typename: 'Organization', label: org.name ?? org.id })),
      ...threads.map((thread) => ({ id: thread.id, typename: 'Thread', label: thread.subject ?? thread.threadId })),
    ],
    [people, organizations, threads],
  );

  const runRdf = useCallback((text: string) => {
    const program = Effect.gen(function* () {
      const collected: DocumentFacts[] = [];
      yield* Stream.fromIterable([{ text, source: 'editor:document' }]).pipe(
        extractFactsStage(),
        normalizeFactsStage({ synonyms: SYNONYMS }),
        Pipeline.run({ sink: (out) => Effect.sync(() => collected.push(out)) }),
      );
      return collected.flatMap((item) => [...item.facts]);
    }).pipe(Effect.provide(Layer.fresh(AiServiceTestingPreset('edge-remote'))));
    return EffectEx.runPromise(program).then(setFacts);
  }, []);

  const runEmail = useCallback(() => {
    if (!space) {
      return Promise.resolve();
    }
    const aiLayer = Layer.fresh(AiServiceTestingPreset('edge-remote'));
    const collected: Type.Fact[] = [];
    // Extract facts per message via the RDF stage, collecting them for the Facts tab (persistence to a
    // FactStore is exercised elsewhere; the story only needs the extracted facts to display).
    const indexFacts: FactIndexer = (message) =>
      EffectEx.runPromise(
        Effect.gen(function* () {
          const out: DocumentFacts[] = [];
          yield* Stream.fromIterable([{ text: Message.extractText(message), source: `email:${message.id}` }]).pipe(
            extractFactsStage(),
            Pipeline.run({ sink: (item) => Effect.sync(() => out.push(item)) }),
          );
          return out.flatMap((item) => [...item.facts]);
        }).pipe(Effect.provide(aiLayer)),
      ).then((messageFacts) => {
        collected.push(...messageFacts);
        return messageFacts;
      });

    const program = EmailPipeline.run(SAMPLE_EMAILS, {
      db: space.db,
      indexFacts,
      ownerEmail: OWNER_EMAIL,
      now: new Date().toISOString(),
    }).pipe(Effect.provide(aiLayer));
    return EffectEx.runPromise(program).then(() => setFacts(collected));
  }, [space]);

  const runTranscription = useCallback(
    (text: string) => {
      if (!space) {
        return Promise.resolve();
      }
      const blocks: ContentBlock.Transcript[] = text
        .split('\n')
        .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
        .filter((line) => line.length > 0)
        .map((line, index) => ({ _tag: 'transcript', started: `s${index}`, text: line }));
      const source = Stream.fromIterable([
        ...blocks.map((block) => TranscriptEvent.block(block)),
        TranscriptEvent.silence(5_000),
      ]);
      // Mutate the window blocks in place (mirrors the runtime testbench commit).
      const commit: CommitFn = (write, window) =>
        Effect.sync(() => {
          for (const update of write.blockUpdates ?? []) {
            const block = window[update.index];
            if (block) {
              const { index: _index, ...patch } = update;
              Object.assign(block, patch);
            }
          }
        });
      // Transcription links against the space rather than producing facts; clear the fact view.
      setFacts([]);
      return EffectEx.runPromise(TranscriptionPipeline.run({ source, lookup: makeDatabaseLookup(space.db), commit }));
    },
    [space],
  );

  const handleRun = useCallback(
    (text: string) => {
      setBusy(true);
      const run = pipelineId === 'rdf' ? runRdf(text) : pipelineId === 'email' ? runEmail() : runTranscription(text);
      void run.catch(() => {}).finally(() => setBusy(false));
    },
    [pipelineId, runRdf, runEmail, runTranscription],
  );

  return (
    <div className='dx-container grid grid-cols-3 gap-2'>
      <DocumentEditor initialValue={SAMPLE_CONTENT} parse={stubParse} busy={busy} onRun={handleRun} />
      <PipelinePanel pipelines={PIPELINES} selected={pipelineId} onSelect={setPipelineId} busy={busy} />
      <OutputPanel facts={facts} objects={objects} />
    </div>
  );
};

const meta = {
  title: 'stories/stories-brain/stories/Pipeline',
  render: DefaultStory,
  decorators: createMarkdownStoryDecorators({
    layout: 'fullscreen',
    types: [Person.Person, Organization.Organization, Thread],
    // Seed a couple of entities so the transcription pipeline has something to link against and the
    // Objects tab is populated before the email pipeline runs.
    seed: ({ personalSpace }) =>
      Effect.promise(async () => {
        personalSpace.db.add(Obj.make(Organization.Organization, { name: 'Lyceum' }));
        personalSpace.db.add(Obj.make(Person.Person, { fullName: 'Socrates' }));
        await personalSpace.db.flush({ indexes: true });
      }),
    graphPlugin: { key: 'org.dxos.plugin.stories.pipeline.storyGraph', name: 'Pipeline Story Graph' },
  }),
  parameters: {
    controls: { disable: true },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
