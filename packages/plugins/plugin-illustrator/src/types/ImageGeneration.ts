//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Redacted from 'effect/Redacted';
import * as Schema from 'effect/Schema';

import { BaseError } from '@dxos/errors';

/**
 * Transient image-generation types shared by plugin-illustrator and provider implementations
 * (e.g. plugin-ideogram). These are NOT ECHO objects — they are plain Effect schemas / interfaces
 * passed across the {@link ImageGenerationService} capability boundary. The shape parallels
 * `plugin-trip`'s `Routing`.
 */

/** Provider-agnostic generation request. */
export const ImageGenerationRequest = Schema.Struct({
  prompt: Schema.String,
  negativePrompt: Schema.optional(Schema.String),
  /** Aspect ratio hint, e.g. "1x1", "16x9". */
  aspectRatio: Schema.optional(Schema.String),
  /** Provider model id. */
  model: Schema.optional(Schema.String),
  styleType: Schema.optional(Schema.String),
  seed: Schema.optional(Schema.Number),
  /** Number of images to generate (default 1). */
  count: Schema.optional(Schema.Number),
});
export interface ImageGenerationRequest extends Schema.Schema.Type<typeof ImageGenerationRequest> {}

/** One image entry in a generation result. */
export const GeneratedImageData = Schema.Struct({
  url: Schema.String,
  prompt: Schema.optional(Schema.String),
  model: Schema.optional(Schema.String),
  resolution: Schema.optional(Schema.String),
  seed: Schema.optional(Schema.Number),
  styleType: Schema.optional(Schema.String),
  isImageSafe: Schema.optional(Schema.Boolean),
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
});
export interface GeneratedImageData extends Schema.Schema.Type<typeof GeneratedImageData> {}

export const ImageGenerationResult = Schema.Struct({
  images: Schema.Array(GeneratedImageData),
});
export interface ImageGenerationResult extends Schema.Schema.Type<typeof ImageGenerationResult> {}

/**
 * A pluggable image-generation provider. Plugins contribute implementations via the
 * {@link IllustratorCapabilities.ImageGenerationService} capability; the `generateImage` operation
 * resolves them. `generate` is credential-agnostic: the operation resolves the API key from the
 * Connector-managed `AccessToken` (via `CredentialsService`, keyed by {@link source}) and passes it
 * in. `source` is undefined for keyless providers (e.g. the test mock).
 */
export interface ImageGenerationService {
  readonly id: string;
  readonly label: string;
  /** `AccessToken.source` of the credential this provider needs (e.g. "ideogram.ai"). */
  readonly source?: string;
  /**
   * `Connection.connectorId` of the Connector that authenticates this provider — lets the UI render
   * the connector's "Connect" button (via the `ConnectorAuth` surface) when no credential is present.
   */
  readonly connectorId?: string;
  generate(
    request: ImageGenerationRequest,
    options: { apiKey?: Redacted.Redacted<string> },
  ): Promise<ImageGenerationResult>;
}

/** No {@link ImageGenerationService} is registered (or none matches the requested id). */
export class NoImageGenerationServiceError extends BaseError.extend(
  'NoImageGenerationServiceError',
  'No image-generation service registered',
) {
  constructor(provider?: string) {
    super(provider ? { message: `No image-generation service: ${provider}`, context: { provider } } : {});
  }
}

/** A provider needs a credential (`source`) but none is connected. */
export class MissingCredentialError extends BaseError.extend(
  'MissingCredentialError',
  'Missing credential for image-generation service',
) {
  constructor(source: string) {
    super({ message: `Missing credential for image-generation service: ${source}`, context: { source } });
  }
}

/** Image generation failed. */
export class GenerationError extends BaseError.extend('GenerationError', 'Image generation failed') {
  constructor(message: string) {
    super({ message });
  }
}
