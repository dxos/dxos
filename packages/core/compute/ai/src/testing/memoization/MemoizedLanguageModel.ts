//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as AiError from '@effect/ai/AiError';
import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Prompt from '@effect/ai/Prompt';
import * as Response from '@effect/ai/Response';
import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import { createPatch } from 'diff';
import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Order from 'effect/Order';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import jsonStableStringify from 'json-stable-stringify';

import { log } from '@dxos/log';
import { deepMapValues } from '@dxos/util';

import { withoutToolCallParising } from '../../util';

// Can be performance-intensive
const DISABLE_CLOSEST_MATCH_SEARCH = false;

/**
 * Matches the line injected by assistant system prompts (see format.tpl) so memoized conversations stay stable when tests run on different days.
 */
const TIME_LINE_PATTERN = /The current date and time is [^\n]+/g;
const TIME_LINE_PLACEHOLDER = 'The current date and time is <memoized-datetime>.';

/**
 * NEVER redact EntityIds, EIDs, or DXNs in this module. Memoized prompts
 * must match the exact strings the LLM is asked to reason about — collapsing
 * ids to a placeholder hides real mismatches and produces false hits. Test
 * determinism comes from `EntityId.dangerouslyDisableRandomness()` (test PRNG
 * with a fixed seed); when memos drift, fix the upstream id generation or
 * regenerate with `ALLOW_LLM_GENERATION=1`, do not normalize here.
 */

const TIMESTAMP_PLACEHOLDER = '<memoized-timestamp>';

const normalizePromptForMemoization = (prompt: unknown, dynamicMatcher?: RegExp): unknown => {
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
const cloneForMemoNormalization = (prompt: unknown): unknown => {
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
export const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

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
  return new RegExp(patterns.map((pattern) => `(?:${pattern.source})`).join('|'), 'g');
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
  const storedValues = collectDynamicValues(storedPrompt, matcher);
  const liveValues = collectDynamicValues(livePrompt, matcher);
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
    normalizePromptForMemoization(cloneForMemoNormalization(prompt), buildDynamicMatcher(patterns)),
  /** Substitutes stored dynamic values with the live prompt's values across a stored response. */
  remapResponse: (
    storedPrompt: unknown,
    storedResponse: readonly unknown[],
    livePrompt: unknown,
    patterns: readonly RegExp[],
  ): readonly unknown[] => remapStoredResponse(storedPrompt, storedResponse, livePrompt, buildDynamicMatcher(patterns)),
};

export interface LayerOptions {
  modelName: string;
  storePath: string;
  allowGeneration: boolean;

  /**
   * Patterns matching run-specific identifiers (e.g. {@link SPACE_ID_PATTERN}) that should be
   * canonicalized for matching and substituted back into the response on a cache hit. Opt-in;
   * defaults to no normalization. List more specific (longer) patterns first.
   */
  dynamicValuePatterns?: readonly RegExp[];
}

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
        storePath: options.storePath,
        allowGeneration: options.allowGeneration,
        dynamicValuePatterns: options.dynamicValuePatterns,
      });
    }),
  );

type MakeProps = {
  upstreamModel: LanguageModel.Service;
  modelName: string;
  storePath: string;
  allowGeneration: boolean;
  dynamicValuePatterns?: readonly RegExp[];
};

