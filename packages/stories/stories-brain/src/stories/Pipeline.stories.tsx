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
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Provider } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useCapability } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { stubParse } from '@dxos/nlp/testing';
import { Pipeline } from '@dxos/pipeline';
import { EmailPipeline, type FactIndexer, Thread } from '@dxos/pipeline-email';
import { loadEnronMessages } from '@dxos/pipeline-email/testing';
import { type DocumentFacts, type RDF, extractFactsStage, normalizeFactsStage } from '@dxos/pipeline-rdf';
import {
  type CommitFn,
  TranscriptEvent,
  TranscriptionPipeline,
  makeDatabaseLookup,
} from '@dxos/pipeline-transcription';
import { BrainPlugin } from '@dxos/plugin-brain/plugin';
import { BrainCapabilities } from '@dxos/plugin-brain/types';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Markdown } from '@dxos/plugin-markdown';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { ProgressPlugin } from '@dxos/plugin-progress/plugin';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { TranscriptionPlugin } from '@dxos/plugin-transcription/plugin';
import { useSpaces } from '@dxos/react-client/echo';
import { withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { ModuleContainer } from '@dxos/story-modules';
import { type ContentBlock, Message, Organization, Person } from '@dxos/types';
import { trim } from '@dxos/util';

import {
  type InputDataset,
  type InputDatasetMessage,
  type InputMode,
  type InputPayload,
  type OutputDetail,
  type PipelineInfo,
  type StatItem,
} from '../components';
import { PIPELINE_RUN, PipelineStoryContext } from '../modules';
import { Module, StoryModulesPlugin } from '../testing/modules';

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

const toPreview = (message: Message.Message): InputDatasetMessage => ({
  id: message.id,
  from: message.sender.email ?? 'unknown',
  subject: String(message.properties?.subject ?? ''),
  body: Message.extractText(message),
});

// The only dataset offered; its messages are empty until loaded on demand from the Enron parquet.
const ENRON_DATASET: InputDataset = { id: 'enron', label: 'Enron', messages: [] };

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

// The input tab and the pipeline are two views of one selection: each input feeds its natural
// pipeline, so selecting either keeps the other in sync and the active input always drives the run.
const PIPELINE_FOR_MODE: Record<InputMode, string> = { document: 'rdf', dataset: 'email', record: 'transcription' };
const MODE_FOR_PIPELINE: Record<string, InputMode> = { rdf: 'document', email: 'dataset', transcription: 'record' };

// Selects the AI backend the LLM stages run against: hosted DXOS edge (Claude) or a local Ollama
// instance. For Ollama, `model` is the llama DXN and extraction runs in lenient (non-strict) mode,
// since local models reliably fail structured `generateObject`.
type AiConfig = { preset: 'edge-remote' | 'ollama'; model?: string };

type StoryArgs = { ai: AiConfig };

const DefaultStory = ({ ai }: StoryArgs) => {
  const [space] = useSpaces();
  const registry = useCapability(BrainCapabilities.FactStoreRegistry);
  const progress = useCapability(AppCapabilities.ProgressRegistry);
  // Fact-extraction options for the active backend (undefined → pipeline-rdf's Claude/edge defaults).
  const extractOptions = useMemo<RDF.ExtractOptions | undefined>(
    () => (ai.preset === 'ollama' ? { model: ai.model, provider: Provider.ollama.id, strict: false } : undefined),
    [ai],
  );
  const [pipelineId, setPipelineId] = useState(PIPELINES[0].id);
  const [stats, setStats] = useState<StatItem[]>([]);
  const [details, setDetails] = useState<OutputDetail[]>([]);
  // Current input reported by the InputPanel (the run trigger lives in the pipeline column).
  const [input, setInput] = useState<InputPayload>({ mode: 'document', text: SAMPLE_CONTENT });
  // The messages the email pipeline runs over: empty until Enron is loaded (the only dataset).
  const [emails, setEmails] = useState<Message.Message[]>([]);
  const [datasets, setDatasets] = useState<InputDataset[]>([ENRON_DATASET]);
  // Interrupts the in-flight run (Stop); set by whichever run is active.
  const interruptRef = useRef<(() => void) | null>(null);

  const runRdf = useCallback(
    (text: string, handle: AppCapabilities.ProgressMonitor) => {
      if (!space) {
        return Promise.resolve();
      }
      const startedMs = Date.now();
      const collected: DocumentFacts[] = [];
      const program = Effect.gen(function* () {
        // Extract one proposition per line/sentence rather than the whole document in a single call:
        // weaker local models (e.g. llama3.2) emit malformed JSON for multi-sentence prompts, so
        // per-proposition inputs are what make them extract cleanly (matching the benchmark corpus).
        yield* Stream.fromIterable(toDocs(text)).pipe(
          extractFactsStage(extractOptions),
          normalizeFactsStage({ synonyms: SYNONYMS }),
          Pipeline.run({
            // Stream facts into Brain's FactStore as each document is emitted (the output module reads
            // them reactively), and advance the progress monitor.
            sink: (out) =>
              Effect.gen(function* () {
                collected.push(out);
                handle.advance();
                yield* registry.forSpace(space.id).putFacts([...out.facts]);
              }),
          }),
        );
        return collected.flatMap((item) => [...item.facts]);
      }).pipe(Effect.provide(Layer.fresh(AiServiceTestingPreset(ai.preset))));
      const { promise, interrupt } = runInterruptible(program);
      interruptRef.current = interrupt;
      return promise.then((extracted) => {
        setStats([
          { label: 'Facts', value: extracted.length },
          { label: 'Entities', value: new Set(extracted.flatMap(factEntities)).size },
          { label: 'Predicates', value: new Set(extracted.map((fact) => fact.assertion.predicate)).size },
          ...rateStats(extracted.length, startedMs, 'facts'),
        ]);
      });
    },
    [ai.preset, extractOptions, registry, space],
  );

  const runEmail = useCallback(
    (handle: AppCapabilities.ProgressMonitor) => {
      if (!space) {
        return Promise.resolve();
      }

      const startedMs = Date.now();
      const aiLayer = Layer.fresh(AiServiceTestingPreset(ai.preset));

      const collected: RDF.Fact[] = [];
      const indexFacts: FactIndexer = (message) =>
        EffectEx.runPromise(
          Effect.gen(function* () {
            const out: DocumentFacts[] = [];
            yield* Stream.fromIterable([{ text: Message.extractText(message), source: `email:${message.id}` }]).pipe(
              extractFactsStage(extractOptions),
              Pipeline.run({ sink: (item) => Effect.sync(() => out.push(item)) }),
            );

            return out.flatMap((item) => [...item.facts]);
          }).pipe(Effect.provide(aiLayer)),
        ).then((messageFacts) => {
          collected.push(...messageFacts);
          handle.advance();
          // Stream this message's facts into Brain's FactStore as it is processed, not only at the end.
          void EffectEx.runPromise(registry.forSpace(space.id).putFacts(messageFacts));
          return messageFacts;
        });

      const program = EmailPipeline.run(emails, {
        db: space.db,
        indexFacts,
        ownerEmail: OWNER_EMAIL,
        now: new Date().toISOString(),
      }).pipe(Effect.provide(aiLayer));

      const { promise, interrupt } = runInterruptible(program);
      interruptRef.current = interrupt;
      return promise.then((result) => {
        setStats([
          { label: 'Messages', value: result.stats.total },
          { label: 'Threads', value: result.threads.length },
          { label: 'Spam', value: result.stats.spam },
          { label: 'Facts', value: collected.length },
          ...rateStats(result.stats.total, startedMs, 'msg'),
        ]);
        setDetails([
          { id: 'messages', label: 'Messages', content: <MessageList result={result} /> },
          { id: 'threads', label: 'Threads', content: <ThreadList result={result} /> },
        ]);
      });
    },
    [space, emails, ai.preset, extractOptions, registry],
  );

  // Load the first `count` Enron messages from the dataset parquet (over HTTP) and make them the
  // email pipeline's input; the Dataset tab preview updates to the loaded messages.
  const handleLoadDataset = useCallback(
    (count: number) => {
      const handle = progress.register(PIPELINE_RUN, { label: 'Loading dataset' });
      void loadEnronMessages({ count })
        .then((loaded) => {
          setEmails(loaded);
          setDatasets([{ id: 'enron', label: `Enron (${loaded.length})`, messages: loaded.map(toPreview) }]);
        })
        .catch(() => {})
        .finally(() => handle.remove());
    },
    [progress],
  );

  const runTranscription = useCallback(
    (text: string, handle: AppCapabilities.ProgressMonitor) => {
      if (!space) {
        return Promise.resolve();
      }
      const startedMs = Date.now();
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
          handle.advance();
        });

      const { promise, interrupt } = runInterruptible(
        TranscriptionPipeline.run({ source, lookup: makeDatabaseLookup(space.db), commit }),
      );
      interruptRef.current = interrupt;
      return promise.then(() => {
        const corrected = blocks.map((block) => block.corrected ?? block.text);
        const linked = corrected.filter((line) => /\]\(echo:/.test(line)).length;
        setStats([
          { label: 'Blocks', value: blocks.length },
          { label: 'Linked blocks', value: linked },
          { label: 'Summary', value: summary ? 'yes' : 'no' },
          ...rateStats(blocks.length, startedMs, 'blocks'),
        ]);
        setDetails([
          { id: 'transcript', label: 'Transcript', content: <TranscriptView lines={corrected} summary={summary} /> },
        ]);
      });
    },
    [space],
  );

  // Start the selected pipeline over the current input; clear the store + views so results stream in
  // fresh, and register a progress task (modules derive "running"/progress + busy from it).
  const handleStart = useCallback(() => {
    if (!space) {
      return;
    }
    setStats([]);
    setDetails([]);
    void EffectEx.runPromise(registry.forSpace(space.id).clear());
    const handle = progress.register(PIPELINE_RUN, {
      label: 'Pipeline run',
      onCancel: () => interruptRef.current?.(),
    });
    const documentText = input.mode === 'document' ? input.text : SAMPLE_CONTENT;
    const transcript = input.mode === 'record' ? input.transcript : documentText;
    const run =
      pipelineId === 'rdf'
        ? runRdf(documentText, handle)
        : pipelineId === 'email'
          ? runEmail(handle)
          : runTranscription(transcript, handle);
    void run
      // Surface a failed run in the Stats tab rather than silently doing nothing (e.g. an unreachable
      // backend or a model whose output could not be parsed).
      .catch((error) => setStats([{ label: 'Error', value: error instanceof Error ? error.message : String(error) }]))
      .finally(() => {
        handle.remove();
        interruptRef.current = null;
      });
  }, [space, registry, progress, pipelineId, input, runRdf, runEmail, runTranscription]);

  const handleStop = useCallback(() => {
    progress.cancel(PIPELINE_RUN);
  }, [progress]);

  // TODO(burdon): PipelineStoryContext.
  return (
    <PipelineStoryContext.Provider
      value={{
        mode: MODE_FOR_PIPELINE[pipelineId] ?? 'document',
        onModeChange: (next) => setPipelineId(PIPELINE_FOR_MODE[next]),
        initialDocument: SAMPLE_CONTENT,
        parse: stubParse,
        datasets,
        sampleTranscript: SAMPLE_TRANSCRIPT,
        onLoadDataset: handleLoadDataset,
        onInput: setInput,
        pipelines: PIPELINES,
        selected: pipelineId,
        onSelect: setPipelineId,
        onStart: handleStart,
        onStop: handleStop,
        stats,
        details,
      }}
    >
      <ModuleContainer layout={[[Module.Input], [Module.Pipeline], [Module.Output]]} />
    </PipelineStoryContext.Provider>
  );
};

