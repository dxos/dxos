//
// Copyright 2026 DXOS.org
//

import type * as Registry from 'effect/reactivity/AtomRegistry';

import * as Awareness from '@dxos/protocols/Awareness';

import { type GridPeerSelection, GridSelection, type GridSelectionModel } from './selection-model.ts';

/** The awareness channel a grid's selection travels on, with the selection's corner cells by id as its value. */
export type GridAwareness = Awareness.Channel<GridSelection>;

/** Channel id for the selections on one object's grid. */
export const gridAwarenessChannelId = (objectId: string) => Awareness.channelId('selection', objectId);

/** Creates the channel for a grid of `objectId`, as `peer`; `Grid.Root` opens it while mounted. */
export const createGridAwareness = ({
  messenger,
  objectId,
  peer,
  timing,
}: Pick<Awareness.ChannelProps<GridSelection, typeof GridSelection.Encoded>, 'messenger' | 'peer' | 'timing'> & {
  objectId: string;
}): GridAwareness =>
  new Awareness.Channel({ messenger, channel: gridAwarenessChannelId(objectId), peer, schema: GridSelection, timing });

export const toPeerSelection = ({
  peerId,
  info,
  value,
}: Awareness.RemoteSession<GridSelection>): GridPeerSelection | undefined =>
  value && {
    peerId,
    name: info.displayName,
    color: info.hue ? `var(--color-${info.hue}-border)` : info.darkColor,
    textColor: info.hue ? `var(--color-${info.hue}-fg)` : undefined,
    selection: value,
  };

/**
 * Opens `channel`, publishes the model's local selection on it and mirrors collaborators' selections into the model,
 * one per member however many tabs they have open. Returns the function that undoes it, which closes the channel so
 * collaborators drop this user's selection.
 */
export const bindAwareness = (
  registry: Registry.AtomRegistry,
  model: GridSelectionModel,
  channel: GridAwareness,
): (() => void) => {
  channel.open();

  const publish = () => channel.update(model.getLocal());
  const receive = () => {
    const sessions = Awareness.latestPerPeer(channel.getSessions(), { prefer: ({ value }) => value !== undefined });
    model.setPeers(sessions.flatMap((session) => toPeerSelection(session) ?? []));
  };

  publish();
  receive();
  const unsubscribeLocal = registry.subscribe(model.local, publish);
  const unsubscribeRemote = channel.changed.on(receive);
  return () => {
    unsubscribeLocal();
    unsubscribeRemote();
    channel.close();
    model.setPeers([]);
  };
};
