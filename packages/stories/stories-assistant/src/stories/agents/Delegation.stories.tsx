//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ScriptedScene } from '@dxos/ai/testing';
import * as Agent from '@dxos/compute/Agent';
import { type Database, Filter } from '@dxos/echo';
import * as ModuleContainer from '@dxos/storybook-testing/ModuleContainer';
import type * as StoryModules from '@dxos/storybook-testing/StoryModules';
import { Organization } from '@dxos/types';

import { type ChatModuleData, StoryRole } from '../../modules/index.ts';
import { LEDGER_DONE, SCOUT_DELEGATED, SCOUT_REQUEST, Scripts } from '../../scripts/index.ts';
import {
  CRM_ACCOUNT,
  CrmPermissionsPlugin,
  LEDGER,
  PLAYGROUND_MODEL,
  SCOUT,
  createDecorators,
  seedCrmAgents,
  storyParameters,
} from '../../testing/index.ts';

/**
 * Two agents in one space with different permissions, and the first one handing work to the second. Scout researches
 * accounts and holds no grant to change the CRM; Ledger keeps the CRM and holds `/crm/write`. Both have the same CRM
 * tool, and each agent's sessions run under a guard holding only that agent's grants, so the same call is refused for
 * Scout and admitted for Ledger. Scout, refused, hands the request to Ledger with `delegate-to-agent`; Ledger works it
 * in its own session, on its own grants (`packages/core/compute/compute/AGENT-DELEGATION.mdl`, F-3).
 *
 * Each agent's chat is a plank headed by the agent's name; the space's object tree is on the right.
 */
const meta: Meta<typeof ModuleContainer.Root> = {
  title: 'stories/stories-assistant/agents/Delegation',
  render: ModuleContainer.Root,
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

// Captured when the space is seeded, so the play can read the account's status rather than read it off the page.
let storyDb: Database.Database | undefined;

const accountStatus = async () => {
  const organizations = storyDb ? await storyDb.query(Filter.type(Organization.Organization)).run() : [];
  return organizations.find(({ name }) => name === CRM_ACCOUNT)?.status;
};

/** Each agent's chat as a plank headed by its name, then the space's object tree. */
const LAYOUT = [
  [
    {
      type: StoryRole.Chat,
      id: `chat-${SCOUT}`,
      data: { agent: SCOUT, hue: 'amber', suggestions: [SCOUT_REQUEST] } satisfies ChatModuleData,
    },
  ],
  [
    {
      type: StoryRole.Chat,
      id: `chat-${LEDGER}`,
      data: { agent: LEDGER, hue: 'emerald' } satisfies ChatModuleData,
    },
  ],
  [
    {
      type: StoryRole.Database,
      id: 'objects',
      data: { view: 'object-tree' } satisfies StoryModules.DatabaseModuleData,
    },
  ],
];

const crmAgents: Story = {
  decorators: createDecorators({
    types: [Agent.Agent, Organization.Organization],
    plugins: [CrmPermissionsPlugin()],
    onReady: async ({ db }) => {
      storyDb = db;
      await seedCrmAgents({ db });
    },
    scripted: ScriptedScene.play(Scripts.crmAgents),
  }),
  args: { layout: LAYOUT },
};

/**
 * Scout and Ledger side by side, scripted (offline), for a person or a recorded walkthrough to drive.
 *
 * Test:
 * 1. Each chat plank is headed by its agent's name, and its session picker lists only that agent's sessions.
 * 2. Click the chip in Scout's chat that asks to mark the account active: the CRM refuses Scout's call, and Scout
 *    hands the request to Ledger.
 * 3. Ledger's chat takes the request as a turn from Scout, makes the change, and the account is active.
 * 4. The object tree on the right shows both agents, their sessions and the account.
 */
export const CrmAgents: Story = { ...crmAgents };

/** {@link CrmAgents} driven by a play function: Scout is refused and delegates, Ledger makes the change. */
export const CrmAgentsScripted: Story = {
  ...crmAgents,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Each plank is headed by its own agent, once both agents' chats have loaded.
    await waitFor(
      () =>
        expect(
          [...canvasElement.querySelectorAll('[data-testid="chat-module.agent"]')].map((header) => header.textContent),
        ).toEqual([SCOUT, LEDGER]),
      { timeout: 60_000 },
    );

    await userEvent.click(await canvas.findByRole('button', { name: SCOUT_REQUEST }, { timeout: 60_000 }));
    await canvas.findAllByText(new RegExp(SCOUT_DELEGATED), {}, { timeout: 60_000 });

    const ledger = within(await canvas.findByTestId(`chat-panel-${LEDGER}`));
    await ledger.findAllByText(LEDGER_DONE, {}, { timeout: 60_000 });
    await waitFor(async () => expect(await accountStatus()).toBe('active'), { timeout: 10_000 });
  },
};

/**
 * {@link CrmAgents} on a real model (DeepSeek V4 Pro through EDGE) rather than the script: Scout decides for itself
 * to hand the refused change to Ledger. Live AI, so excluded from CI.
 */
export const CrmAgentsLive: Story = {
  decorators: createDecorators({
    types: [Agent.Agent, Organization.Organization],
    plugins: [CrmPermissionsPlugin()],
    onReady: async ({ db }) => {
      storyDb = db;
      await seedCrmAgents({ db, model: PLAYGROUND_MODEL });
    },
  }),
  args: { layout: LAYOUT },
  tags: ['!test'],
};
