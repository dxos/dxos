//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React from 'react';

import { Tooltip } from '@dxos/react-ui';

// TODO(burdon): Move into withTheme?
export const withTooltipProvider: Decorator = (Story) => {
  return (
    <Tooltip.Provider>
      <Story />
    </Tooltip.Provider>
  );
};
