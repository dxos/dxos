//
// Copyright 2026 DXOS.org
//

/**
 * The chat prompt: the details tray, the "+" menu, `@` mentions, `/` commands and skills, and the
 * agent picker.
 *
 * @mdl packages/plugins/plugin-assistant/PLUGIN.mdl test QA-3
 * @app composer-app via `DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 4183`
 *
 * Setup seeds the space through `composer.invoke` and opens the chat by URL (`/w/<space>/db/<type>+<id>`).
 * The reply in "Send a prompt with mentions" comes from the real model through EDGE.
 */

const SUBTITLE = 'plugin-assistant/PLUGIN.mdl · QA-3';
const PROMPT = '[data-testid="assistant.prompt"] .cm-content';
const TRAY = '[data-testid="assistant.details"]';
const ADD_MENU = '[data-testid="assistant.add-menu"]';
const AGENT_PICKER = '[data-testid="assistant.agent-picker"]';
const COMPLETION = '.cm-tooltip-autocomplete';
const VIEW_MENU = 'button:has([data-icon="ph--eye--regular"])';
const MENTION_ITEM = 'li.dx-menu-item';

/**
 * The banner is pinned over the bottom of the page, where the prompt and the tray are, so each caption
 * is read first and cleared before the gestures it describes.
 */
const caption = async (demo, value) => {
  await demo.caption({ value, subtitle: SUBTITLE });
  await demo.sleep({ ms: 2_600 });
  await demo.clearCaption();
};

/** Text inside the tray, read from the DOM rather than trusted from the gesture. */
const trayHas = (page, text) =>
  page.locator(TRAY).getByText(text, { exact: true }).first().waitFor({ state: 'visible', timeout: 10_000 });

/**
 * Puts the caret at the end of the prompt by clicking past its text, so the pointer rests on empty
 * prompt rather than on an object chip, whose hover preview would cover the take.
 */
const clickPromptEnd = async (page) => {
  const prompt = page.locator(PROMPT);
  const box = await prompt.boundingBox();
  await prompt.click({ position: { x: box.width - 4, y: Math.min(12, box.height / 2) } });
  await page.keyboard.press('End');
};

const clearPrompt = async (page) => {
  await page.locator(PROMPT).click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Backspace');
};

