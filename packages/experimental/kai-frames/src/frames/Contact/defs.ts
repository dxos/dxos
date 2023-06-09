//
// Copyright 2023 DXOS.org
//

import { IdentificationCard as ContactIcon } from '@phosphor-icons/react';
import React from 'react';

import { FrameRuntime } from '../../registry';

const ContactFrame = React.lazy(() => import('./ContactFrame'));

export const ContactFrameRuntime: FrameRuntime<any> = {
  Icon: ContactIcon,
  Component: ContactFrame,
};
