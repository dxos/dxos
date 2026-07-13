# Semantic Index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@dxos/semantic-index` — a non-ECHO store that extracts attributed propositions (attribution / assertion / valence) from text and answers SPARQL queries over them, runnable in the browser and on Cloudflare Workers.

**Architecture:** Typed Effect-Schema `Fact` model → a `SemanticStore` facade → Comunica `query-sparql-rdfjs` over a custom RDF/JS `Source` whose `match()` reads SQLite (`@dxos/sql-sqlite`). Facts are stored as **plain RDF reification** (a `Fact` node with `sx:subject/predicate/object` plus PROV-O attribution and `sx:` valence triples) — equivalent to the RDF-star export shape in the design spec §5.1 but free of RDF-star version fragility. Conflicting facts coexist as separate Fact nodes; resolution is a query-time filter. An LLM extraction pipeline writes facts incrementally (keyed by `sourceHash`); a `semanticQuery` tool exposes retrieval to an LLM.

**Tech Stack:** TypeScript, Effect, `effect/Schema`, `@dxos/ai` (`@effect/ai` `LanguageModel.generateObject`), `@dxos/sql-sqlite` (`@effect/sql`), `@comunica/query-sparql-rdfjs`, `n3` (DataFactory), `asynciterator` (RDF/JS streams), `@effect/vitest` + `vitest`.

**Design spec:** `agents/superpowers/specs/2026-06-27-semantic-index-design.md`.

**Conventions reference:** mirror `packages/core/compute/extractor` and `packages/core/compute/transcription-pipeline` for package.json/moon.yml/tsconfig/test style.

---

## File Structure

```
packages/core/compute/semantic-index/
  package.json            # private:true; deps below
  moon.yml                # library; entryPoints src/index.ts + src/testing/index.ts
  tsconfig.json           # references to @dxos deps
  src/
    index.ts              # barrel exports
    Entity.ts             # Effect Schema: Entity
    Assertion.ts          # Effect Schema: Assertion
    Valence.ts            # Effect Schema: Valence (FactBank values)
    Attribution.ts        # Effect Schema: Attribution (PROV-O names)
    Fact.ts               # Effect Schema: Fact (composes the above)
    SemanticStore.ts      # Context.Tag service + SemanticQuery type + layer
    SemanticPipeline.ts   # chunk → extract → link → reconcile → persist
    errors.ts             # tagged errors
    internal/
      vocab.ts            # IRI namespaces + term helpers
      sparql/
        mapping.ts        # factToTriples / bindingsToFacts
        query-builder.ts  # SemanticQuery → SPARQL string
        engine.ts         # Comunica QueryEngine wrapper
      source/
        sqlite-source.ts  # RDF/JS Source.match/countQuads over SQLite
      sqlite/
        schema.ts         # migrate(): triples / entities / cursors tables
      stages/
        chunk.ts          # deterministic text chunking
        extract.ts        # LLM structured extraction → Fact[]
    testing/
      index.ts            # TestLayer, mockAiService, fixtures loader
      harness/
        fetch.ts          # invoke inbox/discord sync OR load fixtures
        save.ts           # write Message[] to JSON
        feed.ts           # run pipeline over messages → store
  fixtures/
    synthetic-emails.json # Alice/Paris etc. (Message[] shape)
    expected-facts.json   # expected extracted facts for eval
```

---

## Task 1: Package scaffold

**Files:**

- Create: `packages/core/compute/semantic-index/package.json`
- Create: `packages/core/compute/semantic-index/moon.yml`
- Create: `packages/core/compute/semantic-index/tsconfig.json`
- Create: `packages/core/compute/semantic-index/src/index.ts`
- Create: `packages/core/compute/semantic-index/src/testing/index.ts`
- Create: `packages/core/compute/semantic-index/src/smoke.test.ts`
- Modify: `pnpm-workspace.yaml` (catalog entries)

- [ ] **Step 1: Add catalog entries for the new external deps**

In `pnpm-workspace.yaml`, under the `catalog:` map (keep alphabetical-ish, preserve comments), add:

```yaml
'@comunica/query-sparql-rdfjs': 5.2.3
asynciterator: 3.9.0
n3: 2.1.0
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "@dxos/semantic-index",
  "version": "0.9.0",
  "private": true,
  "description": "Semantic index: extracts attributed propositions from text and answers SPARQL queries over them.",
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
    "@dxos/echo": "workspace:*",
    "@dxos/effect": "workspace:*",
    "@dxos/invariant": "workspace:*",
    "@dxos/log": "workspace:*",
    "@dxos/sql-sqlite": "workspace:*",
    "@comunica/query-sparql-rdfjs": "catalog:",
    "@effect/ai": "catalog:",
    "asynciterator": "catalog:",
    "n3": "catalog:"
  },
  "devDependencies": {
    "@dxos/echo-client": "workspace:*",
    "@effect/sql-sqlite-node": "catalog:",
    "@effect/vitest": "catalog:",
    "effect": "catalog:",
    "vitest": "catalog:"
  },
  "peerDependencies": { "effect": "catalog:" },
  "publishConfig": { "access": "restricted" },
  "beast": {}
}
```

Note: `@effect/sql-sqlite-node`, `@effect/vitest`, `vitest` are already catalog entries in this repo (used by index-core). If `tsc` reports a missing catalog key for any, copy its version from `packages/core/echo/index-core/package.json`.

- [ ] **Step 3: Create `moon.yml`**

```yaml
layer: library
language: typescript
tags:
  - ts-build
  - ts-test
  - pack
tasks:
  compile:
    args:
      - '--entryPoint=src/index.ts'
      - '--entryPoint=src/testing/index.ts'
      - '--platform=neutral'
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "extends": "../../../../tsconfig.base.json",
  "compilerOptions": {},
  "include": ["src", "src/**/*.json"],
  "references": [
    { "path": "../../../common/effect" },
    { "path": "../../../common/invariant" },
    { "path": "../../../common/log" },
    { "path": "../../../common/sql-sqlite" },
    { "path": "../../echo/echo" },
    { "path": "../../echo/echo-client" },
    { "path": "../ai" }
  ]
}
```

- [ ] **Step 5: Create placeholder barrels**

`src/index.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

export * from './errors';
```

`src/testing/index.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

export {};
```

`src/errors.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { Data } from 'effect';

export class SemanticIndexError extends Data.TaggedError('SemanticIndexError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
```

- [ ] **Step 6: Write a smoke test**

`src/smoke.test.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SemanticIndexError } from './errors';

describe('semantic-index scaffold', () => {
  test('package imports', ({ expect }) => {
    const error = new SemanticIndexError({ message: 'x' });
    expect(error._tag).toBe('SemanticIndexError');
  });
});
```

- [ ] **Step 7: Install + build + test**

Run: `pnpm install` (from repo root; uses `CI=true` if non-interactive)
Run: `moon run @dxos/semantic-index:build`
Expected: build succeeds (ignore the `DEPOT_TOKEN` warning).
Run: `moon run @dxos/semantic-index:test`
Expected: 1 passing test.

- [ ] **Step 8: Commit**

```bash
git add packages/core/compute/semantic-index pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "feat(semantic-index): package scaffold"
```

---

## Task 2: Effect-Schema data model

**Files:**

- Create: `src/Entity.ts`, `src/Assertion.ts`, `src/Valence.ts`, `src/Attribution.ts`, `src/Fact.ts`
- Modify: `src/index.ts`
- Test: `src/Fact.test.ts`

- [ ] **Step 1: Write the failing round-trip test**

