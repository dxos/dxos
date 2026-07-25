//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { DelegationSkill, PlanningSkill, WebSearchSkill } from '@dxos/assistant-toolkit';
import { MarkdownSkill } from '@dxos/plugin-markdown';

import { StoryRole } from '../modules';
import { ModuleContainer, config, createDecorators, storyParameters } from '../testing';

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/Chat',
  render: ModuleContainer,
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const { MarkdownPlugin } = await import('@dxos/plugin-markdown/plugin');
      return {
        plugins: [MarkdownPlugin()],
      };
    },
  }),
  args: {
    layout: [[StoryRole.Chat], [StoryRole.Logging, StoryRole.Config]],
  },
};

export const WithPlanning: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const { MarkdownPlugin } = await import('@dxos/plugin-markdown/plugin');
      return {
        plugins: [MarkdownPlugin()],
      };
    },
    skills: [MarkdownSkill.key, PlanningSkill.key],
  }),
  args: {
    layout: [[StoryRole.Chat], [AppSurface.deckCompanion('trace'), StoryRole.Context]],
  },
};

/**
 * Two surfaces over a shared space: the conversational ChatModule (left) and the activity
 * TraceModule (right). Prompt the supervisor to delegate work to a sub-agent; DelegateTask records
 * it as an in-progress plan task and the sub-agent process surfaces as a nested lane in the trace.
 */
export const WithSubAgents: Story = {
  decorators: createDecorators({
    // TODO(burdon): Move instructions to skill?
    createAgent: {
      name: 'Supervisor',
      instructions: 'You delegate units of work to sub-agents using the available tools.',
    },
    lazyPlugins: async () => {
      const { MarkdownPlugin } = await import('@dxos/plugin-markdown/plugin');
      return {
        plugins: [MarkdownPlugin()],
      };
    },
    skills: [DelegationSkill.key, PlanningSkill.key, MarkdownSkill.key],
  }),
  args: {
    layout: [[StoryRole.Chat], [AppSurface.deckCompanion('trace'), StoryRole.Context]],
  },
};

/**
 * Two surfaces over a shared space: ChatModule (left) and TracePanel (right).
 * Agent tool invocations populate the execution-graph timeline in the companion panel.
 */
export const WithExecutionGraph: Story = {
  decorators: createDecorators({
    config: config.remote,
    lazyPlugins: async () => {
      const { MarkdownPlugin } = await import('@dxos/plugin-markdown/plugin');
      return {
        plugins: [MarkdownPlugin()],
      };
    },
    skills: [MarkdownSkill.key],
  }),
  args: {
    layout: [[StoryRole.Chat], [AppSurface.deckCompanion('trace')]],
  },
};

export const WithWebSearch: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const { MarkdownPlugin } = await import('@dxos/plugin-markdown/plugin');
      return {
        plugins: [MarkdownPlugin()],
      };
    },
    config: config.remote,
    skills: [WebSearchSkill.key],
  }),
  args: {
    layout: [[StoryRole.Chat]],
  },
};

/**
 * Interaction test for end-to-end delegation: enters a prompt that delegates a unit of work,
 * then waits for the supervisor to run the sub-agent and fold its result back into the conversation.
 *
 * Live AI and timing-sensitive, so it is excluded from CI `test` runs (`tags: ['!test']`);
 * run it manually in storybook (it needs a reachable EDGE AI service via `config.remote`).
 */
export const WithSubAgentsTest: Story = {
  ...WithSubAgents,
  tags: ['!test'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The chat prompt is a CodeMirror editor; locate it via its placeholder.
    const placeholder = await canvas.findByText(/enter question or command/i, {}, { timeout: 30_000 });
    const editor = placeholder.closest('.cm-editor')?.querySelector<HTMLElement>('.cm-content');
    if (!editor) {
      throw new Error('Chat editor not found.');
    }

    // Enter a prompt that delegates work to a sub-agent and submit it.
    await userEvent.click(editor);
    await userEvent.type(editor, 'Delegate a task to a sub-agent to compute 10 factorial.');
    await userEvent.keyboard('{Enter}');

    // The supervisor runs the sub-agent in the background and posts the result back to the chat.
    await canvas.findByText(/sub-agent completed/i, {}, { timeout: 180_000 });
  },
};
