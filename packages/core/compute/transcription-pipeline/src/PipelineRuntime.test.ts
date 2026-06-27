//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { captureCommit } from './dispatch';
import { PipelineRuntime, type TelemetryEvent } from './PipelineRuntime';
import { StageWrite, type Stage } from './Stage';
import { makeCorrectionStage, makeSummarizationStage } from './stages';
import { SAMPLE_MEETING, scriptedSource } from './testing';
import { TranscriptEvent } from './TranscriptEvent';

describe('PipelineRuntime', () => {
  test('runs correction per block and summarizes on silence', async ({ expect }) => {
    const { commit, writes } = captureCommit();
    await EffectEx.runPromise(
      PipelineRuntime.run({
        source: scriptedSource(SAMPLE_MEETING),
        stages: [makeCorrectionStage(), makeSummarizationStage()],
        commit,
      }),
    );

    const corrected = writes.flatMap((write) => write.blockUpdates ?? []).map((update) => update.corrected);
    expect(corrected).toContain('So i think we should ship munich on friday.');

    const summaries = writes.map((write) => write.transcriptUpdate?.summary).filter(Boolean);
    expect(summaries.length).toBeGreaterThan(0);
  });

  test('honours disabled stage config', async ({ expect }) => {
    const { commit, writes } = captureCommit();
    await EffectEx.runPromise(
      PipelineRuntime.run({
        source: scriptedSource(SAMPLE_MEETING),
        stages: [makeCorrectionStage()],
        configs: [{ id: 'correct', enabled: false }],
        commit,
      }),
    );
    expect(writes).toHaveLength(0);
  });

  test('latest-wins interrupts an in-flight invocation', async ({ expect }) => {
    const telemetry: TelemetryEvent[] = [];
    // A slow stage so the synchronously-delivered second block interrupts the first's in-flight run.
    const slow: Stage<{ window: any[] }> = {
      id: 'slow',
      trigger: 'per-block',
      concurrency: 'latest-wins',
      run: () => Effect.sleep('50 millis').pipe(Effect.as(StageWrite.empty())),
    };
    const { commit } = captureCommit();
    const source = Stream.fromIterable([
      TranscriptEvent.block({ _tag: 'transcript', started: 's', text: 'one' }),
      TranscriptEvent.block({ _tag: 'transcript', started: 's', text: 'two' }),
    ]);
    await EffectEx.runPromise(
      PipelineRuntime.run({ source, stages: [slow], commit, onTelemetry: (event) => telemetry.push(event) }),
    );
    expect(telemetry.some((event) => event.outcome === 'interrupted')).toBe(true);
  });
});
