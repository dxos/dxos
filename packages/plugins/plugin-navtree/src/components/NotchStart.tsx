//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useIntentDispatcher, useResolvePlugin } from '@dxos/app-framework';
import { ClientAction } from '@dxos/plugin-client/meta';
import { parseObservabilityPlugin } from '@dxos/plugin-observability';
import { useIdentity } from '@dxos/react-client/halo';

import { HaloButton } from './HaloButton';

// TODO(thure): Refactor to be handled by a more appropriate plugin (ClientPlugin?).
export const NotchStart = () => {
  const identity = useIdentity();
  const observabilityPlugin = useResolvePlugin(parseObservabilityPlugin);
  const dispatch = useIntentDispatcher();
  return (
    <HaloButton
      size={8}
      identityKey={identity?.identityKey.toHex()}
      hue={identity?.profile?.data?.hue}
      emoji={identity?.profile?.data?.emoji}
      internal={observabilityPlugin?.provides?.observability?.group === 'dxos'}
      onClick={() => dispatch({ action: ClientAction.SHARE_IDENTITY })}
    />
  );
};
