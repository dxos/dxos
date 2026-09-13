//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

import { HIGGSFIELD_API_URL } from '../constants.ts';
import { authorizationHeader } from './higgsfield-credential.ts';
import {
  type EnqueueInput,
  type HiggsfieldOutput,
  type HiggsfieldRequestResponse,
  MissingCredentialError,
  type ProviderCallOptions,
  ProviderFailureError,
  decodeRequestResponse,
} from './higgsfield-provider-types.ts';

// The docs' recommended polling schedule: start at 2s, grow ×1.5 to a 10s ceiling.
const DEFAULT_INITIAL_POLL_MS = 2_000;
const DEFAULT_MAX_POLL_MS = 10_000;
const POLL_BACKOFF = 1.5;
const DEFAULT_TIMEOUT_MS = 5 * 60_000;

export type HiggsfieldProviderOptions = {
  baseUrl?: string;
  initialPollIntervalMs?: number;
  maxPollIntervalMs?: number;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
};

/**
 * Higgsfield Cloud API adapter. Every model shares one lifecycle — `POST /<model>` returns a
 * `request_id`, `GET /requests/{id}/status` is polled to a terminal state — so a single provider
 * serves image, video and audio models; the caller picks the model path and shapes the body.
 */
export class HiggsfieldProvider {
  readonly #baseUrl: string;
  readonly #initialPollIntervalMs: number;
  readonly #maxPollIntervalMs: number;
  readonly #timeoutMs: number;
  readonly #fetch: typeof globalThis.fetch;

  constructor(options: HiggsfieldProviderOptions = {}) {
    this.#baseUrl = options.baseUrl ?? HIGGSFIELD_API_URL;
    this.#initialPollIntervalMs = options.initialPollIntervalMs ?? DEFAULT_INITIAL_POLL_MS;
    this.#maxPollIntervalMs = options.maxPollIntervalMs ?? DEFAULT_MAX_POLL_MS;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /** Submits a generation to a model endpoint; the returned job id is the API's `request_id`. */
  async enqueue(input: EnqueueInput, options: ProviderCallOptions): Promise<{ jobId: string }> {
    if (!options.credential) {
      throw new MissingCredentialError();
    }
    const model = input.model.trim().replace(/^\/+/, '');
    if (!model) {
      throw new ProviderFailureError('Set a model path on the generation (e.g. higgsfield-ai/soul/v2/standard).');
    }

    const response = await this.#request(`${this.#baseUrl}/${model}`, options, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input.body),
    });
    if (!response.ok) {
      throw new ProviderFailureError(`Higgsfield submit failed: ${response.status} ${await readErrorBody(response)}`);
    }

    const body = decodeRequestResponse(await response.json());
    return { jobId: body.request_id };
  }

  /** Polls a submitted request until it reaches a terminal state and returns its outputs. */
  async awaitResult(jobId: string, options: ProviderCallOptions): Promise<HiggsfieldOutput> {
    if (!options.credential) {
      throw new MissingCredentialError();
    }

    const url = `${this.#baseUrl}/requests/${encodeURIComponent(jobId)}/status`;
    const deadline = Date.now() + this.#timeoutMs;
    let interval = this.#initialPollIntervalMs;
    while (Date.now() < deadline) {
      const response = await this.#request(url, options, { method: 'GET' });
      // A 5xx is transient per the docs' retry table; anything else is a hard stop.
      if (response.status >= 500) {
        log.warn('higgsfield status transient failure', { status: response.status });
      } else {
        if (!response.ok) {
          throw new ProviderFailureError(
            `Higgsfield status failed: ${response.status} ${await readErrorBody(response)}`,
          );
        }
        const body = decodeRequestResponse(await response.json());
        options.onStatus?.(body.status);
        switch (body.status) {
          case 'completed':
            return toOutput(body);
          case 'failed':
            throw new ProviderFailureError(
              body.error ? `Higgsfield request failed: ${body.error}` : 'Higgsfield request failed.',
            );
          case 'nsfw':
            throw new ProviderFailureError('Higgsfield rejected the request: content moderation (nsfw).');
          case 'canceled':
            throw new ProviderFailureError('Higgsfield request was canceled.');
        }
      }

      await sleep(interval, options.signal);
      interval = Math.min(interval * POLL_BACKOFF, this.#maxPollIntervalMs);
    }

    throw new ProviderFailureError('Higgsfield request timed out.');
  }

  async #request(url: string, options: ProviderCallOptions, init: RequestInit): Promise<Response> {
    return this.#fetch(url, {
      ...init,
      headers: { ...init.headers, Authorization: authorizationHeader(options.credential) },
      signal: options.signal,
    });
  }
}

/** Maps a completed status payload to its output; a completed request with no media is a failure. */
const toOutput = (body: HiggsfieldRequestResponse): HiggsfieldOutput => {
  if (body.video) {
    return { kind: 'video', url: body.video.url };
  }
  if (body.images && body.images.length > 0) {
    return { kind: 'image', urls: body.images.map((image) => image.url) };
  }
  const audios = body.audios ?? (body.audio ? [body.audio] : []);
  if (audios.length > 0) {
    return { kind: 'audio', urls: audios.map((audio) => audio.url) };
  }
  throw new ProviderFailureError('Higgsfield request completed without any output.');
};

/** Abortable delay between polls. */
const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });

/** Best-effort decode of an error response body so the user sees the actual reason. */
const readErrorBody = async (response: Response): Promise<string> => {
  try {
    const text = await response.text();
    if (!text) {
      return response.statusText;
    }
    try {
      const json = JSON.parse(text);
      const detail = json?.detail ?? json?.error?.message ?? json?.message;
      return typeof detail === 'string' ? detail : text;
    } catch {
      return text;
    }
  } catch {
    return response.statusText;
  }
};
