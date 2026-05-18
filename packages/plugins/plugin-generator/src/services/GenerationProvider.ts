//
// Copyright 2026 DXOS.org
//

import { type Generation } from '#types';

/** Input passed to a GenerationProvider. */
export type GenerateInput = {
  type: Generation.Kind;
  prompt: string;
  /** Provider-specific avatar / character identifier. Optional — providers that don't use one ignore it. */
  avatarId?: string;
  /** Provider-specific voice identifier. Optional — providers that don't use one ignore it. */
  voiceId?: string;
};

/** Successful generation result. */
export type GenerateResult = {
  url: string;
};

/**
 * Identified option returned by `listAvatars` / `listVoices`.
 * `id` is the value to assign to `Generation.avatarId` / `Generation.voiceId`.
 * `name` is a human-readable label suitable for a picker.
 */
export type GenerationOption = {
  id: string;
  name: string;
};

/** Common options for any remote provider call. */
export type ProviderCallOptions = {
  apiKey: string;
  signal?: AbortSignal;
};

/**
 * Provider-agnostic interface for media generation back-ends.
 * Implementations adapt a remote service (HeyGen, Veo, Sora, ElevenLabs, ...)
 * to a single uniform shape so the plugin's article surface and settings do
 * not depend on any particular vendor.
 *
 * Generation is intentionally split into `enqueue` (submit, returns a job id)
 * and `awaitResult` (poll an existing job to completion). Callers persist
 * the `jobId` between the two so a long-running job survives navigation /
 * remount — the next mount can resume polling instead of starting over.
 *
 * `generate` is the convenience composition of the two for fire-and-forget callers.
 *
 * Providers that don't model "avatars" or "voices" return an empty array.
 */
export interface GenerationProvider {
  readonly id: string;
  /** Returns true if the provider can produce media of the given kind. */
  supports(kind: Generation.Kind): boolean;
  /** Submit a generation job. Returns the provider-specific id the caller should persist. */
  enqueue(input: GenerateInput, options: ProviderCallOptions): Promise<{ jobId: string }>;
  /** Poll an existing job until it reaches a terminal state and returns its artefact. */
  awaitResult(jobId: string, options: ProviderCallOptions): Promise<GenerateResult>;
  /** Convenience: `enqueue` immediately followed by `awaitResult`. */
  generate(input: GenerateInput, options: ProviderCallOptions): Promise<GenerateResult>;
  /** Lists avatars available to the caller. Empty when the provider has no concept of avatars. */
  listAvatars(options: ProviderCallOptions): Promise<GenerationOption[]>;
  /** Lists voices available to the caller. Empty when the provider has no concept of voices. */
  listVoices(options: ProviderCallOptions): Promise<GenerationOption[]>;
}

export class MissingApiKeyError extends Error {
  constructor() {
    super('Missing API key.');
    this.name = 'MissingApiKeyError';
  }
}

export class UnsupportedKindError extends Error {
  constructor(kind: Generation.Kind, provider: string) {
    super(`Provider ${provider} does not support media kind ${kind}.`);
    this.name = 'UnsupportedKindError';
  }
}

export class ProviderFailureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderFailureError';
  }
}
