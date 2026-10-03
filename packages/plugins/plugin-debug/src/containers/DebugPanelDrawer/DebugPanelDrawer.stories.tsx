//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { Main } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import * as DebugPlugin from '../../DebugPlugin.ts';
import { StubDrawerPlugin, StubToolsPlugin, setDrawerState, useDrawerState } from '../../testing/index.ts';
import { type DebugPanelViewState, debugPanelAspect } from '../DebugPanel/index.ts';
import { DebugPanelDrawer, type DebugPanelDrawerProps } from './DebugPanelDrawer.tsx';

/** The deck's frame with the drawer open, as `DeckContent` hosts the surface. */
const Render = (props: DebugPanelDrawerProps) => {
  const state = useDrawerState();
  return (
    <Main.Root drawerState={state} onDrawerStateChange={setDrawerState}>
      <Main.Content classNames='p-4'>Main</Main.Content>
      <Main.Drawer label='Drawer'>
        <DebugPanelDrawer {...props} />
      </Main.Drawer>
    </Main.Root>
  );
};

const meta = {
  title: 'plugins/plugin-debug/containers/DebugPanelDrawer',
  component: DebugPanelDrawer,
  render: Render,
  // The attention core plugin provides the view state the selection and mode persist through; the
  // debug plugin contributes the console and log pages and their articles; the stubs add a branch
  // and the drawer's layout handler.
  decorators: [
    withPluginManager({ plugins: [...corePlugins(), DebugPlugin.make(), StubToolsPlugin(), StubDrawerPlugin()] }),
    withTheme(),
  ],
  parameters: { translations, layout: 'fullscreen' },
} satisfies Meta<typeof DebugPanelDrawer>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Its own context, so exercising the story does not decide which tool the app's drawer opens on. */
export const Default: Story = {
  args: { contextId: 'debug-panel-drawer-story' },
};

const FLOAT_CONTEXT = 'debug-panel-drawer-story-float';

const readViewState = (): DebugPanelViewState | undefined => {
  const raw = localStorage.getItem(`dxos:view-state:${debugPanelAspect.key}:${FLOAT_CONTEXT}`);
  return raw ? JSON.parse(raw) : undefined;
};

/**
 * Console by default, then Logs, then the float control: the drawer closes and the persisted mode
 * records the switch — the part the floating host reads to take over.
 */
export const Float: Story = {
  args: { contextId: FLOAT_CONTEXT },
  loaders: [
    () => {
      localStorage.removeItem(`dxos:view-state:${debugPanelAspect.key}:${FLOAT_CONTEXT}`);
      setDrawerState('open');
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const drawer = await canvas.findByRole('region', { name: 'Drawer' }, { timeout: 10_000 });
    const tree = await within(drawer).findByRole('tree', {}, { timeout: 10_000 });
    const terminal = await within(drawer).findByRole('textbox', {}, { timeout: 10_000 });
    await expect(terminal).toBeInTheDocument();

    // The terminal's input is xterm's transparent helper, so visibility is read off the page's show/hide element.
    await userEvent.click(await within(tree).findByText('Logs', {}, { timeout: 10_000 }));
    await expect(terminal.closest('[hidden]')).not.toBeNull();

    await expect(readViewState()?.mode).toBeUndefined();
    await userEvent.click(await within(drawer).findByTestId('debugPanel.mode'));
    await waitFor(() => expect(readViewState()?.mode).toBe('floating'));
    await waitFor(() => expect(canvas.queryByRole('region', { name: 'Drawer' })).toBeNull());
  },
};
