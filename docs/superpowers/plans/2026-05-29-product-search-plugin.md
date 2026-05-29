# Product Search Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **DXOS sub-skills to load before relevant tasks:** `composer-plugins` (Tasks 1, 12–18), `echo` (Tasks 2–4), `operations` (Tasks 8–11), `blueprints` (Task 11), `effect` (Tasks 6, 8–11). Run all commands from the worktree `.claude/worktrees/claude+plugin-search`. Tests use `vitest` with `describe`/`test` and `test('x', ({ expect }) => ...)`. Use single quotes. Per project rules: NO casts (`as any`, `as T`, `!`) to silence types; fix at source.

**Goal:** A Composer plugin (`@dxos/plugin-search`, id `org.dxos.plugin.search`) for structured multi-vendor product search, where each vendor is an LLM-authored, user-editable template that deterministically drives an HTTP request + result extraction, with results shown as masonry master/detail cards.

**Architecture:** Three ECHO types — `Provider` (site template: JSONSchema fields + request mapping + result mapping), `Search` (multi-provider config holding criteria values + linked results), `Result` (one listing). A pure mapping interpreter turns `(criteria, request)` into an HTTP request and `(response, result-mapping)` into `Result`s. Operations (`RunSearch`, `RunProviderSearch`, `AnalyzeProvider`) run locally or on an agent. A blueprint drives `AnalyzeProvider`. UI mirrors `plugin-feed`'s `MagazineArticle` (form + masonry + `useSelected`).

**Tech Stack:** TypeScript, Effect-TS, Effect Schema, `@dxos/echo`, `@dxos/compute` (Operation/Blueprint/Template), `@dxos/app-framework` + `@dxos/app-toolkit`, `@dxos/react-ui-form`, `@dxos/react-ui-masonry`, `@dxos/react-ui-attention`, `@dxos/edge-client` (`proxyFetchLegacy`), `node-html-parser` for scraping, vitest.

**Reference plugin to copy patterns from:** `packages/plugins/plugin-feed` (Subscription≈Provider, Magazine≈Search, Post≈Result).

---

## File Structure

```
packages/plugins/plugin-search/
  package.json                         # private:true, workspace:* deps
  moon.yml
  vite.config.ts
  tsconfig.json
  PLUGIN.mdl
  src/
    meta.ts                            # Plugin.Meta
    plugin.ts                          # Plugin.lazy
    SearchPlugin.tsx                   # Plugin.define(...).pipe(...)
    index.ts                           # barrel
    translations.ts
    testing.ts                         # fixtures (sample provider/search/HTML)
    types/
      Provider.ts                      # Provider type + Request/Result mapping schemas
      Search.ts                        # Search type
      Result.ts                        # Result type
      SearchOperation.ts               # Operation.make defs
      index.ts
    util/
      bindRequest.ts                   # (criteria, request) -> HttpRequest descriptor
      extractResults.ts                # (responseBody, result-mapping) -> ResultData[]
      unionSchema.ts                   # merge providers' JSONSchema -> Effect Schema
      fetch.ts                         # proxyFetchLegacy wrapper (Effect)
      index.ts
    operations/
      run-search.ts
      run-provider-search.ts
      analyze-provider.ts
      index.ts                         # OperationHandlerSet.lazy(...)
    blueprints/
      provider-blueprint.ts
      index.ts
    capabilities/
      react-surface.tsx
      blueprint-definition.ts
      create-object.ts
      operation-handler.ts
      app-graph-builder.ts
      index.ts
    components/
      RangeField.tsx                   # custom react-ui-form field for ranges
      RangeField.stories.tsx
    containers/
      SearchArticle/
        SearchArticle.tsx              # master/detail (form + masonry)
        SearchForm.tsx                 # union-schema form + provider select + Run
        ResultTile.tsx                 # masonry tile
        ResultDetail.tsx               # detail pane
        SearchArticle.stories.tsx
        index.ts
      ResultCard/
        ResultCard.tsx                 # Card surface for Result
        ResultCard.stories.tsx
        index.ts
      ProviderArticle/
        ProviderArticle.tsx            # template editor (form/JSON)
        ProviderArticle.stories.tsx
        index.ts
      index.ts
```

---

## Task 0: Scaffold the package

**Files:**
- Create: `packages/plugins/plugin-search/package.json`
- Create: `packages/plugins/plugin-search/moon.yml`
- Create: `packages/plugins/plugin-search/vite.config.ts`
- Create: `packages/plugins/plugin-search/tsconfig.json`
- Create: `packages/plugins/plugin-search/src/meta.ts`
- Create: `packages/plugins/plugin-search/src/plugin.ts`
- Create: `packages/plugins/plugin-search/src/index.ts`

- [ ] **Step 1: Copy scaffolding from plugin-feed.** Copy `vite.config.ts` and `tsconfig.json` verbatim from `packages/plugins/plugin-feed`. They are plugin-agnostic.

- [ ] **Step 2: Write `package.json`.**

```json
{
  "name": "@dxos/plugin-search",
  "version": "0.8.3",
  "private": true,
  "description": "Product search plugin.",
  "homepage": "https://dxos.org",
  "bugs": "https://github.com/dxos/dxos/issues",
  "license": "MIT",
  "type": "module",
  "imports": {
    "#meta": "./src/meta.ts",
    "#plugin": "./src/SearchPlugin.tsx"
  },
  "exports": {
    ".": "./src/index.ts"
  },
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@dxos/app-framework": "workspace:*",
    "@dxos/app-toolkit": "workspace:*",
    "@dxos/compute": "workspace:*",
    "@dxos/echo": "workspace:*",
    "@dxos/edge-client": "workspace:*",
    "@dxos/log": "workspace:*",
    "@dxos/plugin-attention": "workspace:*",
    "@dxos/plugin-space": "workspace:*",
    "@dxos/react-ui": "workspace:*",
    "@dxos/react-ui-attention": "workspace:*",
    "@dxos/react-ui-card": "workspace:*",
    "@dxos/react-ui-form": "workspace:*",
    "@dxos/react-ui-masonry": "workspace:*",
    "@dxos/react-ui-theme": "workspace:*",
    "@dxos/util": "workspace:*",
    "effect": "catalog:",
    "node-html-parser": "catalog:",
    "react": "catalog:"
  },
  "devDependencies": {
    "@dxos/test-utils": "workspace:*",
    "@types/react": "catalog:"
  }
}
```

Note: confirm each `@dxos/react-ui-*` dependency actually exists by checking `packages/plugins/plugin-feed/package.json`; mirror its exact set. If `node-html-parser` is not in the catalog, add it: `pnpm add --filter "@dxos/plugin-search" --save-catalog node-html-parser`.

- [ ] **Step 3: Write `moon.yml`** (copy from plugin-feed, adjust entryPoints).

```yaml
layer: library
language: typescript
type: library
tags:
  - ts-build
  - ts-test
  - ts-test-storybook
  - pack
  - storybook
tasks:
  compile:
    args:
      - '--entryPoint=src/index.ts'
      - '--entryPoint=src/SearchPlugin.tsx'
      - '--platform=neutral'
```

- [ ] **Step 4: Write `src/meta.ts`.**

```typescript
//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.search',
  name: 'Search',
  author: 'DXOS',
  description: trim`
    Structured product search across configurable vendor sites.
    Each vendor is described by an editable template that drives search and result extraction.
  `,
  icon: 'ph--magnifying-glass--regular',
  iconHue: 'cyan',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-search',
  spec: 'PLUGIN.mdl',
  version: '0.8.3',
  tags: ['labs'],
};
```

- [ ] **Step 5: Write `src/plugin.ts`.**

```typescript
//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const SearchPlugin = Plugin.lazy(meta, () => import('#plugin'));
```

- [ ] **Step 6: Write a minimal `src/index.ts`** (barrel; will grow).

```typescript
//
// Copyright 2026 DXOS.org
//

export { SearchPlugin } from './plugin';
export { meta } from './meta';
```

- [ ] **Step 7: Create an empty `PLUGIN.mdl`** placeholder (real content in Task 18): a single line `# Search Plugin`.

- [ ] **Step 8: Install + verify the package resolves.**

Run: `pnpm install` then `moon run plugin-search:compile`
Expected: compile succeeds (no source files referenced yet beyond meta/plugin/index — `SearchPlugin.tsx` does not exist yet, so temporarily point `#plugin` import resolution by completing Task 12 before first full compile; for now just confirm `pnpm install` succeeds and the workspace recognizes `@dxos/plugin-search`).

- [ ] **Step 9: Commit.**

```bash
git add packages/plugins/plugin-search
git commit -m "feat(plugin-search): scaffold package"
```

---

## Task 1: Mapping schemas (Request / Result descriptors)

These are plain Effect Schemas (not ECHO objects) used as fields inside `Provider`.

**Files:**
- Create: `packages/plugins/plugin-search/src/types/Provider.ts` (mapping schemas portion)
- Test: `packages/plugins/plugin-search/src/types/Provider.test.ts`

- [ ] **Step 1: Write the failing test** (`Provider.test.ts`).

