//
// Copyright 2026 DXOS.org
//

import { type Timeline, setPath, trackValue } from '@dxos/animation';
import { type Scene, findLayout } from '@dxos/scene';

/**
 * The document as it looks at `t` in `timeline`: each track on an element of `layout` (`<element>:<path>`) sets that
 * field to its sampled value. The result is drawn, never written.
 */
export const sampleDocument = (
  document: Scene.SceneDocument,
  layout: string,
  timeline: Timeline,
  t: number,
): Scene.SceneDocument => {
  const record = findLayout(document, layout);
  if (!record) {
    return document;
  }
  const tracks = Object.values(timeline.tracks).filter((track) => record.elements[track.target] !== undefined);
  if (tracks.length === 0) {
    return document;
  }
  const patch = <E extends object>(elements: Readonly<Record<string, E>>): Record<string, E> => {
    const next: Record<string, E> = { ...elements };
    for (const track of tracks) {
      const value = trackValue(track, t);
      const element = next[track.target];
      if (value !== undefined && element) {
        next[track.target] = { ...element, ...setPath(element, track.property, value) };
      }
    }
    return next;
  };
  return {
    ...document,
    layouts: document.layouts.map((entry) =>
      entry.id !== layout
        ? entry
        : entry.dim === '2d'
          ? { ...entry, elements: patch(entry.elements) }
          : { ...entry, elements: patch(entry.elements) },
    ),
  };
};
