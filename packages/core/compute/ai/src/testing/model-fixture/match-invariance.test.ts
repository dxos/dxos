//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { invariant } from '@dxos/invariant';

import * as LanguageModelFixture from './LanguageModelFixture';

// Manual-tagged (opt-in, never runs in CI): a property/fuzz check that the fixture matcher is the
// load-bearing defence. Deterministic id generation only holds ids stable while the surrounding
// allocation order is unchanged, so an unrelated change to activation order silently drifts them;
// normalization must therefore make the match key invariant to id churn on its own. These tests
// assert that invariant directly, independent of any recorded fixture or seeded PRNG.

const { __testing, DEFAULT_DYNAMIC_VALUE_PATTERNS } = LanguageModelFixture;

/** Deterministic PRNG (mulberry32) so a failing seed reproduces exactly. */
const makeRng = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};

const pick = (rng: () => number, alphabet: string, length: number): string =>
  Array.from({ length }, () => alphabet[Math.floor(rng() * alphabet.length)]).join('');

// Same shapes the exported patterns match.
const SPACE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const ULID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const HEX = '0123456789abcdef';

const randSpaceId = (rng: () => number): string => `B${pick(rng, SPACE_ALPHABET, 32)}`;
const randEntityId = (rng: () => number): string => pick(rng, ULID_ALPHABET, 26);
const randUuid = (rng: () => number): string =>
  `${pick(rng, HEX, 8)}-${pick(rng, HEX, 4)}-${pick(rng, HEX, 4)}-${pick(rng, HEX, 4)}-${pick(rng, HEX, 12)}`;
const randTimestamp = (rng: () => number): string => new Date(Math.floor(rng() * 1_900_000_000_000)).toISOString();

type IdBundle = {
  spaceA: string;
  spaceB: string;
  entityA: string;
  entityB: string;
  uuid: string;
  timestamp: string;
};

const freshIds = (rng: () => number): IdBundle => ({
  spaceA: randSpaceId(rng),
  spaceB: randSpaceId(rng),
  entityA: randEntityId(rng),
  entityB: randEntityId(rng),
  uuid: randUuid(rng),
  timestamp: randTimestamp(rng),
});

// Embeds every id in the structural positions that broke in the field: a DXN (space + entity in one
// `echo://…/…` string), the same entity referenced twice, an id nested inside a tool-result JSON
// string, a bare UUID, and a timestamp outside a `timestamp` key.
const buildPrompt = (ids: IdBundle): unknown => ({
  content: [
    { role: 'user', content: `Query echo://${ids.spaceA}/${ids.entityA} then load ${ids.entityA}.` },
    {
      role: 'assistant',
      content: [
        { type: 'text', text: `Uploaded as ${ids.uuid}.` },
        {
          type: 'tool-result',
          result: `{"dxn":"echo://${ids.spaceB}/${ids.entityB}","createdAt":"${ids.timestamp}"}`,
        },
      ],
    },
  ],
});

describe('fixture match-key invariance (fuzz)', { tags: ['manual'] }, () => {
  const ROUNDS = 500;

  test('normalized key is invariant under a fresh, same-shape id substitution', ({ expect }) => {
    for (let seed = 0; seed < ROUNDS; seed++) {
      // Two independent id bundles → the concrete id VALUES differ, the STRUCTURE is identical.
      const left = __testing.normalizeForMatching(buildPrompt(freshIds(makeRng(seed))), DEFAULT_DYNAMIC_VALUE_PATTERNS);
      const right = __testing.normalizeForMatching(
        buildPrompt(freshIds(makeRng(seed ^ 0x9e3779b9))),
        DEFAULT_DYNAMIC_VALUE_PATTERNS,
      );
      expect(right, `seed ${seed}: normalization is not id-invariant`).toEqual(left);
    }
  });

  test('distinct ids do not collapse — repeated id is one placeholder, two ids are two', ({ expect }) => {
    const ids = freshIds(makeRng(42));
    // entityA appears twice, entityB once → normalized form must keep three distinct placeholder
    // occurrences with only two distinct placeholders, or a swapped-relationship prompt would falsely match.
    const oneEntity = __testing.normalizeForMatching(
      buildPrompt({ ...ids, entityB: ids.entityA }),
      DEFAULT_DYNAMIC_VALUE_PATTERNS,
    );
    const twoEntities = __testing.normalizeForMatching(buildPrompt(ids), DEFAULT_DYNAMIC_VALUE_PATTERNS);
    expect(twoEntities, 'collapsing distinct entity ids would produce false fixture hits').not.toEqual(oneEntity);
  });

  test('a space-shaped run flanked by more base32 chars is not matched', ({ expect }) => {
    // SPACE_ID_PATTERN's boundaries — (?<![A-Z2-7]) … (?![A-Z2-7]) — must reject a B…{32} run that is
    // only part of a longer token; otherwise normalization would corrupt an unrelated identifier.
    const embedded = [{ text: `A${`B${'A'.repeat(32)}`}A` }];
    expect(__testing.normalizeForMatching(embedded, DEFAULT_DYNAMIC_VALUE_PATTERNS)).toEqual(embedded);
  });
});

