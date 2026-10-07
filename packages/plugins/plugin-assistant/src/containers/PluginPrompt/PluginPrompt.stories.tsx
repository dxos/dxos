//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { DXN } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Operations from '@dxos/plugin-registry/Operations';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { PluginPrompt, type PluginPromptProps } from './PluginPrompt.tsx';

const DOCTOR_KEY = 'org.dxos.plugin.doctor';
const NOTES_KEY = 'org.dxos.plugin.notes';

/** Installed plugins with nothing to contribute: the prompt only reads their name and enablement. */
const makePlugin = (key: string, name: string) =>
  Plugin.define(Plugin.makeMeta({ key: DXN.make(key), name })).pipe(Plugin.make)();

/** Stands in for plugin-registry's handler, which the story host does not load. */
const enablePlugins = Operations.RegistryOperation.EnablePlugins.pipe(
  Operation.withHandler(({ ids }) =>
    Effect.gen(function* () {
      const manager = yield* Plugin.Service;
      for (const id of ids) {
        yield* manager.enable(id);
      }
      return { enabled: [...ids], rejected: [] };
    }),
  ),
);

/** Doctor starts off, which is when the agent asks: the story host enables every plugin it is given. */
const DefaultStory = (props: PluginPromptProps) => {
  const manager = PluginManagerProvider.usePluginManager();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void EffectEx.runPromise(manager.disable(DOCTOR_KEY)).then(() => setReady(true));
  }, [manager]);

  return ready ? <PluginPrompt {...props} /> : <></>;
};

const meta = {
  title: 'plugins/plugin-assistant/containers/PluginPrompt',
  component: PluginPrompt,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column', classNames: 'p-4' }),
    withPluginManager({
      plugins: [...CorePlugins.make(), makePlugin(DOCTOR_KEY, 'Doctor'), makePlugin(NOTES_KEY, 'Notes')],
      capabilities: [Capability.contribute(Capabilities.OperationHandler, OperationHandlerSet.make(enablePlugins))],
    }),
  ],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof PluginPrompt>;

export default meta;

type Story = StoryObj<typeof meta>;

/** An installed plugin that is off: the agent may only ask, so the card offers the one button that turns it on. */
export const Default: Story = {
  args: { plugin: DOCTOR_KEY },
};

/** Already on: nothing to do, so no button. */
export const Enabled: Story = {
  args: { plugin: NOTES_KEY },
};

/** Not installed on this host: the card says so and offers nothing to click. */
export const Unavailable: Story = {
  args: { plugin: 'org.dxos.plugin.missing' },
};

/** Clicking Enable turns the plugin on, and the card settles into its enabled state. */
export const TestEnable: Story = {
  args: { plugin: DOCTOR_KEY },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: 'Enable' }));
    await expect(await canvas.findByText(/enabled/i)).toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: 'Enable' })).toBeNull();
  },
};
