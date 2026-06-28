# NLP POS Parser & Decoration Extension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parse natural-language text into a per-word UPOS data structure (`@dxos/nlp`) and render it as live, per-word editor decorations via a span-oriented CodeMirror extension, demoed in a `plugin-transcription` story.

**Architecture:** Two decoupled parts. (1) A pure parser package: `text → Document` where the LLM (or a deterministic stub) returns `{ text, upos }` tokens and deterministic code aligns them to exact character offsets and stamps a `sourceHash`. (2) An editor extension whose `StateField` holds analyzed **spans** (`{ from, to, sourceHash, document }`), derives `Decoration.mark`s per UPOS tag, maps span ranges through edits, and re-hashes only edit-touched spans to detect divergence. The extension renders whatever state it holds; an optional reactive mode self-drives the parser on idle.

**Tech Stack:** TypeScript, Effect (`effect/Schema`, `effect/Effect`), `@dxos/ai` (`@effect/ai` `LanguageModel.generateObject`), CodeMirror 6 (`@codemirror/state`, `@codemirror/view`), `@dxos/ui-editor`, vitest, Storybook.

**Spec:** `packages/core/compute/nlp/DESIGN.md`.

---

## File Structure

**New package `@dxos/nlp`** (`packages/core/compute/nlp/`):
- `package.json`, `moon.yml`, `tsconfig.json` — scaffold (copy `transcription-pipeline`).
- `src/index.ts` — barrel.
- `src/Document.ts` — `Upos`, `Token`, `Sentence`, `Document` Effect schemas + types.
- `src/hash.ts` — `sourceHash` (FNV-1a).
- `src/align.ts` — `assembleDocument(sourceText, rawSentences)`: align surface forms → offsets, group sentences, stamp hash.
- `src/stub.ts` — `stubTag(text)`: deterministic rule/lexicon UPOS tagger → raw sentences.
- `src/parse.ts` — `parseText(text)`: Effect using `generateObject` → raw sentences; `parseDocument(text)` = `assembleDocument` ∘ tagger. Exposes `Parser` type `(text: string) => Promise<Document>`.
- `src/*.test.ts` — colocated tests.
- `src/testing/index.ts` — re-exports `stubParse` for consumers/stories.

**Extension** (`packages/ui/ui-editor/src/extensions/`):
- `pos.ts` — `posAnalysis` state field, `setAnalysis`/`clearAnalysis` effects, decorations, theme, reactive option, exported `pos()` extension factory.
- `pos.test.ts` — state-field + divergence tests.
- `index.ts` — add `export * from './pos';`.

**Story** (`packages/plugins/plugin-transcription/src/stories/`):
- `PosDecoration.stories.tsx` — markdown editor + `pos()` extension, reactive on, stub default, live-AI toggle.

---

## Task 1: Scaffold `@dxos/nlp` package

**Files:**
- Create: `packages/core/compute/nlp/package.json`
- Create: `packages/core/compute/nlp/moon.yml`
- Create: `packages/core/compute/nlp/tsconfig.json`
- Create: `packages/core/compute/nlp/src/index.ts`
- Create: `packages/core/compute/nlp/src/testing/index.ts`

- [ ] **Step 1: Create `package.json`**

Model on `packages/core/compute/transcription-pipeline/package.json`. Keep `"private": true`. Trim deps to what this package uses:

```json
{
  "name": "@dxos/nlp",
  "version": "0.9.0",
  "private": true,
  "description": "Natural-language parsing: per-word UPOS token structure for intention/transcript analysis.",
  "homepage": "https://dxos.org",
  "bugs": "https://github.com/dxos/dxos/issues",
  "repository": { "type": "git", "url": "https://github.com/dxos/dxos" },
  "license": "FSL-1.1-Apache-2.0",
  "author": "info@dxos.org",
  "sideEffects": false,
  "type": "module",
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/types/src/index.d.ts",
      "default": "./dist/lib/neutral/index.mjs"
    },
    "./testing": {
      "source": "./src/testing/index.ts",
      "types": "./dist/types/src/testing/index.d.ts",
      "default": "./dist/lib/neutral/testing/index.mjs"
    }
  },
  "types": "dist/types/src/index.d.ts",
  "files": ["dist", "src"],
  "dependencies": {
    "@dxos/ai": "workspace:*",
    "@dxos/effect": "workspace:*",
    "@dxos/invariant": "workspace:*",
    "@dxos/log": "workspace:*"
  },
  "devDependencies": { "effect": "catalog:" },
  "peerDependencies": { "effect": "catalog:", "@effect/ai": "catalog:" },
  "publishConfig": { "access": "restricted" },
  "beast": {}
}
```

- [ ] **Step 2: Create `moon.yml`** (copy `transcription-pipeline/moon.yml` verbatim — same two entrypoints `src/index.ts`, `src/testing/index.ts`, `--platform=neutral`).

- [ ] **Step 3: Create `tsconfig.json`** — extend `../../../../tsconfig.base.json`, `include: ["src"]`, and add `references` to the packages this depends on: `../../../common/effect`, `../../../common/invariant`, `../../../common/log`, `../ai`. (Mirror the relative-path style in `transcription-pipeline/tsconfig.json`.)

- [ ] **Step 4: Create placeholder barrels** so the build has entrypoints:

```ts
// src/index.ts
//
// Copyright 2026 DXOS.org
//

export * from './Document';
```

```ts
// src/testing/index.ts
//
// Copyright 2026 DXOS.org
//

export { stubParse } from '../parse';
```

