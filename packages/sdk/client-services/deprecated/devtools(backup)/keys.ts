//
// Copyright 2020 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import {
  SubscribeToCredentialMessagesRequest,
  SubscribeToCredentialMessagesResponse,
  SubscribeToKeyringKeysResponse
} from '@dxos/protocols/proto/dxos/devtools';
import { SubscriptionGroup } from '@dxos/util';

import { DevtoolsServiceDependencies } from './devtools-context';

export const subscribeToKeyringKeys = ({ keyring }: DevtoolsServiceDependencies) => new Stream<SubscribeToKeyringKeysResponse>(({ next }) => {
  next({ keys: keyring.keys });
  return keyring.keysUpdate.on((keys) => {
    next({ keys });
  });
});

export const subscribeToCredentialMessages = ({ echo }: DevtoolsServiceDependencies, { partyKey }: SubscribeToCredentialMessagesRequest) => new Stream<SubscribeToCredentialMessagesResponse>(({ next }) => {
  const party = partyKey && echo.getParty(partyKey);
  if (!party) {
    throw new Error('Party not found');
  }

  const update = () => {
    next({ messages: Array.from(party.processor.credentialMessages.values()) });
  };

  const subscriptions = new SubscriptionGroup();
  subscriptions.push(party.processor.keyOrInfoAdded.on(() => update()));
  subscriptions.push(party.processor.feedAdded.on(() => update()));
  update();

  return () => subscriptions.unsubscribe();
});
