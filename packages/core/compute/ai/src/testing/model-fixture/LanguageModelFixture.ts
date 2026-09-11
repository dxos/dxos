//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { createPatch } from 'diff';
import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Order from 'effect/Order';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as AiError from 'effect/unstable/ai/AiError';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';
import * as Prompt from 'effect/unstable/ai/Prompt';
import * as Response from 'effect/unstable/ai/Response';
import * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';
import jsonStableStringify from 'json-stable-stringify';

import { EffectEx } from '@dxos/effect';
import { TestContextService } from '@dxos/effect/testing';
import { log } from '@dxos/log';
import { deepMapValues } from '@dxos/util';

import * as AiService from '../../AiService.ts';
import { withoutToolCallParsing } from '../../util/index.ts';

// Can be performance-intensive
const DISABLE_CLOSEST_MATCH_SEARCH = false;

/**
 * Matches the line injected by assistant system prompts (see format.tpl) so memoized conversations stay stable when tests run on different days.
 */
const TIME_LINE_PATTERN = /The current date and time is [^\n]+/g;
const TIME_LINE_PLACEHOLDER = 'The current date and time is <memoized-datetime>.';

/**
 * NEVER redact EntityIds, EIDs, or DXNs in this module. Fixture prompts
 * must match the exact strings the LLM is asked to reason about — collapsing
 * ids to a placeholder hides real mismatches and produces false hits. Test
 * determinism comes from `EntityId.dangerouslyDisableRandomness()` (test PRNG
 * with a fixed seed); when fixtures drift, fix the upstream id generation or
 * regenerate with `DX_UPDATE_MODEL_FIXTURES=1`, do not normalize here.
 */

const TIMESTAMP_PLACEHOLDER = '<memoized-timestamp>';

const normalizePromptForMatching = (prompt: unknown, dynamicMatcher?: RegExp): unknown => {
  const normalized = deepMapValues(prompt, (value, recurse, key) => {
    // Message metadata `timestamp` fields are stamped with the live clock as each turn completes and
    // are fed back verbatim into the prompt of every subsequent turn. They carry no meaning for the
    // model's reasoning, so collapse them — otherwise no multi-turn conversation can ever replay on a
    // different run/day. (This is NOT id redaction; see the note above — ids are left intact.)
    if (key === 'timestamp') {
      return TIMESTAMP_PLACEHOLDER;
    }
    if (typeof value === 'string') {
      return value.replace(TIME_LINE_PATTERN, TIME_LINE_PLACEHOLDER);
    }
    return recurse(value);
  });
  // Canonicalize opt-in dynamic identifiers (e.g. space keys) so matching is independent of their
  // run-specific values. This is NOT the blanket id redaction warned against above: it only touches
  // tokens the caller explicitly declared dynamic, and structural equality is still enforced.
  return dynamicMatcher ? canonicalizeDynamicValues(normalized, dynamicMatcher) : normalized;
};

/**
 * Deep clone before normalizing so we never mutate prompts still in use by the caller.
 */
const cloneForMatching = (prompt: unknown): unknown => {
  try {
    return JSON.parse(JSON.stringify(prompt)) as unknown;
  } catch {
    return prompt;
  }
};

//
// Dynamic value matching.
//
// Some identifiers are non-deterministic across test runs (e.g. space keys are derived from a
// freshly generated keypair every run), so they would otherwise prevent any memoized conversation
// from ever replaying. When opted in via {@link MakeProps.dynamicValuePatterns}, such tokens are:
//   1. canonicalized to positional placeholders for matching/hashing (so structural equality is
//      still enforced — two prompts match only if they share the same count of distinct dynamic
//      values in the same positions), and
//   2. on a cache hit, the stored values are substituted with the live prompt's values before the
//      response is returned, so the replaying run sees its own real identifiers.
// Conversations are always persisted to disk with the real values; substitution happens on read.
//

/**
 * Matches a SpaceId: multibase base-32 (RFC4648), a `B` prefix followed by 32 chars.
 * Requires token boundaries so a space key is not matched as a substring of a longer base-32 token.
 * @example BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE
 */
export const SPACE_ID_PATTERN = /(?<![A-Z2-7])B[A-Z2-7]{32}(?![A-Z2-7])/;

/**
 * Matches an EntityId (ULID): 26 Crockford base-32 chars (excludes I, L, O, U).
 * Requires token boundaries so a ULID is not matched as a substring of a space key or other longer token.
 * @example 01J00J9B45YHYSGZQTQMSKMGJ6
 */
