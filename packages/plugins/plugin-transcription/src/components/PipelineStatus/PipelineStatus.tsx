//
// Copyright 2026 DXOS.org
//

import React, { Fragment } from 'react';

import { type TelemetryEvent } from '@dxos/transcription-pipeline';

import { type TranscriptionCapabilities } from '#types';

export type PipelineStatusProps = {
  /** Live lifecycle phase published by the transcription driver. */
  phase?: TranscriptionCapabilities.PipelinePhase;
  /** Ordered stage ids being run (e.g. correct → extract → summarize). */
  stages?: readonly string[];
  /** Per-stage telemetry emitted by `PipelineRuntime`. */
  telemetry?: readonly TelemetryEvent[];
  /** Cumulative summary produced by the summarization stage. */
  summary?: string;
};

/**
 * Read-only status panel reflecting the transcription/pipeline state: mic + pipeline phase, the
 * active stage list, per-stage telemetry, and the running summary. Driven by the `PipelineStatus`
 * capability (phase) and `PipelineRuntime` telemetry.
 */
export const PipelineStatus = ({ phase = 'idle', stages, telemetry, summary }: PipelineStatusProps) => (
  <div className='flex flex-col gap-3 overflow-y-auto p-2 text-sm'>
    <Section title='Status'>
      <div className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-description'>
        <span>Mic</span>
        <span>{phase === 'recording' ? '● on' : '○ off'}</span>
        <span>Pipeline</span>
        <span>{phase}</span>
      </div>
    </Section>

    {stages && (
      <Section title='Stages'>
        <div className='text-description'>{stages.join(' → ') || '(none)'}</div>
      </Section>
    )}

    {telemetry && telemetry.length > 0 && (
      <Section title='Telemetry'>
        <div className='grid w-fit grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1'>
          {telemetry.map((event, index) => (
            <Fragment key={index}>
              <span>{event.stageId}</span>
              <span className='text-description'>{event.outcome}</span>
              <span className='text-right tabular-nums text-description'>{event.durationMs}ms</span>
            </Fragment>
          ))}
        </div>
      </Section>
    )}

    {summary && (
      <Section title='Summary'>
        <p className='text-description'>{summary}</p>
      </Section>
    )}
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className='mb-1 font-medium'>{title}</h3>
    {children}
  </div>
);
