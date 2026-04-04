//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';

import { type Graph, type Node } from '@dxos/plugin-graph';

import { type DeckOperation } from '../../operations';
import { type LayoutMode, type ResolvedPart, type Settings } from '../../types';

const PLANK_NAME = 'Plank';

export type PlankContextValue = {
  /** The application graph. */
  graph: Graph.ExpandableGraph;
  /** The graph node for this plank. */
  node?: Node.Node;
  /** Current layout mode. */
  layoutMode: LayoutMode;
  /** Which part of the layout this plank occupies. */
  part: ResolvedPart;
  /** Deck settings. */
  settings?: Settings.Settings;
  /** Popover anchor ID for heading menus. */
  popoverAnchorId?: string;
  /** Callback for plank adjustments (close, solo, increment, companion). */
  onAdjust?: (id: string, type: DeckOperation.PartAdjustment) => void;
  /** Callback for plank resize. */
  onResize?: (id: string, size: number) => void;
  /** Callback to scroll a plank into view. */
  onScrollIntoView?: (id?: string) => void;
  /** Callback to change the companion. */
  onChangeCompanion?: (companion: string | null) => void;
};

export const [PlankProvider, usePlankContext] = createContext<PlankContextValue>(PLANK_NAME);
