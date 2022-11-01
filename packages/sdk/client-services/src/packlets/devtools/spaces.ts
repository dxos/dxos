//
// Copyright 2020 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { Space } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { SubscribeToPartiesRequest, SubscribeToPartiesResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { PartyMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';

import { ServiceContext } from '../services';

export const subscribeToSpaces = (context: ServiceContext, { partyKeys = [] }: SubscribeToPartiesRequest) =>
  new Stream<SubscribeToPartiesResponse>(({ next }) => {
    const update = async () => {
      await context.initialized.wait();
      const parties: Space[] = [...context.spaceManager!.spaces.values()];
      console.log('Spaces: ', parties);
      const filteredParties = parties.filter(
        (party) => !partyKeys?.length || partyKeys.some((partyKey) => partyKey.equals(party.key))
      );

      next({
        parties: filteredParties.map((party) => {
          const partyMetadata = context.metadataStore.parties.find((partyMetadata: PartyMetadata) =>
            partyMetadata.key.equals(party.key)
          );
          return {
            key: party.key,
            isOpen: party.isOpen,
            timeframe: partyMetadata!.latestTimeframe!,
            genesisFeed: party.genesisFeedKey,
            controlFeed: party.controlFeedKey,
            dataFeed: party.dataFeedKey
          };
        })
      });
    };

    let unsubscribe: () => void;

    // Send initial parties.
    update()
      .then(() => {
        unsubscribe = context.spaceManager!.update.on(() => update());
      })
      .catch((err) => log.catch(err));

    return () => {
      unsubscribe?.();
    };
  });

// export const getPartySnapshot = async (
//   { echo }: DevtoolsServiceDependencies,
//   request: GetPartySnapshotRequest
// ): Promise<GetPartySnapshotResponse> => {
//   const snapshot = await echo.snapshotStore.load(request.partyKey);
//   return { snapshot };
// };

// export const savePartySnapshot = async (
//   { echo }: DevtoolsServiceDependencies,
//   request: SavePartySnapshotRequest
// ): Promise<SavePartySnapshotResponse> => {
//   const party = echo.getParty(request.partyKey);
//   if (!party) {
//     return {};
//   }

//   const snapshot = await party.createSnapshot();
//   await echo.snapshotStore.save(snapshot);
//   return { snapshot };
// };
