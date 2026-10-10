//
// Copyright 2026 DXOS.org
//

/**
 * Create a markdown document, write in it with live formatting, comment on a phrase, and link a new page
 * from it with `@`.
 *
 * @mdl packages/plugins/plugin-markdown/PLUGIN.mdl test QA-4
 * @app composer-app bundled dev build, served by `vite preview` on :4173
 *
 *   export DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   moon run composer-app:bundle
 *   pnpm exec vite preview --configLoader native --port 4173 --strictPort
 *
 * Record on a fresh profile; produce the 30s cut with the Composer intro and a narrated voice-over:
 *
 *   node .agents/skills/autocue/scripts/trim-static.mjs --in <out>/session.webm --out markdown.webm \
 *     --ident composer --voiceover steps --mp4
 */

/** A beat for the viewer after a visible change. */
const BEAT = 1_200;

const TITLE = 'Launch plan';
const LINKED = 'Release checklist';

/** The phrase the comment is anchored to, and what it says. */
const COMMENT_ANCHOR = 'Links between pages';
const COMMENT = 'Can we show backlinks too?';

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

/** The markdown editor of the plank on screen. */
const EDITOR = '[data-testid="composer.markdownRoot"] .cm-content';

/** Types as a person would, a character at a time. */
const typeSlowly = (page, text, delay = 60) => page.keyboard.type(text, { delay });

export const steps = [
  {
    name: 'Prep (off camera): dismiss notices and close the help panel',
    setup: true,
    run: async ({ demo, page }) => {
      const notice = page.locator(
        '[data-testid="org.dxos.plugin.observability.notice"] button:not(:has-text("Settings"))',
      );
      if (
        await notice
          .first()
          .waitFor({ state: 'visible', timeout: 8_000 })
          .then(
            () => true,
            () => false,
          )
      ) {
        await notice.first().click();
      }
      // A fresh profile opens on the space's Home; clicking the space row would collapse its tree.
      await page.locator('[data-testid="deck.plank"][data-attendable-id$="/home"]').first().waitFor();
      const close = page.locator('role=button[name="Close companion"]').first();
      if (await close.isVisible().catch(() => false)) {
        await close.click();
      }
    },
  },
  {
    name: 'Create a markdown document',
    narration: 'Create a markdown document in your space.',
    done: async ({ page }) => (await page.locator('[data-testid="deck.plank"]', { hasText: TITLE }).count()) > 0,
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({
        selector: '[data-testid="create-object-form.type.org.dxos.type.document"]',
        label: 'Document',
      });
      // A form appears only when the type asks for fields; a document may be created straight away.
      const form = page.getByTestId('create-object-form');
      if (await form.isVisible().catch(() => false)) {
        const name = form.getByTestId('name');
        if (await name.isVisible().catch(() => false)) {
          await demo.click({ selector: '[data-testid="create-object-form"] [data-testid="name"]', label: 'Name' });
          await typeSlowly(page, TITLE);
        }
        await demo.click({ selector: '[role="dialog"] [data-testid="save-button"]', label: 'Create' });
      }
      await page.locator(EDITOR).last().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Write in markdown',
    narration: 'Write in plain markdown. It formats as you type.',
    run: async ({ demo, page }) => {
      await demo.click({ selector: `${EDITOR} >> nth=-1`, label: 'Editor' });
      // The editor continues a list on Enter and leaves it on an empty item, so only the first item is marked.
      await typeSlowly(
        page,
        `# ${TITLE}\n\nShip the **markdown** editor with:\n\n- Live formatting\nSlash commands\nLinks between pages\n\n`,
      );
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Comment on a phrase',
    narration: 'Select any text to start a comment thread.',
    run: async ({ demo, page }) => {
      await selectText(page, COMMENT_ANCHOR);
      const add = page.locator('[data-testid="deck.plank"] [data-testid="comments.comment.add"]').first();
      await add.waitFor({ state: 'visible' });
      await page.waitForFunction((element) => !element.disabled, await add.elementHandle(), { timeout: 10_000 });
      await demo.click({
        selector: '[data-testid="deck.plank"] [data-testid="comments.comment.add"] >> nth=0',
        label: 'Comment',
      });
      const reply = '[data-testid=thread][aria-current="location"] [data-testid="thread.reply"] [role="textbox"]';
      await page.locator(reply).first().waitFor({ state: 'visible', timeout: 10_000 });
      await demo.type({ selector: `${reply} >> nth=0`, value: COMMENT, label: 'Comment' });
      await demo.press({ key: 'Enter' });
      await page.getByTestId('cm-comment').first().waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(BEAT * 2);
      // Back to the end of the document, where the next step types.
      await page.evaluate(() => {
        const view = globalThis.composer?.editorView;
        view?.dispatch({ selection: { anchor: view.state.doc.length } });
        view?.focus();
      });
    },
  },
  {
    name: 'Link a new page with @',
    narration: 'Type @ to link another page, or create a new one on the spot.',
    run: async ({ demo, page }) => {
      await typeSlowly(page, 'Next: ');
      await page.keyboard.type('@');
      await page.getByPlaceholder('Search or create…').waitFor({ state: 'visible', timeout: 10_000 });
      await typeSlowly(page, LINKED);
      await page.waitForTimeout(BEAT / 2);
      await demo.click({ selector: 'li:has-text("Add object") >> nth=0', label: 'Add object' });
      await demo.click({
        selector: '[data-testid="create-object-form.type.org.dxos.type.document"]',
        label: 'Document',
      });
      await page.locator(`${EDITOR} :text("${LINKED}")`).first().waitFor({ state: 'visible', timeout: 10_000 });
      // Every typing step ends on a new line, so the document never stops mid-line on camera.
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Open the linked page and add a checklist',
    narration: 'Open the new page and add a checklist. Tick items off as you go.',
    run: async ({ demo, page }) => {
      await demo.click({ selector: `[role="treeitem"]:has-text("${LINKED}") >> nth=0`, label: LINKED });
      const editor = page.locator('[data-testid="deck.plank"]', { hasText: LINKED }).locator(EDITOR).first();
      await editor.waitFor({ state: 'visible', timeout: 15_000 });
      await editor.click();
      // A task list continues as tasks, so only the first item carries its marker.
      await typeSlowly(page, '- [ ] Write the docs\nRecord the demo\nShip it\n\n');
      const box = '[data-testid="deck.plank"] input[type="checkbox"]';
      await page.locator(box).first().waitFor({ state: 'visible', timeout: 10_000 });
      await demo.click({ selector: `${box} >> nth=0`, label: 'Done' });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Close on the finished pages',
    narration:
      'Everything you write lives on your device and syncs peer to peer, so teammates and AI agents can edit ' +
      'the same page at once, with no server in the middle.',
    run: async ({ page }) => {
      await page.waitForTimeout(BEAT * 9);
    },
  },
];
