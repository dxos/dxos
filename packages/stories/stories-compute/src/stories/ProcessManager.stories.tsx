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

/** Processes run only in this runtime. */
const LocalProvider = ({ children }: PropsWithChildren) => <ComputeProvider>{children}</ComputeProvider>;

/** Processes run locally or on the EDGE service the client is configured for. */
const EdgeProvider = ({ children }: PropsWithChildren) => <ComputeProvider edge>{children}</ComputeProvider>;

/** Client config pointing at an EDGE service, for the stories that spawn there for real. */
const makeEdgeConfig = (url: string) =>
  new Config({
    version: 1,
    runtime: {
      client: { edgeFeatures: { signaling: true, agents: true } },
      services: { edge: { url } },
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
  decorators: createStoryDecorators({ plugins: [surfacesPlugin()], Wrapper: LocalProvider }),
};

/** Dev EDGE; it must host the Mandelbrot process key for remote spawns to succeed. */
export const EdgeRemote: Story = {
  decorators: createStoryDecorators({
    plugins: [surfacesPlugin()],
    Wrapper: EdgeProvider,
    config: makeEdgeConfig('https://dev.dxos.network'),
  }),
};

/** A local EDGE stack (`pnpm stack:start` in the edge repo), whose edge worker listens on :8787. */
export const EdgeLocal: Story = {
  decorators: createStoryDecorators({
    plugins: [surfacesPlugin()],
    Wrapper: EdgeProvider,
    config: makeEdgeConfig('http://localhost:8787'),
  }),
};