// Split document text into per-proposition extraction inputs, on newlines or sentence boundaries, so
// each LLM call sees a single sentence (weaker local models mangle multi-sentence prompts).
const toDocs = (text: string): { readonly text: string; readonly source: string }[] =>
  text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((part) => part.replace(/^\s*[-*]\s*/, '').trim())
    .filter((part) => part.length > 0)
    .map((part, index) => ({ text: part, source: `doc-${index}` }));

const factEntities = (fact: RDF.Fact): string[] =>
  [fact.assertion.subject, fact.assertion.object].flatMap((term) => ('entity' in term ? [term.entity] : []));

const round = (value: number): number => Math.round(value * 100) / 100;

// Elapsed wall-clock + throughput (items/s) for a run of `count` items since `startedMs`.
const rateStats = (count: number, startedMs: number, unit: string): StatItem[] => {
  const seconds = Math.max(1, Date.now() - startedMs) / 1000;
  return [
    { label: 'Elapsed (s)', value: round(seconds) },
    { label: `Throughput (${unit}/s)`, value: round(count / seconds) },
  ];
};

type Interruptible<A> = { readonly promise: Promise<A>; readonly interrupt: () => void };

// Fork a fully-provided program so the run can be interrupted mid-flight (the Stop button): the
// promise settles when the fiber completes, rejects on failure/interruption.
const runInterruptible = <A, E>(program: Effect.Effect<A, E, never>): Interruptible<A> => {
  const fiber = Effect.runFork(program);
  const promise = new Promise<A>((resolve, reject) => {
    fiber.addObserver((exit) =>
      Exit.match(exit, { onSuccess: resolve, onFailure: (cause) => reject(Cause.squash(cause)) }),
    );
  });
  return {
    promise,
    interrupt: () => {
      void Effect.runFork(Fiber.interrupt(fiber));
    },
  };
};

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
  title: 'stories/stories-brain/Pipeline',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Markdown.Document, Text.Text, Person.Person, Organization.Organization, Thread],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace: space } = yield* initializeIdentity(client);
              // Seed a couple of entities so the transcription pipeline has something to link against
              // and the Objects tab is populated before the email pipeline runs.
              // TODO(burdon): From const.
              space.db.add(Obj.make(Organization.Organization, { name: 'Lyceum' }));
              space.db.add(Obj.make(Person.Person, { fullName: 'Socrates' }));
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
        SpacePlugin({}),
        MarkdownPlugin(),
        TranscriptionPlugin(),
        BrainPlugin(),
        ProgressPlugin(),
        StoryModulesPlugin(),
        StorybookPlugin({}),
      ],
    }),
  ],
  args: {
    ai: { preset: 'edge-remote' },
  },
  parameters: {
    controls: { disable: true },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    ai: {
      preset: 'edge-remote',
      model: 'claude-haiku-3-opus-latest',
    },
  },
};

export const Ollama: Story = {
  args: {
    ai: {
      preset: 'ollama',
      model: 'com.meta.model.llama-3-2-3b.instruct',
    },
  },
};
