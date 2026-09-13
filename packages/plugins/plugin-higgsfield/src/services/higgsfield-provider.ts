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
const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;

export type HiggsfieldProviderOptions = {
  baseUrl?: string;
  initialPollIntervalMs?: number;
  maxPollIntervalMs?: number;
  /** Deadline for the whole submit-to-terminal-state wait. */
  timeoutMs?: number;
  /** Deadline for any single HTTP round trip (a stalled socket otherwise pends forever). */
  requestTimeoutMs?: number;
  fetch?: typeof globalThis.fetch;
};

/** A submitted request: the API's `request_id` and the endpoint it told us to poll. */
export type HiggsfieldJob = {
  jobId: string;
  statusUrl: string;
};

/**
 * Higgsfield Cloud API adapter. Every model shares one lifecycle — `POST /<model>` returns a
 * `request_id` plus the `status_url` to poll to a terminal state — so a single provider serves
 * image, video and audio models; the caller picks the model path and shapes the body.
 */
export class HiggsfieldProvider {
  readonly #baseUrl: string;
  readonly #initialPollIntervalMs: number;
  readonly #maxPollIntervalMs: number;
  readonly #timeoutMs: number;
  readonly #requestTimeoutMs: number;
  readonly #fetch: typeof globalThis.fetch;

  constructor(options: HiggsfieldProviderOptions = {}) {
    this.#baseUrl = options.baseUrl ?? HIGGSFIELD_API_URL;
    this.#initialPollIntervalMs = options.initialPollIntervalMs ?? DEFAULT_INITIAL_POLL_MS;
    this.#maxPollIntervalMs = options.maxPollIntervalMs ?? DEFAULT_MAX_POLL_MS;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Submits a generation to a model endpoint. The returned `statusUrl` is the API's own (falling
   * back to `/requests/{id}/status` when the response omits it) and is what `awaitResult` polls.
   */
  async enqueue(input: EnqueueInput, options: ProviderCallOptions): Promise<HiggsfieldJob> {
    if (!options.credential) {
      throw new MissingCredentialError();
    }
    const model = input.model.trim().replace(/^\/+/, '');
    if (!model) {
      throw new ProviderFailureError('Set a model path on the generation (e.g. higgsfield-ai/soul/v2/standard).');
    }

    const response = await this.#request(`${this.#baseUrl}/${model}`, options, options.signal, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input.body),
    });
    if (!response.ok) {
      throw new ProviderFailureError(`Higgsfield submit failed: ${response.status} ${await readErrorBody(response)}`);
    }

    const body = decodeRequestResponse(await response.json());
    return { jobId: body.request_id, statusUrl: body.status_url ?? this.statusUrl(body.request_id) };
  }

  /** The documented status endpoint for a request id — the fallback when a response carries no `status_url`. */
  statusUrl(jobId: string): string {
    return `${this.#baseUrl}/requests/${encodeURIComponent(jobId)}/status`;
  }

  /**
   * Polls a submitted request until it reaches a terminal state and returns its outputs. `job` is
   * the status URL from `enqueue`; a bare request id is accepted for callers that persisted only
   * that and resolves to the documented endpoint.
   */
  async awaitResult(job: string, options: ProviderCallOptions): Promise<HiggsfieldOutput> {
    if (!options.credential) {
      throw new MissingCredentialError();
    }

    const url = isAbsoluteUrl(job) ? job : this.statusUrl(job);
    // One deadline covers every poll and the sleeps between them, so a stalled fetch cannot
    // outlive the operation the way a check made only after each response would allow.
    const deadline = withDeadline(options.signal, this.#timeoutMs);
    let interval = this.#initialPollIntervalMs;
    while (!deadline.aborted) {
      const response = await this.#request(url, options, deadline, { method: 'GET' });
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

      await sleep(interval, deadline);
      interval = Math.min(interval * POLL_BACKOFF, this.#maxPollIntervalMs);
    }

    if (options.signal?.aborted) {
      throw options.signal.reason;
    }
    throw new ProviderFailureError('Higgsfield request timed out.');
  }

  /** One HTTP round trip under its own request deadline, on top of the caller's signal. */
  async #request(
    url: string,
    options: ProviderCallOptions,
    signal: AbortSignal | undefined,
    init: RequestInit,
  ): Promise<Response> {
    const deadline = withDeadline(signal, this.#requestTimeoutMs);
    try {
      return await this.#fetch(url, {
        ...init,
        headers: { ...init.headers, Authorization: authorizationHeader(options.credential) },
        signal: deadline,
      });
    } catch (error) {
      // A deadline aborts with a TimeoutError; report it as the provider timing out rather than
      // surfacing the DOMException, and let the caller's own abort propagate as-is.
      if (deadline.aborted && !options.signal?.aborted) {
        throw new ProviderFailureError('Higgsfield request timed out.');
      }
      throw error;
    }
  }
}

const isAbsoluteUrl = (value: string): boolean => /^https?:\/\//i.test(value);

/** The caller's signal, if any, combined with a fresh timeout. */
const withDeadline = (signal: AbortSignal | undefined, timeoutMs: number): AbortSignal =>
  signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);

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

/** Delay between polls; resolves early (without rejecting) when the signal fires so the loop re-checks it. */
const sleep = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
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
