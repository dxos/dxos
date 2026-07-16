# Document Revisions & Branches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Checkpoints (named automerge heads), read-only time travel, restore, branches (draft Text objects), and 3-way merge-back for markdown documents, with a History companion tab, ObjectProperties section, editor banner, and three switchable diff renderings.

**Architecture:** `Version`/`Branch` records (generic over `Text`, phase-2 upstreamable) embedded in an optional `Markdown.Document.history` struct. A UI-free model module implements checkpoint/branch/restore/diff/merge on live ECHO objects. UI: per-user (non-replicated) selection state chooses which Text the existing editor pipeline renders; diff spans feed inline/side-by-side/gutter renderings selected by a plugin setting.

**Tech Stack:** ECHO (`Obj.version`, `checkoutVersion`, `Text.update`), automerge heads, `diff` (jsdiff, already in catalog), `@codemirror/merge` (new catalog dep), Composer plugin surfaces (companion tab + ObjectProperties section), Effect Operations.

**Spec:** `packages/plugins/plugin-markdown/DESIGN.md` (committed). Read it first.

---

## Ground rules (from repo memory — violations have burned us before)

- Work ONLY in this worktree; never `cd` to the main checkout; `pwd` before trusting test output.
- Absolute paths for Write/Edit must be prefixed with the worktree root.
- Single test file: `pnpm --filter @dxos/plugin-markdown exec vitest run --project=node <file>` (NOT `moon :test -- <file>` — it runs the whole suite). Do NOT launch full `moon :test` or LLM/memoized suites; targeted files + build + lint only.
- `moon run plugin-markdown:build` for type-checking (NOT just `compile`).
- New deps: `pnpm add --filter "@dxos/plugin-markdown" --save-catalog "<pkg>"` for external; `workspace:*` for `@dxos` packages.
- Comments say *why*, end with a period, never narrate this conversation. No casts to silence types. No wrapper divs. `withTheme()` called with parens in stories + `parameters: { translations }`.
- Run `pnpm format` before each commit (oxfmt; lint --fix does not format).
- Commit messages: `plugin-markdown: <imperative description>` + Claude co-author trailer.

## Key APIs (verified in this repo — do not re-derive)

```ts
// Heads of a persisted object's automerge doc:
import { Obj } from '@dxos/echo';
const { versioned, automergeHeads } = Obj.version(text);        // Obj.ts:941; unversioned if not in db

// Object data at historical heads (returns raw data snapshot):
import { checkoutVersion, getEditHistory } from '@dxos/echo-client';  // echo-handler/edit-history.ts
const snapshot = checkoutVersion(text, heads) as { content?: string };

// CRDT-minimal full-string replace (inside Obj.update):
import { Obj, Text as EchoText } from '@dxos/echo';
Obj.update(text, () => EchoText.update(text, 'content', newContent)); // echo/src/Text.ts:34

// Ids for embedded records:
import { Key } from '@dxos/echo';
Key.EntityId.random()

// Text objects: import { Text } from '@dxos/schema'; Text.make({ content })
// Document factory: Markdown.make in src/types/Markdown.ts (sets Obj.setParent(text, doc)).
// Database from object: Obj.getDatabase(doc). Add object: db.add(obj).
```

`@dxos/echo-client` is a new dependency of plugin-markdown (`workspace:*`) — precedent: devtools `ObjectsPanel.tsx:9`.

## File map

Create:
- `packages/plugins/plugin-markdown/src/types/Versioning.ts` — Version/Branch/History schemas.
- `packages/plugins/plugin-markdown/src/model/versioning.ts` — checkpoint/branch/restore/merge model.
- `packages/plugins/plugin-markdown/src/model/diff.ts` — diff spans + 3-way text merge (pure).
- `packages/plugins/plugin-markdown/src/model/versioning.test.ts`, `diff.test.ts`.
- `packages/plugins/plugin-markdown/src/operations/{create-checkpoint,create-branch,merge-branch,get-history}.ts` (+ `versioning.test.ts`).
- `packages/plugins/plugin-markdown/src/hooks/useVersioning.ts` — selection state + derived model.
- `packages/plugins/plugin-markdown/src/extensions/version-diff.ts` — inline + gutter CodeMirror extensions.
- `packages/plugins/plugin-markdown/src/components/VersionBanner/*` — banner (+ story).
- `packages/plugins/plugin-markdown/src/containers/DocumentHistory/*` — companion panel (+ story).
- `packages/plugins/plugin-markdown/src/containers/MarkdownProperties/*` — ObjectProperties section (+ story).
- `packages/plugins/plugin-markdown/src/containers/DiffView/*` — side-by-side MergeView container (+ story).
- `packages/plugins/plugin-markdown/src/capabilities/app-graph-builder.ts` — companion node.
- `.changeset/<name>.md`.

Modify:
- `src/types/Markdown.ts` (history field), `src/types/Settings.ts` (diffView), `src/types/MarkdownOperation.ts`, `src/types/index.ts`, `src/operations/index.ts`, `src/capabilities/{index.ts,react-surface.tsx,state.ts}`, `src/MarkdownPlugin.tsx`, `src/containers/MarkdownArticle/MarkdownArticle.tsx`, `src/containers/index.ts`, `src/components/index.ts`, `src/hooks/index.ts`, `src/translations.ts`, `package.json`, `pnpm-workspace.yaml` (catalog: `@codemirror/merge`).

Pattern files to read before the relevant task (do not skip):
- Companion tab: `packages/plugins/plugin-thread/src/capabilities/app-graph-builder.ts` + `react-surface.tsx:27`.
- ObjectProperties section: `packages/plugins/plugin-script/src/capabilities/react-surface.tsx:90` + `containers/ScriptProperties/ScriptProperties.tsx`.
- Panel layout/primitives: `packages/plugins/plugin-space/src/containers/DefaultProperties/DefaultProperties.tsx`; `composer-ui` skill.
- CodeMirror decorations: `packages/ui/ui-editor/src/extensions/comments.ts`.
- Stories: `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx`.
- Operation tests: `packages/plugins/plugin-markdown/src/operations/update.test.ts` (TestLayer WITHOUT AI: keep `aiServicePreset` but never call agent APIs; model tests need only `Database`).