`src/Fact.test.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Fact } from './Fact';

const ALICE_FACT: Fact = {
  id: 'fact-1',
  assertion: {
    subject: { entity: 'alice' },
    predicate: 'travelsTo',
    object: { entity: 'paris' },
    validFrom: '2026-06-12',
    quote: "I think I'm probably going to Paris next week",
  },
  valence: { factuality: 'PR+', polarity: '+', confidence: 0.6, nature: 'epistemic' },
  attribution: {
    agent: 'alice',
    source: 'dxn:queue:...:msg-1',
    generatedAtTime: '2026-06-06T00:00:00.000Z',
  },
  recordedAt: '2026-06-06T12:00:00.000Z',
  extractor: { id: 'default', model: 'ai.claude.model.claude-haiku-4-5', version: '1' },
  sourceHash: 'abc123',
};

describe('Fact schema', () => {
  test('encodes and decodes via JSON', ({ expect }) => {
    const encoded = Schema.encodeSync(Fact)(ALICE_FACT);
    const json = JSON.stringify(encoded);
    const decoded = Schema.decodeUnknownSync(Fact)(JSON.parse(json));
    expect(decoded).toEqual(ALICE_FACT);
  });

  test('rejects an invalid factuality value', ({ expect }) => {
    expect(() =>
      Schema.decodeUnknownSync(Fact)({ ...ALICE_FACT, valence: { ...ALICE_FACT.valence, factuality: 'NOPE' } }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run it — expect failure (no `./Fact`)**

Run: `moon run @dxos/semantic-index:test -- src/Fact.test.ts`
Expected: FAIL (cannot find module `./Fact`).

- [ ] **Step 3: Implement `src/Entity.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

export const EntityKind = Schema.Literal('person', 'org', 'place', 'event', 'concept', 'thing');
export type EntityKind = Schema.Schema.Type<typeof EntityKind>;

export const Entity = Schema.Struct({
  id: Schema.String,
  kind: EntityKind,
  label: Schema.String,
  aliases: Schema.Array(Schema.String),
  /** DXN of a canonical ECHO object (Person/Organization/Event), if resolved. */
  ref: Schema.optional(Schema.String),
});
export interface Entity extends Schema.Schema.Type<typeof Entity> {}
```

- [ ] **Step 4: Implement `src/Assertion.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/** Subject/object is either a reference to an Entity or a literal value. */
export const Term = Schema.Union(Schema.Struct({ entity: Schema.String }), Schema.Struct({ literal: Schema.String }));
export type Term = Schema.Schema.Type<typeof Term>;

export const Assertion = Schema.Struct({
  subject: Term,
  predicate: Schema.String,
  object: Term,
  /** ISO date when the asserted state holds. */
  validFrom: Schema.optional(Schema.String),
  validTo: Schema.optional(Schema.String),
  /** Source span text. */
  quote: Schema.optional(Schema.String),
});
export interface Assertion extends Schema.Schema.Type<typeof Assertion> {}
```

- [ ] **Step 5: Implement `src/Valence.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/** FactBank factuality values: (CT|PR|PS) × (+|-) plus CTu (polarity unknown) and Uu (uncommitted). */
export const Factuality = Schema.Literal('CT+', 'CT-', 'PR+', 'PR-', 'PS+', 'PS-', 'CTu', 'Uu');
export type Factuality = Schema.Schema.Type<typeof Factuality>;

export const Valence = Schema.Struct({
  factuality: Factuality,
  polarity: Schema.Literal('+', '-', '?'),
  /** Model confidence 0..1. */
  confidence: Schema.optional(Schema.Number),
  nature: Schema.optional(Schema.Literal('epistemic', 'aleatory')),
});
export interface Valence extends Schema.Schema.Type<typeof Valence> {}
```

- [ ] **Step 6: Implement `src/Attribution.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/** PROV-O-named provenance. `source`/`wasDerivedFrom` are DXN strings. */
export const Attribution = Schema.Struct({
  agent: Schema.optional(Schema.String),
  source: Schema.String,
  generatedAtTime: Schema.String,
  wasDerivedFrom: Schema.optional(Schema.Array(Schema.String)),
  span: Schema.optional(Schema.Struct({ start: Schema.Number, end: Schema.Number })),
});
export interface Attribution extends Schema.Schema.Type<typeof Attribution> {}
```

- [ ] **Step 7: Implement `src/Fact.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Assertion } from './Assertion';
import { Attribution } from './Attribution';
import { Valence } from './Valence';

export const Fact = Schema.Struct({
  id: Schema.String,
  assertion: Assertion,
  valence: Valence,
  attribution: Attribution,
  /** ISO transaction time. */
  recordedAt: Schema.String,
  extractor: Schema.Struct({ id: Schema.String, model: Schema.String, version: Schema.String }),
  /** For incremental divergence detection. */
  sourceHash: Schema.String,
});
export interface Fact extends Schema.Schema.Type<typeof Fact> {}
```

- [ ] **Step 8: Export from barrel**

`src/index.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

export * from './Assertion';
export * from './Attribution';
export * from './Entity';
export * from './Fact';
export * from './Valence';
export * from './errors';
```

- [ ] **Step 9: Run test — expect pass**

Run: `moon run @dxos/semantic-index:test -- src/Fact.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 10: Commit**

```bash
git add packages/core/compute/semantic-index/src
git commit -m "feat(semantic-index): Effect-Schema fact model"
```

---

## Task 3: Vocabulary + Fact ↔ reified-triples mapping

**Files:**

- Create: `src/internal/vocab.ts`
- Create: `src/internal/sparql/mapping.ts`
- Test: `src/internal/sparql/mapping.test.ts`

- [ ] **Step 1: Write the failing round-trip test**

`src/internal/sparql/mapping.test.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Fact } from '../../Fact';
import { factToTriples, triplesToFacts } from './mapping';

const FACT: Fact = {
  id: 'fact-1',
  assertion: {
    subject: { entity: 'alice' },
    predicate: 'travelsTo',
    object: { entity: 'paris' },
    validFrom: '2026-06-12',
  },
  valence: { factuality: 'PR+', polarity: '+', confidence: 0.6, nature: 'epistemic' },
  attribution: { agent: 'alice', source: 'dxn:queue:x:m1', generatedAtTime: '2026-06-06T00:00:00.000Z' },
  recordedAt: '2026-06-06T12:00:00.000Z',
  extractor: { id: 'default', model: 'm', version: '1' },
  sourceHash: 'h1',
};

describe('fact ↔ triples mapping', () => {
  test('round-trips a fact through reified triples', ({ expect }) => {
    const quads = factToTriples(FACT);
    expect(quads.length).toBeGreaterThan(5);
    const [back] = triplesToFacts(quads);
    expect(back).toEqual(FACT);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `moon run @dxos/semantic-index:test -- src/internal/sparql/mapping.test.ts`
Expected: FAIL (no `./mapping`).

- [ ] **Step 3: Implement `src/internal/vocab.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import { DataFactory } from 'n3';

const { namedNode, literal } = DataFactory;

export const SX = 'https://dxos.org/semantic#';
export const PROV = 'http://www.w3.org/ns/prov#';
export const ENTITY = 'https://dxos.org/semantic/entity/';
export const FACT = 'https://dxos.org/semantic/fact/';

export const sx = (name: string) => namedNode(SX + name);
export const prov = (name: string) => namedNode(PROV + name);
export const entityIri = (id: string) => namedNode(ENTITY + encodeURIComponent(id));
export const factIri = (id: string) => namedNode(FACT + encodeURIComponent(id));

export const str = (value: string) => literal(value);
export const entityIdFromIri = (iri: string) => decodeURIComponent(iri.slice(ENTITY.length));
export const factIdFromIri = (iri: string) => decodeURIComponent(iri.slice(FACT.length));
```

- [ ] **Step 4: Implement `src/internal/sparql/mapping.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import { DataFactory, type Quad, type Term as RdfTerm } from 'n3';

import { type Assertion, type Term } from '../../Assertion';
import { type Fact } from '../../Fact';
import { entityIdFromIri, entityIri, ENTITY, factIdFromIri, factIri, prov, str, sx } from '../vocab';

const { quad, defaultGraph } = DataFactory;

const termToObject = (term: Term): RdfTerm => ('entity' in term ? entityIri(term.entity) : str(term.literal));

const objectToTerm = (term: RdfTerm): Term =>
  term.termType === 'NamedNode' && term.value.startsWith(ENTITY)
    ? { entity: entityIdFromIri(term.value) }
    : { literal: term.value };

