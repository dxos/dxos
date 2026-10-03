//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Atom from 'effect/reactivity/Atom';
import React, { useMemo } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';
import { Settings } from '#types';

import { ExcalidrawSettings } from './ExcalidrawSettings.tsx';

type StoryArgs = {
  settings: Settings.Settings;
};

// The container reads and writes the contributed settings entry, so the story owns one per render.
const DefaultStory = ({ settings }: StoryArgs) => {
  const subject = useMemo(
    () => ({
      prefix: pluginMeta.profile.key,
      schema: Settings.Settings,
      atom: Atom.make<Settings.Settings>(settings).pipe(Atom.keepAlive),
    }),
    [settings],
  );

  return <ExcalidrawSettings subject={subject} />;
};

const meta = {
  title: 'plugins/plugin-excalidraw/containers/ExcalidrawSettings',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withPluginManager()],
  tags: ['settings'],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: {
      autoHideControls: true,
      gridType: 'mesh',
    },
  },
};

/**
 * 1. Test: the settings render on `react-ui-form` as bordered two-track rows; the switch and the select edit
 * the settings.
 */
export const Test: Story = {
  args: Default.args,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    // 2. Each setting is a row field: title, then description and control on one line.
    const rows = canvasElement.querySelectorAll('[data-scope="field"][data-part="root"][data-layout="row"]');
    await expect(rows).toHaveLength(2);

    // 3. The controls edit the settings.
    const toggle = canvas.getByRole('switch', { name: 'Auto hide controls' });
    await expect(toggle).toBeChecked();
    await userEvent.click(toggle);
    await waitFor(() => expect(toggle).not.toBeChecked());
    await userEvent.click(canvas.getByRole('combobox', { name: 'Grid type' }));
    await userEvent.click(await body.findByRole('option', { name: 'dotted' }));
    await waitFor(() => expect(canvas.getByRole('combobox', { name: 'Grid type' })).toHaveTextContent('dotted'));
  },
};
