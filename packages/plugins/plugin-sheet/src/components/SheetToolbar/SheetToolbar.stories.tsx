//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../../translations';

import { SheetToolbar } from './SheetToolbar';

const DefaultStory = () => {
  return <SheetToolbar id='test' />;
};

export const Default = {};

const meta: Meta = {
  title: 'plugins/plugin-sheet/Toolbar',
  component: SheetToolbar,
  render: DefaultStory,
  decorators: [withTheme, withLayout()],
  parameters: { translations, layout: 'fullscreen' },
};

export default meta;
