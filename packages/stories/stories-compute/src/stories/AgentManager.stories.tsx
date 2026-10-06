//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren } from 'react';

import { translations as debugTranslations } from '@dxos/react-ui-debug/translations';
import { ModuleContainer, createStoryDecorators } from '@dxos/storybook-testing';

import { AgentProvider, StoryRole } from '../modules/index.ts';
import { EDGE_DEV_URL, EDGE_LOCAL_URL, makeEdgeConfig, surfacesPlugin } from '../testing/story-config.ts';

/** Agents run only in this runtime. */
const LocalProvider = ({ children }: PropsWithChildren) => <AgentProvider>{children}</AgentProvider>;

/** Agents run locally or on the EDGE service the client is configured for. */
const EdgeProvider = ({ children }: PropsWithChildren) => <AgentProvider edge>{children}</AgentProvider>;

/**
 * Background agents as processes: each prompt spawns a scripted agent, locally or on EDGE, whose card
 * shows a live, read-only transcript of its thoughts and tool calls.
 */
const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-compute/AgentManager',
  render: ModuleContainer,
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...debugTranslations],
  },
  args: {
    layout: [[StoryRole.AgentPrompt, StoryRole.Logging], [StoryRole.Agents]],
    columns: '28rem_1fr',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: createStoryDecorators({ plugins: [surfacesPlugin()], Wrapper: LocalProvider }),
};

export const EdgeLocal: Story = {
  decorators: createStoryDecorators({
    plugins: [surfacesPlugin()],
    Wrapper: EdgeProvider,
    config: makeEdgeConfig(EDGE_LOCAL_URL),
  }),
};

export const EdgeRemote: Story = {
  decorators: createStoryDecorators({
    plugins: [surfacesPlugin()],
    Wrapper: EdgeProvider,
    config: makeEdgeConfig(EDGE_DEV_URL),
  }),
};
