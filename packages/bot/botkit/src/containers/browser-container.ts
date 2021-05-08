//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import path from 'path';
import { sync as findPkgJson } from 'pkg-up';
import playwright from 'playwright';

import { keyToString } from '@dxos/crypto';
import { Event } from '@dxos/util';

import { BotId, BotInfo } from '../bot-manager';
import { logBot } from '../log';
import { BotContainer, BotExitEventArgs, ContainerStartOptions } from './common';

const log = debug('dxos:botkit:container:browser');

// TODO(egorgripasov): Allow consumer to select.
const BROWSER_TYPE = 'chromium';

export class BrowserContainer implements BotContainer {
  private _controlTopic?: any;
  private _browser!: playwright.ChromiumBrowser;
  private readonly _bots = new Map<BotId, playwright.BrowserContext>();

  readonly botExit = new Event<BotExitEventArgs>();

  async start ({ controlTopic }: ContainerStartOptions) {
    this._controlTopic = controlTopic;
    this._browser = await playwright[BROWSER_TYPE].launch();
  }

  async stop () {
    await this._browser.close();
  }

  async startBot (botInfo: BotInfo): Promise<void> {
    const { botId, name, installDirectory } = botInfo;
    const botFilePath = path.join(installDirectory, 'main.js');

    const dxEnv = {
      ...process.env,
      NODE_OPTIONS: '',
      DX_BOT_CONTROL_TOPIC: keyToString(this._controlTopic),
      DX_BOT_UID: botId,
      DX_BOT_NAME: name,
      DX_BOT_CWD: '/dxos/bot',
      DX_BOT_RESTARTED: false, // TODO(marik-d): Remove.
      DX_BOT_PERSISTENT: 'false' // Storage is currently broken
    };

    log('Creating context');
    const context = await this._browser.newContext();
    log('Creating page');
    const page = await context.newPage();

    page.on('pageerror', error => {
      logBot[botId](error.stack);
    });
    page.on('console', msg => {
      log('Console', msg.type(), msg.text());
      logBot[botId](msg.text());
    });

    log('Navigating to index.html');
    await page.goto(`file:${path.join(path.dirname(findPkgJson({ cwd: __dirname })!), 'res/browser-test.html')}`);
    log('Injecting env', dxEnv);
    await page.evaluate((dxEnv) => {
      ((window.process as any) ||= {}).env = dxEnv;
    }, dxEnv);
    log(`Injecting script ${botFilePath}`);
    await page.addScriptTag({ path: botFilePath });
  }

  async stopBot (botInfo: BotInfo) {
    const context = this._bots.get(botInfo.botId);

    if (context) {
      await context.close();
    }
  }
}
