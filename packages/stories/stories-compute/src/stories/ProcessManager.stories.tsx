//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren } from 'react';

import { Config } from '@dxos/config';
import { translations as debugTranslations } from '@dxos/react-ui-debug/translations';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { ModuleContainer, createStoryDecorators, makeModuleSurfacesPlugin } from '@dxos/storybook-testing';

import { ComputeProvider, StoryRole, moduleSurfaces } from '../modules/index.ts';

const surfacesPlugin = () => makeModuleSurfacesPlugin('org.dxos.stories.compute.modules', moduleSurfaces);

/** Remote processes run on a second in-memory runtime behind the EDGE control surface. */
const SimulatedProvider = ({ children }: PropsWithChildren) => (
  <ComputeProvider remote='simulated'>{children}</ComputeProvider>
);

/** Remote processes run on the dev EDGE service. */
const EdgeProvider = ({ children }: PropsWithChildren) => <ComputeProvider remote='edge'>{children}</ComputeProvider>;

/** Client config pointing at the dev EDGE service, for the story that spawns there for real. */
const edgeConfig = new Config({
  version: 1,
  runtime: {
    client: { edgeFeatures: { signaling: true, agents: true } },
    services: { edge: { url: 'https://dev.dxos.network' } },
  },
});

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-compute/ProcessManager',
  render: ModuleContainer,
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...debugTranslations, ...formTranslations],
  },
  args: {
    layout: [[StoryRole.Command, StoryRole.Logging], [StoryRole.Processes]],
    columns: '28rem_1fr',
    rows: ['1fr_1fr'],
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: createStoryDecorators({ plugins: [surfacesPlugin()], Wrapper: SimulatedProvider }),
};

/** EDGE must host the Mandelbrot process key for remote spawns to succeed. */
export const Edge: Story = {
  decorators: createStoryDecorators({ plugins: [surfacesPlugin()], Wrapper: EdgeProvider, config: edgeConfig }),
};