export const ENTITY_ID_PATTERN = /(?<![0-9A-HJKMNP-TV-Z])[0-9A-HJKMNP-TV-Z]{26}(?![0-9A-HJKMNP-TV-Z])/;

/**
 * Matches an ISO 8601 timestamp with milliseconds.
 * Use this when a prompt embeds TestClock-derived timestamps (e.g. alarm fire times) whose
 * exact millisecond value varies across replay runs depending on TestClock advancement rate.
 * @example 1970-01-01T01:00:00.050Z
 */
export const ISO_TIMESTAMP_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/;

/**
 * Matches a canonical UUID (8-4-4-4-12 hex). Use this when a prompt embeds an id minted by an
 * external service on every real invocation (e.g. an image-hosting upload id in a tool result) —
 * such tools aren't otherwise memoizable since the value differs on every live execution.
 * @example 5baed323-7879-4fde-0441-c2cf954f2900
 */
export const UUID_PATTERN = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

/**
 * Matches the whole `<result pid=N>` opening tag the agent wraps a redelivered tool result in. The
 * pid is assigned by the process manager at spawn, so it differs between the run that recorded a
 * conversation and any replay of it. The full tag is matched (rather than the bare number) because
 * canonicalization substitutes the matched token everywhere it appears.
 * @example <result pid=9>
 */
export const RESULT_PID_PATTERN = /<result pid=\d+>/;

/**
 * Dynamic-value patterns canonicalized on every fixture match by default (see {@link make}). Because
 * deterministic id generation only holds the id sequence stable while the surrounding allocation
 * order is unchanged, an unrelated change to activation/allocation order silently drifts the ids —
 * so normalization, not determinism, is the load-bearing defence and is on by default. Ordered
 * most-specific first so {@link buildDynamicMatcher}'s alternation never partially overlaps a longer
 * token. Opt a fixture layer out by passing `dynamicValuePatterns: []`.
 */
export const DEFAULT_DYNAMIC_VALUE_PATTERNS: readonly RegExp[] = [
  RESULT_PID_PATTERN,
  SPACE_ID_PATTERN,
  ENTITY_ID_PATTERN,
  UUID_PATTERN,
  ISO_TIMESTAMP_PATTERN,
];

const dynamicPlaceholder = (index: number): string => `<memoized-dynamic-${index}>`;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Combines the provided patterns into a single global matcher. Earlier patterns take precedence in
 * the alternation, so list more specific (longer) patterns first to avoid partial overlaps (e.g.
 * {@link SPACE_ID_PATTERN} before {@link ENTITY_ID_PATTERN}).
 */
const buildDynamicMatcher = (patterns: readonly RegExp[]): RegExp | undefined => {
  if (patterns.length === 0) {
    return undefined;
  }

  // Only each pattern's `.source` is combined into the alternation, so per-pattern flags would be
  // dropped. Union them (always adding `g`) so a pattern's flag is not silently lost — e.g. dropping
  // UUID_PATTERN's case-insensitivity would leave uppercase-hex UUIDs unmatched. Regex flags are
  // whole-regex in JS and cannot be scoped per-alternative, so encode case-sensitivity in the
  // character class (as the exported patterns do) rather than relying on `i`, which a union would
  // apply to every alternative. `y` (sticky) is excluded because it breaks alternation scanning.
  const flags = new Set<string>(['g']);
  for (const pattern of patterns) {
    for (const flag of pattern.flags) {
      if (flag !== 'y') {
        flags.add(flag);
      }
    }
  }

  return new RegExp(patterns.map((pattern) => `(?:${pattern.source})`).join('|'), [...flags].join(''));
};

/**
 * Collects distinct dynamic-value tokens in deterministic order of first appearance.
 */
const collectDynamicValues = (prompt: unknown, matcher: RegExp): string[] => {
  const seen = new Set<string>();
  const ordered: string[] = [];
  // Collect over the canonical, key-sorted serialization so the first-appearance order — which fixes
  // each token's positional placeholder — matches the order used for comparison (jsonStableStringify).
  // Walking the live object graph in insertion order (deepMapValues, `for..in`) would number
  // placeholders in an order that diverges from the sorted comparison, producing false misses when a
  // snapshot and the live prompt differ only in object key order. See DESIGN.md.
  const canonical = jsonStableStringify(prompt) ?? '';
  for (const match of canonical.matchAll(matcher)) {
    const token = match[0];
    if (!seen.has(token)) {
      seen.add(token);
      ordered.push(token);
    }
  }

  return ordered;
};

