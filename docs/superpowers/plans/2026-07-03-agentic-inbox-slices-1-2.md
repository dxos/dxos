# Agentic Inbox — Slices 1–2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the email pipeline into the `@dxos/semantic-index` fact substrate (slice 1) and add a thread-aggregation layer that materializes canonical `Thread` ECHO objects (slice 2).

**Architecture:** Message-layer stages extract advisory `Fact`s (subject–predicate–object + valence + provenance) into an in-memory `SemanticStore` as the stream runs; a post-stream compute pass groups messages by a derived `threadId` and builds authoritative `Thread` objects. ECHO is canonical; facts are advisory evidence (per the design spec §4).

**Tech Stack:** TypeScript, Effect-TS, `@dxos/pipeline` (`Stage`/`Pipeline`), `@dxos/semantic-index` (`SemanticPipeline`/`SemanticStore`/`Fact`), `@dxos/echo` + `@dxos/types` (ECHO objects, `Message`), vitest.

**Spec:** [`docs/superpowers/specs/2026-07-03-agentic-inbox-discovery-design.md`](../specs/2026-07-03-agentic-inbox-discovery-design.md) — slices §9.1–9.2.

## Global Constraints

- All `@dxos/*` intra-repo deps are `workspace:*`; external deps use `catalog:`. Add deps via `pnpm add --filter "@dxos/pipeline-email" --save-catalog "<pkg>"` (external) or edit `package.json` for workspace deps then `pnpm install`.
- New packages are `"private": true` — `@dxos/pipeline-email` already is; no new package here.
- No casts to silence types (`as any`/`as T`/`as unknown as`/non-null `!`); `as const` is fine. Fix types at the source.
- TypeScript, single quotes; arrow functions; import order builtin → external → @dxos → parent → sibling with blank lines between groups.
- Tests: colocated `*.test.ts`, vitest `describe`/`test`, `test('x', ({ expect }) => …)`. Prefer extending existing suites. Avoid sleeps; use `TestClock`.
- Errors as Effect domain errors (`SemanticIndexError` already exists); never untyped `Error` in an Effect error channel.
- Comments state the invariant/why, end with a period; no history/before-after narration.
- The heavy Enron/Ollama test stays env-gated (`ROOT_DIR` + Ollama). Every new unit of logic also gets a cheap **non-gated** test using scripted fixtures + `mockAiService` (no network).
- Run a single test file: `moon run pipeline-email:test -- src/<file>.test.ts`. Lint: `moon run pipeline-email:lint -- --fix`. Build: `moon run pipeline-email:build`.

---

## File Structure

- `packages/core/compute/pipeline-email/package.json` — add `@dxos/semantic-index` dependency.
- `src/facts.ts` (create) — `messageToDocument`, `EMAIL_EXTRACTION_RULES`; pure mapping + rules. Test: `src/facts.test.ts`.
- `src/fact-index.ts` (create) — `buildEntityIndex`, `reconcileFact`; reconcile fact entity ids to ECHO `Person`/`Organization`. Test: `src/fact-index.test.ts`.
- `src/threading.ts` (create) — `normalizeSubject`, `deriveThreadId`; email threading heuristic. Test: `src/threading.test.ts`.
- `src/threads.ts` (create) — `buildThreads`; group messages by `threadId` → `Thread` inputs + state machine. Test: `src/threads.test.ts`.
- `src/types/Thread.ts` (create) — `Thread` ECHO object + `ThreadState`. `src/types/index.ts` (create) — barrel.
- `src/email-pipeline.test.ts` (modify) — add fact-extraction stage + thread materialization to the env-gated Enron run.
- `src/index.ts` (modify) — export `./facts`, `./threading`, `./threads`, `./types`.

Slice 1 = Tasks 1–4. Slice 2 = Tasks 5–8.

---

## Task 1: Add `@dxos/semantic-index` dependency

**Files:**
- Modify: `packages/core/compute/pipeline-email/package.json`

**Interfaces:**
- Produces: `@dxos/semantic-index` importable from the package (`SemanticPipeline`, `SemanticStore`, `Fact`, `extractDocFacts`, `ExtractDocument`, `ExtractOptions`, `DEFAULT_EXTRACTION_RULES`) and `@dxos/semantic-index/testing` (`mockAiService`, `queuedAiService`).

- [ ] **Step 1: Add the dependency**

Edit `package.json` `dependencies` (keep alphabetical; it becomes a runtime dep because `facts.ts` is exported from `index.ts`):

```json
  "dependencies": {
    "@dxos/node-std": "workspace:*",
    "@dxos/pipeline": "workspace:*",
    "@dxos/semantic-index": "workspace:*",
    "@dxos/types": "workspace:*",
    "hyparquet": "catalog:"
  },
```

- [ ] **Step 2: Install and let the toolbox sync tsconfig references**

Run: `HUSKY=0 pnpm install --no-frozen-lockfile`
Expected: completes; postinstall "Updating all tsconfig.json"; `pipeline-email/tsconfig.json` gains a `../semantic-index` reference.

- [ ] **Step 3: Verify it builds**

Run: `moon run pipeline-email:build`
Expected: PASS (nothing uses it yet; this proves the dep graph resolves).

- [ ] **Step 4: Commit**

```bash
git add packages/core/compute/pipeline-email/package.json packages/core/compute/pipeline-email/tsconfig.json pnpm-lock.yaml tsconfig.all.json
git commit -m "feat(pipeline-email): add @dxos/semantic-index dependency"
```

