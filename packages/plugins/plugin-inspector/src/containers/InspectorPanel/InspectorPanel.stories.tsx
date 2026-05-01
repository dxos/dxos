//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { InspectorPanel } from './InspectorPanel';

const meta = {
  title: 'plugins/plugin-inspector/containers/InspectorPanel',
  component: InspectorPanel,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({ createIdentity: true, createSpace: true }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof InspectorPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Resting state: no agent processes, no trace messages — the inspector
 * shows the empty toolbar and an empty timeline.
 */
export const Default: Story = {};
