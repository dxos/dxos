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
  label: ''
});
Default.args = {
  label: 'Click to copy this code’s value',
  value: 'https://dxos.org'
};
