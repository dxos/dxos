//
// Copyright 2026 DXOS.org
//

import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type FrameMeter, useFrameMeter } from '../../debug/index.ts';
import { sweepScroll } from './sweep.ts';

export type FeedDebugOptions = {
  /** What the pass ran under; the recorded line carries these rather than a story name. */
  scenario?: string;
  count: number;
  estimateSize?: number;
  streaming: boolean;
  /** Whether the outlines start on. Off: they are for a question, not for every reading. */
  enabled?: boolean;
};

export type FeedDebug = {
  /** Whether the item and block outlines are drawn. */
  debug: boolean;
  toggleDebug: () => void;
  /** Frame statistics and the control that records a pass. */
  meter: FrameMeter;
  /** Attach to the viewport: the sweep needs the element it is going to scroll. */
  viewportRef: RefObject<HTMLDivElement | null>;
  sweeping: boolean;
  /** Start a measured pass, or cancel the one running. */
  onSweep: () => void;
};

/**
 * Everything the harness measures itself with, in one place.
 *
 * Kept apart from the story deliberately: instrumentation accumulates — a meter, a sweep, a toggle,
 * a label, the refs and teardown each needs — and threaded through a component it slowly becomes
 * the component. As an aspect the story stays about the feed, and what is being measured can be
 * read, changed or dropped in one file.
 */
export const useFeedDebug = ({
  scenario,
  count,
  estimateSize,
  streaming,
  enabled = false,
}: FeedDebugOptions): FeedDebug => {
  const [debug, setDebug] = useState(enabled);
  const toggleDebug = useCallback(() => setDebug((value) => !value), []);

  const label = useMemo(
    () =>
      [scenario ?? 'mixed', `${count} msgs`, estimateSize ? `est ${estimateSize}` : undefined, streaming && 'streaming']
        .filter(Boolean)
        .join(' · '),
    [scenario, count, estimateSize, streaming],
  );

  const meter = useFrameMeter({ label });
  const viewportRef = useRef<HTMLDivElement>(null);
  const [sweeping, setSweeping] = useState(false);
  const cancelSweep = useRef<(() => void) | null>(null);

  // A measured pass has to be one repeatable gesture. Flinging 2,000 rows by hand is neither, so the
  // sweep runs the traversal and records what it cost: click, wait, read the clipboard.
  const onSweep = useCallback(() => {
    if (sweeping) {
      cancelSweep.current?.();
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    meter.record();
    setSweeping(true);
    cancelSweep.current = sweepScroll(viewport, {
      onDone: () => {
        cancelSweep.current = null;
        setSweeping(false);
        meter.record();
      },
    });
  }, [sweeping, meter]);

  useEffect(() => () => cancelSweep.current?.(), []);

  return { debug, toggleDebug, meter, viewportRef, sweeping, onSweep };
};
