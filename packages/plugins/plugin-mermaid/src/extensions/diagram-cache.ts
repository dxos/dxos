//
// Copyright 2026 DXOS.org
//

import * as Hooks from '@dxos/react-ui/Hooks';

/** Rendered this session, so a document opened again shows its diagrams at once. Errors are not kept: a retry may pass. */
const diagrams = new Map<string, string>();

/** Characters of SVG kept at most; the oldest diagrams go first. */
const MAX_CHARS = 4_000_000;

let chars = 0;

export const getDiagram = (key: string): string | undefined => {
  const svg = diagrams.get(key);
  if (svg !== undefined) {
    diagrams.delete(key);
    diagrams.set(key, svg);
  }
  return svg;
};

export const setDiagram = (key: string, svg: string) => {
  chars -= diagrams.get(key)?.length ?? 0;
  diagrams.delete(key);
  diagrams.set(key, svg);
  chars += svg.length;
  for (const [oldest, old] of diagrams) {
    if (chars <= MAX_CHARS || oldest === key) {
      break;
    }
    diagrams.delete(oldest);
    chars -= old.length;
  }
};

/** Each diagram's last rendered height, which a diagram not yet rendered this session reserves. */
export const diagramHeights = Hooks.createHeightMemory('mermaid');
