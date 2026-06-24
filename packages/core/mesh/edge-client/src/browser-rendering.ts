//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Schema from 'effect/Schema';

import { type EdgeHttpClient } from './edge-http-client';

/** Request body for EDGE `/ai/browser-rendering/markdown` (ai-service Browser Run markdown quick action). */
export const MarkdownRequest = Schema.Struct({
  url: Schema.optional(Schema.String),
  html: Schema.optional(Schema.String),
  gotoOptions: Schema.optional(
    Schema.Struct({
      waitUntil: Schema.optional(Schema.Literal('load', 'domcontentloaded', 'networkidle0', 'networkidle2')),
      timeout: Schema.optional(Schema.Number),
    }),
  ),
  rejectRequestPattern: Schema.optional(Schema.Array(Schema.String)),
  userAgent: Schema.optional(Schema.String),
  waitForSelector: Schema.optional(Schema.String),
});

export type MarkdownRequest = Schema.Schema.Type<typeof MarkdownRequest>;

/** JSON body returned by Cloudflare Browser Run markdown quick action. */
export const MarkdownResponse = Schema.Struct({
  success: Schema.Boolean,
  result: Schema.String,
});

export type MarkdownResponse = Schema.Schema.Type<typeof MarkdownResponse>;

/** Authenticated EDGE HTTP client for operation handlers (e.g. browser markdown fetch). */
export class EdgeHttpClientService extends Context.Tag('@dxos/edge-client/EdgeHttpClientService')<
  EdgeHttpClientService,
  EdgeHttpClient
>() {}