/** Expand a Fact into plain reified triples (a Fact node + annotations). */
export const factToTriples = (fact: Fact): Quad[] => {
  const node = factIri(fact.id);
  const g = defaultGraph();
  const triples: Quad[] = [
    quad(node, sx('subject'), termToObject(fact.assertion.subject), g),
    quad(node, sx('predicate'), str(fact.assertion.predicate), g),
    quad(node, sx('object'), termToObject(fact.assertion.object), g),
    quad(node, sx('factuality'), str(fact.valence.factuality), g),
    quad(node, sx('polarity'), str(fact.valence.polarity), g),
    quad(node, prov('wasAttributedTo'), fact.attribution.agent ? entityIri(fact.attribution.agent) : str('')),
    quad(node, prov('wasDerivedFrom'), str(fact.attribution.source), g),
    quad(node, prov('generatedAtTime'), str(fact.attribution.generatedAtTime), g),
    quad(node, sx('recordedAt'), str(fact.recordedAt), g),
    quad(node, sx('sourceHash'), str(fact.sourceHash), g),
    quad(node, sx('extractorId'), str(fact.extractor.id), g),
    quad(node, sx('extractorModel'), str(fact.extractor.model), g),
    quad(node, sx('extractorVersion'), str(fact.extractor.version), g),
  ];
  if (fact.valence.confidence !== undefined)
    triples.push(quad(node, sx('confidence'), str(String(fact.valence.confidence)), g));
  if (fact.valence.nature) triples.push(quad(node, sx('nature'), str(fact.valence.nature), g));
  if (fact.assertion.validFrom) triples.push(quad(node, sx('validFrom'), str(fact.assertion.validFrom), g));
  if (fact.assertion.validTo) triples.push(quad(node, sx('validTo'), str(fact.assertion.validTo), g));
  if (fact.assertion.quote) triples.push(quad(node, sx('quote'), str(fact.assertion.quote), g));
  return triples;
};

/** Reassemble Facts from reified triples (inverse of factToTriples). */
export const triplesToFacts = (quads: Quad[]): Fact[] => {
  const byFact = new Map<string, Map<string, RdfTerm>>();
  for (const q of quads) {
    const id = factIdFromIri(q.subject.value);
    let props = byFact.get(id);
    if (!props) byFact.set(id, (props = new Map()));
    props.set(q.predicate.value, q.object);
  }
  const get = (props: Map<string, RdfTerm>, p: string) => props.get(p);
  const val = (props: Map<string, RdfTerm>, p: string) => props.get(p)?.value;
  const facts: Fact[] = [];
  for (const [id, props] of byFact) {
    const assertion: Assertion = {
      subject: objectToTerm(get(props, 'subject')!),
      predicate: val(props, 'predicate')!,
      object: objectToTerm(get(props, 'object')!),
    };
    if (val(props, 'validFrom')) assertion.validFrom = val(props, 'validFrom');
    if (val(props, 'validTo')) assertion.validTo = val(props, 'validTo');
    if (val(props, 'quote')) assertion.quote = val(props, 'quote');
    const agentTerm = get(props, 'wasAttributedTo');
    facts.push({
      id,
      assertion,
      valence: {
        factuality: val(props, 'factuality') as Fact['valence']['factuality'],
        polarity: val(props, 'polarity') as Fact['valence']['polarity'],
        ...(val(props, 'confidence') !== undefined ? { confidence: Number(val(props, 'confidence')) } : {}),
        ...(val(props, 'nature') ? { nature: val(props, 'nature') as 'epistemic' | 'aleatory' } : {}),
      },
      attribution: {
        ...(agentTerm && agentTerm.value ? { agent: objectToTerm(agentTerm).entity ?? undefined } : {}),
        source: val(props, 'wasDerivedFrom')!,
        generatedAtTime: val(props, 'generatedAtTime')!,
      },
      recordedAt: val(props, 'recordedAt')!,
      extractor: {
        id: val(props, 'extractorId')!,
        model: val(props, 'extractorModel')!,
        version: val(props, 'extractorVersion')!,
      },
      sourceHash: val(props, 'sourceHash')!,
    });
  }
  return facts;
};
```

Note: the predicate IRIs use the namespaces from `vocab.ts`, mapping the `wasAttributedTo`/`wasDerivedFrom`/`generatedAtTime` PROV terms by value (`PROV + name`). Because `triplesToFacts` keys annotations by `q.predicate.value` (full IRI), update the lookups to use full IRIs OR strip namespaces. To keep Step 4 simple, change the `props.set`/`val` keys to the **local name** by stripping the namespace; implement that with a small helper:

Add to `mapping.ts` (replace the `props.set(q.predicate.value, ...)` line and `val`/`get` to use local names):

```typescript
const localName = (iri: string) => iri.replace(/^.*[#/]/, '');
// in the loop: props.set(localName(q.predicate.value), q.object);
```

(`generatedAtTime`, `wasAttributedTo`, etc. all reduce to their local names, matching the `val(props, 'generatedAtTime')` lookups.)

- [ ] **Step 5: Run test — expect pass**

Run: `moon run @dxos/semantic-index:test -- src/internal/sparql/mapping.test.ts`
Expected: PASS. If the agent/optional handling fails on equality, ensure omitted optionals are not present as `undefined` keys (use the conditional-spread pattern shown).

- [ ] **Step 6: Commit**

```bash
git add packages/core/compute/semantic-index/src/internal
git commit -m "feat(semantic-index): vocab + fact↔triples reification mapping"
```

---

## Task 4: SQLite schema + migrate

**Files:**

- Create: `src/internal/sqlite/schema.ts`
- Test: `src/internal/sqlite/schema.test.ts`

- [ ] **Step 1: Write the failing test**

`src/internal/sqlite/schema.test.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as SqlClient from '@effect/sql/SqlClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { migrate } from './schema';

const TestLayer = SqliteClient.layer({ filename: ':memory:' });

describe('sqlite schema', () => {
  it.effect(
    'creates the triples table',
    Effect.fnUntraced(function* () {
      yield* migrate();
      const sql = yield* SqlClient.SqlClient;
      yield* sql`INSERT INTO triples (s, p, o, oType, g) VALUES ('a', 'b', 'c', 'iri', '')`;
      const rows = yield* sql<{ s: string }>`SELECT s FROM triples WHERE p = 'b'`;
      yield* Effect.sync(() => {
        if (rows[0]?.s !== 'a') throw new Error('insert/select failed');
      });
    }).pipe(Effect.provide(TestLayer)),
  );
});
```

- [ ] **Step 2: Run — expect failure**

Run: `moon run @dxos/semantic-index:test -- src/internal/sqlite/schema.test.ts`
Expected: FAIL (no `./schema`).

- [ ] **Step 3: Implement `src/internal/sqlite/schema.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';

/** Create the triple store, entity, and cursor tables (idempotent). */
export const migrate = (): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`CREATE TABLE IF NOT EXISTS triples (
      s TEXT NOT NULL, p TEXT NOT NULL, o TEXT NOT NULL,
      oType TEXT NOT NULL, g TEXT NOT NULL DEFAULT ''
    )`;
    yield* sql`CREATE INDEX IF NOT EXISTS triples_spo ON triples (s, p, o)`;
    yield* sql`CREATE INDEX IF NOT EXISTS triples_pos ON triples (p, o)`;
    yield* sql`CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL, label TEXT NOT NULL,
      aliases TEXT NOT NULL DEFAULT '[]', ref TEXT
    )`;
    yield* sql`CREATE TABLE IF NOT EXISTS cursors (source TEXT PRIMARY KEY, hash TEXT NOT NULL)`;
  });
```

`oType` is `'iri'` or `'literal'` so the `Source` can reconstruct RDF terms.

- [ ] **Step 4: Run test — expect pass**

Run: `moon run @dxos/semantic-index:test -- src/internal/sqlite/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/compute/semantic-index/src/internal/sqlite
git commit -m "feat(semantic-index): sqlite schema + migrate"
```

---

## Task 5: SQLite-backed RDF/JS Source

**Files:**

- Create: `src/internal/source/sqlite-source.ts`
- Test: `src/internal/source/sqlite-source.test.ts`

- [ ] **Step 1: Write the failing test**

`src/internal/source/sqlite-source.test.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as SqlClient from '@effect/sql/SqlClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { DataFactory } from 'n3';

