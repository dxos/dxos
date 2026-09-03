//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import {
  type DebugPortController,
  type DebugPortStartOptions,
  type DebugPortStatus as DebugPortStatusType,
} from '@dxos/react-client/devtools';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { DebugPanelStatus } from './DebugPanelStatus.tsx';

/**
 * Stand-in for the page-wide controller: the real one long-polls a loopback server and evaluates
 * whatever it returns, which a story must never do. The popover panel needs an app context, so
 * the story exercises only the indicator.
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
  decorators: [withTheme()],
  parameters: { translations },
} satisfies Meta<typeof DebugPanelStatus>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { controller: createFakeController() },
};

export const PortOpen: Story = {
  args: { controller: createFakeController({ running: true, session: 'story-session' }) },
};
