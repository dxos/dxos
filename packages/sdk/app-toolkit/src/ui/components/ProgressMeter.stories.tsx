//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useRef, useState } from 'react';

import { type Progress } from '@dxos/progress';
import { Panel } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { ProgressMeter, type ProgressMeterProps } from './ProgressMeter';

const STEP = 3;
const TICK_MS = 400;

const DefaultStory = ({ state: stateProp, ...args }: ProgressMeterProps) => {
  const startRef = useRef(Date.now());
  const [state, setState] = useState<Progress.TaskProgress>(stateProp);
  useEffect(() => {
    startRef.current = Date.now();
    setState(stateProp);
    // Only a running task advances; error/done states render as-is.
    if (stateProp.status !== 'running') {
      return;
    }

    const interval = setInterval(() => {
      setState((prev) => {
        // Loop back to 0 once complete (when a total is known) so the bar keeps animating.
        const looped = prev.total != null && prev.current >= prev.total;
        if (looped) {
          startRef.current = Date.now();
          clearInterval(interval);
          return prev;
        }

        const now = Date.now();
        return {
          ...prev,
          current: looped ? 0 : prev.current + STEP,
          startedAt: new Date(startRef.current).toISOString(),
          updatedAt: new Date(now).toISOString(),
          elapsedMs: now - startRef.current,
        };
      });
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [stateProp]);

  return (
    <Panel.Root classNames='border'>
      <Panel.Toolbar />
      <Panel.Content>Content</Panel.Content>
      <Panel.Statusbar asChild>
        <ProgressMeter {...args} state={state} />
      </Panel.Statusbar>
    </Panel.Root>
  );
};

const meta = {
  title: 'sdk/app-toolkit/components/ProgressMeter',
  component: ProgressMeter,
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof ProgressMeter>;

export default meta;

type Story = StoryObj<typeof meta>;

const base = (overrides: Partial<Progress.TaskProgress>): Progress.TaskProgress => ({
  name: 'sync/mailbox',
  label: 'Syncing Inbox',
  current: 42,
  total: 120,
  status: 'running',
  startedAt: new Date(Date.now() - 8_000).toISOString(),
  updatedAt: new Date().toISOString(),
  elapsedMs: 8_000,
  cancellable: true,
  ...overrides,
});

export const Determinate: Story = {
  args: {
    classNames: 'w-[30rem]',
    state: base({}),
    onCancel: () => {},
  },
};

export const Indeterminate: Story = {
  args: {
    classNames: 'w-[30rem]',
    state: base({ total: undefined }),
    onCancel: () => {},
  },
};

export const Error: Story = {
  args: {
    classNames: 'w-[30rem]',
    state: base({ status: 'error', error: 'Network unreachable' }),
    onCancel: () => {},
  },
};