---

## Task 2: `messageToDocument` mapping + email extraction rules

**Files:**
- Create: `packages/core/compute/pipeline-email/src/facts.ts`
- Test: `packages/core/compute/pipeline-email/src/facts.test.ts`
- Modify: `packages/core/compute/pipeline-email/src/index.ts`

**Interfaces:**
- Consumes: `Message` from `@dxos/types`; `ExtractDocument`, `ExtractOptions` from `@dxos/semantic-index`.
- Produces:
  - `messageToDocument(message: Message.Message): ExtractDocument` — `{ text: body, source: stable message id, author?: sender email, date?: created }`.
  - `EMAIL_EXTRACTION_RULES: readonly string[]` — appended to `DEFAULT_EXTRACTION_RULES`.
  - `EMAIL_EXTRACT_OPTIONS: ExtractOptions` — `{ rules: EMAIL_EXTRACTION_RULES }`.
  - `messageSource(message: Message.Message): string` — the stable per-message id used as `source`/cursor key.

- [ ] **Step 1: Write the failing test**

`src/facts.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Message } from '@dxos/types';

import { EMAIL_EXTRACTION_RULES, messageSource, messageToDocument } from './facts';

describe('messageToDocument', () => {
  test('maps a Message onto an ExtractDocument', ({ expect }) => {
    const message = Message.make({
      created: '2001-05-14T10:00:00.000Z',
      sender: { email: 'alice@enron.com' },
      blocks: [{ _tag: 'text', text: 'Please send the Q2 report by Friday.' }],
      properties: { messageId: '<m-1@enron.com>', subject: 'Q2 report' },
    });

    const doc = messageToDocument(message);
    expect(doc.text).toBe('Please send the Q2 report by Friday.');
    expect(doc.source).toBe('<m-1@enron.com>');
    expect(doc.author).toBe('alice@enron.com');
    expect(doc.date).toBe('2001-05-14T10:00:00.000Z');
  });

  test('messageSource falls back to sender+created when no messageId', ({ expect }) => {
    const message = Message.make({
      created: '2001-05-14T10:00:00.000Z',
      sender: { email: 'bob@enron.com' },
      blocks: [{ _tag: 'text', text: 'hi' }],
    });
    expect(messageSource(message)).toBe('bob@enron.com:2001-05-14T10:00:00.000Z');
  });

  test('email rules extend the base rules with email-specific guidance', ({ expect }) => {
    expect(EMAIL_EXTRACTION_RULES.length).toBeGreaterThan(0);
    expect(EMAIL_EXTRACTION_RULES.some((rule) => /commitment|deadline|action/i.test(rule))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run pipeline-email:test -- src/facts.test.ts`
Expected: FAIL — cannot find module `./facts`.

- [ ] **Step 3: Write the implementation**

`src/facts.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type ExtractDocument, type ExtractOptions } from '@dxos/semantic-index';
import { Message } from '@dxos/types';

// Email-specific extraction guidance appended after the semantic-index DEFAULT_EXTRACTION_RULES.
// Kept atomic so the two rule sets compose without forking the base prompt.
export const EMAIL_EXTRACTION_RULES: readonly string[] = [
  'Treat a request or promise as a commitment: "please send X by Friday" => subject (the owner), predicate "owes"/"will send", object X, validTo the deadline.',
  'A deadline or due date becomes validTo on the relevant assertion (ISO date when known).',
  'Attribute first-person statements ("I will…", "we can…") to the message sender as subject.',
];

export const EMAIL_EXTRACT_OPTIONS: ExtractOptions = { rules: EMAIL_EXTRACTION_RULES };

// Stable per-message identifier used as the fact `source` and the incremental cursor key. Prefer the
// RFC message-id header (present in the Enron dataset); fall back to sender+timestamp so every message
// has a deterministic source even when the header is absent.
export const messageSource = (message: Message.Message): string => {
  const messageId = message.properties?.messageId;
  if (typeof messageId === 'string' && messageId.length > 0) {
    return messageId;
  }
  return `${message.sender.email ?? 'unknown'}:${message.created}`;
};

export const messageToDocument = (message: Message.Message): ExtractDocument => ({
  text: Message.extractText(message),
  source: messageSource(message),
  ...(message.sender.email ? { author: message.sender.email } : {}),
  date: message.created,
});
```

- [ ] **Step 4: Export from the barrel**

Add to `src/index.ts` (before `./email-fixtures`):

