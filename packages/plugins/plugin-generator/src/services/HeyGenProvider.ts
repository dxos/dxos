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
  type ProviderCallOptions,
  MissingApiKeyError,
  ProviderFailureError,
  UnsupportedKindError,
} from './GenerationProvider';

const V3_BASE_URL = 'https://api.heygen.com/v3';

const LIMIT = 50;

/**
 * v3 create-video endpoint with a flat body (no `video_inputs` wrapper) and a
 * top-level `fit` field. We send `fit: 'cover'` so HeyGen crops/scales the
 * avatar to fill the output frame rather than letterboxing.
 * https://developers.heygen.com/reference/create-video#body-one-of-0-fit-one-of-0
 */
const GENERATE_URL = `${V3_BASE_URL}/videos`;
// v3 status check: `GET /v3/videos/{video_id}` — REST style instead of v2's
// `video_status.get?video_id=...` query param.
// https://developers.heygen.com/commands#video-status
const STATUS_URL = `${V3_BASE_URL}/videos`;

// v3 list endpoints with server-side ownership/type filters. See:
// https://developers.heygen.com/commands#filter-flags-for-avatar-list
// `ownership=private` (avatars) / `type=private` (voices) restrict the response to
// user-owned entries, so we don't need to do any client-side filtering.

const AVATARS_URL = `${V3_BASE_URL}/avatars?ownership=private&limit=${LIMIT}`;
const VOICES_URL = `${V3_BASE_URL}/voices?type=private&limit=${LIMIT}`;

const DEFAULT_POLL_INTERVAL_MS = 5_000;
const DEFAULT_TIMEOUT_MS = 5 * 60_000;

export type HeyGenProviderOptions = {
  pollIntervalMs?: number;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
};

/**
 * HeyGen video generation adapter.
 *
 * Submits a generation request, then polls the status endpoint until the job
 * reaches a terminal state. HeyGen does not produce audio-only artefacts, so
 * `supports('audio')` returns false — callers should select a different
 * provider for audio generation.
 *
 * The v2 API requires `avatar_id` and `voice_id`; both are read from the
 * `GenerateInput` (which the article populates from the Generation object).
 */
export class HeyGenProvider implements GenerationProvider {
  readonly id = 'heygen';
  readonly #pollIntervalMs: number;
  readonly #timeoutMs: number;
  readonly #fetch: typeof globalThis.fetch;

  constructor(options: HeyGenProviderOptions = {}) {
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
    if (!input.avatarId) {
      throw new ProviderFailureError('Set an Avatar ID on the generation (HeyGen requires one).');
    }
    if (!input.voiceId) {
      throw new ProviderFailureError('Set a Voice ID on the generation (HeyGen requires one).');
    }

    return { jobId: await this.#postGenerate(input, options) };
  }

  async awaitResult(jobId: string, options: ProviderCallOptions): Promise<GenerateResult> {
    if (!options.apiKey) {
      throw new MissingApiKeyError();
    }

    return { url: await this.#poll(jobId, options) };
  }

  async generate(input: GenerateInput, options: ProviderCallOptions): Promise<GenerateResult> {
    const { jobId } = await this.enqueue(input, options);
    return this.awaitResult(jobId, options);
  }

  async listAvatars(options: ProviderCallOptions): Promise<GenerationOption[]> {
    if (!options.apiKey) {
      throw new MissingApiKeyError();
    }

    const response = await this.#fetch(AVATARS_URL, {
      method: 'GET',
      headers: { 'X-Api-Key': options.apiKey },
      signal: options.signal,
    });
    if (!response.ok) {
      throw new ProviderFailureError(`HeyGen listAvatars failed: ${response.status} ${await readErrorBody(response)}`);
    }

    // v3 returns `{ data: [...] }` (flat array, not `{ data: { avatars: [...] } }`)
    // and already restricts via `ownership=private`; trust the server and just map.
    // Some endpoints use `avatar_id` instead of `id` — coalesce defensively.
    const body = (await response.json()) as {
      data?: Array<{ id?: string; avatar_id?: string; name?: string }>;
    };
    return (body.data ?? [])
      .map((entry) => ({ id: entry.id ?? entry.avatar_id, name: entry.name }))
      .filter((entry): entry is GenerationOption => typeof entry.id === 'string' && typeof entry.name === 'string');
  }

