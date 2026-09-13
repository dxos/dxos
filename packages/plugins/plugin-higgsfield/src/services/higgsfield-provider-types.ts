//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/** Common options for any remote provider call. `credential` is the stored `<keyId>:<keySecret>`. */
export type ProviderCallOptions = {
  credential: string;
  signal?: AbortSignal;
  /** Reports the request's non-terminal status as it is polled. */
  onStatus?: (status: HiggsfieldRequestStatus) => void;
};

/** Input to `enqueue`: the model endpoint path and its flat JSON body. */
export type EnqueueInput = {
  /** Model path relative to the API base, e.g. `higgsfield-ai/soul/v2/standard`. */
  model: string;
  body: Record<string, unknown>;
};

export const HiggsfieldRequestStatus = Schema.Literals([
  'queued',
  'in_progress',
  'completed',
  'failed',
  'nsfw',
  'canceled',
]);
export type HiggsfieldRequestStatus = Schema.Schema.Type<typeof HiggsfieldRequestStatus>;

const MediaOutput = Schema.Struct({ url: Schema.String });

/**
 * The `/requests/{id}/status` payload (also the submit response). Output fields are set only on
 * `completed`, and which is present depends on the model's output type. Unknown keys (the docs
 * mention `zip`/`mov`/… artifacts for some models) are ignored.
 */
export const HiggsfieldRequestResponse = Schema.Struct({
  status: HiggsfieldRequestStatus,
  request_id: Schema.String,
  status_url: Schema.optional(Schema.String),
  cancel_url: Schema.optional(Schema.String),
  error: Schema.optional(Schema.NullOr(Schema.String)),
  images: Schema.optional(Schema.Array(MediaOutput)),
  video: Schema.optional(MediaOutput),
  audio: Schema.optional(MediaOutput),
  audios: Schema.optional(Schema.Array(MediaOutput)),
});
export interface HiggsfieldRequestResponse extends Schema.Schema.Type<typeof HiggsfieldRequestResponse> {}

export const decodeRequestResponse = Schema.decodeUnknownSync(HiggsfieldRequestResponse);

/** A completed request's outputs, discriminated by the media the model produced. */
export type HiggsfieldOutput =
  | { readonly kind: 'image'; readonly urls: readonly string[] }
  | { readonly kind: 'video'; readonly url: string }
  | { readonly kind: 'audio'; readonly urls: readonly string[] };

export class MissingCredentialError extends Error {
  constructor() {
    super('Missing Higgsfield credential.');
    this.name = 'MissingCredentialError';
  }
}

export class ProviderFailureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderFailureError';
  }
}
