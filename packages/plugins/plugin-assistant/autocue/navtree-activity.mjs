//
// Copyright 2026 DXOS.org
//

/**
 * A working agent marks its chat's navtree row, and a companion chat marks its subject's row, with the attention
 * agent star in place of presence; both stay while you look elsewhere and clear when the turn ends.
 *
 * @mdl packages/plugins/plugin-assistant/PLUGIN.mdl test QA-5
 * @app composer-app via `DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 4173`
 * @driver `--width 1280 --height 800`
 */

const SUBTITLE = 'plugin-assistant/PLUGIN.mdl · QA-5';
const CHAT = 'Trip ideas';
const DOCUMENT = 'Launch plan';
const PROMPT = '[data-testid="assistant.prompt"] .cm-content';
const COMPANION_PROMPT = `[data-testid="deck.companion"] ${PROMPT}`;
const TURN_TIMEOUT = 180_000;

const row = (label) =>
  `[data-testid="deck.sidebar"] [role="treeitem"]:not([aria-expanded]):has([data-testid="treeItem.heading"]:text-is("${label}"))`;
const heading = (label) => `${row(label)} [data-testid="treeItem.heading"]`;
const glyph = (label) => `${row(label)} .dx-attention-glyph`;
const working = (label) => `${glyph(label)}[data-mark="star"]:not([data-mark-hue])`;

const caption = async (demo, value, position) => {
  await demo.caption({ value, subtitle: SUBTITLE, position });
  await demo.sleep({ ms: 1_800 });
};

const send = async (demo, page, selector, value) => {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 15_000 });
  await demo.type({ selector: `${selector} >> nth=0`, value, delay: 35 });
  await demo.press({ key: 'Enter' });
};

/** Expands a navtree branch if it is closed; the space lists documents under Collections and chats under Sessions. */
const expand = async (page, label) => {
  const branch = page
    .locator(`[data-testid="deck.sidebar"] [role="treeitem"]:has(> [data-part="branch-control"] :text-is("${label}"))`)
    .first();
  await branch.waitFor({ state: 'attached', timeout: 15_000 });
  for (let attempt = 0; attempt < 3 && (await branch.getAttribute('aria-expanded')) !== 'true'; attempt++) {
    await branch.locator('[data-part="branch-indicator"]').first().click();
    await page.waitForTimeout(1_000);
  }
};

/** Waits out the rest of the agent's turn at speed, until the row's star clears. */
const awaitIdle = async (demo, page, label) => {
  await demo.speed({ factor: 8 });
  await page.locator(working(label)).waitFor({ state: 'detached', timeout: TURN_TIMEOUT });
  await demo.speed({ factor: 1 });
};

