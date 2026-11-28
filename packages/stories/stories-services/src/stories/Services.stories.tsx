//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as ModuleContainer from '@dxos/storybook-testing/ModuleContainer';
import * as ModuleSurfacesPlugin from '@dxos/storybook-testing/ModuleSurfacesPlugin';
import * as StoryHarness from '@dxos/storybook-testing/StoryHarness';

import { ServicesProvider, StoryRole, moduleSurfaces } from '../modules/index.ts';

/** The consumer plugin: it contributes the panels, and reaches both services only through their contracts. */
const consumerPlugin = () => ModuleSurfacesPlugin.make('org.dxos.stories.services.modules', moduleSurfaces);

const meta: Meta<typeof ModuleContainer.Root> = {
  title: 'stories/stories-services/Services',
  render: ModuleContainer.Root,
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
  },
  args: {
    layout: [
      [StoryRole.Settings, StoryRole.Summarizer],
      [StoryRole.AppHost, StoryRole.FrameHost, StoryRole.EdgeHost],
    ],
    columns: '28rem_1fr',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * One consumer, three places a provider can run. The left column is the consumer, and each panel
 * logs the route its calls took. The right column is one host module shown three times, configured
 * as the app, the sandboxed frame and the mock EDGE host; the frame and EDGE are started from theirs.
 *
 * 1. Settings are provided in the app host and bound in memory.
 * 2. Summarize fails: no host provides the contract.
 * 3. Start the EDGE host (mock) and install the summarizer there: the call streams over a port.
 * 4. Install the summarizer in the app as well: it stays inactive, since only EDGE has an AI gateway,
 *    and calls still go to EDGE.
 * 5. Install settings in the EDGE host: inactive there, since a worker has no local storage.
 * 6. Start the frame host and install settings there, then uninstall settings from the app: the same
 *    client rebinds over a port, to settings kept in the frame's own storage. Probe shows what the
 *    sandbox refuses.
 */
export const Default: Story = {
  decorators: StoryHarness.decorators({ plugins: [consumerPlugin()], Wrapper: ServicesProvider }),
};

const TIMEOUT = { timeout: 30_000 };

/**
 * The same story, driven: one consumer calls `Settings`, which only a local host can provide, and
 * `Summarizer`, which only the remote host can. The frame step is left to `Default`, since it needs
 * the dev server under a second loopback name.
 */
export const Calls: Story = {
  decorators: StoryHarness.decorators({ plugins: [consumerPlugin()], Wrapper: ServicesProvider }),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const binding = (id: string, expected: string) =>
      waitFor(async () => expect((await canvas.findByTestId(id)).textContent).toContain(expected), TIMEOUT);
    const summarize = async (host: string) => {
      await userEvent.click(await canvas.findByTestId('summarizer-run'));
      const output = await canvas.findByTestId('summarizer-output');
      // The first token names the host that answered; the last marks the end of the stream.
      await waitFor(() => expect(output.textContent).toMatch(new RegExp(`^\\[${host}\\].*\\.\\.\\.$`)), TIMEOUT);
    };

    await step('Call a service provided in the app: bound in memory', async () => {
      await binding('settings-binding', 'memory → app');
      await userEvent.click(await canvas.findByTestId('settings-reset'));
      await userEvent.click(await canvas.findByTestId('settings-set'));
      await waitFor(
        async () => expect((await canvas.findByTestId('settings-list')).textContent).toMatch(/theme.*dark/),
        TIMEOUT,
      );
    });

    await step('Call a service nobody provides: a typed error', async () => {
      await binding('summarizer-binding', 'no provider');
      await userEvent.click(await canvas.findByTestId('summarizer-run'));
      await waitFor(
        async () =>
          expect((await canvas.findByTestId('summarizer-error')).textContent).toContain('ServiceNotAvailableError'),
        TIMEOUT,
      );
    });

    const status = (id: string, expected: string) =>
      waitFor(async () => expect((await canvas.findByTestId(id)).textContent).toContain(expected), TIMEOUT);

    await step('Install the summarizer in the mock EDGE host: the call crosses a port', async () => {
      await userEvent.click(await canvas.findByTestId('toggle-edge'));
      await userEvent.click(await canvas.findByTestId('install-summarizer-edge', {}, TIMEOUT));
      await status('plugin-summarizer-edge', 'active');
      await binding('summarizer-binding', 'port → edge');
      await summarize('edge');
    });

    await step('Install it in the app too: no AI gateway there, so calls still go to EDGE', async () => {
      await userEvent.click(await canvas.findByTestId('install-summarizer-app'));
      await status('plugin-summarizer-app', 'host has no aiGateway');
      await binding('summarizer-binding', 'port → edge');
      await summarize('edge');
    });

    await step(
      'Install settings in the EDGE host: no local storage there, so the app still provides them',
      async () => {
        await userEvent.click(await canvas.findByTestId('install-settings-edge'));
        await status('plugin-settings-edge', 'host has no localStorage');
        await binding('settings-binding', 'memory → app');
      },
    );
  },
};
