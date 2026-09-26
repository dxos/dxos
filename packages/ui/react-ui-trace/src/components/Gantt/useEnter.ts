//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

/**
 * Which of `ids` arrived since the last frame.
 *
 * A caller draws an entering element at the place it came from — the event before it, the node that
 * spawned its lane — and the next frame draws it where it belongs, leaving a CSS transition to carry
 * it the rest of the way. That is all the bookkeeping an enter animation needs: everything else in
 * the drawing animates from its own previous value, which the browser already has.
 *
 * Nothing present on mount ever counts as entering — a chart that animates its whole history open on
 * first paint is noise, since the reader was not there to see it arrive.
 */
export const useEnter = (ids: readonly string[]): ((id: string) => boolean) => {
  const [settled, setSettled] = useState<ReadonlySet<string>>(() => new Set(ids));
  const entering = ids.some((id) => !settled.has(id));

  useEffect(() => {
    if (!entering) {
      return;
    }
    // The transition needs one painted frame at the origin to run from. This effect is already past
    // that paint, so the frame after it is where the resting value belongs.
    const frame = requestAnimationFrame(() => setSettled(new Set(ids)));
    return () => cancelAnimationFrame(frame);
  });

  return (id) => !settled.has(id);
};
