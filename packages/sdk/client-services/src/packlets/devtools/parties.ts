//
// Copyright 2020 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { MetadataStore, Space, SpaceManager } from '@dxos/echo-db';
import { FeedStore } from '@dxos/feed-store';
import { SubscribeToPartiesRequest, SubscribeToPartiesResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { PartyMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';

export const subscribeToParties = (
  {
    spaceManager,
    metadataStore,
    feedStore
  }: { spaceManager?: SpaceManager; metadataStore: MetadataStore; feedStore: FeedStore<FeedMessage> },
  { partyKeys = [] }: SubscribeToPartiesRequest
) =>
  new Stream<SubscribeToPartiesResponse>(({ next }) => {
    const update = () => {
      if (!spaceManager) {
        return;
      }
      const parties: Space[] = [...spaceManager!.spaces.values()];
      const filteredParties = parties.filter(
        (party) => !partyKeys?.length || partyKeys.some((partyKey) => partyKey.equals(party.key))
      );

      next({
        parties: filteredParties.map((party) => {
          const partyMetadata = metadataStore.parties.find((partyMetadata: PartyMetadata) =>
            partyMetadata.key.equals(party.key)
          );
          return {
            key: party.key,
            isOpen: party.isOpen,
            isActive: true, // TODO(mykola): implement or delete?
            timeframe: partyMetadata?.latestTimeframe,
            genesisFeed: party.genesisFeedKey,
            controlFeed: party.controlFeedKey,
            dataFeed: party.dataFeedKey,
            feeds: partyMetadata?.feedKeys
            // properties: party.isOpen ? party.getPropertiesSet().expectOne().model.toObject() : undefined
          };
        }) as SubscribeToPartiesResponse.PartyInfo[]
      });
    };

    console.log('spaceManager ', spaceManager);
    const unsubscribe = spaceManager?.update.on(() => update());

    // Send initial parties.
    update();

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
