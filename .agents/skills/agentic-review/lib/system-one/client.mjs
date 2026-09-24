//
// Copyright 2026 DXOS.org
//

// Minimal client for TypeSafe System One (POST /v1/systemone): one state, a map of named
// questions, typed answers back. Dependency-free on purpose; it runs as a standalone script.

const DEFAULT_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
export const DEFAULT_MODEL = 'jev-latest';

const RETRYABLE = new Set([429, 500, 502, 503, 504, 529]);

/** Statuses that fail every request alike (bad key, no credits), so a run stops at the first. */
const ACCOUNT_FAILURES = new Set([401, 402, 403]);
const MAX_ATTEMPTS = 5;
const REQUEST_TIMEOUT_MS = 60_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A client bound to a key, with a cap on requests in flight: the API allows 1,200 requests a
 * minute (20 a second), so about 16 in flight at a second or so each stays under it.
 *
 * @param {{ apiKey: string, endpoint?: string, model?: string, concurrency?: number }} options
 */
export const makeClient = ({ apiKey, endpoint = DEFAULT_ENDPOINT, model = DEFAULT_MODEL, concurrency = 16 }) => {
  if (!apiKey) {
    throw new Error('System One needs an API key: set TYPESAFE_API_KEY (see the 1password skill for where it lives).');
  }
  let active = 0;
  const waiting = [];
  const acquire = () =>
    active < concurrency
      ? (active++, Promise.resolve())
      : new Promise((resolve) => waiting.push(resolve)).then(() => active++);
  const release = () => {
    active--;
    waiting.shift()?.();
  };

  /**
   * Evaluate one state against a map of questions.
   *
   * @returns {Promise<{ model: string, answers: Record<string, object>, usage: { input_tokens: number, output_tokens: number } }>}
   */
  const evaluate = async (state, questions) => {
    await acquire();
    try {
      for (let attempt = 1; ; attempt++) {
        let response;
        try {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ model, state, questions }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          });
        } catch (error) {
          // A dropped connection or timeout is transient like a 5xx, and is retried the same way.
          if (attempt >= MAX_ATTEMPTS) {
            throw new Error(`System One request failed after ${attempt} attempts: ${error.message}`);
          }
          await sleep(1000 * 2 ** (attempt - 1));
          continue;
        }
        if (response.ok) {
          return await response.json();
        }
        const body = await response.text();
        if (!RETRYABLE.has(response.status) || attempt >= MAX_ATTEMPTS) {
          const error = new Error(`System One answered ${response.status}: ${body.slice(0, 500)}`);
          error.fatal = ACCOUNT_FAILURES.has(response.status);
          throw error;
        }
        const retryAfter = Number(response.headers.get('retry-after'));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** (attempt - 1));
      }
    } finally {
      release();
    }
  };

  return { evaluate, model };
};