- [ ] **Step 5: Install workspace + verify it resolves**

Run: `CI=true pnpm install`
Then: `moon run nlp:build`
Expected: build fails only on missing `./Document`/`./parse` modules (created next), not on package wiring. (It is fine for this step to fail compilation; the goal is that moon recognizes the `nlp` project.) Confirm recognition with `moon query projects | grep nlp` → prints `nlp`.

- [ ] **Step 6: Commit**

```bash
git add packages/core/compute/nlp pnpm-lock.yaml
git commit -m "feat(nlp): scaffold @dxos/nlp package"
```

---

## Task 2: Document schema + source hash

**Files:**
- Create: `packages/core/compute/nlp/src/Document.ts`
- Create: `packages/core/compute/nlp/src/hash.ts`
- Test: `packages/core/compute/nlp/src/hash.test.ts`

- [ ] **Step 1: Write the failing hash test**

```ts
// src/hash.test.ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { sourceHash } from './hash';

describe('sourceHash', () => {
  test('is stable and order-sensitive', ({ expect }) => {
    expect(sourceHash('the lazy dog')).toBe(sourceHash('the lazy dog'));
    expect(sourceHash('the lazy dog')).not.toBe(sourceHash('the dog lazy'));
  });

  test('empty string hashes deterministically', ({ expect }) => {
    expect(sourceHash('')).toBe(sourceHash(''));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run nlp:test -- src/hash.test.ts`
Expected: FAIL — cannot resolve `./hash`.

- [ ] **Step 3: Implement `hash.ts` (FNV-1a, 32-bit, hex)**

```ts
// src/hash.ts
//
// Copyright 2026 DXOS.org
//

/**
 * Fast non-cryptographic hash (FNV-1a, 32-bit) of source text. Used purely to detect whether an
 * analyzed span still matches the current editor text — change detection, not security.
 */
export const sourceHash = (text: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `moon run nlp:test -- src/hash.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement `Document.ts` schema**

```ts
// src/Document.ts
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/** Universal POS tagset (17 tags). https://universaldependencies.org/u/pos/ */
export const Upos = Schema.Literal(
  'ADJ', 'ADP', 'ADV', 'AUX', 'CCONJ', 'DET', 'INTJ', 'NOUN', 'NUM',
  'PART', 'PRON', 'PROPN', 'PUNCT', 'SCONJ', 'SYM', 'VERB', 'X',
);
export type Upos = Schema.Schema.Type<typeof Upos>;

/** A single word/punctuation token. `start`/`end` are character offsets within the source text. */
export const Token = Schema.Struct({
  index: Schema.Number.annotations({ description: 'Position of the token within its sentence.' }),
  text: Schema.String.annotations({ description: 'Surface form exactly as it appears in the source.' }),
  upos: Upos.annotations({ description: 'Universal part-of-speech tag.' }),
  start: Schema.Number,
  end: Schema.Number,
});
export type Token = Schema.Schema.Type<typeof Token>;

export const Sentence = Schema.Struct({
  index: Schema.Number,
  start: Schema.Number,
  end: Schema.Number,
  tokens: Schema.Array(Token),
});
export type Sentence = Schema.Schema.Type<typeof Sentence>;

/** A parsed document. `sourceHash` is the divergence signal; `timestamp` is debug-only. */
export const Document = Schema.Struct({
  sourceHash: Schema.String,
  sentences: Schema.Array(Sentence),
  timestamp: Schema.optional(Schema.Number),
});
export type Document = Schema.Schema.Type<typeof Document>;

/** Raw, offset-free output of a tagger before alignment. */
export type RawSentence = { tokens: { text: string; upos: Upos }[] };
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/compute/nlp/src/Document.ts packages/core/compute/nlp/src/hash.ts packages/core/compute/nlp/src/hash.test.ts
git commit -m "feat(nlp): Document schema and source hash"
```

---

## Task 3: Deterministic alignment (`assembleDocument`)

Aligns offset-free `RawSentence[]` against the source string to produce a `Document` with exact offsets. The LLM never emits offsets; this is the "code does arithmetic" half.

**Files:**
- Create: `packages/core/compute/nlp/src/align.ts`
- Test: `packages/core/compute/nlp/src/align.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/align.test.ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { assembleDocument } from './align';
import { sourceHash } from './hash';

describe('assembleDocument', () => {
  test('assigns exact offsets to each token', ({ expect }) => {
    const source = 'The dog barks.';
    const doc = assembleDocument(source, [
      { tokens: [
        { text: 'The', upos: 'DET' },
        { text: 'dog', upos: 'NOUN' },
        { text: 'barks', upos: 'VERB' },
        { text: '.', upos: 'PUNCT' },
      ] },
    ]);

    const [sentence] = doc.sentences;
    expect(sentence.tokens.map((t) => source.slice(t.start, t.end))).toEqual(['The', 'dog', 'barks', '.']);
    expect(sentence.tokens.map((t) => t.index)).toEqual([0, 1, 2, 3]);
    expect(sentence.start).toBe(0);
    expect(sentence.end).toBe(14);
    expect(doc.sourceHash).toBe(sourceHash(source));
  });

  test('handles repeated words by scanning forward (no re-match of earlier occurrence)', ({ expect }) => {
    const source = 'dog dog';
    const doc = assembleDocument(source, [
      { tokens: [
        { text: 'dog', upos: 'NOUN' },
        { text: 'dog', upos: 'NOUN' },
      ] },
    ]);
    expect(doc.sentences[0].tokens.map((t) => t.start)).toEqual([0, 4]);
  });

  test('skips tokens not found in source rather than throwing', ({ expect }) => {
    const source = 'hello world';
    const doc = assembleDocument(source, [
      { tokens: [
        { text: 'hello', upos: 'INTJ' },
        { text: 'GHOST', upos: 'X' },
        { text: 'world', upos: 'NOUN' },
      ] },
    ]);
    expect(doc.sentences[0].tokens.map((t) => t.text)).toEqual(['hello', 'world']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run nlp:test -- src/align.test.ts`