```ts
export * from './facts';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `moon run pipeline-email:test -- src/facts.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/core/compute/pipeline-email/src/facts.ts packages/core/compute/pipeline-email/src/facts.test.ts packages/core/compute/pipeline-email/src/index.ts
git commit -m "feat(pipeline-email): map Message to semantic-index ExtractDocument"
```

---

## Task 3: Fact-extraction stage wired to an in-memory SemanticStore

**Files:**
- Create: `packages/core/compute/pipeline-email/src/extract-stage.ts`
- Test: `packages/core/compute/pipeline-email/src/extract-stage.test.ts`
- Modify: `packages/core/compute/pipeline-email/src/index.ts`

**Interfaces:**
- Consumes: `messageToDocument`, `EMAIL_EXTRACT_OPTIONS` (Task 2); `Stage` from `@dxos/pipeline`; `Fact`, `SemanticPipeline`, `SemanticStore` from `@dxos/semantic-index`.
- Produces:
  - `type FactIndexer = (message: Message.Message) => Promise<Fact[]>` — extract + persist one message's facts, returning them.
  - `extractFactsStage<Ctx extends { readonly indexFacts: FactIndexer }>(): Stage.Stage<Message.Message, Message.Message, Ctx, never>` — calls `ctx.indexFacts`, passes the Message through unchanged (degrades to `[]` on failure so the run stays green).

The stage stays at `R = never` by taking the store/AI-bound work as a `Promise` closure on the context — the same pattern the existing `summarize` closure uses.

- [ ] **Step 1: Write the failing test** (non-gated; uses `mockAiService`, no Ollama)

`src/extract-stage.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { Pipeline } from '@dxos/pipeline';
import { captureSink } from '@dxos/pipeline/testing';
import { type Fact, SemanticStore } from '@dxos/semantic-index';
import { mockAiService } from '@dxos/semantic-index/testing';
import { Message } from '@dxos/types';

import { messageToDocument, EMAIL_EXTRACT_OPTIONS } from './facts';
import { type FactIndexer, extractFactsStage } from './extract-stage';
import { SemanticPipeline } from '@dxos/semantic-index';

// One fact per message from the mock LLM; proves the stage persists into the store.
const LLM_OUTPUT = {
  facts: [
    {
      subject: 'alice@enron.com',
      predicate: 'will send',
      object: 'Q2 report',
      validTo: '2001-05-18',
      factuality: 'CT+',
      polarity: '+',
      quote: 'I will send the Q2 report by Friday.',
    },
  ],
};

describe('extractFactsStage', () => {
  test('extracts and persists a fact per message into the store', async ({ expect }) => {
    const runtime = ManagedRuntime.make(SemanticStore.layerMemory.pipe(Layer.provideMerge(mockAiService(LLM_OUTPUT))));
    const indexFacts: FactIndexer = (message) =>
      runtime.runPromise(SemanticPipeline.run([messageToDocument(message)], EMAIL_EXTRACT_OPTIONS));

    const message = Message.make({
      created: '2001-05-14T10:00:00.000Z',
      sender: { email: 'alice@enron.com' },
      blocks: [{ _tag: 'text', text: 'I will send the Q2 report by Friday.' }],
      properties: { messageId: '<m-1@enron.com>', subject: 'Q2 report' },
    });

    const { sink, items } = captureSink<Message.Message>();
    await EffectEx.runPromise(
      Pipeline.run({
        source: Stream.fromIterable([message]),
        stages: [extractFactsStage()],
        sink,
        context: { indexFacts },
      }),
    );

    // The Message passes through unchanged.
    expect(items).toHaveLength(1);

    // The fact was persisted; read it back from the same store.
    const facts: Fact[] = await runtime.runPromise(Effect.gen(function* () {
      const store = yield* SemanticStore;
      return yield* store.query({});
    }));
    await runtime.dispose();

    expect(facts.length).toBeGreaterThan(0);
    expect(facts[0].assertion.object.label).toBe('Q2 report');
    expect(facts[0].valence.factuality).toBe('CT+');
    expect(facts[0].attribution.source).toBe('<m-1@enron.com>');
  });
});
```

> Note: `store.query({})` returns all facts (empty structured query = no constraints). If the empty-query form is unsupported at implementation time, substitute `store.select('SELECT ?fact ?p ?o WHERE { ?fact ?p ?o }')` — verify the exact zero-constraint form against `SemanticStore` when implementing and use whichever returns all facts.

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run pipeline-email:test -- src/extract-stage.test.ts`
Expected: FAIL — cannot find module `./extract-stage`.

- [ ] **Step 3: Write the implementation**

`src/extract-stage.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Stage } from '@dxos/pipeline';
import { type Fact } from '@dxos/semantic-index';
import { Message } from '@dxos/types';

// Extract + persist one message's facts, returning them. The store/AI-bound work is a Promise closure
// so the stage's Effect stays R = never (Pipeline.run carries no requirements channel).
export type FactIndexer = (message: Message.Message) => Promise<Fact[]>;

// Message-layer stage: index each message into the fact substrate, passing the Message through
// unchanged. Extraction degrades to no facts on failure (advisory layer — a failed extraction must
// not fail the run), mirroring the summarize stage's graceful degradation.
export const extractFactsStage = <Ctx extends { readonly indexFacts: FactIndexer }>(): Stage.Stage<
  Message.Message,
  Message.Message,
  Ctx,
  never
> =>
  Stage.map('extract-facts', (message, ctx) =>
    Effect.tryPromise(() => ctx.indexFacts(message)).pipe(
      Effect.orElse(() => Effect.succeed<Fact[]>([])),
      Effect.as(message),
    ),
  );
```

- [ ] **Step 4: Export from the barrel**

Add to `src/index.ts`:

