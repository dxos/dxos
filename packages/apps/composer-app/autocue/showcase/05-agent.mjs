//
// Copyright 2026 DXOS.org
//

/**
 * Showcase scene 5: agents in the document. Mention Kai in a comment and it rewrites the paragraph, then ask the
 * companion assistant to research a topic and add a section with sources.
 *
 * @mdl packages/apps/composer-app/spec/APP.mdl test QA-13
 * @app composer-app bundled dev build against EDGE preview (launch config `composer-showcase`, :4183)
 *
 * Kai (plugin-review) answers only on threads created while Markdown's "Comment agent mode" is on, so setup sets it
 * to `mention` before any comment exists. Research uses the WebSearch skill, which is Anthropic-only, so setup pins
 * a Claude model for the chat.
 */

const { prep } = await import(`./01-home.mjs${new URL(import.meta.url).search}`);

/** A beat for the viewer after a visible change. */
const BEAT = 1_200;

/** The chat's model; WebSearch is an Anthropic provider tool. */
const MODEL = 'Claude Sonnet 5';

const DOCUMENT = 'Why local first';
const PARAGRAPH =
  'Local-first software is a kind of software where the data that you work on is kept on your own device first ' +
  'and foremost, and it is then synchronized with other devices and other people when a network connection ' +
  'happens to be available, which means that you can keep on working even when you are offline.';
const COMMENT = '@kai tighten this paragraph';
const RESEARCH =
  'Research the history of local-first software and add a short "Further reading" section to this document ' +
  'with three sources, each with a one-line summary.';

const PLANK = '[data-testid="deck.plank"]';
const EDITOR = '[data-testid="composer.markdownRoot"] .cm-content';
const PROMPT = '[data-testid="assistant.prompt"] .cm-content';
const THREAD = '[data-testid=thread][aria-current="location"]';

