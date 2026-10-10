//
// Copyright 2026 DXOS.org
//

/**
 * Create a markdown document, write in it with live formatting, and link a new page from it with `@`.
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
const BEAT = 800;

const TITLE = 'Launch plan';
const LINKED = 'Release checklist';

/** The markdown editor of the plank on screen. */
const EDITOR = '[data-testid="composer.markdownRoot"] .cm-content';

/** Types as a person would, a character at a time. */
const typeSlowly = (page, text, delay = 35) => page.keyboard.type(text, { delay });

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
    name: 'Add a checklist and tick an item',
    narration: 'Add a checklist, and tick items off as you go.',
    run: async ({ demo, page }) => {
      await typeSlowly(page, '## Tasks\n\n- [ ] Write the docs\n[ ] Record the demo\n\n');
      const box = `${EDITOR} input[type="checkbox"]`;
      await page.locator(box).first().waitFor({ state: 'visible', timeout: 10_000 });
      await demo.click({ selector: `${box} >> nth=0`, label: 'Done' });
      await page.waitForTimeout(BEAT);
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
      await page.waitForTimeout(BEAT * 4);
    },
  },
];
