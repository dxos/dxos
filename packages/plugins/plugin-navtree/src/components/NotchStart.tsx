//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { createIntent, useIntentDispatcher, useCapabilities } from '@dxos/app-framework';
import { ClientAction } from '@dxos/plugin-client/types';
import { ObservabilityCapabilities } from '@dxos/plugin-observability';
import { useIdentity } from '@dxos/react-client/halo';

import { HaloButton } from './HaloButton';

// TODO(thure): Refactor to be handled by a more appropriate plugin (ClientPlugin?).
export const NotchStart = () => {
  const identity = useIdentity();
  // TODO(wittjosiah): Can this be removed now?
  const [observability] = useCapabilities(ObservabilityCapabilities.Observability);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  return (
    <HaloButton
      size={8}
      identityKey={identity?.identityKey.toHex()}
      hue={identity?.profile?.data?.hue}
      emoji={identity?.profile?.data?.emoji}
      internal={observability?.group === 'dxos'}
      onClick={() => dispatch(createIntent(ClientAction.ShareIdentity))}
    />
  );
};