/**
 * Replaces every occurrence of each mapping key with its value across all strings in the prompt.
 * Keys are matched longest-first so a shorter token never matches inside a longer one.
 */
const replaceTokens = (prompt: unknown, mapping: ReadonlyMap<string, string>): unknown => {
  if (mapping.size === 0) {
    return prompt;
  }

  const matcher = new RegExp(
    [...mapping.keys()]
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp)
      .join('|'),
    'g',
  );

  return deepMapValues(prompt, (value, recurse) => {
    if (typeof value === 'string') {
      return value.replace(matcher, (token) => mapping.get(token) ?? token);
    }
    return recurse(value);
  });
};

/**
 * Canonicalizes dynamic tokens to positional placeholders so matching is independent of the
 * concrete (run-specific) values while still enforcing structural equality.
 */
const canonicalizeDynamicValues = (prompt: unknown, matcher: RegExp): unknown => {
  const values = collectDynamicValues(prompt, matcher);
  return replaceTokens(prompt, new Map(values.map((value, index) => [value, dynamicPlaceholder(index)])));
};

/**
 * Builds the substitution applied to a stored response on a cache hit: the i-th distinct dynamic
 * value in the stored prompt maps to the i-th distinct dynamic value in the live prompt. A match
 * guarantees the canonical forms are equal, hence the counts and positions align.
 */
const remapStoredResponse = (
  storedPrompt: unknown,
  storedResponse: readonly unknown[],
  livePrompt: unknown,
  matcher: RegExp | undefined,
): readonly unknown[] => {
  if (!matcher) {
    return storedResponse;
  }

  // Collect over the same timestamp/datetime-normalized form the matcher compared — but WITHOUT
  // canonicalizing dynamic tokens, since we need the real values to build the stored→live mapping.
  // Collecting over the raw prompt would pick up tokens the matcher had normalized away (e.g. ISO
  // timestamps in `timestamp` metadata when ISO_TIMESTAMP_PATTERN is registered), diverging the
  // token count/order from what the match established and misaligning the positional remap. See DESIGN.md.
  const storedValues = collectDynamicValues(normalizePromptForMatching(cloneForMatching(storedPrompt)), matcher);
  const liveValues = collectDynamicValues(normalizePromptForMatching(cloneForMatching(livePrompt)), matcher);
  const mapping = new Map<string, string>();
  for (let index = 0; index < storedValues.length; index++) {
    const live = liveValues[index];
    if (live === undefined) {
      // Should not happen for a matched conversation (canonical forms are equal), but a dynamic
      // token present only in the response and never in the prompt cannot be remapped positionally.
      log.warn('memoized dynamic value has no live counterpart', { stored: storedValues[index] });
      continue;
    }
    if (storedValues[index] !== live) {
      mapping.set(storedValues[index], live);
    }
  }

  return replaceTokens(storedResponse, mapping) as readonly unknown[];
};

/**
 * Internal seams exposed for unit testing the dynamic-value matching/substitution logic.
 * Not part of the public API.
 */
export const __testing = {
  buildDynamicMatcher,
  /** Canonicalizes a prompt for matching/hashing (dynamic tokens → positional placeholders). */
  normalizeForMatching: (prompt: unknown, patterns: readonly RegExp[]): unknown =>
    normalizePromptForMatching(cloneForMatching(prompt), buildDynamicMatcher(patterns)),
  /** Substitutes stored dynamic values with the live prompt's values across a stored response. */
  remapResponse: (
    storedPrompt: unknown,
    storedResponse: readonly unknown[],
    livePrompt: unknown,
    patterns: readonly RegExp[],
  ): readonly unknown[] => remapStoredResponse(storedPrompt, storedResponse, livePrompt, buildDynamicMatcher(patterns)),
};

//
// AiService-level fixture wrapper. `layerTest` is the entry consumers use: it wraps the upstream
// AiService so every model it builds replays through the fixture store (regenerating on a miss only
// when `DX_UPDATE_MODEL_FIXTURES=1`).
//