---

### Task 1: Versioning schema types

**Files:**
- Create: `src/types/Versioning.ts`
- Modify: `src/types/Markdown.ts`, `src/types/index.ts`
- Test: `src/types/Versioning.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/types/Versioning.test.ts
import { describe, expect, it } from 'vitest';

import { Obj } from '@dxos/echo';

import { Markdown, Versioning } from './index';

describe('Versioning schema', () => {
  it('document accepts an optional history struct', () => {
    const doc = Markdown.make({ content: 'hello' });
    expect(doc.history).toBeUndefined();

    Obj.update(doc, () => {
      doc.history = { branches: [], versions: [] };
    });
    expect(doc.history?.versions).toEqual([]);
  });

  it('makeVersion/makeBranch produce valid records', () => {
    const doc = Markdown.make({ content: 'hello' });
    const version = Versioning.makeVersion({ target: doc.content, heads: ['abc'], name: 'v1' });
    expect(version.id).toBeDefined();
    expect(version.heads).toEqual(['abc']);

    const branch = Versioning.makeBranch({ content: doc.content, parent: doc.content, anchor: ['abc'], name: 'draft' });
    expect(branch.status).toBe('active');
  });
});
```

- [ ] **Step 2: Run test, verify it fails** (`Versioning` not exported / `history` not in schema)

Run: `pnpm --filter @dxos/plugin-markdown exec vitest run --project=node src/types/Versioning.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/types/Versioning.ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Key, Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';

/**
 * Named checkpoint: a pointer to the automerge heads of a Text's backing document.
 * Heads are content-addressed change hashes, stable across peers — zero-copy.
 * NOTE: Deliberately not markdown-specific (targets Text, not Document) so these types
 * can lift into @dxos/schema in phase 2. See DESIGN.md.
 */
export const Version = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  target: Ref.Ref(Text.Text),
  heads: Schema.mutable(Schema.Array(Schema.String)),
  createdAt: Schema.String,
  creator: Schema.optional(Schema.String),
  message: Schema.optional(Schema.String),
});
export interface Version extends Schema.Schema.Type<typeof Version> {}

export const BranchStatus = Schema.Literal('active', 'merged', 'archived');
export type BranchStatus = Schema.Schema.Type<typeof BranchStatus>;

/**
 * A draft Text forked from a parent Text at a specific revision (anchor heads).
 * The branch tree is formed by `parent` references; root = Document.content.
 */
export const Branch = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  content: Ref.Ref(Text.Text),
  parent: Ref.Ref(Text.Text),
  anchor: Schema.mutable(Schema.Array(Schema.String)),
  status: BranchStatus,
  createdAt: Schema.String,
  creator: Schema.optional(Schema.String),
  mergedAt: Schema.optional(Schema.String),
});
export interface Branch extends Schema.Schema.Type<typeof Branch> {}

export const History = Schema.mutable(
  Schema.Struct({
    branches: Schema.mutable(Schema.Array(Branch)),
    versions: Schema.mutable(Schema.Array(Version)),
  }),
);
export interface History extends Schema.Schema.Type<typeof History> {}

export const makeVersion = (
  props: Pick<Version, 'target' | 'heads' | 'name'> & Partial<Pick<Version, 'creator' | 'message'>>,
): Version => ({
  id: Key.EntityId.random(),
  createdAt: new Date().toISOString(),
  ...props,
});

export const makeBranch = (
  props: Pick<Branch, 'content' | 'parent' | 'anchor' | 'name'> & Partial<Pick<Branch, 'creator'>>,
): Branch => ({
  id: Key.EntityId.random(),
  status: 'active',
  createdAt: new Date().toISOString(),
  ...props,
});
```

If `Key.EntityId.random()` returns a branded type that doesn't assign to `Schema.String`, call `Key.EntityId.random().toString()` — do not cast.

In `src/types/Markdown.ts`, add to the `Document` struct after `content` (import `* as Versioning from './Versioning'`):

```ts
    history: Schema.optional(Versioning.History).pipe(FormInputAnnotation.set(false)),
```

Check how `FormInputAnnotation.set(false)` composes on optional fields elsewhere in the file and match (annotation before `Schema.optional` like `fallbackName` if needed).

In `src/types/index.ts`, add `export * as Versioning from './Versioning';` (match existing export style).

- [ ] **Step 4: Run test, verify pass**
- [ ] **Step 5: Build** — `moon run plugin-markdown:build` (expect clean; fix type errors at source)
- [ ] **Step 6: Commit** — `plugin-markdown: versioning schema types (Version, Branch, History)`

---

### Task 2: Model — checkpoints & time travel

**Files:**
- Create: `src/model/versioning.ts`, `src/model/index.ts`
- Test: `src/model/versioning.test.ts`

The model is sync (like `Text.apply` call sites), operates on **database-backed** objects, throws `invariant` errors on unloaded refs. Read `src/operations/update.test.ts` for the TestLayer pattern; model tests use it with `operationHandlers: MarkdownOperationHandlerSet`, no agent calls.

- [ ] **Step 1: Write failing tests**

```ts
// src/model/versioning.test.ts
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { SpaceProperties } from '@dxos/client-protocol';
import { Collection, Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { Markdown } from '@dxos/plugin-markdown';
import { HasSubject } from '@dxos/types';

import { WithProperties } from '#testing';

import { MarkdownOperationHandlerSet } from '../operations';
import { contentAt, createCheckpoint, ensureHistory } from './versioning';

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: MarkdownOperationHandlerSet,
  types: [SpaceProperties, Collection.Collection, Markdown.Document, HasSubject.HasSubject, Feed.Feed],
});

describe('versioning model', () => {
  it.effect(
    'createCheckpoint records current heads; contentAt returns historical content',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({ name: 'Doc', content: 'one' });
        yield* Database.add(doc);
        const text = yield* Database.load(doc.content);

        const checkpoint = createCheckpoint(doc, { name: 'v1' });
        expect(checkpoint.heads.length).toBeGreaterThan(0);
        expect(doc.history?.versions).toHaveLength(1);

        Obj.update(text, () => {
          text.content = 'one two';
        });

        expect(contentAt(text, checkpoint.heads)).toBe('one');
        expect(text.content).toBe('one two');
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
```

