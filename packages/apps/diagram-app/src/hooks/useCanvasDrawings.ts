//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { type Space } from '@dxos/client/echo';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { log } from '@dxos/log';
import * as Canvas from '@dxos/plugin-canvas/Canvas';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

export type CanvasDrawings = {
  /** The space's canvas diagrams, newest first (spec F-4.3, F-4.4). */
  drawings: Drawing.Drawing[];
  /** Whether some drawing's canvas has not loaded yet, so the list may still grow. */
  pending: boolean;
};

/** The space's drawings whose canvas is the canvas plugin's scene; a drawing's kind is known once its canvas loads. */
export const useCanvasDrawings = (space: Space): CanvasDrawings => {
  const all = useQuery(space.db, Filter.type(Drawing.Drawing));
  const [formats, setFormats] = useState<ReadonlyMap<string, boolean>>(new Map());

  useEffect(() => {
    let cancelled = false;
    for (const drawing of all) {
      if (formats.has(drawing.id)) {
        continue;
      }
      drawing.canvas.load().then(
        (canvas) => !cancelled && setFormats((prev) => new Map(prev).set(drawing.id, Canvas.isCanvas(canvas))),
        (err) => {
          log.warn('drawing canvas did not load', { id: drawing.id, err });
          !cancelled && setFormats((prev) => new Map(prev).set(drawing.id, false));
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
      pending: all.some((drawing) => !formats.has(drawing.id)),
    }),
    [all, formats],
  );
};
