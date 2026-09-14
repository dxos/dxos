//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Panel, Toolbar } from '@dxos/react-ui';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { DebugPanel, type DebugPanelRootProps } from './DebugPanel.tsx';

/**
 * The parts in a plain panel, sized by the story: the tab strip in the toolbar and the panels in
 * the content, as a host without a title bar would compose them. The tab comes from persisted view
 * state, so switching it here survives a reload of the story.
 */
const Render = (props: DebugPanelRootProps) => (
  <div className='h-[24rem] w-[64rem] max-w-full grid'>
    <DebugPanel.Root {...props}>
      <Panel.Root>
        <Panel.Toolbar size='sm' asChild>
          <Toolbar.Root density='sm'>
            <DebugPanel.Tablist />
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content>
          <DebugPanel.Content />
        </Panel.Content>
      </Panel.Root>
    </DebugPanel.Root>
  </div>
);

const meta = {
  title: 'plugins/plugin-debug/containers/DebugPanel',
  component: DebugPanel.Root,
  render: Render,
  decorators: [withPluginManager(), withAttention(), withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
} satisfies Meta<typeof DebugPanel.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Its own context, so exercising the story does not decide which tab the app's rail opens on. */
export const Default: Story = {
  args: { contextId: 'debug-panel-story' },
};
