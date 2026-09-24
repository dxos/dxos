//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { Path } from '@dxos/react-ui-list';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { DebugNodes } from '#types';

import * as DebugPlugin from '../../DebugPlugin.ts';
import { STUB_TOOL_PAGES, STUB_TOOLS_BRANCH, StubToolsPlugin } from '../../testing/index.ts';
import { DebugPanel, type DebugPanelRootProps } from './DebugPanel.tsx';
import { type DebugPanelViewState, debugPanelAspect } from './view-state.ts';

/**
 * The body as every host splits it, sized by the story: the tree over the hidden debug category
 * beside the selected tool's article. Selection and open branches come from persisted view state,
 * so choosing a tool here survives a reload of the story.
 */
const Render = (props: DebugPanelRootProps) => (
  <div className='h-[24rem] w-[64rem] max-w-full grid'>
    <DebugPanel.Root {...props}>
      <DebugPanel.Body />
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

/**
 * Console, then Logs, then a stub page under the branch, then the console again: the console stays
 * mounted (hidden) throughout, while the stub page is gone once it is no longer selected.
 */
export const Select: Story = {
  args: { contextId: 'debug-panel-story-select' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tree = await canvas.findByRole('tree', {}, { timeout: 10_000 });
    await userEvent.click(await within(tree).findByText('Console', {}, { timeout: 10_000 }));
    const terminal = await canvas.findByRole('textbox', {}, { timeout: 10_000 });
    await expect(terminal).toBeInTheDocument();

    // The terminal's input is xterm's transparent helper, so visibility is read off the page's show/hide element.
    await userEvent.click(await within(tree).findByText('Logs', {}, { timeout: 10_000 }));
    await expect(terminal.closest('[hidden]')).not.toBeNull();

    const [page] = STUB_TOOL_PAGES;
    await userEvent.click(await within(tree).findByText('Tools', {}, { timeout: 10_000 }));
    await userEvent.click(await within(tree).findByText(page.label, {}, { timeout: 10_000 }));
    const stubPage = await canvas.findByTestId(`stubTool.${page.id}`, {}, { timeout: 10_000 });
    await expect(stubPage).toBeVisible();
    // The same console element is still there behind the page shown.
    await expect(terminal).toBeInTheDocument();

    await userEvent.click(await within(tree).findByText('Console', {}, { timeout: 10_000 }));
    await expect(terminal.closest('[hidden]')).toBeNull();
    // A page that is not the console or logs is mounted only while it is selected.
    await expect(stubPage).not.toBeInTheDocument();
  },
};

const RESTORE_CONTEXT = 'debug-panel-story-restore';

/** What the local backend persists for a context: the tree's open keys carry its id (`Tree` appends it to the path). */
const restoredState: DebugPanelViewState = {
  nodeId: `${DebugNodes.DEBUG_ROOT_ID}/${STUB_TOOLS_BRANCH}/${STUB_TOOL_PAGES[1].id}`,
  open: [Path.create(DebugNodes.DEBUG_ROOT_ID, RESTORE_CONTEXT, `${DebugNodes.DEBUG_ROOT_ID}/${STUB_TOOLS_BRANCH}`)],
};

/**
 * A reload with a page selected under an open branch: the branch's pages come from a connector that
 * only runs on expansion, so the panel has to expand what the persisted state names before either
 * the row or the page can render.
 */
export const Restore: Story = {
  args: { contextId: RESTORE_CONTEXT },
  loaders: [
    () => {
      localStorage.setItem(`dxos:view-state:${debugPanelAspect.key}:${RESTORE_CONTEXT}`, JSON.stringify(restoredState));
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = STUB_TOOL_PAGES[1];
    await expect(await canvas.findByTestId(`stubTool.${page.id}`, {}, { timeout: 10_000 })).toBeVisible();
    const tree = await canvas.findByRole('tree', {}, { timeout: 10_000 });
    const row = (await within(tree).findByText(page.label, {}, { timeout: 10_000 })).closest('[role="treeitem"]');
    await expect(row).toHaveAttribute('aria-selected', 'true');
  },
};
