//
// Copyright 2026 DXOS.org
//

/**
 * Prototype harness for running the three pipeline packages over a shared ECHO space, structured as
 * Inputs · Pipeline · Outputs:
 *
 * - `InputPanel` (Inputs): a tabbed source selector — a markdown Document editor (RDF), a Dataset
 *   picker (sample inbox → Email), and a Record tab whose mic captures a sample transcript
 *   (Transcription). The active tab's input is handed to the selected pipeline on run.
 * - `PipelinePanel` (Pipeline): a picker (RDF / Email / Transcription) + the selected pipeline's
 *   fixed stage list.
 * - `OutputPanel` (Outputs): tabbed output — the `FactPanel`, the live ECHO objects list (`useQuery`),
 *   a Stats tab of per-pipeline metrics, and pipeline-specific detail views (email messages +
 *   summaries, threads; transcription transcript + summary).
 *
 * All three assemble via each package's uniform `.run()` (`FactPipeline` / `EmailPipeline` /
 * `TranscriptionPipeline`). RDF and Email use the edge AI service (needs edge credentials);
 * Transcription runs offline. POS decorations use the offline stub tagger. Real audio capture is out
 * of scope — the Record tab replays a canned transcript.
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
import { type DocumentFacts, type RDF, extractFactsStage, normalizeFactsStage } from '@dxos/pipeline-rdf';
import {
  type CommitFn,
  TranscriptEvent,
  TranscriptionPipeline,
  makeDatabaseLookup,
} from '@dxos/pipeline-transcription';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { type ContentBlock, Message, Organization, Person } from '@dxos/types';
import { trim } from '@dxos/util';

import {
  type EchoObjectItem,
  type InputDataset,
  InputPanel,
  type InputPayload,
  type OutputDetail,
  OutputPanel,
  type PipelineInfo,
  PipelinePanel,
  type StatItem,
} from '../components';
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

const SAMPLE_TRANSCRIPT = trim`
  So I caught up with Socrates this morning.
  We talked through the Lyceum roadmap.
  Plato is joining the project next week.
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

// A small fixed inbox for the email pipeline. Two messages share a subject so they group into one
// thread; the bodies carry obvious propositions to extract.
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

const DATASETS: InputDataset[] = [
  {
    id: 'sample-inbox',
    label: 'Sample inbox',
    messages: SAMPLE_EMAILS.map((message) => ({
      id: message.id,
      from: message.sender.email ?? 'unknown',
      subject: String(message.properties?.subject ?? ''),
      preview: Message.extractText(message),
    })),
  },
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
  const [facts, setFacts] = useState<RDF.Fact[]>([]);
  const [stats, setStats] = useState<StatItem[]>([]);
  const [details, setDetails] = useState<OutputDetail[]>([]);
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
    return EffectEx.runPromise(program).then((extracted) => {
      setFacts(extracted);
      setDetails([]);
      setStats([
        { label: 'Facts', value: extracted.length },
        { label: 'Entities', value: new Set(extracted.flatMap(factEntities)).size },
        { label: 'Predicates', value: new Set(extracted.map((fact) => fact.assertion.predicate)).size },
      ]);
    });
  }, []);

  const runEmail = useCallback(() => {
    if (!space) {
      return Promise.resolve();
    }
    const aiLayer = Layer.fresh(AiServiceTestingPreset('edge-remote'));
    const collected: RDF.Fact[] = [];
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

    return EffectEx.runPromise(program).then((result) => {
      setFacts(collected);
      setStats([
        { label: 'Messages', value: result.stats.total },
        { label: 'Threads', value: result.threads.length },
        { label: 'Spam', value: result.stats.spam },
        { label: 'Facts', value: collected.length },
      ]);
      setDetails([
        { id: 'messages', label: 'Messages', content: <MessageList result={result} /> },
        { id: 'threads', label: 'Threads', content: <ThreadList result={result} /> },
      ]);
    });
  }, [space]);

  const runTranscription = useCallback(
    (text: string) => {
      if (!space) {
        return Promise.resolve();
      }
      const lines = text
        .split('\n')
        .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
        .filter((line) => line.length > 0);
      const blocks: ContentBlock.Transcript[] = lines.map((line, index) => ({
        _tag: 'transcript',
        started: `s${index}`,
        text: line,
      }));
      const source = Stream.fromIterable([
        ...blocks.map((block) => TranscriptEvent.block(block)),
        TranscriptEvent.silence(5_000),
      ]);
      let summary: string | undefined;
      const commit: CommitFn = (write, window) =>
        Effect.sync(() => {
          summary = write.transcriptUpdate?.summary ?? summary;
          for (const update of write.blockUpdates ?? []) {
            const block = window[update.index];
            if (block) {
              const { index: _index, ...patch } = update;
              Object.assign(block, patch);
            }
          }
        });

      setFacts([]);
      return EffectEx.runPromise(
        TranscriptionPipeline.run({ source, lookup: makeDatabaseLookup(space.db), commit }),
      ).then(() => {
        const corrected = blocks.map((block) => block.corrected ?? block.text);
        const linked = corrected.filter((line) => /\]\(echo:/.test(line)).length;
        setStats([
          { label: 'Blocks', value: blocks.length },
          { label: 'Linked blocks', value: linked },
          { label: 'Summary', value: summary ? 'yes' : 'no' },
        ]);
        setDetails([
          { id: 'transcript', label: 'Transcript', content: <TranscriptView lines={corrected} summary={summary} /> },
        ]);
      });
    },
    [space],
  );

  const handleRun = useCallback(
    (payload: InputPayload) => {
      setBusy(true);
      const documentText = payload.mode === 'document' ? payload.text : SAMPLE_CONTENT;
      const transcript = payload.mode === 'record' ? payload.transcript : documentText;
      const run =
        pipelineId === 'rdf'
          ? runRdf(documentText)
          : pipelineId === 'email'
            ? runEmail()
            : runTranscription(transcript);
      void run.catch(() => {}).finally(() => setBusy(false));
    },
    [pipelineId, runRdf, runEmail, runTranscription],
  );

  return (
    <div className='dx-container grid grid-cols-3 gap-2'>
      <InputPanel
        initialDocument={SAMPLE_CONTENT}
        parse={stubParse}
        datasets={DATASETS}
        sampleTranscript={SAMPLE_TRANSCRIPT}
        busy={busy}
        onRun={handleRun}
      />
      <PipelinePanel pipelines={PIPELINES} selected={pipelineId} onSelect={setPipelineId} busy={busy} />
      <OutputPanel facts={facts} objects={objects} stats={stats} details={details} />
    </div>
  );
};

const factEntities = (fact: RDF.Fact): string[] =>
  [fact.assertion.subject, fact.assertion.object].flatMap((term) => ('entity' in term ? [term.entity] : []));

const MessageList = ({
  result,
}: {
  result: {
    messages: readonly Message.Message[];
    summaries: ReadonlyArray<{ messageId: string; summary: { summary: string } }>;
  };
}) => (
  <div className='flex flex-col gap-2 p-2 h-full overflow-auto'>
    {result.messages.map((message) => {
      const messageId = String(message.properties?.messageId ?? message.id);
      const summary = result.summaries.find((entry) => entry.messageId === messageId)?.summary.summary;
      return (
        <div
          key={message.id}
          className='flex flex-col bg-card-surface border border-subdued-separator rounded-sm px-3 py-2'
        >
          <span className='font-medium truncate'>{String(message.properties?.subject ?? '')}</span>
          <span className='text-sm text-description truncate'>{message.sender.email}</span>
          <span className='text-sm'>{summary || Message.extractText(message)}</span>
        </div>
      );
    })}
  </div>
);

const ThreadList = ({ result }: { result: { threads: readonly Thread[] } }) => (
  <div className='flex flex-col gap-2 p-2 h-full overflow-auto'>
    {result.threads.map((thread) => (
      <div
        key={thread.id}
        className='flex flex-col bg-card-surface border border-subdued-separator rounded-sm px-3 py-2'
      >
        <span className='font-medium truncate'>{thread.subject}</span>
        <span className='text-sm text-description'>
          {thread.state} · {thread.messageIds.length} message(s) · {thread.participants.join(', ')}
        </span>
      </div>
    ))}
  </div>
);

const TranscriptView = ({ lines, summary }: { lines: readonly string[]; summary?: string }) => (
  <div className='flex flex-col gap-3 p-3 h-full overflow-auto'>
    {summary && (
      <div className='flex flex-col gap-1'>
        <span className='text-sm text-description'>Summary</span>
        <span className='text-sm'>{summary}</span>
      </div>
    )}
    <div className='flex flex-col gap-1'>
      <span className='text-sm text-description'>Transcript</span>
      {lines.map((line, index) => (
        <span key={index} className='text-sm'>
          {line}
        </span>
      ))}
    </div>
  </div>
);

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
