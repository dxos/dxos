//
// Copyright 2026 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

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
} from './heygen-provider-types';

const V3_BASE_URL = 'https://api.heygen.com/v3';

// v3 create-video endpoint with a flat body and a top-level `fit` field.
// https://developers.heygen.com/reference/create-video
const GENERATE_URL = `${V3_BASE_URL}/videos`;
// v3 status check: `GET /v3/videos/{video_id}`.
const STATUS_URL = `${V3_BASE_URL}/videos`;

// The pickers list only the account's OWN avatars/voices, not HeyGen's (huge) public catalog. The
// ownership filter differs per endpoint: `/v3/avatars` takes `ownership=private` (and rejects
// `type=private` with a 400), while `/v3/voices` takes `type=private`. Both return a flat `data` array.
// `limit` is a safety cap (owned sets are small); `/v3/avatars` rejects a limit over 50.
// https://docs.heygen.com/reference/list-avatars-v2 · https://docs.heygen.com/reference/list-voices-v3
const AVATARS_URL = `${V3_BASE_URL}/avatars?ownership=private&limit=50`;
const VOICES_URL = `${V3_BASE_URL}/voices?type=private&limit=100`;

// Bounds a list request so a slow/oversized response fails fast instead of hanging the picker.
const LIST_TIMEOUT_MS = 15_000;

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
    // Boundary cast of the untyped JSON body. `data` is a flat array on v3 (`{ data: [...] }`);
    // tolerate the v2 nesting (`data.avatars`) and both field conventions (v3 `id`/`name`, v2
    // `avatar_id`/`avatar_name`). `talking_photos` are omitted — they need a different
    // `character.type` when posting than the `avatar` we send.
    type Entry = { id?: string; avatar_id?: string; name?: string; avatar_name?: string };
    const body = (await this.#getList('listAvatars', AVATARS_URL, options)) as {
      data?: Entry[] | { avatars?: Entry[] };
    };
    const container = body.data;
    const entries = Array.isArray(container) ? container : (container?.avatars ?? []);
    return sortByName(
      entries
        .map((entry) => ({ id: entry.id ?? entry.avatar_id, name: (entry.name ?? entry.avatar_name)?.trim() }))
        .filter((entry): entry is GenerationOption => typeof entry.id === 'string' && !!entry.name),
    );
  }

  async listVoices(options: ProviderCallOptions): Promise<GenerationOption[]> {
    // Boundary cast of the untyped JSON body. v3 returns a flat `data` array (unlike v2 avatars,
    // which nest under `data.voices`).
    const body = (await this.#getList('listVoices', VOICES_URL, options)) as {
      data?: Array<{ voice_id?: string; name?: string }>;
    };
    // Guard the array: an unexpected shape (e.g. `{ data: {} }`) must not throw on `.map`.
    const entries = Array.isArray(body.data) ? body.data : [];
    return sortByName(
      entries
        .map((entry) => ({ id: entry.voice_id, name: entry.name?.trim() }))
        .filter((entry): entry is GenerationOption => typeof entry.id === 'string' && !!entry.name),
    );
  }

  /**
   * Shared GET for the list endpoints: enforces the api key, applies {@link LIST_TIMEOUT_MS} (composed
   * with any caller signal), logs a diagnostic on failure, and returns the parsed JSON body for the
   * caller to shape. Throws {@link ProviderFailureError} on a non-2xx or timeout.
   */
  async #getList(label: string, url: string, options: ProviderCallOptions): Promise<unknown> {
    if (!options.apiKey) {
      throw new MissingApiKeyError();
    }
    // Honour a signal that is already aborted before we start (adding a listener would not replay it).
    if (options.signal?.aborted) {
      throw options.signal.reason instanceof Error
        ? options.signal.reason
        : new ProviderFailureError(`HeyGen ${label} aborted.`);
    }

    const controller = new AbortController();
    const onAbort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(
      () => controller.abort(new ProviderFailureError(`HeyGen ${label} timed out.`)),
      LIST_TIMEOUT_MS,
    );
    try {
      // The timeout must remain armed through body consumption — `fetch` can resolve on headers while
      // `readErrorBody`/`json` still stall — so parsing happens here, not after the timer is cleared.
      const response = await this.#fetch(url, {
        method: 'GET',
        headers: { 'X-Api-Key': options.apiKey },
        signal: controller.signal,
      });
      if (!response.ok) {
        const detail = await readErrorBody(response);
        log.warn(`heygen ${label} failed`, {
          url,
          status: response.status,
          detail,
          apiKey: describeKey(options.apiKey),
        });
        throw new ProviderFailureError(`HeyGen ${label} failed: ${response.status} ${detail}`);
      }
      return await response.json();
    } catch (err) {
      // Surface the timeout reason (rather than a bare AbortError) so the picker shows why it failed.
      throw controller.signal.reason instanceof ProviderFailureError ? controller.signal.reason : err;
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', onAbort);
    }
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

      // Field-name coalesce: v2 used `video_url`, v3 may use `url`. The error is an object
      // (`{ code, detail, message }`) or a string depending on the API version.
      const body = (await response.json()) as {
        data?: {
          status?: string;
          url?: string;
          video_url?: string;
          error?: string | { code?: string | number; message?: string; detail?: string };
        };
      };
      const status = body.data?.status;
      const url = body.data?.url ?? body.data?.video_url;
      if (status === 'completed' && url) {
        return url;
      }
      if (status === 'failed') {
        const error = body.data?.error;
        const detail =
          typeof error === 'string'
            ? error
            : [error?.code, error?.message ?? error?.detail].filter(Boolean).join(': ') ||
              (error && JSON.stringify(error));
        throw new ProviderFailureError(detail ? `HeyGen job failed: ${detail}` : 'HeyGen job failed (no detail).');
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

/** Alphabetize picker options by display name (case-insensitive) so the selector is scannable. */
const sortByName = (options: GenerationOption[]): GenerationOption[] =>
  [...options].sort((left, right) => left.name.localeCompare(right.name));

/**
 * Non-secret fingerprint of the API key for diagnostics. Never logs the raw key — only its shape, so
 * a global 401 can be triaged (empty/truncated key, stray whitespace or quotes from a paste, vs. a
 * structurally-valid key that HeyGen simply rejects).
 */
const describeKey = (key: string): Record<string, unknown> => ({
  length: key.length,
  // Only structural flags — never any raw key characters (would leak the credential into logs).
  trimmedDiffers: key !== key.trim(),
  hasWhitespace: /\s/.test(key),
  hasQuotes: /^["']|["']$/.test(key),
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
      const message = json?.error?.message ?? json?.message ?? json?.error;
      return typeof message === 'string' ? message : text;
    } catch {
      return text;
    }
  } catch {
    return response.statusText;
  }
};