import { migrate } from '../sqlite/schema';
import { insertQuads, makeSqliteSource } from './sqlite-source';

const { namedNode, variable } = DataFactory;
const TestLayer = SqliteClient.layer({ filename: ':memory:' });

const collect = (stream: any): Promise<any[]> =>
  new Promise((resolve, reject) => {
    const out: any[] = [];
    stream.on('data', (q: any) => out.push(q));
    stream.on('end', () => resolve(out));
    stream.on('error', reject);
  });

describe('sqlite source', () => {
  it.effect(
    'match returns quads by subject pattern',
    Effect.fnUntraced(function* () {
      yield* migrate();
      const sql = yield* SqlClient.SqlClient;
      yield* insertQuads(sql, [
        DataFactory.quad(namedNode('s:a'), namedNode('p:1'), namedNode('o:x')),
        DataFactory.quad(namedNode('s:b'), namedNode('p:1'), namedNode('o:y')),
      ]);
      const source = makeSqliteSource(sql);
      const results = yield* Effect.promise(() => collect(source.match(namedNode('s:a'), null, null, null)));
      yield* Effect.sync(() => {
        if (results.length !== 1 || results[0].object.value !== 'o:x') throw new Error('bad match');
      });
    }).pipe(Effect.provide(TestLayer)),
  );
});
```

- [ ] **Step 2: Run — expect failure**

Run: `moon run @dxos/semantic-index:test -- src/internal/source/sqlite-source.test.ts`
Expected: FAIL (no `./sqlite-source`).

- [ ] **Step 3: Implement `src/internal/source/sqlite-source.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import { ArrayIterator } from 'asynciterator';
import * as Effect from 'effect/Effect';
import { DataFactory, type Quad, type Term as RdfTerm } from 'n3';

const { namedNode, literal, quad, defaultGraph } = DataFactory;

type Row = { s: string; p: string; o: string; oType: string; g: string };

const rowToQuad = (row: Row): Quad => {
  const object: RdfTerm = row.oType === 'iri' ? namedNode(row.o) : literal(row.o);
  return quad(namedNode(row.s), namedNode(row.p), object, defaultGraph());
};

const objectColumn = (object: Quad['object'] | null) =>
  object && object.termType !== 'Variable'
    ? { value: object.value, oType: object.termType === 'Literal' ? 'literal' : 'iri' }
    : undefined;

/** Persist quads as rows. Used by the store's putFacts. */
export const insertQuads = (sql: SqlClient.SqlClient, quads: readonly Quad[]): Effect.Effect<void, SqlError.SqlError> =>
  Effect.forEach(
    quads,
    (q) => {
      const obj = objectColumn(q.object)!;
      return sql`INSERT INTO triples (s, p, o, oType, g) VALUES (${q.subject.value}, ${q.predicate.value}, ${obj.value}, ${obj.oType}, ${q.graph.value ?? ''})`;
    },
    { discard: true },
  );

/**
 * RDF/JS Source backed by the `triples` table. Comunica calls match() per pattern;
 * we translate the bound positions into an indexed SQL query and stream the rows.
 * The Source closes over an Effect runtime via a synchronous query executor.
 */
export const makeSqliteSource = (sql: SqlClient.SqlClient) => {
  // Comunica's match() is synchronous-returning (RDF.Stream). We run the SQL eagerly
  // through Effect.runPromise inside an iterator that buffers, which is acceptable for
  // v1 (datasets fit in memory; see spec §6 scale strategy).
  const run = (s: RdfTerm | null, p: RdfTerm | null, o: RdfTerm | null): Promise<Quad[]> => {
    const conds: string[] = [];
    const binds: string[] = [];
    if (s && s.termType !== 'Variable') (conds.push('s = ?'), binds.push(s.value));
    if (p && p.termType !== 'Variable') (conds.push('p = ?'), binds.push(p.value));
    if (o && o.termType !== 'Variable') (conds.push('o = ?'), binds.push(o.value));
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return Effect.runPromise(
      Effect.gen(function* () {
        const rows = yield* sql.unsafe<Row>(`SELECT s, p, o, oType, g FROM triples ${where}`, binds as any);
        return rows.map(rowToQuad);
      }).pipe(Effect.provideService(SqlClient.SqlClient, sql)),
    );
  };

  return {
    match(s: RdfTerm | null, p: RdfTerm | null, o: RdfTerm | null, _g: RdfTerm | null) {
      const it = new ArrayIterator<Quad>([], { autoStart: false });
      run(s, p, o).then(
        (quads) => it.append(quads),
        (err) => it.emit('error', err),
      );
      return it as any;
    },
  };
};
```

Note on the executor: `Effect.provideService(SqlClient.SqlClient, sql)` re-provides the already-resolved client so the inner `sql.unsafe` runs without a fresh layer. If `sql.unsafe(text, binds)` arity differs in this `@effect/sql` version, use a parameterized tagged query built with `sql.and`/`sql.in` instead; verify against `packages/core/echo/index-core/src/indexes/entity-meta-index.ts` which builds dynamic WHERE clauses.

- [ ] **Step 4: Run test — expect pass**

Run: `moon run @dxos/semantic-index:test -- src/internal/source/sqlite-source.test.ts`
Expected: PASS. If `ArrayIterator` lacks `append` after construction, build it from the resolved promise instead: `return new ArrayIterator(await run(...))` wrapped via `wrap()` from `asynciterator` (`import { wrap } from 'asynciterator'; return wrap(run(s,p,o))`). Prefer the `wrap(promiseOfArray)` form if available.

- [ ] **Step 5: Commit**

```bash
git add packages/core/compute/semantic-index/src/internal/source
git commit -m "feat(semantic-index): sqlite-backed RDF/JS Source"
```

---

## Task 6: SemanticStore facade (Comunica + putFacts + query)

**Files:**

- Create: `src/internal/sparql/query-builder.ts`
- Create: `src/internal/sparql/engine.ts`
- Create: `src/SemanticStore.ts`
- Modify: `src/index.ts`
- Test: `src/SemanticStore.test.ts`

- [ ] **Step 1: Write the failing test (the Alice example + a conflict)**

`src/SemanticStore.test.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type Fact } from './Fact';
import { SemanticStore } from './SemanticStore';

const mk = (over: Partial<Fact> & Pick<Fact, 'id'>): Fact =>
  ({
    assertion: { subject: { entity: 'alice' }, predicate: 'travelsTo', object: { entity: 'paris' } },
    valence: { factuality: 'PR+', polarity: '+', confidence: 0.6 },
    attribution: { agent: 'alice', source: 'dxn:q:m1', generatedAtTime: '2026-06-06T00:00:00.000Z' },
    recordedAt: '2026-06-06T12:00:00.000Z',
    extractor: { id: 'default', model: 'm', version: '1' },
    sourceHash: 'h1',
    ...over,
  }) as Fact;

