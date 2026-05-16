//
// Copyright 2026 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { type Generation } from '#types';

import {
  type GenerateInput,
  type GenerateResult,
  type GenerationOption,
  type GenerationProvider,
  MissingApiKeyError,
  type ProviderCallOptions,
  ProviderFailureError,
  UnsupportedKindError,
} from './GenerationProvider';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Veo 3.1 preview is the current generally-available video model on the
// Generative Language API. The `:predictLongRunning` action returns an
// Operation that we poll until `done === true`.
// https://ai.google.dev/api/generate-content#video
const MODEL = 'veo-3.1-generate-preview';
const GENERATE_URL = `${API_BASE}/models/${MODEL}:predictLongRunning`;

const DEFAULT_POLL_INTERVAL_MS = 5_000;
const DEFAULT_TIMEOUT_MS = 5 * 60_000;

export type GeminiProviderOptions = {
  pollIntervalMs?: number;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
};

/**
 * Google Gemini (Veo 3.1) video generation adapter.
 *
 * The Generative Language API exposes Veo via a Long-Running Operation:
 * `POST {model}:predictLongRunning` enqueues, and `GET {operationName}` polls.
 * The generated video URI returned by the operation requires the api key
 * to download (it isn't a public CDN url), so `awaitResult` fetches the bytes
 * with the api key and hands back a `blob:` URL the player can stream.
 *
 * TODO(burdon): Persist the downloaded bytes to WNFS so the URL survives
 * reloads — `blob:` URLs only live for the lifetime of the page.
 *
 * Veo has no concept of avatars / voices, so the picker methods return empty
 * arrays.
 */
export class GeminiProvider implements GenerationProvider {
  readonly id = 'gemini';
  readonly #pollIntervalMs: number;
  readonly #timeoutMs: number;
  readonly #fetch: typeof globalThis.fetch;

  constructor(options: GeminiProviderOptions = {}) {
    this.#pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  supports(kind: Generation.Kind): boolean {
    return kind === 'video';
  }

  async enqueue(input: GenerateInput, options: ProviderCallOptions): Promise<{ jobId: string }> {
    if (!options.apiKey) {
      throw new MissingApiKeyError();
    }
    if (!this.supports(input.type)) {
      throw new UnsupportedKindError(input.type, this.id);
    }

    return { jobId: await this.#postGenerate(input, options) };
  }

  async awaitResult(jobId: string, options: ProviderCallOptions): Promise<GenerateResult> {
    if (!options.apiKey) {
      throw new MissingApiKeyError();
    }

    const remoteUri = await this.#poll(jobId, options);
    const url = await this.#downloadAsBlobUrl(remoteUri, options);
    return { url };
  }

  async generate(input: GenerateInput, options: ProviderCallOptions): Promise<GenerateResult> {
    const { jobId } = await this.enqueue(input, options);
    return this.awaitResult(jobId, options);
  }

  async listAvatars(_options: ProviderCallOptions): Promise<GenerationOption[]> {
    return [];
  }

  async listVoices(_options: ProviderCallOptions): Promise<GenerationOption[]> {
    return [];
  }

  async #postGenerate(input: GenerateInput, options: ProviderCallOptions): Promise<string> {
    const response = await this.#fetch(GENERATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': options.apiKey,
      },
      body: JSON.stringify({
        instances: [{ prompt: input.prompt }],
        // TODO(burdon): Make configurable via props.
        parameters: {
          aspectRatio: '16:9',
          personGeneration: 'allow_all',
        },
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      throw new ProviderFailureError(`Gemini generate failed: ${response.status} ${await readErrorBody(response)}`);
    }

    const body = (await response.json()) as { name?: string; error?: { message?: string } };
    if (body.error?.message) {
      throw new ProviderFailureError(body.error.message);
    }
    invariant(body.name, 'Gemini response missing operation name');
    return body.name;
  }

  async #poll(operationName: string, options: ProviderCallOptions): Promise<string> {
    const deadline = Date.now() + this.#timeoutMs;
    const url = `${API_BASE}/${operationName}`;
    while (Date.now() < deadline) {
      const response = await this.#fetch(url, {
        method: 'GET',
        headers: { 'x-goog-api-key': options.apiKey },
        signal: options.signal,
      });
      if (!response.ok) {
        throw new ProviderFailureError(`Gemini status failed: ${response.status} ${await readErrorBody(response)}`);
      }

      // Veo's Operation payload nests the artefact under
      // `response.generateVideoResponse.generatedSamples[0].video.uri`.
      const body = (await response.json()) as {
        done?: boolean;
        error?: { message?: string };
        response?: {
          generateVideoResponse?: {
            generatedSamples?: Array<{ video?: { uri?: string } }>;
          };
        };
      };
      if (body.error?.message) {
        throw new ProviderFailureError(body.error.message);
      }
      if (body.done) {
        const uri = body.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
        if (!uri) {
          throw new ProviderFailureError('Gemini operation completed without a video uri.');
        }
        return uri;
      }

      await new Promise<void>((resolve, reject) => {
        // Register a named abort handler so we can remove it when the timer
        // fires — `{ once: true }` only auto-removes after an abort, so without
        // explicit cleanup listeners would pile up on the (long-lived) signal
        // across every poll iteration.
        const onAbort = () => {
          clearTimeout(timer);
          reject(options.signal?.reason);
        };
        const timer = setTimeout(() => {
          options.signal?.removeEventListener('abort', onAbort);
          resolve();
        }, this.#pollIntervalMs);
        options.signal?.addEventListener('abort', onAbort, { once: true });
      });
    }

    throw new ProviderFailureError('Gemini job timed out.');
  }

  /**
   * The Veo artefact URI requires the api key to download. We can't hand the
   * raw URL to a `<video>` element because the element won't attach the
   * `x-goog-api-key` header, so we fetch the bytes here and wrap them in a
   * `blob:` URL the player can consume directly.
   */
  async #downloadAsBlobUrl(remoteUri: string, options: ProviderCallOptions): Promise<string> {
    const response = await this.#fetch(remoteUri, {
      method: 'GET',
      headers: { 'x-goog-api-key': options.apiKey },
      signal: options.signal,
    });
    if (!response.ok) {
      throw new ProviderFailureError(`Gemini download failed: ${response.status} ${await readErrorBody(response)}`);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
}

/** Best-effort decode of an error response body so the user sees the actual reason instead of a bare status. */
const readErrorBody = async (response: Response): Promise<string> => {
  try {
    const text = await response.text();
    if (!text) {
      return response.statusText;
    }

    try {
      const json = JSON.parse(text);
      const message = json?.error?.message ?? json?.message ?? json?.error;
      return typeof message === 'string' ? message : text;
    } catch {
      return text;
    }
  } catch {
    return response.statusText;
  }
};