```typescript
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Schema from 'effect/Schema';

import { RequestMapping, ResultMapping } from './Provider';

describe('Provider mapping schemas', () => {
  test('decodes a request mapping', ({ expect }) => {
    const value = Schema.decodeUnknownSync(RequestMapping)({
      method: 'GET',
      urlTemplate: 'https://x.com/s?q={query}',
      query: { q: { field: 'query' } },
    });
    expect(value.method).toEqual('GET');
    expect(value.query?.q.field).toEqual('query');
  });

  test('decodes a result mapping', ({ expect }) => {
    const value = Schema.decodeUnknownSync(ResultMapping)({
      responseType: 'html',
      itemLocator: '.listing',
      fields: { title: { selector: 'h2' }, url: { selector: 'a', attr: 'href' } },
    });
    expect(value.itemLocator).toEqual('.listing');
    expect(value.fields.title.selector).toEqual('h2');
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `moon run plugin-search:test -- src/types/Provider.test.ts`
Expected: FAIL — cannot find module './Provider' / `RequestMapping` undefined.

- [ ] **Step 3: Implement the mapping schemas** at the top of `src/types/Provider.ts`.

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Type } from '@dxos/echo';
import { JsonSchema } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';

export const BLUEPRINT_KEY = 'org.dxos.plugin.search/blueprint/provider';

/** Binds a request parameter to a search-schema field, with an optional transform hint. */
export const FieldBinding = Schema.Struct({
  field: Schema.String,
  // Optional transform, e.g. 'min' | 'max' for a range field, or a format template.
  transform: Schema.optional(Schema.String),
});
export type FieldBinding = Schema.Schema.Type<typeof FieldBinding>;

/** How to turn criteria into an HTTP request. */
export const RequestMapping = Schema.Struct({
  method: Schema.Literal('GET', 'POST'),
  urlTemplate: Schema.String,
  query: Schema.optional(Schema.Record({ key: Schema.String, value: FieldBinding })),
  body: Schema.optional(Schema.Record({ key: Schema.String, value: FieldBinding })),
  headers: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
});
export type RequestMapping = Schema.Schema.Type<typeof RequestMapping>;

/** Extracts a single field relative to a located item. */
export const FieldExtractor = Schema.Struct({
  // CSS selector (html) relative to the item; omit to use the item element itself.
  selector: Schema.optional(Schema.String),
  // HTML attribute to read (e.g. 'href', 'src'); omit for text content.
  attr: Schema.optional(Schema.String),
  // JSONPath (json responses) relative to the item.
  path: Schema.optional(Schema.String),
});
export type FieldExtractor = Schema.Schema.Type<typeof FieldExtractor>;

/** How to turn an HTTP response into result objects. */
export const ResultMapping = Schema.Struct({
  responseType: Schema.Literal('html', 'json'),
  // CSS selector (html) or JSONPath (json) selecting each listing.
  itemLocator: Schema.String,
  fields: Schema.Record({ key: Schema.String, value: FieldExtractor }),
});
export type ResultMapping = Schema.Schema.Type<typeof ResultMapping>;
```

- [ ] **Step 4: Run to verify pass.**

Run: `moon run plugin-search:test -- src/types/Provider.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add packages/plugins/plugin-search/src/types/Provider.ts packages/plugins/plugin-search/src/types/Provider.test.ts
git commit -m "feat(plugin-search): request/result mapping schemas"
```

---

## Task 2: `Provider` ECHO type

**Files:**
- Modify: `packages/plugins/plugin-search/src/types/Provider.ts`
- Test: `packages/plugins/plugin-search/src/types/Provider.test.ts`

- [ ] **Step 1: Add the failing test** (append to `Provider.test.ts`).

```typescript
import { Obj } from '@dxos/echo';

import { Provider, makeProvider, instanceOf as isProvider } from './Provider';

describe('Provider type', () => {
  test('make + instanceOf', ({ expect }) => {
    const provider = makeProvider({ name: 'AutoTrader', url: 'https://autotrader.com', kind: 'scrape' });
    expect(isProvider(provider)).toBe(true);
    expect(provider.name).toEqual('AutoTrader');
    expect(provider.enabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `moon run plugin-search:test -- src/types/Provider.test.ts`
Expected: FAIL — `makeProvider` not exported.

- [ ] **Step 3: Implement the `Provider` object** (append to `src/types/Provider.ts`).

```typescript
export const Provider = Schema.Struct({
  name: Schema.String.pipe(Schema.annotations({ title: 'Name' })),
  url: Schema.String.pipe(Schema.annotations({ title: 'URL' })),
  description: Schema.optional(Schema.String),
  kind: Schema.Literal('api', 'scrape').pipe(Schema.annotations({ title: 'Kind' })),
  // JSONSchema describing the typed search fields. Converted to Effect Schema for the form.
  searchSchema: Schema.optional(JsonSchema),
  request: Schema.optional(RequestMapping),
  result: Schema.optional(ResultMapping),
  enabled: Schema.Boolean,
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--globe--regular', hue: 'cyan' }),
  BlueprintsAnnotation.set([BLUEPRINT_KEY]),
  Type.makeObject(DXN.make('org.dxos.type.search-provider', '0.1.0')),
);
export type Provider = Type.InstanceType<typeof Provider>;

export const instanceOf = (value: unknown): value is Provider => Obj.instanceOf(Provider, value);

export const makeProvider = (
  props: Omit<Obj.MakeProps<typeof Provider>, 'enabled'> & { enabled?: boolean },
): Provider => Obj.make(Provider, { enabled: true, ...props });
```

Add the import for `BlueprintsAnnotation` at the top: `import { BlueprintsAnnotation } from '@dxos/app-toolkit';`. Confirm `JsonSchema` is exported from `@dxos/echo` (it is — `@dxos/echo#JsonSchema`); if the form needs it as a value schema, use `JsonSchema` directly as the field type.

- [ ] **Step 4: Run to verify pass.**

Run: `moon run plugin-search:test -- src/types/Provider.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add packages/plugins/plugin-search/src/types/Provider.ts packages/plugins/plugin-search/src/types/Provider.test.ts
git commit -m "feat(plugin-search): Provider type"
```

---

## Task 3: `Result` ECHO type

**Files:**
- Create: `packages/plugins/plugin-search/src/types/Result.ts`
- Test: `packages/plugins/plugin-search/src/types/Result.test.ts`

- [ ] **Step 1: Write the failing test.**

```typescript
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { makeResult, instanceOf as isResult } from './Result';

describe('Result type', () => {
  test('make + instanceOf', ({ expect }) => {
    const result = makeResult({ title: 'Porsche 911', url: 'https://x/1', images: [], properties: {} });
    expect(isResult(result)).toBe(true);
    expect(result.title).toEqual('Porsche 911');
    expect(result.images).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`makeResult` not found).

Run: `moon run plugin-search:test -- src/types/Result.test.ts`

- [ ] **Step 3: Implement `Result`.**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';

import { Provider } from './Provider';

export const Result = Schema.Struct({
  title: Schema.String.pipe(Schema.annotations({ title: 'Title' })),
  url: Schema.String.pipe(Schema.annotations({ title: 'URL' })),
  price: Schema.optional(Schema.Number),
  currency: Schema.optional(Schema.String),
  images: Schema.Array(Schema.String),
  provider: Schema.optional(Ref.Ref(Provider)),
  // Stripped key/value metadata.
  properties: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  fetchedAt: Schema.optional(Schema.String),
}).pipe(
  Annotation.IconAnnotation.set({ icon: 'ph--tag--regular', hue: 'cyan' }),
  Type.makeObject(DXN.make('org.dxos.type.search-result', '0.1.0')),
);
export type Result = Type.InstanceType<typeof Result>;

export const instanceOf = (value: unknown): value is Result => Obj.instanceOf(Result, value);

export const makeResult = (props: Obj.MakeProps<typeof Result>): Result => Obj.make(Result, props);
```

Note: `Result` does not carry a back-ref to `Search`; the `Search.results` array owns the linkage (avoids a cyclic schema import). Confirm `LabelAnnotation` is not required (label derives from `title`); if a label is needed add `LabelAnnotation.set(['title'])`.

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Commit.**

```bash
git add packages/plugins/plugin-search/src/types/Result.ts packages/plugins/plugin-search/src/types/Result.test.ts
git commit -m "feat(plugin-search): Result type"
```

---

## Task 4: `Search` ECHO type

**Files:**
- Create: `packages/plugins/plugin-search/src/types/Search.ts`
- Create: `packages/plugins/plugin-search/src/types/index.ts`
- Test: `packages/plugins/plugin-search/src/types/Search.test.ts`

- [ ] **Step 1: Write the failing test.**

```typescript
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { makeSearch, instanceOf as isSearch } from './Search';

describe('Search type', () => {
  test('make + instanceOf with defaults', ({ expect }) => {
    const search = makeSearch({ name: 'Cars' });
    expect(isSearch(search)).toBe(true);
    expect(search.providers).toEqual([]);
    expect(search.results).toEqual([]);
    expect(search.criteria).toEqual({});
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

Run: `moon run plugin-search:test -- src/types/Search.test.ts`

- [ ] **Step 3: Implement `Search`.**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';

import { Provider } from './Provider';
import { Result } from './Result';

export const Search = Schema.Struct({
  name: Schema.String.pipe(Schema.annotations({ title: 'Name' })),
  providers: Schema.Array(Ref.Ref(Provider)),
  // Values for the union of provider fields, keyed by field name.
  criteria: Schema.Record({ key: Schema.String, value: Schema.Unknown }).pipe(FormInputAnnotation.set(false)),
  results: Schema.Array(Ref.Ref(Result)).pipe(FormInputAnnotation.set(false)),
  status: Schema.optional(Schema.Literal('idle', 'running', 'error')),
  lastRunAt: Schema.optional(Schema.String),
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--magnifying-glass--regular', hue: 'cyan' }),
  Type.makeObject(DXN.make('org.dxos.type.search', '0.1.0')),
);
export type Search = Type.InstanceType<typeof Search>;

export const instanceOf = (value: unknown): value is Search => Obj.instanceOf(Search, value);

export const makeSearch = (
  props: Omit<Obj.MakeProps<typeof Search>, 'providers' | 'criteria' | 'results'> & {
    providers?: Ref.Ref<Provider>[];
    criteria?: Record<string, unknown>;
    results?: Ref.Ref<Result>[];
  },
): Search =>
  Obj.make(Search, {
    providers: props.providers ?? [],
    criteria: props.criteria ?? {},
    results: props.results ?? [],
    ...props,
  });
```

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Write `src/types/index.ts`.**

```typescript
//
// Copyright 2026 DXOS.org
//

export * as Provider from './Provider';
export * as Search from './Search';
export * as Result from './Result';
export * as SearchOperation from './SearchOperation';
```

(`SearchOperation` is created in Task 7; add that export line then. For now omit the last line and add it in Task 7.)

- [ ] **Step 6: Commit.**

```bash
git add packages/plugins/plugin-search/src/types
git commit -m "feat(plugin-search): Search type + types barrel"
```

---

## Task 5: Request binder (`bindRequest`)

Pure function: `(criteria, request) -> { method, url, headers, body }`. No network.

**Files:**
- Create: `packages/plugins/plugin-search/src/util/bindRequest.ts`
- Test: `packages/plugins/plugin-search/src/util/bindRequest.test.ts`

- [ ] **Step 1: Write the failing test.**

```typescript
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { bindRequest } from './bindRequest';

describe('bindRequest', () => {
  test('substitutes url template tokens and query bindings', ({ expect }) => {
    const req = bindRequest(
      { make: 'Porsche', model: '911' },
      {
        method: 'GET',
        urlTemplate: 'https://x.com/{make}',
        query: { q: { field: 'model' } },
      },
    );
    expect(req.url).toEqual('https://x.com/Porsche?q=911');
    expect(req.method).toEqual('GET');
  });

  test('maps a range field via min/max transforms', ({ expect }) => {
    const req = bindRequest(
      { price: { min: 100000, max: 150000 } },
      {
        method: 'GET',
        urlTemplate: 'https://x.com/s',
        query: { priceFrom: { field: 'price', transform: 'min' }, priceTo: { field: 'price', transform: 'max' } },
      },
    );
    expect(req.url).toEqual('https://x.com/s?priceFrom=100000&priceTo=150000');
  });

  test('omits query params whose field is absent', ({ expect }) => {
    const req = bindRequest(
      { make: 'BMW' },
      { method: 'GET', urlTemplate: 'https://x.com/s', query: { q: { field: 'missing' } } },
    );
    expect(req.url).toEqual('https://x.com/s');
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

Run: `moon run plugin-search:test -- src/util/bindRequest.test.ts`

- [ ] **Step 3: Implement `bindRequest`.**

```typescript
//
// Copyright 2026 DXOS.org
//

import { type FieldBinding, type RequestMapping } from '../types/Provider';

export type HttpRequest = {
  method: 'GET' | 'POST';
  url: string;
  headers?: Record<string, string>;
  body?: string;
};

/** Resolve a binding against a criteria value, applying min/max transforms for ranges. */
const resolveBinding = (criteria: Record<string, unknown>, binding: FieldBinding): string | undefined => {
  const raw = criteria[binding.field];
  if (raw == null) {
    return undefined;
  }
  if (binding.transform === 'min' || binding.transform === 'max') {
    if (typeof raw === 'object' && raw !== null) {
      const value = (raw as Record<string, unknown>)[binding.transform];
      return value == null ? undefined : String(value);
    }
    return undefined;
  }
  if (typeof raw === 'object') {
    return undefined;
  }
  return String(raw);
};

const fillTemplate = (template: string, criteria: Record<string, unknown>): string =>
  template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = criteria[key];
    return value == null || typeof value === 'object' ? '' : encodeURIComponent(String(value));
  });

