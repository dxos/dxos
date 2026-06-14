//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';
import React, {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useId,
  useRef,
  useState,
} from 'react';

import { type ThemedClassName, Tooltip } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

/**
 * A single point in an object's edit history. Plain data — this component has no knowledge of
 * ECHO or automerge; a container maps domain history into this shape.
 */
export type ScrubberVersion = {
  /** Wall-clock time of the change in epoch milliseconds. */
  time: number;
  /** Optional author label (e.g. actor id). */
  author?: string;
  /** Optional short label shown in the tooltip. */
  label?: string;
  /** Magnitude of additions in this version (unitless "changes"). */
  added: number;
  /** Magnitude of deletions in this version (unitless "changes"). */
  removed: number;
};

export type HistoryScrubberProps = ThemedClassName<{
  /** Versions in chronological order (oldest first). */
  versions: ScrubberVersion[];
  /** Selected index (controlled). */
  value?: number;
  /** Initial selected index (uncontrolled); defaults to the newest version. */
  defaultValue?: number;
  /** Fired continuously while scrubbing. */
  onValueChange?: (index: number) => void;
  /** Fired when the user settles on a version (pointer-up / Enter). */
  onCommit?: (index: number) => void;
}>;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

/**
 * A horizontal diff-timeline scrubber. Each version is a segment whose stacked green (additions) /
 * red (deletions) fill encodes its magnitude, normalized across the timeline. A draggable playhead
 * scrubs through history; ←/→/Home/End step versions; hovering a segment reveals its stats.
 */
export const HistoryScrubber = ({
  classNames,
  versions,
  value,
  defaultValue,
  onValueChange,
  onCommit,
}: HistoryScrubberProps) => {
  const count = versions.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const labelId = useId();

  const [uncontrolled, setUncontrolled] = useState(() => clamp(defaultValue ?? count - 1, 0, Math.max(count - 1, 0)));
  const controlled = value !== undefined;
  const index = clamp(controlled ? value! : uncontrolled, 0, Math.max(count - 1, 0));

  const setIndex = useCallback(
    (next: number, commit = false) => {
      const clamped = clamp(next, 0, Math.max(count - 1, 0));
      if (!controlled) {
        setUncontrolled(clamped);
      }
      onValueChange?.(clamped);
      if (commit) {
        onCommit?.(clamped);
      }
    },
    [controlled, count, onValueChange, onCommit],
  );

  const indexFromClientX = useCallback(
    (clientX: number): number => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) {
        return index;
      }
      const ratio = (clientX - rect.left) / rect.width;
      return clamp(Math.floor(ratio * count), 0, count - 1);
    },
    [count, index],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (count === 0) {
        return;
      }
      event.preventDefault();
      dragging.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setIndex(indexFromClientX(event.clientX));
    },
    [count, indexFromClientX, setIndex],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) {
        return;
      }
      setIndex(indexFromClientX(event.clientX));
    },
    [indexFromClientX, setIndex],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) {
        return;
      }
      dragging.current = false;
      event.currentTarget.releasePointerCapture(event.pointerId);
      setIndex(indexFromClientX(event.clientX), true);
    },
    [indexFromClientX, setIndex],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          setIndex(index - 1, true);
          break;
        case 'ArrowRight':
          event.preventDefault();
          setIndex(index + 1, true);
          break;
        case 'Home':
          event.preventDefault();
          setIndex(0, true);
          break;
        case 'End':
          event.preventDefault();
          setIndex(count - 1, true);
          break;
      }
    },
    [count, index, setIndex],
  );

  if (count === 0) {
    return <div className={mx('dx-density-fine text-sm text-description p-2', classNames)}>No history.</div>;
  }

  const max = Math.max(...versions.map((version) => version.added + version.removed), 1);
  const selected = versions[index];

  return (
    <div className={mx('flex flex-col gap-1', classNames)}>
      <div
        ref={trackRef}
        role='slider'
        tabIndex={0}
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={count - 1}
        aria-valuenow={index}
        aria-valuetext={format(new Date(selected.time), 'PP p')}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        className='relative flex h-16 w-full touch-none select-none items-stretch rounded-sm bg-input-surface dx-focus-ring'
        data-testid='history-scrubber.track'
      >
        <Tooltip.Provider>
          {versions.map((version, segmentIndex) => {
            const addedPct = (version.added / max) * 100;
            const removedPct = (version.removed / max) * 100;
            return (
              <Tooltip.Trigger
                asChild
                key={segmentIndex}
                side='top'
                content={<VersionTooltip version={version} />}
              >
                <div
                  role='presentation'
                  onPointerEnter={() => dragging.current && setIndex(segmentIndex)}
                  className={mx(
                    'flex flex-1 cursor-pointer flex-col justify-end overflow-hidden border-e border-separator/30 last:border-e-0',
                    segmentIndex === index && 'bg-hover-surface',
                  )}
                  data-testid='history-scrubber.segment'
                >
                  <div className='w-full shrink-0 bg-red-500' style={{ height: `${removedPct}%` }} />
                  <div className='w-full shrink-0 bg-green-500' style={{ height: `${addedPct}%` }} />
                </div>
              </Tooltip.Trigger>
            );
          })}
        </Tooltip.Provider>

        {/* Playhead positioned at the center of the selected segment. */}
        <div
          aria-hidden
          className='pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-neutral-950 dark:bg-neutral-50'
          style={{ left: `${((index + 0.5) / count) * 100}%` }}
        />
      </div>

      <div id={labelId} className='flex items-baseline gap-2 text-xs text-description'>
        <span>{format(new Date(selected.time), 'PP p')}</span>
        {selected.author && <span className='truncate'>{selected.author}</span>}
        <span className='grow' />
        <DiffStats added={selected.added} removed={selected.removed} />
      </div>
    </div>
  );
};

const DiffStats = ({ added, removed }: { added: number; removed: number }) => (
  <span className='font-mono tabular-nums'>
    <span className='text-green-500'>+{added}</span> <span className='text-red-500'>-{removed}</span>
  </span>
);

const VersionTooltip = ({ version }: { version: ScrubberVersion }) => (
  <div className='flex flex-col gap-0.5 text-xs'>
    <span>{format(new Date(version.time), 'PP p')}</span>
    {version.author && <span className='text-description'>{version.author}</span>}
    {version.label && <span className='text-description'>{version.label}</span>}
    <DiffStats added={version.added} removed={version.removed} />
  </div>
);