Adjust the `types` array if the layer complains about missing schema registration (mirror update.test.ts exactly).

- [ ] **Step 2: Run, verify fails** (module missing)
- [ ] **Step 3: Implement**

```ts
// src/model/versioning.ts
//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { checkoutVersion } from '@dxos/echo-client';
import { invariant } from '@dxos/invariant';
import { Text } from '@dxos/schema';

import { Markdown, Versioning } from '#types';

/** Initializes the history struct on first use so existing documents need no migration. */
export const ensureHistory = (doc: Markdown.Document): Versioning.History => {
  if (!doc.history) {
    Obj.update(doc, () => {
      doc.history = { branches: [], versions: [] };
    });
  }
  return doc.history!;
};

const getHeads = (text: Text.Text): string[] => {
  const version = Obj.version(text);
  invariant(version.versioned && version.automergeHeads, 'text is not versioned (not persisted?)');
  return [...version.automergeHeads];
};

/** @returns The Text content at the given automerge heads (read-only time travel). */
export const contentAt = (text: Text.Text, heads: readonly string[]): string => {
  const snapshot = checkoutVersion(text, [...heads]) as { content?: string };
  return snapshot?.content ?? '';
};

export type CreateCheckpointProps = { target?: Text.Text; name: string; message?: string; creator?: string };

export const createCheckpoint = (doc: Markdown.Document, props: CreateCheckpointProps): Versioning.Version => {
  const text = props.target ?? doc.content.target;
  invariant(text, 'document content not loaded');
  const version = Versioning.makeVersion({
    name: props.name,
    target: Ref.make(text),
    heads: getHeads(text),
    ...(props.message !== undefined && { message: props.message }),
    ...(props.creator !== undefined && { creator: props.creator }),
  });
  const history = ensureHistory(doc);
  Obj.update(doc, () => {
    history.versions.push(version);
  });
  return version;
};

/** Find the branch record owning a given Text (undefined for the root). */
export const findBranch = (doc: Markdown.Document, text: Text.Text): Versioning.Branch | undefined =>
  doc.history?.branches.find((branch) => branch.content.target?.id === text.id);
```

Create `src/model/index.ts` re-exporting both model modules; wire `#model` alias only if the package maps `#hooks`/`#types` style imports (check `package.json` `imports` field; otherwise use relative imports).

- [ ] **Step 4: Run test, verify pass**
- [ ] **Step 5: Add `@dxos/echo-client` dep** — edit `package.json` dependencies: `"@dxos/echo-client": "workspace:*"`, run `pnpm install --filter @dxos/plugin-markdown` (or plain `pnpm install`). Re-run test.
- [ ] **Step 6: Build + commit** — `plugin-markdown: versioning model (checkpoints, time travel)`

---

### Task 3: Model — diff spans & 3-way merge (pure)

**Files:**
- Create: `src/model/diff.ts`
- Test: `src/model/diff.test.ts`
- Modify: `package.json` (add `"diff": "catalog:"`)

- [ ] **Step 1: Write failing tests**

```ts
// src/model/diff.test.ts
import { describe, expect, it } from 'vitest';

import { diffSpans, merge3 } from './diff';

describe('diffSpans', () => {
  it('computes insert/delete/equal spans', () => {
    const spans = diffSpans('the quick fox', 'the slow fox');
    expect(spans.map((span) => span.kind)).toEqual(['equal', 'delete', 'insert', 'equal']);
    expect(spans.find((span) => span.kind === 'insert')?.text).toBe('slow');
  });
});

describe('merge3', () => {
  it('merges non-overlapping changes from both sides', () => {
    const base = 'alpha\nbravo\ncharlie\n';
    const ours = 'alpha edited\nbravo\ncharlie\n';
    const theirs = 'alpha\nbravo\ncharlie edited\n';
    const result = merge3({ base, ours, theirs });
    expect(result.conflicts).toBe(0);
    expect(result.text).toBe('alpha edited\nbravo\ncharlie edited\n');
  });

  it('marks conflicting hunks, preferring theirs first', () => {
    const base = 'alpha\nbravo\n';
    const ours = 'alpha ours\nbravo\n';
    const theirs = 'alpha theirs\nbravo\n';
    const result = merge3({ base, ours, theirs });
    expect(result.conflicts).toBe(1);
    expect(result.text).toContain('<<<<<<<');
    expect(result.text).toContain('alpha theirs');
    expect(result.text).toContain('alpha ours');
  });

  it('returns theirs when ours is unchanged from base', () => {
    const base = 'alpha\n';
    const theirs = 'alpha\nbeta\n';
    expect(merge3({ base, ours: base, theirs }).text).toBe(theirs);
  });
});
```

- [ ] **Step 2: Run, verify fails**
- [ ] **Step 3: Implement** — `pnpm add --filter "@dxos/plugin-markdown" --save-catalog "diff"` (already in catalog at `^8.0.3`, so this just adds the package.json entry; verify it reads `"diff": "catalog:"`).

