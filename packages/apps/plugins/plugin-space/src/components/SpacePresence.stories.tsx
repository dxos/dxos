//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Tooltip } from '@dxos/react-ui';

import '@dxosTheme';
import { ObjectViewers } from './SpacePresence';

export default {
  component: ObjectViewers,
  actions: { argTypesRegex: '^on.*' },
};

export const Normal = (props: any) => {
  return (
    <Tooltip.Provider>
      <ObjectViewers {...props} />
    </Tooltip.Provider>
  );
};