Expected: FAIL — cannot resolve `./align`.

- [ ] **Step 3: Implement `align.ts`**

```ts
// src/align.ts
//
// Copyright 2026 DXOS.org
//

import { type Document, type RawSentence, type Sentence, type Token } from './Document';
import { sourceHash } from './hash';

/**
 * Align offset-free tagger output against the source text to compute exact character offsets.
 * A single forward cursor guarantees repeated surface forms map to successive occurrences rather
 * than re-matching the first. Tokens whose surface form cannot be located ahead of the cursor are
 * dropped (the tagger hallucinated a token), keeping offsets internally consistent.
 */
export const assembleDocument = (sourceText: string, rawSentences: readonly RawSentence[]): Document => {
  let cursor = 0;
  const sentences: Sentence[] = [];

  rawSentences.forEach((raw, sentenceIndex) => {
    const tokens: Token[] = [];
    for (const { text, upos } of raw.tokens) {
      const start = sourceText.indexOf(text, cursor);
      if (start < 0) {
        continue;
      }
      const end = start + text.length;
      tokens.push({ index: tokens.length, text, upos, start, end });
      cursor = end;
    }
    if (tokens.length > 0) {
      sentences.push({ index: sentenceIndex, start: tokens[0].start, end: tokens[tokens.length - 1].end, tokens });
    }
  });

  return { sourceHash: sourceHash(sourceText), sentences, timestamp: undefined };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `moon run nlp:test -- src/align.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/compute/nlp/src/align.ts packages/core/compute/nlp/src/align.test.ts
git commit -m "feat(nlp): deterministic token-to-offset alignment"
```

---

## Task 4: Deterministic stub tagger + `stubParse`

Offline UPOS tagger (lexicon + suffix heuristics) so stories and tests need no API key — matching the pipeline-stub convention.

**Files:**
- Create: `packages/core/compute/nlp/src/stub.ts`
- Test: `packages/core/compute/nlp/src/stub.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/stub.test.ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { stubParse, stubTag } from './stub';

describe('stubTag', () => {
  test('tags closed-class words from the lexicon and splits sentences', ({ expect }) => {
    const sentences = stubTag('The dog runs. It barks!');
    expect(sentences).toHaveLength(2);
    const first = sentences[0].tokens;
    expect(first.find((t) => t.text === 'The')?.upos).toBe('DET');
    expect(first.find((t) => t.text === '.')?.upos).toBe('PUNCT');
  });

  test('tags capitalized non-initial words as PROPN', ({ expect }) => {
    const [sentence] = stubTag('I met Alice today');
    expect(sentence.tokens.find((t) => t.text === 'Alice')?.upos).toBe('PROPN');
  });
});

