//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Stream from 'effect/Stream';
import React, { useEffect, useRef, useState } from 'react';

import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import * as Icon from '@dxos/react-ui/Icon';
import * as Tag from '@dxos/react-ui/Tag';

import { type AgentDemoInput, type TranscriptEntry } from '../testing/index.ts';
import { ProcessCard } from './ProcessCard.tsx';
import { type SpawnedProcess } from './types.ts';

export type AgentItem = SpawnedProcess<AgentDemoInput, AgentDemoInput, TranscriptEntry>;

/**
 * Sends the prompt once and collects the transcript the process pushes. The subscription also drives a
 * remote handle's status polling.
 */
const useTranscript = ({ handle, params }: AgentItem): TranscriptEntry[] => {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  // Survives a StrictMode remount, so the prompt is sent once however often the effect re-runs.
  const prompted = useRef(false);
  useEffect(() => {
    const fiber = Effect.runFork(
      Stream.runForEach(handle.subscribeOutputs(), (entry) =>
        Effect.sync(() =>
          setEntries((previous) => (previous.some(({ seq }) => seq === entry.seq) ? previous : [...previous, entry])),
        ),
      ),
    );
    if (!prompted.current) {
      prompted.current = true;
      void EffectEx.runPromise(handle.submitInput(params)).catch((error) => {
        prompted.current = false;
        log.warn('prompt failed', { pid: handle.pid, error });
      });
    }
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [handle, params]);
  return entries;
};

const TranscriptLine = ({ entry, done }: { entry: TranscriptEntry; done: boolean }) => {
  switch (entry.kind) {
    case 'prompt':
      return (
        <div className='self-end max-w-[85%] px-2 py-1 rounded-sm bg-group-surface' data-testid='transcript-prompt'>
          {entry.text}
        </div>
      );
    case 'thought':
      return <div className='text-fg-muted italic'>{entry.text}</div>;
    case 'tool-call':
      return (
        <div className='flex items-center gap-1 min-w-0' data-testid='transcript-tool-call'>
          <Icon.Icon
            icon={done ? 'ph--check--regular' : 'ph--circle-notch--regular'}
            classNames={done ? undefined : 'animate-spin'}
          />
          <Tag.Tag hue='sky' classNames='font-mono shrink-0'>
            {entry.tool}
          </Tag.Tag>
          <span className='font-mono text-fg-muted truncate'>{entry.text}</span>
        </div>
      );
    case 'tool-result':
      return (
        <div className='flex items-center gap-1 ps-5 min-w-0 font-mono text-fg-muted'>
          <Icon.Icon icon='ph--arrow-elbow-down-right--regular' />
          <span className='truncate'>{entry.text}</span>
        </div>
      );
    case 'answer':
      return (
        <div className='flex gap-1' data-testid='transcript-answer'>
          <Icon.Icon icon='ph--sparkle--regular' classNames='text-accent-text mt-0.5 shrink-0' />
          <span>{entry.text}</span>
        </div>
      );
  }
};

export type AgentTileProps = {
  data: AgentItem;
  /** Removes the card once its process has ended. */
  onRemove?: (item: AgentItem) => void;
};

/** A spawned agent's card: the process status above a read-only, live transcript of its work. */
export const AgentTile = ({ data: item, onRemove }: AgentTileProps) => {
  const entries = useTranscript(item);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [entries.length]);

  const toolCalls = entries.filter(({ kind }) => kind === 'tool-call').length;
  // A call is done once anything follows it.
  const settled = (index: number) => index < entries.length - 1;
  return (
    <ProcessCard
      location={item.location}
      handle={item.handle}
      progress={`${toolCalls} tool ${toolCalls === 1 ? 'call' : 'calls'}`}
      onRemove={() => onRemove?.(item)}
    >
      <div
        ref={scroller}
        className='flex flex-col gap-1.5 w-full h-56 overflow-y-auto p-2 rounded-sm border border-separator text-sm whitespace-normal break-words'
        data-testid='agent-transcript'
      >
        {entries.map((entry, index) => (
          <TranscriptLine key={entry.seq} entry={entry} done={settled(index)} />
        ))}
      </div>
    </ProcessCard>
  );
};
