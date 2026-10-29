//
// Copyright 2026 DXOS.org
//

/**
 * A chat on Claude Code chooses its model, effort and permissions in the agent picker. Nothing is sent: the
 * choices are what the chat's session would be opened with.
 *
 * @mdl packages/plugins/plugin-claude/PLUGIN.mdl test QA-6
 * @app a composer-app bundle (`DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:bundle`, with
 *   `DX_EDGE_BASE_URL` set to an EDGE so Claude Code is offered there too), served by `vite preview` on :4173.
 */

const LINGER = 2_000;

const PLANK = '[data-testid="deck.plank"]:has([data-testid="assistant.thread"])';
const PROMPT = `${PLANK} [data-testid="assistant.prompt"] .cm-content`;
const PICKER = `${PLANK} [data-testid="assistant.agent-picker"]`;

/** Opens the agent picker, chooses one item in it, and waits for the menu to close. */
const choose = async ({ demo, page }, selector, label) => {
  await demo.click({ selector: PICKER, label: 'Agent picker' });
  await page.locator(selector).first().waitFor();
  await page.waitForTimeout(LINGER / 2);
  await demo.click({ selector, label });
  await page.locator(selector).first().waitFor({ state: 'detached' });
};

/** Opens the picker and checks that `selector` is the checked item of its group. */
const showChecked = async ({ demo, page }, selector) => {
  await demo.click({ selector: PICKER, label: 'Agent picker' });
  await page.locator(`${selector}[data-state="checked"], ${selector}[aria-checked="true"]`).first().waitFor();
  await page.waitForTimeout(LINGER);
  await demo.press({ key: 'Escape' });
};

/** The chat's session, read from the open chat object. */
const session = (page) =>
  page.evaluate(async () => {
    const [chat] = await dxos
      .spaces(document.querySelector('[data-testid="spacePlugin.space"]').dataset.value.split('/').pop())
      .db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.assistant.chat')))
      .run();
    return JSON.parse(JSON.stringify(chat?.session ?? {}));
  });

export const steps = [
  {
    name: 'Prep (off camera): enable Claude',
    setup: true,
    run: async ({ demo, page }) => {
      await page.locator('[data-testid="spacePlugin.createObject"]').first().waitFor({ timeout: 180_000 });
      const notice = page.locator('[data-testid="org.dxos.plugin.observability.notice"] button:has-text("Close")');
      if (await notice.isVisible().catch(() => false)) {
        await notice.click();
      }
      if (!(await page.evaluate(() => composer.manager.getEnabled().includes('org.dxos.plugin.claude')))) {
        await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', label: 'Plugins' });
        await demo.fill({ selector: 'input[placeholder="Filter…"]', value: 'Claude' });
        await demo.click({ selector: 'label.dx-switch:has(input[aria-label="Claude"])', label: 'Enable Claude' });
        await page.waitForFunction(() => composer.manager.getEnabled().includes('org.dxos.plugin.claude'));
        await demo.click({ selector: '[data-testid="spacePlugin.space"] >> nth=0', label: 'Space' });
      }
      await demo.cut();
    },
  },
  {
    name: 'Create a chat',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Create a chat' });
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({
        selector: '[data-testid="create-object-form.type.org.dxos.type.assistant.chat"]',
        label: 'Chat',
      });
      await page.locator(PROMPT).first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(LINGER);
    },
  },
  {
    name: 'Run the chat on Claude Code',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Run it on Claude Code', subtitle: 'Model, effort and permissions, per chat' });
      await choose({ demo, page }, '[data-testid="assistant.agents.claude-code"]', 'Claude Code');
      await page.locator(`${PICKER}:has-text("Claude Code")`).waitFor();
      await demo.click({ selector: PICKER, label: 'Agent picker' });
      for (const setting of ['agentModel', 'agentEffort', 'agentMode']) {
        await page.locator(`[data-testid="assistant.${setting}.unset"]`).waitFor();
      }
      await page.waitForTimeout(LINGER * 2);
      await demo.press({ key: 'Escape' });
    },
  },
  {
    name: 'Choose Opus',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Choose the model', subtitle: 'Opus' });
      await choose({ demo, page }, '[data-testid="assistant.agentModel.opus"]', 'Opus');
      await page.locator(`${PICKER}:has-text("Claude Code · Opus")`).waitFor();
      await page.waitForTimeout(LINGER);
    },
  },
  {
    name: 'Choose High effort',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Choose the effort', subtitle: 'High' });
      await choose({ demo, page }, '[data-testid="assistant.agentEffort.high"]', 'High');
      await showChecked({ demo, page }, '[data-testid="assistant.agentEffort.high"]');
    },
  },
  {
    name: 'Choose Bypass permissions',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Choose the permissions', subtitle: 'No classifier, no questions' });
      await choose({ demo, page }, '[data-testid="assistant.agentMode.bypassPermissions"]', 'Bypass permissions');
      await showChecked({ demo, page }, '[data-testid="assistant.agentMode.bypassPermissions"]');
      const chosen = await session(page);
      if (chosen.agentModel !== 'opus' || chosen.agentEffort !== 'high' || chosen.agentMode !== 'bypassPermissions') {
        throw new Error(`the chat's session holds ${JSON.stringify(chosen)}`);
      }
      await demo.caption({ value: 'The chat runs on Opus, at high effort, bypassing permissions' });
      await page.waitForTimeout(LINGER * 2);
    },
  },
];
