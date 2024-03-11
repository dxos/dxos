//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { parseObservabilityPlugin } from '@braneframe/plugin-observability';
import { useResolvePlugin } from '@dxos/app-framework';
import { useClient } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';

import { HaloButton } from './HaloButton';

// TODO(thure): Refactor to be handled by a more appropriate plugin (ClientPlugin?).
export const NotchStart = () => {
  const client = useClient();
  const identity = useIdentity();
  const observabilityPlugin = useResolvePlugin(parseObservabilityPlugin);
  return (
    <HaloButton
      size={8}
      identityKey={identity?.identityKey.toHex()}
      hue={identity?.profile?.data?.hue}
      emoji={identity?.profile?.data?.emoji}
      internal={observabilityPlugin?.provides?.observability?.group === 'dxos'}
      onClick={() => client.shell.shareIdentity()}
    />
  );
};