  async listVoices(options: ProviderCallOptions): Promise<GenerationOption[]> {
    if (!options.apiKey) {
      throw new MissingApiKeyError();
    }

    const response = await this.#fetch(VOICES_URL, {
      method: 'GET',
      headers: { 'X-Api-Key': options.apiKey },
      signal: options.signal,
    });
    if (!response.ok) {
      throw new ProviderFailureError(`HeyGen listVoices failed: ${response.status} ${await readErrorBody(response)}`);
    }

    // v3 returns `{ data: [...] }` (flat array, same shape as /v3/avatars) and
    // already restricts via `type=private`; trust the server and just map. v3
    // voices still expose `voice_id` (rather than `id`), so coalesce defensively.
    const body = (await response.json()) as {
      data?: Array<{ id?: string; voice_id?: string; name?: string }>;
    };
    return (body.data ?? [])
      .map((entry) => ({ id: entry.id ?? entry.voice_id, name: entry.name }))
      .filter((entry): entry is GenerationOption => typeof entry.id === 'string' && typeof entry.name === 'string');
  }

  /**
   * https://developers.heygen.com/reference/create-video#body-one-of-0-fit-one-of-0
   */
  async #postGenerate(input: GenerateInput, options: ProviderCallOptions): Promise<string> {
    const response = await this.#fetch(GENERATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': options.apiKey,
      },
      body: JSON.stringify({
        type: 'avatar',
        avatar_id: input.avatarId,
        voice_id: input.voiceId,
        script: input.prompt,
        // TODO(burdon): Make configurable via props.
        // fit: 'contain',
        aspect_ratio: '16:9',
        resolution: '1080p',
        remove_background: true,
        background: {
          type: 'color',
          value: '#0A0A0A',
        },
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      throw new ProviderFailureError(`HeyGen generate failed: ${response.status} ${await readErrorBody(response)}`);
    }

    const body = (await response.json()) as { data?: { video_id?: string }; error?: { message?: string } };
    if (body.error?.message) {
      throw new ProviderFailureError(body.error.message);
    }
    invariant(body.data?.video_id, 'HeyGen response missing video_id');
    return body.data.video_id;
  }

  async #poll(videoId: string, options: ProviderCallOptions): Promise<string> {
    const deadline = Date.now() + this.#timeoutMs;
    while (Date.now() < deadline) {
      // v3: `GET /v3/videos/{video_id}`. The `url`/`video_url` field is populated
      // once `status === 'completed'`.
      const response = await this.#fetch(`${STATUS_URL}/${encodeURIComponent(videoId)}`, {
        method: 'GET',
        headers: { 'X-Api-Key': options.apiKey },
        signal: options.signal,
      });
      if (!response.ok) {
        throw new ProviderFailureError(`HeyGen status failed: ${response.status} ${await readErrorBody(response)}`);
      }

      // Field-name coalesce: v2 used `video_url`, v3 may use `url`.
      const body = (await response.json()) as {
        data?: { status?: string; url?: string; video_url?: string; error?: { message?: string } };
      };
      const status = body.data?.status;
      const url = body.data?.url ?? body.data?.video_url;
      if (status === 'completed' && url) {
        return url;
      }
      if (status === 'failed') {
        throw new ProviderFailureError(body.data?.error?.message ?? 'HeyGen job failed.');
      }

      await new Promise<void>((resolve, reject) => {
        // Register a named abort handler so we can remove it when the timer fires
        // — `{ once: true }` only auto-removes after an abort event, so without
        // explicit cleanup listeners would pile up on the (long-lived) signal across
        // every poll iteration.
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

    throw new ProviderFailureError('HeyGen job timed out.');
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
