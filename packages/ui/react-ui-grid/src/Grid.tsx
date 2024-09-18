//
// Copyright 2024 DXOS.org
//
import '@dxos/lit-grid/dx-grid.pcss';

import { createComponent } from '@lit/react';
import React from 'react';

import { DxGrid as NaturalDxGrid, type DxGridProps } from '@dxos/lit-grid';

const DxGrid = createComponent({
  tagName: 'dx-grid',
  elementClass: NaturalDxGrid,
  react: React,
});

export type GridProps = DxGridProps;

export const Grid = (props: GridProps) => {
  return <DxGrid {...props} />;
};