export type ServiceOptions = {
  upstream: AiService.Service;
  /** Absolute path of the running test file; the store derives the `<suite>` segment and `.store` root from it. */
  testFilePath: string;
  allowGeneration: boolean;
  /**
   * Patterns matching run-specific identifiers (e.g. {@link SPACE_ID_PATTERN}) to canonicalize for
   * matching and substitute back into the response on a cache hit. Defaults to
   * {@link DEFAULT_DYNAMIC_VALUE_PATTERNS}; pass `[]` to disable normalization.
   */
  dynamicValuePatterns?: readonly RegExp[];
};

/** Wraps an upstream {@link AiService.Service} so every model it builds replays through the fixture store. */
export const makeService = (options: ServiceOptions): AiService.Service => ({
  model: (model) =>
    Layer.provide(
      layer({
        modelName: model,
        testFilePath: options.testFilePath,
        allowGeneration: options.allowGeneration,
        dynamicValuePatterns: options.dynamicValuePatterns,
      }),
      options.upstream.model(model),
    ),
});

/**
 * AiService layer that records model turns to the fixture store and replays them offline.
 * Requires {@link TestContextService} to derive the `<suite>` store segment from the running test file.
 *
 * @param options.testFilePath [default: the running test file path].
 * @param options.allowGeneration [default: `DX_UPDATE_MODEL_FIXTURES=1`] — whether to hit the live model on a miss.
 */
export const layerTest = (options: Partial<Omit<ServiceOptions, 'upstream'>> = {}) =>
  Layer.effect(
    AiService.AiService,
    Effect.gen(function* () {
      const ctx = yield* TestContextService;
      const upstream = yield* AiService.AiService;
      return makeService({
        upstream,
        testFilePath: options.testFilePath ?? ctx.task.file.filepath,
        allowGeneration: options.allowGeneration ?? isUpdateEnabled(),
        dynamicValuePatterns: options.dynamicValuePatterns,
      });
    }),
  );

/** @returns true if fixture regeneration is enabled via `DX_UPDATE_MODEL_FIXTURES`. */
export const isUpdateEnabled = (): boolean =>
  ['1', 'true'].includes((process.env.DX_UPDATE_MODEL_FIXTURES ?? '0').trim().toLowerCase());

export interface LayerOptions {
  modelName: string;
  testFilePath: string;
  allowGeneration: boolean;

  /**
   * Patterns matching run-specific identifiers (e.g. {@link SPACE_ID_PATTERN}) that should be
   * canonicalized for matching and substituted back into the response on a cache hit. Defaults to
   * {@link DEFAULT_DYNAMIC_VALUE_PATTERNS}; pass `[]` to disable. List more specific patterns first.
   */
  dynamicValuePatterns?: readonly RegExp[];
}

/**
 * LanguageModel layer that replays recorded fixtures through the store, deferring to the upstream
 * {@link LanguageModel.LanguageModel} it requires only to generate on a miss when `allowGeneration` is set.
 */
export const layer = (
  options: LayerOptions,
): Layer.Layer<LanguageModel.LanguageModel, never, LanguageModel.LanguageModel> =>
  Layer.effect(
    LanguageModel.LanguageModel,
    Effect.gen(function* () {
      const upstreamModel = yield* LanguageModel.LanguageModel;
      return yield* make({
        upstreamModel,
        modelName: options.modelName,
        testFilePath: options.testFilePath,
        allowGeneration: options.allowGeneration,
        dynamicValuePatterns: options.dynamicValuePatterns,
      });
    }),
  );

type MakeProps = {
  upstreamModel: LanguageModel.Service;
  modelName: string;
  testFilePath: string;
  allowGeneration: boolean;
  dynamicValuePatterns?: readonly RegExp[];
};

/**
 * Builds the replaying {@link LanguageModel.Service}: each turn is looked up in the store by request
 * hash and replayed; on a miss it errors, unless `allowGeneration` is set, when it calls the upstream
 * model and records the turn.
 */
