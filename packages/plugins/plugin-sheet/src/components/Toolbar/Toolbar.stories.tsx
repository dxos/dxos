//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React from 'react';

import { textBlockWidth } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Toolbar } from './Toolbar';
import translations from '../../translations';

const DefaultStory = () => {
  return (
    <Toolbar.Root classNames={textBlockWidth}>
      <Toolbar.Alignment />
    </Toolbar.Root>
  );
};

export const Default = {};

const meta: Meta<typeof Toolbar.Root> = {
  title: 'plugins/plugin-sheet/Toolbar',
  component: Toolbar.Root,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ tooltips: true })],
  parameters: { translations, layout: 'fullscreen' },
};

export default meta;
