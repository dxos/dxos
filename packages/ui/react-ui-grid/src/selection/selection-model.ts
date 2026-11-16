//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';

import { type DxGridPosition, type DxGridRange, type DxGridRemoteSelection } from '@dxos/lit-grid';

/**
 * A cell named by the identity of its column and row, so it stays the same cell when rows are sorted, filtered or
 * inserted.
 */
export const GridCellId = Schema.Struct({ col: Schema.String, row: Schema.String });
export type GridCellId = typeof GridCellId.Type;

/**
 * A selection by cell identity. `anchor` is where it started, which is the focused cell, and `head` is the cell it was
 * extended to. It spans the rectangle between their current positions.
 */
export const GridSelection = Schema.Struct({ anchor: GridCellId, head: GridCellId });
export type GridSelection = typeof GridSelection.Type;

/**
 * Translates between a grid's visual positions and cell identities. Cells without one (headers, controls, draft rows)
 * map to `undefined`.
 */
export type GridAddressing = {
  toId: (position: DxGridPosition) => GridCellId | undefined;
  toPosition: (id: GridCellId) => DxGridPosition | undefined;
};

/** A collaborator's selection, with the name and colors to label it by. */
export type GridPeerSelection = {
  peerId: string;
  name: string;
  color: string;
  textColor?: string;
  selection: GridSelection;
};

export const toSelection = (addressing: GridAddressing, { start, end }: DxGridRange): GridSelection | undefined => {
  const anchor = addressing.toId(start);
  const head = addressing.toId(end);
  return anchor && head ? { anchor, head } : undefined;
};

/**
 * The visual range a selection covers now, or `undefined` once a row or column it names is gone or its ends no longer
 * share a plane.
 */
export const toRange = (addressing: GridAddressing, { anchor, head }: GridSelection): DxGridRange | undefined => {
  const start = addressing.toPosition(anchor);
  const end = addressing.toPosition(head);
  return start && end && start.plane === end.plane ? { start, end } : undefined;
};

const isSameCell = (a: GridCellId, b: GridCellId) => a.col === b.col && a.row === b.row;

const isSameSelection = (a: GridSelection | undefined, b: GridSelection | undefined) =>
  a === b || (!!a && !!b && isSameCell(a.anchor, b.anchor) && isSameCell(a.head, b.head));

/**
 * The selection state every grid shares: the local user's selection, which collaborators are sent, and theirs.
 */
export class GridSelectionModel {
  readonly local: Atom.Writable<GridSelection | undefined> = Atom.make<GridSelection | undefined>(undefined).pipe(
    Atom.keepAlive,
  );

  readonly peers: Atom.Writable<readonly GridPeerSelection[]> = Atom.make<readonly GridPeerSelection[]>([]).pipe(
    Atom.keepAlive,
  );

  constructor(private readonly _registry: Registry.AtomRegistry) {}

  getLocal(): GridSelection | undefined {
    return this._registry.get(this.local);
  }

  select(selection: GridSelection | undefined): void {
    if (!isSameSelection(this.getLocal(), selection)) {
      this._registry.set(this.local, selection);
    }
  }

  getPeers(): readonly GridPeerSelection[] {
    return this._registry.get(this.peers);
  }

  setPeers(peers: readonly GridPeerSelection[]): void {
    this._registry.set(this.peers, peers);
  }

  /** Collaborators' selections at their current positions, leaving out any that no longer resolve. */
  resolvePeers(addressing: GridAddressing, peers = this.getPeers()): DxGridRemoteSelection[] {
    return peers.flatMap(({ peerId, name, color, textColor, selection }) => {
      const range = toRange(addressing, selection);
      return range ? [{ id: peerId, label: name, color, textColor, ...range }] : [];
    });
  }
}
