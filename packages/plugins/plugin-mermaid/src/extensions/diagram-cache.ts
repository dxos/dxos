//
// Copyright 2026 DXOS.org
//

/** Rendered diagrams by key, so a document opened again shows its diagrams at once. */
export type DiagramCache = {
  get: (key: string) => string | undefined;
  set: (key: string, svg: string) => void;
};

/** Characters of keys and SVG kept at most; the least recently used diagrams go first. */
const MAX_CHARS = 4_000_000;

const size = (key: string, svg: string) => key.length + svg.length;

export const createDiagramCache = (): DiagramCache => {
  const diagrams = new Map<string, string>();
  let chars = 0;
  return {
    get: (key) => {
      const svg = diagrams.get(key);
      if (svg !== undefined) {
        diagrams.delete(key);
        diagrams.set(key, svg);
      }
      return svg;
    },
    set: (key, svg) => {
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
    },
  };
};