export const steps = [
  {
    name: 'Open a chat beside a document',
    setup: true,
    done: ({ page }) =>
      page
        .locator(row(CHAT))
        .count()
        .then((count) => count > 0 && page.url().includes('assistant.chat')),
    run: async ({ page }) => {
      const url = await page.evaluate(
        async ({ chatName, documentName }) => {
          const client = globalThis.__DXOS__.client;
          const space = client.spaces.default ?? client.spaces.get()[0];
          const options = { spaceId: space.id };
          const invoke = (key, input) => globalThis.composer.invoke(key, input, options);
          await invoke('org.dxos.operation.markdown.create', {
            name: documentName,
            content: [
              `# ${documentName}`,
              '',
              'Ship the new prompt to every Composer user on 1 December.',
              '',
              '- Week 1: private beta with ten teams.',
              '- Week 2: fix what the beta finds; write the announcement.',
              '- Week 3: open to everyone; post the announcement and a demo video.',
            ].join('\n'),
          });
          const { object: chat } = await invoke('org.dxos.operation.assistant.createChat', { name: chatName });
          await invoke('org.dxos.operation.space.addObject', { object: chat });
          await space.db.flush();
          return `${location.origin}/w/${space.id}/db/org.dxos.type.assistant.chat+${chat.id}`;
        },
        { chatName: CHAT, documentName: DOCUMENT },
      );
      await page.goto(url);
      await page.locator(PROMPT).first().waitFor({ state: 'visible', timeout: 30_000 });
      for (const selector of [
        'li[role="status"]:has-text("Privacy Notice") button:has-text("Close")',
        'button[aria-label="Close companion"]',
      ]) {
        const control = page.locator(selector);
        if (await control.count()) {
          await control.first().click();
        }
      }
      await expand(page, 'Collections');
      await expand(page, 'Sessions');
      await page.locator(row(DOCUMENT)).first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.locator(row(CHAT)).first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(2_000);
    },
  },
  {
    name: "The chat's row shows the agent star",
    run: async ({ demo, page }) => {
      await page.mouse.move(700, 400);
      await demo.cut();
      await demo.title({ value: 'Agent activity in the navtree', subtitle: 'Chats and companion chats', hold: 3_600 });
      await caption(demo, 'Ask the assistant something that takes a while');
      await send(
        demo,
        page,
        PROMPT,
        'Write a three-day Lisbon itinerary, about 400 words, with one place to eat each day.',
      );
      await page.locator(working(CHAT)).waitFor({ timeout: 30_000 });
      await caption(demo, "While the agent works, the chat's glyph shows the agent star");
      await demo.hover({ selector: glyph(CHAT), label: CHAT });
      await demo.sleep({ ms: 2_500 });
    },
  },
  {
    name: 'The star stays while you look elsewhere',
    run: async ({ demo, page }) => {
      await demo.click({ selector: heading(DOCUMENT), label: DOCUMENT });
      await page.locator('[data-testid="deck.plank"]').first().waitFor({ state: 'visible', timeout: 15_000 });
      await caption(demo, 'Open something else: the chat keeps working, and its row says so');
      await page.locator(working(CHAT)).waitFor({ timeout: 5_000 });
      await demo.hover({ selector: glyph(CHAT), label: CHAT });
      await page.getByText('Assistant is working', { exact: true }).first().waitFor({ timeout: 5_000 });
      await demo.sleep({ ms: 3_000 });
      await caption(demo, 'The star clears when the reply is done');
      await awaitIdle(demo, page, CHAT);
      await demo.sleep({ ms: 2_000 });
    },
  },
  {
    name: "The companion's subject shows the agent star",
    run: async ({ demo, page }) => {
      await page.mouse.move(700, 400);
      await caption(demo, "A companion chat works on its document, so the document's row shows it", 'top');
      if (
        !(await page
          .locator('[data-testid="deck.companion"]')
          .first()
          .isVisible()
          .catch(() => false))
      ) {
        await demo.click({
          selector: '[data-testid="deck.plank"] [data-testid="plankHeading.companion"] >> nth=0',
          label: 'Companion',
        });
      }
      const tab = '[data-testid="deck.companion"] >> role=tab[name="Assistant"]';
      await page.locator(tab).first().waitFor({ state: 'visible', timeout: 15_000 });
      await demo.click({ selector: tab, label: 'Assistant' });
      await send(demo, page, COMPANION_PROMPT, 'Read this plan and list three risks, each with a mitigation.');
      await page.locator(working(DOCUMENT)).waitFor({ timeout: 30_000 });
      await demo.hover({ selector: glyph(DOCUMENT), label: DOCUMENT });
      await demo.sleep({ ms: 2_500 });
    },
  },
  {
    name: 'The subject keeps the star while you look elsewhere',
    run: async ({ demo, page }) => {
      await demo.click({ selector: heading(CHAT), label: CHAT });
      await page.locator(PROMPT).first().waitFor({ state: 'visible', timeout: 15_000 });
      await caption(demo, 'Back in the chat, the document still shows its companion at work');
      await page.locator(working(DOCUMENT)).waitFor({ timeout: 5_000 });
      await demo.hover({ selector: glyph(DOCUMENT), label: DOCUMENT });
      await page.getByText('Assistant is working on this', { exact: true }).first().waitFor({ timeout: 5_000 });
      await demo.sleep({ ms: 3_000 });
      await awaitIdle(demo, page, DOCUMENT);
    },
  },
  {
    name: 'Both rows are idle again',
    narration:
      'Busy state comes from the agent processes themselves, so the navtree shows work in progress wherever you are in the space.',
    run: async ({ demo, page }) => {
      await page.mouse.move(700, 400);
      await caption(demo, 'Both turns are done, and both rows are quiet');
      await demo.sleep({ ms: 8_000 });
    },
  },
];
