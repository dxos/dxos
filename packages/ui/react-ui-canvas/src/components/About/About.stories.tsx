//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { About } from './About.tsx';

const meta: Meta<typeof About> = {
  title: 'ui/react-ui-canvas/About',
  component: About,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations: uiTranslations },
  args: {
    classNames: 'w-80',
    stats: [
      { id: 'nodes', label: 'Nodes', value: 12 },
      { id: 'links', label: 'Links', value: 9 },
      { id: 'layers', label: 'Layers', value: 2 },
      { id: 'zoom', label: 'Zoom', value: '100%' },
    ],
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
