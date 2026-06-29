//
// Copyright 2026 DXOS.org
//

/**
 * End-to-end transcription into a real plugin-markdown editor: the single editor-output integration
 * test, unifying the former MarkdownTranscription, Pipeline and MicPipeline stories.
 *
 * - `Live` — live microphone via the real `TranscriptionDriver` (toolbar `Mic` button), streaming
 *   pending text into the document with inline confirm/cancel + entity linking (requires a mic).
 * - `Recording` / `RecordingIndicator` — seed the pending-text decoration (no mic) to show the
 *   recording preview / placeholder deterministically.
 * - `CorrectionOnly` / `WithExtraction` / `Full` — drive `PipelineRuntime` over a scripted transcript
 *   (correction → extraction → summarization), writing each stage into the doc; status + per-stage
 *   telemetry + summary render in the side panel via the shared `PipelineStatus` component.
 * - Space is seeded with Person/Organization entities so extraction links recognized names.
 */

import { type StateEffect } from '@codemirror/state';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import React, { useEffect, useMemo, useState } from 'react';

import { Surface, useAtomCapability, useCapabilities } from '@dxos/app-framework/ui';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Query } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { EffectEx } from '@dxos/effect';
import { Graph, Node, qualifyId } from '@dxos/plugin-graph';
import { Markdown, MarkdownCapabilities } from '@dxos/plugin-markdown';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { PipelineStatus } from '@dxos/react-ui-transcription';
import { Loading } from '@dxos/react-ui/testing';
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
import { appendPendingText, cancelPendingText, setPendingAnchor, setPendingInterim } from '@dxos/ui-editor';
import { trim } from '@dxos/util';

import { translations } from '#translations';
import { TranscriptionCapabilities } from '#types';

import { SAMPLE_CONTENT, createMarkdownStoryDecorators, enableQueryIndexes } from './testing';

const TRANSCRIPT = trim`
  So I caught up with Sarah Johnson this morning
  We talked about the DXOS and Cyberdyne partnership
  Amco might join the project later this year
  I should follow up with Michael Chen next week
`.split('\n');

type StageId = 'correct' | 'extract' | 'summarize';

const STAGE_FACTORY: Record<StageId, () => Stage<any, any>> = {
  correct: makeCorrectionStage,
  extract: makeExtractionStage,
  summarize: makeSummarizationStage,
};

type StoryArgs = {
  /**
   * When set, drives `PipelineRuntime` over the scripted transcript through these stages.
   */
  stages?: readonly StageId[];
  /**
   * Seeds the pending-text decoration directly (final/interim), bypassing audio capture, to
   * showcase the recording-state preview deterministically (no microphone).
   */
  seed?: { final?: string; interim?: string };
};

const DefaultStory = ({ stages, seed }: StoryArgs) => {
  const { graph } = useAppGraph();
  const [space] = useSpaces();
  const [doc] = useQuery(space?.db, Query.type(Markdown.Document));
  const attendableId = doc && qualifyId(Node.RootId, doc.id);
  // Mark the editor attended so its toolbar (and the contributed record action) are active.
  const attentionAttrs = useAttentionAttributes(attendableId);
  const [editorViews] = useCapabilities(MarkdownCapabilities.EditorViews);
  const status = useAtomCapability(TranscriptionCapabilities.PipelineStatus);
  const [telemetry, setTelemetry] = useState<TelemetryEvent[]>([]);
  const [summary, setSummary] = useState<string>();

  // The status panel is relevant for the live (driver phase) and scripted (telemetry) variants; the
  // seeded recording-preview variants are about the inline editor affordance only.
  const showStatus = !seed;

  // Story renders the surface directly (no deck), so expand the doc node's actions.
  useEffect(() => {
    if (attendableId) {
      void Graph.expand(graph, attendableId, 'action');
    }
  }, [graph, attendableId]);

  // Seed the pending-text decoration once the editor view has registered (no mic required).
  useEffect(() => {
    if (!attendableId || !editorViews) {
      return;
    }
    // Clear any previously-seeded decoration when seeding stops.
    if (!seed) {
      editorViews.get(attendableId)?.view.dispatch({ effects: cancelPendingText.of() });
      return;
    }
    let cancelled = false;
    const trySeed = () => {
      const entry = editorViews.get(attendableId);
      if (!entry) {
        return false;
      }
      // Anchor the pending block at the end of the document.
      const anchor = entry.view.state.doc.length;
      const effects: StateEffect<unknown>[] = [setPendingAnchor.of({ anchor, placeholder: 'Recording…' })];
      if (seed.final) {
        effects.push(appendPendingText.of(seed.final));
      }
      if (seed.interim) {
        effects.push(setPendingInterim.of(seed.interim));
      }
      entry.view.dispatch({ effects });
      return true;
    };
    if (trySeed()) {
      return;
    }

    const interval = setInterval(() => {
      if (cancelled || trySeed()) {
        clearInterval(interval);
      }
    }, 50);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [seed, attendableId, editorViews]);

  // Run the pipeline over the scripted transcript, writing each stage's output into the document.
  useEffect(() => {
    const target = doc?.content?.target;
    if (!stages || !space || !target) {
      return;
    }
    let cancelled = false;
    setTelemetry([]);
    setSummary(undefined);

    const blocks: ContentBlock.Transcript[] = TRANSCRIPT.map((text, index) => ({
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

  if (!showStatus) {
    return (
      <div className='contents' {...attentionAttrs}>
        <Surface.Surface type={AppSurface.Article} data={data} limit={1} />
      </div>
    );
  }

  return (
    <div role='none' className='dx-container grid grid-cols-[1fr_20rem] gap-2' {...attentionAttrs}>
      <div role='none' className='dx-expander'>
        <Surface.Surface type={AppSurface.Article} data={data} limit={1} />
      </div>
      <PipelineStatus
        phase={stages ? 'idle' : (status?.phase ?? 'idle')}
        stages={stages}
        telemetry={telemetry}
        summary={summary}
      />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-transcription/stories/Pipeline',
  render: DefaultStory,
  decorators: createMarkdownStoryDecorators({
    layout: 'fullscreen',
    types: [Person.Person, Organization.Organization],
    graphPlugin: {
      key: 'org.dxos.plugin.transcription.story.pipelineGraph',
      name: 'Transcription Pipeline Story Graph',
    },
    seed: ({ client, personalSpace }) =>
      Effect.gen(function* () {
        yield* enableQueryIndexes(client.services.services);
        yield* Effect.promise(() => seedTestData(personalSpace));
        personalSpace.db.add(Markdown.make({ name: 'Transcript', content: SAMPLE_CONTENT }));
        yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
      }),
  }),
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Live microphone via the real driver: streams transcription into the doc (requires a mic). */
export const Live: Story = {};

/** Scripted: correction only (punctuation / capitalization). */
export const WithCorrection: Story = {
  args: {
    stages: ['correct'],
  },
};

/** Scripted: correction + entity extraction (recognized entities become dx-anchor links). */
export const WithExtraction: Story = {
  args: {
    stages: ['correct', 'extract'],
  },
};

/** Scripted: correction + extraction + a cumulative summary (shown in the side panel). */
export const Full: Story = {
  args: {
    stages: ['correct', 'extract', 'summarize'],
  },
};