const TestLayer = SemanticStore.layer.pipe(Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' })));

describe('SemanticStore', () => {
  it.effect(
    'stores and queries the Alice fact by subject entity',
    Effect.fnUntraced(function* () {
      const store = yield* SemanticStore;
      yield* store.putFacts([mk({ id: 'f1' })]);
      const facts = yield* store.query({ subjectEntity: 'alice' });
      yield* Effect.sync(() => {
        if (facts.length !== 1 || facts[0].assertion.predicate !== 'travelsTo') throw new Error('query failed');
        if (facts[0].valence.factuality !== 'PR+') throw new Error('valence lost');
      });
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect(
    'keeps conflicting facts about the same subject/predicate',
    Effect.fnUntraced(function* () {
      const store = yield* SemanticStore;
      yield* store.putFacts([
        mk({
          id: 'f1',
          assertion: { subject: { entity: 'alice' }, predicate: 'travelsTo', object: { entity: 'paris' } },
        }),
        mk({
          id: 'f2',
          assertion: { subject: { entity: 'alice' }, predicate: 'travelsTo', object: { entity: 'rome' } },
          attribution: { agent: 'bob', source: 'dxn:q:m2', generatedAtTime: '2026-06-07T00:00:00.000Z' },
        }),
      ]);
      const facts = yield* store.query({ subjectEntity: 'alice', predicate: 'travelsTo' });
      yield* Effect.sync(() => {
        if (facts.length !== 2) throw new Error(`expected 2 conflicting facts, got ${facts.length}`);
      });
    }).pipe(Effect.provide(TestLayer)),
  );
});
```

- [ ] **Step 2: Run — expect failure**

Run: `moon run @dxos/semantic-index:test -- src/SemanticStore.test.ts`
Expected: FAIL (no `./SemanticStore`).

- [ ] **Step 3: Implement `src/internal/sparql/query-builder.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import { entityIri, PROV, SX } from '../vocab';

export type SemanticQuery = {
  /** Entity id appearing as the assertion subject. */
  readonly subjectEntity?: string;
  readonly predicate?: string;
  /** Entity id appearing as subject OR object. */
  readonly entity?: string;
  /** Provenance source DXN. */
  readonly source?: string;
  readonly minConfidence?: number;
};

/** Build a SELECT returning each matching fact node and all its annotation props. */
export const buildSparql = (query: SemanticQuery): string => {
  const filters: string[] = [];
  if (query.subjectEntity) filters.push(`?fact <${SX}subject> <${entityIri(query.subjectEntity).value}> .`);
  if (query.predicate) filters.push(`?fact <${SX}predicate> ${JSON.stringify(query.predicate)} .`);
  if (query.source) filters.push(`?fact <${PROV}wasDerivedFrom> ${JSON.stringify(query.source)} .`);
  if (query.entity) {
    const iri = entityIri(query.entity).value;
    filters.push(`{ ?fact <${SX}subject> <${iri}> } UNION { ?fact <${SX}object> <${iri}> }`);
  }
  let filterConf = '';
  if (query.minConfidence !== undefined) {
    filters.push(`?fact <${SX}confidence> ?conf .`);
    filterConf = `FILTER(xsd:decimal(?conf) >= ${query.minConfidence})`;
  }
  return `
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    SELECT ?fact ?p ?o WHERE {
      { SELECT DISTINCT ?fact WHERE { ${filters.join('\n')} ${filterConf} } }
      ?fact ?p ?o .
    }`;
};
```

The inner SELECT finds matching fact nodes; the outer returns all `?p ?o` annotations so the store can rebuild full `Fact`s via `triplesToFacts`.

- [ ] **Step 4: Implement `src/internal/sparql/engine.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import { QueryEngine } from '@comunica/query-sparql-rdfjs';
import * as Effect from 'effect/Effect';
import { DataFactory, type Quad } from 'n3';

const { namedNode, quad } = DataFactory;

export const makeEngine = () => new QueryEngine();

/** Run a SELECT and return result quads `(?fact ?p ?o)` reassembled as Quads. */
export const selectTriples = (engine: QueryEngine, source: any, sparql: string): Effect.Effect<Quad[]> =>
  Effect.promise(async () => {
    const stream = await engine.queryBindings(sparql, { sources: [source] });
    const bindings = await stream.toArray();
    return bindings.map((b: any) => quad(b.get('fact'), b.get('p'), b.get('o')));
  });
```

Because `?o` may be a literal or IRI, Comunica returns the correctly-typed term, so `triplesToFacts` (which checks `termType`/namespace) works unchanged.

- [ ] **Step 5: Implement `src/SemanticStore.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type Fact } from './Fact';
import { makeEngine, selectTriples } from './internal/sparql/engine';
import { factToTriples, triplesToFacts } from './internal/sparql/mapping';
import { buildSparql, type SemanticQuery } from './internal/sparql/query-builder';
import { insertQuads, makeSqliteSource } from './internal/source/sqlite-source';
import { migrate } from './internal/sqlite/schema';

export { type SemanticQuery } from './internal/sparql/query-builder';

export interface SemanticStoreApi {
  readonly putFacts: (facts: readonly Fact[]) => Effect.Effect<void>;
  readonly query: (query: SemanticQuery) => Effect.Effect<Fact[]>;
  readonly cursor: (source: string) => Effect.Effect<string | undefined>;
  readonly setCursor: (source: string, hash: string) => Effect.Effect<void>;
}

export class SemanticStore extends Context.Tag('@dxos/semantic-index/SemanticStore')<
  SemanticStore,
  SemanticStoreApi
>() {
  static layer: Layer.Layer<SemanticStore, never, SqlClient.SqlClient> = Layer.scoped(
    SemanticStore,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* migrate().pipe(Effect.orDie);
      const engine = makeEngine();
      const source = makeSqliteSource(sql);

      const putFacts: SemanticStoreApi['putFacts'] = (facts) =>
        insertQuads(sql, facts.flatMap(factToTriples)).pipe(Effect.orDie);

      const query: SemanticStoreApi['query'] = (q) =>
        selectTriples(engine, source, buildSparql(q)).pipe(Effect.map(triplesToFacts));

      const cursor: SemanticStoreApi['cursor'] = (source) =>
        sql<{ hash: string }>`SELECT hash FROM cursors WHERE source = ${source}`.pipe(
          Effect.map((rows) => rows[0]?.hash),
          Effect.orDie,
        );

      const setCursor: SemanticStoreApi['setCursor'] = (source, hash) =>
        sql`INSERT INTO cursors (source, hash) VALUES (${source}, ${hash})
            ON CONFLICT(source) DO UPDATE SET hash = ${hash}`.pipe(Effect.asVoid, Effect.orDie);

      return { putFacts, query, cursor, setCursor };
    }),
  );
}
```

- [ ] **Step 6: Export from barrel**

Add to `src/index.ts`: `export * from './SemanticStore';`

- [ ] **Step 7: Run tests — expect pass**

Run: `moon run @dxos/semantic-index:test -- src/SemanticStore.test.ts`
Expected: PASS (2 tests). If Comunica errors on the `source` shape, wrap it as `{ type: 'rdfjsSource', value: source }` in `selectTriples` (`sources: [{ type: 'rdfjsSource', value: source }]`).

- [ ] **Step 8: Commit**

```bash
git add packages/core/compute/semantic-index/src
git commit -m "feat(semantic-index): SemanticStore facade over Comunica + sqlite source"
```

---

## Task 7: Extraction stage + pipeline

**Files:**

- Create: `src/internal/stages/chunk.ts`
- Create: `src/internal/stages/extract.ts`
- Create: `src/SemanticPipeline.ts`
- Create: `src/testing/index.ts` (mock AI), update barrel
- Modify: `src/index.ts`
- Test: `src/SemanticPipeline.test.ts`

- [ ] **Step 1: Implement the mock AI test layer in `src/testing/index.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { AiService } from '@dxos/ai';

/** Minimal AiService whose generateObject returns a fixed object (no network). */
export const mockAiService = (object: unknown): Layer.Layer<AiService.AiService> =>
  Layer.succeed(AiService.AiService, {
    model: () =>
      Layer.succeed(LanguageModel.LanguageModel, {
        generateText: () => Effect.succeed({ text: '', content: [] }),
        generateObject: () => Effect.succeed({ value: object, content: [] }),
        streamText: () => Stream.empty,
      } as any),
  } as any);
```

Cross-check the shape against `packages/core/compute/extractor/src/testing/mock-ai.ts`; copy its exact field set if `AiService.AiService` requires more.

- [ ] **Step 2: Write the failing pipeline test**

`src/SemanticPipeline.test.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { SemanticPipeline } from './SemanticPipeline';
import { SemanticStore } from './SemanticStore';
import { mockAiService } from './testing';

// What the LLM is mocked to return for the Alice email.
const LLM_OUTPUT = {
  facts: [
    {
      subject: 'Alice',
      predicate: 'travelsTo',
      object: 'Paris',
      validFrom: '2026-06-12',
      factuality: 'PR+',
      polarity: '+',
      confidence: 0.6,
      nature: 'epistemic',
      quote: "I think I'm probably going to Paris next week",
    },
  ],
};

const TestLayer = SemanticStore.layer.pipe(
  Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' })),
  Layer.provideMerge(mockAiService(LLM_OUTPUT)),
);

describe('SemanticPipeline', () => {
  it.effect(
    'extracts the Alice fact and persists it',
    Effect.fnUntraced(function* () {
      yield* SemanticPipeline.run([
        {
          text: "I think I'm probably going to Paris next week",
          source: 'dxn:q:m1',
          author: 'Alice',
          date: '2026-06-06T00:00:00.000Z',
        },
      ]);
      const store = yield* SemanticStore;
      const facts = yield* store.query({ predicate: 'travelsTo' });
      yield* Effect.sync(() => {
        if (facts.length !== 1) throw new Error(`expected 1 fact, got ${facts.length}`);
        if (facts[0].valence.factuality !== 'PR+') throw new Error('valence not extracted');
        if (facts[0].attribution.source !== 'dxn:q:m1') throw new Error('attribution source lost');
      });
    }).pipe(Effect.provide(TestLayer)),
  );
});
```

- [ ] **Step 3: Run — expect failure**

Run: `moon run @dxos/semantic-index:test -- src/SemanticPipeline.test.ts`
Expected: FAIL (no `./SemanticPipeline`).

- [ ] **Step 4: Implement `src/internal/stages/chunk.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

/** Split text into analyzable chunks. v1: one chunk per document (messages are short). */
export const chunk = (text: string): string[] => {
  const trimmed = text.trim();
  return trimmed.length ? [trimmed] : [];
};
```

- [ ] **Step 5: Implement `src/internal/stages/extract.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';

import { Factuality } from '../../Valence';

export type ExtractDocument = {
  readonly text: string;
  readonly source: string;
  readonly author?: string;
  readonly date?: string;
};

const DEFAULT_MODEL = 'ai.claude.model.claude-haiku-4-5' as const;

/** Flat LLM payload (entities are surface strings; linking happens in a later stage). */
const ExtractPayload = Schema.Struct({
  facts: Schema.Array(
    Schema.Struct({
      subject: Schema.String,
      predicate: Schema.String,
      object: Schema.String,
      validFrom: Schema.optional(Schema.String),
      validTo: Schema.optional(Schema.String),
      factuality: Factuality,
      polarity: Schema.Literal('+', '-', '?'),
      confidence: Schema.optional(Schema.Number),
      nature: Schema.optional(Schema.Literal('epistemic', 'aleatory')),
      quote: Schema.optional(Schema.String),
    }),
  ),
});
export type ExtractPayload = Schema.Schema.Type<typeof ExtractPayload>;

const PROMPT = `You extract atomic propositions from a message as structured facts.
For each proposition output: subject, predicate (a short verb phrase), object, optional validFrom/validTo (ISO dates), a FactBank factuality value (CT+ certain-positive, PR+ probable-positive, PS+ possible-positive, and their - and CTu/Uu variants), polarity (+/-/?), optional confidence 0..1, optional nature (epistemic/aleatory), and the source quote.
Capture uncertainty in factuality (e.g. "probably" => PR+, "might" => PS+).`;

/** Run schema-constrained extraction for one chunk. */
export const extractChunk = (doc: ExtractDocument): Effect.Effect<ExtractPayload, never, AiService.AiService> =>
  Effect.gen(function* () {
    const context = `Author: ${doc.author ?? 'unknown'}\nDate: ${doc.date ?? 'unknown'}\nMessage:\n${doc.text}`;
    const response = yield* LanguageModel.generateObject({ schema: ExtractPayload, prompt: `${PROMPT}\n\n${context}` });
    return response.value as ExtractPayload;
  }).pipe(Effect.provide(AiService.model(DEFAULT_MODEL).pipe(Layer.orDie)), Effect.orDie);
```

- [ ] **Step 6: Implement `src/SemanticPipeline.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';

import { type Fact } from './Fact';
import { SemanticStore } from './SemanticStore';
import { chunk } from './internal/stages/chunk';
import { type ExtractDocument, extractChunk } from './internal/stages/extract';

export type { ExtractDocument } from './internal/stages/extract';

const slug = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** Deterministic id from source + position so re-runs are stable. */
const factId = (source: string, index: number) => `${source}#${index}`;

const DEFAULT_MODEL = 'ai.claude.model.claude-haiku-4-5';

export const SemanticPipeline = {
  /** Extract → link (slug) → persist for each document. */
  run: (docs: readonly ExtractDocument[]): Effect.Effect<Fact[], never, SemanticStore | AiService.AiService> =>
    Effect.gen(function* () {
      const store = yield* SemanticStore;
      const allFacts: Fact[] = [];
      for (const doc of docs) {
        const chunks = chunk(doc.text);
        let index = 0;
        for (const _text of chunks) {
          const payload = yield* extractChunk(doc);
          for (const f of payload.facts) {
            const fact: Fact = {
              id: factId(doc.source, index++),
              assertion: {
                subject: { entity: slug(f.subject) },
                predicate: f.predicate,
                object: { entity: slug(f.object) },
                ...(f.validFrom ? { validFrom: f.validFrom } : {}),
                ...(f.validTo ? { validTo: f.validTo } : {}),
                ...(f.quote ? { quote: f.quote } : {}),
              },
              valence: {
                factuality: f.factuality,
                polarity: f.polarity,
                ...(f.confidence !== undefined ? { confidence: f.confidence } : {}),
                ...(f.nature ? { nature: f.nature } : {}),
              },
              attribution: {
                ...(doc.author ? { agent: slug(doc.author) } : {}),
                source: doc.source,
                generatedAtTime: doc.date ?? new Date(0).toISOString(),
              },
              recordedAt: new Date(0).toISOString(),
              extractor: { id: 'default', model: DEFAULT_MODEL, version: '1' },
              sourceHash: '',
            };
            allFacts.push(fact);
          }
        }
      }
      yield* store.putFacts(allFacts);
      return allFacts;
    }),
};
```

Note: `recordedAt`/`generatedAtTime` use a fixed epoch placeholder where absent to keep tests deterministic (no `Date.now()` in pipeline core); real timestamps are injected by callers via `doc.date`. Task 8 adds proper `recordedAt` + `sourceHash`.

- [ ] **Step 7: Update barrel**

Add to `src/index.ts`: `export * from './SemanticPipeline';`

- [ ] **Step 8: Run test — expect pass**

Run: `moon run @dxos/semantic-index:test -- src/SemanticPipeline.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/core/compute/semantic-index/src
git commit -m "feat(semantic-index): extraction stage + pipeline"
```

---

## Task 8: Incremental sourceHash + reconcile

**Files:**

- Create: `src/internal/stages/reconcile.ts`
- Modify: `src/SemanticPipeline.ts`
- Test: `src/SemanticPipeline.test.ts` (add cases)

- [ ] **Step 1: Add the failing incremental test**

Append to `src/SemanticPipeline.test.ts`:

```typescript
it.effect(
  'skips re-extraction when the source is unchanged',
  Effect.fnUntraced(function* () {
    const doc = { text: 'going to Paris', source: 'dxn:q:m9', author: 'Alice', date: '2026-06-06T00:00:00.000Z' };
    yield* SemanticPipeline.run([doc]);
    const first = yield* (yield* SemanticStore).query({ predicate: 'travelsTo' });
    yield* SemanticPipeline.run([doc]); // identical → no duplicate facts
    const second = yield* (yield* SemanticStore).query({ predicate: 'travelsTo' });
    yield* Effect.sync(() => {
      if (second.length !== first.length)
        throw new Error(`re-run duplicated facts: ${first.length} -> ${second.length}`);
    });
  }).pipe(Effect.provide(TestLayer)),
);
```

- [ ] **Step 2: Run — expect failure (duplicates appear)**

Run: `moon run @dxos/semantic-index:test -- src/SemanticPipeline.test.ts`
Expected: FAIL (counts differ — re-run duplicates facts).

- [ ] **Step 3: Implement `src/internal/stages/reconcile.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

/** Stable content hash of a document's text (FNV-1a, no crypto dep, deterministic). */
export const hashText = (text: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
};
```

- [ ] **Step 4: Wire incremental skip into `SemanticPipeline.run`**

In `src/SemanticPipeline.ts`, inside the per-doc loop, before chunking:

```typescript
const hash = hashText(doc.text);
const prev = yield * store.cursor(doc.source);
if (prev === hash) continue; // unchanged source → skip
```

And after persisting that doc's facts (move `putFacts` inside the loop, per doc):

```typescript
yield * store.setCursor(doc.source, hash);
```

Set `fact.sourceHash = hash` and `recordedAt: doc.date ?? new Date(0).toISOString()`. Add the import: `import { hashText } from './internal/stages/reconcile';`. Restructure so facts are persisted per-document (so the cursor reflects exactly what was written).

- [ ] **Step 5: Run tests — expect pass**

Run: `moon run @dxos/semantic-index:test -- src/SemanticPipeline.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add packages/core/compute/semantic-index/src
git commit -m "feat(semantic-index): incremental sourceHash cursors"
```

---

## Task 9: Connector harness + synthetic fixtures

**Files:**

- Create: `fixtures/synthetic-emails.json`
- Create: `src/testing/harness/feed.ts`
- Create: `src/testing/harness/save.ts`
- Create: `src/testing/harness/fetch.ts`
- Modify: `src/testing/index.ts`
- Test: `src/testing/harness/feed.test.ts`

- [ ] **Step 1: Create `fixtures/synthetic-emails.json`**

Shape mirrors the fields the pipeline needs (`text`, `source`, `author`, `date`) — a simplified projection of `@dxos/types` `Message`:

```json
[
  {
    "source": "dxn:fixture:msg-1",
    "author": "Alice",
    "date": "2026-06-06T09:00:00.000Z",
    "text": "I think I'm probably going to Paris next week."
  },
  {
    "source": "dxn:fixture:msg-2",
    "author": "Bob",
    "date": "2026-06-07T10:00:00.000Z",
    "text": "Alice told me she's definitely going to Rome, not Paris."
  },
  {
    "source": "dxn:fixture:msg-3",
    "author": "Carol",
    "date": "2026-06-08T11:00:00.000Z",
    "text": "The Q3 board meeting is confirmed for July 15 in London."
  }
]
```

- [ ] **Step 2: Implement `src/testing/harness/save.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import { type ExtractDocument } from '../../SemanticPipeline';

/** Serialize fetched documents to a JSON string (callers write to disk/OPFS). */
export const toJson = (docs: readonly ExtractDocument[]): string => JSON.stringify(docs, null, 2);
export const fromJson = (json: string): ExtractDocument[] => JSON.parse(json) as ExtractDocument[];
```

- [ ] **Step 3: Implement `src/testing/harness/fetch.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import { type ExtractDocument } from '../../SemanticPipeline';

/**
 * Load fixture documents. The live connector path (plugin-inbox / plugin-discord sync
 * operations) plugs in here later; v1 is fixtures-first (spec §9).
 */
export const loadFixtures = (raw: string): ExtractDocument[] => JSON.parse(raw) as ExtractDocument[];
```

- [ ] **Step 4: Implement `src/testing/harness/feed.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';

import { type Fact } from '../../Fact';
import { type ExtractDocument, SemanticPipeline } from '../../SemanticPipeline';
import { SemanticStore } from '../../SemanticStore';

/** Run the pipeline over documents and return the persisted facts. */
export const feed = (
  docs: readonly ExtractDocument[],
): Effect.Effect<Fact[], never, SemanticStore | AiService.AiService> => SemanticPipeline.run(docs);
```

- [ ] **Step 5: Export harness from `src/testing/index.ts`**

Add:

```typescript
export * from './harness/fetch';
export * from './harness/save';
export * from './harness/feed';
```

- [ ] **Step 6: Write the harness test**

`src/testing/harness/feed.test.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { SemanticStore } from '../../SemanticStore';
import { mockAiService } from '../index';
import { loadFixtures } from './fetch';
import { feed } from './feed';

const fixturePath = fileURLToPath(new URL('../../../fixtures/synthetic-emails.json', import.meta.url));

// One mocked extraction reused for every doc (sufficient to exercise the loop).
const LLM_OUTPUT = {
  facts: [{ subject: 'Alice', predicate: 'travelsTo', object: 'Paris', factuality: 'PR+', polarity: '+' }],
};

const TestLayer = SemanticStore.layer.pipe(
  Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' })),
  Layer.provideMerge(mockAiService(LLM_OUTPUT)),
);

describe('harness feed', () => {
  it.effect(
    'feeds fixtures through the pipeline into the store',
    Effect.fnUntraced(function* () {
      const docs = loadFixtures(readFileSync(fixturePath, 'utf8'));
      yield* feed(docs);
      const facts = yield* (yield* SemanticStore).query({ predicate: 'travelsTo' });
      yield* Effect.sync(() => {
        if (facts.length < 1) throw new Error('no facts produced from fixtures');
      });
    }).pipe(Effect.provide(TestLayer)),
  );
});
```

- [ ] **Step 7: Run test — expect pass**

Run: `moon run @dxos/semantic-index:test -- src/testing/harness/feed.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/core/compute/semantic-index/src packages/core/compute/semantic-index/fixtures
git commit -m "feat(semantic-index): connector harness + synthetic fixtures"
```

---

## Task 10: semanticQuery tool + comprehension eval

**Files:**

- Create: `src/tool.ts` (render facts for an LLM)
- Test: `src/tool.test.ts`
- Create: `src/comprehension.test.ts` (expected-facts + LLM-judge ablation)
- Create: `fixtures/expected-facts.json`

- [ ] **Step 1: Implement `src/tool.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Fact } from './Fact';
import { SemanticStore, type SemanticQuery } from './SemanticStore';

