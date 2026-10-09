//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren } from 'react';

import { translations as debugTranslations } from '@dxos/react-ui-debug/translations';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { ModuleContainer, createStoryDecorators } from '@dxos/storybook-testing';

import { ComputeProvider, StoryRole } from '../modules/index.ts';
import { EDGE_DEV_URL, EDGE_LOCAL_URL, makeEdgeConfig, surfacesPlugin } from '../testing/story-config.ts';

/** Processes run only in this runtime. */
const LocalProvider = ({ children }: PropsWithChildren) => <ComputeProvider>{children}</ComputeProvider>;

/** Processes run locally or on the EDGE service the client is configured for. */
const EdgeProvider = ({ children }: PropsWithChildren) => <ComputeProvider edge>{children}</ComputeProvider>;

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
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: createStoryDecorators({ plugins: [surfacesPlugin()], Wrapper: LocalProvider }),
};

/** A local EDGE stack (`pnpm stack:start` in the edge repo), whose edge worker listens on :8787. */
export const EdgeLocal: Story = {
  decorators: createStoryDecorators({
    plugins: [surfacesPlugin()],
    Wrapper: EdgeProvider,
    config: makeEdgeConfig(EDGE_LOCAL_URL),
  }),
};

/** Dev EDGE; it must host the Mandelbrot process key for remote spawns to succeed. */
export const EdgeRemote: Story = {
  decorators: createStoryDecorators({
    plugins: [surfacesPlugin()],
    Wrapper: EdgeProvider,
    config: makeEdgeConfig(EDGE_DEV_URL),
  }),
};