/** Build an HTTP request descriptor from criteria values and a provider request mapping. */
export const bindRequest = (criteria: Record<string, unknown>, request: RequestMapping): HttpRequest => {
  const base = fillTemplate(request.urlTemplate, criteria);
  const params = new URLSearchParams();
  for (const [param, binding] of Object.entries(request.query ?? {})) {
    const value = resolveBinding(criteria, binding);
    if (value !== undefined) {
      params.set(param, value);
    }
  }
  const queryString = params.toString();
  const url = queryString.length > 0 ? `${base}?${queryString}` : base;

  let body: string | undefined;
  if (request.body) {
    const bodyObject: Record<string, string> = {};
    for (const [key, binding] of Object.entries(request.body)) {
      const value = resolveBinding(criteria, binding);
      if (value !== undefined) {
        bodyObject[key] = value;
      }
    }
    body = JSON.stringify(bodyObject);
  }

  return { method: request.method, url, headers: request.headers, body };
};
```

- [ ] **Step 4: Run — expect PASS** (all three tests).

- [ ] **Step 5: Commit.**

```bash
git add packages/plugins/plugin-search/src/util/bindRequest.ts packages/plugins/plugin-search/src/util/bindRequest.test.ts
git commit -m "feat(plugin-search): request binder"
```

---

## Task 6: Result extractor (`extractResults`)

Pure function: `(responseBody, ResultMapping) -> ResultData[]`. HTML via `node-html-parser`; JSON via simple dotted-path.

**Files:**
- Create: `packages/plugins/plugin-search/src/util/extractResults.ts`
- Test: `packages/plugins/plugin-search/src/util/extractResults.test.ts`

- [ ] **Step 1: Write the failing test.**

```typescript
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { extractResults } from './extractResults';

const HTML = `
  <div class="listing">
    <h2 class="t">Porsche 911</h2>
    <a class="l" href="/cars/1">link</a>
    <span class="p">120000</span>
    <img class="img" src="https://img/1.jpg" />
  </div>
  <div class="listing">
    <h2 class="t">Porsche 992</h2>
    <a class="l" href="/cars/2">link</a>
    <span class="p">140000</span>
  </div>
`;

