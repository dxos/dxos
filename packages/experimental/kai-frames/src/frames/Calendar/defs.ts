//
// Copyright 2023 DXOS.org
//

import { Calendar as CalendarIcon } from '@phosphor-icons/react';
import React from 'react';

import { FrameRuntime } from '../../registry';

const CalendarFrame = React.lazy(() => import('./CalendarFrame'));

export const CalendarFrameRuntime: FrameRuntime<any> = {
  Icon: CalendarIcon,
  Component: CalendarFrame,
};
