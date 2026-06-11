//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { type Operation } from '@dxos/compute';

/**
 * Page actions: operations contributed by plugins that the composer-crx
 * browser extension surfaces on web pages (popup toolbar, context menu).
 * The extension caches serializable descriptors; invocation arrives over a
 * window CustomEvent bridge.
 *
 * The extension keeps a hand-validated mirror of these types at
 * `packages/apps/composer-crx/src/page-actions/types.ts` which MUST be
 * updated in lockstep with any change here.
 */

export const Rect = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
});

export const Source = Schema.Struct({
  url: Schema.String,
  title: Schema.String,
  favicon: Schema.optional(Schema.String),
  clippedAt: Schema.String,
});
export type Source = Schema.Schema.Type<typeof Source>;

export const Selection = Schema.Struct({
  text: Schema.String,
  html: Schema.optional(Schema.String),
  htmlTruncated: Schema.optional(Schema.Boolean),
  rect: Schema.optional(Rect),
});
export type Selection = Schema.Schema.Type<typeof Selection>;

export const Hints = Schema.Struct({
  ogTitle: Schema.optional(Schema.String),
  ogDescription: Schema.optional(Schema.String),
  ogImage: Schema.optional(Schema.String),
  jsonLd: Schema.optional(Schema.Array(Schema.Unknown)),
  h1: Schema.optional(Schema.String),
  firstImage: Schema.optional(Schema.String),
});
export type Hints = Schema.Schema.Type<typeof Hints>;

/**
 * Generic page capture produced by the extension's `snapshot` extractor.
 * The extension keeps a hand-validated mirror of these types at
 * `packages/apps/composer-crx/src/page-actions/types.ts` which MUST be
 * updated in lockstep with any change here.
 */
export const Snapshot = Schema.Struct({
  source: Source,
  selection: Schema.optional(Selection),
  hints: Schema.optional(Hints),
  /**
   * Downscaled thumbnail of the page's primary image as a data URL, captured
   * by the extension's background worker (which can fetch images whose hosts
   * block cross-origin embedding).
   */
  imageData: Schema.optional(Schema.String),
  html: Schema.optional(Schema.String),
  htmlTruncated: Schema.optional(Schema.Boolean),
});
export type Snapshot = Schema.Schema.Type<typeof Snapshot>;

/**
 * Lazy DOM condition evaluated by the extension at popup-open / invoke time.
 */
export const Predicate = Schema.Struct({ exists: Schema.String });
export type Predicate = Schema.Schema.Type<typeof Predicate>;

/**
 * Named built-in extractor reference (extension-bundled), with optional params.
 */
export const ExtractorRef = Schema.Struct({
  name: Schema.String,
  params: Schema.optional(Schema.Unknown),
});
export type ExtractorRef = Schema.Schema.Type<typeof ExtractorRef>;

export const Context = Schema.Literal('popup', 'page', 'selection', 'link', 'picker');
export type Context = Schema.Schema.Type<typeof Context>;

/**
 * Serializable descriptor synced to the extension's registry cache.
 * `operation` carries the operation key for display/diagnostics only —
 * invocation is correlated by `id`.
 */
export const Descriptor = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  icon: Schema.String,
  urlPatterns: Schema.Array(Schema.String),
  predicate: Schema.optional(Predicate),
  extractor: ExtractorRef,
  contexts: Schema.Array(Context),
  operation: Schema.String,
});
export type Descriptor = Schema.Schema.Type<typeof Descriptor>;

/**
 * A live page-action contribution. The target operation must accept
 * `{ snapshot: Snapshot, target: Database }` and return `{ id: string }`.
 */
export type PageAction = Omit<Descriptor, 'operation'> & {
  operation: Operation.Definition.Any;
};

export const toDescriptor = (action: PageAction): Descriptor => ({
  ...action,
  operation: action.operation.meta.key.toString(),
});

//
// Wire protocol (extension → Composer page, via window CustomEvents).
//

/**
 * Window CustomEvent dispatched by the Composer page once its page-actions
 * listeners are attached. The content-script relay listens for this and
 * forwards a ready message to the background so it can refresh its registry.
 */
export const READY_EVENT = 'composer:page-actions:ready';

export const LIST_EVENT = 'composer:page-actions:list';
export const LIST_ACK_EVENT = 'composer:page-actions:list:ack';
export const INVOKE_EVENT = 'composer:page-action:invoke';
export const INVOKE_ACK_EVENT = 'composer:page-action:invoke:ack';

export const ListRequest = Schema.Struct({
  version: Schema.Literal(1),
  id: Schema.String,
});
export type ListRequest = Schema.Schema.Type<typeof ListRequest>;

export type ListAck =
  | { version: 1; id: string; ok: true; actions: Descriptor[] }
  | { version: 1; id: string; ok: false; error: string };

export const PageInfo = Schema.Struct({
  url: Schema.String,
  title: Schema.String,
  favicon: Schema.optional(Schema.String),
});
export type PageInfo = Schema.Schema.Type<typeof PageInfo>;

/**
 * Loose first-pass decode so newer versions get `unsupportedVersion` and
 * malformed payloads can still echo the request id in their ack.
 */
export const Envelope = Schema.Struct({ version: Schema.Number, id: Schema.optional(Schema.String) });
export type Envelope = Schema.Schema.Type<typeof Envelope>;

export const InvokeRequest = Schema.Struct({
  version: Schema.Literal(1),
  id: Schema.String,
  actionId: Schema.String,
  page: PageInfo,
  inputs: Schema.Unknown,
  invokedFrom: Schema.Literal('popup', 'contextMenu', 'picker'),
});
export type InvokeRequest = Schema.Schema.Type<typeof InvokeRequest>;

/**
 * Stable error codes:
 *   - `invalidPayload`     : schema decoding failed
 *   - `unsupportedVersion` : envelope version not supported
 *   - `unknownAction`      : no registered action with that id
 *   - `noSpace`            : no active space to write into
 *   - `operationFailed`    : the target operation returned an error
 */
export type InvokeAck =
  | { version: 1; id: string; ok: true; objectId?: string }
  | { version: 1; id: string; ok: false; error: string };
