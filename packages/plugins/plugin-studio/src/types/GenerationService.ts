//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Redacted from 'effect/Redacted';
import * as Schema from 'effect/Schema';

import { BaseError } from '@dxos/errors';

import * as Generation from './Generation';

/**
 * Provider-agnostic, per-`kind` generation contract shared by plugin-studio and provider
 * implementations (e.g. plugin-ideogram). These are NOT ECHO objects — they are plain Effect
 * schemas / interfaces passed across the {@link StudioCapabilities.GenerationService} capability
 * boundary. The kind-specific request config is described by each provider's `requestSchema` and
 * validated by the provider itself; studio only merges the prompt in and renders the form.
 */

/**
 * The request passed to a provider's `generate`. `prompt` (from the artifact's Instructions) and
 * `count` are always present; all other keys come from the artifact's `config` and are described by
 * the provider's `requestSchema`.
 */
export interface GenerationRequest {
  readonly prompt: string;
  readonly count?: number;
  readonly [key: string]: unknown;
}

/** One produced output in a generation result. Mapped to a {@link Variant} by the generate op. */
export const VariantData = Schema.Struct({
  contentType: Schema.optional(Schema.String),
  url: Schema.optional(Schema.String),
  generation: Schema.optional(Generation.Generation),
});
export interface VariantData extends Schema.Schema.Type<typeof VariantData> {}

export const GenerationResult = Schema.Struct({
  variants: Schema.Array(VariantData),
});
export interface GenerationResult extends Schema.Schema.Type<typeof GenerationResult> {}

/**
 * A pluggable generation provider for one `kind`. Plugins contribute implementations via the
 * {@link StudioCapabilities.GenerationService} capability; the `generate` operation resolves them by
 * kind (+ optional provider id). `generate` is credential-agnostic: the operation resolves the API
 * key from the Connector-managed `AccessToken` (via `CredentialsService`, keyed by {@link source})
 * and passes it in. `source` is undefined for keyless providers (e.g. the test mock).
 */
export interface GenerationService {
  /** Media discriminator this provider serves: 'image' | 'video' | …. */
  readonly kind: string;
  /** Provider id, e.g. 'ideogram'. */
  readonly id: string;
  readonly label: string;
  /** Default output mime for produced variants (renderer selection). */
  readonly contentType: string;
  /** `AccessToken.source` of the credential this provider needs (e.g. "ideogram.ai"). */
  readonly source?: string;
  /**
   * `Connection.connectorId` of the Connector that authenticates this provider — lets the UI render
   * the connector's "Connect" button (via the `ConnectorAuth` surface) when no credential is present.
   */
  readonly connectorId?: string;
  /** Effect Schema of the kind-specific request config; drives the default GenerateForm. */
  readonly requestSchema: Schema.Schema.AnyNoContext;
  /** Default config values seeded into a new artifact / the form. */
  readonly defaultRequest?: Record<string, unknown>;
  generate(request: GenerationRequest, options: { apiKey?: Redacted.Redacted<string> }): Promise<GenerationResult>;
}

/** No {@link GenerationService} is registered for the requested kind (or provider id). */
export class NoGenerationServiceError extends BaseError.extend(
  'NoGenerationServiceError',
  'No generation service registered',
) {
  constructor(context?: { kind?: string; provider?: string }) {
    const detail = context?.provider ?? context?.kind;
    super(detail ? { message: `No generation service: ${detail}`, context } : {});
  }
}

/** A provider needs a credential (`source`) but none is connected. */
export class MissingCredentialError extends BaseError.extend(
  'MissingCredentialError',
  'Missing credential for generation service',
) {
  constructor(source: string) {
    super({ message: `Missing credential for generation service: ${source}`, context: { source } });
  }
}

/** Generation failed. */
export class GenerationError extends BaseError.extend('GenerationError', 'Generation failed') {
  constructor(message: string) {
    super({ message });
  }
}