/** Compact NL rendering that preserves attribution + valence and surfaces conflicts. */
export const renderFacts = (facts: readonly Fact[]): string =>
  facts
    .map((f) => {
      const subj = 'entity' in f.assertion.subject ? f.assertion.subject.entity : f.assertion.subject.literal;
      const obj = 'entity' in f.assertion.object ? f.assertion.object.entity : f.assertion.object.literal;
      const when = f.attribution.generatedAtTime.slice(0, 10);
      const agent = f.attribution.agent ?? 'unknown';
      const certainty = f.valence.factuality.startsWith('CT')
        ? 'certain'
        : f.valence.factuality.startsWith('PR')
          ? 'probable'
          : 'possible';
      return `- ${agent} (${f.attribution.source}, ${when}): ${subj} ${f.assertion.predicate} ${obj} [${certainty}, ${f.valence.factuality}]`;
    })
    .join('\n');

/** The tool entrypoint: query the store and render. */
export const semanticQuery = (query: SemanticQuery): Effect.Effect<string, never, SemanticStore> =>
  Effect.gen(function* () {
    const store = yield* SemanticStore;
    const facts = yield* store.query(query);
    return facts.length ? renderFacts(facts) : 'No matching facts.';
  });
```

- [ ] **Step 2: Write `src/tool.test.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { SemanticStore } from './SemanticStore';
import { semanticQuery } from './tool';

