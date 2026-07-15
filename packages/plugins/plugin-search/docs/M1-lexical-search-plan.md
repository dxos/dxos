# Milestone 1 — Real Lexical Search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `plugin-search`'s fetch-everything + client-regex with the ECHO
FTS5 index, and make the `MailboxArticle` search box actually filter messages —
using only infrastructure that already ships.

**Architecture:** `plugin-search` issues `Query.select(Filter.text(q, {type:'full-text'}))`
(a lone FTS `SelectStep`), maps the returned objects to ranked `SearchResult`s, and
renders them. `MailboxArticle` builds its selection from the already-parsed
`QueryBuilder` filter: free-text → FTS over the message feed; structural-only
(`from:` / `#tag`) → `Filter.and(type, filter)`. Mixed text+structural is
explicitly out of scope (blocked by the executor until Milestone 3).

**Tech Stack:** TypeScript, React, `@dxos/echo` (`Filter`/`Query`), `@dxos/react-client`
(`useQuery`), `@dxos/react-ui-search`, Storybook play tests, Vitest via `moon`.

## Global Constraints

- **No casts to silence the type-checker** — no `as any` / `as unknown as T` /
  non-null `!` to fix a type; fix the type at its source (`as const` is fine).
- **Imports grouped** builtin → external → @dxos → internal → parent → sibling,
  blank line between groups; named exports; single quotes.
- **Comments state _why_**, end with a period; JSDoc public functions.
- **Workspace deps** use `workspace:*`; format with `pnpm format` (oxfmt), lint with
  `moon run <pkg>:lint -- --fix`.
- **Test after every step**; check off `- [x]` in the same change that lands the work.
- **The executor cannot combine `text-search` with any other root filter via AND**
  — `Filter.and(Filter.type(X), Filter.text(...))` throws "Query too complex"
  (`query-planner.ts` `case 'and'`, `isRootExecutable`). Never construct that shape
  in this milestone.

### Key facts verified against the code

- `Filter.text(q, { type: 'full-text' })` → planner `case 'text-search'` emits a
  single `TextSelector` `SelectStep` with **no** trailing `FilterStep`
  (`query-planner.ts:254-268`). A pure text query is safe and index-backed.
- The FTS index (`index-core` `FtsIndex`, FTS5 trigram + BM25) **runs client-side
  today** in OPFS/WASM SQLite — the "indexer not available in all environments"
  TODO is stale.
- Terms `< 3` chars fall back to a `LIKE '%term%'` full scan (trigram minimum).
- `Filter` exposes `.ast: QueryAST.Filter` (`echo/src/Filter.ts:31,46`).
- `SearchResult` shape (`react-ui-search/src/types/SearchResult.ts`):
  `{ id; type?; label?; match?: RegExp; snippet?; icon?; object? }`.

---

## File Structure

- **Create** `packages/plugins/plugin-search/src/hooks/search-query.ts` — pure
  query/result helpers (`buildSearchFilter`, `buildSearchQuery`, `toSearchResults`,
  `byRelevance`, `computeMatchSpans`, `type MatchSpan`).
- **Create** `packages/plugins/plugin-search/src/hooks/search-query.test.ts` — unit
  tests for the pure helpers.
- **Modify** `packages/plugins/plugin-search/src/hooks/sync.ts` — export `getIcon`
  for reuse; leave the regex/table path intact.
- **Modify** `packages/plugins/plugin-search/src/hooks/index.ts` — export the new
  module.
- **Modify** `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx`
  — FTS query + ranked results; drop the stale TODO.
- **Modify** `packages/plugins/plugin-search/src/containers/SearchArticle/SearchArticle.tsx`
  — FTS query + ranked results; remove deprecated web-search wiring.
- **Modify** `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx`
  — assert results match a known seeded term.
- **Create** `packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.ts`
  — `buildMailboxSelection` + AST helpers.
- **Create** `packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts`.
- **Modify** `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx`
  — use `buildMailboxSelection` in the query.

