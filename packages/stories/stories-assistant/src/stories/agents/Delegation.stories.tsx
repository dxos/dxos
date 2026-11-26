//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Model } from '@dxos/ai';
import { ScriptedScene } from '@dxos/ai/testing';
import * as Agent from '@dxos/compute/Agent';
import * as ModuleContainer from '@dxos/storybook-testing/ModuleContainer';
import type * as StoryModules from '@dxos/storybook-testing/StoryModules';
import { Organization } from '@dxos/types';

import { type ChatModuleData, StoryRole } from '../../modules/index.ts';
import { LEDGER_DONE, SCOUT_DELEGATED, SCOUT_REQUEST, Scripts } from '../../scripts/index.ts';
import {
  CRM_ACCOUNT,
  CRM_AGENTS,
  CRM_WRITE,
  CrmPermissionsPlugin,
  LEDGER,
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

/**
 * The account's record as the object tree shows it once selected, so the play reads what the reader sees; the panel
 * follows the object, so a later read sees a later change.
 */
const accountRecord = async (canvasElement: HTMLElement): Promise<HTMLElement> => {
  const objects = within(await within(canvasElement).findByTestId('database-module'));
  await userEvent.click(await objects.findByText(CRM_ACCOUNT, {}, { timeout: 10_000 }));
  return objects.findByTestId('database-module.selected', {}, { timeout: 10_000 });
};

const expectStatus = (record: HTMLElement, status: string) =>
  waitFor(() => expect(record.textContent).toMatch(new RegExp(`"status":\\s*"${status}"`)), { timeout: 10_000 });

const permissionsOf = (agent: string): readonly string[] =>
  CRM_AGENTS.find(({ name }) => name === agent)?.commands ?? [];

/** Each agent's chat as a plank headed by its name (its permissions on hover), then the space's object tree. */
const LAYOUT = [
  [
    {
      type: StoryRole.Chat,
      id: `chat-${SCOUT}`,
      data: {
        agent: SCOUT,
        permissions: permissionsOf(SCOUT),
        hue: 'amber',
        suggestions: [SCOUT_REQUEST],
      } satisfies ChatModuleData,
    },
  ],
  [
    {
      type: StoryRole.Chat,
      id: `chat-${LEDGER}`,
      data: { agent: LEDGER, permissions: permissionsOf(LEDGER), hue: 'emerald' } satisfies ChatModuleData,
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
    onReady: ({ db }) => seedCrmAgents({ db }),
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

    // Hovering an agent's name shows the grants it holds; the tooltip opens in a portal outside the canvas.
    const ledgerHeader = within(await canvas.findByTestId(`chat-panel-${LEDGER}`)).getByTestId(
      'chat-module.agent-header',
    );
    await userEvent.hover(ledgerHeader);
    await within(document.body).findByText(`Permissions: ${CRM_WRITE}`, {}, { timeout: 10_000 });
    await userEvent.unhover(ledgerHeader);

    const record = await accountRecord(canvasElement);
    await expectStatus(record, 'prospect');
    // Each agent's session sits under its agent, so the collapsed tree names each agent once.
    const objects = within(await canvas.findByTestId('database-module'));
    await waitFor(() => expect(objects.getAllByText(LEDGER)).toHaveLength(1), { timeout: 10_000 });
    await expect(objects.getAllByText(SCOUT)).toHaveLength(1);
    // A session's feed sits under its session, so none is listed at the top level.
    await expect(objects.queryAllByText('org.dxos.type.feed')).toHaveLength(0);
    // Visible, not only present: a highlighter that collapses to no width keeps its text in the DOM.
    await expect(record.firstElementChild?.getBoundingClientRect().width ?? 0).toBeGreaterThan(0);

    await userEvent.click(await canvas.findByRole('button', { name: SCOUT_REQUEST }, { timeout: 60_000 }));
    await canvas.findAllByText(new RegExp(SCOUT_DELEGATED), {}, { timeout: 60_000 });

    const ledger = within(await canvas.findByTestId(`chat-panel-${LEDGER}`));
    await ledger.findAllByText(LEDGER_DONE, {}, { timeout: 60_000 });
    await expectStatus(record, 'active');
  },
};

/**
 * {@link CrmAgents} on a real model (Claude Sonnet 5 through EDGE) rather than the script: Scout decides for itself
 * to hand the refused change to Ledger. Live AI, so excluded from CI.
 */
export const CrmAgentsLive: Story = {
  decorators: createDecorators({
    types: [Agent.Agent, Organization.Organization],
    plugins: [CrmPermissionsPlugin()],
    onReady: ({ db }) => seedCrmAgents({ db, model: Model.claudeSonnet5.id }),
  }),
  args: { layout: LAYOUT },
  tags: ['!test'],
};
