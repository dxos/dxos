//
// Copyright 2022 DXOS.org
//

import { chromium } from 'playwright';
import robot from 'robotjs';

import { Launcher } from '../util';

const config = {
  // esbuild-server book
  baseUrl: 'http://localhost:8080/#/'
};

const baseUrl = `${config.baseUrl}__story/stories-App-stories-tsx`;

describe('Grid demo', function () {
  this.timeout(0); // Run until manually quit.

  const spacing = 16;
  const marginTop = 24; // OSX toolbar.
  const [rows, columns] = [2, 3]; // TODO(burdon): argv.

  /**
   * Create positioned launcher.
   */
  const createLauncher = async (
    url: string,
    position: { x: number, y: number },
    size: { width: number, height: number }
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
   * Create grid of launchers.
   */
  const createGrid = async (url: string, [rows, columns]: [number, number]): Promise<Launcher[]> => {
    const launchers = [];

    const { width, height } = robot.getScreenSize();
    const size = {
      width: Math.round((width - (columns - 1) * spacing) / columns),
      height: Math.round((height - marginTop - (rows - 1) * spacing) / rows)
    };

    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const launcher = await createLauncher(url, {
          x: column * (size.width + spacing),
          y: marginTop + row * (size.height + spacing)
        }, size);

        launchers.push(launcher);
      }
    }

    return launchers;
  };

  /**
   * Create and process invitation.
   */
  const invite = async (inviter: Launcher, invitee: Launcher) => {
    return new Promise((resolve) => {
      // Wait for console message with invitation.
      inviter.page.on('console', async (msg) => {
        const invitation = msg.text();
        if (invitation.indexOf('encodedInvitation') !== -1) {
          await invitee.page.fill('input[data-id=test-input-join]', invitation);
          await invitee.page.click('button[data-id=test-button-join]');

          // Show graph.
          await invitee.page.click('button[data-id=test-button-view-graph]');

          resolve(true);
        }
      });

      // Click share.
      setImmediate(async () => {
        await inviter.page.click('button[data-id=test-button-share]');
      });
    });
  };

  /* eslint-disable jest/expect-expect */
  it('Opens grid', async () => {
    // TODO(burdon): Create generator so don't have to wait until each load.
    const launchers = await createGrid('/Secondary', [rows, columns]);

    // Create initial party.
    const first = launchers[0];
    await first.page.click('button[data-id=test-button-create]');

    // Show cards.
    await first.page.click('button[data-id=test-button-view-board]');

    // Invite successive peers.
    for await (const i of Array.from(Array(launchers.length - 1)).map((_, i) => i)) {
      await invite(launchers[i], launchers[i + 1]);
    }

    // Create items.
    let count = 10;
    const i = setInterval(async () => {
      await first.page.click('button[data-id=test-button-create]', { modifiers: ['Meta'] });
      if (--count === 0) {
        clearInterval(i);
      }
    }, 500);
  });
});
