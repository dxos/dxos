//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import { userEvent } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/plugin';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { runCommand, waitForTerminal } from '@dxos/react-ui-terminal/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { CliPanel } from './CliPanel';

const meta = {
  title: 'plugins/plugin-devtools/containers/CliPanel',
  component: CliPanel,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withTheme(),
    withPluginManager({
      // No setup event: the panel fires `CommandsRequested` itself, which is what pulls the
      // plugins' command modules in — the same path the app takes.
      plugins: [
        ...corePlugins(),
        // The identity brings a default space, which is what the commands resolve against.
        ClientPlugin({ onClientInitialized: ({ client }) => Effect.asVoid(initializeIdentity(client)) }),
        StorybookPlugin({}),
        // The real plugin, so the story covers it actually contributing its commands.
        SpacePlugin({}),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations,
  },
} satisfies Meta<typeof CliPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Drives real `dx` commands against the story's client, so a break in the wiring between the shell
 * and the client surfaces here rather than in the app.
 */
export const Spec: Story = {
  play: async ({ canvasElement }) => {
    const keyboard = (text: string) => userEvent.keyboard(text);
    await waitForTerminal(canvasElement, 'dx>');

    // `space list` reaches the client and reports its space.
    await runCommand(canvasElement, 'space list', keyboard);
    await waitForTerminal(canvasElement, 'SPACE_READY');

    // `database query` reaches ECHO through the layer the command provides for itself.
    await runCommand(canvasElement, 'database query', keyboard);
    await waitForTerminal(canvasElement, 'org.dxos.type.spaceProperties');

    // A command from another plugin, whose service arrives via that plugin's contributed layer
    // rather than anything this panel names.
    await runCommand(canvasElement, 'config view', keyboard);
    await waitForTerminal(canvasElement, 'runtime');
  },
};
