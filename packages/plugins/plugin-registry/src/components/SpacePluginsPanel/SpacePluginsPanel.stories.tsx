//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import '@dxos/react-ui/theme.css';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { type SpacePluginRow, SpacePluginsPanel } from './SpacePluginsPanel.tsx';

const PLUGINS: readonly Omit<SpacePluginRow, 'enabled'>[] = [
  { key: 'org.dxos.plugin.kanban', name: 'Kanban', description: 'Track work across columns.' },
  { key: 'org.dxos.plugin.markdown', name: 'Markdown', description: 'Write and edit documents.' },
  { key: 'org.dxos.plugin.sheet', name: 'Sheet', description: 'Spreadsheets with formulas.' },
  { key: 'org.dxos.plugin.table', name: 'Table', description: 'Structured records in a grid.' },
  { key: 'org.dxos.plugin.thread', name: 'Thread', description: 'Comment threads and channels.' },
];

const DefaultStory = ({ initial = [] }: { initial?: readonly string[] }) => {
  const [decisions, setDecisions] = useState<Record<string, boolean>>(
    Object.fromEntries(initial.map((key) => [key, true])),
  );
  const handleChange = useCallback(
    (key: string, enabled: boolean) => setDecisions((current) => ({ ...current, [key]: enabled })),
    [],
  );
  const handleReset = useCallback(() => setDecisions({}), []);

  return (
    <SpacePluginsPanel
      plugins={PLUGINS.map((plugin) => ({ ...plugin, enabled: decisions[plugin.key] === true }))}
      scoped={Object.values(decisions).some((enabled) => enabled)}
      onChange={handleChange}
      onReset={handleReset}
    />
  );
};

// Typed against the stateful wrapper, not the panel: a story's args are the initial decisions, and the
// panel's own props are whatever the wrapper is holding at the time.
const meta = {
  title: 'plugins/plugin-registry/components/SpacePluginsPanel',
  component: DefaultStory,
  parameters: {
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A space that names no plugins: its members each run their own set, and the reset is a no-op. */
export const Unscoped: Story = {
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'dx-deck-surface' })],
  parameters: { layout: 'fullscreen' },
};

/** A space that runs a set of its own, for every member. */
export const Scoped: Story = {
  args: { initial: ['org.dxos.plugin.table', 'org.dxos.plugin.thread'] },
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'dx-deck-surface' })],
  parameters: { layout: 'fullscreen' },
};

/** Enabling the first plugin takes the space from deferring to its members to naming its own set. */
export const Test: Story = {
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'dx-deck-surface' })],
  parameters: { layout: 'fullscreen' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const reset = canvas.getByTestId('spacePlugins.reset');
    await expect(reset).toBeDisabled();

    // The test id is on the switch's root label; the input that carries the state is inside it.
    const row = canvas.getByTestId('spacePlugins.toggle.org.dxos.plugin.thread');
    const toggle = within(row).getByRole('switch');
    await userEvent.click(row);
    await waitFor(() => expect(toggle).toBeChecked());
    // The space now names a set, so handing the choice back to its members is something to do.
    await waitFor(() => expect(reset).toBeEnabled());

    await userEvent.click(reset);
    await waitFor(() => expect(toggle).not.toBeChecked());
  },
};
