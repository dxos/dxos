//
// Copyright 2023 DXOS.org
//

import { Table as TableIcon } from '@phosphor-icons/react';
import React from 'react';

import { FrameRuntime } from '../../registry';

const TableFrame = React.lazy(() => import('./TableFrame'));

export const TableFrameRuntime: FrameRuntime<any> = {
  Icon: TableIcon,
  Component: TableFrame,
};