describe('extractResults', () => {
  test('extracts html listings', ({ expect }) => {
    const results = extractResults(HTML, {
      responseType: 'html',
      itemLocator: '.listing',
      fields: {
        title: { selector: '.t' },
        url: { selector: '.l', attr: 'href' },
        price: { selector: '.p' },
        image: { selector: '.img', attr: 'src' },
      },
    });
    expect(results).toHaveLength(2);
    expect(results[0].title).toEqual('Porsche 911');
    expect(results[0].url).toEqual('/cars/1');
    expect(results[0].properties.price).toEqual('120000');
    expect(results[0].images).toEqual(['https://img/1.jpg']);
    expect(results[1].images).toEqual([]);
  });

  test('extracts json listings via dotted path', ({ expect }) => {
    const json = JSON.stringify({ items: [{ name: 'A', link: 'https://a' }] });
    const results = extractResults(json, {
      responseType: 'json',
      itemLocator: 'items',
      fields: { title: { path: 'name' }, url: { path: 'link' } },
    });
    expect(results[0].title).toEqual('A');
    expect(results[0].url).toEqual('https://a');
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

Run: `moon run plugin-search:test -- src/util/extractResults.test.ts`

- [ ] **Step 3: Implement `extractResults`.**

```typescript
//
// Copyright 2026 DXOS.org
//

import { parse } from 'node-html-parser';

import { type ResultMapping, type FieldExtractor } from '../types/Provider';

export type ResultData = {
  title: string;
  url: string;
  price?: number;
  currency?: string;
  images: string[];
  properties: Record<string, unknown>;
};

const getByPath = (root: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((acc, key) => (acc == null ? undefined : (acc as Record<string, unknown>)[key]), root);

const extractHtmlField = (item: ReturnType<typeof parse>, extractor: FieldExtractor): string | undefined => {
  const element = extractor.selector ? item.querySelector(extractor.selector) : item;
  if (!element) {
    return undefined;
  }
  const value = extractor.attr ? element.getAttribute(extractor.attr) : element.text.trim();
  return value == null || value === '' ? undefined : value;
};

const toResultData = (raw: Record<string, string | undefined>): ResultData => {
  const { title, url, price, image, ...rest } = raw;
  const properties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) {
      properties[key] = value;
    }
  }
  if (price !== undefined) {
    properties.price = price;
  }
  return {
    title: title ?? '',
    url: url ?? '',
    price: price !== undefined && !Number.isNaN(Number(price)) ? Number(price) : undefined,
    images: image ? [image] : [],
    properties,
  };
};

/** Extract result rows from an HTTP response body using a declarative mapping. */
export const extractResults = (body: string, mapping: ResultMapping): ResultData[] => {
  if (mapping.responseType === 'json') {
    const parsed: unknown = JSON.parse(body);
    const items = getByPath(parsed, mapping.itemLocator);
    const array = Array.isArray(items) ? items : [];
    return array.map((item) => {
      const raw: Record<string, string | undefined> = {};
      for (const [key, extractor] of Object.entries(mapping.fields)) {
        const value = extractor.path ? getByPath(item, extractor.path) : undefined;
        raw[key] = value == null ? undefined : String(value);
      }
      return toResultData(raw);
    });
  }

  const root = parse(body);
  const items = root.querySelectorAll(mapping.itemLocator);
  return items.map((item) => {
    const raw: Record<string, string | undefined> = {};
    for (const [key, extractor] of Object.entries(mapping.fields)) {
      raw[key] = extractHtmlField(item, extractor);
    }
    return toResultData(raw);
  });
};
```

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Commit.**

```bash
git add packages/plugins/plugin-search/src/util/extractResults.ts packages/plugins/plugin-search/src/util/extractResults.test.ts
git commit -m "feat(plugin-search): result extractor"
```

---

## Task 7: Operation definitions

**Files:**
- Create: `packages/plugins/plugin-search/src/types/SearchOperation.ts`
- Modify: `packages/plugins/plugin-search/src/types/index.ts` (add `SearchOperation` export)

- [ ] **Step 1: Write `SearchOperation.ts`.**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Ref } from '@dxos/echo';

import { meta } from '../meta';
import { Provider } from './Provider';
import { Result } from './Result';
import { Search } from './Search';

export const RunProviderSearch = Operation.make({
  meta: {
    key: `${meta.id}.operation.run-provider-search`,
    name: 'Run Provider Search',
    description: 'Executes one provider template against a search and returns result objects.',
    icon: 'ph--play--regular',
  },
  input: Schema.Struct({
    search: Ref.Ref(Search),
    provider: Ref.Ref(Provider),
  }),
  output: Schema.Array(Ref.Ref(Result)),
  services: [Database.Service],
});

export const RunSearch = Operation.make({
  meta: {
    key: `${meta.id}.operation.run-search`,
    name: 'Run Search',
    description: 'Runs all enabled providers for a search and links the results.',
    icon: 'ph--magnifying-glass--regular',
  },
  input: Schema.Struct({ search: Ref.Ref(Search) }),
  output: Schema.Void,
  services: [Database.Service, Capability.Service],
});

export const AnalyzeProvider = Operation.make({
  meta: {
    key: `${meta.id}.operation.analyze-provider`,
    name: 'Analyze Provider',
    description:
      'Analyzes a vendor site and produces a provider template (search schema + request + result mappings).',
    icon: 'ph--brain--regular',
  },
  input: Schema.Struct({
    provider: Ref.Ref(Provider),
  }),
  output: Ref.Ref(Provider),
  services: [Database.Service, Capability.Service],
});
```

- [ ] **Step 2: Add export to `types/index.ts`** (the line deferred in Task 4):

```typescript
export * as SearchOperation from './SearchOperation';
```

- [ ] **Step 3: Verify it compiles.**

Run: `moon run plugin-search:compile`
Expected: success (no handlers referenced yet).

- [ ] **Step 4: Commit.**

```bash
git add packages/plugins/plugin-search/src/types/SearchOperation.ts packages/plugins/plugin-search/src/types/index.ts
git commit -m "feat(plugin-search): operation definitions"
```

---

## Task 8: Edge fetch util

**Files:**
- Create: `packages/plugins/plugin-search/src/util/fetch.ts`
- Create: `packages/plugins/plugin-search/src/util/index.ts`

- [ ] **Step 1: Implement the fetch wrapper** (`fetch.ts`). (No unit test — it hits the proxy; covered indirectly by operation tests with a stubbed fetch.)

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { proxyFetchLegacy } from '@dxos/edge-client';

import { type HttpRequest } from './bindRequest';

export class FetchError extends Error {}

/** Perform an HTTP request through the DXOS edge proxy and return the response body as text. */
export const fetchViaProxy = (request: HttpRequest): Effect.Effect<string, FetchError> =>
  Effect.tryPromise({
    try: async () => {
      const response = await proxyFetchLegacy(new URL(request.url), {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
      if (!response.ok) {
        throw new FetchError(`HTTP ${response.status} for ${request.url}`);
      }
      return await response.text();
    },
    catch: (error) => (error instanceof FetchError ? error : new FetchError(String(error))),
  });
```

- [ ] **Step 2: Write `util/index.ts`.**

```typescript
//
// Copyright 2026 DXOS.org
//

export * from './bindRequest';
export * from './extractResults';
export * from './fetch';
export * from './unionSchema';
```

(`unionSchema` is added in Task 16; add that export then, or create a stub now and fill in Task 16. Prefer adding the export line in Task 16.)

- [ ] **Step 3: Compile.**

Run: `moon run plugin-search:compile`
Expected: success (omit the `unionSchema` export line until Task 16).

- [ ] **Step 4: Commit.**

```bash
git add packages/plugins/plugin-search/src/util/fetch.ts packages/plugins/plugin-search/src/util/index.ts
git commit -m "feat(plugin-search): edge proxy fetch util"
```

---

## Task 9: `RunProviderSearch` handler

**Files:**
- Create: `packages/plugins/plugin-search/src/operations/run-provider-search.ts`
- Test: `packages/plugins/plugin-search/src/operations/run-provider-search.test.ts`

- [ ] **Step 1: Write the failing test.** This test drives the *pure composition* the handler relies on by testing the extracted helper `buildResults(criteria, provider, body)`; the Effect handler wires Database + fetch around it.

```typescript
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { makeProvider } from '../types/Provider';
import { buildResults } from './run-provider-search';

const HTML = '<div class="c"><h2>Item A</h2><a href="/a">x</a></div>';

describe('buildResults', () => {
  test('produces ResultData from a provider mapping + body', ({ expect }) => {
    const provider = makeProvider({
      name: 'Test',
      url: 'https://x',
      kind: 'scrape',
      request: { method: 'GET', urlTemplate: 'https://x/s' },
      result: {
        responseType: 'html',
        itemLocator: '.c',
        fields: { title: { selector: 'h2' }, url: { selector: 'a', attr: 'href' } },
      },
    });
    const results = buildResults(provider, HTML);
    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('Item A');
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

Run: `moon run plugin-search:test -- src/operations/run-provider-search.test.ts`

- [ ] **Step 3: Implement the handler + helper.**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Ref } from '@dxos/echo';

import { SearchOperation } from '../types';
import { type Provider, makeProvider as _make } from '../types/Provider';
import { Result, makeResult } from '../types/Result';
import { type ResultData, bindRequest, extractResults, fetchViaProxy } from '../util';

/** Pure: given a fully-configured provider and a response body, produce result data. */
export const buildResults = (provider: Provider, body: string): ResultData[] => {
  if (!provider.result) {
    return [];
  }
  return extractResults(body, provider.result);
};

const handler: Operation.WithHandler<typeof SearchOperation.RunProviderSearch> =
  SearchOperation.RunProviderSearch.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ search: searchRef, provider: providerRef }) {
        const search = yield* Database.load(searchRef);
        const provider = yield* Database.load(providerRef);
        if (!provider.enabled || !provider.request || !provider.result) {
          return [];
        }
        const request = bindRequest({ ...search.criteria }, provider.request);
        const body = yield* fetchViaProxy(request);
        const rows = buildResults(provider, body);
        const refs: Ref.Ref<Result>[] = [];
        for (const row of rows) {
          const result = makeResult({
            title: row.title,
            url: row.url,
            price: row.price,
            images: [...row.images],
            properties: row.properties,
            provider: Ref.make(provider),
            fetchedAt: new Date().toISOString(),
          });
          const db = yield* Database.Service;
          db.add(result);
          refs.push(Ref.make(result));
        }
        return refs;
      }),
    ),
  );

export default handler;
```

Note: confirm the exact `Database` API for adding an object inside a handler — check how `plugin-feed`'s handlers create objects (they use `Operation.invoke(SpaceOperation.AddObject, ...)` for top-level objects). If results should be space objects, replace `db.add(result)` with `yield* Operation.invoke(SpaceOperation.AddObject, { object: result, target: ... })`. For results that are only referenced by the Search (not standalone navigable), `db.add` (or the echo equivalent `Database.add`) is appropriate. Resolve this during implementation by reading `packages/plugins/plugin-feed/src/operations/curate-magazine.ts`.

- [ ] **Step 4: Run — expect PASS** (`buildResults` test).

- [ ] **Step 5: Commit.**

```bash
git add packages/plugins/plugin-search/src/operations/run-provider-search.ts packages/plugins/plugin-search/src/operations/run-provider-search.test.ts
git commit -m "feat(plugin-search): run-provider-search handler"
```

---

## Task 10: `RunSearch` handler

**Files:**
- Create: `packages/plugins/plugin-search/src/operations/run-search.ts`

- [ ] **Step 1: Implement** (fan-out; no new pure logic to unit-test beyond what Task 9 covers — an operation-level test with a stubbed fetch is added in Task 19's integration note).

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';

import { SearchOperation } from '../types';
import { type Result } from '../types/Result';

const handler: Operation.WithHandler<typeof SearchOperation.RunSearch> = SearchOperation.RunSearch.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ search: searchRef }) {
      const search = yield* Database.load(searchRef);
      Obj.change(search, (draft) => {
        draft.status = 'running';
      });
      const providerRefs = search.providers;
      const allResults: Ref.Ref<Result>[] = [];
      for (const providerRef of providerRefs) {
        const results = yield* Operation.invoke(SearchOperation.RunProviderSearch, {
          search: searchRef,
          provider: providerRef,
        }).pipe(Effect.catchAll(() => Effect.succeed([] as Ref.Ref<Result>[])));
        allResults.push(...results);
      }
      Obj.change(search, (draft) => {
        draft.results = [...draft.results, ...allResults];
        draft.status = 'idle';
        draft.lastRunAt = new Date().toISOString();
      });
    }),
  ),
);

