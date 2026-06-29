//
// Copyright 2026 DXOS.org
//

// Minimal mic → transcriber → pipeline tester with NO CodeMirror / editor / markdown. Isolates the
// capture + transcription path: a record button drives the real transcriber directly, raw segments
// are listed as they arrive, and a "Run pipeline" pass enriches the captured blocks (correction +
// entity extraction + summary) so the mic and the pipeline can be diagnosed independently of the UI.

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { EffectEx } from '@dxos/effect';
import { useSpaces } from '@dxos/react-client/echo';
import { Button } from '@dxos/react-ui';
import {
  type CommitFn,
  PipelineRuntime,
  type TelemetryEvent,
  TranscriptEvent,
  makeCorrectionStage,
  makeDatabaseLookup,
  makeExtractionStage,
  makeSummarizationStage,
} from '@dxos/transcription-pipeline';
import { type ContentBlock } from '@dxos/types';

import { useAudioTrack, useTranscriber } from '#hooks';

import { createStoryDecorators } from './common';

const RECORDER_INTERVAL_MS = 200;

type Phase = 'idle' | 'recording' | 'draining';

const DefaultStory = () => {
  const [space] = useSpaces();
  const [recording, setRecording] = useState(false);
  const [draining, setDraining] = useState(false);
  const [segments, setSegments] = useState<ContentBlock.Transcript[]>([]);
  const [enriched, setEnriched] = useState<string[]>([]);
  const [pipelineSummary, setPipelineSummary] = useState<string>();
  const [telemetry, setTelemetry] = useState<TelemetryEvent[]>([]);

  const phase: Phase = draining ? 'draining' : recording ? 'recording' : 'idle';
  // Keep the track alive through the drain so the transcriber can flush its buffer.
  const track = useAudioTrack(recording || draining);

  const handleSegments = useCallback(async (incoming: ContentBlock.Transcript[]) => {
    setSegments((prev) => [...prev, ...incoming]);
  }, []);

  const transcriberConfig = useMemo(
    () => ({ transcribeAfterChunksAmount: Math.round(4000 / RECORDER_INTERVAL_MS) }),
    [],
  );
  // Stable identity so re-renders don't recreate the transcriber (and drop its buffer).
  const recorderConfig = useMemo(() => ({ interval: RECORDER_INTERVAL_MS }), []);
  const transcriber = useTranscriber({
    audioStreamTrack: track,
    onSegments: handleSegments,
    transcriberConfig,
    recorderConfig,
  });

  useEffect(() => {
    if (!transcriber) {
      return;
    }
    let cancelled = false;
    void transcriber.open().then(
      () => {
        if (!cancelled && recording) {
          transcriber.startChunksRecording();
        }
      },
      (err) => !cancelled && console.error(err),
    );
    return () => {
      cancelled = true;
    };
  }, [transcriber, recording]);

  const handleRecord = useCallback(() => {
    setSegments([]);
    setEnriched([]);
    setPipelineSummary(undefined);
    setTelemetry([]);
    setRecording(true);
  }, []);

  const handleStop = useCallback(async () => {
    // Show 'draining' (and disable the button) before awaiting flush; the track stays alive because
    // useAudioTrack is gated on `recording || draining`.
    setRecording(false);
    setDraining(true);
    try {
      // Flush the buffered audio (final transcription) while the track is still alive.
      await transcriber?.flush();
    } finally {
      setDraining(false);
    }
  }, [transcriber]);

  const handleRunPipeline = useCallback(async () => {
    if (!space || segments.length === 0) {
      return;
    }
    setEnriched([]);
    setPipelineSummary(undefined);
    setTelemetry([]);
    const blocks: ContentBlock.Transcript[] = segments.map((segment) => ({ ...segment }));
    const source = Stream.fromIterable([
      ...blocks.map((block) => TranscriptEvent.block(block)),
      TranscriptEvent.silence(5_000),
    ]);
    const commit: CommitFn = (write, window) =>
      Effect.sync(() => {
        for (const update of write.blockUpdates ?? []) {
          const block = window[update.index];
          if (block) {
            const { index: _index, ...patch } = update;
            Object.assign(block, patch);
          }
        }
        if (write.transcriptUpdate?.summary) {
          setPipelineSummary(write.transcriptUpdate.summary);
        }
      });
    await EffectEx.runPromise(
      PipelineRuntime.run({
        source,
        stages: [makeCorrectionStage(), makeExtractionStage(), makeSummarizationStage()],
        lookup: makeDatabaseLookup(space.db),
        commit,
        onTelemetry: (event) => setTelemetry((prev) => [...prev, event]),
      }),
    );
    setEnriched(blocks.map((block) => block.corrected ?? block.text));
  }, [space, segments]);

  return (
    <div className='flex flex-col gap-3 p-4 text-sm'>
      <div className='flex items-center gap-3'>
        <Button onClick={() => (phase === 'idle' ? handleRecord() : handleStop())} disabled={phase === 'draining'}>
          {phase === 'recording' ? 'Stop' : phase === 'draining' ? 'Draining…' : 'Record'}
        </Button>
        <Button onClick={handleRunPipeline} disabled={phase !== 'idle' || segments.length === 0}>
          Run pipeline
        </Button>
      </div>

      <div className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-description'>
        <span>Mic</span>
        <span>{track ? '● on' : '○ off'}</span>
        <span>Transcriber</span>
        <span>{transcriber ? 'ready' : '—'}</span>
        <span>Phase</span>
        <span>{phase}</span>
        <span>Segments</span>
        <span>{segments.length}</span>
      </div>

      <div>
        <h3 className='mb-1 font-medium'>Raw transcript</h3>
        <div className='min-h-16 rounded border border-separator p-2'>
          {segments.length === 0 ? (
            <span className='text-description'>No transcription yet — click Record and speak.</span>
          ) : (
            segments.map((segment, index) => <div key={index}>{segment.text}</div>)
          )}
        </div>
      </div>

      {enriched.length > 0 && (
        <div>
          <h3 className='mb-1 font-medium'>Pipeline output</h3>
          <div className='rounded border border-separator p-2'>
            {enriched.map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
        </div>
      )}

      {pipelineSummary && (
        <div>
          <h3 className='mb-1 font-medium'>Summary</h3>
          <p className='text-description'>{pipelineSummary}</p>
        </div>
      )}

      {telemetry.length > 0 && (
        <div>
          <h3 className='mb-1 font-medium'>Telemetry</h3>
          <div className='grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 text-description'>
            {telemetry.map((event, index) => (
              <React.Fragment key={index}>
                <span>{event.stageId}</span>
                <span>{event.outcome}</span>
                <span className='text-right tabular-nums'>{event.durationMs}ms</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-transcription/stories/MicPipeline',
  render: DefaultStory,
  decorators: createStoryDecorators({ enableVectorIndex: true }),
  parameters: { layout: 'fullscreen', controls: { disable: true } },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
