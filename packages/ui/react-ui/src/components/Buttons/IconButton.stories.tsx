//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { IconButton, type IconButtonProps } from './IconButton';
import { withTheme } from '../../testing';
import { Tooltip } from '../Tooltip';

const DefaultStory = (props: IconButtonProps) => {
  return (
    <Tooltip.Provider>
      <div className='mbe-4'>
        <IconButton {...props} />
      </div>
      <div className='mbe-4'>
        <IconButton iconOnly {...props} />
      </div>
    </Tooltip.Provider>
  );
};

export default {
  title: 'ui/react-ui-core/IconButton',
  component: IconButton,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = {
  args: {
    label: 'Bold',
    icon: 'ph--text-b--regular',
  },
};
