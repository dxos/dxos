//
// Copyright 2026 DXOS.org
//

// Pipeline testbench: drives the @dxos/transcription-pipeline runtime over a scripted transcript and
// writes the result into a real Markdown document (rendered via plugin-markdown). Variants exercise
// the pipeline from simplest (correction only) to full (correction + entity extraction + summary).
// The space is seeded with Person/Organization objects, so the extraction stage links recognized
// entities as `[Name](echo:/<id>)` markdown links — decorated as dx-anchors by the editor's preview
// extension. Per-stage telemetry is shown in a column beside the document.

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import React, { Fragment, useEffect, useMemo, useState } from 'react';

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { AppActivationEvents, AppCapabilities, AppNode, AppPlugin, AppSpace } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Filter, Query } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Graph, GraphBuilder, Node, NodeMatcher, qualifyId } from '@dxos/plugin-graph';
import { Markdown, MarkdownEvents } from '@dxos/plugin-markdown';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import {
  type CommitFn,
  PipelineRuntime,
  type Stage,
  type TelemetryEvent,
  TranscriptEvent,
  makeCorrectionStage,
  makeDatabaseLookup,
  makeExtractionStage,
  makeSummarizationStage,
} from '@dxos/transcription-pipeline';
import { type ContentBlock, Organization, Person } from '@dxos/types';
import { seedTestData } from '@dxos/types/testing';
import { isNonNullable } from '@dxos/util';

import { translations } from '#translations';

import { TranscriptionPlugin } from '../TranscriptionPlugin';
import { enableQueryIndexes } from './common';

// Properly-cased transcript that names seeded entities (DXOS, Cyberdyne, Amco, Sarah Johnson,
// Michael Chen) so the deterministic extraction heuristic + full-text lookup link them.
// TODO(burdon): Use trim (@dxos/util).
const SCRIPT = [
  'So I caught up with Sarah Johnson this morning',
  'We talked about the DXOS and Cyberdyne partnership',
  'Amco might join the project later this year',
  'I should follow up with Michael Chen next week',
];

type StageId = 'correct' | 'extract' | 'summarize';

const STAGE_FACTORY: Record<StageId, () => Stage<any, any>> = {
  correct: makeCorrectionStage,
  extract: makeExtractionStage,
  summarize: makeSummarizationStage,
};

/**
 * Story-only plugin exposing Markdown documents in the personal space as direct children of the
 * graph root, so the document renders as an article surface (mirrors MarkdownTranscription).
 */
const StoryGraphPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.transcription.story.pipelineGraph'), name: 'Pipeline Story Graph' }),
).pipe(
  AppPlugin.addAppGraphModule({
    activate: Effect.fnUntraced(function* () {
      const capabilities = yield* Capability.Service;
      const extensions = yield* GraphBuilder.createExtension({
        id: 'pipelineStoryDocs',
        match: NodeMatcher.whenRoot,
        connector: (_, get) =>
          Effect.gen(function* () {
            const client = capabilities.get(ClientCapabilities.Client);
            const space = AppSpace.getPersonalSpace(client);
            if (!space) {
              return [];
            }
            const docs = get(space.db.query(Filter.type(Markdown.Document)).atom);
            return docs
              .map((object) => AppNode.makeObject({ get, db: space.db, object, droppable: false }))
              .filter(isNonNullable);
          }),
      });
      return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
    }),
  }),
  Plugin.make,
);

type StoryArgs = { stages: readonly StageId[] };

