//
// Copyright 2024 DXOS.org
//
import React from 'react';

import { type DxGrid as NaturalDxGrid } from '@dxos/lit-grid';

import { DxGrid } from './DxGrid';

export type GridProps = Pick<NaturalDxGrid, 'values'>;

export const Grid = ({ values }: GridProps) => {
  return <DxGrid values={values} />;
};
