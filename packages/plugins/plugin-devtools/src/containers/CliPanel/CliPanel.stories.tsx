//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { userEvent } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { withClientProvider } from '@dxos/react-client/testing';
import { runCommand, waitForTerminal } from '@dxos/react-ui-terminal/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { CliPanel } from './CliPanel';

const meta = {
  title: 'plugins/plugin-devtools/containers/CliPanel',
  component: CliPanel,
  decorators: [
    withPluginManager({ capabilities: [] }),
    withClientProvider({ createIdentity: true, createSpace: true }),
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
  ],
  parameters: {
    layout: 'fullscreen',
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

    // `space list` reaches the client and reports the story's space.
    await runCommand(canvasElement, 'space list', keyboard);
    await waitForTerminal(canvasElement, 'Test Space');
    await waitForTerminal(canvasElement, 'SPACE_READY');

    // `database query` reaches ECHO through the layer the command provides for itself.
    await runCommand(canvasElement, 'database query', keyboard);
    await waitForTerminal(canvasElement, 'org.dxos.type.spaceProperties');
  },
};