/** Walks up from a starting directory to the workspace root (nearest `pnpm-workspace.yaml`). */
const findRepoRoot = (start: string): string | undefined => {
  let current = start;
  for (let depth = 0; depth < 20; depth++) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
  return undefined;
};

const collectFixturePrompts = (): { suite: string; file: string; prompt: unknown }[] => {
  const root = findRepoRoot(dirname(fileURLToPath(import.meta.url)));
  const store = root && join(root, '.store', 'conversations');
  if (!store || !existsSync(store)) {
    return [];
  }
  const prompts: { suite: string; file: string; prompt: unknown }[] = [];
  for (const suite of readdirSync(store)) {
    const suiteDir = join(store, suite);
    for (const file of readdirSync(suiteDir)) {
      if (!file.endsWith('.json')) {
        continue;
      }
      const conversation = JSON.parse(readFileSync(join(suiteDir, file), 'utf-8'));
      if (conversation?.prompt !== undefined) {
        prompts.push({ suite, file, prompt: conversation.prompt });
      }
    }
  }
  return prompts;
};

// Fuzzes the invariant against every committed fixture prompt — the real corpus surfaces id FORMS a
// synthetic prompt might not (nested references, provider-specific fields). Replaces each run-varying
// token in the real prompt with a fresh same-shape value and asserts the normalized key is unchanged.
describe('fixture match-key invariance (real corpus)', { tags: ['manual'] }, () => {
  const fixtures = collectFixturePrompts();

  test('every committed fixture prompt has an id-invariant normalized key', ({ expect }) => {
    expect(fixtures.length, 'no committed fixtures found under .store/conversations').toBeGreaterThan(0);

    const matcher = __testing.buildDynamicMatcher(DEFAULT_DYNAMIC_VALUE_PATTERNS);
    invariant(matcher, 'default patterns must build a matcher');
    let mutatedCount = 0;
    for (const { suite, file, prompt } of fixtures) {
      const serialized = JSON.stringify(prompt);
      // Consistently remap every token the matcher recognizes to a fresh, same-shape value.
      const rng = makeRng(0xc0ffee);
      const remap = new Map<string, string>();
      const mutated = serialized.replace(new RegExp(matcher.source, matcher.flags), (token) => {
        const existing = remap.get(token);
        if (existing !== undefined) {
          return existing;
        }
        const replacement = sameShape(token, rng);
        remap.set(token, replacement);
        return replacement;
      });
      if (remap.size === 0) {
        continue; // Prompt carries no dynamic ids — nothing to fuzz.
      }
      mutatedCount++;
      const original = __testing.normalizeForMatching(prompt, DEFAULT_DYNAMIC_VALUE_PATTERNS);
      const churned = __testing.normalizeForMatching(JSON.parse(mutated), DEFAULT_DYNAMIC_VALUE_PATTERNS);
      expect(churned, `${suite}/${file.slice(0, 12)}: normalized key drifted under id churn`).toEqual(original);
    }
    expect(mutatedCount, 'no fixture prompt contained a dynamic id to fuzz').toBeGreaterThan(0);
  });
});

/** Produces a fresh value of the same shape as an existing matched token (space id / ULID / UUID / timestamp). */
const sameShape = (token: string, rng: () => number): string => {
  if (/^B[A-Z2-7]{32}$/.test(token)) {
    return randSpaceId(rng);
  }
  if (/^[0-9A-HJKMNP-TV-Z]{26}$/.test(token)) {
    return randEntityId(rng);
  }
  if (/^[0-9a-fA-F]{8}-/.test(token)) {
    return randUuid(rng);
  }
  return randTimestamp(rng);
};
