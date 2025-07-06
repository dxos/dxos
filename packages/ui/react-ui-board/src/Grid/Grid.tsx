//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type GridProps = ThemedClassName;

export const Grid = ({ classNames }: GridProps) => {
  return <div className={mx(classNames)}>Grid</div>;
};
