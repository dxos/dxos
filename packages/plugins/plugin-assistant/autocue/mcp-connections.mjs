//
// Copyright 2026 DXOS.org
//

/**
 * A chat's MCP servers: a built-in server the agent turns on itself, the Connectors submenu, Manage connections,
 * and a Custom MCP Server added with no credential.
 *
 * @mdl packages/plugins/plugin-assistant/PLUGIN.mdl test QA-4
 * @app composer-app via `DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 5180`, plus
 *   the `@dxos/mcp-client` test server on :8931 (`startTestServer({ port: 8931 })` run with `tsx`)
 * @driver `--caption-position top --caption-background 0.45`
 */

const SUBTITLE = 'plugin-assistant/PLUGIN.mdl · QA-4';
const PROMPT = '[data-testid="assistant.prompt"] .cm-content';
const ADD_MENU = '[data-testid="assistant.add-menu"]';
const CONNECTORS = '[data-testid="assistant.add-menu.connectors"]';
const CONNECTION = '[data-testid="assistant.add-menu.connection"]';
const MANAGE = '[data-testid="assistant.add-menu.manage-connections"]';
const OPEN_SERVER = 'http://localhost:8931/open/mcp';
const THREAD_TIMEOUT = 120_000;

const caption = async (demo, value, position) => {
  await demo.caption({ value, subtitle: SUBTITLE, position });
  await demo.sleep({ ms: 1_800 });
};

const openConnectors = async (demo) => {
  await demo.click({ selector: ADD_MENU, label: 'Add' });
  await demo.hover({ selector: CONNECTORS, label: 'Connectors' });
};

const closeMenu = async (demo) => {
  await demo.press({ key: 'Escape', hud: false });
  await demo.press({ key: 'Escape', hud: false });
};

const send = async (demo, page, value) => {
  await demo.type({ selector: PROMPT, value, delay: 45 });
  await demo.press({ key: 'Enter' });
};

/** Waits out the agent's turn at speed, so its tool calls play but the wait does not. */
const awaitReply = async (demo, page, text) => {
  await demo.speed({ factor: 6 });
  await page.getByText(text).last().waitFor({ state: 'visible', timeout: THREAD_TIMEOUT });
  await page.waitForTimeout(1_500);
  await demo.speed({ factor: 1 });
};

/** Opens every collapsed tool-call group in the thread, so the calls themselves are on screen. */
const expandToolCalls = (page) =>
  page.evaluate(() => {
    for (const element of document.querySelectorAll('*')) {
      if (/^Ran \d+ commands?$/.test(element.textContent?.trim() ?? '') && element.children.length < 3) {
        element.click();
      }
    }
  });

export const steps = [
  {
    name: 'Open a new chat',
    setup: true,
    done: ({ page }) =>
      page
        .locator(PROMPT)
        .count()
        .then((count) => count > 0 && page.url().includes('assistant.chat')),
    run: async ({ page }) => {
      const url = await page.evaluate(async () => {
        const client = globalThis.__DXOS__.client;
        const space = client.spaces.default ?? client.spaces.get()[0];
        const options = { spaceId: space.id };
        const invoke = (key, input) => globalThis.composer.invoke(key, input, options);
        const { object: chat } = await invoke('org.dxos.operation.assistant.createChat', { name: 'MCP servers' });
        await invoke('org.dxos.operation.space.addObject', { object: chat });
        await space.db.flush();
        return `${location.origin}/w/${space.id}/db/org.dxos.type.assistant.chat+${chat.id}`;
      });
      await page.goto(url);
      await page.locator(PROMPT).waitFor({ state: 'visible', timeout: 30_000 });
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
    name: 'The built-in servers start off',
    run: async ({ demo, page }) => {
      await page.mouse.move(900, 500);
      await demo.cut();
      await demo.title({
        value: 'MCP servers from connections',
        subtitle: 'Built-in servers and connections',
        hold: 3_600,
      });
      await caption(demo, 'Built-in MCP servers start off in every chat', 'top');
      await openConnectors(demo);
      await page.locator(`${CONNECTION}:has-text("Browser")[data-state="unchecked"]`).waitFor({ timeout: 5_000 });
      await demo.sleep({ ms: 2_500 });
      await closeMenu(demo);
    },
  },
  {
    name: 'The agent turns a built-in on when its skill needs it',
    run: async ({ demo, page }) => {
      await caption(demo, 'Asked to use the browser, the agent turns Browser on itself', 'top');
      await send(
        demo,
        page,
        'Open https://www.iana.org/help/example-domains in the browser and tell me the page heading.',
      );
      // The thread fills from the top while the agent works, and the prompt is idle.
      await caption(demo, 'It switches the server on and calls its tool in one response', 'bottom');
      await awaitReply(demo, page, 'Example Domains');
      await expandToolCalls(page);
      await demo.sleep({ ms: 3_000 });
      await caption(demo, 'Browser is now on for this chat', 'top');
      await openConnectors(demo);
      await page.locator(`${CONNECTION}:has-text("Browser")[data-state="checked"]`).waitFor({ timeout: 5_000 });
      await demo.sleep({ ms: 2_500 });
    },
  },
  {
    name: 'Manage connections opens beside the chat',
    run: async ({ demo, page }) => {
      await caption(demo, "Manage connections opens the space's Connections", 'middle');
      await demo.click({ selector: MANAGE, label: 'Manage connections...' });
      await page.getByText('Link an external service to this space.').waitFor({ timeout: 10_000 });
      await demo.sleep({ ms: 2_500 });
    },
  },
  {
    name: 'Add a Custom MCP Server with no credential',
    run: async ({ demo, page }) => {
      await caption(demo, 'A server that takes no key connects at once', 'bottom');
      await demo.click({ selector: 'button:text-is("Connect")', label: 'Connect' });
      await demo.click({ selector: '[role="option"]:has-text("Custom MCP Server")', label: 'Custom MCP Server' });
      await demo.click({ selector: 'button:has-text("Continue")', label: 'Continue' });
      await demo.type({ selector: 'input[placeholder="https://mcp.example.com/mcp"]', value: OPEN_SERVER, delay: 40 });
      await demo.click({ selector: 'button:has-text("Save")', label: 'Save' });
      await page.getByText('Custom MCP Server').first().waitFor({ timeout: 15_000 });
      await demo.sleep({ ms: 2_500 });
    },
  },
  {
    name: "The chat uses the connection's tools",
    run: async ({ demo, page }) => {
      await demo.click({ selector: 'text="MCP servers" >> nth=0', label: 'MCP servers' });
      await page.locator(PROMPT).waitFor({ state: 'visible', timeout: 10_000 });
      await caption(demo, "The chat now has the new server's tools", 'top');
      await send(demo, page, 'What is the weather in Paris? Use the get_weather tool.');
      await caption(demo, 'get_weather comes from the Custom MCP Server', 'bottom');
      await awaitReply(demo, page, /°C/);
      await expandToolCalls(page);
      await demo.sleep({ ms: 3_000 });
    },
  },
  {
    name: 'Turn the connection off for this chat',
    narration:
      'Connections live in the space and sync between its members, while each chat decides which MCP servers its agent can use.',
    run: async ({ demo, page }) => {
      await caption(demo, 'Each chat switches its own servers', 'top');
      await openConnectors(demo);
      const connection = `${CONNECTION}:has-text("localhost:8931")`;
      await demo.click({ selector: connection, label: 'localhost:8931' });
      await page.locator(`${connection}[data-state="unchecked"]`).waitFor({ timeout: 5_000 });
      await demo.sleep({ ms: 8_000 });
    },
  },
];