```ts
// src/model/diff.ts
//
// Copyright 2026 DXOS.org
//

import { diffLines, diffWordsWithSpace } from 'diff';

/** Shared diff unit consumed by all three diff renderings (inline, side-by-side, gutter). */
export type DiffSpan = {
  kind: 'equal' | 'insert' | 'delete';
  /** Offset into the AFTER text (for insert/equal) — deletions carry the from-offset where they occurred. */
  from: number;
  to: number;
  text: string;
};

export const diffSpans = (before: string, after: string): DiffSpan[] => {
  const spans: DiffSpan[] = [];
  let offset = 0;
  for (const change of diffWordsWithSpace(before, after)) {
    const kind = change.added ? 'insert' : change.removed ? 'delete' : 'equal';
    const length = kind === 'delete' ? 0 : change.value.length;
    spans.push({ kind, from: offset, to: offset + length, text: change.value });
    offset += length;
  }
  return spans;
};

export type Merge3Props = { base: string; ours: string; theirs: string };
export type Merge3Result = { text: string; conflicts: number };

/**
 * Line-based 3-way merge. Non-overlapping hunks apply automatically; overlapping hunks
 * produce git-style conflict markers with the branch (theirs) side first, since the merge
 * flow is review-then-accept and the branch content is what was just reviewed.
 */
export const merge3 = ({ base, ours, theirs }: Merge3Props): Merge3Result => {
  if (ours === base) {
    return { text: theirs, conflicts: 0 };
  }
  if (theirs === base) {
    return { text: ours, conflicts: 0 };
  }

  const baseLines = splitLines(base);
  const oursLines = splitLines(ours);
  const theirsLines = splitLines(theirs);
  const oursHunks = lineHunks(baseLines, oursLines);
  const theirsHunks = lineHunks(baseLines, theirsLines);

  const out: string[] = [];
  let conflicts = 0;
  let baseIndex = 0;
  let oursCursor = 0;
  let theirsCursor = 0;

  while (baseIndex < baseLines.length || oursCursor < oursHunks.length || theirsCursor < theirsHunks.length) {
    const oursHunk = oursHunks[oursCursor];
    const theirsHunk = theirsHunks[theirsCursor];
    const nextOurs = oursHunk?.baseStart ?? Infinity;
    const nextTheirs = theirsHunk?.baseStart ?? Infinity;
    const next = Math.min(nextOurs, nextTheirs);

    // Copy unchanged base lines up to the next hunk.
    while (baseIndex < Math.min(next, baseLines.length)) {
      out.push(baseLines[baseIndex]);
      baseIndex += 1;
    }
    if (next === Infinity) {
      break;
    }

    const oursActive = oursHunk && oursHunk.baseStart === next;
    const theirsActive = theirsHunk && theirsHunk.baseStart === next;
    const overlap =
      oursActive &&
      theirsActive &&
      !(sameLines(oursHunk.lines, theirsHunk.lines) && oursHunk.baseLength === theirsHunk.baseLength);

    if (overlap) {
      // Conflict: extend both hunk ranges to a common base window before emitting markers.
      const baseEnd = Math.max(next + oursHunk.baseLength, next + theirsHunk.baseLength);
      out.push('<<<<<<< branch', ...theirsHunk.lines, '=======', ...oursHunk.lines, '>>>>>>> current');
      conflicts += 1;
      baseIndex = baseEnd;
      oursCursor += 1;
      theirsCursor += 1;
    } else if (oursActive && theirsActive) {
      // Identical hunks from both sides.
      out.push(...oursHunk.lines);
      baseIndex = next + oursHunk.baseLength;
      oursCursor += 1;
      theirsCursor += 1;
    } else if (oursActive) {
      out.push(...oursHunk.lines);
      baseIndex = next + oursHunk.baseLength;
      oursCursor += 1;
    } else {
      out.push(...theirsHunk.lines);
      baseIndex = next + theirsHunk.baseLength;
      theirsCursor += 1;
    }
  }

  return { text: joinLines(out, base, ours, theirs), conflicts };
};

type Hunk = { baseStart: number; baseLength: number; lines: string[] };

/** Convert jsdiff line changes into base-anchored replacement hunks. */
const lineHunks = (baseLines: string[], sideLines: string[]): Hunk[] => {
  const hunks: Hunk[] = [];
  let baseIndex = 0;
  let pending: Hunk | undefined;
  for (const change of diffLines(baseLines.join('\n'), sideLines.join('\n'))) {
    const lines = splitLines(stripTrailingNewline(change.value));
    if (change.added) {
      pending = pending ?? { baseStart: baseIndex, baseLength: 0, lines: [] };
      pending.lines.push(...lines);
    } else if (change.removed) {
      pending = pending ?? { baseStart: baseIndex, baseLength: 0, lines: [] };
      pending.baseLength += lines.length;
      baseIndex += lines.length;
    } else {
      if (pending) {
        hunks.push(pending);
        pending = undefined;
      }
      baseIndex += lines.length;
    }
  }
  if (pending) {
    hunks.push(pending);
  }
  return hunks;
};

const sameLines = (a: string[], b: string[]) => a.length === b.length && a.every((line, index) => line === b[index]);
const splitLines = (text: string): string[] => (text === '' ? [] : text.split('\n'));
const stripTrailingNewline = (text: string) => (text.endsWith('\n') ? text.slice(0, -1) : text);
const joinLines = (lines: string[], base: string, ours: string, theirs: string) => {
  const text = lines.join('\n');
  // Preserve a trailing newline when every input that is non-empty has one.
  const inputs = [base, ours, theirs].filter((input) => input.length > 0);
  return inputs.length > 0 && inputs.every((input) => input.endsWith('\n')) && text.length > 0 ? `${text}\n` : text;
};
```

This merge is subtle — iterate against the tests until green; add regression tests for every bug found (e.g. hunks at EOF, empty base, adjacent-but-not-overlapping hunks).

- [ ] **Step 4: Run tests until pass**
- [ ] **Step 5: Build + commit** — `plugin-markdown: diff spans and 3-way text merge`

---

### Task 4: Model — branches, restore, merge

**Files:**
- Modify: `src/model/versioning.ts`
- Test: extend `src/model/versioning.test.ts`

- [ ] **Step 1: Write failing tests** (same TestLayer harness as Task 2)

