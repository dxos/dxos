//
// Copyright 2026 DXOS.org
//

/**
 * Two agents with different permissions. Scout researches accounts and holds no grant to change the CRM; Ledger keeps
 * the CRM and holds `/crm/write`. Asked to mark an account active, Scout is refused, hands the request to Ledger, and
 * Ledger makes the change on its own permissions. Each agent's permissions show on its name, and each process's in the
 * process tree.
 *
 * @title Agents with different permissions
 * @mdl packages/core/compute/compute/AGENT-DELEGATION.mdl test QA-1
 * @app storybook via `DX_STORIES=stories/stories-assistant moon run storybook-react:serve` on :9009,
 *   story `stories-stories-assistant-agents-delegation--crm-agents` in isolation mode
 */

const SCOUT = '[data-testid="chat-panel-Scout"]';
const LEDGER = '[data-testid="chat-panel-Ledger"]';
const HEADER = '[data-testid="chat-module.agent-header"]';
const PROCESSES = '[data-testid="processes-module"]';
const OBJECTS = '[data-testid="database-module"]';
const REQUEST = 'Bramble Coffee Roasters signed the contract. Mark them active in the CRM.';

/** Waits for `text` inside the first element `selector` matches. */
const waitForText = (page, selector, text, timeout = 30_000) =>
  page.locator(selector).first().getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout });

export const steps = [
  {
    name: 'Open the story',
    setup: true,
    run: async ({ page }) => {
      await page.locator(`${LEDGER} ${HEADER}`).waitFor({ state: 'visible', timeout: 120_000 });
      await waitForText(page, PROCESSES, 'Ledger: /crm/write', 60_000);
    },
  },
  {
    name: 'See who holds what',
    narration: 'Two agents share one CRM tool, but only Ledger is granted the permission to change records.',
    run: async ({ demo, page }) => {
      await demo.title({
        value: 'Agents with different permissions',
        subtitle: 'AGENT-DELEGATION.mdl QA-1',
        hold: 3_600,
      });
      await demo.caption({ value: 'Each agent holds its own permissions', subtitle: 'hover its name' });
      await demo.hover({ selector: `${SCOUT} ${HEADER}`, label: 'Scout' });
      await page.getByText('No permissions', { exact: true }).first().waitFor({ state: 'visible', timeout: 10_000 });
      await demo.sleep({ ms: 2_000 });
      await demo.hover({ selector: `${LEDGER} ${HEADER}`, label: 'Ledger' });
      await page
        .getByText('Permissions: Change CRM records', { exact: true })
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 });
      await demo.sleep({ ms: 2_000 });
    },
  },
  {
    name: 'Read the process tree',
    narration: 'Every process carries its authority: who it acts as, and what it may do.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Every process lists its permissions', subtitle: 'the process tree' });
      await demo.hover({ selector: `${PROCESSES} >> text=/Ledger: \\/crm\\/write/`, label: 'Ledger' });
      await demo.sleep({ ms: 2_000 });
      await demo.hover({ selector: `${PROCESSES} >> text=/Scout: no permissions/`, label: 'Scout' });
      await demo.sleep({ ms: 2_000 });
    },
  },
  {
    name: 'Ask Scout for the change',
    narration: 'Asked to update the CRM, Scout tries, and the runtime denies the call.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Ask Scout to update the CRM', subtitle: 'it lacks /crm/write' });
      await demo.click({ selector: `${SCOUT} [data-testid="chat.suggestion"]`, label: 'Suggestion' });
      await waitForText(page, SCOUT, REQUEST, 15_000);
      await waitForText(page, SCOUT, '1 denied', 30_000);
      await demo.sleep({ ms: 2_500 });
    },
  },
  {
    name: 'Watch the hand-over',
    narration: 'So Scout hands the request to Ledger, which makes the change on its own permissions.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Scout hands it to Ledger', subtitle: 'which holds the permission' });
      await waitForText(page, SCOUT, 'handed the change to Ledger', 30_000);
      await waitForText(page, LEDGER, 'is now active in the CRM.', 60_000);
      await demo.sleep({ ms: 2_500 });
    },
  },
  {
    name: 'Check the account',
    narration:
      'The account is active, and no agent ever held more than it was granted: permissions travel with each process, not the request.',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'The account is active',
        subtitle: 'changed by the agent allowed to',
        position: 'top',
      });
      await demo.click({ selector: `${OBJECTS} >> text=Bramble Coffee Roasters`, label: 'Bramble Coffee Roasters' });
      await waitForText(page, `${OBJECTS} [data-testid="database-module.selected"]`, '"active"', 10_000);
      await demo.sleep({ ms: 9_000 });
    },
  },
];