describe('stubParse', () => {
  test('returns an aligned Document with exact offsets', async ({ expect }) => {
    const source = 'The dog runs.';
    const doc = await stubParse(source);
    expect(doc.sourceHash).toBeTypeOf('string');
    expect(doc.sentences[0].tokens.map((t) => source.slice(t.start, t.end))).toContain('dog');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run nlp:test -- src/stub.test.ts`
Expected: FAIL — cannot resolve `./stub`.

- [ ] **Step 3: Implement `stub.ts`**

```ts
// src/stub.ts
//
// Copyright 2026 DXOS.org
//

import { type Document, type RawSentence, type Upos } from './Document';
import { assembleDocument } from './align';

// Closed-class lexicon: small, deterministic, language-is-English assumption (the stub is a demo
// fallback, not the production tagger). Lowercased keys.
const LEXICON: Record<string, Upos> = {
  the: 'DET', a: 'DET', an: 'DET', this: 'DET', that: 'DET', these: 'DET', those: 'DET',
  i: 'PRON', you: 'PRON', he: 'PRON', she: 'PRON', it: 'PRON', we: 'PRON', they: 'PRON',
  is: 'AUX', am: 'AUX', are: 'AUX', was: 'AUX', were: 'AUX', be: 'AUX', been: 'AUX', do: 'AUX', did: 'AUX',
  in: 'ADP', on: 'ADP', at: 'ADP', of: 'ADP', to: 'ADP', over: 'ADP', under: 'ADP', with: 'ADP', for: 'ADP',
  and: 'CCONJ', or: 'CCONJ', but: 'CCONJ',
  because: 'SCONJ', if: 'SCONJ', while: 'SCONJ', although: 'SCONJ',
  not: 'PART', very: 'ADV', quickly: 'ADV', well: 'ADV',
  oh: 'INTJ', yes: 'INTJ', no: 'INTJ',
};

const WORD_RE = /[A-Za-z]+(?:'[A-Za-z]+)?|[0-9]+|[.!?,;:]/g;

/** Tag one token by lexicon → number → suffix heuristic → capitalization. `initial` = sentence start. */
const tagWord = (raw: string, initial: boolean): Upos => {
  if (/^[.!?,;:]$/.test(raw)) {
    return 'PUNCT';
  }
  if (/^[0-9]+$/.test(raw)) {
    return 'NUM';
  }
  const lower = raw.toLowerCase();
  if (LEXICON[lower]) {
    return LEXICON[lower];
  }
  if (/^[A-Z]/.test(raw) && !initial) {
    return 'PROPN';
  }
  if (/(ing|ed|ize|ise)$/.test(lower)) {
    return 'VERB';
  }
  if (/(ly)$/.test(lower)) {
    return 'ADV';
  }
  if (/(ous|ful|ive|able|al)$/.test(lower)) {
    return 'ADJ';
  }
  return 'NOUN';
};

/** Deterministic UPOS tagger: splits on sentence-final punctuation, tags each token. */
export const stubTag = (text: string): RawSentence[] => {
  const sentences: RawSentence[] = [];
  let tokens: RawSentence['tokens'] = [];
  let initial = true;
  for (const match of text.matchAll(WORD_RE)) {
    const raw = match[0];
    tokens.push({ text: raw, upos: tagWord(raw, initial) });
    initial = false;
    if (/^[.!?]$/.test(raw)) {
      sentences.push({ tokens });
      tokens = [];
      initial = true;
    }
  }
  if (tokens.length > 0) {
    sentences.push({ tokens });
  }
  return sentences;
};

/** Parser-shaped wrapper around the stub tagger (async to match the `Parser` contract). */
export const stubParse = async (text: string): Promise<Document> => assembleDocument(text, stubTag(text));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `moon run nlp:test -- src/stub.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/compute/nlp/src/stub.ts packages/core/compute/nlp/src/stub.test.ts
git commit -m "feat(nlp): deterministic offline UPOS stub tagger"
```

---

## Task 5: Live AI parser (`parseText` / `parseDocument`)

LLM produces offset-free `RawSentence[]`; alignment (Task 3) computes offsets. Mirrors `proper-noun-extraction.ts` (`LanguageModel.generateObject` + `AiService.model`).

**Files:**
- Create: `packages/core/compute/nlp/src/parse.ts`
- Modify: `packages/core/compute/nlp/src/index.ts` (export parser surface)
- Modify: `packages/core/compute/nlp/src/testing/index.ts` (already exports `stubParse`)
- Test: `packages/core/compute/nlp/src/parse.test.ts`

- [ ] **Step 1: Implement `parse.ts`**

```ts
// src/parse.ts
//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';

import { type Document, Upos } from './Document';
import { assembleDocument } from './align';
import { stubParse } from './stub';

const PARSE_MODEL = 'ai.claude.model.claude-haiku-4-5';

/** LLM output schema: sentences → tokens, no offsets (alignment computes those). */
const TaggedSentences = Schema.Struct({
  sentences: Schema.Array(
    Schema.Struct({
      tokens: Schema.Array(
        Schema.Struct({
          text: Schema.String.annotations({ description: 'Token surface form exactly as in the source.' }),
          upos: Upos.annotations({ description: 'Universal POS tag for the token.' }),
        }),
      ),
    }),
  ),
});

/**
 * Tag `text` with UPOS via a small LLM, then deterministically align tokens to source offsets.
 * Provides the LanguageModel internally; residual requirement is {@link AiService.AiService}.
 */
export const parseText = (text: string): Effect.Effect<Document, never, AiService.AiService> =>
  Effect.gen(function* () {
    const { value } = yield* Effect.scoped(
      LanguageModel.generateObject({
        schema: TaggedSentences,
        prompt: [
          'Tokenize the text below into sentences and tokens, and tag each token with its',
          'Universal POS tag (UPOS): ADJ ADP ADV AUX CCONJ DET INTJ NOUN NUM PART PRON PROPN',
          'PUNCT SCONJ SYM VERB X. Return each token surface form exactly as it appears, in order,',
          'including punctuation as its own PUNCT token. Do not add or omit tokens.',
          '',
          'Text:',
          text,
        ].join('\n'),
      }),
    );
    return assembleDocument(text, value.sentences as any);
  }).pipe(Effect.provide(AiService.model(PARSE_MODEL)));

/** The pluggable parser contract consumed by the editor extension and pipeline. */
export type Parser = (text: string) => Promise<Document>;

export { stubParse };
```

Note on the `as any`: `value.sentences` is the validated `TaggedSentences` shape; `assembleDocument` accepts `readonly RawSentence[]`. These are structurally identical (`{ tokens: { text; upos }[] }`). Prefer removing the cast by typing the parameter against the schema type: change the line to `assembleDocument(text, value.sentences)` and confirm it typechecks; only keep the cast if `effect/Schema`'s `readonly`/branding makes them incompatible, in which case add a one-line comment. **Audit before commit per CLAUDE.md.**

- [ ] **Step 2: Update `src/index.ts`**

```ts
// src/index.ts
//
// Copyright 2026 DXOS.org
//

export * from './Document';
export * from './align';
export * from './hash';
export { parseText, stubParse, type Parser } from './parse';
```

- [ ] **Step 3: Write the parser test (assembly seam, no live key required)**

The LLM call itself is covered by the memoized-llm harness if/when wired; here assert the deterministic seam the parser depends on, so the suite is hermetic.

```ts
// src/parse.test.ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { assembleDocument } from './align';
import { type Parser, stubParse } from './parse';

describe('parser seam', () => {
  test('stubParse satisfies the Parser contract', async ({ expect }) => {
    const parser: Parser = stubParse;
    const doc = await parser('The cat sleeps.');
    expect(doc.sentences[0].tokens.length).toBeGreaterThan(0);
  });

  test('alignment over model-shaped output yields exact offsets', ({ expect }) => {
    const source = 'Alice runs fast.';
    const doc = assembleDocument(source, [
      { tokens: [
        { text: 'Alice', upos: 'PROPN' },
        { text: 'runs', upos: 'VERB' },
        { text: 'fast', upos: 'ADV' },
        { text: '.', upos: 'PUNCT' },
      ] },
    ]);
    expect(doc.sentences[0].tokens.map((t) => source.slice(t.start, t.end))).toEqual(['Alice', 'runs', 'fast', '.']);
  });
});
```

> If you choose to add a live-model test, follow the **regenerate-memoized-llm** / **testing-assistant-conversations** skills to record the fixture; do not call the real API in CI.

- [ ] **Step 4: Run tests + build**

Run: `moon run nlp:test`
Expected: PASS (all nlp suites).
Run: `moon run nlp:build`
Expected: build succeeds.

- [ ] **Step 5: Cast audit + commit**

Run: `git diff origin/main -- packages/core/compute/nlp | grep -nE '\bas (any|unknown|[A-Z])|as unknown as' || echo "no casts"`
Resolve any hit (prefer removing the `value.sentences` cast). Then:

```bash
git add packages/core/compute/nlp/src/parse.ts packages/core/compute/nlp/src/parse.test.ts packages/core/compute/nlp/src/index.ts
git commit -m "feat(nlp): LLM UPOS parser over deterministic alignment"
```

---

## Task 6: `pos` state field + set/clear effects (span tracking)

The editor-side state: a `StateField` of analyzed spans, mapped through edits, settable/clearable via effects. Models `comments.ts` (`StateField` + `StateEffect` + `decorations.compute`) but tracks plain offsets mapped through `tr.changes`.

**Files:**
- Create: `packages/ui/ui-editor/src/extensions/pos.ts`
- Test: `packages/ui/ui-editor/src/extensions/pos.test.ts`

- [ ] **Step 1: Write the failing state-field test**

```ts
// src/extensions/pos.test.ts
//
// Copyright 2026 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { describe, test } from 'vitest';

import { type Document } from '@dxos/nlp';

import { clearAnalysis, posAnalysisField, posSpans, setAnalysis } from './pos';

const docFor = (text: string): Document => ({
  sourceHash: 'deadbeef',
  sentences: [{ index: 0, start: 0, end: text.length, tokens: [
    { index: 0, text, upos: 'NOUN', start: 0, end: text.length },
  ] }],
});

describe('posAnalysisField', () => {
  const make = (doc = 'hello world') => EditorState.create({ doc, extensions: [posAnalysisField] });

  test('setAnalysis adds a span', ({ expect }) => {
    const state = make().update({ effects: setAnalysis.of({ from: 0, to: 5, document: docFor('hello') }) }).state;
    expect(posSpans(state)).toHaveLength(1);
    expect(posSpans(state)[0]).toMatchObject({ from: 0, to: 5, stale: false });
  });

  test('span offsets are mapped through an insertion before them', ({ expect }) => {
    const added = make().update({ effects: setAnalysis.of({ from: 6, to: 11, document: docFor('world') }) }).state;
    const moved = EditorState.create({ doc: added.doc, extensions: [posAnalysisField] });
    // Simulate mapping via a transaction that inserts 3 chars at offset 0.
    const tr = added.update({ changes: { from: 0, insert: 'XXX' } });
    expect(posSpans(tr.state)[0]).toMatchObject({ from: 9, to: 14 });
    expect(moved).toBeDefined();
  });

  test('clearAnalysis removes all spans', ({ expect }) => {
    const withSpan = make().update({ effects: setAnalysis.of({ from: 0, to: 5, document: docFor('hello') }) }).state;
    const cleared = withSpan.update({ effects: clearAnalysis.of(null) }).state;
    expect(posSpans(cleared)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run ui-editor:test -- src/extensions/pos.test.ts`
Expected: FAIL — cannot resolve `./pos`.

- [ ] **Step 3: Implement the state field in `pos.ts`** (decorations/theme/reactive added in later tasks; keep this file growing)

```ts
// src/extensions/pos.ts
//
// Copyright 2026 DXOS.org
//

import { StateEffect, StateField } from '@codemirror/state';

import { type Document } from '@dxos/nlp';

/** One analyzed region of the document. `document` offsets are relative to the span's own text. */
export type PosSpan = {
  from: number;
  to: number;
  /** Hash of the source text the analysis covers; compared to live text to detect divergence. */
  sourceHash: string;
  document: Document;
  /** True once the underlying text diverged from `sourceHash` (decorations render dimmed). */
  stale: boolean;
};

/** Replace/add the analysis for a region. */
export const setAnalysis = StateEffect.define<{ from: number; to: number; document: Document }>();

/** Remove all analysis spans. */
export const clearAnalysis = StateEffect.define<null>();

/** Internal: mark a span stale (dispatched by the reactive driver on divergence). */
export const markStale = StateEffect.define<{ from: number; to: number }>();

export const posAnalysisField = StateField.define<PosSpan[]>({
  create: () => [],
  update: (spans, tr) => {
    let next = spans;

    // Map existing span ranges through document changes so anchors follow edits.
    if (tr.docChanged) {
      next = next.map((span) => ({
        ...span,
        from: tr.changes.mapPos(span.from, 1),
        to: tr.changes.mapPos(span.to, -1),
      }));
    }

    for (const effect of tr.effects) {
      if (effect.is(setAnalysis)) {
        const { from, to, document } = effect.value;
        // Replace any span at the same anchor; otherwise append.
        const without = next.filter((span) => !(span.from === from && span.to === to));
        next = [...without, { from, to, sourceHash: document.sourceHash, document, stale: false }];
      } else if (effect.is(clearAnalysis)) {
        next = [];
      } else if (effect.is(markStale)) {
        const { from, to } = effect.value;
        next = next.map((span) => (span.from === from && span.to === to ? { ...span, stale: true } : span));
      }
    }

    return next;
  },
});

/** Read the current analysis spans from editor state. */
export const posSpans = (state: { field: (f: typeof posAnalysisField) => PosSpan[] }): PosSpan[] =>
  state.field(posAnalysisField);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `moon run ui-editor:test -- src/extensions/pos.test.ts`
Expected: PASS (3 tests). (If `posSpans`' structural param type is awkward, type it as `(state: EditorState)` importing `EditorState` from `@codemirror/state`.)

- [ ] **Step 5: Commit**

```bash
git add packages/ui/ui-editor/src/extensions/pos.ts packages/ui/ui-editor/src/extensions/pos.test.ts
git commit -m "feat(ui-editor): pos analysis state field with span mapping"
```

---

## Task 7: Per-UPOS decorations + theme + stale dimming

**Files:**
- Modify: `packages/ui/ui-editor/src/extensions/pos.ts`
- Test: `packages/ui/ui-editor/src/extensions/pos.test.ts` (add a decorations case)

- [ ] **Step 1: Add a failing decorations test** (append to the existing suite)

```ts
import { EditorView } from '@codemirror/view';

import { posDecorations } from './pos';

describe('posDecorations', () => {
  test('emits one mark per token at absolute offsets', ({ expect }) => {
    const text = 'hello world';
    let state = EditorState.create({ doc: text, extensions: [posAnalysisField, posDecorations] });
    const document: Document = {
      sourceHash: 'deadbeef',
      sentences: [{ index: 0, start: 0, end: 11, tokens: [
        { index: 0, text: 'hello', upos: 'INTJ', start: 0, end: 5 },
        { index: 1, text: 'world', upos: 'NOUN', start: 6, end: 11 },
      ] }],
    };
    state = state.update({ effects: setAnalysis.of({ from: 0, to: 11, document }) }).state;
    const decos = state.facet(EditorView.decorations);
    expect(decos.length).toBeGreaterThan(0);
  });
});
```

> `EditorView.decorations` is a facet of decoration *sources*; asserting non-empty is the hermetic check (full range inspection requires a mounted view). If you prefer, mount a view with a DOM container and assert `document.querySelectorAll('.cm-pos-NOUN')` — only do this if `ui-editor` tests already use jsdom; otherwise keep the facet assertion.

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run ui-editor:test -- src/extensions/pos.test.ts`
Expected: FAIL — `posDecorations` not exported.

- [ ] **Step 3: Add decorations + theme to `pos.ts`**

```ts
// Append to pos.ts.

import { type Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';

import { type Upos } from '@dxos/nlp';

/** One mark per UPOS tag; CSS class drives color (see `posTheme`). Stale spans add `cm-pos-stale`. */
const posMark = (upos: Upos, stale: boolean) =>
  Decoration.mark({ class: ['cm-pos', `cm-pos-${upos}`, stale && 'cm-pos-stale'].filter(Boolean).join(' ') });

export const posDecorations = EditorView.decorations.compute([posAnalysisField], (state) => {
  const builder = new RangeSetBuilder<Decoration>();
  const spans = state.field(posAnalysisField);
  // Tokens are span-relative; absolute offset = span.from + token.start. Sort by absolute start.
  const marks = spans
    .flatMap((span) =>
      span.document.sentences.flatMap((sentence) =>
        sentence.tokens.map((token) => ({
          from: span.from + token.start,
          to: span.from + token.end,
          deco: posMark(token.upos, span.stale),
        })),
      ),
    )
    .filter((mark) => mark.to <= state.doc.length && mark.from < mark.to)
    .sort((a, b) => a.from - b.from || a.to - b.to);
  for (const mark of marks) {
    builder.add(mark.from, mark.to, mark.deco);
  }
  return builder.finish();
});

// UPOS → ui-theme hue. Content classes (NOUN/VERB/ADJ/ADV/PROPN/NUM) get distinct hues; function
// words share muted hues; PUNCT/SYM/X are unstyled.
const POS_HUE: Partial<Record<Upos, string>> = {
  NOUN: 'blue', PROPN: 'indigo', VERB: 'red', ADJ: 'green', ADV: 'amber', NUM: 'cyan',
  PRON: 'neutral', DET: 'neutral', ADP: 'neutral', AUX: 'neutral',
  CCONJ: 'neutral', SCONJ: 'neutral', PART: 'neutral', INTJ: 'pink',
};

export const posTheme = (): Extension =>
  EditorView.theme({
    '.cm-pos': { borderRadius: '0.125rem' },
    ...Object.fromEntries(
      Object.entries(POS_HUE).map(([upos, hue]) => [
        `.cm-pos-${upos}`,
        { borderBottom: `2px solid var(--color-${hue}-500)` },
      ]),
    ),
    '.cm-pos-stale': { opacity: '0.4' },
  });
```

> Confirm the `--color-<hue>-500` token names against `@dxos/ui-theme` (the `hues` export used in `marker.ts`). If the scale differs (e.g. `-surface`/`-fg` like `marker.ts`), use those token names instead. Do **not** invent token names.

- [ ] **Step 4: Run test to verify it passes**

Run: `moon run ui-editor:test -- src/extensions/pos.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/ui-editor/src/extensions/pos.ts packages/ui/ui-editor/src/extensions/pos.test.ts
git commit -m "feat(ui-editor): per-UPOS decorations, theme, stale dimming"
```

---

## Task 8: Reactive driver + divergence re-hash + `pos()` factory

Adds the optional reactive mode (debounced self-parse) and per-span divergence detection (re-hash only edit-touched spans), plus the public `pos()` extension factory bundling field + decorations + theme + (optional) reactive driver.

**Files:**
- Modify: `packages/ui/ui-editor/src/extensions/pos.ts`
- Test: `packages/ui/ui-editor/src/extensions/pos.test.ts` (add divergence case)

- [ ] **Step 1: Add a failing divergence test**

```ts
import { sourceHash } from '@dxos/nlp';

import { spanDiverged } from './pos';

describe('spanDiverged', () => {
  test('detects when live span text no longer matches the stored hash', ({ expect }) => {
    const text = 'hello world';
    const span = { from: 0, to: 5, sourceHash: sourceHash('hello'), document: {} as any, stale: false };
    expect(spanDiverged(text, span)).toBe(false);
    expect(spanDiverged('hELLo world', span)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run ui-editor:test -- src/extensions/pos.test.ts`
Expected: FAIL — `spanDiverged` not exported.

- [ ] **Step 3: Add divergence helper, reactive driver, and factory to `pos.ts`**

```ts
// Append to pos.ts.

import { type ViewUpdate } from '@codemirror/view';
import { sourceHash, type Document } from '@dxos/nlp';
import { debounce } from '@dxos/async';

/** A span has diverged when the current text under its (mapped) range no longer matches its hash. */
export const spanDiverged = (docText: string, span: { from: number; to: number; sourceHash: string }): boolean =>
  sourceHash(docText.slice(span.from, span.to)) !== span.sourceHash;

export type PosOptions = {
  /** When set, the extension self-parses on idle and dispatches `setAnalysis`. */
  parse?: (text: string) => Promise<Document>;
  /** Idle debounce before reactive parsing (ms). */
  debounceMs?: number;
};

/**
 * Reactive driver: on doc change, mark edit-touched spans stale (immediate visual feedback), then
 * after idle re-parse the whole document as a single span and dispatch fresh analysis. Re-hashing
 * is bounded to touched spans via `spanDiverged`.
 */
const reactiveDriver = (parse: NonNullable<PosOptions['parse']>, debounceMs: number) =>
  EditorView.updateListener.of((() => {
    const run = debounce((view: EditorView) => {
      const text = view.state.doc.toString();
      void parse(text).then((document) => {
        view.dispatch({ effects: setAnalysis.of({ from: 0, to: text.length, document }) });
      });
    }, debounceMs);

    return (update: ViewUpdate) => {
      if (!update.docChanged) {
        return;
      }
      // Immediate: mark any diverged span stale so its decorations dim until the re-parse lands.
      const text = update.state.doc.toString();
      const effects = update.state
        .field(posAnalysisField)
        .filter((span) => !span.stale && spanDiverged(text, span))
        .map((span) => markStale.of({ from: span.from, to: span.to }));
      if (effects.length > 0) {
        update.view.dispatch({ effects });
      }
      run(update.view);
    };
  })());

/**
 * Part-of-speech decoration extension. Renders per-word UPOS marks from analysis state held in a
 * span-oriented state field. State can be set externally via `setAnalysis`/`clearAnalysis`, or — when
 * `options.parse` is supplied — self-driven on idle (reactive mode).
 */
export const pos = (options: PosOptions = {}): Extension => {
  const extensions: Extension[] = [posAnalysisField, posDecorations, posTheme()];
  if (options.parse) {
    extensions.push(reactiveDriver(options.parse, options.debounceMs ?? 500));
  }
  return extensions;
};
```

> Verify `debounce` is exported from `@dxos/async` (it is used in `comments.ts`). Add `@dxos/nlp` and (if missing) `@dxos/async` to `packages/ui/ui-editor/package.json` dependencies as `workspace:*` and to `tsconfig.json` references.

- [ ] **Step 4: Run test + build**

Run: `moon run ui-editor:test -- src/extensions/pos.test.ts`
Expected: PASS (all pos cases).
Run: `moon run ui-editor:build`
Expected: build succeeds.

- [ ] **Step 5: Export from the package barrel**

Add to `packages/ui/ui-editor/src/extensions/index.ts`:

```ts
export * from './pos';
```

- [ ] **Step 6: Cast audit + commit**

Run: `git diff origin/main -- packages/ui/ui-editor | grep -nE '\bas (any|unknown|[A-Z])|as unknown as' || echo "no casts"`
(The test's `{} as any` document stub is test-only; acceptable, but prefer a minimal real `Document`.) Then:

```bash
git add packages/ui/ui-editor/src/extensions/pos.ts packages/ui/ui-editor/src/extensions/pos.test.ts packages/ui/ui-editor/src/extensions/index.ts packages/ui/ui-editor/package.json packages/ui/ui-editor/tsconfig.json packages/ui/ui-editor/src/extensions/pos.test.ts
git commit -m "feat(ui-editor): reactive pos driver, divergence detection, pos() factory"
```

---

## Task 9: Story in `plugin-transcription`

A markdown editor with the `pos()` extension in reactive mode, defaulting to the offline stub with a toggle to the live AI parser. Demonstrates per-word decorations recomputing on edit and dimming on divergence.

**Files:**
- Create: `packages/plugins/plugin-transcription/src/stories/PosDecoration.stories.tsx`
- Modify: `packages/plugins/plugin-transcription/package.json` (add `@dxos/nlp` as `workspace:*` dep; add to `tsconfig.json` references)

- [ ] **Step 1: Add the dependency**

Run: `pnpm add --filter "@dxos/plugin-transcription" @dxos/nlp@workspace:*`
(Confirm it lands as `"@dxos/nlp": "workspace:*"` per CLAUDE.md; add the `tsconfig.json` reference to `../../core/compute/nlp`.)

- [ ] **Step 2: Write the story**

Use the project's editor-story idiom. Prefer the lightweight `useTextEditor` hook from `@dxos/react-ui-editor` (search for an existing minimal editor story, e.g. in `react-ui-editor/src/stories`, and mirror its setup) rather than the full plugin-manager harness in `MarkdownTranscription.stories.tsx`.

```tsx
//
// Copyright 2026 DXOS.org
//

import '@dxos/react-ui-theme/dx-tailwind.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { AiService } from '@dxos/ai';
import { parseText, stubParse, type Parser } from '@dxos/nlp';
import { useThemeContext } from '@dxos/react-ui';
import { createBasicExtensions, createThemeExtensions, useTextEditor } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { pos } from '@dxos/ui-editor';

const SAMPLE = [
  '# Parts of speech',
  '',
  'The quick brown fox jumped over the lazy dog.',
  '',
  'Alice met Bob in Munich and they discussed the project quickly.',
].join('\n');

// Live parser requires an AiService runtime; wire it only if the story is run with a key.
const liveParse: Parser = (text) => {
  throw new Error('Live parser requires an AiService layer; enable via story controls once wired.');
  return Promise.resolve(undefined as any);
};

const Story = ({ live }: { live: boolean }) => {
  const { themeMode } = useThemeContext();
  const parser = useMemo<Parser>(() => (live ? liveParse : stubParse), [live]);
  const { parentRef } = useTextEditor(
    () => ({
      initialValue: SAMPLE,
      extensions: [
        createBasicExtensions(),
        createThemeExtensions({ themeMode }),
        pos({ parse: parser, debounceMs: 400 }),
      ],
    }),
    [themeMode, parser],
  );

  return <div ref={parentRef} className='is-full bs-full' />;
};

const meta: Meta<typeof Story> = {
  title: 'plugins/plugin-transcription/PosDecoration',
  render: Story,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  args: { live: false },
};

export default meta;

export const Default: StoryObj<typeof Story> = {};
```

> The exact editor-extension helper names (`createBasicExtensions`, `createThemeExtensions`, `useTextEditor`) and the live-AI wiring should be matched to existing stories in `react-ui-editor` and `MarkdownTranscription.stories.tsx`. If wiring a live `AiService` layer into a story is non-trivial, keep `live=false` as the only working path and leave a clear `// TODO(seam): provide AiService layer to enable live parsing` — the stub is the demoable path. Replace the `undefined as any` placeholder before commit (it exists only to keep the unused branch typed; better: make `liveParse` `undefined` and guard the toggle).

- [ ] **Step 3: Verify the story renders**

Run the worktree storybook on a free port (per memory: storybook serves the repo it's launched from; use an alt port and clear `.cache/storybook` on dual-React errors):
`moon run storybook-react:serve -- --port 9010` (or the project's storybook task), then load `plugins/plugin-transcription/PosDecoration` and confirm: words are underlined by POS color; editing a word dims its span briefly then re-decorates after ~400ms.

- [ ] **Step 4: Cast audit + commit**

Run: `git diff origin/main -- packages/plugins/plugin-transcription | grep -nE '\bas (any|unknown|[A-Z])|as unknown as' || echo "no casts"`
Remove the `undefined as any` placeholder. Then:

```bash
git add packages/plugins/plugin-transcription/src/stories/PosDecoration.stories.tsx packages/plugins/plugin-transcription/package.json packages/plugins/plugin-transcription/tsconfig.json pnpm-lock.yaml
git commit -m "feat(plugin-transcription): POS decoration story"
```

---

## Task 10: Full verification

- [ ] **Step 1: Build the three packages**

Run: `moon run nlp:build ui-editor:build plugin-transcription:build`
Expected: all succeed (ignore the `DEPOT_TOKEN` warning).

- [ ] **Step 2: Run all touched test suites**

Run: `moon run nlp:test ui-editor:test`
Expected: PASS.

- [ ] **Step 3: Lint + format**

Run: `moon run nlp:lint ui-editor:lint plugin-transcription:lint -- --fix`
Then: `pnpm format`
Expected: clean.

- [ ] **Step 4: Final cast audit across the whole diff**

Run: `git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as' || echo "no casts"`
Resolve every hit per CLAUDE.md (justify with a comment at a true type boundary, or remove).

- [ ] **Step 5: Confirm clean tree + commit any stragglers**

Run: `git status`
Expected: clean working tree (all changes committed). Commit or surface anything outstanding.

---

## Notes for the implementer

- **Internal-namespace import rule** does not apply here — `@dxos/nlp` is a small flat package, not a namespace-export package. Plain barrel exports from `src/index.ts` are correct.
- **No compatibility shims:** if you move any symbol, update all call sites in the same change.
- **Pipeline integration is deferred** (per spec "out of scope"): the parser is consumable by a future `transcription-pipeline` stage exactly as the stages consume `generateObject` today; do not wire it in this plan.
- **`as const` is fine** and not flagged by the cast audit.
