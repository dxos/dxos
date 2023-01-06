//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { QRCode } from '../src';
import { Container } from './helpers';

export default {
  title: 'react-components/QRCode',
  component: QRCode
};

export const Primary = () => (
  <Container>
    <QRCode value='https://dxos.org' />
  </Container>
);
