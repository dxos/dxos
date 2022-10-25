//
// Copyright 2022 DXOS.org
//

import { chromium } from 'playwright';
import robot from 'robotjs';

import { TestType } from '@dxos/client-testing';

import { Launcher } from '../util';

const config = {
  // esbuild-server book
  baseUrl: 'http://localhost:8080/#/'
};

// TODO(burdon): Import App from src/main?
const baseUrl = `${config.baseUrl}__story/stories-App-stories-tsx`;

describe('Grid demo', function () {
  this.timeout(0); // Run until manually quit.

  // TODO(burdon): Not working.
  // Invitation to join existing party.
  const invitation = process.env.INVITATION;

  const spacing = 8;
  const marginTop = parseInt(process.env.MENUBAR ?? '24'); // Menubar with OSX notch is 40.
  const { width, height } = robot.getScreenSize();
  const minSize = { width: 750, height: 500 };

  let [columns, rows] = [0, 0];
  if (process.env.GRID) {
    // Example: `GRID=2,1 rushx demo:grid`
    [columns = 2, rows = 1] = process.env
      .GRID!.split(',')
      .map((i) => parseInt(i));
  } else {
    [columns, rows] = [
      Math.floor(width / minSize.width),
      Math.floor(height / minSize.height)
    ];
  }

  /**
   * Create positioned launcher.
   */
  const createLauncher = async (
    url: string,
    position: { x: number; y: number },
    size: { width: number; height: number }
  ) => {
    const launcher = new Launcher(baseUrl, chromium, {
      headless: false,
      // https://peter.sh/experiments/chromium-command-line-switches
      args: [
        `--window-position=${position.x},${position.y}`,
        `--window-size=${size.width},${size.height}`
      ]
    });

    await launcher.open();
    await launcher.page.goto(launcher.url(url));
    return launcher;
  };

  /**
   * Create and process invitation.
   */
  const invite = async (inviter: Launcher, invited: Launcher) => {
    await inviter.page.click('button[data-id=test-button-share-party]');
    const invitation: string = await inviter.page.evaluate(() =>
      navigator.clipboard.readText()
    );

    await invited.page.fill('input[data-id=test-input-join-party]', invitation);
    await invited.page.click('button[data-id=test-button-join-party]');
  };

  /**
   * Generates iterator of browser launcher promises.
   * NOTE: Synchronous generator of promises vs async generator (async function* {})
   */
  function* createGrid(
    url: string,
    [rows, columns]: [number, number]
  ): Generator<Promise<Launcher>> {
    const size = {
      width: Math.round((width - (columns - 1) * spacing) / columns),
      height: Math.round((height - marginTop - (rows - 1) * spacing) / rows)
    };

    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const launcher = createLauncher(
          url,
          {
            x: column * (size.width + spacing),
            y: marginTop + row * (size.height + spacing)
          },
          size
        );

        yield launcher;
      }
    }
  }

  it('Opens grid', async function () {
    const grid = createGrid('/Secondary', [rows, columns]);

    let page = 0;
    let graph: Launcher | undefined;
    let previous: Launcher | undefined;
    for await (const launcher of grid) {
      page++;

      if (!previous) {
        if (invitation) {
          // Join existing party.
          console.log('Joining existing party...');
          await launcher.page.fill(
            'input[data-id=test-input-join-party]',
            invitation
          );
          await launcher.page.click('button[data-id=test-button-join-party]');
        } else {
          // First launcher creates the party.
          console.log('Creating party...');
          await launcher.page.click('button[data-id=test-button-create-party]');
        }
      } else {
        // Start invitation flow.
        console.log('Joining party...');
        await invite(previous, launcher);

        // Select view.
        const view = page === 3 ? 'board' : 'graph'; // faker.random.arrayElement(['list', 'board', 'graph']);
        await launcher.page.click(`button[data-id=test-button-view-${view}]`);

        // TODO(burdon): Scroll board.
        // await launcher.page.locator('.MuiGrid-item:nth-child(5)').scrollIntoViewIfNeeded();

        // Type query.
        if (page === 2) {
          graph = launcher;
        }
      }

      previous = launcher;
    }

    // Select items.
    if (graph) {
      await graph.page.click('button[data-id=test-button-selection]');

      const defaultSelectionText = `select()\n.filter({ type: '${TestType.Org}' })\n.children()\n.filter({ type: '${TestType.Project}' })\n.children()`;

      let i = 0;
      const lines = defaultSelectionText.split('\n');
      const interval = setInterval(async () => {
        if (i >= lines.length) {
          clearInterval(interval);
        } else {
          // Generate data.
          await graph!.page.click('button[data-id=test-button-create-item]', {
            modifiers: ['Meta']
          });

          // NOTE: May lose focus when other window opens.
          const text = lines[i++];
          await graph!.page.type(
            'textarea[data-id=test-input-selection]',
            text + '\n',
            { delay: 10 }
          );
        }
      }, 5000);
    }
  });
});
