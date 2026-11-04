//
// Copyright 2026 DXOS.org
//

import type * as Registry from 'effect/reactivity/AtomRegistry';

import { type AwarenessProvider, type AwarenessState } from '@dxos/ui-editor';

import { type GridCellId, type GridPeerSelection, type GridSelectionModel } from './selection-model.ts';

// The awareness position's `anchor` and `head` are opaque strings; a grid puts a cell identity in each.

export const encodeCellId = ({ col, row }: GridCellId): string => JSON.stringify([col, row]);

export const decodeCellId = (value: string | undefined): GridCellId | undefined => {
  if (!value) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length === 2 && parsed.every((part) => typeof part === 'string')
      ? { col: parsed[0], row: parsed[1] }
      : undefined;
  } catch {
    return undefined;
  }
};

export const toPeerSelection = ({ peerId, info, position }: AwarenessState): GridPeerSelection | undefined => {
  const anchor = decodeCellId(position?.anchor);
  const head = decodeCellId(position?.head);
  if (!anchor || !head) {
    return undefined;
  }

  return {
    peerId,
    name: info.displayName,
    color: info.hue ? `var(--color-${info.hue}-border)` : info.darkColor,
    textColor: info.hue ? `var(--color-${info.hue}-fg)` : undefined,
    selection: { anchor, head },
  };
};

/**
 * Opens `provider`, publishes the model's local selection on it and mirrors collaborators' selections into the model.
 * Returns the function that undoes it, which closes the provider so collaborators drop this user's selection.
 */
export const bindAwareness = (
  registry: Registry.AtomRegistry,
  model: GridSelectionModel,
  provider: AwarenessProvider,
): (() => void) => {
  provider.open();

  const publish = () => {
    const selection = model.getLocal();
    provider.update(
      selection ? { anchor: encodeCellId(selection.anchor), head: encodeCellId(selection.head) } : undefined,
    );
  };
  const receive = () => {
    model.setPeers(provider.getRemoteStates().flatMap((state) => toPeerSelection(state) ?? []));
  };

  publish();
  receive();
  const unsubscribeLocal = registry.subscribe(model.local, publish);
  const unsubscribeRemote = provider.remoteStateChange.on(receive);
  return () => {
    unsubscribeLocal();
    unsubscribeRemote();
    provider.close();
    model.setPeers([]);
  };
};
