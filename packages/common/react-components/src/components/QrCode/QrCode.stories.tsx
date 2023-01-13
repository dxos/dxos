//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import { QrCode } from './QrCode';

export default {
  component: QrCode
};

export const Default = {
  args: {
    label: 'Click to copy this code’s value',
    value: 'https://dxos.org'
  }
};
