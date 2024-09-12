//
// Copyright 2024 DXOS.org
//
import '@dxos/lit-grid/dx-grid.pcss';

import { createComponent } from '@lit/react';
import React from 'react';

import { DxGrid as NaturalDxGrid } from '@dxos/lit-grid';

import { type GridProps } from './types';

const DxGrid = createComponent({
  tagName: 'dx-grid',
  elementClass: NaturalDxGrid,
  react: React,
});

export const Grid = ({ cells }: GridProps) => {
  return <DxGrid values={cells} />;
};
