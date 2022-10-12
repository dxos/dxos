//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { Button } from './Button';

export default {
  title: 'react-ui/Button'
};

export const Default = () => {
  return <Button>Hello</Button>;
};

export const Primary = () => {
  return <Button variant='primary'>Hello</Button>;
};
