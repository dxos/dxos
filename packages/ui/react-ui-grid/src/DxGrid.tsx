//
// Copyright 2024 DXOS.org
//

import { createComponent } from '@lit/react';
import React from 'react';

import { DxGrid as NaturalDxGrid } from '@dxos/lit-grid';

export const DxGrid = createComponent({
  tagName: 'dx-grid',
  elementClass: NaturalDxGrid,
  react: React,
});