export const steps = [
  {
    name: 'Seed the space and open the chat',
    setup: true,
    done: ({ page }) =>
      page
        .locator(PROMPT)
        .count()
        .then((count) => count > 0 && page.url().includes('assistant.chat')),
    run: async ({ page }) => {
      const url = await page.evaluate(async () => {
        const { Obj, Ref } = globalThis.__DXOS__;
        const client = globalThis.__DXOS__.client;
        const space = client.spaces.default ?? client.spaces.get()[0];
        const options = { spaceId: space.id };
        const invoke = (key, input) => globalThis.composer.invoke(key, input, options);
        const add = (object) => invoke('org.dxos.operation.space.addObject', { object });

        await invoke('org.dxos.operation.markdown.create', {
          name: 'Prompt redesign spec',
          content:
            '# Prompt redesign\n\nOne agent picker, a "+" menu by category, @ mentions, / commands and a details tray.',
        });
        await invoke('org.dxos.operation.markdown.create', {
          name: 'Q4 roadmap',
          content: '# Q4 roadmap\n\n- Ship the new prompt.\n- Harness-managed skills.',
        });
        await invoke('org.dxos.operation.markdown.create', {
          name: 'Meeting notes',
          content: '# Meeting notes\n\nOne PR.',
        });
        await add({ '@type': 'org.dxos.type.person', 'fullName': 'Rich Burdon' });
        await add({ '@type': 'org.dxos.type.organization', 'name': 'DXOS' });
        for (const [name, url] of [
          ['Linear', 'https://mcp.linear.app/mcp'],
          ['GitHub', 'https://api.githubcopilot.com/mcp/'],
        ]) {
          await add({ '@type': 'org.dxos.type.assistant.mcpServer', name, url, 'protocol': 'http', 'enabled': false });
        }

        const { object: chat } = await invoke('org.dxos.operation.assistant.createChat', { name: 'Prompt redesign' });
        await add(chat);
        const tasks = [];
        for (const title of ['Read the spec', 'Compare with the roadmap']) {
          const { object } = await add({
            '@type': 'org.dxos.type.task',
            title,
            'status': title === 'Read the spec' ? 'done' : 'todo',
          });
          tasks.push(object);
        }
        Obj.update(chat, (chat) => {
          chat.tasks = tasks.map((task) => Ref.make(task));
        });
        await space.db.flush();
        return `${location.origin}/w/${space.id}/db/org.dxos.type.assistant.chat+${chat.id}`;
      });
      await page.goto(url);
      await page.locator(PROMPT).waitFor({ state: 'visible', timeout: 30_000 });
      // Off camera: the privacy notice and the help companion would cover the prompt and the tray.
      for (const selector of [
        'li[role="status"]:has-text("Privacy Notice") button:has-text("Close")',
        'button[aria-label="Close companion"]',
      ]) {
        const control = page.locator(selector);
        if (await control.count()) {
          await control.first().click();
        }
      }
      await page.waitForTimeout(2_000);
    },
  },
  {
    name: 'Open the details tray',
    run: async ({ demo, page }) => {
      // Everything recorded so far is seeding and loading.
      await demo.cut();
      await demo.title({
        value: 'The new prompt',
        subtitle: 'Context, commands and the agent, in one place',
        hold: 3_600,
      });
      await caption(demo, 'The details tray shows what the chat has in context, and its tasks');
      await demo.click({ selector: '[data-testid="assistant.toggle-details"]', label: 'Details' });
      await trayHas(page, 'Compare with the roadmap');
      await demo.sleep({ ms: 2_500 });
    },
  },
  {
    name: 'Switch on an MCP server from the + menu',
    run: async ({ demo, page }) => {
      await caption(demo, '"+" holds things by kind; MCP servers are switched on here');
      await demo.click({ selector: ADD_MENU, label: 'Add' });
      await demo.hover({ selector: '[data-testid="assistant.add-menu.mcp-servers"]', label: 'MCP servers' });
      const linear = '[data-testid="assistant.add-menu.mcp-server"]:has-text("Linear")';
      await demo.click({ selector: linear, label: 'Linear' });
      // The menu stays open, so the check is what shows the server is on.
      await page.locator(`${linear}[data-state="checked"]`).waitFor({ state: 'visible', timeout: 5_000 });
      await demo.sleep({ ms: 1_800 });
      // And off again: with no sign-in, a turn would report it unavailable.
      await demo.click({ selector: linear, label: 'Linear' });
      await page.locator(`${linear}[data-state="unchecked"]`).waitFor({ state: 'visible', timeout: 5_000 });
      await demo.sleep({ ms: 1_000 });
      await demo.press({ key: 'Escape' });
      await demo.press({ key: 'Escape', hud: false });
      await demo.sleep({ ms: 800 });
    },
  },
  {
    name: 'Load a skill with a slash command',
    run: async ({ demo, page }) => {
      await caption(demo, '/ lists commands and every skill; picking a skill loads it into the chat');
      await clearPrompt(page);
      await demo.type({ selector: PROMPT, value: '/web', delay: 120 });
      await page.locator(COMPLETION).waitFor({ state: 'visible', timeout: 10_000 });
      await demo.sleep({ ms: 1_200 });
      await demo.press({ key: 'Enter' });
      await demo.press({ key: 'Enter' });
      await page.getByText('Loaded the Web Search skill.').first().waitFor({ state: 'visible', timeout: 15_000 });
      // Skills sit in their own section, collapsed so the tasks stay in view; opened here to show the new one.
      const skills = '[data-testid="assistant.details.skills"] [data-scope="collapsible"][data-part="trigger"]';
      await demo.click({ selector: skills, label: 'Skills' });
      await trayHas(page, 'Web Search');
      await demo.sleep({ ms: 2_500 });
      await demo.click({ selector: skills, label: 'Skills' });
      await demo.sleep({ ms: 800 });
    },
  },
  {
    name: 'Create a task with a slash command',
    run: async ({ demo, page }) => {
      await caption(demo, 'Commands run without the model: /task:create adds to the checklist');
      await demo.type({ selector: PROMPT, value: '/task:create Draft the launch note', delay: 60 });
      await page
        .locator(COMPLETION)
        .waitFor({ state: 'hidden', timeout: 5_000 })
        .catch(() => {});
      await demo.press({ key: 'Enter' });
      await trayHas(page, 'Draft the launch note');
      await page.locator(TRAY).getByText('Draft the launch note').first().scrollIntoViewIfNeeded();
      await demo.sleep({ ms: 2_000 });
    },
  },
  {
    name: 'Change the model and where the agent runs',
    run: async ({ demo, page }) => {
      await caption(demo, 'One picker for the agent, where it runs, and the model');
      await demo.click({ selector: AGENT_PICKER, label: 'Agent' });
      await demo.sleep({ ms: 1_500 });
      await demo.click({ selector: '[role="menuitemradio"]:has-text("Claude Opus 5")', label: 'Claude Opus 5' });
      await page.locator(AGENT_PICKER).getByText('Claude Opus 5').waitFor({ state: 'visible', timeout: 5_000 });
      await caption(demo, 'The icon says where the agent runs: this device, or EDGE');
      await demo.click({ selector: AGENT_PICKER, label: 'Agent' });
      await demo.click({ selector: '[data-testid="assistant.environment.edge"]', label: 'EDGE' });
      await page.locator(`${AGENT_PICKER}[data-location="edge"]`).waitFor({ state: 'visible', timeout: 5_000 });
      await demo.sleep({ ms: 1_500 });
      await demo.click({ selector: AGENT_PICKER, label: 'Agent' });
      await demo.click({ selector: '[data-testid="assistant.environment.local"]', label: 'This device' });
      await page.locator(`${AGENT_PICKER}[data-location="local"]`).waitFor({ state: 'visible', timeout: 5_000 });
      await demo.sleep({ ms: 1_000 });
    },
  },
  {
    name: 'Compose a message with mentions',
    run: async ({ demo, page }) => {
      await caption(demo, 'Objects go into the message as chips: from "+" by search, or with @');
      await clearPrompt(page);
      await demo.type({ selector: PROMPT, value: 'For ', delay: 70 });
      await demo.click({ selector: ADD_MENU, label: 'Add' });
      await demo.click({ selector: '[data-testid="assistant.add-menu.object"]', label: 'Add an object…' });
      await demo.type({ selector: '[data-testid="assistant.object-picker"] input', value: 'Rich' });
      await demo.click({
        selector: '[data-testid="assistant.object-picker"] [role="option"]:has-text("Rich Burdon")',
        label: 'Rich Burdon',
      });
      await clickPromptEnd(page);
      // The chip leaves a space after itself; the comma belongs against it.
      await demo.press({ key: 'Backspace', hud: false });
      await demo.type({ selector: PROMPT, value: ', in two sentences: how does @Prompt', delay: 60 });
      await page
        .locator(MENTION_ITEM)
        .filter({ hasText: 'Prompt redesign spec' })
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 });
      await demo.press({ key: 'Enter' });
      await demo.type({ selector: PROMPT, value: 'fit with @Q4', delay: 60 });
      await page
        .locator(MENTION_ITEM)
        .filter({ hasText: 'Q4 roadmap' })
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 });
      await demo.press({ key: 'Enter' });
      await demo.press({ key: 'Backspace', hud: false });
      await demo.type({ selector: PROMPT, value: '?', delay: 60 });
      // Nothing has joined the context yet: composing changes nothing until the message is sent.
      await page
        .locator(`${TRAY} [data-testid="assistant.details.context.item"]`)
        .filter({ hasText: 'Rich Burdon' })
        .waitFor({ state: 'detached', timeout: 2_000 });
      await demo.sleep({ ms: 1_500 });
    },
  },
  {
    name: 'Send the message',
    run: async ({ demo, page }) => {
      await caption(demo, 'Sending adds what the message mentions to the context');
      await demo.press({ key: 'Enter' });
      await trayHas(page, 'Rich Burdon');
      await trayHas(page, 'Q4 roadmap');
      await trayHas(page, 'Prompt redesign spec');
      await demo.speed({ factor: 4 });
      // Done when the status pill reports the finished turn.
      await page
        .locator('[data-testid="assistant.chat-status"]')
        .getByText(/\d+s/)
        .first()
        .waitFor({ state: 'visible', timeout: 90_000 });
      await page.waitForTimeout(3_000);
      await demo.speed({ factor: 1 });
      await demo.sleep({ ms: 3_000 });
    },
  },
  {
    name: 'Switch the thread view',
    run: async ({ demo, page }) => {
      await caption(demo, 'The thread view is in the toolbar, and in /view');
      // The menu's button is named for the current view (`applyActive`), so it is found by its icon.
      await demo.click({ selector: VIEW_MENU, label: 'View' });
      await demo.click({ selector: '[role^="menuitem"]:has-text("Summary")', label: 'Summary' });
      await demo.sleep({ ms: 2_500 });
      await demo.type({ selector: PROMPT, value: '/view normal', delay: 80 });
      await page
        .locator(COMPLETION)
        .waitFor({ state: 'hidden', timeout: 5_000 })
        .catch(() => {});
      await demo.press({ key: 'Enter' });
      await demo.sleep({ ms: 2_000 });
    },
  },
  {
    name: 'Remove an object from context',
    narration:
      'Context is plain ECHO objects in the space, so the agent and the people in the chat see the same things.',
    run: async ({ demo, page }) => {
      await caption(demo, 'x takes an object out of context; the message stays as written');
      const row = page
        .locator(`${TRAY} [data-testid="assistant.details.context.item"]`)
        .filter({ hasText: 'Rich Burdon' });
      await demo.click({
        selector: `${TRAY} [data-testid="assistant.details.context.item"]:has-text("Rich Burdon") button`,
        label: 'Remove',
      });
      await row.waitFor({ state: 'detached', timeout: 10_000 });
      await demo.sleep({ ms: 8_000 });
    },
  },
];
