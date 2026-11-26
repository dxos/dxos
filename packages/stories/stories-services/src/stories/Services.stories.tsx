//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

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
    layout: [[StoryRole.Notes, StoryRole.Summarizer], [StoryRole.Hosts]],
    columns: '28rem_1fr',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * One consumer, three places a provider can run.
 *
 * 1. Notes are provided in the app host and bound in memory.
 * 2. Summarize fails: no host provides the contract.
 * 3. Start EDGE (mock) and install the summarizer there: the call streams over a port.
 * 4. Give the app a gateway and install the summarizer in the app: the same client rebinds in memory.
 * 5. Start the frame and install the summarizer there; Probe shows what the sandbox refuses.
 */
export const Default: Story = {
  decorators: StoryHarness.decorators({ plugins: [consumerPlugin()], Wrapper: ServicesProvider }),
};
