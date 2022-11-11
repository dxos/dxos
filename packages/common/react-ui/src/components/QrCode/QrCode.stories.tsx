//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../testing';
import { QrCode, QrCodeProps } from './QrCode';

export default {
  title: 'react-ui/QrCode',
  component: QrCode
};

const Template = (props: QrCodeProps) => {
  return <QrCode {...props} />;
};

export const Default = templateForComponent(Template)({
  value: '',
  displayQrLabel: '',
  copyLabel: ''
});
Default.args = {
  copyLabel: 'Click to copy this code’s value',
  displayQrLabel: '',
  value: 'https://dxos.org'
};

export const Compact = () => (
  <Template
    {...{
      value: 'https://dxos.org',
      displayQrLabel: 'Display QR',
      copyLabel: 'Copy',
      compact: true
    }}
  />
);