export const make = (options: MakeProps): Effect.Effect<LanguageModel.Service> => {
  const dynamicMatcher = buildDynamicMatcher(options.dynamicValuePatterns ?? []);
  const store = new MemoizedStore(options.storePath, dynamicMatcher);

  return LanguageModel.make({
    generateText: Effect.fn('MemoizedLanguageModel.generateText')(function* (params) {
      const conversation = getConversationFromOptions(options.modelName, false, params);
      const memoized = yield* store.getMemoizedConversation(conversation);
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
        const response = yield* Schema.mutable(Schema.Array(Response.Part(toolkit)))
          .pipe(Schema.encode)(upstreamResult.content)
          .pipe(
            Effect.catchTag('ParseError', (error) =>
              AiError.MalformedOutput.fromParseError({
                module: 'LanguageModel',
                method: 'generateText',
                error,
              }),
            ),
          );

        const newConversation: MemoziedConversation = {
          parameters: getMemoizedConversationParameters(options.modelName, false, params),
          prompt: params.prompt,
          response,
        };
        yield* store.saveMemoizedConversation(newConversation);

        return response;
      }
    }),
    streamText: (params) =>
      Stream.unwrap(
        Effect.gen(function* () {
          const conversation = getConversationFromOptions(options.modelName, true, params);

          const memoized = yield* store.getMemoizedConversation(conversation);
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
                withoutToolCallParising,
                Stream.mapEffect((part) =>
                  Schema.encode(PartCodec)(part).pipe(
                    Effect.catchTag('ParseError', (error) =>
                      AiError.MalformedOutput.fromParseError({
                        module: 'LanguageModel',
                        method: 'generateText',
                        error,
                      }),
                    ),
                  ),
                ),
                Stream.mapChunksEffect(
                  Effect.fnUntraced(function* (chunk) {
                    parts.push(...chunk);
                    return chunk;
                  }),
                ),
                Stream.onDone(() =>
                  Effect.gen(function* () {
                    const conversation: MemoziedConversation = {
                      parameters: getMemoizedConversationParameters(options.modelName, true, params),
                      prompt: params.prompt,
                      response: parts,
                    };
                    yield* store.saveMemoizedConversation(conversation);
                  }),
                ),
              );
          }
        }),
      ),
  });
};

const getMemoizedConversationParameters = (
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
): MemoziedConversation => {
  return {
    parameters: getMemoizedConversationParameters(model, stream, params),
    prompt: params.prompt,
    response: [],
  };
};

const converstationMatches = (
  haystack: MemoziedConversation,
  needle: MemoziedConversation,
  dynamicMatcher: RegExp | undefined,
): boolean => {
  // TODO(dmaretskyi): dequal doesn't work for some reason.
  if (jsonStableStringify(haystack.parameters) !== jsonStableStringify(needle.parameters)) {
    return false;
  }

  if (
    jsonStableStringify(normalizePromptForMemoization(cloneForMemoNormalization(haystack.prompt), dynamicMatcher)) !==
    jsonStableStringify(normalizePromptForMemoization(cloneForMemoNormalization(needle.prompt), dynamicMatcher))
  ) {
    return false;
  }

  return true;
};

// TODO(dmaretskyi): Currently this doesn't clean the old memoized convesations and the memoization files can grow quickly.
// To solve this, we can separate convesations for each test, put the time the conversation was last used, and then delete the ones that are unused.
// We will only edit the files when ALLOW_LLM_GENERATION=1 is specified.
class MemoizedStore {
  #path: string;
  #dynamicMatcher: RegExp | undefined;

  constructor(path: string, dynamicMatcher?: RegExp) {
    this.#path = path;
    this.#dynamicMatcher = dynamicMatcher;
  }

