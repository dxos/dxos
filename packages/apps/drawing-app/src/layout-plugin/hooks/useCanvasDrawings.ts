//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo, useRef, useState } from 'react';

import { type Space } from '@dxos/client/echo';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import * as Canvas from '@dxos/plugin-canvas/Canvas';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

const RETRY_DELAYS = [1_000, 5_000, 20_000];

// A conversion replaces a drawing's canvas under the same id, so a drawing is classified per canvas.
const formatKey = (drawing: Drawing.Drawing) => `${drawing.id} ${drawing.canvas.uri}`;

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
  // The query updates only when the set of drawings changes, so each drawing is watched for a replaced canvas.
  const [canvases, setCanvases] = useState('');
  useEffect(() => {
    const update = () => setCanvases(all.map(formatKey).join('\n'));
    update();
    const unsubscribes = all.map((drawing) => Obj.subscribe(drawing, update));
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [all]);
  // Whether each drawing's canvas is a canvas diagram, by `formatKey`; `retrying` while a failed load waits to be
  // tried again.
  const [formats, setFormats] = useState<ReadonlyMap<string, boolean | 'retrying'>>(new Map());
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

  // A canvas not synced yet fails to load: its drawing is left out and tried again a few times as sync catches up.
  // Only the expected drawing holds the list pending meanwhile, so the route does not give it up for another.
  const retries = useRef({ attempts: new Map<string, number>(), timers: new Set<ReturnType<typeof setTimeout>>() });
  useEffect(() => {
    const { timers } = retries.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    let cancelled = false;
    for (const drawing of all) {
      const key = formatKey(drawing);
      if (formats.has(key)) {
        continue;
      }
      drawing.canvas.load().then(
        (canvas) => !cancelled && setFormats((prev) => new Map(prev).set(key, Canvas.isCanvas(canvas))),
        (err) => {
          if (cancelled) {
            return;
          }
          log.warn('drawing canvas did not load', { id: drawing.id, err });
          const { attempts, timers } = retries.current;
          const attempt = attempts.get(key) ?? 0;
          const retry = attempt < RETRY_DELAYS.length;
          setFormats((prev) => new Map(prev).set(key, retry ? 'retrying' : false));
          if (retry) {
            attempts.set(key, attempt + 1);
            const timer = setTimeout(() => {
              timers.delete(timer);
              setFormats((prev) => {
                const next = new Map(prev);
                next.delete(key);
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
  }, [all, canvases, formats]);

  return useMemo(
    () => ({
      // Object ids are time-ordered, so newest first is a reverse sort by id.
      drawings: all
        .filter((drawing) => formats.get(formatKey(drawing)) === true)
        .toSorted((left, right) => right.id.localeCompare(left.id)),
      pending:
        all.some((drawing) => !formats.has(formatKey(drawing))) ||
        all.some((drawing) => drawing.id === expected && formats.get(formatKey(drawing)) === 'retrying') ||
        (expected !== undefined && settled !== expected && !all.some(({ id }) => id === expected)),
    }),
    [all, canvases, formats, expected, settled],
  );
};