```ts
  it.effect('createBranch forks content at anchor; edits stay isolated', /* harness */
    Effect.fnUntraced(function* (_) {
      const doc = Markdown.make({ name: 'Doc', content: 'one two three' });
      yield* Database.add(doc);
      const root = yield* Database.load(doc.content);

      const branch = createBranch(doc, { name: 'draft' });
      const branchText = yield* Database.load(branch.content);
      expect(branchText.content).toBe('one two three');
      // Fork point auto-checkpointed on the parent.
      expect(doc.history?.versions.some((version) => version.name === 'fork: draft')).toBe(true);

      Obj.update(branchText, () => { branchText.content = 'one two three four'; });
      expect(root.content).toBe('one two three');
    }, /* … */));

  it.effect('mergeBranch applies branch changes to parent as one edit', /* harness */
    Effect.fnUntraced(function* (_) {
      const doc = Markdown.make({ name: 'Doc', content: 'alpha\nbravo\n' });
      yield* Database.add(doc);
      const root = yield* Database.load(doc.content);

      const branch = createBranch(doc, { name: 'draft' });
      const branchText = yield* Database.load(branch.content);
      Obj.update(branchText, () => { branchText.content = 'alpha\nbravo\ncharlie\n'; });
      // Concurrent parent edit after the fork.
      Obj.update(root, () => { root.content = 'alpha edited\nbravo\n'; });

      const result = mergeBranch(doc, branch);
      expect(result.conflicts).toBe(0);
      expect(root.content).toBe('alpha edited\nbravo\ncharlie\n');
      expect(branch.status).toBe('merged');
      expect(doc.history?.versions.some((version) => version.name === 'merge: draft')).toBe(true);
    }, /* … */));

  it.effect('restore applies historical content as a new forward edit', /* harness */
    Effect.fnUntraced(function* (_) {
      const doc = Markdown.make({ name: 'Doc', content: 'first' });
      yield* Database.add(doc);
      const root = yield* Database.load(doc.content);
      const checkpoint = createCheckpoint(doc, { name: 'v1' });
      Obj.update(root, () => { root.content = 'second'; });

      restore(doc, checkpoint);
      expect(root.content).toBe('first');
      // History retained: heads advanced, not rewound.
      expect(Obj.version(root).automergeHeads).not.toEqual(checkpoint.heads);
    }, /* … */));

  it.effect('discardBranch archives without touching parent', /* … */);
```

- [ ] **Step 2: Run, verify fails**
- [ ] **Step 3: Implement** (append to `src/model/versioning.ts`)

```ts
export type CreateBranchProps = { name: string; from?: { target: Text.Text; heads?: readonly string[] }; creator?: string };

export const createBranch = (doc: Markdown.Document, props: CreateBranchProps): Versioning.Branch => {
  const parent = props.from?.target ?? doc.content.target;
  invariant(parent, 'document content not loaded');
  const anchor = props.from?.heads ? [...props.from.heads] : getHeads(parent);
  const baseContent = contentAt(parent, anchor);

  const branchText = Text.make({ content: baseContent });
  const db = Obj.getDatabase(doc);
  invariant(db, 'document not in a database');
  db.add(branchText);
  Obj.setParent(branchText, doc);

  const branch = Versioning.makeBranch({
    name: props.name,
    content: Ref.make(branchText),
    parent: Ref.make(parent),
    anchor,
    ...(props.creator !== undefined && { creator: props.creator }),
  });

  const history = ensureHistory(doc);
  Obj.update(doc, () => {
    history.branches.push(branch);
  });
  // Anchor must stay addressable by name in the timeline.
  if (!history.versions.some((version) => sameHeads(version.heads, anchor))) {
    const version = Versioning.makeVersion({ name: `fork: ${props.name}`, target: Ref.make(parent), heads: anchor });
    Obj.update(doc, () => {
      history.versions.push(version);
    });
  }
  return branch;
};

export const restore = (doc: Markdown.Document, version: Versioning.Version): void => {
  const text = version.target.target;
  invariant(text, 'checkpoint target not loaded');
  const historical = contentAt(text, version.heads);
  Obj.update(text, () => {
    EchoText.update(text, 'content', historical);
  });
};

export type MergeResult = { conflicts: number };

export const mergeBranch = (doc: Markdown.Document, branch: Versioning.Branch): MergeResult => {
  invariant(branch.status === 'active', 'branch is not active');
  const parent = branch.parent.target;
  const branchText = branch.content.target;
  invariant(parent && branchText, 'branch refs not loaded');

  const base = contentAt(parent, branch.anchor);
  const { text, conflicts } = merge3({ base, ours: parent.content, theirs: branchText.content });
  Obj.update(parent, () => {
    EchoText.update(parent, 'content', text);
  });
  Obj.update(doc, () => {
    branch.status = 'merged';
    branch.mergedAt = new Date().toISOString();
  });
  createCheckpoint(doc, { name: `merge: ${branch.name}`, target: parent });
  return { conflicts };
};

export const discardBranch = (doc: Markdown.Document, branch: Versioning.Branch): void => {
  Obj.update(doc, () => {
    branch.status = 'archived';
  });
};

const sameHeads = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((head) => b.includes(head));
```

Add imports: `Text as EchoText` from `@dxos/echo`, `merge3` from `./diff`. NOTE: mutating `branch.status` requires the record to be reactive — embedded structs inside an ECHO object are; if the compiler objects to mutating a `Schema.Struct` type, mark `Branch`/`Version` fields mutable via `Schema.mutable(Schema.Struct({...}))` in Task 1's types.

- [ ] **Step 4: Run tests until pass** (expect iteration around ref loading — `Ref.make` on db-added objects, `branch.content.target` needing `Database.load` in tests first)
- [ ] **Step 5: Build + commit** — `plugin-markdown: branch fork, restore, and 3-way merge model`

---

### Task 5: Operations (agent surface)

**Files:**
- Modify: `src/types/MarkdownOperation.ts`, `src/operations/index.ts`
- Create: `src/operations/create-checkpoint.ts`, `create-branch.ts`, `merge-branch.ts`, `get-history.ts`
- Test: `src/operations/versioning.test.ts`

