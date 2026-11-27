//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Blob, Feed, Tag } from '@dxos/echo';
import * as BrainPlugin from '@dxos/plugin-brain/BrainPlugin';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { TagIndex, Text } from '@dxos/schema';
import * as ModuleContainer from '@dxos/storybook-testing/ModuleContainer';
import * as ModuleSurfacesPlugin from '@dxos/storybook-testing/ModuleSurfacesPlugin';
import * as StoryHarness from '@dxos/storybook-testing/StoryHarness';
import { Message, Organization, Person, Task, TaskSet } from '@dxos/types';

import { CORPUS, seed } from '../generators/index.ts';
import { StoryRole, SupportProvider, type SupportProviderProps, moduleSurfaces } from '../modules/index.ts';
import { EntitiesPlugin, ResearchPlugin, ResponderPlugin } from '../plugins/index.ts';
import { Cites } from '../types/index.ts';

/** Messages whose research is made to fail, to show a failed stage. */
const FAULTS = CORPUS.filter((entry) => entry.fault === 'research').map((entry) => entry.text);

const LAYOUT: ModuleContainer.Layout = [
  [StoryRole.Messages],
  [StoryRole.Pipeline],
  [StoryRole.Facts],
  [StoryRole.Objects],
  [StoryRole.Drafts],
  [StoryRole.Tasks],
];

type StoryArgs = Pick<SupportProviderProps, 'stageDelay' | 'interval'>;

const DefaultStory = (props: StoryArgs) => (
  <SupportProvider {...props}>
    <ModuleContainer.Root layout={LAYOUT} />
  </SupportProvider>
);

const meta = {
  title: 'stories/stories-support/Support',
  render: DefaultStory,
  decorators: StoryHarness.decorators({
    types: [
      Blob.Blob,
      Cites.Cites,
      Feed.Feed,
      Mailbox.Mailbox,
      Markdown.Document,
      Message.Message,
      Organization.Organization,
      Person.Person,
      Tag.Tag,
      TagIndex.TagIndex,
      Task.Task,
      TaskSet.TaskSet,
      Text.Text,
    ],
    plugins: [
      SpacePlugin.make({}),
      BrainPlugin.make(),
      // The three plugins whose processors the pipeline runs.
      EntitiesPlugin(),
      ResearchPlugin({ failOn: (question) => FAULTS.includes(question) }),
      ResponderPlugin(),
      ModuleSurfacesPlugin.make('org.dxos.stories.support.modules', moduleSurfaces),
    ],
    onInit: async ({ space }) => {
      await seed(space.db);
    },
  }),
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * A support inbox for Cloudflare Workers. External people send messages; each one runs through six pipeline stages,
 * shown as a card of rows in the Pipeline column.
 *
 * 1. Send the next message: Ada asks about the CPU time limit. Her card runs to the end, a question fact appears, and
 *    a draft citing "Workers platform limits" is written.
 * 2. Send the next message: Chen asks why a deploy failed. No passage answers it, so a task is made instead.
 * 3. Start the generators and watch the rest arrive: new people and organizations are created or matched, requests
 *    become tasks, and the last message shows a failed research stage.
 */
export const Default: Story = {};

const TIMEOUT = { timeout: 30_000 };

/** The story, driven: an answerable question ends in a cited draft and an unanswerable one in a task. */
export const Flow: Story = {
  args: { stageDelay: 0 },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const send = async () => userEvent.click(await canvas.findByTestId('support.step', {}, TIMEOUT));
    const rows = (list: string) => within(canvas.getByTestId(list)).queryAllByTestId(`${list}.item`);
    /** The stage statuses of the newest message's card, once its last stage has ended. */
    const finished = async (total: number) => {
      await waitFor(() => expect(canvas.queryAllByTestId('support.run')).toHaveLength(total), TIMEOUT);
      const [card] = canvas.getAllByTestId('support.run');
      await waitFor(
        () => expect(card.querySelector('[data-stage="triage"]')?.getAttribute('data-status')).toBe('success'),
        TIMEOUT,
      );
      return within(card)
        .getAllByTestId('support.run.stage')
        .map((stage) => stage.getAttribute('data-status'));
    };

    await step('An answerable question ends in a draft that cites its document', async () => {
      await send();
      await expect(await finished(1)).toEqual(['success', 'success', 'success', 'success', 'success', 'success']);
      await waitFor(() => expect(rows('support.drafts')).toHaveLength(1), TIMEOUT);
      await expect(rows('support.drafts')[0].textContent).toContain('Re: CPU time limit');
      await expect(rows('support.drafts')[0].textContent).toContain('Cites Workers platform limits: CPU time');
      await expect(rows('support.tasks')).toHaveLength(0);
      await waitFor(() => expect(rows('support.messages')).toHaveLength(1), TIMEOUT);
    });

    await step('An unanswerable question ends in a task, not a draft', async () => {
      await send();
      await expect(await finished(2)).toEqual(['success', 'success', 'success', 'success', 'success', 'success']);
      await waitFor(() => expect(rows('support.tasks')).toHaveLength(1), TIMEOUT);
      await expect(rows('support.tasks')[0].textContent).toContain('Why did our Worker deploy fail');
      await expect(rows('support.drafts')).toHaveLength(1);
    });

    await step('The sender new to the space was added to the CRM graph', async () => {
      await waitFor(() => expect(canvas.getByTestId('support.objects').textContent).toContain('Chen Wei'), TIMEOUT);
      await expect(canvas.getByTestId('support.objects').textContent).toContain('Northwind');
    });

    await step('The questions were stored as facts', async () => {
      await waitFor(
        () => expect(canvas.getByTestId('support.facts').textContent).toContain('What is the CPU time limit'),
        TIMEOUT,
      );
    });
  },
};
