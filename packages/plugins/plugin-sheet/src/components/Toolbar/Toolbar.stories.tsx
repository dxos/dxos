//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Tooltip } from '@dxos/react-ui';
import { textBlockWidth } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { Toolbar } from './Toolbar';
import translations from '../../translations';

const Story = () => {
  return (
    <Tooltip.Provider>
      <div role='none' className='fixed inset-0 flex flex-col'>
        <Toolbar.Root classNames={textBlockWidth}>
          <Toolbar.Alignment />
        </Toolbar.Root>
      </div>
    </Tooltip.Provider>
  );
};

export default {
  title: 'plugin-sheet/Toolbar',
  component: Toolbar,
  decorators: [withTheme],
  parameters: { translations, layout: 'fullscreen' },
  render: (args: any) => <Story {...args} />,
};

export const Default = {};
