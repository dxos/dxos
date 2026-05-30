//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { FetchError } from './fetch';

/**
 * Page side of the Composer extension's search render-proxy contract.
 *
 * The extension renders a URL in a real background tab and returns the rendered HTML, letting us
 * scrape client-rendered / anti-bot SPA targets a plain HTTP proxy cannot read. The wire shapes and
 * event names mirror `packages/apps/composer-crx/src/search-proxy/types.ts` (the source of truth);
 * they are re-declared here because the plugin must not depend on the extension app package.
 */

const RENDER_EVENT = 'composer:search-proxy:render';
const RENDER_ACK_EVENT = 'composer:search-proxy:render:ack';
const RENDER_READY_DATASET_KEY = 'composerSearchProxy';
const DEFAULT_RENDER_TIMEOUT_MS = 20_000;

type RenderRequest = {
  version: 1;
  id: string;
  url: string;
  waitForSelector?: string;
  waitForMs?: number;
  timeoutMs?: number;
  active?: boolean;
};

type RenderAck =
  | { version: 1; id: string; ok: true; html: string; finalUrl: string }
  | { version: 1; id: string; ok: false; error: string };

export type RenderOptions = {
  waitForSelector?: string;
  waitForMs?: number;
  timeoutMs?: number;
  active?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const decodeAck = (value: unknown): RenderAck | undefined => {
  if (!isRecord(value) || value.version !== 1 || typeof value.id !== 'string') {
    return undefined;
  }
  if (value.ok === true && typeof value.html === 'string' && typeof value.finalUrl === 'string') {
    return { version: 1, id: value.id, ok: true, html: value.html, finalUrl: value.finalUrl };
  }
  if (value.ok === false && typeof value.error === 'string') {
    return { version: 1, id: value.id, ok: false, error: value.error };
  }
  return undefined;
};

let counter = 0;
const nextId = (): string => {
  const random = globalThis.crypto?.randomUUID?.();
  return random ?? `render-${(counter += 1)}`;
};

/**
 * Whether the Composer extension's render-proxy relay is installed on this page. The relay sets a
 * `documentElement` dataset marker once it is listening, so this is a synchronous probe (no timeout).
 */
export const isCrxRenderAvailable = (): boolean =>
  typeof document !== 'undefined' && document.documentElement?.dataset[RENDER_READY_DATASET_KEY] === '1';

/**
 * Render a URL via the Composer extension and return the rendered HTML. Fails with {@link FetchError}
 * if the extension is unavailable, rejects the request, or does not ack within the timeout.
 */
export const renderViaCrx = (url: string, options: RenderOptions = {}): Effect.Effect<string, FetchError> =>
  Effect.async<string, FetchError>((resume) => {
    if (typeof window === 'undefined' || !isCrxRenderAvailable()) {
      resume(Effect.fail(new FetchError('Composer render-proxy extension is not available')));
      return;
    }

    const id = nextId();
    const timeoutMs = options.timeoutMs ?? DEFAULT_RENDER_TIMEOUT_MS;
    let settled = false;

    const cleanup = () => {
      window.removeEventListener(RENDER_ACK_EVENT, onAck);
      clearTimeout(timer);
    };

    const onAck = (event: Event) => {
      const detail = 'detail' in event ? event.detail : undefined;
      const ack = decodeAck(detail);
      if (!ack || ack.id !== id || settled) {
        return;
      }
      settled = true;
      cleanup();
      if (ack.ok) {
        resume(Effect.succeed(ack.html));
      } else {
        resume(Effect.fail(new FetchError(`render-proxy failed: ${ack.error}`)));
      }
    };

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resume(Effect.fail(new FetchError(`render-proxy timed out after ${timeoutMs}ms for ${url}`)));
    }, timeoutMs + 1_000);

    window.addEventListener(RENDER_ACK_EVENT, onAck);

    const request: RenderRequest = { version: 1, id, url, timeoutMs };
    if (options.waitForSelector) {
      request.waitForSelector = options.waitForSelector;
    }
    if (options.waitForMs != null) {
      request.waitForMs = options.waitForMs;
    }
    if (options.active != null) {
      request.active = options.active;
    }
    window.dispatchEvent(new CustomEvent(RENDER_EVENT, { detail: request }));

    return Effect.sync(() => {
      if (!settled) {
        settled = true;
        cleanup();
      }
    });
  });
