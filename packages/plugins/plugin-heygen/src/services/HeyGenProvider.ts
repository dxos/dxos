//
// Copyright 2026 DXOS.org
//

import { invariant } from '@dxos/invariant';

import {
  type GenerateInput,
  type GenerateResult,
  type GenerationOption,
  type GenerationProvider,
  type MediaKind,
  MissingApiKeyError,
  type ProviderCallOptions,
  ProviderFailureError,
  UnsupportedKindError,
} from './GenerationProvider';

const V3_BASE_URL = 'https://api.heygen.com/v3';

const LIMIT = 50;

// v3 create-video endpoint with a flat body and a top-level `fit` field.
// https://developers.heygen.com/reference/create-video
const GENERATE_URL = `${V3_BASE_URL}/videos`;
// v3 status check: `GET /v3/videos/{video_id}`.
const STATUS_URL = `${V3_BASE_URL}/videos`;

// v3 list endpoints with server-side ownership/type filters restrict to user-owned entries.
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
 * HeyGen video generation adapter. Submits a generation request, then polls the status endpoint
 * until the job reaches a terminal state. HeyGen does not produce audio-only artefacts, so
 * `supports('audio')` returns false. The v3 API requires `avatar_id` and `voice_id`; both are read
 * from the {@link GenerateInput} (which the caller populates from the artifact's request config).
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

  supports(kind: MediaKind): boolean {
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

    const body = (await response.json()) as {
      data?: Array<{ id?: string; voice_id?: string; name?: string }>;
    };
    return (body.data ?? [])
      .map((entry) => ({ id: entry.id ?? entry.voice_id, name: entry.name }))
      .filter((entry): entry is GenerationOption => typeof entry.id === 'string' && typeof entry.name === 'string');
  }

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

/** Best-effort decode of an error response body so the user sees the actual reason. */
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
