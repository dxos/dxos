//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';

import { type Graph } from '@dxos/plugin-graph';

import { type DeckOperation } from '../../operations';
import { type LayoutMode, type PlankSizing, type ResolvedPart, type Settings } from '../../types';

const PLANK_NAME = 'Plank';

export type PlankContextValue = {
  /** The application graph. */
  graph: Graph.ExpandableGraph;
  /** Which part of the layout this plank occupies. */
  part: ResolvedPart;
  /** Current layout mode. */
  layoutMode: LayoutMode;
  /** Deck settings. */
  settings?: Settings.Settings;
  /** Popover anchor ID for heading menus. */
  popoverAnchorId?: string;
  /** ID of plank that should be scrolled into view. */
  scrollIntoView?: string;
  /** Persisted plank sizes keyed by plank ID. */
  plankSizing?: PlankSizing;
  /** Callback for plank adjustments (close, solo, increment, companion). */
  onAdjust?: (id: string, type: DeckOperation.PartAdjustment) => void;
  /** Callback for plank resize. */
  onResize?: (id: string, size: number) => void;
  /** Callback to clear scroll-into-view state. */
  onScrollIntoView?: (id?: string) => void;
  /** Callback to change the companion. */
  onChangeCompanion?: (companion: string | null) => void;
};

export const [PlankProvider, usePlankContext] = createContext<PlankContextValue>(PLANK_NAME);
