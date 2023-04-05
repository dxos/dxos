//
// Copyright 2023 DXOS.org
//

import { MagnifyingGlass as SearchIcon } from '@phosphor-icons/react';
import React from 'react';

import { FrameRuntime } from '@dxos/kai-frames';

const SearchFrame = React.lazy(() => import('./SearchFrame'));

export const SearchFrameRuntime: FrameRuntime<any> = {
  Icon: SearchIcon,
  Component: SearchFrame
};
