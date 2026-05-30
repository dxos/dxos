//
// Copyright 2026 DXOS.org
//

/**
 * Search render-proxy protocol.
 *
 * The Composer web page asks the extension to fetch + JS-render a URL in a
 * background tab and returns the rendered HTML. This lets the product-search
 * plugin scrape client-rendered / anti-bot SPA sites a plain HTTP proxy
 * cannot. The extension is a PROXY ONLY — it performs no extraction.
 *
 * The page and the extension exchange messages over same-origin `window`
 * CustomEvents (page <-> content script) and a runtime message
 * (content script <-> background). This module is the single source of truth
 * for the wire shapes; both ends decode through the exported validators so a
 * malformed payload is rejected rather than trusted.
 */

/**
 * Window CustomEvent name the page dispatches to request a render.
 */
export const RENDER_EVENT = 'composer:search-proxy:render';

/**
 * Window CustomEvent name the content script dispatches with the ack.
 */
export const RENDER_ACK_EVENT = 'composer:search-proxy:render:ack';

/**
 * Runtime message `type` discriminator the content script forwards to the
 * background worker.
 */
export const RENDER_MESSAGE_TYPE = 'composer-crx:search-proxy:render';

/**
 * `documentElement` dataset key the content relay sets once it is listening on
 * a Composer page (`document.documentElement.dataset.composerSearchProxy`).
 * Lets the page detect render-proxy availability synchronously rather than
 * waiting for a request to time out.
 */
export const RENDER_READY_DATASET_KEY = 'composerSearchProxy';

/**
 * Default ceiling for a single render before it is aborted.
 */
export const DEFAULT_RENDER_TIMEOUT_MS = 20_000;

/**
 * Request to render a URL in a background tab.
 */
export type RenderRequest = {
  version: 1;
  /** Correlation id; the ack echoes it back. */
  id: string;
  url: string;
  /** Poll for this CSS selector before reading the HTML. */
  waitForSelector?: string;
  /** Additional fixed delay (ms) before reading the HTML. */
  waitForMs?: number;
  /** Overall ceiling (ms) before the render is aborted. */
  timeoutMs?: number;
};

/**
 * Discriminated set of failure modes returned in a non-ok ack.
 *   - `badRequest`      : the request failed validation.
 *   - `forbiddenOrigin` : the sender is not a configured Composer origin.
 *   - `noTab`           : the background tab could not be created.
 *   - `timeout`         : the render exceeded its time budget.
 *   - `invalidAck`      : the injected script returned an unexpected shape.
 *   - `transportError`  : an unexpected browser-API error.
 */
export type RenderError = 'badRequest' | 'forbiddenOrigin' | 'noTab' | 'timeout' | 'invalidAck' | 'transportError';

/**
 * Reply to a {@link RenderRequest}.
 */
export type RenderAck =
  | { version: 1; id: string; ok: true; html: string; finalUrl: string }
  | { version: 1; id: string; ok: false; error: RenderError };

const RENDER_ERRORS: readonly string[] = [
  'badRequest',
  'forbiddenOrigin',
  'noTab',
  'timeout',
  'invalidAck',
  'transportError',
];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isRenderError = (value: unknown): value is RenderError =>
  typeof value === 'string' && RENDER_ERRORS.includes(value);

/**
 * Validate and narrow an unknown value to a {@link RenderRequest}. Returns
 * `undefined` for anything that does not match the contract (including a
 * version mismatch) so callers reject rather than trust the payload.
 */
export const decodeRenderRequest = (value: unknown): RenderRequest | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  if (value.version !== 1) {
    return undefined;
  }
  if (typeof value.id !== 'string' || typeof value.url !== 'string') {
    return undefined;
  }
  if (value.waitForSelector !== undefined && typeof value.waitForSelector !== 'string') {
    return undefined;
  }
  if (value.waitForMs !== undefined && typeof value.waitForMs !== 'number') {
    return undefined;
  }
  if (value.timeoutMs !== undefined && typeof value.timeoutMs !== 'number') {
    return undefined;
  }

  const request: RenderRequest = { version: 1, id: value.id, url: value.url };
  if (typeof value.waitForSelector === 'string') {
    request.waitForSelector = value.waitForSelector;
  }
  if (typeof value.waitForMs === 'number') {
    request.waitForMs = value.waitForMs;
  }
  if (typeof value.timeoutMs === 'number') {
    request.timeoutMs = value.timeoutMs;
  }
  return request;
};

/**
 * Validate and narrow an unknown value to a {@link RenderAck}. Returns
 * `undefined` for anything that does not match the contract.
 */
export const decodeRenderAck = (value: unknown): RenderAck | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  if (value.version !== 1 || typeof value.id !== 'string') {
    return undefined;
  }
  if (value.ok === true) {
    if (typeof value.html !== 'string' || typeof value.finalUrl !== 'string') {
      return undefined;
    }
    return { version: 1, id: value.id, ok: true, html: value.html, finalUrl: value.finalUrl };
  }
  if (value.ok === false) {
    if (!isRenderError(value.error)) {
      return undefined;
    }
    return { version: 1, id: value.id, ok: false, error: value.error };
  }
  return undefined;
};