export const make = (options: MakeProps): Effect.Effect<LanguageModel.Service> => {
  const dynamicMatcher = buildDynamicMatcher(options.dynamicValuePatterns ?? DEFAULT_DYNAMIC_VALUE_PATTERNS);
  const store = new FixtureStore(options.testFilePath, dynamicMatcher);

  return LanguageModel.make({
    generateText: Effect.fn('LanguageModelFixture.generateText')(function* (params) {
      const conversation = getConversationFromOptions(options.modelName, false, params);
      const memoized = yield* store.getFixtureConversation(conversation);
      if (Option.isSome(memoized)) {
        return remapStoredResponse(
          memoized.value.prompt,
          memoized.value.response,
          params.prompt,
          dynamicMatcher,
        ) as Response.PartEncoded[];
      } else {
        if (!options.allowGeneration) {
          return yield* throwErrorWithClosestMatch(store, conversation);
        }

        const toolkit = Toolkit.make(...(params.tools as never[]));

        const upstreamResult = yield* options.upstreamModel.generateText({
          prompt: params.prompt,
          toolkit: yield* toolkit,
          toolChoice: params.toolChoice as any,
          disableToolCallResolution: true,
        });
        const response = yield* Schema.encodeEffect(Schema.mutable(Schema.Array(Response.Part(toolkit))))(
          upstreamResult.content,
        ).pipe(
          Effect.catchTag('SchemaError', (error) =>
            Effect.fail(
              new AiError.AiError({
                module: 'LanguageModel',
                method: 'generateText',
                reason: new AiError.InvalidOutputError({
                  description: `failed to encode response: ${error.message}`,
                }),
              }),
            ),
          ),
        );

        const newConversation: FixtureConversation = {
          parameters: getFixtureConversationParameters(options.modelName, false, params),
          prompt: params.prompt,
          response,
        };
        yield* store.saveFixtureConversation(newConversation);

        return response;
      }
    }),
    streamText: (params) =>
      Stream.unwrap(
        Effect.gen(function* () {
          const conversation = getConversationFromOptions(options.modelName, true, params);

          const memoized = yield* store.getFixtureConversation(conversation);
          if (Option.isSome(memoized)) {
            return Stream.fromIterable(
              remapStoredResponse(
                memoized.value.prompt,
                memoized.value.response,
                params.prompt,
                dynamicMatcher,
              ) as Response.StreamPartEncoded[],
            );
          } else {
            if (!options.allowGeneration) {
              return yield* throwErrorWithClosestMatch(store, conversation);
            }

            const toolkit = Toolkit.make(...(params.tools as never[]));
            const PartCodec = Response.StreamPart(toolkit);

            const parts: Response.AllPartsEncoded[] = [];
            return options.upstreamModel
              .streamText({
                prompt: params.prompt,
                toolkit: yield* toolkit,
                toolChoice: params.toolChoice as any,
                disableToolCallResolution: true,
              })
              .pipe(
                withoutToolCallParsing,
                Stream.mapEffect((part) =>
                  Schema.encodeEffect(PartCodec)(part).pipe(
                    Effect.catchTag('SchemaError', (error) =>
                      Effect.fail(
                        new AiError.AiError({
                          module: 'LanguageModel',
                          method: 'generateText',
                          reason: new AiError.InvalidOutputError({
                            description: `failed to encode response: ${error.message}`,
                          }),
                        }),
                      ),
                    ),
                  ),
                ),
                Stream.mapArrayEffect(
                  Effect.fnUntraced(function* (chunk) {
                    parts.push(...chunk);
                    return chunk;
                  }),
                ),
                Stream.onEnd(
                  Effect.gen(function* () {
                    const conversation: FixtureConversation = {
                      parameters: getFixtureConversationParameters(options.modelName, true, params),
                      prompt: params.prompt,
                      response: parts,
                    };
                    yield* store.saveFixtureConversation(conversation);
                  }),
                ),
              );
          }
        }),
      ),
  });
};

const getFixtureConversationParameters = (
  model: string,
  stream: boolean,
  params: LanguageModel.ProviderOptions,
): ConversationParameters => {
  return {
    model,
    stream,
    tools: params.tools.map((tool) => ({
      name: tool.name,
      description: Tool.getDescription(tool as any),
      inputSchema: Tool.getJsonSchema(tool as any),
    })),
  };
};

const getConversationFromOptions = (
  model: string,
  stream: boolean,
  params: LanguageModel.ProviderOptions,
): FixtureConversation => {
  return {
    parameters: getFixtureConversationParameters(model, stream, params),
    prompt: params.prompt,
    response: [],
  };
};

const conversationMatches = (
  haystack: FixtureConversation,
  needle: FixtureConversation,
  dynamicMatcher: RegExp | undefined,
): boolean => {
  // TODO(dmaretskyi): dequal doesn't work for some reason.
  if (jsonStableStringify(haystack.parameters) !== jsonStableStringify(needle.parameters)) {
    return false;
  }

  if (
    jsonStableStringify(normalizePromptForMatching(cloneForMatching(haystack.prompt), dynamicMatcher)) !==
    jsonStableStringify(normalizePromptForMatching(cloneForMatching(needle.prompt), dynamicMatcher))
  ) {
    return false;
  }

  return true;
};