export default handler;
```

Note: confirm the mutation API. `plugin-feed` mutates objects directly (e.g. `magazine.posts = [...]`) on the live ECHO proxy rather than via `Obj.change`. Read `packages/plugins/plugin-feed/src/operations/add-post-to-magazine.ts` and match its mutation style (likely direct assignment on the loaded object). Replace the `Obj.change(...)` blocks with whatever pattern that file uses.

- [ ] **Step 2: Compile.**

Run: `moon run plugin-search:compile`
Expected: success.

- [ ] **Step 3: Commit.**

```bash
git add packages/plugins/plugin-search/src/operations/run-search.ts
git commit -m "feat(plugin-search): run-search handler"
```

---

## Task 11: `AnalyzeProvider` handler + blueprint

The LLM analyzes the provider's site and fills in `searchSchema` + `request` + `result`. The operation handler fetches the site HTML (via the proxy) and asks the AI to emit the template as structured output, then writes it onto the Provider.

**Files:**
- Create: `packages/plugins/plugin-search/src/operations/analyze-provider.ts`
- Create: `packages/plugins/plugin-search/src/operations/index.ts`
- Create: `packages/plugins/plugin-search/src/blueprints/provider-blueprint.ts`
- Create: `packages/plugins/plugin-search/src/blueprints/index.ts`

- [ ] **Step 1: Implement `analyze-provider.ts`.** Read the site, prompt the AI for a structured template, write it back. Use the AI-invocation pattern from `packages/plugins/plugin-assistant/src/operations/run-prompt-in-new-chat.ts` (AiContext.Binder + `Operation.invoke(AgentPrompt, ...)`), OR — simpler for a deterministic structured result — call the assistant's structured-generation operation. Because the precise AI structured-output API must be confirmed against the current `@dxos/assistant` / `@dxos/assistant-toolkit`, this task has TWO checkpoints:

  1. Confirm the API for "generate structured JSON from a prompt + schema" by reading `packages/plugins/plugin-assistant/src/operations/*.ts` and the `blueprints` / `operations` skills. Identify the operation that returns structured output conforming to an Effect Schema.
  2. Implement using that API with the target schema being `Schema.Struct({ searchSchema: JsonSchema, request: RequestMapping, result: ResultMapping })`.

Skeleton (fill the AI call per checkpoint 1):

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, JsonSchema } from '@dxos/echo';

import { SearchOperation } from '../types';
import { RequestMapping, ResultMapping } from '../types/Provider';
import { fetchViaProxy } from '../util';

const TemplateOutput = Schema.Struct({
  searchSchema: JsonSchema,
  request: RequestMapping,
  result: ResultMapping,
});

const handler: Operation.WithHandler<typeof SearchOperation.AnalyzeProvider> = SearchOperation.AnalyzeProvider.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ provider: providerRef }) {
      const provider = yield* Database.load(providerRef);
      const html = yield* fetchViaProxy({ method: 'GET', url: provider.url });
      // TODO(impl): call AI structured-generation with TemplateOutput schema and a prompt that
      // includes `html` (truncated) and instructions to derive search fields, request mapping,
      // and result extraction. Assign the result onto the provider:
      //   provider.searchSchema = output.searchSchema;
      //   provider.request = output.request;
      //   provider.result = output.result;
      return providerRef;
    }),
  ),
);

export default handler;
```

This is the one task whose AI call is not fully specified here — it depends on the current assistant API. The implementer MUST resolve checkpoint 1 before writing the call; do not stub it permanently. If structured generation is unavailable, fall back to the blueprint-driven path (the blueprint instructs the agent to call a `setProviderTemplate`-style operation; in that case add a `SetProviderTemplate` operation that writes the three fields, and have the blueprint call it).

- [ ] **Step 2: Write `operations/index.ts`.**

```typescript
//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const SearchOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./run-search'),
  () => import('./run-provider-search'),
  () => import('./analyze-provider'),
);
```

- [ ] **Step 3: Write `blueprints/provider-blueprint.ts`.**

```typescript
//
// Copyright 2026 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { SearchOperation } from '../types';
import { BLUEPRINT_KEY } from '../types/Provider';

const operations = [SearchOperation.AnalyzeProvider];

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Search Provider Builder',
    tools: Blueprint.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You build search templates for vendor websites (retail, cars, real estate, etc.).
        Given a Provider with a site URL, call analyzeProvider to inspect the site and produce:
        1. A search request schema (JSONSchema) of the typed fields the site supports
           (string, number, boolean, and ranges expressed via an annotation).
        2. A request mapping describing how to turn field values into the site's HTTP request
           (prefer a formal API if present, else the site's search URL and query parameters).
        3. A result mapping describing how to locate each listing and extract title, url, price,
           image, and any other useful metadata.
        Prefer stable, semantic selectors. Keep the template minimal but complete.
      `,
    }),
  });

const blueprint: Blueprint.Definition = { key: BLUEPRINT_KEY, make };

export default blueprint;
```

- [ ] **Step 4: Write `blueprints/index.ts`.**

```typescript
//
// Copyright 2026 DXOS.org
//

export { default as ProviderBlueprint } from './provider-blueprint';
```

- [ ] **Step 5: Compile.**

Run: `moon run plugin-search:compile`
Expected: success (with the AI call resolved per checkpoint 1).

- [ ] **Step 6: Commit.**

```bash
git add packages/plugins/plugin-search/src/operations packages/plugins/plugin-search/src/blueprints
git commit -m "feat(plugin-search): analyze-provider operation + blueprint"
```

---

## Task 12: Capabilities + plugin assembly (first runnable build)

**Files:**
- Create: `packages/plugins/plugin-search/src/capabilities/operation-handler.ts`
- Create: `packages/plugins/plugin-search/src/capabilities/blueprint-definition.ts`
- Create: `packages/plugins/plugin-search/src/capabilities/index.ts`
- Create: `packages/plugins/plugin-search/src/translations.ts`
- Create: `packages/plugins/plugin-search/src/SearchPlugin.tsx`

- [ ] **Step 1: `operation-handler.ts`.**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';

import { SearchOperationHandlerSet } from '../operations';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationHandler, SearchOperationHandlerSet);
  }),
);
```

Confirm `Capabilities.OperationHandler` is the right capability tag by checking `plugin-feed/src/capabilities/operation-handler.ts`; mirror it exactly.

- [ ] **Step 2: `blueprint-definition.ts`** (mirror `plugin-feed/src/capabilities/blueprint-definition.ts`).

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { ProviderBlueprint } from '../blueprints';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(AppCapabilities.BlueprintDefinition, ProviderBlueprint);
  }),
);
```

- [ ] **Step 3: `translations.ts`** (mirror `plugin-feed/src/translations.ts`; include type labels + form translations).

```typescript
//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';

import { meta } from './meta';
import { Provider, Search, Result } from './types';

export const translations = [
  ...formTranslations,
  {
    'en-US': {
      [Type.getTypename(Search.Search)]: {
        'typename.label': 'Search',
        'typename.label_other': 'Searches',
        'object-name.placeholder': 'New search',
        'add-object.label': 'Add search',
      },
      [Type.getTypename(Provider.Provider)]: {
        'typename.label': 'Provider',
        'typename.label_other': 'Providers',
        'object-name.placeholder': 'New provider',
        'add-object.label': 'Add provider',
      },
      [Type.getTypename(Result.Result)]: {
        'typename.label': 'Result',
        'typename.label_other': 'Results',
      },
      [meta.id]: {
        'plugin.name': 'Search',
        'run-search.label': 'Run search',
        'analyze-provider.label': 'Analyze provider',
        'empty-results.message': 'No results yet',
        'providers.label': 'Providers',
      },
    },
  },
] as const satisfies Resource[];
```

- [ ] **Step 4: `capabilities/index.ts`** (re-export the capability modules used by the plugin; mirror plugin-feed naming).

```typescript
//
// Copyright 2026 DXOS.org
//

export { default as OperationHandler } from './operation-handler';
export { default as BlueprintDefinition } from './blueprint-definition';
export { default as CreateObject } from './create-object';
export { default as ReactSurface } from './react-surface';
export { default as AppGraphBuilder } from './app-graph-builder';
```

(`CreateObject`, `ReactSurface`, `AppGraphBuilder` are created in Tasks 13/17 — add their exports as those tasks complete; for this task, include only `OperationHandler` and `BlueprintDefinition`.)

- [ ] **Step 5: `SearchPlugin.tsx`** (start with the modules that exist now; add surface/graph/create modules in later tasks).

```typescript
//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { BlueprintDefinition, OperationHandler } from './capabilities';
import { meta } from './meta';
import { Provider, Search, Result } from './types';
import { translations } from './translations';

export const SearchPlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Provider.Provider, Search.Search, Result.Result] }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default SearchPlugin;
```

- [ ] **Step 6: Build + test the whole package.**

Run: `moon run plugin-search:build && moon run plugin-search:test`
Expected: build succeeds; all unit tests pass.

- [ ] **Step 7: Commit.**

```bash
git add packages/plugins/plugin-search/src
git commit -m "feat(plugin-search): capabilities, translations, plugin assembly"
```

---

## Task 13: `ResultCard` + `react-surface` (Card)

**Files:**
- Create: `packages/plugins/plugin-search/src/containers/ResultCard/ResultCard.tsx`
- Create: `packages/plugins/plugin-search/src/containers/ResultCard/index.ts`
- Create: `packages/plugins/plugin-search/src/containers/index.ts`
- Create: `packages/plugins/plugin-search/src/capabilities/react-surface.tsx`

- [ ] **Step 1: Implement `ResultCard.tsx`** (mirror `plugin-feed/src/containers/MagazineArticle/MagazineTile.tsx`; use `@dxos/react-ui-card` `Card.*`).

```typescript
//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Card } from '@dxos/react-ui-card';
import { mx } from '@dxos/react-ui-theme';

import { type Result } from '../../types/Result';

export type ResultCardProps = {
  subject: Result;
  current?: boolean;
};

export const ResultCard = ({ subject, current }: ResultCardProps) => {
  const image = subject.images[0];
  return (
    <Card.Root fullWidth classNames={mx('dx-hover dx-current cursor-pointer', current && 'dx-current')}>
      {image && <Card.Poster alt={subject.title} image={image} fit='cover' />}
      <Card.Header>
        <Card.Title classNames='line-clamp-2'>{subject.title}</Card.Title>
      </Card.Header>
      <Card.Body>
        {subject.price != null && (
          <Card.Row>
            <span className='text-sm'>
              {subject.currency ?? ''} {subject.price.toLocaleString()}
            </span>
          </Card.Row>
        )}
      </Card.Body>
    </Card.Root>
  );
};
```

Confirm `Card.Poster`/`Card.Title`/`Card.Row` exist by reading `MagazineTile.tsx`; match its imports exactly.

- [ ] **Step 2: `ResultCard/index.ts`** → `export * from './ResultCard';`

- [ ] **Step 3: `react-surface.tsx`.**

```typescript
//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { ResultCard } from '../containers/ResultCard';
import { SearchArticle } from '../containers/SearchArticle';
import { ProviderArticle } from '../containers/ProviderArticle';
import { Result } from '../types/Result';
import { Search } from '../types/Search';
import { Provider } from '../types/Provider';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'search-article',
        filter: AppSurface.object(AppSurface.Article, Search.Search),
        component: ({ data }) => <SearchArticle subject={data.subject} attendableId={data.attendableId} />,
      }),
      Surface.create({
        id: 'provider-article',
        filter: AppSurface.object(AppSurface.Article, Provider.Provider),
        component: ({ data }) => <ProviderArticle subject={data.subject} />,
      }),
      Surface.create({
        id: 'result-card',
        position: 'first',
        filter: AppSurface.object(AppSurface.Card, Result.Result),
        component: ({ data }) => <ResultCard subject={data.subject} />,
      }),
    ]);
  }),
);
```

`SearchArticle` and `ProviderArticle` are built in Tasks 14–15; this file references them. Build those before compiling, or temporarily comment the two article surfaces and add them back in Task 14/15. Confirm exact import paths for `Surface` / `AppSurface` against `plugin-feed/src/capabilities/react-surface.tsx`.

- [ ] **Step 4: Add `ReactSurface` to `SearchPlugin.tsx`** pipe + `capabilities/index.ts`:

```typescript
AppPlugin.addSurfaceModule({ activate: ReactSurface }),
```

- [ ] **Step 5: Commit** (after Tasks 14–15 make this compile; if proceeding strictly task-by-task, commit `ResultCard` now and the surface wiring after SearchArticle exists).

```bash
git add packages/plugins/plugin-search/src/containers/ResultCard
git commit -m "feat(plugin-search): ResultCard"
```

---

## Task 14: Union-schema util + `RangeField`

**Files:**
- Create: `packages/plugins/plugin-search/src/util/unionSchema.ts`
- Modify: `packages/plugins/plugin-search/src/util/index.ts` (add export)
- Test: `packages/plugins/plugin-search/src/util/unionSchema.test.ts`
- Create: `packages/plugins/plugin-search/src/components/RangeField.tsx`

- [ ] **Step 1: Write the failing test for `unionSchema`.**

```typescript
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { mergeJsonSchemas } from './unionSchema';

describe('mergeJsonSchemas', () => {
  test('unions properties across providers, keyed by name', ({ expect }) => {
    const a = { type: 'object', properties: { make: { type: 'string' } } };
    const b = { type: 'object', properties: { make: { type: 'string' }, price: { type: 'number' } } };
    const merged = mergeJsonSchemas([a, b]);
    expect(Object.keys(merged.properties ?? {}).sort()).toEqual(['make', 'price']);
  });

  test('returns an empty object schema for no providers', ({ expect }) => {
    const merged = mergeJsonSchemas([]);
    expect(merged.type).toEqual('object');
    expect(merged.properties).toEqual({});
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

Run: `moon run plugin-search:test -- src/util/unionSchema.test.ts`

- [ ] **Step 3: Implement `unionSchema.ts`.**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { toEffectSchema } from '@dxos/echo';

export type JsonSchemaObject = {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
};

/** Merge multiple JSONSchema objects into one, unioning properties by name (first definition wins on conflict). */
export const mergeJsonSchemas = (schemas: (JsonSchemaObject | undefined)[]): JsonSchemaObject => {
  const properties: Record<string, unknown> = {};
  for (const schema of schemas) {
    for (const [key, value] of Object.entries(schema?.properties ?? {})) {
      if (!(key in properties)) {
        properties[key] = value;
      }
    }
  }
  return { type: 'object', properties };
};

