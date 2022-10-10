//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { QRCode } from '../src/index.js';
import { Container } from './helpers/index.js';

export default {
  title: 'react-components/QRCode',
  component: QRCode
};

export const Primary = () => (
  <Container>
    <QRCode value='https://dxos.org' />
  </Container>
);