/** Store directory under the repo root: `.store/conversations/<suite>/<hash>.json`. */
const STORE_DIR = '.store';
const CONVERSATIONS_DIR = 'conversations';

/**
 * Canonical string the replay matcher compares and the store hashes over: the parameters plus the
 * time/dynamic-normalized prompt. Two conversations match iff their match keys are equal, so hashing
 * this key makes O(1) lookup and today's equality match agree by construction (DESIGN.md decision 3).
 */
const matchKey = (conversation: FixtureConversation, dynamicMatcher: RegExp | undefined): string =>
  jsonStableStringify({
    parameters: conversation.parameters,
    prompt: normalizePromptForMatching(cloneForMatching(conversation.prompt), dynamicMatcher),
  }) ?? '';

const hashKey = async (key: string): Promise<string> => {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(key).digest('hex');
};

/**
 * Provider HTTP transport envelopes carried on encoded response parts: `request` (method, url and
 * request headers) on `response-metadata`, `response` (status and response headers) on `finish`.
 */
const TRANSPORT_FIELDS: ReadonlySet<string> = new Set(['request', 'response']);

/**
 * Drops the transport envelopes from the response parts on their way into the committed store.
 * Replay reads none of them, while they carry account and trace identifiers
 * (`anthropic-organization-id`, `anthropic-workspace-id`, `cf-ray`, `request-id`, `traceparent`/`b3`)
 * plus per-request rate-limit state that would otherwise be published in a public repo. Stripping on
 * write rather than on receipt leaves the live in-process response exactly as the provider sent it.
 */
const stripTransportMetadata = (parts: readonly unknown[]): unknown[] =>
  parts.map((part) => {
    if (part === null || typeof part !== 'object' || Array.isArray(part)) {
      return part;
    }
    const retained = Object.entries(part).filter(([key]) => !TRANSPORT_FIELDS.has(key));
    return retained.length === Object.keys(part).length ? part : Object.fromEntries(retained);
  });

const decodeConversation = (data: string): FixtureConversation =>
  Schema.decodeSync(Schema.fromJsonString(FixtureConversation))(data);

// Compact (single-line) JSON: the store is treated as opaque generated blobs via `.gitattributes`
// (`-diff -merge linguist-generated`), so pretty-printing only inflates line counts in review.
const encodeConversation = (conversation: FixtureConversation): string =>
  Schema.encodeSync(Schema.fromJsonString(FixtureConversation))(conversation);

/**
 * Resolves the suite directory for a test file: `<repo-root>/.store/conversations/<suite>`, where
 * `<suite>` is the repo-relative test path flattened to one segment (path-flatten, no hand slugs).
 * The repo root is the nearest ancestor with a `pnpm-workspace.yaml`.
 */