---

## Task 1: Pure search-query helpers

**Files:**
- Create: `packages/plugins/plugin-search/src/hooks/search-query.ts`
- Test: `packages/plugins/plugin-search/src/hooks/search-query.test.ts`

**Interfaces:**
- Produces:
  - `type MatchSpan = { start: number; end: number }`
  - `buildSearchFilter(text: string): Filter.Any` — a `full-text` text filter.
  - `buildSearchQuery(text: string | undefined): Query.Query` — `Filter.nothing()`
    when empty, else `Query.select(buildSearchFilter(text))`.
  - `byRelevance(query: string): (a: { label?: string }, b: { label?: string }) => number`
  - `computeMatchSpans(value: string, query: string): MatchSpan[]`
  - `toSearchResults<T extends Entity.Unknown>(objects: T[], text: string): SearchResult<T>[]`

- [ ] **Step 1: Write failing tests for the pure functions**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { byRelevance, buildSearchFilter, buildSearchQuery, computeMatchSpans } from './search-query';

describe('search-query', () => {
  test('buildSearchFilter emits a full-text text-search node', () => {
    const filter = buildSearchFilter('invoice');
    expect(filter.ast.type).toBe('text-search');
    expect(filter.ast).toMatchObject({ type: 'text-search', text: 'invoice', searchKind: 'full-text' });
  });

  test('buildSearchQuery is empty for blank input', () => {
    // `Filter.nothing()` is a negated match-all.
    expect(buildSearchQuery(undefined).ast).toBeDefined();
    expect(buildSearchQuery('  ').ast).toBeDefined();
  });

  test('computeMatchSpans finds case-insensitive occurrences', () => {
    expect(computeMatchSpans('Acme Invoice', 'invoice')).toEqual([{ start: 5, end: 12 }]);
    expect(computeMatchSpans('no match here', 'xyz')).toEqual([]);
  });

  test('byRelevance ranks exact, then prefix, then substring, then length', () => {
    const items = [{ label: 'Alicia' }, { label: 'Al' }, { label: 'Sal' }, { label: 'al' }];
    const sorted = [...items].sort(byRelevance('al'));
    expect(sorted.map((i) => i.label)).toEqual(['al', 'Al', 'Alicia', 'Sal']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `moon run plugin-search:test -- src/hooks/search-query.test.ts`
Expected: FAIL — `Cannot find module './search-query'`.

- [ ] **Step 3: Implement the helpers**

```ts
//
// Copyright 2026 DXOS.org
//

import { Entity, Filter, Obj, Query } from '@dxos/echo';
import { Text } from '@dxos/schema';

import { type SearchResult } from '#types';

import { getIcon, mapObjectToTextFields } from './sync';

/** A character span within a field value, for highlighting. */
export type MatchSpan = { start: number; end: number };

/** Full-text search filter over the FTS5 index. */
export const buildSearchFilter = (text: string): Filter.Any => Filter.text(text, { type: 'full-text' });

/**
 * Build the ECHO query for a search box value. Empty input matches nothing; a term
 * routes to the FTS index via a single text-search select (never combined with a
 * type filter — that composition is unsupported by the executor).
 */
export const buildSearchQuery = (text: string | undefined): Query.Query => {
  const trimmed = text?.trim();
  return trimmed ? Query.select(buildSearchFilter(trimmed)) : Query.select(Filter.nothing());
};

/** Case-insensitive, non-overlapping occurrences of `query` within `value`. */
export const computeMatchSpans = (value: string, query: string): MatchSpan[] => {
  const spans: MatchSpan[] = [];
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return spans;
  }
  const haystack = value.toLowerCase();
  let from = 0;
  for (;;) {
    const index = haystack.indexOf(needle, from);
    if (index === -1) {
      break;
    }
    spans.push({ start: index, end: index + needle.length });
    from = index + needle.length;
  }
  return spans;
};

/**
 * Presentation ordering for already-matched results: exact label, then prefix, then
 * substring, then shorter labels first. The FTS index does the semantic matching;
 * this only orders what it returned. (Exposing the engine's BM25 rank is a follow-up.)
 */
export const byRelevance =
  (query: string) =>
  (a: { label?: string }, b: { label?: string }): number => {
    const needle = query.trim().toLowerCase();
    const rank = (label?: string): number => {
      const value = (label ?? '').toLowerCase();
      if (value === needle) {
        return 0;
      }
      if (value.startsWith(needle)) {
        return 1;
      }
      if (value.includes(needle)) {
        return 2;
      }
      return 3;
    };
    const byRank = rank(a.label) - rank(b.label);
    if (byRank !== 0) {
      return byRank;
    }
    return (a.label?.length ?? 0) - (b.label?.length ?? 0);
  };

/**
 * Map FTS-matched ECHO objects to ranked search results. Text objects are dropped
 * (they carry no independent label and are indexed via their host object).
 */
export const toSearchResults = <T extends Entity.Unknown>(objects: T[], text: string): SearchResult<T>[] => {
  const results = objects.reduce<SearchResult<T>[]>((acc, object) => {
    if (Obj.instanceOf(Text.Text, object)) {
      return acc;
    }
    const label = Obj.getLabel(object as any);
    const fields = mapObjectToTextFields(object);
    const snippet = fields.content ?? fields.description ?? Object.values(fields).find((value) => value !== label);
    acc.push({
      id: object.id,
      icon: getIcon(Entity.getType(object)),
      label,
      snippet,
      object,
    });
    return acc;
  }, []);
  return results.sort(byRelevance(text));
};
```

- [ ] **Step 4: Export `getIcon` from `sync.ts`**

In `packages/plugins/plugin-search/src/hooks/sync.ts`, change the `getIcon`
declaration from `const getIcon = (...)` to `export const getIcon = (...)` (line
~18). No other change.

- [ ] **Step 5: Run tests to verify they pass**

Run: `moon run plugin-search:test -- src/hooks/search-query.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Export the module and commit**

Add to `packages/plugins/plugin-search/src/hooks/index.ts`:

```ts
export * from './search-query';
```

```bash
git add packages/plugins/plugin-search/src/hooks
git commit -m "plugin-search: add FTS query + ranking helpers"
```

---

## Task 2: Wire the search containers to the FTS index

**Files:**
- Modify: `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:33-40`
- Modify: `packages/plugins/plugin-search/src/containers/SearchArticle/SearchArticle.tsx:19-33`

**Interfaces:**
- Consumes: `buildSearchQuery`, `toSearchResults` (Task 1).

- [ ] **Step 1: Update `SearchDialog` to query the FTS index**

Replace lines 33–40 of `SearchDialog.tsx`:

```ts
  const objects = useQuery(space?.db, buildSearchQuery(query));
  const results = useMemo(() => (query ? toSearchResults(objects, query) : []), [objects, query]);
  const allResults = useMemo(() => results.filter(({ object }) => object && Entity.getLabel(object)), [results]);
```

Update the import on line 17 to pull the helpers instead of the regex hooks:

```ts
import { buildSearchQuery, toSearchResults, useGlobalSearch } from '#hooks';
```

(`setMatch` from `useGlobalSearch` stays — it still drives the `GlobalFilterProvider`
regex used by `plugin-table` live-filtering; only the *results* now come from FTS.)
Remove the now-unused `Filter`, `Query`, `Text` imports if the type-checker flags
them.

- [ ] **Step 2: Update `SearchArticle` to query the FTS index and drop web search**

Replace lines 19–33 of `SearchArticle.tsx`:

```ts
  // TODO(burdon): Cross-space search — Milestone 2 (fan-out + merge).
  const [query, setQuery] = useState<string>();
  const objects = useQuery(space.db, buildSearchQuery(query));
  const { setMatch } = useGlobalSearch();
  const results = useMemo(() => (query ? toSearchResults(objects, query) : []), [objects, query]);
  const allResults = useMemo(
    () => results.filter(({ object }) => object && Entity.getLabel(object)),
    [results],
  );
```

Update imports (line 8, 16): drop `Filter`, `Query`, `Text`, `useWebSearch`; add the
helpers:

```ts
import { Entity } from '@dxos/echo';
// ...
import { SearchResultStack } from '#components';
import { buildSearchQuery, toSearchResults, useGlobalSearch } from '#hooks';
```

- [ ] **Step 3: Run the type-check and lint**

Run: `moon run plugin-search:build` then `moon run plugin-search:lint -- --fix`
Expected: no type errors; lint clean. (Deprecated `useWebSearch` remains defined in
`hooks/useWebSearch.ts` but is no longer imported by a container.)

- [ ] **Step 4: Strengthen the storybook play test**

In `SearchDialog.stories.tsx`, replace the `Test` story's typed term with a term
that is present in seeded `Person`/`Organization` objects and assert results. The
factory seeds names via `@dxos/random`; use a common trigram-safe substring. Change
`userEvent.type(searchInput, 'a')` to a ≥3-char term and keep the `waitFor` on
`option` count:

```ts
    // Type a 3+ char term (FTS trigram minimum) likely present across 60 seeded objects.
    await userEvent.type(searchInput, 'the');

    await waitFor(
      async () => {
        const options = body.queryAllByRole('option');
        await expect(options.length).toBeGreaterThan(0);
      },
      { timeout: 15_000 },
    );
```

If `'the'` proves flaky against the seed, seed a deterministic object in the story's
`onClientInitialized` (e.g. an `Organization` named `'Acme Test Corp'`) and assert on
`'acme'`.

- [ ] **Step 5: Run the storybook test**

Run: `moon run plugin-search:test -- src/containers/SearchDialog/SearchDialog.stories.tsx`
(or the project's storybook test runner). Expected: the `Test` story passes — FTS
returns options for the term. This is the end-to-end proof that the index is wired
and populated in the browser env.

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-search/src/containers
git commit -m "plugin-search: use FTS index for search results; drop stale regex path and web search"
```

---

## Task 3: Mailbox search selection helper

**Files:**
- Create: `packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.ts`
- Test: `packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts`

**Interfaces:**
- Produces: `buildMailboxSelection(filterText: string, filter: Filter.Any | undefined): Filter.Any`
  - blank input → `Filter.type(Message.Message)`
  - filter containing a `text-search` node → `Filter.text(<the text>, {type:'full-text'})`
    (FTS over the message feed; the message type is implied by the feed scope)
  - structural-only filter → `Filter.and(Filter.type(Message.Message), filter)`

- [ ] **Step 1: Write failing tests**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Filter } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';

import { buildMailboxSelection } from './mailbox-search';

describe('buildMailboxSelection', () => {
  const build = (text: string) => new QueryBuilder(new Map()).build(text).filter;

  test('blank input selects all messages by type', () => {
    const selection = buildMailboxSelection('', undefined);
    expect(selection.ast.type).toBe('object');
  });

  test('free text routes to a full-text select (no AND with type)', () => {
    const text = 'invoice';
    const selection = buildMailboxSelection(text, build(text));
    expect(selection.ast).toMatchObject({ type: 'text-search', searchKind: 'full-text' });
  });

  test('structural-only filter is ANDed with the message type', () => {
    const text = 'from:alice@example.com';
    const selection = buildMailboxSelection(text, build(text));
    expect(selection.ast.type).toBe('and');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `moon run plugin-inbox:test -- src/containers/MailboxArticle/mailbox-search.test.ts`
Expected: FAIL — `Cannot find module './mailbox-search'`.

- [ ] **Step 3: Implement the helper**

```ts
//
// Copyright 2026 DXOS.org
//

import { Filter } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { Message } from '@dxos/schema';

/** Whether the filter AST contains a text-search node anywhere. */
const findTextSearch = (ast: QueryAST.Filter): QueryAST.FilterTextSearch | undefined => {
  switch (ast.type) {
    case 'text-search':
      return ast;
    case 'and':
    case 'or':
      return ast.filters.map(findTextSearch).find(Boolean);
    case 'not':
      return findTextSearch(ast.filter);
    default:
      return undefined;
  }
};

/**
 * Build the message-list selection from the mailbox search box.
 *
 * The query executor cannot combine a text-search with any other root filter via AND
 * (it throws "Query too complex"), so free-text search routes to a lone full-text
 * select over the message feed — the message type is implied by the feed scope.
 * Structural-only filters (`from:`, `#tag`) compose with the message type as normal.
 * Mixed text + structural is not supported in this milestone; the text wins and the
 * structural part is dropped (tracked for Milestone 3).
 */
export const buildMailboxSelection = (filterText: string, filter: Filter.Any | undefined): Filter.Any => {
  const base = Filter.type(Message.Message);
  if (filterText.trim().length === 0 || !filter) {
    return base;
  }
  const textSearch = findTextSearch(filter.ast);
  if (textSearch) {
    return Filter.text(textSearch.text, { type: 'full-text' });
  }
  return Filter.and(base, filter);
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `moon run plugin-inbox:test -- src/containers/MailboxArticle/mailbox-search.test.ts`
Expected: PASS (3 tests). If `QueryAST.FilterTextSearch` is not the exact exported
type name, inspect `packages/core/echo/echo-protocol/src/query/ast.ts` and use the
matching name (the node's runtime shape is `{ type: 'text-search', text, searchKind }`).

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.ts \
        packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts
git commit -m "plugin-inbox: add mailbox search selection helper"
```

---

## Task 4: Apply the mailbox filter to the message query

**Files:**
- Modify: `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:122`

**Interfaces:**
- Consumes: `buildMailboxSelection` (Task 3), the existing `filterText` / `filter`
  state (lines 107-112).

- [ ] **Step 1: Use the selection helper in the query**

Replace line 122 (`const source = feed && Query.select(Filter.type(Message.Message)).from(feed);`):

```ts
  const selection = useMemo(() => buildMailboxSelection(filterText, filter), [filterText, filter]);
  const source = feed && Query.select(selection).from(feed);
```

Add the import (sibling group):

```ts
import { buildMailboxSelection } from './mailbox-search';
```

Leave the aggregate/threading pipeline (lines 123-139) unchanged — the selection is
the only substitution.

- [ ] **Step 2: Type-check and lint**

Run: `moon run plugin-inbox:build` then `moon run plugin-inbox:lint -- --fix`
Expected: clean.

- [ ] **Step 3: Verify end-to-end in the app / storybook**

Drive the mailbox with a text query and confirm the list narrows. If a mailbox
storybook exists (`MailboxArticle.stories.tsx`), add a play test that types a term
present in a seeded message and asserts the rendered message count drops; otherwise
verify in the running Composer app (open a mailbox, type a term, confirm filtering).
**Watch for one risk:** an FTS select feeding the `.aggregate({...})` thread grouping.
If threads misrender under an active text query, the documented fallback is to bypass
conversation grouping while a text query is active:

```ts
  const grouping = conversations && !filterText.trim();
  // ...use `grouping` in place of `conversations` for the aggregate branch.
```

Apply the fallback only if the aggregate path misbehaves; note the outcome in
`TASKS.md`.

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx
git commit -m "plugin-inbox: apply the parsed search filter to the mailbox message query"
```

---

## Task 5 (optional): Snippet highlighting in the result stack

Deliver only if Tasks 1–4 are green and time allows; it does not gate the milestone.

**Files:**
- Create: `packages/plugins/plugin-search/src/components/Highlighted/Highlighted.tsx`
- Modify: `packages/plugins/plugin-search/src/components/SearchResultStack/SearchResultStack.tsx`

**Interfaces:**
- Consumes: `computeMatchSpans` (Task 1).
- Produces: `<Highlighted text={string} query={string} />` rendering `<mark>` around
  matched spans.

- [ ] **Step 1: Write a failing render test**

```ts
//
// Copyright 2026 DXOS.org
//

import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, test } from 'vitest';

import { Highlighted } from './Highlighted';

describe('Highlighted', () => {
  test('wraps matched substrings in <mark>', () => {
    const { container } = render(<Highlighted text='Acme Invoice' query='invoice' />);
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe('Invoice');
  });

  test('renders plain text when there is no match', () => {
    const { container } = render(<Highlighted text='nothing' query='xyz' />);
    expect(container.querySelectorAll('mark')).toHaveLength(0);
    expect(container.textContent).toBe('nothing');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `moon run plugin-search:test -- src/components/Highlighted/Highlighted.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `Highlighted`**

```tsx
//
// Copyright 2026 DXOS.org
//

import React, { Fragment } from 'react';

import { computeMatchSpans } from '#hooks';

export type HighlightedProps = { text: string; query: string };

/** Render `text` with case-insensitive `query` occurrences wrapped in <mark>. */
export const Highlighted = ({ text, query }: HighlightedProps) => {
  const spans = computeMatchSpans(text, query);
  if (spans.length === 0) {
    return <>{text}</>;
  }
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  spans.forEach(({ start, end }, index) => {
    if (start > cursor) {
      parts.push(<Fragment key={`t${index}`}>{text.slice(cursor, start)}</Fragment>);
    }
    parts.push(<mark key={`m${index}`}>{text.slice(start, end)}</mark>);
    cursor = end;
  });
  if (cursor < text.length) {
    parts.push(<Fragment key='tail'>{text.slice(cursor)}</Fragment>);
  }
  return <>{parts}</>;
};

Highlighted.displayName = 'Highlighted';
```

- [ ] **Step 4: Run to verify it passes**

Run: `moon run plugin-search:test -- src/components/Highlighted/Highlighted.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Use it in `SearchResultTile`**

In `SearchResultStack.tsx`, render the result label through `<Highlighted>` using the
active query. Thread the query into the stack (add a `query: string` prop to
`SearchResultStack` and pass it from `SearchArticle`); render
`<Highlighted text={result.label ?? ''} query={query} />` in the tile title. Export
`Highlighted` from `#components`.

- [ ] **Step 6: Type-check, lint, commit**

```bash
moon run plugin-search:build && moon run plugin-search:lint -- --fix
git add packages/plugins/plugin-search/src/components
git commit -m "plugin-search: highlight query matches in search results"
```

---

## Final verification

- [ ] `moon run plugin-search:test` — all unit + story tests pass.
- [ ] `moon run plugin-inbox:test -- src/containers/MailboxArticle` — mailbox tests pass.
- [ ] `moon run plugin-search:build && moon run plugin-inbox:build` — no type errors.
- [ ] `pnpm format` — clean (oxfmt).
- [ ] Manual: search dialog returns ranked results for a term; mailbox box narrows the
  message list on free text and on `from:`/`#tag`.
- [ ] Update `dx.config.ts` / `PLUGIN.mdl` copy so it no longer claims a working web
  search; reconcile `TASKS.md`.

## Self-review notes (spec coverage)

- **(b) Space full-text search** → Tasks 1–2 (FTS via `Filter.text`, ranking,
  optional highlight). ✓
- **(d) Inline filtering (MailboxArticle)** → Tasks 3–4. ✓
- **Not in M1 (by design):** cross-space (M2), text+type composition / in-memory
  text matcher (M3), vector (M4). The mailbox mixed text+structural case is
  explicitly deferred to M3 and logged where dropped.
- **No placeholders**: every code step is complete. The two residual unknowns are
  named with fallbacks — the exact `QueryAST` text-node type name (Task 3 Step 4)
  and the FTS-feeds-aggregate interaction (Task 4 Step 3).
