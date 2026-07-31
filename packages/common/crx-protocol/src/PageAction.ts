//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

//
// Serializable page-action types. Operations are referenced by string id;
// the live operation type lives in plugin-crx (this package stays effect-only).
//

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

/** Generic page capture produced by the extension's `snapshot` extractor. */
export const Snapshot = Schema.Struct({
  source: Source,
  selection: Schema.optional(Selection),
  hints: Schema.optional(Hints),
  imageData: Schema.optional(Schema.String),
  html: Schema.optional(Schema.String),
  htmlTruncated: Schema.optional(Schema.Boolean),
});
export type Snapshot = Schema.Schema.Type<typeof Snapshot>;

/** Lazy DOM condition evaluated by the extension at popup-open / invoke time. */
export const Predicate = Schema.Struct({ exists: Schema.String });
export type Predicate = Schema.Schema.Type<typeof Predicate>;

/** Named built-in extractor reference (extension-bundled), with optional params. */
export const ExtractorRef = Schema.Struct({
  name: Schema.String,
  params: Schema.optional(Schema.Unknown),
});
export type ExtractorRef = Schema.Schema.Type<typeof ExtractorRef>;

export const Context = Schema.Literal('popup', 'page', 'selection', 'link', 'picker');
export type Context = Schema.Schema.Type<typeof Context>;

/** Serializable descriptor synced to the extension's registry cache. */
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

export const PageInfo = Schema.Struct({
  url: Schema.String,
  title: Schema.String,
  favicon: Schema.optional(Schema.String),
});
export type PageInfo = Schema.Schema.Type<typeof PageInfo>;

//
// Wire protocol (extension <-> Composer page, via window CustomEvents today).
//

export const READY_EVENT = 'composer:page-actions:ready';
export const LIST_EVENT = 'composer:page-actions:list';
export const LIST_ACK_EVENT = 'composer:page-actions:list:ack';
export const INVOKE_EVENT = 'composer:page-action:invoke';
export const INVOKE_ACK_EVENT = 'composer:page-action:invoke:ack';

/** Loose first-pass decode: newer versions get `unsupportedVersion`; malformed payloads can still echo `id`. */
export const Envelope = Schema.Struct({ version: Schema.Number, id: Schema.optional(Schema.String) });
export type Envelope = Schema.Schema.Type<typeof Envelope>;

export const ListRequest = Schema.Struct({
  version: Schema.Literal(1),
  id: Schema.String,
});
export type ListRequest = Schema.Schema.Type<typeof ListRequest>;

export const ListAck = Schema.Union(
  Schema.Struct({
    version: Schema.Literal(1),
    id: Schema.String,
    ok: Schema.Literal(true),
    actions: Schema.Array(Descriptor),
  }),
  Schema.Struct({ version: Schema.Literal(1), id: Schema.String, ok: Schema.Literal(false), error: Schema.String }),
);
export type ListAck = Schema.Schema.Type<typeof ListAck>;

export const InvokeRequest = Schema.Struct({
  version: Schema.Literal(1),
  id: Schema.String,
  actionId: Schema.String,
  page: PageInfo,
  inputs: Schema.Unknown,
  invokedFrom: Schema.Literal('popup', 'contextMenu', 'picker'),
});
export type InvokeRequest = Schema.Schema.Type<typeof InvokeRequest>;

export const InvokeAck = Schema.Union(
  Schema.Struct({
    version: Schema.Literal(1),
    id: Schema.String,
    ok: Schema.Literal(true),
    objectId: Schema.optional(Schema.String),
  }),
  Schema.Struct({ version: Schema.Literal(1), id: Schema.String, ok: Schema.Literal(false), error: Schema.String }),
);
export type InvokeAck = Schema.Schema.Type<typeof InvokeAck>;
