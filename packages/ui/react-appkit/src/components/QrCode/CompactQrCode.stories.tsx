//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import { withTheme } from '@dxos/storybook-utils';

import { CompactQrCode } from './QrCode';

export default {
  component: CompactQrCode,
  decorators: [withTheme],
};

export const Compact = {
  args: {
    copyLabel: 'Copy',
    displayQrLabel: 'Display QR',
    value: 'https://dxos.org',
  },
};