```ts
export * from './extract-stage';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `moon run pipeline-email:test -- src/extract-stage.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add packages/core/compute/pipeline-email/src/extract-stage.ts packages/core/compute/pipeline-email/src/extract-stage.test.ts packages/core/compute/pipeline-email/src/index.ts
git commit -m "feat(pipeline-email): add fact-extraction stage over SemanticStore"
```

---

## Task 4: Entity reconciliation index (facts → canonical ECHO Person/Organization)

**Files:**
- Create: `packages/core/compute/pipeline-email/src/fact-index.ts`
- Test: `packages/core/compute/pipeline-email/src/fact-index.test.ts`
- Modify: `packages/core/compute/pipeline-email/src/index.ts`

**Interfaces:**
- Consumes: `normalizeEntityId` from `@dxos/semantic-index`; `Person`, `Organization` from `@dxos/types`; `Fact` from `@dxos/semantic-index`; `Obj` from `@dxos/echo`.
- Produces:
  - `buildEntityIndex(objects: readonly (Person.Person | Organization.Organization)[]): Map<string, string>` — maps `normalizeEntityId(name/email)` → the object's DXN string. This is the reconciliation table; entities remain canonical in ECHO (spec §4), facts merely reference them.
  - `reconcileFactEntities(fact: Fact, index: Map<string, string>): { subject?: string; object?: string }` — resolves a fact's subject/object entity ids to ECHO DXNs when known.

- [ ] **Step 1: Write the failing test** (non-gated; scripted objects, no LLM)

`src/fact-index.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { normalizeEntityId, type Fact } from '@dxos/semantic-index';
import { Organization, Person } from '@dxos/types';

import { buildEntityIndex, reconcileFactEntities } from './fact-index';

const fact = (subjectLabel: string, objectLabel: string): Fact => ({
  id: 'f1',
  assertion: {
    subject: { entity: normalizeEntityId(subjectLabel), label: subjectLabel },
    predicate: 'works at',
    object: { entity: normalizeEntityId(objectLabel), label: objectLabel },
  },
  valence: { factuality: 'CT+', polarity: '+' },
  attribution: { source: 'dxn:queue:m1', generatedAtTime: '2001-05-14T10:00:00.000Z' },
  recordedAt: '2001-05-14T10:00:00.000Z',
  extractor: { id: 'default', model: 'test', version: '1' },
  sourceHash: 'h1',
});

describe('entity reconciliation', () => {
  test('buildEntityIndex maps normalized names/emails to object DXNs', ({ expect }) => {
    const alice = Obj.make(Person.Person, { fullName: 'Alice Smith', emails: [{ value: 'alice@enron.com' }] });
    const enron = Obj.make(Organization.Organization, { name: 'Enron' });

    const index = buildEntityIndex([alice, enron]);
    expect(index.get(normalizeEntityId('Alice Smith'))).toBe(Obj.getDXN(alice).toString());
    expect(index.get(normalizeEntityId('alice@enron.com'))).toBe(Obj.getDXN(alice).toString());
    expect(index.get(normalizeEntityId('Enron'))).toBe(Obj.getDXN(enron).toString());
  });

  test('reconcileFactEntities resolves subject/object to DXNs when known', ({ expect }) => {
    const alice = Obj.make(Person.Person, { fullName: 'Alice Smith', emails: [{ value: 'alice@enron.com' }] });
    const enron = Obj.make(Organization.Organization, { name: 'Enron' });
    const index = buildEntityIndex([alice, enron]);

    const resolved = reconcileFactEntities(fact('Alice Smith', 'Enron'), index);
    expect(resolved.subject).toBe(Obj.getDXN(alice).toString());
    expect(resolved.object).toBe(Obj.getDXN(enron).toString());
  });

  test('reconcileFactEntities leaves unknown entities unresolved', ({ expect }) => {
    const index = buildEntityIndex([]);
    const resolved = reconcileFactEntities(fact('Nobody', 'Nowhere'), index);
    expect(resolved.subject).toBeUndefined();
    expect(resolved.object).toBeUndefined();
  });
});
```

> Note: confirm the `Person`/`Organization` field names when implementing (`fullName`/`emails` vs `name`). Read `packages/sdk/types/src/types/Person.ts` and `Organization.ts` first and adjust the fixtures + `buildEntityIndex` accessors to the real fields. The test asserts behavior, not specific field names — keep them in sync.

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run pipeline-email:test -- src/fact-index.test.ts`
Expected: FAIL — cannot find module `./fact-index`.

- [ ] **Step 3: Write the implementation**

`src/fact-index.ts` (adjust `personKeys`/`orgKeys` accessors to the real Person/Organization fields verified in Step 1):

```ts
//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { type Fact, normalizeEntityId } from '@dxos/semantic-index';
import { Organization, Person } from '@dxos/types';

// Surface forms (name + emails) under which a Person may be referenced in extracted facts.
const personKeys = (person: Person.Person): string[] =>
  [person.fullName, ...(person.emails ?? []).map((email) => email.value)].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );

const orgKeys = (org: Organization.Organization): string[] =>
  [org.name].filter((value): value is string => typeof value === 'string' && value.length > 0);

// Reconciliation table: normalized entity id (as produced by the extractor) → canonical ECHO DXN.
// ECHO objects remain the source of truth (spec §4); this table lets advisory facts point at them.
export const buildEntityIndex = (
  objects: readonly (Person.Person | Organization.Organization)[],
): Map<string, string> => {
  const index = new Map<string, string>();
  for (const object of objects) {
    const dxn = Obj.getDXN(object).toString();
    const keys = Obj.instanceOf(Person.Person, object) ? personKeys(object) : orgKeys(object);
    for (const key of keys) {
      index.set(normalizeEntityId(key), dxn);
    }
  }
  return index;
};

// Resolve a fact's subject/object entity ids to canonical DXNs where the index knows them; unknown
// referents are simply omitted (an advisory fact about an unresolved entity is still a valid fact).
export const reconcileFactEntities = (
  fact: Fact,
  index: Map<string, string>,
): { subject?: string; object?: string } => {
  const subject = index.get(fact.assertion.subject.entity);
  const object = index.get(fact.assertion.object.entity);
  return { ...(subject ? { subject } : {}), ...(object ? { object } : {}) };
};
```

