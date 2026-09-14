//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { Splitter } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import * as DebugPlugin from '../../DebugPlugin.ts';
import { STUB_TOOL_PAGES, StubToolsPlugin } from '../../testing/index.ts';
import { DebugPanel, type DebugPanelRootProps } from './DebugPanel.tsx';

/**
 * The parts split as the floating window splits them, sized by the story: the tree over the hidden
 * debug category beside the selected tool's article. Selection and open branches come from
 * persisted view state, so choosing a tool here survives a reload of the story.
 */
const Render = (props: DebugPanelRootProps) => (
  <div className='h-[24rem] w-[64rem] max-w-full grid'>
    <DebugPanel.Root {...props}>
      <Splitter.Root orientation='horizontal' anchor='start' resizable defaultSize={16} minSize={8}>
        <Splitter.Panel position='start'>
          <DebugPanel.Sidebar />
        </Splitter.Panel>
        <Splitter.Handle />
        <Splitter.Panel position='end'>
          <DebugPanel.Main />
        </Splitter.Panel>
      </Splitter.Root>
    </DebugPanel.Root>
  </div>
);

const meta = {
  title: 'plugins/plugin-debug/containers/DebugPanel',
  component: DebugPanel.Root,
  render: Render,
  decorators: [
    // The attention core plugin provides the view state the selection persists through; the debug
    // plugin contributes the console and log pages and their articles; the stub adds a branch.
    withPluginManager({ plugins: [...corePlugins(), DebugPlugin.make(), StubToolsPlugin()] }),
    withTheme(),
    withLayout({ layout: 'centered' }),
  ],
  parameters: { translations },
} satisfies Meta<typeof DebugPanel.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Its own context, so exercising the story does not decide which tool the app's rail opens on. */
export const Default: Story = {
  args: { contextId: 'debug-panel-story' },
};

/** Console, then a stub page under the branch: the console's terminal appears, then the page's text. */
export const Select: Story = {
  args: { contextId: 'debug-panel-story-select' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tree = await canvas.findByRole('tree', {}, { timeout: 10_000 });
    await userEvent.click(await within(tree).findByText('Console', {}, { timeout: 10_000 }));
    await expect(await canvas.findByRole('textbox', {}, { timeout: 10_000 })).toBeInTheDocument();

    const [page] = STUB_TOOL_PAGES;
    await userEvent.click(await within(tree).findByText('Tools', {}, { timeout: 10_000 }));
    await userEvent.click(await within(tree).findByText(page.label, {}, { timeout: 10_000 }));
    await expect(await canvas.findByTestId(`stubTool.${page.id}`, {}, { timeout: 10_000 })).toBeVisible();
    // The console stays mounted behind the page shown.
    await expect(canvas.getByRole('textbox', { hidden: true })).toBeInTheDocument();
  },
};
