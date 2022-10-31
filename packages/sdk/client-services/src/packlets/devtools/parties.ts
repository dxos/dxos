//
// Copyright 2020 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import {
  GetPartySnapshotRequest,
  GetPartySnapshotResponse,
  SavePartySnapshotRequest,
  SavePartySnapshotResponse,
  SubscribeToPartiesRequest,
  SubscribeToPartiesResponse
} from '@dxos/protocols/proto/dxos/devtools/host';

import { DevtoolsServiceContext } from '../services/impl/devtools';

export const subscribeToParties = ({ echo }: DevtoolsServiceContext, { partyKeys = [] }: SubscribeToPartiesRequest) =>
  new Stream<SubscribeToPartiesResponse>(({ next }) => {
    const update = () => {
      const { value: parties } = echo.queryParties();
      const filteredParties = parties.filter(
        (party) => !partyKeys?.length || partyKeys.some((partyKey) => partyKey.equals(party.key))
      );

      next({
        parties: filteredParties.map((party) => {
          return {
            key: party.key,
            isOpen: party.isOpen,
            isActive: party.isActive,
            timeframe: party.timeframe,
            feeds: party.getFeeds().map((feed) => feed.key),
            properties: party.isOpen ? party.getPropertiesSet().expectOne().model.toObject() : undefined
          };
        })
      });
    };

    const partySubscriptions: Record<string, () => void> = {};
    const timeframeSubscriptions: Record<string, () => void> = {};
    const unsubscribe = echo.queryParties().subscribe((parties) => {
      parties.forEach((party) => {
        if (!partySubscriptions[party.key.toHex()]) {
          // Send updates on party changes.
          partySubscriptions[party.key.toHex()] = party.update.on(() => update());
          timeframeSubscriptions[party.key.toHex()] = party.timeframeUpdate.on(() => update());
        }
      });

      // Send new parties.
      update();
    });

    // Send initial parties.
    update();

    return () => {
      unsubscribe();
      Object.values(partySubscriptions).forEach((unsubscribe) => unsubscribe());
      Object.values(timeframeSubscriptions).forEach((unsubscribe) => unsubscribe());
    };
  });

export const getPartySnapshot = async (
  { echo }: DevtoolsServiceDependencies,
  request: GetPartySnapshotRequest
): Promise<GetPartySnapshotResponse> => {
  const snapshot = await echo.snapshotStore.load(request.partyKey);
  return { snapshot };
};

export const savePartySnapshot = async (
  { echo }: DevtoolsServiceDependencies,
  request: SavePartySnapshotRequest
): Promise<SavePartySnapshotResponse> => {
  const party = echo.getParty(request.partyKey);
  if (!party) {
    return {};
  }

  const snapshot = await party.createSnapshot();
  await echo.snapshotStore.save(snapshot);
  return { snapshot };
};
