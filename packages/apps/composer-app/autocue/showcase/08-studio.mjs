//
// Copyright 2026 DXOS.org
//

/**
 * Showcase scene 8: how this film was made. A Studio storyboard holds one frame per scene, each carrying its
 * narration as notes; open it, step through the frames, and play it.
 *
 * @mdl packages/apps/composer-app/spec/APP.mdl test QA-13
 * @app composer-app bundled dev build against EDGE preview (launch config `composer-showcase`, :4183)
 *
 * Setup creates the storyboard through `org.dxos.operation.studio.createStoryboard` without generating media, so
 * no provider credential is needed; the frames show placeholders until each scene's clip is attached (see the
 * spec's task list).
 */

const { prep } = await import(`./01-home.mjs${new URL(import.meta.url).search}`);

/** A beat for the viewer after a visible change. */
const BEAT = 1_200;

const STORYBOARD = 'Composer showcase';

/** One frame per scene: its title, a prompt describing the shot, and the narration it carries. */
const FRAMES = [
  [
    'What Composer is',
    'The Composer Home page of a populated space',
    'Composer is an open-source super-app framework.',
  ],
  ['Collaboration', 'Two people editing one document side by side', 'Invite someone, and you’re editing together.'],
  ['Plugins', 'The Composer plugin gallery', 'Everything you see is a plugin.'],
  ['One graph', 'A table and a kanban board over the same records', 'Both are views over one graph.'],
  ['Agents', 'An agent editing a document from a comment', 'Agents work in your documents the way colleagues do.'],
  ['Projects', 'An agent building a world clock plugin', 'Projects go further.'],
  ['Inbox', 'A synced mailbox with an AI-drafted reply', 'Your inbox lives here too.'],
  ['Studio', 'This storyboard', 'And this film? It was made in Composer.'],
].map(([name, prompt, notes]) => ({ name, kind: 'image', prompt, notes }));

/** The navtree row of the object named exactly `name`. */
const treeObject = async (page, name) => {
  const index = await page
    .locator('[data-testid="spacePlugin.object"]')
    .evaluateAll((rows, name) => rows.findIndex((row) => row.innerText.trim().split('\n')[0] === name), name);
  return index < 0 ? undefined : `[data-testid="spacePlugin.object"] >> nth=${index}`;
};

export const steps = [
  prep,
  {
    name: 'Setup (off camera): the showcase storyboard',
    setup: true,
    done: async ({ page }) => (await treeObject(page, STORYBOARD)) !== undefined,
    run: async ({ page }) => {
      await page.evaluate(
        ({ name, frames }) => composer.invoke('org.dxos.operation.studio.createStoryboard', { name, frames }),
        { name: STORYBOARD, frames: FRAMES },
      );
      await page.waitForFunction(
        (name) =>
          [...document.querySelectorAll('[data-testid="spacePlugin.object"]')].some(
            (row) => row.innerText.trim().split('\n')[0] === name,
          ),
        STORYBOARD,
        { timeout: 15_000 },
      );
    },
  },
  {
    name: 'Open the storyboard',
    narration: 'And this film? It was made in Composer.',
    run: async ({ demo, page }) => {
      await demo.click({ selector: await treeObject(page, STORYBOARD), label: STORYBOARD });
      await page.locator('[data-testid="studioPlugin.play"]').first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Play it',
    narration:
      'The script, the storyboard and the voice-over are objects in a Studio space, and the screen recordings were ' +
      'driven by an agent, step by step.',
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="studioPlugin.play"] >> nth=0', label: 'Play' });
      await page.waitForTimeout(BEAT * 6);
    },
  },
];
