//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import { PublicKey } from '@dxos/keys';

import { JoinPanel } from './JoinPanel';

export default {
  component: JoinPanel
};

export const Default = {
  args: {
    space: { properties: { get: () => 'Q3 2022 Planning' } },
    availableIdentities: [
      { displayName: 'Os Mutantes', identityKey: PublicKey.random() },
      { displayName: 'Sherelle', identityKey: PublicKey.random() }
    ]
  }
};
