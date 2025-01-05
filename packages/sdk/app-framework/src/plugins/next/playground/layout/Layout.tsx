//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '../../Surface';
import { Capabilities } from '../../common';
import { contributes } from '../../plugin';

export const Layout = () => {
  return (
    <div>
      <Surface role='toolbar' />
      <Surface role='main' limit={1} />
    </div>
  );
};

export default () =>
  contributes(Capabilities.ReactRoot, {
    id: 'dxos.org/test/layout/root',
    root: Layout,
  });
