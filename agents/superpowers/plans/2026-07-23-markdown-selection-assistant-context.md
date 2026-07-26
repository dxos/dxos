# Markdown Selection → Assistant Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The companion Assistant chat sees the markdown editor's current text selection as per-request context, via a normalized typename-keyed `AnchorResolver` capability shared with plugin-comments.

**Architecture:** plugin-markdown already publishes cursor-range selections to the well-known `Selection.aspect` view-state (no publish-side changes). A new `AppCapabilities.AnchorResolver` (neutral ground, `@dxos/app-toolkit`) resolves anchor strings to text per typename; markdown contributes it, comments switches to it (replacing `CommentConfig.getAnchorLabel`), and the assistant uses it at chat-submit time to build a synthetic `ContentBlock` prepended to the prompt.

**Tech Stack:** TypeScript, Effect, ECHO/Automerge cursors, moon/vitest.

**Spec:** `agents/superpowers/specs/2026-07-23-markdown-selection-assistant-context-design.md`

## Global Constraints

- Worktree: `/Users/burdon/Code/dxos/dxos/.claude/worktrees/markdown-selection-assistant-visibility-833995` — all paths below are relative to it; Write/Edit must use absolute paths prefixed with it. Run all moon/pnpm commands from the worktree root (`pwd` first).
- Branch `claude/markdown-selection-assistant-visibility-833995`; never create branches/worktrees.
- No casts (`as any`, `as unknown as T`, non-null `!`); `as const` fine. Type predicates fine.
- Comments state _why_ in one load-bearing clause, ending with a period. No history narration.
- No compatibility re-exports/shims — every call site migrates in the same change.
- Workspace deps added as `workspace:*` via `pnpm add --filter "<pkg>" "@dxos/<dep>@workspace:*"`.
- Before every commit: `git status` (account for all files, including the user's), and run `pnpm format` and stage the result.
- Test one file: `pnpm --filter <pkg> exec vitest run --project=node <file>` (NOT `moon run :test -- <file>` — that runs the whole suite).
- Build one package: `moon run <package>:build`. Ignore the `DEPOT_TOKEN` warning.
- Commit messages: `scope: description`, ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: `Selection.toAnchors` (react-ui-attention)

**Files:**

- Modify: `packages/ui/react-ui-attention/src/types/Selection.ts`
- Test: `packages/ui/react-ui-attention/src/types/Selection.test.ts`

**Interfaces:**

- Produces: `Selection.toAnchors(selection: Selection | undefined): string[]` — anchor strings: `id`s for single/multi modes, `"${from}:${to}"` for range/multi-range. Imported later as `Selection.toAnchors` from `@dxos/react-ui-attention` (Task 7).

- [ ] **Step 1: Write the failing tests**

Append to the existing `describe` block in `packages/ui/react-ui-attention/src/types/Selection.test.ts` (match the file's existing import style — it already imports from `./Selection`):

```ts
describe('toAnchors', () => {
  test('undefined selection yields no anchors', ({ expect }) => {
    expect(Selection.toAnchors(undefined)).toEqual([]);
  });

  test('single mode yields the id when set', ({ expect }) => {
    expect(Selection.toAnchors({ mode: 'single', id: 'a' })).toEqual(['a']);
    expect(Selection.toAnchors({ mode: 'single' })).toEqual([]);
  });

  test('multi mode yields all ids', ({ expect }) => {
    expect(Selection.toAnchors({ mode: 'multi', ids: ['a', 'b'] })).toEqual(['a', 'b']);
  });

  test('range mode yields a cursor-pair anchor when complete', ({ expect }) => {
    expect(Selection.toAnchors({ mode: 'range', from: 'x', to: 'y' })).toEqual(['x:y']);
    expect(Selection.toAnchors({ mode: 'range', from: 'x' })).toEqual([]);
  });

  test('multi-range mode yields one anchor per range', ({ expect }) => {
    expect(
      Selection.toAnchors({
        mode: 'multi-range',
        ranges: [
          { from: 'a', to: 'b' },
          { from: 'c', to: 'd' },
        ],
      }),
    ).toEqual(['a:b', 'c:d']);
  });
});
```

Note: first read `Selection.test.ts` to see whether it imports `* as Selection` or named exports, and whether tests use `test('...', ({ expect }) => ...)` (vitest fixture style) or a top-level `expect` import — mirror exactly.

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter react-ui-attention exec vitest run --project=node src/types/Selection.test.ts
```

Expected: FAIL — `toAnchors` is not exported.

- [ ] **Step 3: Implement `toAnchors`**

Append to `packages/ui/react-ui-attention/src/types/Selection.ts` (after `toggle`, before `getValue`):

```ts
/** Anchor strings for a selection: ids for single/multi modes, `"${from}:${to}"` cursor pairs for range modes. */
export const toAnchors = (selection: Selection | undefined): string[] =>
  selection == null
    ? []
    : Match.type<Selection>().pipe(
        Match.when({ mode: 'single' }, (value) => (value.id ? [value.id] : [])),
        Match.when({ mode: 'multi' }, (value) => [...value.ids]),
        Match.when({ mode: 'range' }, (value) => (value.from && value.to ? [`${value.from}:${value.to}`] : [])),
        Match.when({ mode: 'multi-range' }, (value) => value.ranges.map((range) => `${range.from}:${range.to}`)),
        Match.exhaustive,
      )(selection);
```

(`Match` is already imported in this file.)

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter react-ui-attention exec vitest run --project=node src/types/Selection.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/react-ui-attention/src/types/Selection.ts packages/ui/react-ui-attention/src/types/Selection.test.ts
git commit -m "react-ui-attention: Selection.toAnchors selection→anchor normalization"
```

---

### Task 2: `AnchorResolver` capability (app-toolkit) + `getTextInAnchorRange` (echo-client)

**Files:**

- Modify: `packages/sdk/app-toolkit/src/app-framework/AppCapabilities.ts` (after the `AnchorSort` block, ~line 246)
- Modify: `packages/core/echo/echo-client/src/text.ts`

**Interfaces:**

- Produces: `AppCapabilities.AnchorResolver` — `{ key: string; getText: (obj: any, anchor: string) => string | undefined }` capability, id `org.dxos.app-framework.capability.anchorResolver`. Consumed in Tasks 3, 4, 7.
- Produces: `getTextInAnchorRange(accessor: Doc.Accessor, anchor: string): string | undefined` exported from `@dxos/echo-client` (barrel already re-exports `./text`). Consumed in Task 3.

- [ ] **Step 1: Add the capability**

In `packages/sdk/app-toolkit/src/app-framework/AppCapabilities.ts`, directly after the `AnchorSort` capability declaration:

```ts
/** Anchor→text resolution contributed per typename by plugins whose objects support cursor-range anchors. */
export type AnchorResolver = Readonly<{
  key: string;
  /** Resolve an anchor (`"${fromCursor}:${toCursor}"`) to the text it spans, or `undefined` when unresolvable. */
  getText: (obj: any, anchor: string) => string | undefined;
}>;

/**
 * @category Capability
 */
export const AnchorResolver = Capability$.make<AnchorResolver>('org.dxos.app-framework.capability.anchorResolver');
```

(`obj: any` mirrors the neighboring `CommentConfig.getAnchorLabel` / `TextContent.getTextContent` signatures.)

- [ ] **Step 2: Add the anchor-range helper**

In `packages/core/echo/echo-client/src/text.ts`, after `getTextInRange`:

```ts
/** Return the text spanned by an anchor string (`"${fromCursor}:${toCursor}"`). */
export const getTextInAnchorRange = (accessor: Doc.Accessor, anchor: string): string | undefined => {
  const [start, end] = anchor.split(':');
  if (start === undefined || end === undefined) {
    return undefined;
  }
  return getTextInRange(accessor, start, end);
};
```

(Same `split(':')` convention as the existing `getRangeFromCursor` below it. Tested via Task 3's resolver test, which exercises it against a real Automerge doc.)

- [ ] **Step 3: Build both packages**

```bash
moon run app-toolkit:build echo-client:build
```

Expected: green (DEPOT_TOKEN warning is noise).

- [ ] **Step 4: Commit**

```bash
git add packages/sdk/app-toolkit/src/app-framework/AppCapabilities.ts packages/core/echo/echo-client/src/text.ts
git commit -m "app-toolkit: AnchorResolver capability; echo-client: getTextInAnchorRange"
```

---

### Task 3: markdown contributes `AnchorResolver`

**Files:**

- Create: `packages/plugins/plugin-markdown/src/capabilities/anchor-resolver.ts`
- Test: `packages/plugins/plugin-markdown/src/capabilities/anchor-resolver.test.ts`
- Modify: `packages/plugins/plugin-markdown/src/capabilities/index.ts`
- Modify: `packages/plugins/plugin-markdown/src/MarkdownPlugin.tsx`

**Interfaces:**

- Consumes: `AppCapabilities.AnchorResolver`, `getTextInAnchorRange` (Task 2).
- Produces: `getMarkdownAnchorText(doc: Markdown.Document, anchor: string): string | undefined` (exported for tests) and the contributed capability keyed by `Type.getTypename(Markdown.Document)`.

- [ ] **Step 1: Write the failing test**

Create `packages/plugins/plugin-markdown/src/capabilities/anchor-resolver.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { toCursorRange } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Doc } from '@dxos/echo-doc';
import { Text } from '@dxos/schema';

import { Markdown } from '#types';

import { getMarkdownAnchorText } from './anchor-resolver';

describe('getMarkdownAnchorText', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async (content: string) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Markdown.Document, Text.Text]);
    const doc = db.add(Markdown.make({ name: 'doc', content }));
    const target = await doc.content.load();
    return { doc, accessor: Doc.createAccessor(target, ['content']) };
  };

  test('resolves an anchor to the spanned text', async ({ expect }) => {
    const { doc, accessor } = await setup('hello brave world');
    const anchor = toCursorRange(accessor, 6, 11);
    expect(getMarkdownAnchorText(doc, anchor)).toBe('brave');
  });

  test('returns undefined for a malformed anchor', async ({ expect }) => {
    const { doc } = await setup('hello');
    expect(getMarkdownAnchorText(doc, 'not-an-anchor')).toBeUndefined();
  });
});
```

Adjust mechanics to the package's conventions if the first run reveals drift (e.g. `Markdown.make` signature — check `packages/plugins/plugin-markdown/src/operations/accept-change.test.ts` which uses `Markdown.make({ name: 'Doc', content: '...' })` and `doc.content.load()` appears throughout the package).

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter plugin-markdown exec vitest run --project=node src/capabilities/anchor-resolver.test.ts
```

Expected: FAIL — `./anchor-resolver` does not exist.

- [ ] **Step 3: Implement the resolver capability**

Create `packages/plugins/plugin-markdown/src/capabilities/anchor-resolver.ts` (mirrors `anchor-sort.ts`):

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';
import { getTextInAnchorRange } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';

import { Markdown } from '#types';

/** Resolve an anchor against the document's loaded text content; `undefined` while the ref is unloaded. */
export const getMarkdownAnchorText = (doc: Markdown.Document, anchor: string): string | undefined => {
  const target = doc.content?.target;
  if (!target) {
    return undefined;
  }
  return getTextInAnchorRange(Doc.createAccessor(target, ['content']), anchor);
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(AppCapabilities.AnchorResolver, {
      key: Type.getTypename(Markdown.Document),
      getText: getMarkdownAnchorText,
    }),
  ),
);
```

Note: `db.add` + `content.load()` in the test resolves `doc.content.target` synchronously thereafter, so `getMarkdownAnchorText` sees a loaded target. If `Type.getTypename` returns `string | undefined` and the contribution rejects it, mirror exactly how `anchor-sort.ts` handles the same expression (it passes it directly as `key`).

- [ ] **Step 4: Register the module**

In `packages/plugins/plugin-markdown/src/capabilities/index.ts`, after the `AnchorSort` line:

```ts
export const AnchorResolver = Capability.lazy('AnchorResolver', () => import('./anchor-resolver'));
```

In `packages/plugins/plugin-markdown/src/MarkdownPlugin.tsx`: add `AnchorResolver` to the `#capabilities` import list, and after the existing `AnchorSort` module registration add:

```ts
  Plugin.addModule({
    activatesOn: AppActivationEvents.AppGraphReady,
    activate: AnchorResolver,
  }),
```

- [ ] **Step 5: Run test to verify it passes, then build**

```bash
pnpm --filter plugin-markdown exec vitest run --project=node src/capabilities/anchor-resolver.test.ts
```

Expected: PASS.

```bash
moon run plugin-markdown:build
```

Expected: green.

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-markdown/src/capabilities/anchor-resolver.ts packages/plugins/plugin-markdown/src/capabilities/anchor-resolver.test.ts packages/plugins/plugin-markdown/src/capabilities/index.ts packages/plugins/plugin-markdown/src/MarkdownPlugin.tsx
git commit -m "plugin-markdown: contribute AnchorResolver capability"
```

---

### Task 4: comments consume `AnchorResolver`; drop `getAnchorLabel`

**Files:**

- Modify: `packages/plugins/plugin-comments/src/capabilities/app-graph-builder.ts:35,98-103`
- Modify: `packages/plugins/plugin-markdown/src/capabilities/comment-config.ts`
- Modify: `packages/sdk/app-toolkit/src/app-framework/AppCapabilities.ts:264`

**Interfaces:**

- Consumes: `AppCapabilities.AnchorResolver` (Tasks 2–3).
- Produces: `CommentConfig` type without `getAnchorLabel` (final shape: `{ id, comments, selectionMode?, scrollToAnchor? }`).

- [ ] **Step 1: Switch the consumer**

In `packages/plugins/plugin-comments/src/capabilities/app-graph-builder.ts`, next to the existing `getCommentConfig` helper (line 35) add:

```ts
const getAnchorResolver = (typename: string) =>
  capabilities.getAll(AppCapabilities.AnchorResolver).find(({ key }) => key === typename);
```

Then in the `comment` action (lines 96–105), replace the label derivation: the current code reads

```ts
// Fallback (non-editor objects): anchor to the current selection, or create an
// unanchored thread. Only derive a label from a real cursor anchor — the unanchored
// placeholder is not a cursor range and would throw in `getAnchorLabel`.
const selection = viewState.get(Selection.aspect, objectUri);
const cursorAnchor = config.comments === 'anchored' ? getAnchor(selection) : undefined;
yield *
  Operation.invoke(CommentOperation.Create, {
    anchor: cursorAnchor ?? Date.now().toString(),
    name: cursorAnchor ? config.getAnchorLabel?.(object, cursorAnchor) : undefined,
    subject: object,
  });
```

becomes

```ts
// Fallback (non-editor objects): anchor to the current selection, or create an
// unanchored thread. Only derive a label from a real cursor anchor — the unanchored
// placeholder is not a cursor range the resolver could span.
const selection = viewState.get(Selection.aspect, objectUri);
const cursorAnchor = config.comments === 'anchored' ? getAnchor(selection) : undefined;
yield *
  Operation.invoke(CommentOperation.Create, {
    anchor: cursorAnchor ?? Date.now().toString(),
    name: cursorAnchor && typename ? getAnchorResolver(typename)?.getText(object, cursorAnchor) : undefined,
    subject: object,
  });
```

(`typename` is already in scope from line 79; it is `string | undefined`.)

- [ ] **Step 2: Remove `getAnchorLabel` from markdown's contribution**

In `packages/plugins/plugin-markdown/src/capabilities/comment-config.ts`: delete the `getAnchorLabel` property (lines 21–28), then delete the now-unused imports `getTextInRange` (`@dxos/echo-client`) and `Doc` (`@dxos/echo-doc`), and the `// TODO(burdon): Wrap this.` goes with it. Resulting config:

```ts
const config: AppCapabilities.CommentConfig = {
  id: Type.getTypename(Markdown.Document),
  comments: 'anchored',
  selectionMode: 'multi-range',
  scrollToAnchor: MarkdownOperation.ScrollToAnchor,
};
```

- [ ] **Step 3: Remove the field from the type**

In `packages/sdk/app-toolkit/src/app-framework/AppCapabilities.ts`, delete the line

```ts
  getAnchorLabel?: (obj: any, anchor: string) => string | undefined;
```

from `CommentConfig`.

- [ ] **Step 4: Verify nothing else references it, then build**

```bash
grep -rn "getAnchorLabel" packages --include="*.ts" --include="*.tsx"
```

Expected: no matches outside `dist/` artifacts.

```bash
moon run app-toolkit:build plugin-markdown:build plugin-comments:build
```

Expected: green.

- [ ] **Step 5: Run comments + markdown tests**

```bash
pnpm --filter plugin-comments exec vitest run --project=node
pnpm --filter plugin-markdown exec vitest run --project=node src/capabilities/anchor-resolver.test.ts
```

Expected: PASS (comments suite is small; if any test stubs `CommentConfig` with `getAnchorLabel`, delete the stub field).

- [ ] **Step 6: Commit**

```bash
git add -A packages/plugins/plugin-comments packages/plugins/plugin-markdown/src/capabilities/comment-config.ts packages/sdk/app-toolkit/src/app-framework/AppCapabilities.ts
git commit -m "plugin-comments: resolve anchor labels via AnchorResolver, drop CommentConfig.getAnchorLabel"
```

---

### Task 5: widen `submitPrompt` to accept content blocks

**Files:**

- Modify: `packages/core/compute/compute/src/AgentService.ts:57`
- Modify: `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts:235`
- Modify: `packages/core/compute/agent-runtime/src/agent-service/agent-process.ts:81,198-206`
- Modify: `packages/core/compute/compute/package.json` (add `@dxos/types`)

**Interfaces:**

- Produces: `Session.submitPrompt(prompt: string | ContentBlock.Any[])` — consumed by Task 6. String behaves exactly as before; a block array is enqueued verbatim as the turn's prompt content.

- [ ] **Step 1: Add the `@dxos/types` dependency to `@dxos/compute`**

```bash
pnpm add --filter "@dxos/compute" "@dxos/types@workspace:*"
```

(Regular dependency, `workspace:*` per repo rule. Verify `package.json` afterward.)

- [ ] **Step 2: Widen the interface**

In `packages/core/compute/compute/src/AgentService.ts`: add `import type { ContentBlock } from '@dxos/types';` to the imports, and change

```ts
submitPrompt: (prompt: string) => Effect.Effect<void>;
```

to

```ts
/** Submit a turn: a plain user prompt, or pre-built content blocks (e.g. synthetic context + prompt). */
submitPrompt: (prompt: string | ContentBlock.Any[]) => Effect.Effect<void>;
```

- [ ] **Step 3: Widen the implementation and process input schema**

In `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts` line 235, update the param type:

```ts
  submitPrompt: (prompt: string | ContentBlock.Any[]) => process.submitInput(prompt),
```

(add `import { ContentBlock } from '@dxos/types';` — check whether the file already imports from `@dxos/types` and merge.)

In `packages/core/compute/agent-runtime/src/agent-service/agent-process.ts`:

Line 81, the process input schema (durable queue entries: the union keeps previously persisted string inputs decodable):

```ts
      input: Schema.Union(Schema.String, Schema.Array(ContentBlock.Any)),
```

Lines 198–206, `onInput`:

```ts
          onInput: Effect.fnUntraced(function* (prompt: string | readonly ContentBlock.Any[]) {
            log('agent onInput received', { backlog: inputQueue.length });
            const content = typeof prompt === 'string' ? [ContentBlock.Text.make({ text: prompt })] : [...prompt];
            inputQueue.push({ _tag: 'prompt', content });
            log('agent onInput persisting queue', { depth: inputQueue.length });
            yield* AgentEventsCell.set(inputQueue);
            log('agent onInput persisted', { depth: inputQueue.length });
            alarmManager.reconcile(true);
            log('agent onInput alarm scheduled');
          }),
```

(`ContentBlock` is already imported in this file. `Schema.Array` yields a readonly element type — hence the `readonly` in the param and the spread copy, which the existing code already does for prompt events at line 242.)

- [ ] **Step 4: Build the chain**

```bash
moon run compute:build agent-runtime:build
```

Expected: green. If the exact moon project names differ, find them with `grep -m1 "^id:\|^project:" packages/core/compute/compute/moon.yml packages/core/compute/agent-runtime/moon.yml` or check `package.json` `name` fields and use `moon run <name>:build`.

- [ ] **Step 5: Run agent-service tests**

```bash
pnpm --filter @dxos/agent-runtime exec vitest run --project=node src/agent-service/AgentService.test.ts
```

Expected: PASS (all existing calls pass strings — unchanged behavior). This suite uses memoized LLM fixtures; if it fails with "No memoized conversation found", that is pre-existing infrastructure, not this change — verify by `git stash && rerun`, and if it fails identically report it and move on.

- [ ] **Step 6: Commit**

```bash
git add packages/core/compute/compute packages/core/compute/agent-runtime pnpm-lock.yaml
git commit -m "compute: submitPrompt accepts prepared content blocks"
```

---

### Task 6: processor request context → synthetic prompt block

**Files:**

- Create: `packages/plugins/plugin-assistant/src/processor/prompt.ts`
- Test: `packages/plugins/plugin-assistant/src/processor/prompt.test.ts`
- Modify: `packages/plugins/plugin-assistant/src/processor/processor.ts:84-87,304`
- Modify: `packages/plugins/plugin-assistant/src/processor/index.ts` (if it exists — re-export `prompt.ts` types alongside the processor; otherwise export from wherever `ProcessorRequest` is re-exported)

**Interfaces:**

- Consumes: `Session.submitPrompt(string | ContentBlock.Any[])` (Task 5).
- Produces: `ProcessorRequestContext = { selection?: { anchors: string[]; text: string } }`; `createPromptContent(request: { message: string; context?: ProcessorRequestContext }): string | ContentBlock.Any[]`; `ProcessorRequest` gains `context?: ProcessorRequestContext`. Consumed by Task 7.

- [ ] **Step 1: Write the failing test**

Create `packages/plugins/plugin-assistant/src/processor/prompt.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createPromptContent } from './prompt';

describe('createPromptContent', () => {
  test('returns the bare message when there is no context', ({ expect }) => {
    expect(createPromptContent({ message: 'hello' })).toBe('hello');
    expect(createPromptContent({ message: 'hello', context: {} })).toBe('hello');
  });

  test('prepends a synthetic selection block before the user prompt', ({ expect }) => {
    const content = createPromptContent({
      message: 'Summarize this.',
      context: { selection: { anchors: ['a:b'], text: 'lorem ipsum' } },
    });
    if (typeof content === 'string') {
      throw new Error('expected content blocks');
    }
    expect(content).toHaveLength(2);
    expect(content[0]._tag).toBe('text');
    expect(content[0].disposition).toBe('synthetic');
    expect(content[0].text).toContain('lorem ipsum');
    expect(content[1].disposition).toBeUndefined();
    expect(content[1].text).toBe('Summarize this.');
  });

  test('empty selection text falls back to the bare message', ({ expect }) => {
    expect(createPromptContent({ message: 'hi', context: { selection: { anchors: [], text: '' } } })).toBe('hi');
  });
});
```

If narrowing `content[0]` from `ContentBlock.Any` to the text variant is needed for `.text`/`.disposition` access, guard with `if (content[0]._tag !== 'text') throw new Error(...)` — no casts.

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter plugin-assistant exec vitest run --project=node src/processor/prompt.test.ts
```

Expected: FAIL — `./prompt` does not exist.

- [ ] **Step 3: Implement `prompt.ts`**

Create `packages/plugins/plugin-assistant/src/processor/prompt.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { ContentBlock } from '@dxos/types';
import { trim } from '@dxos/util';

/** Ephemeral, per-request context captured at submit time (not part of the durable chat state). */
export type ProcessorRequestContext = {
  selection?: {
    /** Anchor strings (`"${from}:${to}"` cursor pairs) the text was resolved from; enables future in-place actions. */
    anchors: string[];
    text: string;
  };
};

/**
 * Prompt content for a request: the bare message, or — when the request carries selection context —
 * a synthetic block (system-generated user-turn content, hidden from the summary view) ahead of it.
 */
export const createPromptContent = (request: {
  message: string;
  context?: ProcessorRequestContext;
}): string | ContentBlock.Any[] => {
  const selection = request.context?.selection;
  if (!selection?.text.length) {
    return request.message;
  }

  return [
    ContentBlock.Text.make({
      disposition: 'synthetic',
      text: trim`
        The user's current selection in the document they are viewing:
        <selection>
        ${selection.text}
        </selection>
      `,
    }),
    ContentBlock.Text.make({ text: request.message }),
  ];
};
```

(Verify `@dxos/util` is in plugin-assistant's deps — `grep '"@dxos/util"' packages/plugins/plugin-assistant/package.json`; add via `pnpm add --filter "@dxos/plugin-assistant" "@dxos/util@workspace:*"` if missing.)

- [ ] **Step 4: Wire into the processor**

In `packages/plugins/plugin-assistant/src/processor/processor.ts`:

Add the import:

```ts
import { createPromptContent, type ProcessorRequestContext } from './prompt';
```

Extend the request type (lines 84–87):

```ts
export type ProcessorRequest = {
  message: string;
  /** Ephemeral context (e.g. companion-document selection) captured at submit time. */
  context?: ProcessorRequestContext;
  options?: ProcessorRequestOptions;
};
```

Replace line 304:

```ts
yield * session.submitPrompt(createPromptContent(requestProp));
```

(The adjacent `log('chat processor submitting prompt', ...)` and `#updateChatName(requestProp.message)` keep using `requestProp.message`.) Check whether `src/processor/index.ts` exists and re-exports `processor.ts`; if so add `export * from './prompt';` (or the file's export style) so Task 7 can import `ProcessorRequestContext` via the same path other files use.

- [ ] **Step 5: Run test to verify it passes, then build**

```bash
pnpm --filter plugin-assistant exec vitest run --project=node src/processor/prompt.test.ts
```

Expected: PASS.

```bash
moon run plugin-assistant:build
```

Expected: green.

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-assistant/src/processor pnpm-lock.yaml packages/plugins/plugin-assistant/package.json
git commit -m "plugin-assistant: per-request selection context as synthetic prompt block"
```

---

### Task 7: submit-time selection capture in the companion chat

**Files:**

- Create: `packages/plugins/plugin-assistant/src/hooks/useSelectionContext.ts`
- Test: `packages/plugins/plugin-assistant/src/hooks/useSelectionContext.test.ts`
- Modify: `packages/plugins/plugin-assistant/src/hooks/index.ts`
- Modify: `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:62,129,154`
- Modify: `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx`

**Interfaces:**

- Consumes: `Selection.toAnchors` (Task 1), `AppCapabilities.AnchorResolver` (Task 2), `ProcessorRequestContext` (Task 6), `AttentionCapabilities.ViewState` (existing).
- Produces: `getSelectionContext({ object, selection, resolvers }): ProcessorRequestContext | undefined` (pure, exported for tests); `useSelectionContext(companionTo): () => ProcessorRequestContext | undefined`; `ChatRootProps.getContext?: () => ProcessorRequestContext | undefined`.

- [ ] **Step 1: Write the failing test for the pure helper**

Create `packages/plugins/plugin-assistant/src/hooks/useSelectionContext.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { Expando } from '@dxos/schema';

import { getSelectionContext } from './useSelectionContext';

describe('getSelectionContext', () => {
  const object = Obj.make(Expando.Expando, { content: 'hello brave world' });
  const typename = Obj.getTypename(object);
  const resolver = {
    key: typename ?? '',
    getText: (_obj: unknown, anchor: string) => (anchor === 'a:b' ? 'brave' : undefined),
  };

  test('resolves selection ranges to text via the typename resolver', ({ expect }) => {
    const context = getSelectionContext({
      object,
      selection: { mode: 'multi-range', ranges: [{ from: 'a', to: 'b' }] },
      resolvers: [resolver],
    });
    expect(context?.selection?.text).toBe('brave');
    expect(context?.selection?.anchors).toEqual(['a:b']);
  });

  test('returns undefined without a matching resolver', ({ expect }) => {
    const context = getSelectionContext({
      object,
      selection: { mode: 'multi-range', ranges: [{ from: 'a', to: 'b' }] },
      resolvers: [],
    });
    expect(context).toBeUndefined();
  });

  test('returns undefined when nothing resolves', ({ expect }) => {
    const context = getSelectionContext({
      object,
      selection: { mode: 'multi-range', ranges: [{ from: 'x', to: 'y' }] },
      resolvers: [resolver],
    });
    expect(context).toBeUndefined();
  });

  test('returns undefined for an empty selection', ({ expect }) => {
    expect(getSelectionContext({ object, selection: undefined, resolvers: [resolver] })).toBeUndefined();
  });
});
```

(If `Obj.make(Expando.Expando, ...)` needs a registered schema outside a database, swap to the package's existing lightest-weight object-construction pattern — search plugin-assistant's own tests for `Obj.make` first and mirror.)

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter plugin-assistant exec vitest run --project=node src/hooks/useSelectionContext.test.ts
```

Expected: FAIL — `./useSelectionContext` does not exist.

- [ ] **Step 3: Implement the hook + helper**

Create `packages/plugins/plugin-assistant/src/hooks/useSelectionContext.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { Selection } from '@dxos/react-ui-attention';

import { type ProcessorRequestContext } from '../processor/prompt';

/** Resolve `object`'s selection to text via the AnchorResolver contributed for its typename. */
export const getSelectionContext = ({
  object,
  selection,
  resolvers,
}: {
  object: Obj.Unknown;
  selection: Selection.Selection | undefined;
  resolvers: readonly AppCapabilities.AnchorResolver[];
}): ProcessorRequestContext | undefined => {
  const typename = Obj.getTypename(object);
  const resolver = typename ? resolvers.find((candidate) => candidate.key === typename) : undefined;
  if (!resolver) {
    return undefined;
  }

  const anchors = Selection.toAnchors(selection);
  const parts = anchors
    .map((anchor) => resolver.getText(object, anchor))
    .filter((text): text is string => text != null && text.length > 0);
  if (parts.length === 0) {
    return undefined;
  }

  return { selection: { anchors, text: parts.join('\n…\n') } };
};

/** Submit-time provider of the companion object's current selection as request context. */
export const useSelectionContext = (
  companionTo: Obj.Unknown | undefined,
): (() => ProcessorRequestContext | undefined) => {
  // getAll-style lookup: absent capabilities yield empty arrays so non-companion chats stay inert.
  const [viewState] = useCapabilities(AttentionCapabilities.ViewState);
  const resolvers = useCapabilities(AppCapabilities.AnchorResolver);

  return useCallback(() => {
    if (!companionTo || !viewState) {
      return undefined;
    }
    const selection = viewState.get(Selection.aspect, Obj.getURI(companionTo));
    return getSelectionContext({ object: companionTo, selection, resolvers });
  }, [companionTo, viewState, resolvers]);
};
```

Add to `packages/plugins/plugin-assistant/src/hooks/index.ts` following its export style (it already exports `useContextBinder` etc.):

```ts
export * from './useSelectionContext';
```

Check the exact import path for `ProcessorRequestContext`: if `#processor` or a barrel is the package convention (see how `useChatProcessor.ts` imports the processor), use that instead of the relative path.

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter plugin-assistant exec vitest run --project=node src/hooks/useSelectionContext.test.ts
```

Expected: PASS.

- [ ] **Step 5: Thread `getContext` through Chat.Root**

In `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx`:

Line 62 area — extend the props type:

```ts
    onSubmit?: (text: string) => Promise<void> | void;
    /** Called at submit time to capture ephemeral request context (e.g. companion selection). */
    getContext?: () => ProcessorRequestContext | undefined;
```

(import `type ProcessorRequestContext` from the same path the file/package uses for processor types.)

Destructure `getContext` in `ChatRoot` (line 66) alongside `onSubmit`. In the `submit` case (line 129), capture the context at submit time, before the persistence hook runs:

```ts
        case 'submit': {
          const text = ev.text.trim();
          if (!streaming && text.length) {
            lastPrompt.current = ev.text;
            const context = getContext?.();
            // Await persistence (transient chat) before requesting so the agent resolves the
            // now-durable conversation feed; resolves immediately when there is no hook.
            void Promise.resolve(onSubmit?.(text)).then(() => processor.request({ message: text, context }));
          }
          break;
        }
```

Add `getContext` to the effect dependency array at line 154 (`[event, dump, processor, streaming, onEvent, onSubmit]` → append `getContext`).

- [ ] **Step 6: Wire ChatArticle**

In `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx`:

```ts
import { useChatProcessor, useChatServices, usePresets, useSelectionContext } from '#hooks';
```

(match the existing `#hooks` import on line 19). Inside the component:

```ts
const getContext = useSelectionContext(companionTo);
```

and pass it to the root (line 81):

```tsx
      <ChatComponent.Root chat={chat} db={space?.db} processor={processor} getContext={getContext} onEvent={onEvent} onSubmit={onSubmit}>
```

- [ ] **Step 7: Build and full assistant test run**

```bash
moon run plugin-assistant:build
pnpm --filter plugin-assistant exec vitest run --project=node
```

Expected: green build; test suite passes (pre-existing failures, if any, must be shown to be pre-existing via `git stash` + rerun before proceeding).

- [ ] **Step 8: Commit**

```bash
git add packages/plugins/plugin-assistant
git commit -m "plugin-assistant: companion chat captures markdown selection as request context"
```

---

### Task 8: format, affected builds, verification sweep

**Files:** none new.

- [ ] **Step 1: Format and stage**

```bash
pnpm format
git status --porcelain
```

Commit any formatting diffs (`chore: format`). Account for every modified/untracked file, including the user's own edits — commit them or explicitly confirm exclusion with the user.

- [ ] **Step 2: Build the affected graph**

```bash
moon run app-toolkit:build echo-client:build react-ui-attention:build plugin-markdown:build plugin-comments:build plugin-assistant:build compute:build agent-runtime:build
```

Expected: all green (note: `build` runs type emit beyond `compile` — a green compile cache can mask a build failure, so run `build` explicitly).

- [ ] **Step 3: Lint the touched packages**

```bash
moon run app-toolkit:lint echo-client:lint react-ui-attention:lint plugin-markdown:lint plugin-comments:lint plugin-assistant:lint compute:lint agent-runtime:lint
```

Fix any findings (with `-- --fix` where mechanical).

- [ ] **Step 4: Re-run the new tests as a batch**

```bash
pnpm --filter react-ui-attention exec vitest run --project=node src/types/Selection.test.ts
pnpm --filter plugin-markdown exec vitest run --project=node src/capabilities/anchor-resolver.test.ts
pnpm --filter plugin-assistant exec vitest run --project=node src/processor/prompt.test.ts src/hooks/useSelectionContext.test.ts
pnpm --filter plugin-comments exec vitest run --project=node
```

Expected: PASS. Do NOT launch the full repo `moon :test` without asking the user first (long/LLM suites block them).

- [ ] **Step 5: Manual end-to-end note**

Report to the user: end-to-end verification (select text in a markdown doc → ask the companion chat about it → the reply reflects the selection; debug view shows the synthetic block) needs the running Composer app; offer to run it via a worktree storybook/app on a free port or leave it for their next session. Do not claim the feature verified without this.

- [ ] **Step 6: Final commit + status**

```bash
git status
git log --oneline main..HEAD
```

Everything committed; report the branch state to the user (changeset decision + PR via the `submit-pr` skill happen only when the user asks).
