//
// Copyright 2026 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';

import { AppManager } from './app-manager.ts';
import { type GitHubHttpMock, PULL_REQUEST_FIXTURE, installGitHubMock } from './plugins/github-http-mock.ts';

/**
 * The page half of the browser extension's page-actions protocol, driven exactly as the extension's
 * content script drives it: `window` CustomEvents on a Composer tab.
 *
 * The automated arm of `test QA-3` in plugin-github's `PLUGIN.mdl`. What it covers that a unit test
 * cannot: the descriptor a plugin contributes is serializable and reaches the wire, the invoke
 * handler resolves the active space on its own, and the operation the descriptor names imports the
 * pull request its URL points at — with no GitHub connection configured, so the import takes the
 * anonymous path. GitHub itself is mocked at the HTTP boundary by default; see `github-http-mock.ts`.
 */

/** Event names, restated rather than imported: `@dxos/crx-protocol` pulls `effect` into the spec's loader. */
const LIST_EVENT = 'composer:page-actions:list';
const LIST_ACK_EVENT = 'composer:page-actions:list:ack';
const INVOKE_EVENT = 'composer:page-action:invoke';
const INVOKE_ACK_EVENT = 'composer:page-action:invoke:ack';

const GITHUB_ACTION_ID = 'org.dxos.plugin.github/page-action/open-pull-request';
// Descriptors carry the operation key in its DXN string form, which is what the extension matches on.
const IMPORT_OPERATION = 'dxn:org.dxos.operation.github.importPullRequestFromSnapshot';

/**
 * A public, closed, two-file pull request: it reads without credentials and its title never changes,
 * so the assertion below is not hostage to someone editing a live PR.
 */
const PULL_REQUEST_URL = 'https://github.com/dxos/dxos/pull/1';

/** Neither plugin is on by default (github is experimental, crx is registered but not defaulted). */
const REQUIRED_PLUGINS = ['org.dxos.plugin.crx', 'org.dxos.plugin.github'];

type Descriptor = { id: string; operation: string; urlPatterns: string[]; contexts: string[] };
type ListAck = { ok: boolean; actions?: Descriptor[]; error?: string };
type InvokeAck = { ok: boolean; objectId?: string; error?: string };

test.describe('Extension page actions', () => {
  let host: AppManager;
  let github: GitHubHttpMock;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, false);
    await host.init();
    github = await installGitHubMock(host.page);

    const { rejected } = await host.page.evaluate(
      async (ids) =>
        (await globalThis.composer!.invoke!('org.dxos.operation.registry.enablePlugins', { ids })) as {
          rejected: unknown[];
        },
      REQUIRED_PLUGINS,
    );
    expect(rejected, 'both plugins must be installed in the bundle under test').toEqual([]);

    // The bridge installs its listeners when plugin-crx starts, which the host trickles in on idle;
    // polling the list request is both the wait and the first assertion.
    await expect
      .poll(
        async () => {
          const ack = await request<ListAck>(host.page, LIST_EVENT, LIST_ACK_EVENT, {}).catch(() => undefined);
          return ack?.actions?.some((action) => action.id === GITHUB_ACTION_ID) ?? false;
        },
        { timeout: 60_000 },
      )
      .toBe(true);
  });

  test.afterEach(async () => {
    await host.close();
  });

  test('contributes the pull request action to the extension registry', { tag: ['@github:QA-3'] }, async () => {
    const ack = await request<ListAck>(host.page, LIST_EVENT, LIST_ACK_EVENT, {});
    expect(ack.ok).toBe(true);

    const action = ack.actions?.find((candidate) => candidate.id === GITHUB_ACTION_ID);
    // The extension matches on these three fields alone, so they are the whole contract between the
    // plugin and a build of the extension that knows nothing about it.
    expect(action?.operation).toBe(IMPORT_OPERATION);
    expect(action?.urlPatterns).toEqual(['https://github.com/*/*/pull/*']);
    expect(action?.contexts).toEqual(['popup', 'picker']);
  });

  test('imports the pull request the page names', { tag: ['@github:QA-3'] }, async () => {
    const snapshot = {
      source: { url: PULL_REQUEST_URL, title: 'ignored', clippedAt: new Date().toISOString() },
    };
    const invoke = () =>
      request<InvokeAck>(host.page, INVOKE_EVENT, INVOKE_ACK_EVENT, {
        actionId: GITHUB_ACTION_ID,
        page: { url: PULL_REQUEST_URL, title: 'ignored' },
        inputs: snapshot,
        invokedFrom: 'popup',
      });

    const ack = await invoke();
    // The page reports operation failures by code alone; the cause only reaches the console.
    expect(ack.error, `ack failed — console: ${host.recentConsoleErrors(8)}`).toBeUndefined();
    expect(ack.ok).toBe(true);
    expect(ack.objectId).toBeTruthy();

    // The page's own title is deliberately wrong above: only `source.url` is read, so a title that
    // matches GitHub's is proof the operation went and asked GitHub rather than trusting the page.
    const pullRequest = await host.page.evaluate(async (id) => {
      for (const space of globalThis.dxos?.spaces?.() ?? []) {
        // A ref into a space that does not hold the object is dangling, and a dangling load never
        // settles — so each space gets a bounded turn rather than the test's whole budget.
        const object = await Promise.race([
          space.db.makeRef(`echo:///${id}`).load(),
          new Promise<undefined>((resolve) => setTimeout(resolve, 5_000)),
        ]).catch(() => undefined);
        if (object) {
          return { title: object.title, owner: object.owner, repo: object.repo, number: object.number };
        }
      }
      return undefined;
    }, ack.objectId!);
    expect(pullRequest).toMatchObject({
      title: PULL_REQUEST_FIXTURE.title,
      owner: 'dxos',
      repo: 'dxos',
      number: 1,
    });
    if (!github.live) {
      expect(github.calls, 'the import must read the pull request from GitHub').toEqual(['/repos/dxos/dxos/pulls/1']);
    }

    // Idempotent by coordinates: a second invoke answers with the object the space already holds.
    const again = await invoke();
    expect(again.ok).toBe(true);
    expect(again.objectId).toBe(ack.objectId);
  });
});

/**
 * Round-trip one CustomEvent pair, correlating on `id` the way the content script's `requestFromPage`
 * does. Rejects rather than hangs when the page never answers, so a missing listener fails as itself.
 */
const request = <T>(page: Page, event: string, ackEvent: string, detail: Record<string, unknown>): Promise<T> =>
  page.evaluate(
    ([event, ackEvent, detail]) =>
      new Promise((resolve, reject) => {
        const id = `e2e-${Math.random().toString(36).slice(2)}`;
        const timeout = setTimeout(() => {
          window.removeEventListener(ackEvent as string, onAck);
          reject(new Error(`no ack for ${event as string}`));
        }, 60_000);
        const onAck = (ack: Event) => {
          const payload = (ack as CustomEvent).detail;
          if (payload?.id !== id) {
            return;
          }
          clearTimeout(timeout);
          window.removeEventListener(ackEvent as string, onAck);
          resolve(payload);
        };
        window.addEventListener(ackEvent as string, onAck);
        window.dispatchEvent(new CustomEvent(event as string, { detail: { version: 1, id, ...(detail as object) } }));
      }),
    [event, ackEvent, detail] as const,
  ) as Promise<T>;
