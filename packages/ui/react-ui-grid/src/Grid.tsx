//
// Copyright 2024 DXOS.org
//
import '@dxos/lit-grid/dx-grid.pcss';

import { createComponent, type EventName } from '@lit/react';
import React from 'react';

import { type DxAxisResize, DxGrid as NaturalDxGrid, type DxGridProps } from '@dxos/lit-grid';

const DxGrid = createComponent({
  tagName: 'dx-grid',
  elementClass: NaturalDxGrid,
  react: React,
  events: {
    onAxisResize: 'dx-axis-resize' as EventName<DxAxisResize>,
  },
});

export type GridProps = DxGridProps & {
  onAxisResize: (event: DxAxisResize) => void;
};

export const Grid = (props: GridProps) => {
  return <DxGrid {...props} />;
};
