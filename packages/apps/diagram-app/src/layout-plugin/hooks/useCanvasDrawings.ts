//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo, useRef, useState } from 'react';

import { type Space } from '@dxos/client/echo';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import * as Canvas from '@dxos/plugin-canvas/Canvas';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

const RETRY_DELAYS = [1_000, 5_000, 20_000];

export type CanvasDrawings = {
  /** The space's canvas diagrams, newest first (spec F-4.3, F-4.4). */
  drawings: Drawing.Drawing[];
  /** Whether the list may still grow: some drawing's canvas, or the expected drawing itself, has not loaded yet. */
  pending: boolean;
};

/**
 * The space's drawings whose canvas is the canvas plugin's scene; a drawing's kind is known once its canvas loads.
 * The query answers before every stored drawing has loaded, so the drawing the caller `expected` keeps the list
 * pending until its own load settles.
 */
export const useCanvasDrawings = (space: Space, expected?: string): CanvasDrawings => {
  const all = useQuery(space.db, Filter.type(Drawing.Drawing));
  const [formats, setFormats] = useState<ReadonlyMap<string, boolean>>(new Map());
  const [settled, setSettled] = useState<string>();

  useEffect(() => {
    if (!expected) {
      return;
    }
    let cancelled = false;
    const settle = () => !cancelled && setSettled(expected);
    // A drawing deleted or never synced here fails to load, which settles it too.
    space.db
      .makeRef(EID.make({ entityId: expected }))
      .load()
      .then(settle, settle);
    return () => {
      cancelled = true;
    };
  }, [space, expected]);

  // A canvas not synced yet fails to load: its drawing is left out, so the list is not held pending, and is tried
  // again a few times as sync catches up.
  const retries = useRef({ attempts: new Map<string, number>(), timers: new Set<ReturnType<typeof setTimeout>>() });
  useEffect(() => {
    const { timers } = retries.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    let cancelled = false;
    for (const drawing of all) {
      if (formats.has(drawing.id)) {
        continue;
      }
      drawing.canvas.load().then(
        (canvas) => !cancelled && setFormats((prev) => new Map(prev).set(drawing.id, Canvas.isCanvas(canvas))),
        (err) => {
          if (cancelled) {
            return;
          }
          log.warn('drawing canvas did not load', { id: drawing.id, err });
          setFormats((prev) => new Map(prev).set(drawing.id, false));
          const { attempts, timers } = retries.current;
          const attempt = attempts.get(drawing.id) ?? 0;
          if (attempt < RETRY_DELAYS.length) {
            attempts.set(drawing.id, attempt + 1);
            const timer = setTimeout(() => {
              timers.delete(timer);
              setFormats((prev) => {
                const next = new Map(prev);
                next.delete(drawing.id);
                return next;
              });
            }, RETRY_DELAYS[attempt]);
            timers.add(timer);
          }
        },
      );
    }
    return () => {
      cancelled = true;
    };
  }, [all, formats]);

  return useMemo(
    () => ({
      // Object ids are time-ordered, so newest first is a reverse sort by id.
      drawings: all
        .filter((drawing) => formats.get(drawing.id))
        .toSorted((left, right) => right.id.localeCompare(left.id)),
      pending:
        all.some((drawing) => !formats.has(drawing.id)) ||
        (expected !== undefined && settled !== expected && !all.some(({ id }) => id === expected)),
    }),
    [all, formats, expected, settled],
  );
};
