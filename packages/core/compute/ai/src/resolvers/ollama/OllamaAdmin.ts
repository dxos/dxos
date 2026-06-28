//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { DEFAULT_OLLAMA_ENDPOINT } from './OllamaResolver';

/**
 * An Ollama model as reported by `GET /api/tags`.
 */
export type Model = {
  name: string;
  size?: number;
  modifiedAt?: string;
  digest?: string;
  details?: Record<string, unknown>;
};

/**
 * Progress emitted per NDJSON line while pulling a model via `POST /api/pull`. Download phases
 * report `completed`/`total` for a single layer keyed by `digest`; consumers aggregate across
 * digests for overall progress.
 */
export type PullProgress = {
  status: string;
  digest?: string;
  completed?: number;
  total?: number;
};

/**
 * A model currently loaded into memory, as reported by `GET /api/ps`. `sizeVram` is the resident
 * VRAM footprint; `expiresAt` is when Ollama will unload it if idle.
 */
export type RunningModel = {
  name: string;
  size?: number;
  sizeVram?: number;
  expiresAt?: string;
};

/**
 * Result of an admin operation. Network/transport failures (e.g. the sidecar is not running)
 * are surfaced as `{ ok: false }` rather than thrown, so callers never have to wrap calls.
 */
export type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: string };

export type Admin = {
  readonly endpoint: string;
  /** List installed models. */
  list: (signal?: AbortSignal) => Promise<Result<{ models: Model[] }>>;
  /** List models currently loaded into memory. */
  ps: (signal?: AbortSignal) => Promise<Result<{ models: RunningModel[] }>>;
  /** Load a model into memory and keep it resident until explicitly unloaded. */
  load: (name: string) => Promise<Result>;
  /** Unload a model from memory. */
  unload: (name: string) => Promise<Result>;
  /** Pull (download) a model, streaming progress. Resolves once the download terminates. */
  pull: (name: string, onProgress?: (progress: PullProgress) => void, signal?: AbortSignal) => Promise<Result>;
  /** Delete an installed model. */
  remove: (name: string) => Promise<Result>;
};

export type Options = {
  endpoint?: string;
  /** Injectable for tests; defaults to the platform `fetch`. */
  fetch?: typeof globalThis.fetch;
};

/**
 * Client for the Ollama administrative REST API (model management). Distinct from
 * {@link OllamaResolver}, which adapts Ollama's chat endpoint to the language-model interface.
 *
 * @see https://github.com/ollama/ollama/blob/main/docs/api.md
 */
export const make = ({ endpoint = DEFAULT_OLLAMA_ENDPOINT, fetch = globalThis.fetch }: Options = {}): Admin => {
  const list: Admin['list'] = async (signal) => {
    try {
      const response = await fetch(`${endpoint}/api/tags`, { signal });
      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}` };
      }
      // `/api/tags` returns untyped JSON; map the snake_case wire shape to our camelCase type.
      const data = await response.json();
      const raw: RawModel[] = data?.models ?? [];
      const models = raw.map(
        (model): Model => ({
          name: model.name ?? '',
          size: model.size,
          modifiedAt: model.modified_at,
          digest: model.digest,
          details: model.details,
        }),
      );
      return { ok: true, models };
    } catch (error) {
      return { ok: false, error: formatError(error) };
    }
  };

  const ps: Admin['ps'] = async (signal) => {
    try {
      const response = await fetch(`${endpoint}/api/ps`, { signal });
      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}` };
      }
      const data = await response.json();
      const raw: RawRunningModel[] = data?.models ?? [];
      const models = raw.map(
        (model): RunningModel => ({
          name: model.name ?? '',
          size: model.size,
          sizeVram: model.size_vram,
          expiresAt: model.expires_at,
        }),
      );
      return { ok: true, models };
    } catch (error) {
      return { ok: false, error: formatError(error) };
    }
  };

  // Ollama loads/unloads a model via an empty `/api/generate` request: `keep_alive: -1` pins it in
  // memory; `keep_alive: 0` evicts it.
  const setKeepAlive = async (name: string, keepAlive: number): Promise<Result> => {
    try {
      const response = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: name, keep_alive: keepAlive, stream: false }),
      });
      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}` };
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: formatError(error) };
    }
  };

  const load: Admin['load'] = (name) => setKeepAlive(name, -1);
  const unload: Admin['unload'] = (name) => setKeepAlive(name, 0);

  const pull: Admin['pull'] = async (name, onProgress, signal) => {
    try {
      const response = await fetch(`${endpoint}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: name, stream: true }),
        signal,
      });
      if (!response.ok || !response.body) {
        return { ok: false, error: `HTTP ${response.status}` };
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      // Newline-delimited frames (and UTF-8 characters) can be split across network chunks, so
      // buffer the partial trailing line until the next chunk completes it.
      let pendingLine = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const text = pendingLine + decoder.decode(value, { stream: true });
        const frames = text.split('\n');
        pendingLine = frames.pop() ?? '';
        for (const frame of frames) {
          const result = handlePullLine(frame, onProgress);
          if (result) {
            return result;
          }
        }
      }

      const result = handlePullLine(pendingLine, onProgress);
      if (result) {
        return result;
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: formatError(error) };
    }
  };

  const remove: Admin['remove'] = async (name) => {
    try {
      const response = await fetch(`${endpoint}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: name }),
      });
      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}` };
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: formatError(error) };
    }
  };

  return { endpoint, list, ps, load, unload, pull, remove };
};

/**
 * Snake_case wire shape of a model from `/api/tags`. JSON is untyped, so this documents the
 * fields read rather than enforcing them.
 */
type RawModel = {
  name?: string;
  size?: number;
  modified_at?: string;
  digest?: string;
  details?: Record<string, unknown>;
};

/** Snake_case wire shape of a running model from `/api/ps`. */
type RawRunningModel = {
  name?: string;
  size?: number;
  size_vram?: number;
  expires_at?: string;
};

/**
 * Parse a single NDJSON pull line and dispatch progress. Returns a terminal failure result when
 * the line carries an `{ error }`, otherwise `undefined` to continue streaming.
 */
const handlePullLine = (
  frame: string,
  onProgress?: (progress: PullProgress) => void,
): { ok: false; error: string } | undefined => {
  const line = frame.trim();
  if (line.length === 0) {
    return undefined;
  }
  let json: any;
  try {
    json = JSON.parse(line);
  } catch {
    return undefined;
  }
  if (typeof json?.error === 'string') {
    return { ok: false, error: json.error };
  }
  onProgress?.({ status: json?.status ?? '', digest: json?.digest, completed: json?.completed, total: json?.total });
  return undefined;
};

const formatError = (error: unknown): string =>
  typeof error === 'string' ? error : error instanceof Error ? error.message : String(error);
