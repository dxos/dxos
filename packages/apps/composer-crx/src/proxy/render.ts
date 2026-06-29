//
// Copyright 2026 DXOS.org
//

import { type RenderAck, type RenderRequest, DEFAULT_RENDER_TIMEOUT_MS } from './types';

/**
 * Minimal, injectable surface of the browser APIs `renderUrl` depends on.
 *
 * Modelled to structurally match `webextension-polyfill` so the live
 * `browser` object is assignable without a cast, while remaining trivially
 * mockable in tests. Only the members actually used are declared.
 */
export interface RenderBrowserApi {
  windows: {
    // Render in a separate popup window rather than a tab: an unfocused window still reports
    // `document.visibilityState: 'visible'` (a background tab is `hidden`), so visibility-gated
    // anti-bot checks pass without stealing focus from Composer.
    create(createData: {
      url?: string;
      type?: 'normal' | 'popup' | 'panel' | 'detached_panel';
      focused?: boolean;
      width?: number;
      height?: number;
    }): Promise<{ id?: number; tabs?: { id?: number }[] }>;
    remove(windowId: number): Promise<void>;
  };
  tabs: {
    onUpdated: {
      addListener(callback: (tabId: number, changeInfo: { status?: string }) => void): void;
      removeListener(callback: (tabId: number, changeInfo: { status?: string }) => void): void;
    };
  };
  scripting: {
    executeScript(injection: {
      target: { tabId: number };
      func?: (...args: unknown[]) => unknown;
      args?: unknown[];
    }): Promise<{ result?: unknown }[]>;
  };
}

/**
 * Shape the injected reader function returns. Kept inline (and re-validated)
 * because the function executes in the page context and its result crosses
 * the structured-clone boundary as `unknown`.
 */
type PageSnapshot = { html: string; finalUrl: string };

const isPageSnapshot = (value: unknown): value is PageSnapshot =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { html?: unknown }).html === 'string' &&
  typeof (value as { finalUrl?: unknown }).finalUrl === 'string';

/**
 * Function injected into the rendered page. Declared at module scope (rather
 * than inline) so it is a plain, serializable function reference.
 */
const readDocument = (): { html: string; finalUrl: string } => ({
  html: document.documentElement.outerHTML,
  finalUrl: document.location.href,
});

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Subscribe to `tabs.onUpdated` and resolve once the target tab reaches
 * `complete` load status. The listener is attached *before* the tab is
 * created (the target id is supplied later via `setTabId`) so a fast load
 * cannot fire `complete` before we are listening. Buffers a `complete` that
 * arrives before the id is known.
 */
const watchForComplete = (api: RenderBrowserApi, signal: AbortSignal) => {
  let targetTabId: number | undefined;
  let completed = false;
  let resolveComplete: (() => void) | undefined;
  let rejectComplete: ((reason: Error) => void) | undefined;
  const completedBeforeId = new Set<number>();

  const listener = (updatedTabId: number, changeInfo: { status?: string }) => {
    if (changeInfo.status !== 'complete') {
      return;
    }
    if (targetTabId === undefined) {
      completedBeforeId.add(updatedTabId);
      return;
    }
    if (updatedTabId === targetTabId) {
      completed = true;
      resolveComplete?.();
    }
  };
  const onAbort = () => rejectComplete?.(new Error('aborted'));

  api.tabs.onUpdated.addListener(listener);
  signal.addEventListener('abort', onAbort);

  return {
    setTabId: (tabId: number) => {
      targetTabId = tabId;
      if (completedBeforeId.has(tabId)) {
        completed = true;
        resolveComplete?.();
      }
    },
    wait: (): Promise<void> =>
      new Promise<void>((resolve, reject) => {
        if (signal.aborted) {
          reject(new Error('aborted'));
          return;
        }
        if (completed) {
          resolve();
          return;
        }
        resolveComplete = resolve;
        rejectComplete = reject;
      }),
    dispose: () => {
      api.tabs.onUpdated.removeListener(listener);
      signal.removeEventListener('abort', onAbort);
    },
  };
};