const DefaultStory = ({ stages }: StoryArgs) => {
  const { graph } = useAppGraph();
  const [space] = useSpaces();
  const [doc] = useQuery(space?.db, Query.type(Markdown.Document));
  const attendableId = doc && qualifyId(Node.RootId, doc.id);
  const attentionAttrs = useAttentionAttributes(attendableId);
  const [telemetry, setTelemetry] = useState<TelemetryEvent[]>([]);
  const [summary, setSummary] = useState<string>();

  // Story renders the surface directly (no deck), so expand the doc node's actions.
  useEffect(() => {
    if (attendableId) {
      void Graph.expand(graph, attendableId, 'action');
    }
  }, [graph, attendableId]);

  // Run the pipeline over the scripted transcript, writing each stage's output into the document.
  useEffect(() => {
    const target = doc?.content?.target;
    if (!space || !target) {
      return;
    }
    let cancelled = false;
    setTelemetry([]);
    setSummary(undefined);

    const blocks: ContentBlock.Transcript[] = SCRIPT.map((text, index) => ({
      _tag: 'transcript',
      started: new Date(index * 1000).toISOString(),
      text,
    }));
    const stageList = stages.map((id) => STAGE_FACTORY[id]());

    // Re-render the whole document body from the (mutated-in-place) blocks; preferring corrected text.
    const render = () => {
      const body = blocks.map((block) => block.corrected ?? block.text).join('\n\n');
      Doc.updateText(target, 'content', `# Transcript\n\n${body}\n`);
    };
    render();

    const commit: CommitFn = (write, window) =>
      Effect.sync(() => {
        if (cancelled) {
          return;
        }
        for (const update of write.blockUpdates ?? []) {
          const block = window[update.index];
          if (block) {
            const { index: _index, ...patch } = update;
            Object.assign(block, patch);
          }
        }
        if (write.transcriptUpdate?.summary) {
          setSummary(write.transcriptUpdate.summary);
        }
        render();
      });

    const source = Stream.fromIterable([
      ...blocks.map((block) => TranscriptEvent.block(block)),
      TranscriptEvent.silence(5_000),
    ]);
    void EffectEx.runPromise(
      PipelineRuntime.run({
        source,
        stages: stageList,
        lookup: makeDatabaseLookup(space.db),
        commit,
        onTelemetry: (event) => {
          if (!cancelled) {
            setTelemetry((prev) => [...prev, event]);
          }
        },
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [space, doc, stages]);

  const data = useMemo(() => ({ subject: doc, attendableId: attendableId ?? 'story' }), [doc, attendableId]);

  if (!doc) {
    return <Loading data={{ doc: !!doc }} />;
  }

  return (
    <div role='none' className='grid grid-cols-2 gap-2 h-full overflow-hidden' {...attentionAttrs}>
      <div role='none' className='flex-1 min-w-0'>
        <Surface.Surface type={AppSurface.Article} data={data} limit={1} />
      </div>
      <div role='none' className='w-80 shrink-0 h-full overflow-y-auto border-l border-separator p-2 text-sm'>
        <h3 className='mb-1 font-medium'>Stages</h3>
        <div className='mb-3 text-description'>{stages.join(' → ') || '(none)'}</div>

        <h3 className='mb-1 font-medium'>Telemetry</h3>
        <div className='grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1'>
          {telemetry.map((event, index) => (
            <Fragment key={index}>
              <span>{event.stageId}</span>
              <span className='text-description'>{event.outcome}</span>
              <span className='text-right tabular-nums text-description'>{event.durationMs}ms</span>
            </Fragment>
          ))}
        </div>

        {summary && (
          <Fragment>
            <h3 className='mt-3 mb-1 font-medium'>Summary</h3>
            <p className='text-description'>{summary}</p>
          </Fragment>
        )}
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-transcription/stories/Pipeline',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings, MarkdownEvents.SetupExtensions],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Markdown.Document, Text.Text, Person.Person, Organization.Organization],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              yield* enableQueryIndexes(client.services.services);
              yield* Effect.promise(() => seedTestData(personalSpace));
              personalSpace.db.add(Markdown.make({ name: 'Transcript', content: '# Transcript\n\n' }));
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),
        SpacePlugin({}),
        MarkdownPlugin(),
        StoryGraphPlugin(),
        TranscriptionPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Simplest: correction only (punctuation / capitalization). */
export const CorrectionOnly: Story = { args: { stages: ['correct'] } };

/** Correction + entity extraction: recognized entities become dx-anchor links in the document. */
export const WithExtraction: Story = { args: { stages: ['correct', 'extract'] } };

/** Full pipeline: correction + extraction + a cumulative summary (shown in the side column). */
export const Full: Story = { args: { stages: ['correct', 'extract', 'summarize'] } };
