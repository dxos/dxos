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

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

//
// Wire protocol: one POST carries the state and a map of named questions, answered independently.
// Modeled on `packages/core/compute/ai/src/resolvers/typesafe/TypeSafeResolver.ts`, the canonical
// shapes for this API, generalized over `instructions` since this harness sends a structured
// object (rule + prose) rather than the plain string an Effect `Decision` carries.
//

/** Criteria for a `noul` question: what each side of the probability means. */
export type NoulCriteria = { true: string; false: string };

/** A question as the System One API takes it. */
export type Question<Instructions = unknown> =
  | { type: 'noul'; instructions: Instructions; criteria?: NoulCriteria }
  | { type: 'choice'; instructions: Instructions; criteria: Record<string, string> }
  | { type: 'score'; instructions: Instructions; criteria: string[] };

/**
 * An answer as the API returns it, discriminated on `type` — a payload that does not match its
 * own `type` is a malformed answer, not an answer with fields left unset.
 */
export type Answer =
  | { type: 'noul'; noul: number }
  | { type: 'choice'; choice: string; confidence: number; probabilities?: Record<string, number> }
  | {
      type: 'score';
      score: number;
      confidence: number;
      probabilities?: Record<string, number>;
      /** The criterion each scale position stands for. */
      legend?: Record<string, string>;
    };

export type EvaluateResponse = {
  model?: string;
  answers: Record<string, Answer>;
  usage?: { input_tokens: number; output_tokens: number };
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isAnswer = (value: unknown): value is Answer => {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false;
  }
  switch (value.type) {
    case 'noul':
      return typeof value.noul === 'number';
    case 'choice':
      return typeof value.choice === 'string' && typeof value.confidence === 'number';
    case 'score':
      return typeof value.score === 'number' && typeof value.confidence === 'number';
    default:
      return false;
  }
};

/** Validates a decoded response body as an `EvaluateResponse`: the network owes nothing but bytes. */
const isEvaluateResponse = (value: unknown): value is EvaluateResponse =>
  isRecord(value) && isRecord(value.answers) && Object.values(value.answers).every(isAnswer);

/** Thrown when the API answers with a status; `fatal` says whether every other request would fail alike. */
export class SystemOneRequestError extends Error {
  readonly fatal: boolean;
  constructor(message: string, fatal = false) {
    super(message);
    this.name = 'SystemOneRequestError';
    this.fatal = fatal;
  }
}

/** Message of a caught value that may not be an `Error`. */
export const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export type ClientOptions = {
  apiKey: string | undefined;
  endpoint?: string;
  model?: string;
  /** Requests allowed in flight at once. */
  concurrency?: number;
};

export type Client = {
  evaluate: (state: unknown, questions: Record<string, Question>) => Promise<EvaluateResponse>;
  model: string;
};

/**
 * A client bound to a key, with a cap on requests in flight: the API allows 1,200 requests a
 * minute (20 a second), so about 16 in flight at a second or so each stays under it.
 */
export const makeClient = ({
  apiKey,
  endpoint = DEFAULT_ENDPOINT,
  model = DEFAULT_MODEL,
  concurrency = 16,
}: ClientOptions): Client => {
  if (!apiKey) {
    throw new Error('System One needs an API key: set TYPESAFE_API_KEY (see the 1password skill for where it lives).');
  }
  let active = 0;
  const waiting: Array<() => void> = [];
  const acquire = (): Promise<void> =>
    active < concurrency
      ? (active++, Promise.resolve())
      : new Promise<void>((resolve) => waiting.push(resolve)).then(() => {
          active++;
        });
  const release = (): void => {
    active--;
    waiting.shift()?.();
  };

  const evaluate = async (state: unknown, questions: Record<string, Question>): Promise<EvaluateResponse> => {
    await acquire();
    try {
      for (let attempt = 1; ; attempt++) {
        let response: Response;
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
            throw new Error(`System One request failed after ${attempt} attempts: ${errorMessage(error)}`);
          }
          await sleep(1000 * 2 ** (attempt - 1));
          continue;
        }
        if (response.ok) {
          const json: unknown = await response.json();
          if (!isEvaluateResponse(json)) {
            throw new Error('System One answered 200 with a body that is not a valid evaluate response');
          }
          return json;
        }
        const body = await response.text();
        if (!RETRYABLE.has(response.status) || attempt >= MAX_ATTEMPTS) {
          throw new SystemOneRequestError(
            `System One answered ${response.status}: ${body.slice(0, 500)}`,
            ACCOUNT_FAILURES.has(response.status),
          );
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
