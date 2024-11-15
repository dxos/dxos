//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { IconButton } from './IconButton';
import { withTheme } from '../../testing';
import { Tooltip } from '../Tooltip';

type StorybookIconButtonProps = {
  iconOnly?: boolean;
};

const StorybookIconButton = (props: StorybookIconButtonProps) => {
  return (
    <Tooltip.Provider>
      <div className='mbe-4'>
        <IconButton label='Bold' icon='ph--text-b--bold' {...props} />
      </div>
      <div className='mbe-4'>
        <IconButton iconOnly label='Bold' icon='ph--text-b--bold' {...props} />
      </div>
    </Tooltip.Provider>
  );
};

export default {
  title: 'ui/react-ui-core/IconButton',
  component: IconButton,
  render: StorybookIconButton,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = {
  args: {},
};