- [ ] **Step 1: Define operations** in `MarkdownOperation.ts` (follow `Update`'s shape exactly; `services: [Database.Service]`):

```ts
export const CreateCheckpoint = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.markdown.create-checkpoint'),
    name: 'Create Checkpoint',
    description: 'Records a named checkpoint of the current document content that can be viewed or restored later.',
    icon: 'ph--bookmark-simple--regular',
  },
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document).annotations({ description: 'The document to checkpoint.' }),
    name: Schema.String.annotations({ description: 'Checkpoint name.' }),
    message: Schema.optional(Schema.String.annotations({ description: 'Optional description of this checkpoint.' })),
  }),
  output: Schema.Struct({ versionId: Schema.String }),
  services: [Database.Service],
});

export const CreateBranch = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.markdown.create-branch'),
    name: 'Create Branch',
    description: 'Creates a draft branch of the document. Edit the branch with the update operation using the returned branch document id, then merge it back for review.',
    icon: 'ph--git-branch--regular',
  },
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document),
    name: Schema.String.annotations({ description: 'Branch name.' }),
  }),
  output: Schema.Struct({
    branchId: Schema.String,
    /** DXN of the branch Text object; pass to markdown update via its container document. */
    contentId: Schema.String,
  }),
  services: [Database.Service],
});

export const MergeBranch = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.markdown.merge-branch'),
    name: 'Merge Branch',
    description: 'Merges an active branch back into its parent document content (3-way merge; conflicts are marked in the text).',
    icon: 'ph--git-merge--regular',
  },
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document),
    branchId: Schema.String,
  }),
  output: Schema.Struct({ conflicts: Schema.Number, newContent: Schema.String }),
  services: [Database.Service],
});

export const GetHistory = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.markdown.get-history'),
    name: 'Get History',
    description: 'Lists the checkpoints and branches of a document.',
    icon: 'ph--clock-counter-clockwise--regular',
  },
  input: Schema.Struct({ doc: Ref.Ref(Markdown.Document) }),
  output: Schema.Struct({
    versions: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String, createdAt: Schema.String })),
    branches: Schema.Array(
      Schema.Struct({ id: Schema.String, name: Schema.String, status: Schema.String, createdAt: Schema.String }),
    ),
  }),
  services: [Database.Service],
});
```

- [ ] **Step 2: Write failing operation tests** (invoke each via `Operation.invoke` in the update.test.ts harness: checkpoint→branch→edit branch text via `Database.resolve` + `Obj.update`→merge→assert parent content + conflicts=0)
- [ ] **Step 3: Implement handlers** — each mirrors `update-markdown.ts`: load `doc` ref via `Database.load`, load `doc.content` (and for merge, the branch refs) via `Database.load` before calling the sync model, return outputs. `create-branch` handler must `yield* Database.load(doc.content)` first so `doc.content.target` is live. Register all four in `src/operations/index.ts` `OperationHandlerSet.lazy`.
- [ ] **Step 4: Run tests until pass**
- [ ] **Step 5: Build + commit** — `plugin-markdown: versioning operations (checkpoint, branch, merge, history)`

---

### Task 6: Settings — diffView

**Files:**
- Modify: `src/types/Settings.ts`, `src/containers/MarkdownSettings/MarkdownSettings.tsx` (read it first — if it renders fields from the schema automatically, only the schema changes)

- [ ] **Step 1: Add to the `Settings` struct:**

```ts
    diffView: Schema.optional(
      Schema.Union(Schema.Literal('inline'), Schema.Literal('sideBySide'), Schema.Literal('gutter')).annotations({
        title: 'Diff view',
        description: "How document version comparisons are rendered: 'inline' (unified), 'sideBySide', or 'gutter' (change bars).",
      }),
    ),
```

- [ ] **Step 2:** If `MarkdownSettings.tsx` enumerates fields manually, add a select for `diffView` matching the existing select pattern (e.g. `defaultViewMode`). Default resolution at use sites: `settings.diffView ?? 'inline'`.
- [ ] **Step 3: Build + commit** — `plugin-markdown: diffView setting`

---

### Task 7: Versioning view state + hook

**Files:**
- Modify: `src/capabilities/state.ts` (read first — `MarkdownPluginState` currently holds `viewMode` keyed by editor id)
- Create: `src/hooks/useVersioning.ts`; modify `src/hooks/index.ts`

- [ ] **Step 1:** Extend `MarkdownPluginState` with a non-persisted map keyed by document URI (follow how `viewMode` is stored/updated; if `viewMode` is persisted via localStorage, keep versioning selection in-memory only — check how the state atom is constructed):

```ts
export type VersionSelection =
  | { kind: 'current' }
  | { kind: 'branch'; branchId: string }
  | { kind: 'checkpoint'; versionId: string };

export type CompareSelection = { versionId?: string; branchId?: string } | undefined;

// In MarkdownPluginState:
//   versionSelection: Record<string, VersionSelection>;
//   compareSelection: Record<string, CompareSelection>;
```

- [ ] **Step 2:** `useVersioning(document)` hook returning `{ history, selection, setSelection, compare, setCompare, activeBranch, activeText, checkpointContent }`:
  - `history` = `document.history` (subscribe via `useObject(document, 'history')` — verify the exact reactive accessor against how other containers subscribe; `useObject` returns snapshots for reactivity).
  - `activeBranch` = branch record for `selection.kind === 'branch'`.
  - `activeText` = branch's `content.target` (load via `useObject(branch.content)` like `MarkdownArticle.tsx:47`) else root.
  - `checkpointContent` = `contentAt(target, version.heads)` memoized when `selection.kind === 'checkpoint'`.
- [ ] **Step 3: Build + commit** — `plugin-markdown: versioning selection state and hook`

---

### Task 8: Editor wiring — banner, subject swap, checkpoint mode

**Files:**
- Create: `src/components/VersionBanner/VersionBanner.tsx`, `VersionBanner.stories.tsx`, `index.ts`
- Modify: `src/containers/MarkdownArticle/MarkdownArticle.tsx`, `src/components/index.ts`, `src/translations.ts`

- [ ] **Step 1: VersionBanner** — presentational, translation-keyed, no ECHO deps (props-only so the story is trivial):

```tsx
export type VersionBannerProps = ThemedClassName<{
  mode: 'checkpoint' | 'branch';
  name: string;
  detail?: string;
  onRestore?: () => void;
  onBranchFrom?: () => void;
  onMerge?: () => void;
  onCompare?: () => void;
  onClose: () => void;
}>;
```

Layout: single row, `Icon` (`ph--bookmark-simple--regular` / `ph--git-branch--regular`), name + detail text, trailing `Button` group (variant ghost, density fine). Use theme tokens only (`composer-ui` skill; no invented colors — use `bg-attention`-style tokens found in existing banners; search for an existing banner/callout primitive in `@dxos/react-ui` first and reuse it if present). Story: `withTheme()` decorator called with parens, `parameters: { translations }`.

- [ ] **Step 2: MarkdownArticle wiring** — in the `Container` in `capabilities/react-surface.tsx` (or `MarkdownArticle` itself; choose the container so `MarkdownArticle` stays prop-driven):
  - Call `useVersioning(object)` when subject is a `Markdown.Document`.
  - `selection.kind === 'branch'` → pass the branch **Text** object as `subject` to `MarkdownArticle` (Text is already a first-class subject; see `surface.text`), keep the Document for banner context.
  - `selection.kind === 'checkpoint'` → pass `object` but with `viewMode='readonly'` forced and subject replaced by the plain `{ id, text }` DocumentType variant (`useExtensions.ts:49`) carrying `checkpointContent` — this renders read-only content with NO automerge accessor.
  - Render `VersionBanner` between `Panel.Toolbar` and `Panel.Content` (requires a slot: add an optional `banner?: ReactNode` prop to `MarkdownArticle` rendered above `Panel.Content`).
- [ ] **Step 3: Translations** — add under `meta.profile.key`: `version-banner-checkpoint.label`, `version-banner-branch.label`, `restore.label`, `branch-from.label`, `merge.label`, `compare.label`, `close.label`, plus panel strings used later (`history-panel.title`, `branches.title`, `checkpoints.title`, `create-checkpoint.label`, `create-branch.label`, `discard-branch.label`, `current.label`).
- [ ] **Step 4: Verify in storybook** — `moon run storybook-react:serve` from THIS worktree on a free port (e.g. 9010, not 9009 — check for squatters), open the VersionBanner story with the browser tools, check console for errors, screenshot to `./temp/`.
- [ ] **Step 5: Build + commit** — `plugin-markdown: version banner and editor time-travel wiring`

---

### Task 9: Diff extensions (inline + gutter) and DiffView (side-by-side)

**Files:**
- Create: `src/extensions/version-diff.ts`, `src/containers/DiffView/{DiffView.tsx,DiffView.stories.tsx,index.ts}`
- Modify: `pnpm-workspace.yaml` (catalog `@codemirror/merge`), `package.json`, MarkdownArticle wiring, `src/containers/index.ts`

- [ ] **Step 1: `version-diff.ts`** — model → CodeMirror. Read `packages/ui/ui-editor/src/extensions/comments.ts` for the StateField/Decoration idiom. Exports:

```ts
export type VersionDiffConfig = { spans: DiffSpan[]; variant: 'inline' | 'gutter' };
export const versionDiff = (config: VersionDiffConfig): Extension => { /* ... */ };
```

  - `inline`: `Decoration.mark({ class: 'cm-version-insert' })` over insert spans; `Decoration.widget` rendering deleted text with `cm-version-delete` (line-through) at delete offsets. Define classes via `EditorView.baseTheme` with theme tokens (`--dx-*` vars used elsewhere in ui-editor themes — copy the pattern from comments.ts theme).
  - `gutter`: `gutter()` + `GutterMarker` subclass emitting a 3px colored bar per changed line (insert=green token, delete=red token, both=amber token).
- [ ] **Step 2: side-by-side** — `pnpm add --filter "@dxos/plugin-markdown" --save-catalog "@codemirror/merge"`. `DiffView.tsx`: renders a read-only `MergeView` (from `@codemirror/merge`) with `a` = base content, `b` = branch content, using the repo's editor theme extension (find how stories create a themed bare EditorView — `packages/ui/react-ui-editor` exports the base theme/useTextEditor; reuse rather than hand-rolling). Props: `{ before: string; after: string }` only.
- [ ] **Step 3: Compare wiring** — in the container: when `compare` is set and setting is `inline`/`gutter`, append `versionDiff({ spans: diffSpans(base, current), variant })` to the `extensions` array passed to `MarkdownArticle` (compare targets: branch→base = `contentAt(parent, branch.anchor)` vs branch text; checkpoint compare = checkpoint content vs current). When `sideBySide`, render `DiffView` INSTEAD of `MarkdownEditor.Content` (conditional in `MarkdownArticle` via a `diff?: { before: string; after: string }` prop).
- [ ] **Step 4: Stories** for both (fixture texts with insertions/deletions/moves); verify rendering + console in the worktree storybook; screenshot each variant to `./temp/`.
- [ ] **Step 5: Build + commit** — `plugin-markdown: diff renderings (inline, gutter, side-by-side)`

---

### Task 10: DocumentHistory companion panel

**Files:**
- Create: `src/containers/DocumentHistory/{DocumentHistory.tsx,DocumentHistory.stories.tsx,index.ts}`, `src/capabilities/app-graph-builder.ts`
- Modify: `src/capabilities/{index.ts,react-surface.tsx}`, `src/MarkdownPlugin.tsx`, `src/containers/index.ts`

- [ ] **Step 1: Companion node** — `app-graph-builder.ts` modeled on plugin-thread's `channelChatCompanion` but unconditional:

```ts
GraphBuilder.createTypeExtension({
  id: 'documentHistoryCompanion',
  type: Markdown.Document,
  connector: (document) =>
    Effect.succeed([
      AppNode.makeCompanion({
        id: 'history',
        label: ['history-panel.title', { ns: meta.profile.key }],
        icon: 'ph--git-branch--regular',
        data: 'history',
      }),
    ]),
}),
```

Register in `MarkdownPlugin.tsx` with `Plugin.addModule({ activatesOn: AppActivationEvents.AppGraphReady, activate: AppGraphBuilder })` (match the AnchorSort module registration; capability lazy-export in `capabilities/index.ts`).

- [ ] **Step 2: Surface** — in `react-surface.tsx` add (plugin-thread `react-surface.tsx:27` pattern):

```ts
Surface.create({
  id: 'companion.documentHistory',
  filter: AppSurface.allOf(
    AppSurface.literal(AppSurface.Article, 'history'),
    AppSurface.companion(AppSurface.Article, Markdown.Document),
  ),
  component: ({ data, role, ref }) => (
    <DocumentHistory role={role} subject={data.companionTo} ref={ref as React.Ref<HTMLDivElement>} />
  ),
}),
```

- [ ] **Step 3: DocumentHistory container** — layout per approved mock (Screen 2A): `Panel.Root` → `Panel.Toolbar` (current-selection label + actions: new checkpoint [prompt for name via `Input` inline row or the existing naming pattern — search for an inline-create affordance in composer lists and copy it], new branch, merge when a branch is selected) → `Panel.Content` with two sections:
  - **Branches**: root row ("main", `current` chip when selected) + indented active branches (`List` from `@dxos/react-ui`, `ph--git-branch--regular` rows, `+N −M` summary from `diffSpans` counts, relative time). Click → `setSelection({ kind: 'branch', branchId })` (root row → `{ kind: 'current' }`). Row secondary actions (`ph--dots-three--regular` menu): merge, compare, discard.
  - **Checkpoints**: timeline for the selected branch's target Text (filter `versions` by `target` id), newest first, `ph--bookmark-simple--regular` rows; "Now" pseudo-row on top. Click → `setSelection({ kind: 'checkpoint', versionId })`.
  - All labels through `useTranslation(meta.profile.key)`. Selection state via `useVersioning` (shared keyed state, so panel and editor stay in sync).
- [ ] **Step 4: Story** — in-memory `Markdown.make` document with a seeded history fixture (2 branches, 3 checkpoints); `withTheme()` + translations. Verify in worktree storybook + console clean + screenshot.
- [ ] **Step 5: Build + commit** — `plugin-markdown: document history companion panel`

---

### Task 11: ObjectProperties section

**Files:**
- Create: `src/containers/MarkdownProperties/{MarkdownProperties.tsx,MarkdownProperties.stories.tsx,index.ts}`
- Modify: `src/capabilities/react-surface.tsx`, `src/containers/index.ts`

- [ ] **Step 1:** Component per mock Screen 1C (plugin-script pattern — bare `<Form.Section>` children):

```tsx
export type MarkdownPropertiesProps = AppSurface.ObjectPropertiesProps<Markdown.Document>;

export const MarkdownProperties = ({ subject: document }: MarkdownPropertiesProps) => {
  // Row: current selection name + "N branches · M checkpoints"; buttons: create checkpoint, open history tab.
};
```

"Open history" invokes the layout operation that opens the companion — find how an existing plugin deep-links a companion tab (search `LayoutOperation.Open` usages with companion variants, e.g. plugin-thread opening comments); if none exists cleanly, drop the button and keep counts + create-checkpoint (YAGNI).

- [ ] **Step 2: Register surface:**

```ts
Surface.create({
  id: 'surface.objectProperties',
  filter: AppSurface.object(AppSurface.ObjectProperties, Markdown.Document),
  component: ({ data, role }) => <MarkdownProperties role={role} subject={data.subject} />,
}),
```

- [ ] **Step 3: Story; verify; build + commit** — `plugin-markdown: versions section in object properties`

---

### Task 12: Toolbar switcher

**Files:**
- Modify: `src/containers/MarkdownArticle/MarkdownArticle.tsx` (or the container in react-surface.tsx where versioning state lives)

- [ ] **Step 1:** Add a versions dropdown to the editor toolbar via the existing `customActions` atom (`MarkdownArticle.tsx:74` composes graph actions — compose additional menu actions with `useMenuActions`/menu builder per the `feedback_toolbar_menu_actions` memory and `composer-ui` skill): menu lists `main` + active branches (check = current selection) + `New branch…`. Selecting switches `setSelection`; New branch prompts name then `createBranch`.
- [ ] **Step 2:** Verify in storybook (MarkdownArticle story with seeded history), console clean, screenshot. If composing into `customActions` fights the graph-actions atom, fall back to rendering the switcher as a sibling `Menu.Root` inside the same `Panel.Toolbar` — do not hack the atom.
- [ ] **Step 3: Build + commit** — `plugin-markdown: branch switcher in editor toolbar`

---

### Task 13: Integration pass, gates, PR prep

- [ ] **Step 1: Full-package gates** — `moon run plugin-markdown:build plugin-markdown:test plugin-markdown:lint`, then `pnpm format`. Fix everything at the root cause (no casts).
- [ ] **Step 2: Cast audit** — `git diff main -- packages/plugins/plugin-markdown | grep -nE 'as any|as unknown|[a-zA-Z)\]]!(\.|\)|,|;)'` and remove offenders.
- [ ] **Step 3: Dependent builds** — `moon exec --on-failure continue --quiet :build` (or at minimum build composer-app) to catch downstream type breaks from the Document schema change.
- [ ] **Step 4: Changeset** — per `agents/instructions/changesets.md`: `.changeset/*.md` naming `@dxos/plugin-markdown` (minor — new feature), summary of checkpoints/branches/merge + diffView setting.
- [ ] **Step 5: Storybook smoke** — run worktree storybook, open DocumentHistory + MarkdownArticle + DiffView stories, `read_console_messages` for errors, screenshots to `./temp/`.
- [ ] **Step 6: Commit remaining work; `git status` must be clean or all files accounted for.** Do NOT push or open a PR — the user reviews first (they asked to be left with the built project, not a submitted PR). Write a session summary + $hydrate-style checkpoint into the project docs if a registry entry exists.

---

## Self-review notes

- Spec coverage: schema (T1), model+merge (T2–4), operations (T5), setting (T6), state (T7), banner/time-travel (T8), 3 diff variants (T9), companion (T10), ObjectProperties (T11), toolbar (T12), gates/changeset (T13). Phase-2 is documentation only (DESIGN.md, done).
- Deliberate deferrals (documented, not placeholders): exact reactive-subscription calls and toolbar-menu composition are pattern-matched from named files at implementation time; the plan pins the files and the fallback behavior.
- Type consistency: `Versioning.History` field names (`branches`, `versions`) and `VersionSelection` kinds are used identically across tasks; `merge3` signature `{ base, ours, theirs }` matches T4 usage.
