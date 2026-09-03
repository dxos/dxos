//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { DebugPanel, type DebugPanelProps } from './DebugPanel.tsx';

/**
 * Sized by the story, matching the viewport the status bar gives it; the tab and pin come from
 * persisted view state, so switching either here survives a reload of the story.
 */
const Render = (props: DebugPanelProps) => (
  <div className='h-[24rem] w-[64rem] max-w-full grid'>
    <DebugPanel {...props} />
  </div>
);

const meta = {
  title: 'plugins/plugin-debug/containers/DebugPanel',
  component: DebugPanel,
  render: Render,
  decorators: [withPluginManager(), withAttention(), withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
} satisfies Meta<typeof DebugPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Its own context, so exercising the story does not decide which tab the app's rail opens on. */
export const Default: Story = {
  args: { contextId: 'debug-panel-story', onClose: () => {} },
};
