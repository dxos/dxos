//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Redacted from 'effect/Redacted';
import * as Schema from 'effect/Schema';
import { type ComponentType } from 'react';

import { BaseError } from '@dxos/errors';

import * as Generation from './Generation';

/** Props for a provider's request-config form (see {@link GenerationService.Form}). */
export type GenerationFormProps = {
  /** The provider's `requestSchema`. */
  schema: Schema.Schema.AnyNoContext;
  /** Current config values. */
  value: Record<string, unknown>;
  /** Persist the updated config (omitted when `readonly`). */
  onChange?: (value: Record<string, unknown>) => void;
  /** Render the values without editing. */
  readonly?: boolean;
};

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

/** Indeterminate/step progress reported by a provider during generation. */
export type GenerationProgress = {
  /** Human-readable status (e.g. "Rendering", "Processing"). */
  readonly status?: string;
  /** Completed units, when the provider reports a quantized progress. */
  readonly current?: number;
  /** Expected total units, when known. */
  readonly total?: number;
};

/** Options passed to every provider call by the generate operation. */
export interface GenerateOptions {
  /** API key resolved from the Connector-managed credential (absent for keyless providers). */
  readonly apiKey?: Redacted.Redacted<string>;
  /** Aborts an in-flight request (e.g. on cancel). */
  readonly signal?: AbortSignal;
  /** Called as the provider makes progress; drives the studio progress monitor. */
  readonly onProgress?: (progress: GenerationProgress) => void;
}

/**
 * A pluggable generation provider for one `kind`. Plugins contribute implementations via the
 * {@link StudioCapabilities.GenerationService} capability; the `generate` operation resolves them by
 * kind (+ optional provider id) and is credential-agnostic — it resolves the API key from the
 * Connector-managed `AccessToken` (via `CredentialsService`, keyed by {@link source}) and passes it
 * in. `source` is undefined for keyless providers (e.g. the test mock).
 *
 * A provider is either **synchronous** (implements {@link generate}, e.g. a single request/response
 * like Ideogram) or **asynchronous/job-based** (implements {@link enqueue} + {@link awaitResult},
 * e.g. HeyGen: submit → poll). The generate operation persists the job id on the Artifact between
 * enqueue and completion so a long poll resumes across navigation/remount.
 */
export interface GenerationService {
  /** Media discriminator this provider serves: 'image' | 'video' | 'audio' | …. */
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
  /** Custom request-config form for this provider; the studio article falls back to a schema-driven
   * default when absent. */
  readonly Form?: ComponentType<GenerationFormProps>;
  /** One-shot generation (synchronous providers). Mutually exclusive with enqueue/awaitResult. */
  generate?(request: GenerationRequest, options: GenerateOptions): Promise<GenerationResult>;
  /** Submit a job; returns the provider job id to persist (asynchronous providers). */
  enqueue?(request: GenerationRequest, options: GenerateOptions): Promise<{ jobId: string }>;
  /** Poll a submitted job to completion; may report progress (asynchronous providers). */
  awaitResult?(jobId: string, options: GenerateOptions): Promise<GenerationResult>;
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
