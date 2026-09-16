//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { corePlugins } from '@dxos/plugin-testing';
import {
  type DebugPortController,
  type DebugPortStartOptions,
  type DebugPortStatus as DebugPortStatusType,
} from '@dxos/react-client/devtools';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import * as DebugPlugin from '../../DebugPlugin.ts';
import { StubDrawerPlugin, StubToolsPlugin, getDrawerState, setDrawerState } from '../../testing/index.ts';
import { DEBUG_PANEL_CONTEXT, type DebugPanelViewState, debugPanelAspect } from '../DebugPanel/index.ts';
import { DebugPanelStatus } from './DebugPanelStatus.tsx';

/**
 * Stand-in for the page-wide controller: the real one long-polls a loopback server and evaluates
 * whatever it returns, which a story must never do.
 */
const createFakeController = (initial: Partial<DebugPortStatusType> = {}): DebugPortController => {
  const listeners = new Set<() => void>();
  let status: DebugPortStatusType = { running: false, ...initial };

  const update = (patch: Partial<DebugPortStatusType>) => {
    status = { ...status, ...patch };
    listeners.forEach((listener) => listener());
  };

  return {
    getStatus: () => status,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: (_options?: DebugPortStartOptions) => {
      const session = crypto.randomUUID();
      update({ running: true, session, origin: 'http://127.0.0.1:9321' });
      return session;
    },
    resume: () => undefined,
    stop: () => update({ running: false, session: undefined, origin: undefined }),
  };
};

const meta = {
  title: 'plugins/plugin-debug/containers/DebugPanelStatus',
  component: DebugPanelStatus,
  // The window's tree reads the app graph the debug plugin (and the stub) populate; its selection
  // and placement persist through the attention core plugin's view state; the drawer stub answers
  // the docked toggle in the deck's stead.
  decorators: [
    withPluginManager({ plugins: [...corePlugins(), DebugPlugin.make(), StubToolsPlugin(), StubDrawerPlugin()] }),
    withTheme(),
  ],
  parameters: { translations },
} satisfies Meta<typeof DebugPanelStatus>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The status button reads the singleton context, so a story seeds and clears that one key. */
const VIEW_STATE_KEY = `dxos:view-state:${debugPanelAspect.key}:${DEBUG_PANEL_CONTEXT}`;

const seedViewState = (state: DebugPanelViewState | undefined) => () => {
  if (state) {
    localStorage.setItem(VIEW_STATE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(VIEW_STATE_KEY);
  }
};

/** Docked by default: the button toggles the deck's drawer through the layout operation. */
export const Default: Story = {
  args: { controller: createFakeController() },
  loaders: [
    () => {
      seedViewState(undefined)();
      setDrawerState('closed');
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = await canvas.findByRole('button', { name: 'Show debug panel' });
    await expect(getDrawerState()).toBe('closed');
    await userEvent.click(button);
    await waitFor(() => expect(getDrawerState()).toBe('open'));
    await userEvent.click(button);
    await waitFor(() => expect(getDrawerState()).toBe('closed'));
    await expect(within(document.body).queryByRole('dialog', { name: 'Debug' })).toBeNull();
  },
};

/** Floating: the button opens the panel as a window over the app. */
export const Floating: Story = {
  args: { controller: createFakeController() },
  loaders: [seedViewState({ mode: 'floating', open: [] })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: 'Show debug panel' }));
    // Portaled to the body, so the window is looked up on the document.
    const body = within(document.body);
    const dialog = await body.findByRole('dialog', { name: 'Debug' }, { timeout: 10_000 });
    await expect(dialog).toHaveAttribute('data-state', 'open');
    await expect(within(dialog).getByRole('heading', { name: 'Debug' })).toBeVisible();
  },
};

export const PortOpen: Story = {
  args: { controller: createFakeController({ running: true, session: 'story-session' }) },
};