/** Build an Effect Schema from the union of provider search schemas, for use with react-ui-form. */
export const buildUnionFormSchema = (schemas: (JsonSchemaObject | undefined)[]): Schema.Schema<any> =>
  toEffectSchema(mergeJsonSchemas(schemas) as any);
```

Note on the cast: `toEffectSchema` expects the `@dxos/echo` `JsonSchemaType`. The single `as any` here is a genuine external-format boundary (raw JSONSchema → echo's schema type) — but BEFORE accepting it, check `toEffectSchema`'s actual parameter type and use the proper `JsonSchemaType` constructor/typing from `@dxos/echo` instead. Per project rules, eliminate the cast if a typed path exists (it likely does — `JsonSchema` is a Schema you can `Schema.decodeSync` the merged object through to get a typed value).

- [ ] **Step 4: Run — expect PASS** (the two `mergeJsonSchemas` tests).

- [ ] **Step 5: Implement `RangeField.tsx`** — a custom react-ui-form field rendering two number inputs (min/max) for a range-annotated field. Resolve it via the Form's `fieldProvider` or `fieldMap` (see Task 15). Use `@dxos/react-ui` `Input`.

```typescript
//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Input } from '@dxos/react-ui';

export type RangeValue = { min?: number; max?: number };

export type RangeFieldProps = {
  label?: string;
  value?: RangeValue;
  onValueChange?: (value: RangeValue) => void;
};

export const RangeField = ({ label, value, onValueChange }: RangeFieldProps) => {
  const update = (key: 'min' | 'max') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    onValueChange?.({ ...value, [key]: raw === '' ? undefined : Number(raw) });
  };
  return (
    <Input.Root>
      {label && <Input.Label>{label}</Input.Label>}
      <div className='grid grid-cols-2 gap-2'>
        <Input.TextInput type='number' placeholder='Min' value={value?.min ?? ''} onChange={update('min')} />
        <Input.TextInput type='number' placeholder='Max' value={value?.max ?? ''} onChange={update('max')} />
      </div>
    </Input.Root>
  );
};
```

Confirm `Input.Root`/`Input.Label`/`Input.TextInput` against an existing field, e.g. `react-ui-form/src/components/Form/fields/NumberField.tsx`.

- [ ] **Step 6: Add `unionSchema` export to `util/index.ts`.**

- [ ] **Step 7: Commit.**

```bash
git add packages/plugins/plugin-search/src/util/unionSchema.ts packages/plugins/plugin-search/src/util/unionSchema.test.ts packages/plugins/plugin-search/src/util/index.ts packages/plugins/plugin-search/src/components/RangeField.tsx
git commit -m "feat(plugin-search): union schema builder + RangeField"
```

---

## Task 15: `SearchArticle` (master/detail)

**Files:**
- Create: `packages/plugins/plugin-search/src/containers/SearchArticle/SearchArticle.tsx`
- Create: `packages/plugins/plugin-search/src/containers/SearchArticle/SearchForm.tsx`
- Create: `packages/plugins/plugin-search/src/containers/SearchArticle/ResultTile.tsx`
- Create: `packages/plugins/plugin-search/src/containers/SearchArticle/ResultDetail.tsx`
- Create: `packages/plugins/plugin-search/src/containers/SearchArticle/index.ts`

- [ ] **Step 1: `SearchForm.tsx`** — provider multi-select + union-schema form + Run button.

```typescript
//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Form } from '@dxos/react-ui-form';
import { Button } from '@dxos/react-ui';

import { type Search } from '../../types/Search';
import { type Provider } from '../../types/Provider';
import { buildUnionFormSchema, type JsonSchemaObject } from '../../util';

export type SearchFormProps = {
  search: Search;
  providers: Provider[];
  onRun: () => void;
};

export const SearchForm = ({ search, providers, onRun }: SearchFormProps) => {
  const schema = useMemo(
    () => buildUnionFormSchema(providers.map((provider) => provider.searchSchema as JsonSchemaObject | undefined)),
    [providers],
  );
  return (
    <div className='flex flex-col gap-2 p-2'>
      <Form.Root
        schema={schema}
        values={{ ...search.criteria }}
        onValuesChanged={(values) => {
          search.criteria = { ...values };
        }}
      >
        <Form.Content>
          <Form.FieldSet />
        </Form.Content>
      </Form.Root>
      <Button onClick={onRun}>Run search</Button>
    </div>
  );
};
```

Note: register the `RangeField` via `Form.Root`'s `fieldMap` or `fieldProvider` for range-annotated fields (Task 14). Confirm the prop name (`fieldMap` keyed by JSON path, per the research) and wire it: for each field whose merged JSONSchema carries the range annotation, map to `(props) => <RangeField {...props} />`. Read `plugin-kanban/src/containers/KanbanSettings` for the `fieldMap` pattern.

- [ ] **Step 2: `ResultTile.tsx`** — wraps `ResultCard` in a `Focus.Item` for selection (mirror `MagazineTile`'s `Focus.Item` usage).

```typescript
//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Focus } from '@dxos/react-ui-attention';
import { Obj } from '@dxos/echo';

