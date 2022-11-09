//
// Copyright 2020 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { Space } from '@dxos/echo-db';
import { SubscribeToPartiesRequest, SubscribeToPartiesResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { PartyMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';

import { ServiceContext } from '../services';

export const subscribeToSpaces = (context: ServiceContext, { partyKeys = [] }: SubscribeToPartiesRequest) =>
  new Stream<SubscribeToPartiesResponse>(({ next }) => {
    let unsubscribe: () => void;

    const update = async () => {
      const parties: Space[] = [...context.spaceManager!.spaces.values()];
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

    setImmediate(async () => {
      await context.initialized.wait();
      unsubscribe = context.spaceManager!.updated.on(() => update());

      // Send initial parties.
      await update();
    });

    return () => {
      unsubscribe?.();
    };
  });
