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

const GENERATE_URL = 'https://api.heygen.com/v2/video/generate';
const STATUS_URL = 'https://api.heygen.com/v1/video_status.get';
const AVATARS_URL = 'https://api.heygen.com/v2/avatars';
const VOICES_URL = 'https://api.heygen.com/v2/voices';

const DEFAULT_POLL_INTERVAL_MS = 5_000;
const DEFAULT_TIMEOUT_MS = 5 * 60_000;
const DEFAULT_DIMENSION = { width: 1280, height: 720 };

/** Cap on how many favourites we surface in the picker — HeyGen accounts can carry hundreds. */
const MAX_LISTED = 50;

/** HeyGen has shifted naming between API versions; check every plausible favourite flag. */
const isFavorite = (entry: { is_favorite?: boolean; liked?: boolean; favorite?: boolean }): boolean =>
  Boolean(entry.is_favorite ?? entry.liked ?? entry.favorite);

export type HeyGenProviderOptions = {
  /** Output dimensions; defaults to 1280×720. */
  dimension?: { width: number; height: number };
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
  readonly #dimension: { width: number; height: number };
  readonly #pollIntervalMs: number;
  readonly #timeoutMs: number;
  readonly #fetch: typeof globalThis.fetch;

  constructor(options: HeyGenProviderOptions = {}) {
    this.#dimension = options.dimension ?? DEFAULT_DIMENSION;
    this.#pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  supports(kind: Generation.Kind): boolean {
    return kind === 'video';
  }

  async generate(input: GenerateInput, options: ProviderCallOptions): Promise<GenerateResult> {
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

    const videoId = await this.#enqueue(input, options);
    return { url: await this.#poll(videoId, options) };
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
      data?: {
        avatars?: Array<{
          avatar_id?: string;
          avatar_name?: string;
          is_favorite?: boolean;
          liked?: boolean;
          favorite?: boolean;
        }>;
        talking_photos?: Array<{
          talking_photo_id?: string;
          talking_photo_name?: string;
          is_favorite?: boolean;
          liked?: boolean;
          favorite?: boolean;
        }>;
      };
    };
    // Surface only favourited entries (per request) and cap at MAX_LISTED so the
    // picker stays usable even on accounts with many favourites.
    const avatars = (body.data?.avatars ?? [])
      .filter(isFavorite)
      .filter((entry): entry is { avatar_id: string; avatar_name?: string } => typeof entry.avatar_id === 'string')
      .map((entry) => ({ id: entry.avatar_id, name: entry.avatar_name ?? entry.avatar_id }));
    const talkingPhotos = (body.data?.talking_photos ?? [])
      .filter(isFavorite)
      .filter(
        (entry): entry is { talking_photo_id: string; talking_photo_name?: string } =>
          typeof entry.talking_photo_id === 'string',
      )
      .map((entry) => ({ id: entry.talking_photo_id, name: entry.talking_photo_name ?? entry.talking_photo_id }));
    return [...avatars, ...talkingPhotos].slice(0, MAX_LISTED);
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
      data?: {
        voices?: Array<{
          voice_id?: string;
          name?: string;
          language?: string;
          gender?: string;
          is_favorite?: boolean;
          liked?: boolean;
          favorite?: boolean;
        }>;
      };
    };
    return (body.data?.voices ?? [])
      .filter(isFavorite)
      .filter(
        (entry): entry is { voice_id: string; name?: string; language?: string; gender?: string } =>
          typeof entry.voice_id === 'string',
      )
      .map((entry) => {
        const suffix = [entry.language, entry.gender].filter(Boolean).join(', ');
        const label = entry.name ?? entry.voice_id;
        return { id: entry.voice_id, name: suffix ? `${label} (${suffix})` : label };
      })
      .slice(0, MAX_LISTED);
  }

  async #enqueue(input: GenerateInput, options: ProviderCallOptions): Promise<string> {
    const response = await this.#fetch(GENERATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': options.apiKey,
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: 'avatar',
              avatar_id: input.avatarId,
              avatar_style: 'normal',
            },
            voice: {
              type: 'text',
              input_text: input.prompt,
              voice_id: input.voiceId,
            },
          },
        ],
        dimension: this.#dimension,
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
      const response = await this.#fetch(`${STATUS_URL}?video_id=${encodeURIComponent(videoId)}`, {
        method: 'GET',
        headers: { 'X-Api-Key': options.apiKey },
        signal: options.signal,
      });
      if (!response.ok) {
        throw new ProviderFailureError(`HeyGen status failed: ${response.status} ${await readErrorBody(response)}`);
      }
      const body = (await response.json()) as {
        data?: { status?: string; video_url?: string; error?: { message?: string } };
      };
      const status = body.data?.status;
      if (status === 'completed' && body.data?.video_url) {
        return body.data.video_url;
      }
      if (status === 'failed') {
        throw new ProviderFailureError(body.data?.error?.message ?? 'HeyGen job failed.');
      }
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, this.#pollIntervalMs);
        options.signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(options.signal!.reason);
          },
          { once: true },
        );
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
