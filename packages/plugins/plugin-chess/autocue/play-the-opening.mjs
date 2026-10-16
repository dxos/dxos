//
// Copyright 2026 DXOS.org
//

/**
 * Start a chess game, play the opening by dragging pieces, and watch an illegal move be refused.
 *
 * @mdl packages/plugins/plugin-chess/PLUGIN.mdl test QA-1
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Record headless on the GPU, in light mode:
 *
 *   node .agents/skills/autocue/scripts/driver.mjs --url http://localhost:4173 --out /tmp/chess \
 *     --gpu on --theme light --fps 60 --width 1920 --height 1080 --scale 2
 */

/** A beat for the viewer after a visible change. */
const BEAT = 1_200;

const visible = (locator, timeout = 1_500) =>
  locator
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(
      () => true,
      () => false,
    );

/** A board square by its algebraic name; the board keys squares by `<rank - 1>-<file index>`. */
const square = (name) => `[data-location="${Number(name[1]) - 1}-${name.charCodeAt(0) - 'a'.charCodeAt(0)}"] >> nth=-1`;

/** Plays a move by dragging a piece; the drag is stepped because the drop targets arm on observed movement. */
const play = (demo, from, to, label) => demo.drag({ from: square(from), to: square(to), steps: 25, label });

/** The PGN of the open game, read from its move list. */
const movesShown = (page) => page.locator('[data-testid="deck.plank"]').last().innerText();

export const steps = [
  {
    name: 'Prep (off camera): dismiss notices, enable Chess, close the help panel',
    setup: true,
    done: ({ page }) =>
      page.evaluate(() => composer.plugins().some((plugin) => plugin.id === 'org.dxos.plugin.chess' && plugin.active)),
    run: async ({ page }) => {
      // A cold first load can outlast the driver's navigation; operations only resolve once the space has booted.
      await page
        .locator('[data-testid="spacePlugin.createObject"]')
        .first()
        .waitFor({ state: 'visible', timeout: 120_000 });
      const notice = page.locator('[data-testid="toast.close"]');
      if (await visible(notice, 8_000)) {
        await notice.first().click();
      }
      // Chess is off by default; enabling it also enables the Game plugin it depends on.
      await page.evaluate(() =>
        composer.invoke('org.dxos.operation.registry.enablePlugins', { ids: ['org.dxos.plugin.chess'] }),
      );
      await page.waitForFunction(
        () => composer.plugins().some((plugin) => plugin.id === 'org.dxos.plugin.chess' && plugin.active),
        undefined,
        { timeout: 20_000 },
      );
      const close = page.locator('role=button[name="Close companion"]');
      if (await visible(close, 1_000)) {
        await close.first().click();
      }
    },
  },
  {
    name: 'Create the game',
    narration: 'Start a game of chess in your space.',
    done: async ({ page }) => (await page.locator(square('e2')).count()) > 0,
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({ selector: '[data-testid="create-object-form.type.org.dxos.type.game"]', label: 'Game' });
      await demo.click({ selector: '[role="dialog"] [role="option"]:has-text("Chess") >> nth=0', label: 'Chess' });
      await demo.click({ selector: '[role="dialog"] button:has-text("Continue") >> nth=0', label: 'Continue' });
      await page.locator('[role="dialog"] input[data-testid="name"]').fill('QA Game');
      await demo.click({ selector: '[role="dialog"] [data-testid="save-button"]', label: 'Save' });
      await page.locator(square('e2')).first().waitFor({ state: 'visible', timeout: 20_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Play 1. e4',
    narration: 'Drag a piece to move it.',
    run: async ({ demo, page }) => {
      await play(demo, 'e2', 'e4', 'e4');
      // Judged by the move list, as QA-1's expect says; a drag that did nothing fails here.
      await page
        .locator('[data-testid="deck.plank"]')
        .last()
        .filter({ hasText: 'e4' })
        .waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Play 1... e5',
    narration: 'Black answers.',
    run: async ({ demo, page }) => {
      await play(demo, 'e7', 'e5', 'e5');
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Play 2. Nf3',
    narration: 'The knight comes out.',
    run: async ({ demo, page }) => {
      await play(demo, 'g1', 'f3', 'Nf3');
      await page.waitForTimeout(BEAT);
      const moves = await movesShown(page);
      if (!moves.includes('Nf3')) {
        throw new Error('the move list does not show 2. Nf3');
      }
    },
  },
  {
    name: 'Reject an illegal move',
    narration: 'An illegal move is refused: the rook cannot jump its own pawn.',
    run: async ({ demo, page }) => {
      const before = await movesShown(page);
      await play(demo, 'a8', 'a6', 'Ra6');
      await page.waitForTimeout(BEAT);
      // The step passes when the board is unchanged; an accepted Ra6 is the defect.
      if ((await movesShown(page)) !== before) {
        throw new Error('the illegal move Ra6 was accepted');
      }
    },
  },
  {
    name: 'Close on the board',
    narration: 'Games live in your space like any other object, so the other player sees each move as it is made.',
    run: async ({ page }) => {
      await page.waitForTimeout(BEAT * 6);
    },
  },
];
