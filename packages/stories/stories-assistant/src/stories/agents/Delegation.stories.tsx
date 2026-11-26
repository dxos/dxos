//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ScriptedScene } from '@dxos/ai/testing';
import * as Agent from '@dxos/compute/Agent';
import { type Database, Filter } from '@dxos/echo';
import * as ModuleContainer from '@dxos/storybook-testing/ModuleContainer';
import { Organization } from '@dxos/types';

import { type ChatModuleData, StoryRole } from '../../modules/index.ts';
import { LEDGER_DONE, LEDGER_REQUEST, SCOUT_REFUSED, SCOUT_REQUEST, Scripts } from '../../scripts/index.ts';
import {
  CRM_ACCOUNT,
  CrmPermissionsPlugin,
  LEDGER,
  SCOUT,
  createDecorators,
  seedCrmAgents,
  storyParameters,
} from '../../testing/index.ts';

/**
 * Two agents in one space with different permissions. Scout researches accounts and holds no grant to change the
 * CRM; Ledger keeps the CRM and holds `/crm/write`. Both have the same CRM tool, and each agent's sessions run under a
 * guard holding only that agent's grants, so the same call is refused for Scout and admitted for Ledger.
 *
 * A request for a CRM change that reaches Scout is the case cross-agent delegation exists for
 * (`packages/core/compute/compute/AGENT-DELEGATION.mdl`, F-3): Scout cannot make the change, and Ledger can. Until
 * Scout can hand the work to Ledger, the reader asks Ledger in its own chat.
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
  args: {
    layout: [
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
          data: { agent: LEDGER, hue: 'emerald', suggestions: [LEDGER_REQUEST] } satisfies ChatModuleData,
        },
      ],
    ],
  },
};

/**
 * Scout and Ledger side by side, scripted (offline), for a person or a recorded walkthrough to drive.
 *
 * Test:
 * 1. Click the chip in Scout's chat that asks to mark the account active: the CRM refuses Scout's call, and Scout says
 *    it lacks `/crm/write` and that Ledger holds it.
 * 2. Click the chip in Ledger's chat that asks for the same change: Ledger's call is admitted and the account is active.
 */
export const CrmAgents: Story = { ...crmAgents };

/** {@link CrmAgents} driven by a play function: Scout is refused, Ledger makes the change. */
export const CrmAgentsScripted: Story = {
  ...crmAgents,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: SCOUT_REQUEST }, { timeout: 60_000 }));
    await canvas.findAllByText(new RegExp(SCOUT_REFUSED), {}, { timeout: 60_000 });
    await expect(await accountStatus()).toBe('prospect');

    await userEvent.click(await canvas.findByRole('button', { name: LEDGER_REQUEST }, { timeout: 30_000 }));
    await canvas.findAllByText(LEDGER_DONE, {}, { timeout: 60_000 });
    await waitFor(async () => expect(await accountStatus()).toBe('active'), { timeout: 10_000 });
  },
};