import { ResultCard } from '../ResultCard';
import { type Result } from '../../types/Result';

export type ResultTileProps = {
  result: Result;
  current?: boolean;
  onCurrentChange?: (id: string) => void;
};

export const ResultTile = ({ result, current, onCurrentChange }: ResultTileProps) => (
  <Focus.Item asChild current={current} onCurrentChange={() => onCurrentChange?.(Obj.getURI(result))}>
    <div>
      <ResultCard subject={result} current={current} />
    </div>
  </Focus.Item>
);
```

Confirm `Focus.Item` import + props against `MagazineTile.tsx`.

- [ ] **Step 3: `ResultDetail.tsx`** — full metadata + images + link out for the selected result.

```typescript
//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Result } from '../../types/Result';

export type ResultDetailProps = {
  result?: Result;
};

export const ResultDetail = ({ result }: ResultDetailProps) => {
  if (!result) {
    return <div className='p-4 text-description'>Select a result.</div>;
  }
  return (
    <div className='flex flex-col gap-2 p-4 overflow-auto'>
      <h2 className='text-lg'>{result.title}</h2>
      {result.price != null && (
        <div>
          {result.currency ?? ''} {result.price.toLocaleString()}
        </div>
      )}
      <a href={result.url} target='_blank' rel='noreferrer' className='text-primary-500 underline'>
        View listing
      </a>
      <div className='grid grid-cols-2 gap-2'>
        {result.images.map((image) => (
          <img key={image} src={image} alt={result.title} className='rounded' />
        ))}
      </div>
      <dl className='grid grid-cols-[auto_1fr] gap-x-2'>
        {Object.entries(result.properties).map(([key, value]) => (
          <React.Fragment key={key}>
            <dt className='text-description'>{key}</dt>
            <dd>{String(value)}</dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
};
```

- [ ] **Step 4: `SearchArticle.tsx`** — compose form (left), masonry (right), detail (selection); mirror `MagazineArticle.tsx` for masonry + `useSelected`.

```typescript
//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { useSelected } from '@dxos/react-ui-attention';
import { Masonry } from '@dxos/react-ui-masonry';

import { ResultTile } from './ResultTile';
import { ResultDetail } from './ResultDetail';
import { SearchForm } from './SearchForm';
import { SearchOperation } from '../../types';
import { Provider } from '../../types/Provider';
import { type Result } from '../../types/Result';
import { type Search } from '../../types/Search';

export type SearchArticleProps = {
  subject: Search;
  attendableId?: string;
};

export const SearchArticle = ({ subject: search, attendableId }: SearchArticleProps) => {
  const id = attendableId ?? Obj.getURI(search);
  const currentId = useSelected(id, 'single');
  // Resolve provider + result refs to live objects (confirm the ref-resolution hook against MagazineArticle).
  const providers = (search.providers.map((ref) => ref.target).filter(Boolean) as Provider[]);
  const results = (search.results.map((ref) => ref.target).filter(Boolean) as Result[]);

  const handleRun = useCallback(() => {
    // Invoke locally; for agent execution use Operation.schedule.
    void Operation.invoke(SearchOperation.RunSearch, { search: /* Ref.make(search) */ search as any });
  }, [search]);

  const tileItems = useMemo(() => results.map((result) => ({ result })), [results]);
  const selected = results.find((result) => Obj.getURI(result) === currentId);

  const Tile = ({ data }: { data: { result: Result } | undefined; index: number }) =>
    data ? <ResultTile result={data.result} current={Obj.getURI(data.result) === currentId} /> : null;

  return (
    <div className='grid grid-cols-[20rem_1fr_24rem] h-full overflow-hidden'>
      <div className='overflow-auto border-ie border-separator'>
        <SearchForm search={search} providers={providers} onRun={handleRun} />
      </div>
      <Masonry.Root Tile={Tile} minColumnWidth={16} maxColumnWidth={22}>
        <Masonry.Content thin centered padding>
          <Masonry.Viewport items={tileItems} getId={(data) => (data?.result ? Obj.getURI(data.result) : '')} />
        </Masonry.Content>
      </Masonry.Root>
      <div className='overflow-auto border-is border-separator'>
        <ResultDetail result={selected} />
      </div>
    </div>
  );
};
```

CRITICAL fixes the implementer must make (do NOT leave the `as any`):
- Replace `search as any` with the proper `Ref.make(search)` (import `Ref` from `@dxos/echo`). The operation input is `Ref.Ref(Search)`.
- Confirm the ref-resolution + live-query hooks against `MagazineArticle.tsx` (it auto-loads refs on mount and uses reactive queries). Use the same hooks (`useQuery` / ref `.target` / `loadRefs`) it uses — match exactly rather than the sketch above.
- Confirm how the operation is invoked from a React component — `MagazineArticle` triggers operations via app-graph actions (Task 17) rather than calling `Operation.invoke` directly in a callback. Prefer wiring "Run" as a graph action; if invoking inline, confirm the React-side operation-invocation helper.

- [ ] **Step 5: `SearchArticle/index.ts`** + `containers/index.ts` barrels.

- [ ] **Step 6: Build.**

Run: `moon run plugin-search:build`
Expected: success, zero `as any`.

- [ ] **Step 7: Commit.**

```bash
git add packages/plugins/plugin-search/src/containers/SearchArticle packages/plugins/plugin-search/src/containers/index.ts
git commit -m "feat(plugin-search): SearchArticle master/detail"
```

---

## Task 16: `ProviderArticle` (template editor)

**Files:**
- Create: `packages/plugins/plugin-search/src/containers/ProviderArticle/ProviderArticle.tsx`
- Create: `packages/plugins/plugin-search/src/containers/ProviderArticle/index.ts`

- [ ] **Step 1: Implement** — a `Form.Root` over the `Provider` schema (name/url/kind/enabled) plus a raw JSON editor for `searchSchema`/`request`/`result`, and an "Analyze" button. Reuse `Form` as in `SearchForm`. For the JSON portions, render a `<textarea>` bound to `JSON.stringify(value, null, 2)` with parse-on-blur (a richer editor is a follow-up). Include a "Re-analyze" button that triggers `AnalyzeProvider` (prefer a graph action — Task 17).

```typescript
//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Form } from '@dxos/react-ui-form';

import { Provider as ProviderType } from '../../types/Provider';
import { type Provider } from '../../types/Provider';

export type ProviderArticleProps = {
  subject: Provider;
};

export const ProviderArticle = ({ subject: provider }: ProviderArticleProps) => (
  <div className='flex flex-col gap-4 p-4 overflow-auto'>
    <Form.Root
      schema={ProviderType.Provider}
      values={provider}
      onValuesChanged={(values) => {
        provider.name = values.name;
        provider.url = values.url;
        provider.kind = values.kind;
        provider.enabled = values.enabled;
      }}
    >
      <Form.Content>
        <Form.FieldSet />
      </Form.Content>
    </Form.Root>
    {/* Raw mapping editors: searchSchema / request / result as JSON textareas. */}
  </div>
);
```

Confirm: `ProviderType.Provider` is the schema value; the form will skip `searchSchema`/`request`/`result` if they are not form-friendly — render those as JSON textareas explicitly. Match the import style used by `SearchForm`.

- [ ] **Step 2: Barrels + build.**

Run: `moon run plugin-search:build`

- [ ] **Step 3: Commit.**

```bash
git add packages/plugins/plugin-search/src/containers/ProviderArticle
git commit -m "feat(plugin-search): ProviderArticle template editor"
```

---

## Task 17: App-graph (Providers branch + actions) + CreateObject

**Files:**
- Create: `packages/plugins/plugin-search/src/capabilities/app-graph-builder.ts`
- Create: `packages/plugins/plugin-search/src/capabilities/create-object.ts`
- Modify: `SearchPlugin.tsx` (add modules), `capabilities/index.ts`

- [ ] **Step 1: `create-object.ts`** — register `CreateObjectEntry` for `Search` and `Provider` (mirror `plugin-feed/src/capabilities/create-object.ts`).

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';

import { Provider, makeProvider } from '../types/Provider';
import { Search, makeSearch } from '../types/Search';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Search.Search),
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = makeSearch({ name: (props as { name?: string }).name ?? 'New search' });
            return yield* Operation.invoke(SpaceOperation.AddObject, { object, target: options.target });
          }),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Provider.Provider),
        createObject: (props, options) =>
          Effect.gen(function* () {
            const typed = props as { name?: string; url?: string };
            const object = makeProvider({
              name: typed.name ?? 'New provider',
              url: typed.url ?? '',
              kind: 'scrape',
            });
            return yield* Operation.invoke(SpaceOperation.AddObject, { object, target: options.target });
          }),
      }),
    ];
  }),
);
```

Confirm `createObject` entry shape (whether `inputSchema` is required; whether `props` is typed) against `plugin-feed`; replace the `as { ... }` reads with the typed `props` the framework supplies (it provides typed props from `inputSchema` — define `inputSchema` to avoid casts).

- [ ] **Step 2: `app-graph-builder.ts`** — a "Providers" branch listing `Provider` objects; a Run action on `Search` nodes; a Re-analyze action on `Provider` nodes (mirror `plugin-feed/src/capabilities/app-graph-builder.ts`).

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { GraphBuilder, Node } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';

import { meta } from '../meta';
import { SearchOperation } from '../types';
import { Provider, instanceOf as isProvider } from '../types/Provider';
import { Search, instanceOf as isSearch } from '../types/Search';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(/* Capabilities.AppGraphBuilder */ undefined as never, [
      // Run action on a Search node.
      GraphBuilder.createExtension({
        id: `${meta.id}/run-search`,
        match: (node) => (isSearch(node.data) ? Option.some(node.data) : Option.none()),
        actions: (search) =>
          Effect.succeed([
            {
              id: 'run',
              data: () => Operation.invoke(SearchOperation.RunSearch, { search }),
              properties: { label: ['run-search.label', { ns: meta.id }], icon: 'ph--magnifying-glass--regular' },
            },
          ]),
      }),
      // Re-analyze action on a Provider node.
      GraphBuilder.createExtension({
        id: `${meta.id}/analyze-provider`,
        match: (node) => (isProvider(node.data) ? Option.some(node.data) : Option.none()),
        actions: (provider) =>
          Effect.succeed([
            {
              id: 'analyze',
              data: () => Operation.invoke(SearchOperation.AnalyzeProvider, { provider }),
              properties: { label: ['analyze-provider.label', { ns: meta.id }], icon: 'ph--brain--regular' },
            },
          ]),
      }),
    ]);
  }),
);
```

This file is the most framework-specific. Read `plugin-feed/src/capabilities/app-graph-builder.ts` end-to-end and copy its exact imports (`GraphBuilder`, `Node`, the capability tag passed to `Capability.contributes`, `AppNodeMatcher`, the `createObjectNode` helper, ref-to-data conversions, and how `Operation.invoke` is passed as action `data`). Replace the `undefined as never` placeholder with the real capability tag and remove all guesses. Also add the "Providers" branch connector (like the Feeds branch) listing `Provider` objects in the space.

- [ ] **Step 3: Wire modules into `SearchPlugin.tsx`** (add `AppGraphBuilder`, `CreateObject`):

```typescript
AppPlugin.addAppGraphModule({
  activatesOn: ActivationEvent.allOf(AppActivationEvents.SetupAppGraph, AttentionEvents.AttentionReady),
  activate: AppGraphBuilder,
}),
AppPlugin.addCreateObjectModule({ activate: CreateObject }),
```

Import `ActivationEvent` from `@dxos/app-framework`, `AppActivationEvents`/`AppPlugin` from `@dxos/app-toolkit`, `AttentionEvents` from `@dxos/plugin-attention` (match `FeedPlugin.tsx`).

- [ ] **Step 4: Build + test.**

Run: `moon run plugin-search:build && moon run plugin-search:test`
Expected: success.

- [ ] **Step 5: Commit.**

```bash
git add packages/plugins/plugin-search/src
git commit -m "feat(plugin-search): app-graph actions + create-object"
```

---

## Task 18: `PLUGIN.mdl` + plugin-asset module

**Files:**
- Modify: `packages/plugins/plugin-search/PLUGIN.mdl`
- Modify: `SearchPlugin.tsx` (add `addPluginAssetModule`)

- [ ] **Step 1: Write `PLUGIN.mdl`** — a concise design doc for the plugin (purpose, the three types, how templates are authored by the blueprint, how search runs locally/agent, the masonry UI). Follow the structure of `packages/plugins/plugin-feed/PLUGIN.mdl`. Per project memory, `PLUGIN.mdl` is the plugin's design doc.

- [ ] **Step 2: Add the asset module** to `SearchPlugin.tsx` (mirror `FeedPlugin.tsx`):

```typescript
import pluginSpec from '../PLUGIN.mdl?raw';
// ...
AppPlugin.addPluginAssetModule({
  asset: { pluginId: meta.id, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
}),
```

Confirm the `?raw` import + asset module shape against `FeedPlugin.tsx`.

- [ ] **Step 3: Build.**

Run: `moon run plugin-search:build`

- [ ] **Step 4: Commit.**

```bash
git add packages/plugins/plugin-search/PLUGIN.mdl packages/plugins/plugin-search/src/SearchPlugin.tsx
git commit -m "feat(plugin-search): PLUGIN.mdl design doc + asset module"
```

---

## Task 19: Stories + register in composer-app

**Files:**
- Create: `packages/plugins/plugin-search/src/containers/ResultCard/ResultCard.stories.tsx`
- Create: `packages/plugins/plugin-search/src/containers/SearchArticle/SearchArticle.stories.tsx`
- Create: `packages/plugins/plugin-search/src/containers/ProviderArticle/ProviderArticle.stories.tsx`
- Create: `packages/plugins/plugin-search/src/components/RangeField.stories.tsx`
- Create: `packages/plugins/plugin-search/src/testing.ts`
- Modify: `packages/apps/composer-app/package.json`
- Modify: `packages/apps/composer-app/src/plugin-defs.tsx`

- [ ] **Step 1: `testing.ts`** — export sample objects (a configured car `Provider` with real-ish `searchSchema`/`request`/`result`, a `Search`, sample `Result`s, and a fixture HTML string) for stories and any integration tests.

- [ ] **Step 2: Stories** — one per component. MUST follow project memory: call `withTheme()` WITH parens in decorators, and include `parameters: { translations }` so i18n keys resolve. Mirror an existing plugin story, e.g. `packages/plugins/plugin-feed/src/.../*.stories.tsx`. Example header:

```typescript
//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { ResultCard } from './ResultCard';
import { translations } from '../../translations';
import { sampleResult } from '../../testing';

const meta: Meta<typeof ResultCard> = {
  title: 'plugins/plugin-search/ResultCard',
  component: ResultCard,
  decorators: [withTheme()],
  parameters: { translations },
};

export default meta;

export const Default: StoryObj<typeof ResultCard> = { args: { subject: sampleResult } };
```

Confirm the exact `withTheme` import path and story decorator set against a current `plugin-feed` story (the testing memory + `feedback_react_ui_stories`).

- [ ] **Step 3: Register the plugin in composer-app.** Add to `packages/apps/composer-app/package.json` dependencies:

```json
"@dxos/plugin-search": "workspace:*",
```

Then in `packages/apps/composer-app/src/plugin-defs.tsx` import and add `SearchPlugin` to the plugin list (find where `FeedPlugin` is imported and registered; add `SearchPlugin` right after, matching the exact import + array-insertion pattern).

- [ ] **Step 4: Install + full build.**

Run: `pnpm install && moon run plugin-search:build && moon run plugin-search:test && moon run composer-app:build`
Expected: all succeed.

- [ ] **Step 5: Storybook smoke check.**

Run: `moon run storybook-react:serve` and open the `plugins/plugin-search/*` stories; confirm they render without console errors. (Or use `moon run plugin-search:test-storybook` if present.)

- [ ] **Step 6: Commit.**

```bash
git add packages/plugins/plugin-search packages/apps/composer-app/package.json packages/apps/composer-app/src/plugin-defs.tsx pnpm-lock.yaml
git commit -m "feat(plugin-search): stories + register in composer-app"
```

---

## Task 20: End-to-end verification in composer-app

- [ ] **Step 1: Run the app.**

Run: `moon run composer-app:serve --quiet` (port 5173).

- [ ] **Step 2: Verify the happy path** (use the preview tooling). Create a `Provider` from `testing.ts` data (or create one and edit its template JSON in `ProviderArticle`), create a `Search`, select the provider, fill criteria, click Run, and confirm masonry results render + master/detail selection works.

- [ ] **Step 3: Verify lint + format.**

Run: `moon run plugin-search:lint -- --fix && pnpm format`
Expected: clean.

- [ ] **Step 4: Audit for casts** (project rule).

Run: `git diff origin/main | grep -nE '\bas (any|unknown|const|[A-Z])|as unknown as'`
Expected: no new casts except justified external-boundary ones with comments. Remove/justify each.

- [ ] **Step 5: Final commit** (if any fixes).

```bash
git add -A
git commit -m "chore(plugin-search): lint/format + cast audit"
```

---

## Self-Review (completed by plan author)

**Spec coverage:**
- Provider template (schema + request + result mapping) → Tasks 1, 2. ✓
- LLM-authored, user-editable templates → Task 11 (blueprint/analyze), Task 16 (editor). ✓
- Search type with providers + typed criteria → Task 4; union form → Tasks 14–15. ✓
- Typed criteria incl. ranges via annotation → Tasks 14 (RangeField + annotation), 15 (fieldMap wiring). ✓
- Results as linked objects w/ metadata + image refs → Task 3, Task 9. ✓
- Local or agent execution → Tasks 9–10 (`Operation.invoke` / `Operation.schedule`), Task 17 (actions). ✓
- Masonry master/detail → Task 15. ✓
- Edge proxy fetch → Task 8. ✓
- Plugin registration → Task 19. ✓

**Known soft spots (flagged inline, must be resolved by implementer, not stubbed):**
- Task 11 AI structured-output call (confirm `@dxos/assistant` API; fallback = blueprint + `SetProviderTemplate` op).
- Task 15 ref-resolution hooks + operation invocation from React (match `MagazineArticle` exactly; remove the `as any`).
- Task 17 app-graph capability tag + `GraphBuilder` API (copy from `plugin-feed`).
- Task 14 `toEffectSchema` input typing (eliminate the `as any` if a typed path exists).

These are explicitly called out because they depend on framework APIs best confirmed against the live `plugin-feed`/`plugin-assistant` source at implementation time rather than guessed here.

**Range annotation mechanism (decision):** represent a range field in the merged JSONSchema as an object property `{ type: 'object', properties: { min, max }, $comment: 'range' }` (or the echo annotation namespace equivalent); the `SearchForm` `fieldMap` maps any property carrying that marker to `RangeField`. If wiring a custom field proves hard, the nested `{min,max}` object renders as two number inputs via the default `FormFieldSet` recursion — acceptable v1 fallback.
```