const resolveSuiteDir = async (testFilePath: string): Promise<string> => {
  const { dirname, join, relative, sep } = await import('node:path');
  const { access } = await import('node:fs/promises');
  let current = dirname(testFilePath);
  let repoRoot: string | undefined;
  while (true) {
    try {
      await access(join(current, 'pnpm-workspace.yaml'));
      repoRoot = current;
      break;
    } catch {
      const parent = dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  }
  if (repoRoot === undefined) {
    // A silent fallback would write fixtures next to the test file and make replay miss the
    // committed store — fail loudly instead.
    throw new Error(`Could not locate the repo root (pnpm-workspace.yaml) above ${testFilePath}.`);
  }
  // Percent-encode literal underscores before joining path separators with `_`, so `_` is
  // unambiguously the separator and the flattened segment is injective — `a/b` and `a_b` must not
  // collide. No current path segment contains `_`, so committed fixture directories are unaffected.
  const suite = relative(repoRoot, testFilePath)
    .replace(/\.(test|eval)\.ts$/, '')
    .split(sep)
    .map((segment) => segment.replace(/_/g, '%5f'))
    .join('_');
  return join(repoRoot, STORE_DIR, CONVERSATIONS_DIR, suite);
};

/**
 * Hash-addressed fixture store: one `<hash>.json` per conversation under the suite directory. Replay
 * is an O(1) read by request hash; a miss (or a fixture whose stored hash used a different dynamic
 * matcher, e.g. one migrated without patterns) falls back to scanning the suite dir and matching
 * structurally under the live matcher.
 */
class FixtureStore {
  #testFilePath: string;
  #dynamicMatcher: RegExp | undefined;
  #dirPromise: Promise<string> | undefined;

  constructor(testFilePath: string, dynamicMatcher?: RegExp) {
    this.#testFilePath = testFilePath;
    this.#dynamicMatcher = dynamicMatcher;
  }

  /**
   * @returns A stored conversation whose parameters and normalized prompt match the prompted one.
   */
  getFixtureConversation(prompted: FixtureConversation): Effect.Effect<Option.Option<FixtureConversation>> {
    return Effect.promise(async () => {
      const { readFile } = await import('node:fs/promises');
      const { join } = await import('node:path');
      const dir = await this.#dir();
      const file = join(dir, `${await hashKey(matchKey(prompted, this.#dynamicMatcher))}.json`);
      let contents: string | undefined;
      try {
        contents = await readFile(file, 'utf-8');
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }
      if (contents !== undefined) {
        try {
          return Option.some(decodeConversation(contents));
        } catch (err) {
          // A corrupt fixture at the exact hash path must not mask the "no fixture found" diagnostic;
          // fall through to the structural scan, matching #readAll's tolerance.
          log.warn('skipping undecodable model fixture', { file, err });
        }
      }
      // Fallback for hashes computed under a different matcher (e.g. migrated fixtures).
      for (const stored of await this.#readAll(dir)) {
        if (conversationMatches(stored, prompted, this.#dynamicMatcher)) {
          return Option.some(stored);
        }
      }
      return Option.none();
    });
  }

  /**
   * @returns The stored conversation closest to the prompted one, for the miss diagnostic.
   */
  getClosestMatch(prompted: FixtureConversation): Effect.Effect<Option.Option<FixtureConversation>> {
    return Effect.promise(async () => {
      const all = await this.#readAll(await this.#dir());
      // Format the prompted conversation and each fixture's distance once — `Order.mapInput` would
      // otherwise re-run the (patch-computing) mapping on every comparison.
      const promptedFormatted = formatFixtureConversation(prompted, this.#dynamicMatcher);
      const scored = all.map((conversation) => ({
        conversation,
        distance: gitDiffDistance(formatFixtureConversation(conversation, this.#dynamicMatcher), promptedFormatted),
      }));
      return Function.pipe(
        scored,
        Array.sortBy(Order.mapInput(Order.Number, (entry) => entry.distance)),
        Array.map((entry) => entry.conversation),
        Option.fromIterable,
      );
    });
  }

  formatConversation(conversation: FixtureConversation): string {
    return formatFixtureConversation(conversation, this.#dynamicMatcher);
  }

  saveFixtureConversation(conversation: FixtureConversation): Effect.Effect<void> {
    // Per-conversation files make writes independent, so concurrent tests in one suite no longer race
    // on a shared file (the read-modify-write hazard of the old single-file store).
    return Effect.promise(async () => {
      const { writeFile, mkdir } = await import('node:fs/promises');
      const { join } = await import('node:path');
      const dir = await this.#dir();
      await mkdir(dir, { recursive: true });
      const file = join(dir, `${await hashKey(matchKey(conversation, this.#dynamicMatcher))}.json`);
      // The hash keys on parameters + prompt only, so sanitizing the response cannot move the file.
      await writeFile(
        file,
        encodeConversation({ ...conversation, response: stripTransportMetadata(conversation.response) }),
      );
    });
  }

  async #dir(): Promise<string> {
    this.#dirPromise ??= resolveSuiteDir(this.#testFilePath);
    return this.#dirPromise;
  }

  async #readAll(dir: string): Promise<FixtureConversation[]> {
    const { readdir, readFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    let names: string[];
    try {
      names = await readdir(dir);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return [];
      }
      throw err;
    }
    const conversations: FixtureConversation[] = [];
    for (const name of names) {
      if (name.endsWith('.json')) {
        try {
          conversations.push(decodeConversation(await readFile(join(dir, name), 'utf-8')));
        } catch (err) {
          // A single stale/foreign fixture must not fail replay for the whole suite; skip it so the
          // caller still reaches the "no fixture found" diagnostic.
          log.warn('skipping undecodable model fixture', { file: join(dir, name), err });
        }
      }
    }
    return conversations;
  }
}

/**
 * One-off migration from the legacy single-file `<test>.conversations.json` store into the
 * hash-addressed `.store/conversations/<suite>/<hash>.json` layout. Hashes without dynamic patterns —
 * the few suites that used them are matched structurally by the replay fallback above. Not part of
 * the public API; used once to migrate the committed caches, then retained for any future migration.
 */
export const __migrate = async (testFilePath: string, legacyCachePath: string): Promise<number> => {
  const { readFile } = await import('node:fs/promises');
  const legacy = Schema.decodeSync(
    Schema.fromJsonString(Schema.Struct({ conversations: Schema.Array(FixtureConversation) })),
  )(await readFile(legacyCachePath, 'utf-8'));
  const store = new FixtureStore(testFilePath, undefined);
  for (const conversation of legacy.conversations) {
    await EffectEx.runPromise(store.saveFixtureConversation(conversation));
  }
  return legacy.conversations.length;
};

const ConversationParameters = Schema.Struct({
  model: Schema.String,
  stream: Schema.Boolean,
  tools: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      description: Schema.optional(Schema.String),
      inputSchema: Schema.Any,
    }),
  ),
});
type ConversationParameters = Schema.Schema.Type<typeof ConversationParameters>;

const FixtureConversation = Schema.Struct({
  parameters: ConversationParameters,
  prompt: Prompt.Prompt,

  // This is supposed to be Response.AllParts for arbitrary tools.
  // Tool call schema is generated based on the available tools so we can't use a static schema.
  response: Schema.Array(Schema.Unknown),
}).annotate({ identifier: 'FixtureConversation' });
type FixtureConversation = Schema.Schema.Type<typeof FixtureConversation>;

/**
 * Formats the conversation for diffing and displaying to the developer.
 * Doesn't need to be lossless.
 */
const formatFixtureConversation = (conversation: FixtureConversation, dynamicMatcher?: RegExp): string => {
  return (
    jsonStableStringify(
      {
        parameters: conversation.parameters,
        // Promps may contain long encrypted strings, which are not important to see. We sanitize them so that levenstein distance doesn't OOM.
        prompt: deepMapValues(
          normalizePromptForMatching(cloneForMatching(conversation.prompt), dynamicMatcher),
          (value, recurse, key) => {
            if (typeof value === 'string' && value.length > 256 && key === 'encrypted_content') {
              return sanitizeString(value);
            }
            return recurse(value);
          },
        ),
      },
      { space: 2 },
    ) ?? ''
  );
};

const sanitizeString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    hash = (hash * 31 + charCode) | 0;
  }

  const sanitized = `<sanitized ${hash}>`;
  return sanitized;
};

