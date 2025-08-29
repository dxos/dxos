//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '../../testing';
import { Tooltip } from '../Tooltip';

import { IconButton, type IconButtonProps } from './IconButton';

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

const meta: Meta<typeof IconButton> = {
  title: 'ui/react-ui-core/IconButton',
  component: IconButton,
  render: DefaultStory as any,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export default meta;

export const Default = {
  args: {
    label: 'Bold',
    icon: 'ph--text-b--regular',
  },
};
