//
// Copyright 2026 DXOS.org
//

/** Media kind a provider can produce. */
export type MediaKind = 'video' | 'audio';

/** Input passed to a GenerationProvider. */
export type GenerateInput = {
  type: MediaKind;
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
 * Identified option returned by `listAvatars` / `listVoices`. `id` is the value to assign to the
 * request's `avatarId` / `voiceId`; `name` is a human-readable label suitable for a picker.
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
 * Provider-agnostic interface for media generation back-ends (HeyGen, Veo, Sora, …). Generation is
 * split into `enqueue` (submit, returns a job id) and `awaitResult` (poll to completion) so a
 * long-running job survives navigation/remount — the caller persists the job id between the two.
 * `generate` is the convenience composition. Providers that don't model avatars/voices return `[]`.
 */
export interface GenerationProvider {
  readonly id: string;
  /** Returns true if the provider can produce media of the given kind. */
  supports(kind: MediaKind): boolean;
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
  constructor(kind: MediaKind, provider: string) {
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