/** Selects `text` in the most recently mounted editor, in one evaluate so the offset cannot go stale. */
const selectText = (page, text) =>
  page.evaluate(async (text) => {
    const deadline = performance.now() + 15_000;
    for (;;) {
      const view = globalThis.composer?.editorView;
      const pos = view?.state.doc.toString().indexOf(text) ?? -1;
      if (view && pos >= 0) {
        view.dispatch({ selection: { anchor: pos, head: pos + text.length }, scrollIntoView: true });
        view.focus();
        return;
      }
      if (performance.now() > deadline) {
        throw new Error(`text not found in the editor: ${text}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }, text);

const documentText = (page) => page.evaluate(() => globalThis.composer?.editorView?.state.doc.toString() ?? '');

/** The navtree row of the object named exactly `name`. */
const treeObject = async (page, name) => {
  const index = await page
    .locator('[data-testid="spacePlugin.object"]')
    .evaluateAll((rows, name) => rows.findIndex((row) => row.innerText.trim().split('\n')[0] === name), name);
  return index < 0 ? undefined : `[data-testid="spacePlugin.object"] >> nth=${index}`;
};

/** Opens a plugin's settings page by URL: the settings button toggles the sidebar, so clicking it is stateful. */
const openSettings = async (page, plugin) => {
  const url = new URL(`/w/dxos:settings/plugin/settings:${plugin}`, page.url());
  if (page.url().split('?')[0] !== url.href) {
    await page.goto(url.href);
  }
  await page.locator('[data-testid="deck.plank"] >> role=combobox').first().waitFor({ timeout: 60_000 });
};

/** Picks `option` in the settings select labelled `title`. */
const setSetting = async (page, title, option) => {
  await page.locator(`role=combobox[name="${title}"]`).first().click();
  await page.locator(`role=option[name="${option}"]`).first().click();
};

export const steps = [
  prep,
  {
    name: 'Setup (off camera): Kai answers @mentions in comments',
    setup: true,
    run: async ({ page }) => {
      await openSettings(page, 'org.dxos.plugin.markdown');
      await page.locator(PLANK, { hasText: 'Comment agent mode' }).first().waitFor({ timeout: 10_000 });
      await setSetting(page, 'Comment agent mode', 'mention');
    },
  },
  {
    name: `Setup (off camera): chat with ${MODEL}`,
    setup: true,
    run: async ({ page }) => {
      await openSettings(page, 'org.dxos.plugin.assistant');
      await page.locator('role=combobox[name="Remote language model"]').first().click();
      await page.locator(`role=option[name="${MODEL}"]`).first().click();
    },
  },
  {
    name: 'Setup (off camera): a document with a wordy paragraph',
    setup: true,
    done: async ({ page }) => (await treeObject(page, DOCUMENT)) !== undefined,
    run: async ({ page }) => {
      await prep.run({ page });
      await page.locator('[data-testid="spacePlugin.createObject"]').first().click();
      await page.locator('[data-testid="create-object-form.type.org.dxos.type.document"]').first().click();
      const name = page.locator('[data-testid="create-object-form"] [data-testid="name"]');
      if (await name.isVisible().catch(() => false)) {
        await name.fill(DOCUMENT);
        await page.locator('[role="dialog"] [data-testid="save-button"]').click();
      }
      const editor = page.locator(EDITOR).last();
      await editor.waitFor({ state: 'visible', timeout: 15_000 });
      await editor.click();
      await page.keyboard.insertText(`# ${DOCUMENT}\n\n${PARAGRAPH}\n\n`);
    },
  },
  {
    name: 'Open the document',
    narration: 'Agents work in your documents the way your colleagues do.',
    run: async ({ demo, page }) => {
      await prep.run({ page });
      const row = await treeObject(page, DOCUMENT);
      if (!row) {
        throw new Error(`no document named ${DOCUMENT}`);
      }
      await demo.click({ selector: row, label: DOCUMENT });
      await page.locator(EDITOR).last().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Mention Kai in a comment',
    narration: 'Mention Kai in a comment, and it rewrites the passage in place.',
    run: async ({ demo, page }) => {
      // A retry starts from the wordy paragraph again; Kai rewrote it on the last attempt.
      await page.evaluate(
        ({ title, paragraph }) => {
          const view = globalThis.composer?.editorView;
          if (!view.state.doc.toString().includes(paragraph)) {
            view.dispatch({
              changes: { from: 0, to: view.state.doc.length, insert: `# ${title}\n\n${paragraph}\n\n` },
            });
          }
        },
        { title: DOCUMENT, paragraph: PARAGRAPH },
      );
      await selectText(page, PARAGRAPH);
      const add = page.locator(`${PLANK} [data-testid="comments.comment.add"]`).first();
      await add.waitFor({ state: 'visible' });
      await page.waitForFunction((element) => !element.disabled, await add.elementHandle(), { timeout: 10_000 });
      await demo.click({ selector: `${PLANK} [data-testid="comments.comment.add"] >> nth=0`, label: 'Comment' });
      const reply = `${THREAD} [data-testid="thread.reply"] [role="textbox"]`;
      await page.locator(reply).first().waitFor({ state: 'visible', timeout: 10_000 });
      await demo.type({ selector: `${reply} >> nth=0`, value: COMMENT, label: 'Comment' });
      await demo.press({ key: 'Enter' });
      // Kai edits the anchored range directly and says so in the thread.
      await page.waitForFunction(
        (paragraph) => !globalThis.composer?.editorView?.state.doc.toString().includes(paragraph),
        PARAGRAPH,
        { timeout: 120_000 },
      );
      await page.waitForTimeout(BEAT * 3);
    },
  },
  {
    name: 'Ask the assistant to research',
    narration: 'Ask the assistant to research a topic, and it writes the section, with its sources.',
    run: async ({ demo, page }) => {
      await demo.clearCaption();
      // The comment opened the companion already; open it only when it is closed.
      if (
        !(await page
          .locator('[data-testid="deck.companion"]')
          .first()
          .isVisible()
          .catch(() => false))
      ) {
        await demo.click({ selector: '[data-testid="plankHeading.companion"] >> nth=0', label: 'Companion' });
      }
      await demo.click({
        selector: '[data-testid="deck.companion"] >> role=tab[name="Assistant"]',
        label: 'Assistant',
      });
      await page.locator(PROMPT).first().waitFor({ state: 'visible', timeout: 15_000 });
      await demo.type({ selector: `${PROMPT} >> nth=0`, value: RESEARCH, label: 'Prompt', delay: 25 });
      await demo.press({ key: 'Enter' });
      await page.waitForFunction(
        () => globalThis.composer?.editorView?.state.doc.toString().includes('Further reading'),
        undefined,
        { timeout: 300_000 },
      );
      await page.waitForTimeout(BEAT * 3);
    },
  },
  {
    name: 'Close on the researched document',
    narration:
      'Model calls route through Cloudflare’s AI Gateway, to frontier models or to open models on Workers AI. You choose.',
    run: async ({ page }) => {
      const text = await documentText(page);
      if (!text.includes('Further reading')) {
        throw new Error('the research section is missing');
      }
      await page.evaluate(() => {
        const view = globalThis.composer?.editorView;
        const pos = view?.state.doc.toString().indexOf('Further reading') ?? -1;
        if (pos >= 0) {
          view.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
        }
      });
      await page.waitForTimeout(BEAT * 6);
    },
  },
];
