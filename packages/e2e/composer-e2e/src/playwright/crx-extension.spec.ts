//
// Copyright 2026 DXOS.org
//

import { type BrowserContext, type Page, chromium, expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { AppManager } from './app-manager.ts';
import { type GitHubHttpMock, PULL_REQUEST_FIXTURE, installGitHubMock } from './plugins/github-http-mock.ts';

/**
 * The whole extension wire, with the real unpacked extension loaded into the browser: the background
 * worker's registry refresh, URL-pattern matching, the snapshot extractor on the GitHub tab, delivery
 * to the Composer tab, and the ack that carries the imported object's id back.
 *
 * `crx.spec.ts` covers the page half alone and runs in every project; this one needs a persistent
 * context (extensions cannot be loaded into an ordinary one), so it launches its own browser and runs
 * on chromium only. It is skipped unless the extension has been built:
 *
 *   moon run composer-crx:bundle && moon run composer-e2e:e2e -- crx-extension
 */

const EXTENSION_DIR = path.resolve(import.meta.dirname, '../../../../apps/composer-crx/dist');

/** The app under test, as the extension must be told to look for it. */
const APP_URL = 'http://127.0.0.1:4173';
const APP_URL_PATTERN = `${APP_URL}/*`;

const PULL_REQUEST_URL = 'https://github.com/dxos/dxos/pull/1';
const GITHUB_ACTION_ID = 'org.dxos.plugin.github/page-action/open-pull-request';
const REQUIRED_PLUGINS = ['org.dxos.plugin.crx', 'org.dxos.plugin.github'];

/** Runtime message the side panel's action row sends; the background answers with the invoke ack. */
const PAGE_ACTION_RUN = 'composer-crx:page-action:run';

type InvokeAck = { ok: boolean; objectId?: string; error?: string };

test.describe('Extension', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'extensions load in chromium only');
  // Skipped rather than failed when the extension has not been built: this suite's other specs do not
  // need it, and a missing `dist` is a setup step, not a regression.
  test.skip(() => !existsSync(EXTENSION_DIR), `no extension build at ${EXTENSION_DIR}`);

  let context: BrowserContext;
  let userDataDir: string;
  let host: AppManager;
  let github: GitHubHttpMock;
  let extensionId: string;

  test.beforeEach(async () => {
    userDataDir = await mkdtemp(path.join(tmpdir(), 'composer-crx-'));
    context = await chromium.launchPersistentContext(userDataDir, {
      // `--headless=new` rather than Playwright's `headless`: the old headless mode loads no
      // extensions at all, and the flag is how the new one is selected on this Chromium.
      headless: false,
      executablePath: process.env.CLAUDE_CODE_REMOTE ? '/opt/pw-browsers/chromium' : undefined,
      args: [
        '--headless=new',
        '--no-sandbox',
        `--disable-extensions-except=${EXTENSION_DIR}`,
        `--load-extension=${EXTENSION_DIR}`,
        ...(process.env.CLAUDE_CODE_REMOTE
          ? [
              `--proxy-server=${process.env.HTTPS_PROXY}`,
              '--proxy-bypass-list=127.0.0.1;localhost',
              '--ssl-version-max=tls1.2',
            ]
          : []),
      ],
    });

    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    extensionId = new URL(worker.url()).host;

    const options = await context.newPage();
    await options.goto(`chrome-extension://${extensionId}/options.html`);
    await configureExtension(options);

    host = new AppManager(context, false);
    await host.init();
    github = await installGitHubMock(host.page);

    const { rejected } = await host.page.evaluate(
      async (ids) =>
        (await globalThis.composer!.invoke!('org.dxos.operation.registry.enablePlugins', { ids })) as {
          rejected: unknown[];
        },
      REQUIRED_PLUGINS,
    );
    expect(rejected).toEqual([]);
  });

  test.afterEach(async () => {
    await context.close();
    await rm(userDataDir, { recursive: true, force: true });
  });

  test('opens the pull request the toolbar action is clicked on', { tag: ['@github:QA-3'] }, async () => {
    await stubPullRequestPage(context);
    const pullRequestPage = await context.newPage();
    await pullRequestPage.goto(PULL_REQUEST_URL);

    // Driven from an extension page because that is the only context `chrome.runtime` exists in —
    // the same message the side panel's action row sends when the button is clicked.
    const runner = await context.newPage();
    await runner.goto(`chrome-extension://${extensionId}/options.html`);

    // The background caches the registry when a Composer tab announces itself, and re-reads it on a
    // schedule; the action is unknown until that lands, so the click is retried rather than raced.
    let ack: InvokeAck | undefined;
    await expect
      .poll(
        async () => {
          ack = await runner.evaluate(
            async ([type, actionId, url]) => {
              const [tab] = await chrome.tabs.query({ url });
              if (tab?.id === undefined) {
                return { ok: false, error: 'noTab' };
              }
              return (await chrome.runtime.sendMessage({ type, actionId, tabId: tab.id })) as InvokeAck;
            },
            [PAGE_ACTION_RUN, GITHUB_ACTION_ID, PULL_REQUEST_URL] as const,
          );
          return ack.error ?? 'ok';
        },
        { timeout: 120_000, intervals: [5_000] },
      )
      .toBe('ok');

    expect(ack!.objectId).toBeTruthy();

    const pullRequest = await host.page.evaluate(async (id) => {
      for (const space of globalThis.dxos?.spaces?.() ?? []) {
        const object = await Promise.race([
          space.db.makeRef(`echo:///${id}`).load(),
          new Promise<undefined>((resolve) => setTimeout(resolve, 5_000)),
        ]).catch(() => undefined);
        if (object) {
          return { title: object.title, owner: object.owner, repo: object.repo, number: object.number };
        }
      }
      return undefined;
    }, ack!.objectId!);
    expect(pullRequest).toMatchObject({
      title: PULL_REQUEST_FIXTURE.title,
      owner: 'dxos',
      repo: 'dxos',
      number: 1,
    });
    if (!github.live) {
      expect(github.calls).toContain('/repos/dxos/dxos/pulls/1');
    }
  });
});

/**
 * A GitHub pull request page, stubbed at the HTTP boundary so the tab is cheap and deterministic
 * while its URL stays the real one — which is what the action's `urlPatterns` are matched against.
 */
const stubPullRequestPage = (context: BrowserContext) =>
  context.route(PULL_REQUEST_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><html><head><title>chore: release 1.0.0 by github-actions[bot] · Pull Request #1 · dxos/dxos</title></head><body><h1>chore: release 1.0.0</h1></body></html>',
    }),
  );

/** Everything the extension needs to know about this run, written as the options page writes it. */
const configureExtension = async (page: Page) => {
  await page.evaluate(async (urls) => chrome.storage.sync.set({ 'composer-urls': urls }), [APP_URL_PATTERN]);
};