const TestLayer = SemanticStore.layer.pipe(Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' })));

describe('semanticQuery tool', () => {
  it.effect(
    'renders conflicting facts with attribution and certainty',
    Effect.fnUntraced(function* () {
      const store = yield* SemanticStore;
      yield* store.putFacts([
        {
          id: 'f1',
          assertion: { subject: { entity: 'alice' }, predicate: 'travelsTo', object: { entity: 'paris' } },
          valence: { factuality: 'PR+', polarity: '+' },
          attribution: { agent: 'alice', source: 'dxn:q:m1', generatedAtTime: '2026-06-06T00:00:00.000Z' },
          recordedAt: '2026-06-06T00:00:00.000Z',
          extractor: { id: 'd', model: 'm', version: '1' },
          sourceHash: 'h',
        },
        {
          id: 'f2',
          assertion: { subject: { entity: 'alice' }, predicate: 'travelsTo', object: { entity: 'rome' } },
          valence: { factuality: 'CT+', polarity: '+' },
          attribution: { agent: 'bob', source: 'dxn:q:m2', generatedAtTime: '2026-06-07T00:00:00.000Z' },
          recordedAt: '2026-06-07T00:00:00.000Z',
          extractor: { id: 'd', model: 'm', version: '1' },
          sourceHash: 'h',
        },
      ]);
      const rendered = yield* semanticQuery({ subjectEntity: 'alice', predicate: 'travelsTo' });
      yield* Effect.sync(() => {
        if (!rendered.includes('paris') || !rendered.includes('rome')) throw new Error('conflict not surfaced');
        if (!rendered.includes('probable') || !rendered.includes('certain')) throw new Error('certainty not rendered');
      });
    }).pipe(Effect.provide(TestLayer)),
  );
});
```

- [ ] **Step 3: Run tool test — expect pass**

Run: `moon run @dxos/semantic-index:test -- src/tool.test.ts`
Expected: PASS.

- [ ] **Step 4: Create `fixtures/expected-facts.json`**

```json
{
  "dxn:fixture:msg-1": [{ "subject": "alice", "predicate": "travelsTo", "object": "paris", "factuality": "PR+" }],
  "dxn:fixture:msg-2": [{ "subject": "alice", "predicate": "travelsTo", "object": "rome", "factuality": "CT+" }],
  "dxn:fixture:msg-3": [
    { "subject": "q3-board-meeting", "predicate": "scheduledFor", "object": "2026-07-15", "factuality": "CT+" }
  ]
}
```

- [ ] **Step 5: Write `src/comprehension.test.ts` (expected-facts arm)**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { SemanticStore } from './SemanticStore';
import { SemanticPipeline } from './SemanticPipeline';
import { loadFixtures } from './testing/harness/fetch';
import { mockAiService } from './testing';

const fx = (name: string) => readFileSync(fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url)), 'utf8');

// Per-doc mocked extraction keyed by source (so each fixture yields its expected fact).
const EXPECTED = JSON.parse(fx('expected-facts.json')) as Record<
  string,
  Array<{ subject: string; predicate: string; object: string; factuality: string }>
>;

describe('comprehension: expected facts', () => {
  it.effect(
    'pipeline extracts the expected facts per fixture',
    Effect.fnUntraced(function* () {
      const docs = loadFixtures(fx('synthetic-emails.json'));
      for (const doc of docs) {
        const expected = EXPECTED[doc.source];
        const llm = { facts: expected.map((e) => ({ ...e, polarity: '+' })) };
        yield* SemanticPipeline.run([doc]).pipe(Effect.provide(mockAiService(llm)));
      }
      const store = yield* SemanticStore;
      const all = yield* store.query({});
      yield* Effect.sync(() => {
        const total = Object.values(EXPECTED).reduce((n, a) => n + a.length, 0);
        if (all.length !== total) throw new Error(`expected ${total} facts, got ${all.length}`);
      });
    }).pipe(Effect.provide(SemanticStore.layer.pipe(Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' }))))),
  );
});
```

Note: `query({})` with no filters returns all facts; ensure `buildSparql({})` produces a valid all-facts SELECT (inner pattern becomes `?fact ?anyP ?anyO` — add a fallback: if no filters, inner SELECT is `{ ?fact <SXsubject> ?s }`). Implement that fallback in `query-builder.ts` and re-run.

- [ ] **Step 6: Add the LLM-judge ablation arm (memoized/deferred-live)**

Append a second `describe` to `src/comprehension.test.ts` that, given a real `AiService`, asks a question ("Where is Alice going?") twice — once with `semanticQuery` context, once without — and uses an LLM judge to score whether the tool-augmented answer correctly reflects the _conflict_ and _uncertainty_. Gate it behind an env check so CI stays deterministic:

```typescript
import { semanticQuery } from './tool';

describe.skipIf(!process.env.DX_RUN_LLM_EVAL)('comprehension: LLM-judge ablation', () => {
  // Uses the real AiService layer (see packages/core/compute/assistant testing for the
  // memoized-LLM layer); compares answers with vs without semanticQuery() context and
  // judges attribution/uncertainty/conflict handling. Wire the AiService layer per
  // packages/core/compute/extractor tests when running locally with DX_RUN_LLM_EVAL=1.
  it('tool-augmented answer surfaces the Alice conflict', async () => {
    // Implemented against the memoized-LLM fixture layer; left as an opt-in local eval.
  });
});
```

This keeps CI green (skipped by default) while documenting exactly how to run the ablation locally. Replace the body with the memoized-LLM layer from `packages/core/compute/assistant` when wiring the live eval.

- [ ] **Step 7: Run — expect pass (ablation skipped)**

Run: `moon run @dxos/semantic-index:test -- src/comprehension.test.ts`
Expected: PASS (expected-facts arm passes; ablation skipped without `DX_RUN_LLM_EVAL`).

- [ ] **Step 8: Update barrel + commit**

Add to `src/index.ts`: `export * from './tool';`

```bash
git add packages/core/compute/semantic-index
git commit -m "feat(semantic-index): semanticQuery tool + comprehension eval"
```

---

## Task 11: Final verification + lint

**Files:** none (verification only)

- [ ] **Step 1: Full package test**

Run: `moon run @dxos/semantic-index:test`
Expected: all suites pass.

- [ ] **Step 2: Build**

Run: `moon run @dxos/semantic-index:build`
Expected: success.

- [ ] **Step 3: Lint**

Run: `moon run @dxos/semantic-index:lint -- --fix`
Expected: clean.

- [ ] **Step 4: Cast audit (per CLAUDE.md)**

Run: `git diff origin/main -- packages/core/compute/semantic-index | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'`
Expected: only the justified `as any` at the Comunica/RDF-JS and mock-AI boundaries (external untyped surfaces). Add a one-line comment on each justifying it; remove any others.

- [ ] **Step 5: Commit any lint fixes**

```bash
git add packages/core/compute/semantic-index
git commit -m "chore(semantic-index): lint + cast audit"
```

---

## Deferred (post-prototype, not in this plan — spec §8, §12.7)

- Browser OPFS driver parity + Cloudflare worker entrypoint + `wrangler dev` Workers smoke test (needs a CF account/wrangler — a human dependency to batch when we deploy).
- Live connector fetch (real Gmail/Discord creds).
- Vector/embedding seam (Workers AI + Vectorize / transformers.js) + FTS5 text path.
- Entity canonicalization to ECHO objects via `Entity.ref`.

---

## Self-Review

- **Spec coverage:** index-core verdict (Task 3/5 reuse patterns, no extension) ✓; non-ECHO store ✓; Effect-Schema model §5 (Task 2) ✓; Comunica+SQLite Source §6 (Tasks 5–6) ✓; pipeline §7 (Tasks 7–8) ✓; incremental sourceHash ✓; harness §9 (Task 9) ✓; tool + eval §10 (Task 10) ✓; vector/Workers deferred §8/§12.7 ✓.
- **Predicate vocab:** open strings (slug of surface form) — matches decision (3).
- **Eval:** expected-facts (deterministic) + LLM-judge ablation (opt-in) — matches decision (4).
- **Type consistency:** `Fact`/`Assertion`/`Valence`/`Attribution` field names identical across Tasks 2/3/6/7/10; `factToTriples`/`triplesToFacts`, `makeSqliteSource`/`insertQuads`, `buildSparql`/`selectTriples`, `SemanticStore.layer`, `SemanticPipeline.run` referenced consistently.
- **Known risks flagged inline:** `asynciterator` stream construction (Task 5 Step 4 fallback), Comunica source shape (Task 6 Step 7 fallback), `sql.unsafe` arity (Task 5 note), mock-AI shape (Task 7 Step 1 cross-check), `query({})` all-facts fallback (Task 10 Step 5). Each has a concrete alternative.