/**
 * @returns Metric of similarity between two strings. Lower is better.
 */
const gitDiffDistance = (a: string, b: string): number => {
  const diff = createPatch('a', a, b);
  return diff.length;
};

const throwErrorWithClosestMatch = (store: FixtureStore, conversation: FixtureConversation) =>
  Effect.gen(function* () {
    if (!DISABLE_CLOSEST_MATCH_SEARCH) {
      const closestMatch = yield* store.getClosestMatch(conversation);
      if (Option.isSome(closestMatch)) {
        const dumpDir = process.env.DX_DUMP_FIXTURE_TOOLS;
        if (dumpDir) {
          // A toolkit whose JSON Schema emission changed (an Effect upgrade) misses on every fixture
          // at once. Dumping both tool lists lets `migrate-model-fixture-tools.mjs` rewrite the store
          // from what the runtime actually emits rather than from a transcribed guess.
          yield* Effect.promise(async () => {
            const { mkdir, writeFile } = await import('node:fs/promises');
            const { createHash } = await import('node:crypto');
            const payload = JSON.stringify({
              stored: closestMatch.value.parameters.tools,
              prompted: conversation.parameters.tools,
            });
            await mkdir(dumpDir, { recursive: true });
            await writeFile(`${dumpDir}/${createHash('sha256').update(payload).digest('hex')}.json`, payload);
          });
        }
        const patch = createPatch(
          'conversation',
          store.formatConversation(closestMatch.value),
          store.formatConversation(conversation),
          'saved',
          'new',
        );
        return yield* Effect.die(new Error(error(patch)));
      }
    }

    return yield* Effect.die(new Error(error()));
  });

const error = (patch?: string) =>
  [
    'No memoized conversation found for the given prompt.',
    'Re-run test with DX_UPDATE_MODEL_FIXTURES=1 to generate a new memoized conversation.',
    patch && `Closest match: ${patch}`,
  ]
    .filter(Boolean)
    .join('\n');
