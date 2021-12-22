//
// Copyright 2020 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { SubscriptionGroup } from '@dxos/util';

import {
  SubscribeToCredentialMessagesRequest,
  SubscribeToCredentialMessagesResponse,
  SubscribeToKeyringKeysResponse
} from '../proto/gen/dxos/devtools';
import { DevtoolsServiceDependencies } from './devtools-context';

export const subscribeToKeyringKeys = (hook: DevtoolsServiceDependencies) => {
  return new Stream<SubscribeToKeyringKeysResponse>(({ next }) => {
    return hook.keyring.keysUpdate.on((keys) => {
      next({ keys });
    });
  });
};

export const subscribeToCredentialMessages = (
  { echo }: DevtoolsServiceDependencies,
  { partyKey }: SubscribeToCredentialMessagesRequest
) => {
  return new Stream<SubscribeToCredentialMessagesResponse>(({ next }) => {
    const party = partyKey && echo.getParty(partyKey);
    if (!party) {
      throw new Error('Party not found');
    }

    const update = () => {
      next({ messages: Array.from(party.processor.credentialMessages.values()) });
    };

    const subscriptions = new SubscriptionGroup();
    subscriptions.push(party.processor.keyOrInfoAdded.on(() => update()));
    const { added } = party.processor.getActiveFeedSet();
    subscriptions.push(added.on(() => update()));

    update();

    return () => subscriptions.unsubscribe();
  });
};
