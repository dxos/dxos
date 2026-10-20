//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { withInspectorFrame } from '../../panels/testing.ts';
import { AboutInspector } from './AboutInspector.tsx';

const meta: Meta<typeof AboutInspector> = {
  title: 'ui/react-ui-canvas/components/inspectors/AboutInspector',
  component: AboutInspector,
  decorators: [
    withInspectorFrame({
      id: 'about',
      title: 'About',
      icon: 'ph--info--regular',
      order: 0,
      defaultOpen: true,
    }),
    withTheme(),
    withLayout({ layout: 'centered' }),
  ],
  parameters: { translations: uiTranslations },
  args: {
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
