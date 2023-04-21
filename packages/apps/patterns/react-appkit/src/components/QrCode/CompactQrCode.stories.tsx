//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import { CompactQrCode } from './QrCode';

export default {
  component: CompactQrCode
};

export const Compact = {
  args: {
    copyLabel: 'Copy',
    displayQrLabel: 'Display QR',
    value: 'https://dxos.org'
  }
};
