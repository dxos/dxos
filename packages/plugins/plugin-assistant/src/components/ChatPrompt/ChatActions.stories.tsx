//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useState } from 'react';
import { expect, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { corePlugins } from '@dxos/plugin-testing';
import { type ActionGraphProps } from '@dxos/react-ui-menu';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { type ChatEvent } from '../Chat';
import { ChatActions, type ChatActionsProps } from './ChatActions';

type StoryArgs = Pick<ChatActionsProps, 'processing' | 'canSend' | 'tasksVisible' | 'debug' | 'customActions'>;

const DefaultStory = ({ tasksVisible: initialTasksVisible, ...args }: StoryArgs) => {
  // Held here rather than fixed by args so the toggle can be clicked and seen to change.
  const [tasksVisible, setTasksVisible] = useState(initialTasksVisible);
  const handleEvent = (event: ChatEvent) => {
    if (event.type === 'toggle-tasks') {
      setTasksVisible((visible) => !visible);
    }
  };

  return <ChatActions {...args} tasksVisible={tasksVisible} onSend={() => {}} onEvent={handleEvent} />;
};

const meta = {
  title: 'plugins/plugin-assistant/components/ChatActions',
  component: ChatActions,
  render: DefaultStory,
  decorators: [withTheme(), withPluginManager({ plugins: corePlugins() })],
  parameters: { layout: 'centered', translations },
} satisfies Meta<typeof ChatActions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { canSend: true, tasksVisible: true },
};

/** Mid-turn: the same control the reader just sent with is now the one that stops it. */
export const Processing: Story = {
  args: { processing: true, canSend: false, tasksVisible: true },
};

export const TasksHidden: Story = {
  args: { canSend: true, tasksVisible: false },
};

/** Nothing typed yet: the send control is present but inert. */
export const Empty: Story = {
  args: { canSend: false, tasksVisible: true },
};

export const SendIsOneControl: Story = {
  args: { canSend: true, tasksVisible: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // One control, idle: send. The two used to sit side by side with one of them always dead.
    // `findBy` with a raised timeout: the plugin manager mounts the row asynchronously, and the
    // default second is not enough when the whole suite is competing for the browser.
    const send = await canvas.findByTestId('assistant.send', {}, { timeout: 10_000 });
    await expect(send).toHaveAccessibleName('Send');
    await expect(canvas.queryAllByTestId('assistant.send')).toHaveLength(1);
  },
};

export const StopReplacesSendWhileProcessing: Story = {
  args: { processing: true, canSend: false, tasksVisible: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Same control, same handle — the mode is what changed.
    const stop = await canvas.findByTestId('assistant.send', {}, { timeout: 10_000 });
    await expect(stop).toHaveAccessibleName('Stop processing');
    await expect(canvas.queryAllByTestId('assistant.send')).toHaveLength(1);
    // Enabled despite `canSend: false`: stopping is always available while a turn runs.
    await expect(stop).toBeEnabled();
  },
};

export const TaskToggleFlips: Story = {
  args: { canSend: true, tasksVisible: true },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const toggle = await canvas.findByTestId('assistant.toggle-tasks', {}, { timeout: 10_000 });
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(toggle);
    await expect(canvas.getByTestId('assistant.toggle-tasks')).toHaveAttribute('aria-pressed', 'false');
  },
};

/** A contributed action with no `custom` render, the way plugin-review files "Add comment". */
const plainContributedActions = Atom.make<ActionGraphProps>({
  nodes: [
    {
      id: 'story-action',
      type: AppGraphNode.ActionType,
      data: () => {},
      properties: { label: 'Story action', icon: 'ph--chat-text--regular', testId: 'story.contributed-action' },
    },
  ],
  edges: [{ source: 'root', target: 'story-action', relation: 'child' }],
}).pipe(Atom.keepAlive);

/**
 * Plain contributed items render `Toolbar.*` primitives, which need the roving-focus context from
 * the row's `Menu.Toolbar` — without it this story crashes the way the assistant companion did on
 * commentable objects.
 */
export const ContributedPlainAction: Story = {
  args: { canSend: true, tasksVisible: true },
  render: (args) => <DefaultStory {...args} customActions={plainContributedActions} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const action = await canvas.findByTestId('story.contributed-action', {}, { timeout: 10_000 });
    await expect(action).toBeEnabled();
    await expect(canvas.getByTestId('assistant.send')).toBeInTheDocument();
  },
};