- [ ] **Step 4: Export from the barrel**

Add to `src/index.ts`:

```ts
export * from './fact-index';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `moon run pipeline-email:test -- src/fact-index.test.ts`
Expected: PASS (3 tests). If `Obj.instanceOf` is not the correct API, verify against `@dxos/echo` (`Obj.instanceOf(Schema, obj)`) and adjust.

- [ ] **Step 6: Commit**

```bash
git add packages/core/compute/pipeline-email/src/fact-index.ts packages/core/compute/pipeline-email/src/fact-index.test.ts packages/core/compute/pipeline-email/src/index.ts
git commit -m "feat(pipeline-email): reconcile extracted fact entities to ECHO objects"
```

---

## Task 5: Thread derivation (`threadId` from normalized subject)

**Files:**
- Create: `packages/core/compute/pipeline-email/src/threading.ts`
- Test: `packages/core/compute/pipeline-email/src/threading.test.ts`
- Modify: `packages/core/compute/pipeline-email/src/index.ts`

**Interfaces:**
- Consumes: `Message` from `@dxos/types`.
- Produces:
  - `normalizeSubject(subject: string): string` — strip `Re:`/`Fwd:`/`Fw:` prefixes (repeatedly), collapse whitespace, lowercase.
  - `deriveThreadId(message: Message.Message): string` — the normalized subject (the Enron dataset has no References/In-Reply-To headers, so subject is the available threading signal); empty subject → `no-subject`.

- [ ] **Step 1: Write the failing test**

`src/threading.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Message } from '@dxos/types';

import { deriveThreadId, normalizeSubject } from './threading';

