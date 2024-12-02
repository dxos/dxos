//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';

import { osTranslations } from '@dxos/shell/react';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { TypeSelector } from './TypeSelector';
import translations from '../../translations';

const meta: Meta<typeof TypeSelector> = {
  title: 'plugins/plugin-space/TypeSelector',
  component: TypeSelector,
  decorators: [withTheme, withLayout({ tooltips: true })],
  parameters: { translations: [...translations, osTranslations] },
  args: {
    classNames: 'w-[40rem]',
    types: [
      { typename: 'Document', icon: 'ph--file-text--regular' },
      { typename: 'Sketch', icon: 'ph--image-square--regular' },
      { typename: 'Sheet', icon: 'ph--grid-nine--regular' },
      { typename: 'Table', icon: 'ph--table--regular' },
      { typename: 'Should be truncated', icon: 'ph--crown-cross--regular' },
    ],
  },
};

export default meta;

type Story = StoryObj<typeof TypeSelector>;

export const Default: Story = {};
