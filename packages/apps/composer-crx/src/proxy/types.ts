//
// Copyright 2026 DXOS.org
//

/**
 * Search render-proxy protocol.
 *
 * The Composer web page asks the extension to fetch + JS-render a URL in a
 * background tab and returns the rendered HTML. This lets the commerce
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
export const RENDER_EVENT = 'composer:proxy:render';

/**
 * Window CustomEvent name the content script dispatches with the ack.
 */
export const RENDER_ACK_EVENT = 'composer:proxy:render:ack';

/**
 * Runtime message `type` discriminator the content script forwards to the
 * background worker.
 */
export const RENDER_MESSAGE_TYPE = 'composer-crx:proxy:render';

/**
 * `documentElement` dataset key the content relay sets once it is listening on
 * a Composer page (`document.documentElement.dataset.composerProxy`).
 * Lets the page detect render-proxy availability synchronously rather than
 * waiting for a request to time out.
 */
export const RENDER_READY_DATASET_KEY = 'composerProxy';

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
  /** Render in a focused (foreground) tab. Helps sites that gate background tabs. Default false. */
  active?: boolean;
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
  if (value.active !== undefined && typeof value.active !== 'boolean') {
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
  if (typeof value.active === 'boolean') {
    request.active = value.active;
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

/**
 * Window CustomEvent name the page dispatches to probe the extension.
 */
export const PING_EVENT = 'composer:proxy:ping';

/**
 * Window CustomEvent name the content script dispatches with the ping ack.
 */
export const PING_ACK_EVENT = 'composer:proxy:ping:ack';

/**
 * Runtime message `type` discriminator the content script forwards for a ping.
 */
export const PING_MESSAGE_TYPE = 'composer-crx:proxy:ping';

/**
 * Health-check round-trip: the page asks the extension to identify itself. Exercises the same
 * page → content-script → background path the render-proxy uses, so a successful ack proves the
 * messaging path (not just that the content script loaded).
 */
export type PingRequest = {
  version: 1;
  /** Correlation id; the ack echoes it back. */
  id: string;
};

/**
 * Reply to a {@link PingRequest}, carrying the extension's manifest identity.
 */
export type PingAck =
  | { version: 1; id: string; ok: true; extensionVersion: string; extensionName: string }
  | { version: 1; id: string; ok: false; error: RenderError };

/**
 * Validate and narrow an unknown value to a {@link PingRequest}.
 */
export const decodePingRequest = (value: unknown): PingRequest | undefined => {
  if (!isRecord(value) || value.version !== 1 || typeof value.id !== 'string') {
    return undefined;
  }
  return { version: 1, id: value.id };
};

/**
 * Validate and narrow an unknown value to a {@link PingAck}.
 */
export const decodePingAck = (value: unknown): PingAck | undefined => {
  if (!isRecord(value) || value.version !== 1 || typeof value.id !== 'string') {
    return undefined;
  }
  if (value.ok === true) {
    if (typeof value.extensionVersion !== 'string' || typeof value.extensionName !== 'string') {
      return undefined;
    }
    return {
      version: 1,
      id: value.id,
      ok: true,
      extensionVersion: value.extensionVersion,
      extensionName: value.extensionName,
    };
  }
  if (value.ok === false) {
    if (!isRenderError(value.error)) {
      return undefined;
    }
    return { version: 1, id: value.id, ok: false, error: value.error };
  }
  return undefined;
};
