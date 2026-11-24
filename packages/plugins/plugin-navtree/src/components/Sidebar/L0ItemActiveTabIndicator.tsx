//
// Copyright 2025 DXOS.org
//

import React from 'react';

import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

export const L0ItemActiveTabIndicator = ({ classNames }: Util.ThemedClassName<{}>) => (
  <div
    className={mx(
      'hidden group-aria-selected/l0item:block absolute start-0 h-6 w-1.5 bg-accent-bg rounded-sm',
      classNames,
    )}
  />
);
