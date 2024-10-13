//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type S } from '@dxos/effect';
import { type ThemedClassName } from '@dxos/react-ui';

export type ColumnProps<T = {}> = ThemedClassName<{
  data?: T;
  schema?: S.Schema<T>;
  readonly?: boolean;
}>;

export const Column = (props: ColumnProps) => {
  return <div></div>;
};
