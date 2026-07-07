//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

//
// Search render-proxy + health-check (ping) wire protocol.
//
// The Composer page asks the extension to fetch + JS-render a URL in a background tab (the extension
// is a proxy only; it performs no extraction), and to identify itself via a ping round-trip. Both
// exchanges cross the page <-> content-script <-> background boundary; this is the shared source of
// truth for their serializable shapes, consumed by both `plugin-crx` and `composer-crx`.
//

/** Window CustomEvent the page dispatches to request a render. */
export const RENDER_EVENT = 'composer:proxy:render';

/** Window CustomEvent the content relay dispatches with the render ack. */
export const RENDER_ACK_EVENT = 'composer:proxy:render:ack';

/** Window CustomEvent the page dispatches to probe the extension. */
export const PING_EVENT = 'composer:proxy:ping';

/** Window CustomEvent the content relay dispatches with the ping ack. */
export const PING_ACK_EVENT = 'composer:proxy:ping:ack';

/** `documentElement` dataset key the content relay sets once it is listening (availability marker). */
export const RENDER_READY_DATASET_KEY = 'composerProxy';

/**
 * Failure modes returned in a non-ok ack:
 *   - `badRequest`      : the request failed validation.
 *   - `forbiddenOrigin` : the sender is not a configured Composer origin.
 *   - `noTab`           : the background tab could not be created.
 *   - `timeout`         : the render exceeded its time budget.
 *   - `invalidAck`      : the injected script returned an unexpected shape.
 *   - `transportError`  : an unexpected browser-API error.
 */
export const ProxyError = Schema.Literal(
  'badRequest',
  'forbiddenOrigin',
  'noTab',
  'timeout',
  'invalidAck',
  'transportError',
);
export type ProxyError = Schema.Schema.Type<typeof ProxyError>;

/** Request to render a URL in a background tab. */
export const RenderRequest = Schema.Struct({
  version: Schema.Literal(1),
  id: Schema.String,
  url: Schema.String,
  waitForSelector: Schema.optional(Schema.String),
  waitForMs: Schema.optional(Schema.Number),
  timeoutMs: Schema.optional(Schema.Number),
  active: Schema.optional(Schema.Boolean),
});
export type RenderRequest = Schema.Schema.Type<typeof RenderRequest>;

/** Reply to a {@link RenderRequest}. */
export const RenderAck = Schema.Union(
  Schema.Struct({
    version: Schema.Literal(1),
    id: Schema.String,
    ok: Schema.Literal(true),
    html: Schema.String,
    finalUrl: Schema.String,
  }),
  Schema.Struct({ version: Schema.Literal(1), id: Schema.String, ok: Schema.Literal(false), error: ProxyError }),
);
export type RenderAck = Schema.Schema.Type<typeof RenderAck>;

/** Health-check round-trip: the page asks the extension to identify itself. */
export const PingRequest = Schema.Struct({ version: Schema.Literal(1), id: Schema.String });
export type PingRequest = Schema.Schema.Type<typeof PingRequest>;

/** Reply to a {@link PingRequest}, carrying the extension's manifest identity. */
export const PingAck = Schema.Union(
  Schema.Struct({
    version: Schema.Literal(1),
    id: Schema.String,
    ok: Schema.Literal(true),
    extensionVersion: Schema.String,
    extensionName: Schema.String,
  }),
  Schema.Struct({ version: Schema.Literal(1), id: Schema.String, ok: Schema.Literal(false), error: ProxyError }),
);
export type PingAck = Schema.Schema.Type<typeof PingAck>;
