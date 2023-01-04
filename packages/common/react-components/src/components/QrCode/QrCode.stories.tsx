//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../testing';
import { QrCode, QrCodeProps, CompactQrCode, CompactQrCodeProps } from './QrCode';

export default {
  title: 'react-ui/QrCode',
  component: QrCode
};

const Template = (props: QrCodeProps) => {
  return <QrCode {...props} />;
};

const CompactTemplate = (props: CompactQrCodeProps) => {
  return <CompactQrCode {...props} />;
};

export const Default = templateForComponent(Template)({
  value: '',
  label: ''
});
Default.args = {
  label: 'Click to copy this code’s value',
  value: 'https://dxos.org'
};

export const Compact = templateForComponent(CompactTemplate)({
  value: '',
  copyLabel: '',
  displayQrLabel: ''
});
Compact.args = {
  copyLabel: 'Copy',
  displayQrLabel: 'Display QR',
  value: 'https://dxos.org'
};