describe('threading', () => {
  test('normalizeSubject strips reply/forward prefixes and normalizes', ({ expect }) => {
    expect(normalizeSubject('Re: Q2 Report')).toBe('q2 report');
    expect(normalizeSubject('FW: Fwd:  Re: Q2   Report ')).toBe('q2 report');
    expect(normalizeSubject('Q2 Report')).toBe('q2 report');
  });

  test('deriveThreadId groups replies onto one thread', ({ expect }) => {
    const original = Message.make({ sender: { email: 'a@x.com' }, properties: { subject: 'Deal terms' } });
    const reply = Message.make({ sender: { email: 'b@x.com' }, properties: { subject: 'RE: Deal terms' } });
    expect(deriveThreadId(original)).toBe(deriveThreadId(reply));
  });

  test('deriveThreadId falls back for missing subject', ({ expect }) => {
    const message = Message.make({ sender: { email: 'a@x.com' } });
    expect(deriveThreadId(message)).toBe('no-subject');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run pipeline-email:test -- src/threading.test.ts`
Expected: FAIL — cannot find module `./threading`.

- [ ] **Step 3: Write the implementation**

`src/threading.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { Message } from '@dxos/types';

// Leading reply/forward markers, stripped repeatedly ("Fw: Re:" → "").
const PREFIX = /^\s*(re|fwd?|fw)\s*:\s*/i;

// Canonical subject for threading: drop reply/forward prefixes, collapse internal whitespace,
// lowercase. Two messages with the same normalized subject belong to the same thread.
export const normalizeSubject = (subject: string): string => {
  let value = subject;
  while (PREFIX.test(value)) {
    value = value.replace(PREFIX, '');
  }
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
};

// Derive a thread id from the subject. The Enron dataset carries no References/In-Reply-To headers,
// so the normalized subject is the available grouping signal; blank subjects share a `no-subject`
// bucket rather than each forming a singleton thread.
export const deriveThreadId = (message: Message.Message): string => {
  const subject = message.properties?.subject;
  const normalized = typeof subject === 'string' ? normalizeSubject(subject) : '';
  return normalized.length > 0 ? normalized : 'no-subject';
};
```

- [ ] **Step 4: Export from the barrel**

Add to `src/index.ts`:

```ts
export * from './threading';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `moon run pipeline-email:test -- src/threading.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/core/compute/pipeline-email/src/threading.ts packages/core/compute/pipeline-email/src/threading.test.ts packages/core/compute/pipeline-email/src/index.ts
git commit -m "feat(pipeline-email): derive threadId from normalized subject"
```

---

## Task 6: `Thread` ECHO object type

**Files:**
- Create: `packages/core/compute/pipeline-email/src/types/Thread.ts`
- Create: `packages/core/compute/pipeline-email/src/types/index.ts`
- Test: `packages/core/compute/pipeline-email/src/types/Thread.test.ts`
- Modify: `packages/core/compute/pipeline-email/src/index.ts`

**Interfaces:**
- Consumes: `Type`, `Obj` from `@dxos/echo`; `Schema` from `effect`; `DXN` from `@dxos/keys` (as used by `Type.makeObject`).
- Produces:
  - `ThreadState` = `'awaiting-mine' | 'awaiting-theirs' | 'resolved' | 'stalled'`.
  - `Thread` ECHO object: `{ threadId, subject, summary, state, participants: string[], messageIds: string[], openQuestions: string[], actionItems: string[] }`. Questions/action items are plain strings for slices 1–2; promotion to `Question`/`ActionItem` entities is a later slice (spec §4.3).

- [ ] **Step 1: Write the failing test**

`src/types/Thread.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';

import { Thread } from './Thread';

describe('Thread', () => {
  test('constructs a Thread object with expected fields', ({ expect }) => {
    const thread = Obj.make(Thread, {
      threadId: 'deal terms',
      subject: 'Deal terms',
      summary: 'Negotiation over Q2 deal terms.',
      state: 'awaiting-mine',
      participants: ['a@x.com', 'b@x.com'],
      messageIds: ['<m-1@x.com>', '<m-2@x.com>'],
      openQuestions: ['What is the close date?'],
      actionItems: ['Send revised terms'],
    });

    expect(Obj.instanceOf(Thread, thread)).toBe(true);
    expect(thread.threadId).toBe('deal terms');
    expect(thread.state).toBe('awaiting-mine');
    expect(thread.participants).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run pipeline-email:test -- src/types/Thread.test.ts`
Expected: FAIL — cannot find module `./Thread`.

- [ ] **Step 3: Write the implementation**

`src/types/Thread.ts` (match the `Type.makeObject` idiom used by `@dxos/types` `Message.ts`):

```ts
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

export const ThreadState = Schema.Literal('awaiting-mine', 'awaiting-theirs', 'resolved', 'stalled');
export type ThreadState = Schema.Schema.Type<typeof ThreadState>;

// A canonical (spec §4) conversation aggregate: messages sharing a derived threadId, with a rolling
// summary, a coarse state, and consolidated open questions / action items. Authoritative in ECHO;
// facts are advisory evidence, not the source of this object's state.
export class Thread extends Type.makeObject<Thread>(DXN.make('org.dxos.type.email-thread', '0.1.0'))(
  Schema.Struct({
    threadId: Schema.String,
    subject: Schema.String,
    summary: Schema.String,
    state: ThreadState,
    participants: Schema.Array(Schema.String),
    messageIds: Schema.Array(Schema.String),
    openQuestions: Schema.Array(Schema.String),
    actionItems: Schema.Array(Schema.String),
  }),
) {}
```

`src/types/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './Thread';
```

> Note: confirm the exact `Type.makeObject` invocation and `DXN.make` import by reading `packages/sdk/types/src/types/Message.ts` (Task explored it: `Type.makeObject<T>(DXN.make(typename, version))(Schema.Struct({...}))`). Match it exactly, including which package `Type`/`DXN` come from.

- [ ] **Step 4: Export from the barrel**

Add to `src/index.ts`:

```ts
export * from './types';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `moon run pipeline-email:test -- src/types/Thread.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add packages/core/compute/pipeline-email/src/types/ packages/core/compute/pipeline-email/src/index.ts
git commit -m "feat(pipeline-email): add Thread ECHO object type"
```

---

## Task 7: `buildThreads` — group messages and compute thread state

**Files:**
- Create: `packages/core/compute/pipeline-email/src/threads.ts`
- Test: `packages/core/compute/pipeline-email/src/threads.test.ts`
- Modify: `packages/core/compute/pipeline-email/src/index.ts`

**Interfaces:**
- Consumes: `deriveThreadId` (Task 5); `Thread`, `ThreadState` (Task 6); `messageSource` (Task 2); `Message` from `@dxos/types`; `Obj` from `@dxos/echo`.
- Produces:
  - `buildThreads(messages: readonly Message.Message[], options: { ownerEmail: string; now: string; stalePeriodMs?: number }): Thread[]` — group by `deriveThreadId`, compute participants/messageIds/summary and a `ThreadState`:
    - `awaiting-mine` — last message is **not** from the owner (they await my reply).
    - `awaiting-theirs` — last message is from the owner.
    - `stalled` — awaiting and last activity older than `stalePeriodMs` (default 14 days) relative to `now`.
    - `resolved` — reserved; not inferred in this slice (no signal yet).
  - Summary is the concatenation of per-message `properties.summary` strings (populated by the existing summarize stage), else the subject. Open questions / action items are left empty here (populated in a later slice); the field exists so the shape is stable.

- [ ] **Step 1: Write the failing test** (non-gated; scripted messages, deterministic `now`)

`src/threads.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildThreads } from './threads';

import { Message } from '@dxos/types';

const msg = (subject: string, from: string, created: string, summary?: string) =>
  Message.make({
    created,
    sender: { email: from },
    blocks: [{ _tag: 'text', text: 'body' }],
    properties: { subject, messageId: `<${from}:${created}>`, ...(summary ? { summary } : {}) },
  });

const OWNER = 'me@enron.com';

describe('buildThreads', () => {
  test('groups messages by normalized subject', ({ expect }) => {
    const threads = buildThreads(
      [
        msg('Deal terms', 'a@x.com', '2001-05-01T10:00:00.000Z'),
        msg('RE: Deal terms', OWNER, '2001-05-01T11:00:00.000Z'),
        msg('Lunch?', 'b@x.com', '2001-05-01T12:00:00.000Z'),
      ],
      { ownerEmail: OWNER, now: '2001-05-02T00:00:00.000Z' },
    );

    expect(threads).toHaveLength(2);
    const deal = threads.find((thread) => thread.threadId === 'deal terms');
    expect(deal?.messageIds).toHaveLength(2);
    expect(deal?.participants.sort()).toEqual(['a@x.com', 'me@enron.com']);
  });

  test('state is awaiting-theirs when owner sent last', ({ expect }) => {
    const [thread] = buildThreads(
      [
        msg('Deal terms', 'a@x.com', '2001-05-01T10:00:00.000Z'),
        msg('RE: Deal terms', OWNER, '2001-05-01T11:00:00.000Z'),
      ],
      { ownerEmail: OWNER, now: '2001-05-02T00:00:00.000Z' },
    );
    expect(thread.state).toBe('awaiting-theirs');
  });

  test('state is awaiting-mine when other party sent last', ({ expect }) => {
    const [thread] = buildThreads([msg('Deal terms', 'a@x.com', '2001-05-01T10:00:00.000Z')], {
      ownerEmail: OWNER,
      now: '2001-05-02T00:00:00.000Z',
    });
    expect(thread.state).toBe('awaiting-mine');
  });

  test('state is stalled when awaiting past the stale period', ({ expect }) => {
    const [thread] = buildThreads([msg('Deal terms', 'a@x.com', '2001-05-01T10:00:00.000Z')], {
      ownerEmail: OWNER,
      now: '2001-06-01T00:00:00.000Z',
    });
    expect(thread.state).toBe('stalled');
  });

  test('summary concatenates per-message summaries', ({ expect }) => {
    const [thread] = buildThreads(
      [
        msg('Deal terms', 'a@x.com', '2001-05-01T10:00:00.000Z', 'Opening offer.'),
        msg('RE: Deal terms', OWNER, '2001-05-01T11:00:00.000Z', 'Countered.'),
      ],
      { ownerEmail: OWNER, now: '2001-05-02T00:00:00.000Z' },
    );
    expect(thread.summary).toContain('Opening offer.');
    expect(thread.summary).toContain('Countered.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run pipeline-email:test -- src/threads.test.ts`
Expected: FAIL — cannot find module `./threads`.

- [ ] **Step 3: Write the implementation**

`src/threads.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

import { messageSource } from './facts';
import { deriveThreadId } from './threading';
import { type ThreadState, Thread } from './types';

const DEFAULT_STALE_PERIOD_MS = 14 * 24 * 60 * 60 * 1000;

export type BuildThreadsOptions = {
  readonly ownerEmail: string;
  readonly now: string;
  readonly stalePeriodMs?: number;
};

// Coarse thread state from who spoke last and how long ago. `resolved` needs a signal we do not yet
// extract, so it is not inferred in this slice.
const computeState = (
  lastFromOwner: boolean,
  lastCreated: string,
  options: BuildThreadsOptions,
): ThreadState => {
  const idleMs = new Date(options.now).getTime() - new Date(lastCreated).getTime();
  const stale = idleMs > (options.stalePeriodMs ?? DEFAULT_STALE_PERIOD_MS);
  if (stale) {
    return 'stalled';
  }
  return lastFromOwner ? 'awaiting-theirs' : 'awaiting-mine';
};

// Group messages into canonical Thread objects. Messages are bucketed by derived threadId; within a
// bucket they are ordered by `created` to find the last speaker.
export const buildThreads = (messages: readonly Message.Message[], options: BuildThreadsOptions): Thread[] => {
  const buckets = new Map<string, Message.Message[]>();
  for (const message of messages) {
    const threadId = deriveThreadId(message);
    (buckets.get(threadId) ?? buckets.set(threadId, []).get(threadId)!).push(message);
  }

  const threads: Thread[] = [];
  for (const [threadId, bucket] of buckets) {
    const ordered = [...bucket].sort((a, b) => a.created.localeCompare(b.created));
    const last = ordered[ordered.length - 1];
    const lastFromOwner = last.sender.email === options.ownerEmail;
    const participants = [...new Set(ordered.flatMap((m) => (m.sender.email ? [m.sender.email] : [])))];
    const summaries = ordered.flatMap((m) =>
      typeof m.properties?.summary === 'string' && m.properties.summary.length > 0 ? [m.properties.summary] : [],
    );
    const subject = typeof ordered[0].properties?.subject === 'string' ? ordered[0].properties.subject : threadId;

    threads.push(
      Obj.make(Thread, {
        threadId,
        subject,
        summary: summaries.length > 0 ? summaries.join('\n') : subject,
        state: computeState(lastFromOwner, last.created, options),
        participants,
        messageIds: ordered.map(messageSource),
        openQuestions: [],
        actionItems: [],
      }),
    );
  }
  return threads;
};
```

- [ ] **Step 4: Export from the barrel**

Add to `src/index.ts`:

```ts
export * from './threads';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `moon run pipeline-email:test -- src/threads.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/core/compute/pipeline-email/src/threads.ts packages/core/compute/pipeline-email/src/threads.test.ts packages/core/compute/pipeline-email/src/index.ts
git commit -m "feat(pipeline-email): build Thread objects with coarse state from messages"
```

---

## Task 8: Integrate fact extraction + thread materialization into the Enron run

**Files:**
- Modify: `packages/core/compute/pipeline-email/src/email-pipeline.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–7; the existing env-gated harness (`EchoTestBuilder`, `OllamaAiServiceLayer`, `captureSink`, `parquetSource`).

This task extends the existing env-gated suite (do not create a new file). It adds a `SemanticStore.layerMemory` runtime, an `extractFactsStage`, and — after the run — `buildThreads` materialized into ECHO, asserting both facts and threads are produced.

- [ ] **Step 1: Add imports** to `src/email-pipeline.test.ts`

```ts
import { SemanticPipeline, SemanticStore, type Fact } from '@dxos/semantic-index';

import { EMAIL_EXTRACT_OPTIONS, messageToDocument } from './facts';
import { extractFactsStage, type FactIndexer } from './extract-stage';
import { buildThreads } from './threads';
import { Thread } from './types';
```

- [ ] **Step 2: Build a fact runtime + indexer in the test body**

Inside the `test(...)` callback, after `runtime` (the model runtime) is available, add a semantic runtime that shares the Ollama AI layer and an in-memory store:

```ts
// In-memory fact substrate for this run; shares the Ollama-backed AiService with the summarize stage.
const factRuntime = ManagedRuntime.make(SemanticStore.layerMemory.pipe(Layer.provideMerge(modelLayer)));
const indexFacts: FactIndexer = (message) =>
  factRuntime.runPromise(SemanticPipeline.run([messageToDocument(message)], EMAIL_EXTRACT_OPTIONS));
```

Add `indexFacts` to the `context: Ctx` object, and add `readonly indexFacts: FactIndexer;` to the `Ctx` type. Add `extractFactsStage()` to the `stages` array after `summarizeStage` (facts benefit from the appended summary block).

- [ ] **Step 3: Assert facts were produced, then materialize threads**

After the existing assertions, before writing `RESULTS_FILE`:

```ts
// Facts: the advisory substrate is populated and queryable.
const facts: Fact[] = await factRuntime.runPromise(
  Effect.gen(function* () {
    const store = yield* SemanticStore;
    return yield* store.query({});
  }),
);
expect(facts.length).toBeGreaterThan(0);

// Threads: group the captured messages and persist canonical Thread objects.
const threads = buildThreads(items, { ownerEmail: 'owner@dxos.org', now: new Date().toISOString() });
for (const thread of threads) {
  db.add(thread);
}
await db.flush({ indexes: true });
const storedThreads = await db.query(Filter.type(Thread)).run();
expect(storedThreads.length).toBe(threads.length);
expect(storedThreads.every((thread) => thread.messageIds.length > 0)).toBe(true);
```

- [ ] **Step 4: Register the Thread type + dispose the runtime**

In `beforeAll`, add `Thread` to the database `types`:

```ts
({ db } = await builder.createDatabase({ types: [Organization.Organization, Person.Person, Thread] }));
```

In `afterAll`, dispose the new runtime:

```ts
await factRuntime.dispose();
```

> If `factRuntime` is scoped inside the `test` body (not `beforeAll`), dispose it at the end of the test instead. Keep whichever scope the existing `runtime` uses for consistency.

- [ ] **Step 5: Run the gated suite with the dataset + Ollama**

Run: `moon run pipeline-email:setup` then `ROOT_DIR="$(pwd)/packages/core/compute/pipeline-email/data/enron-emails" moon run pipeline-email:test -- src/email-pipeline.test.ts`
Expected: PASS — facts produced, Threads materialized. (Skipped automatically where the dataset/Ollama are absent; that is acceptable in CI.)

- [ ] **Step 6: Run the full non-gated suite + lint + build**

Run: `moon run pipeline-email:test` then `moon run pipeline-email:lint -- --fix` then `moon run pipeline-email:build`
Expected: all PASS; the gated email test skips, all unit tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/core/compute/pipeline-email/src/email-pipeline.test.ts
git commit -m "test(pipeline-email): extract facts and materialize threads in the Enron run"
```

---

## Self-Review

**Spec coverage (slices §9.1–9.2):**
- §9.1 "run the message stream through semantic-index extraction (email-tuned rules)" → Tasks 2, 3.
- §9.1 "reconcile entities to Person/Organization" → Task 4.
- §9.1 "verdict: which ① aspects are naturally facts" → observable via Task 8's fact assertions + the extraction rules; the E/C/Q verdict is captured by inspection of produced facts (a written finding, not code — noted in the spec, deferred to post-run analysis).
- §9.2 "Stage.window by threadId" → **corrected**: `Stage.window` is a sliding window, so grouping is a post-stream compute (`buildThreads`, Task 7) keyed by a derived `threadId` (Task 5). Documented in this plan's Architecture note and Task 7.
- §9.2 "Thread entity with summary + state machine + consolidated Q/action items" → Tasks 6, 7. Consolidated questions/action items are stubbed as empty string arrays this slice (shape stable); population deferred to a later slice, consistent with spec §4.3 modeling them as entities later.

**Placeholder scan:** No TBD/TODO. Two explicit "verify the real field names / API against source" notes (Task 4 Person/Org fields; Task 6 `Type.makeObject` idiom) — these are verification steps with a concrete fallback, not placeholders, because those exact schemas live outside the files under test.

**Type consistency:** `FactIndexer` (Task 3) reused verbatim in Task 8. `messageSource` (Task 2) reused in Task 7. `deriveThreadId` (Task 5) reused in Task 7. `Thread`/`ThreadState` (Task 6) consumed by Task 7. `buildThreads` signature (`{ ownerEmail, now, stalePeriodMs? }`) identical across Tasks 7 and 8. `store.query({})` zero-constraint form flagged with a `select(...)` fallback in Tasks 3 and 8.

**Risks to verify during execution (each has a fallback in-task):** exact `SemanticStore` all-facts query form; `Obj.getDXN`/`Obj.instanceOf` API names; `Person`/`Organization` field names; `Type.makeObject`/`DXN.make` import origins.
