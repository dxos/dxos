//
// Copyright 2026 DXOS.org
//

import * as Hooks from '@dxos/react-ui/Hooks';

/** A diagram as mermaid rendered it: its SVG, or why it could not. */
export type Diagram = { svg: string; error?: undefined } | { svg?: undefined; error: string };

/** Rendered this session, so a document opened again shows its diagrams at once. */
const diagrams = new Map<string, Diagram>();

const MAX_DIAGRAMS = 200;

export const getDiagram = (key: string): Diagram | undefined => diagrams.get(key);

export const setDiagram = (key: string, diagram: Diagram) => {
  diagrams.delete(key);
  diagrams.set(key, diagram);
  if (diagrams.size > MAX_DIAGRAMS) {
    const [oldest] = diagrams.keys();
    if (oldest !== undefined) {
      diagrams.delete(oldest);
    }
  }
};

/** Each diagram's last rendered height, which a diagram not yet rendered this session reserves. */
export const diagramHeights = Hooks.createHeightMemory('mermaid');