  /**
   * @returns A stored converstation that starts with the same parameters and messages as the prompted conversation.
   */
  getMemoizedConversation(prompted: MemoziedConversation): Effect.Effect<Option.Option<MemoziedConversation>> {
    return Effect.gen(this, function* () {
      const stored = yield* this.#loadStore();
      return Function.pipe(
        stored.conversations,
        Array.findFirst((x) => converstationMatches(x, prompted, this.#dynamicMatcher)),
      );
    });
  }

  /**
   * @returns A stored converstation that is the closest match to the prompted conversation.
   */
  getClosestMatch(prompted: MemoziedConversation): Effect.Effect<Option.Option<MemoziedConversation>> {
    return Effect.gen(this, function* () {
      const stored = yield* this.#loadStore();
      return Function.pipe(
        stored.conversations,
        Array.sortBy(
          Order.mapInput(Order.number, (x) =>
            gitDiffDistance(
              formatMemoizedConversation(x, this.#dynamicMatcher),
              formatMemoizedConversation(prompted, this.#dynamicMatcher),
            ),
          ),
        ),
        Option.fromIterable,
      );
    });
  }

  /**
   * Saves the conversation to the store.
   * @param conversation The conversation to save.
   */
  formatConversation(conversation: MemoziedConversation): string {
    return formatMemoizedConversation(conversation, this.#dynamicMatcher);
  }

  saveMemoizedConversation(conversation: MemoziedConversation): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      const store = yield* this.#loadStore();
      store.conversations.push(conversation);
      yield* this.#saveStore(store);
    });
  }

  #loadStore(): Effect.Effect<ConversationStore> {
    return Effect.promise(async () => {
      // Avoids importing FS in browser. We can use effect's fs layer instead.
      const { readFile } = await import('node:fs/promises');
      try {
        const data = await readFile(this.#path, 'utf-8');
        return Schema.decodeSync(Schema.parseJson(ConversationStore))(data);
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          return { conversations: [] };
        } else {
          throw err;
        }
      }
    });
  }

  #saveStore(store: ConversationStore): Effect.Effect<void> {
    // TODO(dmaretskyi): Figure out how to make this thread-safe.
    return Effect.promise(async () => {
      // Avoids importing FS in browser. We can use effect's fs layer instead.
      const { writeFile } = await import('node:fs/promises');
      await writeFile(this.#path, Schema.encodeSync(Schema.parseJson(ConversationStore))(store));
    });
  }
}

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

const MemoziedConversation = Schema.Struct({
  parameters: ConversationParameters,
  prompt: Prompt.Prompt,

  // This is supposed to be Response.AllParts for arbitrary tools.
  // Tool call schema is generated based on the available tools so we can't use a static schema.
  response: Schema.Array(Schema.Unknown),
}).annotations({ identifier: 'MemoziedConversation' });
type MemoziedConversation = Schema.Schema.Type<typeof MemoziedConversation>;

const ConversationStore = Schema.Struct({
  conversations: Schema.Array(MemoziedConversation).pipe(Schema.mutable),
}).pipe(Schema.mutable);
type ConversationStore = Schema.Schema.Type<typeof ConversationStore>;

/**
 * Formats the conversation for diffing and displaying to the developer.
 * Doesn't need to be lossless.
 */
const formatMemoizedConversation = (conversation: MemoziedConversation, dynamicMatcher?: RegExp): string => {
  return (
    jsonStableStringify(
      {
        parameters: conversation.parameters,
        // Promps may contain long encrypted strings, which are not important to see. We sanitize them so that levenstein distance doesn't OOM.
        prompt: deepMapValues(
          normalizePromptForMemoization(cloneForMemoNormalization(conversation.prompt), dynamicMatcher),
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

const throwErrorWithClosestMatch = (store: MemoizedStore, conversation: MemoziedConversation) =>
  Effect.gen(function* () {
    if (!DISABLE_CLOSEST_MATCH_SEARCH) {
      const closestMatch = yield* store.getClosestMatch(conversation);
      if (Option.isSome(closestMatch)) {
        const patch = createPatch(
          'conversation',
          store.formatConversation(closestMatch.value),
          store.formatConversation(conversation),
          'saved',
          'new',
        );
        return yield* Effect.dieMessage(error(patch));
      }
    }

    return yield* Effect.dieMessage(error());
  });

const error = (patch?: string) =>
  [
    'No memoized conversation found for the given prompt.',
    'Re-run test with ALLOW_LLM_GENERATION=1 to generate a new memoized conversation.',
    patch && `Closest match: ${patch}`,
  ]
    .filter(Boolean)
    .join('\n');
