//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useSyncExternalStore } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { DXN } from '@dxos/echo';
import { corePlugins } from '@dxos/plugin-testing';
import { type DrawerState, Main } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import * as DebugPlugin from '../../DebugPlugin.ts';
import { StubToolsPlugin } from '../../testing/index.ts';
import { type DebugPanelViewState, debugPanelAspect } from '../DebugPanel/index.ts';
import { DebugPanelDrawer, type DebugPanelDrawerProps } from './DebugPanelDrawer.tsx';

//
// Drawer state, as the deck would own it: the stub handler below writes it and the frame reads it.
//

let drawerState: DrawerState = 'open';
const listeners = new Set<() => void>();

const setDrawerState = (next: DrawerState) => {
  drawerState = next;
  listeners.forEach((listener) => listener());
};

const useDrawerState = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => drawerState,
  );

/** Stands in for the deck's layout handler, so the panel's close and float controls move the frame's drawer. */
const StubDrawerPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.debug.story.stubDrawer'), name: 'Drawer (stub)' }),
).pipe(
  Plugin.addModule(
    Capability.inlineModule('stub-drawer-operations', { provides: [Capabilities.OperationHandler] }, () =>
      Effect.succeed([
        Capability.contribute(
          Capabilities.OperationHandler,
          OperationHandlerSet.make(
            Operation.withHandler(LayoutOperation.UpdateDrawer, ({ state }) =>
              Effect.sync(() => {
                if (state === 'toggle') {
                  setDrawerState(drawerState === 'open' ? 'closed' : 'open');
                } else if (state) {
                  setDrawerState(state);
                }
              }),
            ),
          ),
        ),
      ]),
    ),
  ),
  Plugin.make,
);

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
