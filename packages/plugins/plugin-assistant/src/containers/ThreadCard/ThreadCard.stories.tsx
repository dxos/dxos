//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo } from 'react';
import { expect, waitFor } from 'storybook/test';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import { withPluginManager } from '@dxos/app-framework/testing';
import type * as Reducer from '@dxos/compute/Reducer';
import * as Trajectory from '@dxos/compute/Trajectory';
import { ChatThread, assistantRegistry, translations as assistantTranslations } from '@dxos/react-ui-assistant';
import { createHierarchicalFeed } from '@dxos/react-ui-assistant/testing';
import { type ThreadLane } from '@dxos/react-ui-assistant/types';
import { FeedModel } from '@dxos/react-ui-feed';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type Message } from '@dxos/types';

import { AssistantSurface } from '#types';

import { arrangeLanes } from '../../chat-model/lanes.ts';
import { LaneSurfaceWidget } from '../../components/Chat/LaneSurfaceWidget.tsx';
import { ThreadCard, type ThreadCardProps } from './ThreadCard.tsx';

const registry = { lane: { ...assistantRegistry.lane, Component: LaneSurfaceWidget } };

/** The thread's `<lane>` row dispatched through the surface, as the plugin's chat does it. */
const DefaultStory = () => {
  const { messages, lanes, forks } = useMemo(() => createHierarchicalFeed(), []);
  const model = useMemo(() => new FeedModel({ messages: [...messages], stops: 'prompt' }), [messages]);
  const getLane = useCallback((message: Message.Message) => lanes.get(message.id), [lanes]);
  const getForks = useCallback((message: Message.Message) => forks.get(message.id), [forks]);
  return (
    <ChatThread.Root model={model} viewType='normal' registry={registry} getLane={getLane} getForks={getForks}>
      <ChatThread.Viewport />
    </ChatThread.Root>
  );
};

/** The feed's lanes as the reducer reports them, every one in the background, as when the reader keeps moving on. */
const backgroundLanes = (lanes: ReadonlyMap<string, ThreadLane>): readonly Reducer.Lane[] => {
  const unique = [...new Map([...lanes.values()].map((lane) => [lane.id, lane])).values()];
  return unique.map(({ id, status, owner, started, title, waitingOn }) => {
    const waited = waitingOn && unique.find((lane) => lane.title === waitingOn.title);
    return {
      id: Trajectory.ThreadId.make(id),
      kind: 'light',
      status,
      owner: { role: 'assistant', ...(owner !== undefined ? { name: owner } : {}) },
      created: started,
      ...(title !== undefined ? { purpose: title } : {}),
      ...(waited ? { waitingOn: Trajectory.ThreadId.make(waited.id) } : {}),
      overlapped: true,
      backgrounded: true,
    };
  });
};

/**
 * A chat whose threads are all cards: `arrangeLanes` folds each thread's rows into one card at its first row, so the
 * cards flow down the conversation with the main thread between them, and a finished thread's answer lands below.
 */
const ChatWithCardsStory = () => {
  const { messages, lanes: threadLanes } = useMemo(() => createHierarchicalFeed(), []);
  const { messages: rows, lanes } = useMemo(
    () =>
      arrangeLanes({
        messages,
        tail: 0,
        lanes: backgroundLanes(threadLanes),
        laneOf: new Map([...threadLanes].map(([messageId, lane]) => [messageId, lane.id])),
      }),
    [messages, threadLanes],
  );
  const model = useMemo(() => new FeedModel({ messages: rows, stops: 'prompt' }), [rows]);
  const getLane = useCallback((message: Message.Message) => lanes.get(message.id), [lanes]);
  return (
    <ChatThread.Root model={model} viewType='normal' registry={registry} getLane={getLane}>
      <ChatThread.Viewport />
    </ChatThread.Root>
  );
};

const replacement = ({ lane }: ThreadCardProps) => <div data-testid='story.replaced-card'>{lane.title}</div>;

const meta = {
  title: 'plugins/plugin-assistant/containers/ThreadCard',
  render: () => <DefaultStory />,
  decorators: [withLayout({ layout: 'column', classNames: 'w-[50rem]' }), withTheme()],
  parameters: { layout: 'fullscreen', translations: assistantTranslations },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const surface = (component: typeof ThreadCard | typeof replacement) =>
  Capability.contribute(Capabilities.ReactSurface, [
    Surface.create({
      id: 'story.threadCard',
      filter: Surface.makeFilter(AssistantSurface.ThreadCard),
      component,
      props: ({ data }) => data,
    }),
  ]);

export const Default: Story = {
  decorators: [withPluginManager({ capabilities: [surface(ThreadCard)] })],
};

export const ChatWithCards: Story = {
  render: () => <ChatWithCardsStory />,
  decorators: [withPluginManager({ capabilities: [surface(ThreadCard)] })],
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelectorAll('[data-testid="chat.lane-card"]').length).toBeGreaterThan(0),
    );
  },
};

/** A plugin replaces the lane's card by contributing a surface on the role. */
export const TestReplaced: Story = {
  decorators: [withPluginManager({ capabilities: [surface(replacement)] })],
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-testid="story.replaced-card"]')?.textContent).toBe(
        'Collect beta sign-ups',
      ),
    );
    await expect(canvasElement.querySelector('[data-testid="chat.lane-card"]')).toBeNull();
  },
};
