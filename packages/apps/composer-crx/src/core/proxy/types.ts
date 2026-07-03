//
// Copyright 2026 DXOS.org
//

import type { Proxy } from '@dxos/crx-protocol';

/**
 * Search render-proxy + ping protocol (extension side).
 *
 * The serializable wire *shapes* are the single source of truth in `@dxos/crx-protocol` (`Proxy`)
 * and are imported here **type-only** (erased at build) so the extension — in particular the
 * per-page content script, which decodes these directly — carries no `effect` runtime. Decoding is
 * done by the hand-rolled validators below (also `effect`-free).
 *
 * The cross-tab CustomEvent name constants are plain string literals (not imported, to avoid pulling
 * the `effect`-based schema module at runtime); their values MUST match the corresponding
 * `Proxy.*` constants in `@dxos/crx-protocol`.
 */

/** Window CustomEvent name the page dispatches to request a render. Matches `Proxy.RENDER_EVENT`. */
export const RENDER_EVENT = 'composer:proxy:render';

/** Window CustomEvent name the content script dispatches with the ack. Matches `Proxy.RENDER_ACK_EVENT`. */
export const RENDER_ACK_EVENT = 'composer:proxy:render:ack';

/**
 * Runtime message `type` discriminator the content script forwards to the
 * background worker (extension-internal; not part of the shared cross-tab protocol).
 */
export const RENDER_MESSAGE_TYPE = 'composer-crx:proxy:render';

/**
 * `documentElement` dataset key the content relay sets once it is listening on
 * a Composer page. Lets the page detect render-proxy availability synchronously.
 * Matches `Proxy.RENDER_READY_DATASET_KEY`.
 */
export const RENDER_READY_DATASET_KEY = 'composerProxy';

/** Default ceiling for a single render before it is aborted. */
export const DEFAULT_RENDER_TIMEOUT_MS = 20_000;

/** Request to render a URL in a background tab. */
export type RenderRequest = Proxy.RenderRequest;

/** Discriminated set of failure modes returned in a non-ok ack. */
export type RenderError = Proxy.RenderError;

/** Reply to a {@link RenderRequest}. */
export type RenderAck = Proxy.RenderAck;

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

  // Built immutably: the shared schema types are readonly.
  return {
    version: 1,
    id: value.id,
    url: value.url,
    ...(typeof value.waitForSelector === 'string' ? { waitForSelector: value.waitForSelector } : {}),
    ...(typeof value.waitForMs === 'number' ? { waitForMs: value.waitForMs } : {}),
    ...(typeof value.timeoutMs === 'number' ? { timeoutMs: value.timeoutMs } : {}),
    ...(typeof value.active === 'boolean' ? { active: value.active } : {}),
  };
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

/** Window CustomEvent name the page dispatches to probe the extension. Matches `Proxy.PING_EVENT`. */
export const PING_EVENT = 'composer:proxy:ping';

/** Window CustomEvent name the content script dispatches with the ping ack. Matches `Proxy.PING_ACK_EVENT`. */
export const PING_ACK_EVENT = 'composer:proxy:ping:ack';

/**
 * Runtime message `type` discriminator the content script forwards for a ping
 * (extension-internal; not part of the shared cross-tab protocol).
 */
export const PING_MESSAGE_TYPE = 'composer-crx:proxy:ping';

/** Health-check round-trip: the page asks the extension to identify itself. */
export type PingRequest = Proxy.PingRequest;

/** Reply to a {@link PingRequest}, carrying the extension's manifest identity. */
export type PingAck = Proxy.PingAck;

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
