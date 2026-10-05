//
// Copyright 2026 DXOS.org
//

/**
 * The input paths of the native desktop app: a plugin toggle, a menu opened and dismissed by a click outside
 * it, and text typed into CodeMirror. Each one fails if the driver's gestures reach the page as bare mouse
 * events, so this is the check to run after touching `.agents/skills/autocue/scripts/tauri/input.mjs`.
 *
 * @app composer-app desktop test build, driven by `driver.mjs --target tauri`
 *
 *   DX_TAURI=true DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:tauri-build-test
 *   node .agents/skills/autocue/scripts/driver.mjs --target tauri --out /tmp/demo
 *
 * Leaves the profile as it found it: the plugin is switched back off and the prompt is cleared.
 */

/** A beat for the viewer after a visible change. */
const BEAT = 800;

const PLUGIN = { id: 'org.dxos.plugin.chess', name: 'Chess' };
const FILTER = 'input[placeholder="Filter…"]';
const TOGGLE = `input[id="${PLUGIN.id}-input"]`;
const APP_MENU = '[data-testid="spacePlugin.addSpace"]';
const PROMPT = '[data-testid="assistant.prompt"] .cm-content';
const PROMPT_TEXT = 'Typed into CodeMirror by autocue';

const pluginEnabled = (page, enabled) =>
  page.waitForFunction(
    ({ id, enabled }) => composer.plugins().some((plugin) => plugin.id === id && plugin.enabled === enabled),
    { id: PLUGIN.id, enabled },
    { timeout: 30_000 },
  );

const openMenus = (page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll('[role="menu"]')].filter((menu) => menu.getBoundingClientRect().width > 0).length,
  );

export const steps = [
  {
    name: 'Open the plugin registry',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Plugins', subtitle: 'the registry, from the sidebar' });
      await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', label: 'Plugins' });
      await page.locator(FILTER).first().waitFor({ state: 'visible', timeout: 10_000 });
    },
  },
  {
    name: 'Toggle a plugin on and off',
    run: async ({ demo, page }) => {
      await demo.caption({ value: `Switch ${PLUGIN.name} on, then off again` });
      await demo.fill({ selector: FILTER, value: '', hud: false });
      await demo.type({ selector: FILTER, value: PLUGIN.name.toLowerCase(), label: 'Filter' });
      await page.locator(TOGGLE).waitFor({ state: 'visible', timeout: 10_000 });
      const before = await page.locator(TOGGLE).isChecked();
      await demo.click({ selector: TOGGLE, label: before ? `Disable ${PLUGIN.name}` : `Enable ${PLUGIN.name}` });
      await pluginEnabled(page, !before);
      await page.waitForTimeout(BEAT);
      await demo.click({ selector: TOGGLE, label: before ? `Enable ${PLUGIN.name}` : `Disable ${PLUGIN.name}` });
      await pluginEnabled(page, before);
      await demo.fill({ selector: FILTER, value: '', hud: false });
    },
  },
  {
    name: 'Open a menu and dismiss it with a click outside',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'A menu opens on press and closes on a press outside it' });
      await demo.click({ selector: APP_MENU, label: 'App menu' });
      await page.locator('[role="menu"]').first().waitFor({ state: 'visible', timeout: 5_000 });
      await page.waitForTimeout(BEAT);
      const { width, height } = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
      await page.mouse.click(width * 0.6, height * 0.5);
      await page.waitForFunction(
        () => ![...document.querySelectorAll('[role="menu"]')].some((menu) => menu.getBoundingClientRect().width > 0),
        undefined,
        { timeout: 5_000 },
      );
      if ((await openMenus(page)) > 0) {
        throw new Error('the menu stayed open after a click outside it');
      }
    },
  },
  {
    name: 'Type into CodeMirror',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Typing into a CodeMirror editor' });
      // Back from the registry to the space, whose Home plank holds the assistant's prompt editor.
      await demo.click({ selector: '[data-testid="spacePlugin.space"] >> nth=0', label: 'My Space' });
      await page.locator(PROMPT).first().waitFor({ state: 'visible', timeout: 10_000 });
      await demo.click({ selector: PROMPT, label: 'Prompt' });
      await demo.type({ selector: PROMPT, value: PROMPT_TEXT, label: 'Type' });
      const typed = await page.locator(PROMPT).innerText();
      if (!typed.includes(PROMPT_TEXT)) {
        throw new Error(`the prompt reads ${JSON.stringify(typed)}`);
      }
      await page.waitForTimeout(BEAT);
      await demo.screenshot({ name: 'desktop-input.png' });
      await demo.press({ key: 'ControlOrMeta+a', hud: false });
      await demo.press({ key: 'Backspace', hud: false });
    },
  },
];