/**
 * Poll for a CSS selector to appear in the rendered page, best-effort. Resolves `true` once it
 * matches, or `false` once `deadlineMs` elapses without a match — so a wrong/late selector (lazy
 * load, anti-bot, schema drift) does NOT sink the whole render; the caller reads whatever rendered.
 */
const waitForSelector = async (
  api: RenderBrowserApi,
  tabId: number,
  selector: string,
  signal: AbortSignal,
  deadlineMs: number,
): Promise<boolean> => {
  const probe = (...args: unknown[]): boolean => {
    const [sel] = args;
    return typeof sel === 'string' && document.querySelector(sel) !== null;
  };
  const start = Date.now();
  while (!signal.aborted) {
    const [entry] = await api.scripting.executeScript({ target: { tabId }, func: probe, args: [selector] });
    if (entry?.result === true) {
      return true;
    }
    if (Date.now() - start >= deadlineMs) {
      return false;
    }
    await delay(100);
  }
  return false;
};

/**
 * Render a URL in a separate popup window and return its rendered HTML.
 *
 * Flow: open a popup window (unfocused unless `active`) → await its tab's load `complete` →
 * optional `waitForSelector` poll and/or `waitForMs` delay → read
 * `document.documentElement.outerHTML` + `document.location.href` via an injected script → ALWAYS
 * remove the window. A separate window stays `document.visibilityState: 'visible'` even unfocused
 * (a background tab is `hidden`), so visibility-gated anti-bot checks pass without stealing focus.
 * The whole flow is bounded by `timeoutMs` (default {@link DEFAULT_RENDER_TIMEOUT_MS}).
 */
export const renderUrl = async (api: RenderBrowserApi, request: RenderRequest): Promise<RenderAck> => {
  const {
    id,
    url,
    waitForSelector: selector,
    waitForMs,
    timeoutMs = DEFAULT_RENDER_TIMEOUT_MS,
    active = false,
  } = request;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const timeout = new Promise<never>((_resolve, reject) => {
    controller.signal.addEventListener('abort', () => reject(new Error('timeout')));
  });

  const watcher = watchForComplete(api, controller.signal);
  let windowId: number | undefined;
  try {
    const run = async (): Promise<RenderAck> => {
      // Unfocused (when !active) so it never steals focus from Composer; still `visible` (not
      // `hidden` like a background tab), which is what visibility-gated anti-bot keys on. `active`
      // is the focused fallback for sites that also check focus.
      const win = await api.windows.create({ url, type: 'popup', focused: active, width: 1280, height: 1024 });
      windowId = win.id;
      const tabId = win.tabs?.[0]?.id;
      if (tabId === undefined) {
        return { version: 1, id, ok: false, error: 'noTab' };
      }

      watcher.setTabId(tabId);
      await watcher.wait();

      if (selector) {
        // Reserve headroom to actually read the page even if the selector never appears; never let
        // the selector wait consume the whole budget.
        const selectorDeadline = Math.max(1_000, timeoutMs - 4_000);
        await waitForSelector(api, tabId, selector, controller.signal, selectorDeadline);
      }
      if (typeof waitForMs === 'number' && waitForMs > 0) {
        await delay(waitForMs);
      }

      const [entry] = await api.scripting.executeScript({ target: { tabId }, func: readDocument });
      if (!isPageSnapshot(entry?.result)) {
        return { version: 1, id, ok: false, error: 'invalidAck' };
      }
      return { version: 1, id, ok: true, html: entry.result.html, finalUrl: entry.result.finalUrl };
    };

    return await Promise.race([run(), timeout]);
  } catch (err) {
    if (controller.signal.aborted) {
      return { version: 1, id, ok: false, error: 'timeout' };
    }
    return { version: 1, id, ok: false, error: 'transportError' };
  } finally {
    clearTimeout(timer);
    watcher.dispose();
    if (windowId !== undefined) {
      await api.windows.remove(windowId).catch(() => undefined);
    }
  }
};
