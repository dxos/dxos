//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';

import type { Cell, Selection, Tool, Viewport } from './types';

export type CellGridAtoms<T = unknown> = {
  cells: Atom.Writable<ReadonlyMap<string, Cell<T>>>;
  viewport: Atom.Writable<Viewport>;
  selection: Atom.Writable<Selection>;
  playhead: Atom.Writable<number | null>;
  tool: Atom.Writable<Tool>;
};

export type CellGridAtomsOptions = {
  cellWidth?: number;
  cellHeight?: number;
};

export const defaultViewport = (options: CellGridAtomsOptions = {}): Viewport => ({
  scrollX: 0,
  scrollY: 0,
  baseCellWidth: options.cellWidth ?? 24,
  cellHeight: options.cellHeight ?? 24,
  zoomX: 1,
});

/**
 * Create a fresh set of atoms backing a CellGrid instance. Consumers may pass any of these as props
 * or substitute their own (e.g., a cells atom backed by ECHO).
 *
 * Atoms are marked keepAlive so they preserve state across transient unsubscribe windows (e.g. React
 * Strict Mode mount-unmount-remount). Consumers are responsible for the atoms' lifetime.
 */
export const createCellGridAtoms = <T = unknown>(options: CellGridAtomsOptions = {}): CellGridAtoms<T> => ({
  cells: Atom.keepAlive(Atom.make<ReadonlyMap<string, Cell<T>>>(new Map())),
  viewport: Atom.keepAlive(Atom.make<Viewport>(defaultViewport(options))),
  selection: Atom.keepAlive(Atom.make<Selection>({ range: null })),
  playhead: Atom.keepAlive(Atom.make<number | null>(null)),
  tool: Atom.keepAlive(Atom.make<Tool>('toggle')),
});
