//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { textBlockWidth } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Toolbar } from './Toolbar';
import translations from '../../translations';

const Story = () => {
  return (
    <Toolbar.Root classNames={textBlockWidth}>
      <Toolbar.Alignment />
    </Toolbar.Root>
  );
};

export default {
  title: 'plugin-sheet/Toolbar',
  component: Toolbar,
  decorators: [withTheme, withLayout({ tooltips: true })],
  parameters: { translations, layout: 'fullscreen' },
  render: (args: any) => <Story {...args} />,
};

export const Default = {};
