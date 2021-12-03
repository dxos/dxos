//
// Copyright 2020 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';

import { SubscribeToKeyringKeysResponse } from '../proto/gen/dxos/devtools';
import { DevtoolsServiceDependencies } from './devtools-context';

export const subscribeToKeyringKeys = (hook: DevtoolsServiceDependencies) => {
  return new Stream<SubscribeToKeyringKeysResponse>(({ next }) => {
    return hook.keyring.keysUpdate.on((keys) => {
      next({ keys });
    });
  });
};
