//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { useCapability } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { withTheme } from '@dxos/react-ui/testing';

import { ProgressPlugin } from '#plugin';
import { translations } from '#translations';

import { ProgressStatusIndicator } from './ProgressStatusIndicator.tsx';

/** Seeds the shared {@link AppCapabilities.ProgressRegistry} with two active providers on mount. */
const DefaultStory = () => {
  const progress = useCapability(AppCapabilities.ProgressRegistry);
  useEffect(() => {
    progress.register('sync/inbox', { label: 'Syncing Inbox', total: 120 }).set(42);
    progress.register('sync/calendar', { label: 'Syncing Calendar' }).set(7);
  }, [progress]);

  return <ProgressStatusIndicator />;
};

const TICK_MS = 200;

/** One space's scripted backlog: what the space replication producer reports, without a space. */
type ScriptedSpace = {
  key: string;
  label: string;
  total: number;
  /** Items synced per tick. */
  rate: number;
  /** Whether the space starts a new backlog once it catches up, so the story never goes idle. */
  loop?: boolean;
};

const SPACES: ScriptedSpace[] = [
  {
    key: 'space/dx',
    label: 'Syncing DX Space',
    total: 1121,
    rate: 7,
    loop: true,
  },
  {
    key: 'space/bramble',
    label: 'Syncing Bramble Coffee',
    total: 15,
    rate: 3,
  },
];

/**
 * Drives the registry the way `space-replication-progress` does: one monitor per space, opened at
 * zero with the backlog as its total, `set` on every sync-state update, `remove` once it clears. Watched with the popover open, which is
 * the only way to see that an open popover follows the registry rather than the state it opened on.
 */
const LiveStory = () => {
  const progress = useCapability(AppCapabilities.ProgressRegistry);
  useEffect(() => {
    const current = new Map(SPACES.map((space) => [space.key, 0]));
    const monitors = new Map(
      SPACES.map((space) => [space.key, progress.register(space.key, { label: space.label, total: space.total })]),
    );

    const interval = setInterval(() => {
      for (const space of SPACES) {
        const monitor = monitors.get(space.key);
        if (!monitor) {
          continue;
        }

        const next = Math.min(space.total, (current.get(space.key) ?? 0) + space.rate);
        current.set(space.key, next);
        monitor.set(next);
        if (next < space.total) {
          continue;
        }

        // Caught up: the producer drops the monitor, and a looping space registers a fresh run.
        monitor.remove();
        monitors.delete(space.key);
        if (space.loop) {
          current.set(space.key, 0);
          monitors.set(space.key, progress.register(space.key, { label: space.label, total: space.total }));
        }
      }
    }, TICK_MS);

    return () => {
      clearInterval(interval);
      for (const monitor of monitors.values()) {
        monitor.remove();
      }
    };
  }, [progress]);

  return <ProgressStatusIndicator />;
};

const meta = {
  title: 'plugins/plugin-progress/ProgressStatusIndicator',
  component: ProgressStatusIndicator,
  render: DefaultStory,
  decorators: [withTheme(), withPluginManager({ plugins: [ProgressPlugin()] })],
  parameters: { layout: 'centered', translations },
} satisfies Meta<typeof ProgressStatusIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Live: Story = {
  render: LiveStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button'));

    // Read from the bar's value rather than the readout's text: the popover is portaled, and the
    // readout's format is the meter's to change.
    const bar = (label: string) => document.querySelector(`[aria-label="${label}"]`);
    const fraction = (label: string) => bar(label)?.getAttribute('aria-valuenow') ?? null;
    await waitFor(() => expect(bar('Syncing DX Space')).not.toBeNull());
    const before = fraction('Syncing DX Space');
    // An open popover keeps following the registry: the bar moves without closing and reopening.
    await waitFor(() => expect(fraction('Syncing DX Space')).not.toBe(before), { timeout: 3_000 });

    // A space that catches up leaves the list while the popover stays open for the one still syncing.
    await waitFor(() => expect(bar('Syncing Bramble Coffee')).toBeNull(), { timeout: 5_000 });
    await expect(bar('Syncing DX Space')).not.toBeNull();
  },
};
