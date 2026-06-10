//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { type Operation } from '@dxos/compute';

import * as Clip from './Clip';

/**
 * Page actions: operations contributed by plugins that the composer-crx
 * browser extension surfaces on web pages (popup toolbar, context menu).
 * The extension caches serializable descriptors; invocation arrives over the
 * same window CustomEvent bridge as clips.
 */

/**
 * Generic page capture produced by the extension's `snapshot` extractor.
 * Reuses the Clip envelope's source/selection/hints shapes.
 */
export const Snapshot = Schema.Struct({
  source: Clip.Source,
  selection: Schema.optional(Clip.Selection),
  hints: Schema.optional(Clip.Hints),
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

export const Context = Schema.Literal('popup', 'page', 'selection', 'link');
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
  operation: Operation.Definition<any, any>;
};

export const toDescriptor = (action: PageAction): Descriptor => ({
  ...action,
  operation: action.operation.meta.key.toString(),
});

//
// Wire protocol (extension → Composer page, via window CustomEvents).
//

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
 * Loose first-pass decode so newer versions get `unsupportedVersion`.
 */
export const Envelope = Schema.Struct({ version: Schema.Number });

export const InvokeRequest = Schema.Struct({
  version: Schema.Literal(1),
  id: Schema.String,
  actionId: Schema.String,
  page: PageInfo,
  inputs: Schema.Unknown,
  invokedFrom: Schema.Literal('popup', 'contextMenu'),
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
