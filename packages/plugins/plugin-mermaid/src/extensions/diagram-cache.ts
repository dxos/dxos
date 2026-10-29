//
// Copyright 2026 DXOS.org
//

/** Rendered this session, so a document opened again shows its diagrams at once. Errors are not kept: a retry may pass. */
const diagrams = new Map<string, string>();

/** Characters of keys and SVG kept at most; the least recently used diagrams go first. */
const MAX_CHARS = 4_000_000;

let chars = 0;

const size = (key: string, svg: string) => key.length + svg.length;

export const getDiagram = (key: string): string | undefined => {
  const svg = diagrams.get(key);
  if (svg !== undefined) {
    diagrams.delete(key);
    diagrams.set(key, svg);
  }
  return svg;
};

export const setDiagram = (key: string, svg: string) => {
  const previous = diagrams.get(key);
  if (previous !== undefined) {
    diagrams.delete(key);
    chars -= size(key, previous);
  }
  if (size(key, svg) > MAX_CHARS) {
    return;
  }
  diagrams.set(key, svg);
  chars += size(key, svg);
  for (const [oldest, old] of diagrams) {
    if (chars <= MAX_CHARS) {
      break;
    }
    diagrams.delete(oldest);
    chars -= size(oldest, old);
  }
};
