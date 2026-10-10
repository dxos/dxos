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

/**
 * The storyboard's card under Home → Recent. The operation files it under Database → Storyboards, which lists the
 * type rather than its objects, so Recent is the direct path to it.
 */
const RECENT = `[data-testid="deck.plank"][data-attendable-id$="/home"] >> text="${STORYBOARD}"`;

export const steps = [
  prep,
  {
    name: 'Setup (off camera): the showcase storyboard',
    setup: true,
    done: async ({ page }) => (await page.locator(RECENT).count()) > 0,
    run: async ({ page }) => {
      // The space on screen, read off the Home plank's id (`root/<spaceId>/home`); the operation needs one.
      const spaceId = await page
        .locator('[data-testid="deck.plank"][data-attendable-id$="/home"]')
        .first()
        .getAttribute('data-attendable-id')
        .then((id) => id?.split('/')[1]);
      await page.evaluate(
        ({ name, frames, spaceId }) =>
          composer.invoke('org.dxos.operation.studio.createStoryboard', { name, frames }, { spaceId }),
        { name: STORYBOARD, frames: FRAMES, spaceId },
      );
      await page.locator(RECENT).first().waitFor({ state: 'visible', timeout: 15_000 });
    },
  },
  {
    name: 'Open the storyboard',
    narration: 'And this film? It was made in Composer.',
    run: async ({ demo, page }) => {
      await prep.run({ page });
      await demo.click({ selector: `${RECENT} >> nth=0`, label: STORYBOARD });
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
      // Play needs media; until each frame carries its scene's clip, step through the frames instead.
      if (await page.locator('[data-testid="studioPlugin.play"]').first().isEnabled()) {
        await demo.click({ selector: '[data-testid="studioPlugin.play"] >> nth=0', label: 'Play' });
        await page.waitForTimeout(BEAT * 6);
        return;
      }
      for (const [index, { name }] of FRAMES.entries()) {
        const frame = page.locator(`[data-testid="deck.plank"] >> text=/^(${name}|Frame ${index + 1})$/`).first();
        if (await frame.isVisible().catch(() => false)) {
          await frame.click();
          await page.waitForTimeout(BEAT / 2);
        }
      }
      await page.waitForTimeout(BEAT * 2);
    },
  },
];
