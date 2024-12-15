//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/react-ui-theme';

import { eventsNone } from '../styles';
import { testId } from '../util';

export const Background = () => {
  return <div {...testId('dx-background')} className={mx('absolute inset-0 bg-base', eventsNone)} />;
};
