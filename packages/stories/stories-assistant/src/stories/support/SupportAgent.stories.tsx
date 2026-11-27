//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ScriptedScene } from '@dxos/ai/testing';
import * as DelegationSkill from '@dxos/assistant-toolkit/DelegationSkill';
import * as PlanningSkill from '@dxos/assistant-toolkit/PlanningSkill';
import { Blob, Feed, Tag } from '@dxos/echo';
import * as BrainPlugin from '@dxos/plugin-brain/BrainPlugin';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { TagIndex } from '@dxos/schema';
import {
  CORPUS,
  Cites,
  EntitiesPlugin,
  ResearchPlugin,
  ResponderPlugin,
  SupportProvider,
  SupportRole,
  moduleSurfaces as supportSurfaces,
  seed,
} from '@dxos/stories-support/testing';
import * as ModuleContainer from '@dxos/storybook-testing/ModuleContainer';
import * as ModuleSurfacesPlugin from '@dxos/storybook-testing/ModuleSurfacesPlugin';
import { Message, Organization, Person } from '@dxos/types';

import { type ChatPlaneModuleData, StoryRole } from '../../modules/index.ts';
import {
  SUPPORT_DELEGATED,
  SUPPORT_REQUEST,
  SUPPORT_SESSIONS,
  Scripts,
  type SupportSessionKey,
  supportSessionDone,
} from '../../scripts/index.ts';
import { SupportAgentPlugin, SupportSkill, createDecorators, storyParameters } from '../../testing/index.ts';

/**
 * The support inbox of `stories-support`, with an agent working the tasks its pipeline leaves for people. Messages from
 * customers run through the pipeline: a question a document answers gets a cited draft, everything else a task. The
 * support agent then reads the open tasks, keeps the requests and the question only the customer's logs answer for the
 * team, and hands each question it can research to a session of its own (`AGENT-DELEGATION.mdl`, F-2.2). The task is
 * the control plane: it is assigned to the session, which writes the missing document when there is none, answers
 * through the pipeline's own rule so the draft cites that document, and marks the task done.
 *
 * Phase 2 of `.agents/superpowers/specs/2026-11-26-customer-support-demo-design.md`, on scripted models.
 */
const meta: Meta<typeof ModuleContainer.Root> = {
  title: 'stories/stories-assistant/support/SupportAgent',
  render: (args) => (
    <SupportProvider stageDelay='150 millis' interval='900 millis'>
      <ModuleContainer.Root {...args} />
    </SupportProvider>
  ),
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

/** The research the pipeline runs times out for the last message, so its question becomes a task. */
const FAULTS = CORPUS.filter((entry) => entry.fault === 'research').map((entry) => entry.text);

const supportAgent: Story = {
  decorators: createDecorators({
    types: [
      Blob.Blob,
      Cites.Cites,
      Feed.Feed,
      Mailbox.Mailbox,
      Message.Message,
      Organization.Organization,
      Person.Person,
      Tag.Tag,
      TagIndex.TagIndex,
    ],
    plugins: [
      BrainPlugin.make(),
      EntitiesPlugin(),
      ResearchPlugin({ failOn: (question) => FAULTS.includes(question) }),
      ResponderPlugin(),
      ModuleSurfacesPlugin.make('org.dxos.stories.support.modules', supportSurfaces),
      SupportAgentPlugin(),
    ],
    onInit: async ({ space }) => {
      await seed(space.db);
    },
    skills: [SupportSkill.key, DelegationSkill.key, PlanningSkill.key],
    scripted: ScriptedScene.play(Scripts.supportAgent),
    assistantSettings: { parallelThreads: true },
  }),
  args: {
    layout: [
      [SupportRole.Messages],
      [SupportRole.Pipeline],
      [SupportRole.Tasks, SupportRole.Drafts],
      [
        {
          type: StoryRole.ChatPlane,
          data: {
            kind: 'chats',
            suggestions: [SUPPORT_REQUEST],
            align: 'start',
            defaultDrawer: 'tasks',
          } satisfies ChatPlaneModuleData,
        },
      ],
    ],
    columns: 'minmax(18rem,22rem)_minmax(16rem,20rem)_minmax(18rem,24rem)_1fr',
  },
};

/**
 * The support inbox and its agent, scripted (offline), for a person or a recorded walkthrough to drive.
 *
 * Test:
 * 1. Click "Start the generators" in the Messages column: twelve messages arrive and run through the pipeline. Seven
 *    end in a cited draft and six in a task.
 * 2. Click the chip that asks the agent to work the open support tasks: it lists them, keeps four for the team, and
 *    starts a session for each of the other two; the two tasks show as started.
 * 3. Watch the sessions' columns: one writes a Hyperdrive document, since the space has none, and answers from it; the
 *    other searches again for the question whose search timed out.
 * 4. Each session's draft appears in the Drafts column citing its document, and its task is done.
 */
export const Default: Story = { ...supportAgent };

const TIMEOUT = { timeout: 60_000 };

/** {@link Default} driven by a play function: the inbox runs, the agent delegates two tasks, both end in drafts. */
export const Scripted: Story = {
  ...supportAgent,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const rows = (list: string) => within(canvas.getByTestId(list)).queryAllByTestId(`${list}.item`);

    await step('Every message runs through the pipeline', async () => {
      await userEvent.click(await canvas.findByTestId('support.play', {}, TIMEOUT));
      await waitFor(() => expect(rows('support.messages')).toHaveLength(CORPUS.length), TIMEOUT);
      await waitFor(() => expect(rows('support.tasks')).toHaveLength(6), TIMEOUT);
      await waitFor(() => expect(rows('support.drafts')).toHaveLength(7), TIMEOUT);
    });

    await step('The agent hands the two questions it can research to sessions', async () => {
      await userEvent.click(await canvas.findByRole('button', { name: SUPPORT_REQUEST }, TIMEOUT));
      await canvas.findAllByText(new RegExp(SUPPORT_DELEGATED), {}, { timeout: 90_000 });
    });

    await step('Each session drafts a cited reply and closes its task', async () => {
      for (const key of Object.keys(SUPPORT_SESSIONS) as SupportSessionKey[]) {
        await canvas.findAllByText(new RegExp(supportSessionDone(key)), {}, { timeout: 120_000 });
      }
      await waitFor(() => expect(rows('support.drafts')).toHaveLength(9), TIMEOUT);
      const drafts = canvas.getByTestId('support.drafts').textContent;
      for (const { cites } of Object.values(SUPPORT_SESSIONS)) {
        await expect(drafts).toContain(`Cites ${cites}`);
      }
    });
  },
};
