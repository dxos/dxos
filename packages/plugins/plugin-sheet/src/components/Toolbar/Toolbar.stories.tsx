//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React from 'react';

import { textBlockWidth } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { SheetToolbar } from './Toolbar';
import translations from '../../translations';

const DefaultStory = () => {
  return <SheetToolbar classNames={textBlockWidth} />;
};

export const Default = {};

const meta: Meta = {
  title: 'plugins/plugin-sheet/Toolbar',
  component: SheetToolbar,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ tooltips: true })],
  parameters: { translations, layout: 'fullscreen' },
};

export default meta;
