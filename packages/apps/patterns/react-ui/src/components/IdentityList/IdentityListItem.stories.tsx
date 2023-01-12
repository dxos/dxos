//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import { IdentityListItem } from './IdentityListItem';

export default {
  component: IdentityListItem
};

export const Default = {
  args: {
    identity: {
      identityKey: {
        toHex: () => '888',
        truncate: () => '888..888'
      }
    },
    presence: 0
  }
};
