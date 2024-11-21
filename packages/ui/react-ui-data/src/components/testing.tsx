//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export const TestPopup = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => (
  <div>
    <div className={mx('flex border border-separator rounded w-[300px]', classNames)}>{children}</div>
  </div>
);
