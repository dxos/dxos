# CRX Picker → Page Actions Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The composer-crx picker ("Clip" button) delivers picked DOM content as a `PageAction.Snapshot` over the existing page-actions channel, so plugin-bookmarks (and any plugin) can create objects from picked content; the legacy `composer:clip` channel is deleted.

**Architecture:** The picker toolbar becomes registry-driven (page-action descriptors with a new `'picker'` context). On pick, the content script builds a Snapshot from the picked element and hands it to the background worker, which enriches it and routes it through the existing `deliverInvoke` path (`invokedFrom: 'picker'`). plugin-crx's person/org/note clip kinds become three contributed picker page actions backed by new operations; plugin-bookmarks adds `'picker'` to its existing action.

**Tech Stack:** TypeScript, Effect Schema, vitest, webextension-polyfill, moon task runner.

**Spec:** `agents/superpowers/specs/2026-06-11-crx-picker-page-actions-design.md`

**Conventions (read first):**

- Run tests with `moon run <project>:test` where project ∈ `plugin-crx`, `plugin-bookmarks`, `composer-crx`. Run a single file with `moon run <project>:test -- path/to/file.test.ts`. Ignore `DEPOT_TOKEN` warnings.
- All paths below are relative to the repo root (the worktree). NEVER touch the bare repo outside this worktree.
- No `as` casts to silence type errors (see project CLAUDE.md). `as const` is fine.
- Comments end with a period and state invariants, never history.
- Commit after every task; the user may have concurrent edits — include their files (`git status` before each commit).

---

### Task 1: plugin-crx protocol — `'picker'` context + Snapshot owns its structs

**Files:**

- Modify: `packages/plugins/plugin-crx/src/types/PageAction.ts`
- Modify: `packages/plugins/plugin-crx/src/types/Clip.ts`
- Modify: `packages/plugins/plugin-crx/src/page-actions.test.ts`

- [ ] **Step 1: Move `Rect`/`Source`/`Selection`/`Hints` into PageAction.ts and add `'picker'` literals**

In `packages/plugins/plugin-crx/src/types/PageAction.ts`:

1. Remove the line `import * as Clip from './Clip';`.
2. Immediately before the `Snapshot` declaration, insert the four structs (moved verbatim from `Clip.ts`):

```ts
export const Rect = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
});

export const Source = Schema.Struct({
  url: Schema.String,
  title: Schema.String,
  favicon: Schema.optional(Schema.String),
  clippedAt: Schema.String,
});
export type Source = Schema.Schema.Type<typeof Source>;

export const Selection = Schema.Struct({
  text: Schema.String,
  html: Schema.optional(Schema.String),
  htmlTruncated: Schema.optional(Schema.Boolean),
  rect: Schema.optional(Rect),
});
export type Selection = Schema.Schema.Type<typeof Selection>;

export const Hints = Schema.Struct({
  ogTitle: Schema.optional(Schema.String),
  ogDescription: Schema.optional(Schema.String),
  ogImage: Schema.optional(Schema.String),
  jsonLd: Schema.optional(Schema.Array(Schema.Unknown)),
  h1: Schema.optional(Schema.String),
  firstImage: Schema.optional(Schema.String),
});
export type Hints = Schema.Schema.Type<typeof Hints>;
```

3. In the `Snapshot` struct, replace `Clip.Source` → `Source`, `Clip.Selection` → `Selection`, `Clip.Hints` → `Hints`. Update the Snapshot doc comment: drop the sentence about reusing the Clip envelope's shapes (the shapes now live here).
4. Change the `Context` literal:

```ts
export const Context = Schema.Literal('popup', 'page', 'selection', 'link', 'picker');
```

5. In `InvokeRequest`, change `invokedFrom`:

```ts
invokedFrom: Schema.Literal('popup', 'contextMenu', 'picker'),
```

- [ ] **Step 2: Make Clip.ts re-export the moved structs (transitional — Clip.ts is deleted in Task 3)**

In `packages/plugins/plugin-crx/src/types/Clip.ts`, delete the `Rect`, `Source`, `Selection`, `Hints` declarations (consts and their type aliases) and replace them with:

```ts
// Transitional bridge while the Clip envelope is retired; this file is deleted once all consumers read the shapes from PageAction.
// eslint-disable-next-line @dxos/rules/import-as-namespace
import { Hints, Selection, Source } from './PageAction';

// eslint-disable-next-line @dxos/rules/import-as-namespace
export { Hints, Rect, Selection, Source } from './PageAction';
```

(The `Clip` struct body references `Source`, `Selection`, `Hints` by bare name and is otherwise unchanged.)

The named re-export violates `@import-as-namespace` lint; suppress with targeted eslint-disable comments — the file is deleted in Task 3.

- [ ] **Step 3: Add a picker round-trip test**

In `packages/plugins/plugin-crx/src/page-actions.test.ts`, add inside `describe('page-actions', ...)`:

```ts
test('invoke accepts picker-originated requests', async ({ expect }) => {
  const ack = await handleInvokeEvent({ ...request, invokedFrom: 'picker' }, deps());
  expect(ack).toEqual({ version: 1, id: 'req-1', ok: true, objectId: 'obj-1' });
});

test('list serializes picker contexts', ({ expect }) => {
  const pickerAction: PageAction.PageAction = { ...action, contexts: ['picker'] };
  const ack = handleListEvent({ version: 1, id: 'list-2' }, () => [pickerAction]);
  expect(ack.ok).toBe(true);
  expect(ack.ok && ack.actions[0].contexts).toEqual(['picker']);
});
```

- [ ] **Step 4: Run plugin-crx tests**

Run: `moon run plugin-crx:test`
Expected: PASS (including the two new tests).

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-crx
git commit -m "feat(plugin-crx): add picker context to page-action protocol"
```

---

### Task 2: plugin-crx — retype mapping to Snapshot, add operations + picker page actions

**Files:**

- Modify: `packages/plugins/plugin-crx/src/mapping.ts`
- Modify: `packages/plugins/plugin-crx/src/mapping.test.ts`
- Create: `packages/plugins/plugin-crx/src/types/CrxOperation.ts`
- Modify: `packages/plugins/plugin-crx/src/types/index.ts`
- Create: `packages/plugins/plugin-crx/src/operations/add-person-from-snapshot.ts`
- Create: `packages/plugins/plugin-crx/src/operations/add-organization-from-snapshot.ts`
- Create: `packages/plugins/plugin-crx/src/operations/add-note-from-snapshot.ts`
- Create: `packages/plugins/plugin-crx/src/operations/index.ts`
- Create: `packages/plugins/plugin-crx/src/capabilities/operation-handler.ts`
- Create: `packages/plugins/plugin-crx/src/capabilities/page-action-provider.ts`
- Modify: `packages/plugins/plugin-crx/src/capabilities/index.ts`
- Modify: `packages/plugins/plugin-crx/src/CrxPlugin.tsx`

**IMPORTANT ordering note:** `listener.ts` still imports `mapClip` until Task 3. To keep this task compiling, `mapClip` is retyped here (not deleted): `Clip.Clip` is structurally assignable to `PageAction.Snapshot` (it has `source` plus optional extras), so the listener keeps compiling unchanged. `mapClip`'s kind-dispatch needs the `kind` field, which Snapshot lacks — so `mapClip` keeps taking `Clip.Clip` while `toPerson`/`toOrganization`/`toNote` take `PageAction.Snapshot`. `mapClip` is deleted with the listener in Task 3.

- [ ] **Step 1: Update mapping tests first (TDD — drive the retype)**

In `packages/plugins/plugin-crx/src/mapping.test.ts`:

- Change the import `import { Clip } from '#types';` → `import { Clip, PageAction } from '#types';`.
- Retype the fixtures: `baseSource: PageAction.Source`, `baseSelection: PageAction.Selection` (shapes unchanged).
- Add a snapshot factory next to `makeClip` and switch the `toPerson`/`toOrganization`/`toNote` calls to it (keep `makeClip` only for the `mapClip` test):

```ts
const makeSnapshot = (overrides: Partial<PageAction.Snapshot> = {}): PageAction.Snapshot => ({
  source: baseSource,
  selection: baseSelection,
  ...overrides,
});
```

- Mechanically replace `toPerson(makeClip({ ... }))` → `toPerson(makeSnapshot({ ... }))` (likewise for org/note), dropping any `kind: '...'` properties from the overrides (Snapshot has no kind).
- Add a missing-selection test:

```ts
test('mappers tolerate a snapshot without selection', ({ expect }) => {
  const person = toPerson(makeSnapshot({ selection: undefined, hints: {} }));
  expect(person.fullName).toBeUndefined();

  const note = toNote(makeSnapshot({ selection: undefined, hints: { h1: 'Title' } }));
  expect(note.content).toContain('# Title');
});
```

- Keep one `mapClip` test (it still dispatches by `clip.kind` until Task 3).

- [ ] **Step 2: Run mapping tests to verify they fail**

Run: `moon run plugin-crx:test -- src/mapping.test.ts`
Expected: FAIL — type errors (`toPerson` expects `Clip.Clip`).

- [ ] **Step 3: Retype mapping.ts**

In `packages/plugins/plugin-crx/src/mapping.ts`:

- Change the types import to `import { type Clip, type PageAction } from '#types';`.
- Retype the three mappers to `(snapshot: PageAction.Snapshot)` and make selection access optional. The bodies become (doc comments unchanged except `Clip` → `snapshot` wording):

```ts
export const toPerson = (snapshot: PageAction.Snapshot) => {
  const hints = snapshot.hints ?? {};
  const fullName = hints.h1 ?? hints.ogTitle ?? firstLine(snapshot.selection?.text);
  return Person.make({
    fullName,
    image: hints.ogImage,
    notes: truncate(snapshot.selection?.text, MAX_NOTES_LENGTH),
    urls: [
      {
        label: snapshot.source.title || snapshot.source.url,
        value: snapshot.source.url,
      },
    ],
  });
};

export const toOrganization = (snapshot: PageAction.Snapshot) => {
  const hints = snapshot.hints ?? {};
  const name = hints.ogTitle ?? hints.h1 ?? firstLine(snapshot.selection?.text);
  return Organization.make({
    name,
    description: hints.ogDescription ?? truncate(snapshot.selection?.text, MAX_NOTES_LENGTH),
    image: hints.ogImage,
    website: snapshot.source.url,
  });
};

export const toNote = (snapshot: PageAction.Snapshot) => {
  const hints = snapshot.hints ?? {};
  const title = hints.h1 ?? hints.ogTitle ?? firstLine(snapshot.selection?.text) ?? snapshot.source.title;
  const body = truncate(snapshot.selection?.text, MAX_NOTE_BODY_LENGTH) ?? '';

  const sourceLabel = snapshot.source.title || snapshot.source.url;
  const clippedAt = snapshot.source.clippedAt;
  const preludeLines = [
    title ? `# ${title}` : undefined,
    '',
    `_Clipped from [${sourceLabel}](${snapshot.source.url}) on ${clippedAt}._`,
    '',
    body,
  ].filter((line): line is string => line !== undefined);
  const content = preludeLines.join('\n');

  return Markdown.make({
    name: title ?? undefined,
    content,
  });
};
```

- `mapClip` keeps its `(clip: Clip.Clip)` signature; the calls inside compile because `Clip.Clip` is structurally a `Snapshot`-compatible argument.

- [ ] **Step 4: Run mapping tests to verify they pass**

Run: `moon run plugin-crx:test -- src/mapping.test.ts`
Expected: PASS.

- [ ] **Step 5: Create operation definitions**

Create `packages/plugins/plugin-crx/src/types/CrxOperation.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, DXN } from '@dxos/echo';

import * as PageAction from './PageAction';

const input = Schema.Struct({
  snapshot: PageAction.Snapshot,
  target: Database.Database.annotations({ description: 'The database to add the object to.' }),
});

const output = Schema.Struct({
  id: Schema.String,
});

export const AddPersonFromSnapshot = Operation.make({
  meta: {
    key: DXN.make('org.dxos.plugin.crx.operation.addPersonFromSnapshot'),
    name: 'Add person',
    description: 'Create a person from a page snapshot.',
    icon: 'ph--user--regular',
  },
  input,
  output,
});

export const AddOrganizationFromSnapshot = Operation.make({
  meta: {
    key: DXN.make('org.dxos.plugin.crx.operation.addOrganizationFromSnapshot'),
    name: 'Add organization',
    description: 'Create an organization from a page snapshot.',
    icon: 'ph--building-office--regular',
  },
  input,
  output,
});

export const AddNoteFromSnapshot = Operation.make({
  meta: {
    key: DXN.make('org.dxos.plugin.crx.operation.addNoteFromSnapshot'),
    name: 'Add note',
    description: 'Create a markdown note from a page snapshot.',
    icon: 'ph--note--regular',
  },
  input,
  output,
});
```

In `packages/plugins/plugin-crx/src/types/index.ts`, add (alphabetical position):

```ts
export * as CrxOperation from './CrxOperation';
```

- [ ] **Step 6: Create operation handlers**

Create `packages/plugins/plugin-crx/src/operations/add-person-from-snapshot.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { SpaceOperation } from '@dxos/plugin-space';

import { CrxOperation } from '#types';

import { toPerson } from '../mapping';

const handler: Operation.WithHandler<typeof CrxOperation.AddPersonFromSnapshot> =
  CrxOperation.AddPersonFromSnapshot.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ snapshot, target }) {
        const person = toPerson(snapshot);
        const { id } = yield* Operation.invoke(SpaceOperation.AddObject, { object: person, target });
        return { id };
      }),
    ),
  );

export default handler;
```

Create `packages/plugins/plugin-crx/src/operations/add-organization-from-snapshot.ts` — identical shape with `AddOrganizationFromSnapshot`, `toOrganization`, variable name `organization`.

Create `packages/plugins/plugin-crx/src/operations/add-note-from-snapshot.ts` — identical shape with `AddNoteFromSnapshot`, `toNote`, variable name `note`.

Create `packages/plugins/plugin-crx/src/operations/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const CrxOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-person-from-snapshot'),
  () => import('./add-organization-from-snapshot'),
  () => import('./add-note-from-snapshot'),
);
```

Check `packages/plugins/plugin-crx/package.json` for an `imports` map entry for `#operations`/`#types` (mirror how `plugin-bookmarks/package.json` maps them) and add `"#operations": "./src/operations/index.ts"` style entries if missing — copy the exact pattern used by plugin-bookmarks. If the repo convention uses relative imports instead for this package, use `../operations` accordingly.

- [ ] **Step 7: Create capability modules and wire the plugin**

Create `packages/plugins/plugin-crx/src/capabilities/operation-handler.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/compute';

import { CrxOperationHandlerSet } from '../operations';

export default Capability.makeModule<OperationHandlerSet.OperationHandlerSet>(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationHandler, CrxOperationHandlerSet);
  }),
);
```

Create `packages/plugins/plugin-crx/src/capabilities/page-action-provider.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { meta } from '../meta';
import { CrxCapabilities, CrxOperation, type PageAction } from '#types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    // Picker-only: these actions back the extension's DOM-picker toolbar and
    // are not surfaced in the popup or context menu.
    const actions: PageAction.PageAction[] = [
      {
        id: `${meta.id}/page-action/add-person`,
        label: 'Person',
        icon: 'ph--user--regular',
        urlPatterns: ['http://*/*', 'https://*/*'],
        extractor: { name: 'snapshot' },
        contexts: ['picker'],
        operation: CrxOperation.AddPersonFromSnapshot,
      },
      {
        id: `${meta.id}/page-action/add-organization`,
        label: 'Organization',
        icon: 'ph--building-office--regular',
        urlPatterns: ['http://*/*', 'https://*/*'],
        extractor: { name: 'snapshot' },
        contexts: ['picker'],
        operation: CrxOperation.AddOrganizationFromSnapshot,
      },
      {
        id: `${meta.id}/page-action/add-note`,
        label: 'Note',
        icon: 'ph--note--regular',
        urlPatterns: ['http://*/*', 'https://*/*'],
        extractor: { name: 'snapshot' },
        contexts: ['picker'],
        operation: CrxOperation.AddNoteFromSnapshot,
      },
    ];
    return Capability.contributes(CrxCapabilities.PageAction, actions);
  }),
);
```

(Adjust the `meta` import to `#meta` if that's what sibling capability files in this package use — match `install-page-actions.ts`, which uses `'../meta'`.)

In `packages/plugins/plugin-crx/src/capabilities/index.ts`, add:

```ts
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationHandlerSet } from '@dxos/compute';
import { type CrxCapabilities } from '#types';

export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);

// The contributed capability type references Operation types from @dxos/compute, so the lazy
// wrapper needs an explicit annotation to keep the inferred type portable (TS2883).
export const PageActionProvider: Capability.LazyCapability<
  void,
  Capability.Capability<typeof CrxCapabilities.PageAction>
> = Capability.lazy('PageActionProvider', () => import('./page-action-provider'));
```

In `packages/plugins/plugin-crx/src/CrxPlugin.tsx`, add to the pipe (and to the `#capabilities` import):

```tsx
AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
Plugin.addModule({
  id: 'page-action-provider',
  activatesOn: ActivationEvents.Startup,
  activate: PageActionProvider,
}),
```

- [ ] **Step 8: Build + test plugin-crx**

Run: `moon run plugin-crx:build && moon run plugin-crx:test`
Expected: PASS. If the `Effect.fn`/`Operation.withHandler` types mismatch, compare against `packages/plugins/plugin-bookmarks/src/operations/add-from-snapshot.ts` — the pattern must match exactly.

- [ ] **Step 9: Commit**

```bash
git add packages/plugins/plugin-crx
git commit -m "feat(plugin-crx): contribute person/org/note picker page actions"
```

---

### Task 3: plugin-crx — delete the clip channel

**Files:**

- Delete: `packages/plugins/plugin-crx/src/listener.ts`
- Delete: `packages/plugins/plugin-crx/src/capabilities/install-clip-listener.ts`
- Delete: `packages/plugins/plugin-crx/src/types/Clip.ts`
- Modify: `packages/plugins/plugin-crx/src/mapping.ts` (delete `mapClip`)
- Modify: `packages/plugins/plugin-crx/src/mapping.test.ts` (delete `mapClip` test + `makeClip` + Clip import)
- Modify: `packages/plugins/plugin-crx/src/types/index.ts`
- Modify: `packages/plugins/plugin-crx/src/capabilities/index.ts`
- Modify: `packages/plugins/plugin-crx/src/CrxPlugin.tsx`
- Modify: `packages/plugins/plugin-crx/src/translations.ts`
- Modify: `packages/plugins/plugin-crx/src/types/Settings.ts`
- Modify: `packages/plugins/plugin-crx/src/types/PageAction.ts` (doc comment only)

- [ ] **Step 1: Delete the listener and its capability**

```bash
git rm packages/plugins/plugin-crx/src/listener.ts packages/plugins/plugin-crx/src/capabilities/install-clip-listener.ts packages/plugins/plugin-crx/src/types/Clip.ts
```

- [ ] **Step 2: Remove all references**

- `capabilities/index.ts`: delete the `InstallClipListener` export line.
- `CrxPlugin.tsx`: remove `InstallClipListener` from the `#capabilities` import and delete the `Plugin.addModule({ id: 'install-crx-bridge', ... })` block.
- `types/index.ts`: delete `export * as Clip from './Clip';`.
- `mapping.ts`: delete the `mapClip` function and the now-unused `import { type Clip, ... }` (keep `type PageAction`).
- `mapping.test.ts`: delete the `mapClip` import/test and the `makeClip` helper; remove the `Clip` import (fixtures already use `PageAction.*` from Task 2). Also remove the `Either`/`Schema` imports if they were only used by deleted Clip-decode tests.
- `types/PageAction.ts`: in the module doc comment, drop the phrase "invocation arrives over the same window CustomEvent bridge as clips" — reword to "invocation arrives over a window CustomEvent bridge."

- [ ] **Step 3: Trim translations**

In `packages/plugins/plugin-crx/src/translations.ts`, delete these keys (no longer referenced once the clip listener is gone):
`'toast.person.title'`, `'toast.organization.title'`, `'toast.note.title'`, `'toast.error.title'`, `'toast.error.unsupportedKind.message'`, `'toast.error.internal.message'`.
Keep: `invalidPayload`, `unsupportedVersion`, `noSpace`, `unknownAction`, `operationFailed` messages (all reachable via the page-actions error toast `toast.error.${ack.error}.message`) and the `toast.page-action.*` keys.

- [ ] **Step 4: Update Settings wording**

In `packages/plugins/plugin-crx/src/types/Settings.ts`, update the user-facing strings that mention clips (the schema fields stay — they are persisted):

- `enabled` annotations → `title: 'Accept extension actions'`, `description: 'When off, actions sent from the composer-crx browser extension are ignored.'`
- `autoOpenAfterClip` annotations → `description: 'Navigate to the created object when the extension creates one.'` (keep the field name — it is a persisted settings key).
- Update the file-top doc comment sentence "both the clip bridge and the render-proxy" → "both the page-actions bridge and the render-proxy".

- [ ] **Step 5: Verify no stragglers, build, test**

Run: `grep -rn "Clip\|clip" packages/plugins/plugin-crx/src --include="*.ts*" | grep -v "clippedAt\|autoOpenAfterClip\|Clipped from"`
Expected: only innocuous hits (e.g. none, or comments updated above). Then:

Run: `moon run plugin-crx:build && moon run plugin-crx:test && moon run plugin-crx:lint`
Expected: PASS.

Also check reverse dependencies — other packages importing `Clip` from plugin-crx:

Run: `grep -rn "plugin-crx" packages --include="*.ts*" -l | xargs grep -ln "Clip" | grep -v plugin-crx/src | grep -v composer-crx`
Expected: no output. If a file appears, update it to stop importing Clip (report in the task summary).

- [ ] **Step 6: Commit**

```bash
git add -A packages/plugins/plugin-crx
git commit -m "refactor(plugin-crx): remove legacy composer:clip channel"
```

---

### Task 4: plugin-bookmarks — picker context + excerpt precedence

**Files:**

- Modify: `packages/plugins/plugin-bookmarks/src/capabilities/page-action.ts`
- Modify: `packages/plugins/plugin-bookmarks/src/types/Bookmark.ts`
- Test: `packages/plugins/plugin-bookmarks/src/types/Bookmark.test.ts` (extend if it exists; create otherwise — check first)

- [ ] **Step 1: Write/extend the failing test**

Check for an existing suite: `ls packages/plugins/plugin-bookmarks/src/types/*.test.ts`. Extend it if present; otherwise create `packages/plugins/plugin-bookmarks/src/types/Bookmark.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Bookmark } from '#types';

describe('Bookmark.fromSnapshot', () => {
  const source = { url: 'https://example.com', title: 'Example', clippedAt: '2026-06-11T00:00:00.000Z' };

  test('excerpt prefers the picked/selected text over og:description', ({ expect }) => {
    const bookmark = Bookmark.fromSnapshot({
      source,
      selection: { text: 'User-picked extract.' },
      hints: { ogDescription: 'Marketing blurb.' },
    });
    expect(bookmark.excerpt).toBe('User-picked extract.');
  });

  test('excerpt falls back to og:description without a selection', ({ expect }) => {
    const bookmark = Bookmark.fromSnapshot({ source, hints: { ogDescription: 'Marketing blurb.' } });
    expect(bookmark.excerpt).toBe('Marketing blurb.');
  });

  test('excerpt truncates picked text to 280 chars', ({ expect }) => {
    const bookmark = Bookmark.fromSnapshot({ source, selection: { text: 'x'.repeat(400) } });
    expect(bookmark.excerpt?.length).toBe(280);
  });
});
```

NOTE: `Bookmark.fromSnapshot` returns an ECHO object — if `Obj.make` requires a registered schema/runtime in tests, mirror however existing plugin-bookmarks tests construct objects (check `packages/plugins/plugin-bookmarks/src/**/*.test.ts` for the pattern). If no test infrastructure exists for ECHO objects in this package, assert on a extracted pure helper instead: factor the excerpt expression into an exported `excerptFromSnapshot(snapshot)` pure function in `Bookmark.ts` and test that.

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run plugin-bookmarks:test -- src/types/Bookmark.test.ts`
Expected: FAIL on the first test (`Marketing blurb.` ≠ `User-picked extract.`).

- [ ] **Step 3: Flip precedence and add the context**

In `packages/plugins/plugin-bookmarks/src/types/Bookmark.ts` line ~52:

```ts
excerpt: snapshot.selection?.text?.slice(0, EXCERPT_LENGTH) ?? snapshot.hints?.ogDescription,
```

Also update the `fromSnapshot` doc comment to note the invariant: the selection is only present when the user explicitly selected or picked content, so it outranks page-declared metadata.

In `packages/plugins/plugin-bookmarks/src/capabilities/page-action.ts`:

```ts
contexts: ['popup', 'page', 'picker'],
```

- [ ] **Step 4: Run tests**

Run: `moon run plugin-bookmarks:test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-bookmarks
git commit -m "feat(plugin-bookmarks): surface add-bookmark in the picker, prefer picked text for excerpt"
```

---

### Task 5: composer-crx — protocol mirror

**Files:**

- Modify: `packages/apps/composer-crx/src/page-actions/types.ts`
- Modify: `packages/apps/composer-crx/src/page-actions/types.test.ts`

- [ ] **Step 1: Add failing test cases**

In `packages/apps/composer-crx/src/page-actions/types.test.ts`, add (match the file's existing style — it defines a `descriptor` fixture near the top):

```ts
test('decodeDescriptor keeps the picker context', ({ expect }) => {
  const decoded = decodeDescriptor({ ...descriptor, contexts: ['picker'] });
  expect(decoded?.contexts).toEqual(['picker']);
});
```

(Use the actual fixture variable name from the file; the existing fixture is the `youtube-clip` action object.)

- [ ] **Step 2: Run to verify failure**

Run: `moon run composer-crx:test -- src/page-actions/types.test.ts`
Expected: FAIL — `contexts` decoded as `[]` because `'picker'` is filtered out.

- [ ] **Step 3: Mirror the protocol changes**

In `packages/apps/composer-crx/src/page-actions/types.ts`:

```ts
export type PageActionContext = 'popup' | 'page' | 'selection' | 'link' | 'picker';

const PAGE_ACTION_CONTEXTS: readonly string[] = ['popup', 'page', 'selection', 'link', 'picker'];
```

In `InvokeRequest`:

```ts
invokedFrom: 'popup' | 'contextMenu' | 'picker';
```

Add the new runtime message constant (next to the other `*_MESSAGE_TYPE` constants):

```ts
/**
 * Runtime message `type` discriminator the content script sends to the
 * background worker to deliver a picker-captured snapshot for invocation.
 */
export const PAGE_ACTION_DELIVER_MESSAGE_TYPE = 'composer-crx:page-action:deliver';
```

Add named aliases for the Snapshot sub-shapes (used by the picker harvest module after Task 6):

```ts
export type SnapshotSelection = NonNullable<Snapshot['selection']>;
export type SnapshotHints = NonNullable<Snapshot['hints']>;
```

- [ ] **Step 4: Run tests**

Run: `moon run composer-crx:test -- src/page-actions/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/apps/composer-crx
git commit -m "feat(composer-crx): mirror picker context in page-action protocol"
```

---

### Task 6: composer-crx — background deliver handler

**Files:**

- Create: `packages/apps/composer-crx/src/page-actions/deliver.ts`
- Create: `packages/apps/composer-crx/src/page-actions/deliver.test.ts`
- Modify: `packages/apps/composer-crx/src/page-actions/index.ts` (re-export — match how `invoke.ts`/`registry.ts` are exported)
- Modify: `packages/apps/composer-crx/src/background.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/apps/composer-crx/src/page-actions/deliver.test.ts` (mirror the injectable-api style of `invoke.test.ts` — read that file first and copy its mock conventions):

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { deliverPickedSnapshot } from './deliver';
import { type InvokeBridgeApi } from './invoke';
import { type Snapshot } from './types';

const snapshot: Snapshot = {
  source: { url: 'https://example.com/a', title: 'Example', clippedAt: '2026-06-11T00:00:00.000Z' },
  selection: { text: 'Picked text.' },
};

describe('deliverPickedSnapshot', () => {
  test('builds a picker invoke request and returns the ack', async ({ expect }) => {
    const sent: any[] = [];
    const api: InvokeBridgeApi = {
      findComposerTab: async () => ({ id: 7 }),
      openComposerTab: async () => {},
      sendMessage: async (_tabId, message) => {
        sent.push(message);
        const request = (message as any).request;
        return { version: 1, id: request.id, ok: true, objectId: 'obj-1' };
      },
    };

    const ack = await deliverPickedSnapshot({ actionId: 'a-1', snapshot }, api);
    expect(ack).toMatchObject({ ok: true, objectId: 'obj-1' });

    const request = sent[0].request;
    expect(request.actionId).toBe('a-1');
    expect(request.invokedFrom).toBe('picker');
    expect(request.page).toEqual({ url: 'https://example.com/a', title: 'Example', favicon: undefined });
    expect(request.inputs).toMatchObject({ selection: { text: 'Picked text.' } });
  });

  test('propagates delivery failure acks', async ({ expect }) => {
    const api: InvokeBridgeApi = {
      findComposerTab: async () => ({ id: 7 }),
      openComposerTab: async () => {},
      sendMessage: async (_tabId, message) => ({
        version: 1,
        id: (message as any).request.id,
        ok: false,
        error: 'noSpace',
      }),
    };
    const ack = await deliverPickedSnapshot({ actionId: 'a-1', snapshot }, api);
    expect(ack).toMatchObject({ ok: false, error: 'noSpace' });
  });
});
```

(If `expect(request.page)` fails on `favicon: undefined` vs missing key, assert `toMatchObject({ url: ..., title: ... })` instead.)

- [ ] **Step 2: Run to verify failure**

Run: `moon run composer-crx:test -- src/page-actions/deliver.test.ts`
Expected: FAIL — module `./deliver` not found.

- [ ] **Step 3: Implement deliver.ts**

Create `packages/apps/composer-crx/src/page-actions/deliver.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type DeliverInvokeOptions, type InvokeBridgeApi, deliverInvoke } from './invoke';
import { enrichSnapshotWithThumbnail } from './thumbnail';
import { type InvokeAck, type InvokeRequest, type Snapshot } from './types';
import { nextId } from './util';

/**
 * Deliver a picker-captured snapshot to Composer as a page-action invocation.
 * The snapshot's own source describes the page (the picker runs in the page it
 * captures), so no separate tab lookup is needed.
 */
export const deliverPickedSnapshot = async (
  { actionId, snapshot }: { actionId: string; snapshot: Snapshot },
  api?: InvokeBridgeApi,
  options: DeliverInvokeOptions = {},
): Promise<InvokeAck> => {
  const inputs = await enrichSnapshotWithThumbnail(snapshot);
  const request: InvokeRequest = {
    version: 1,
    id: nextId(),
    actionId,
    page: { url: snapshot.source.url, title: snapshot.source.title, favicon: snapshot.source.favicon },
    inputs,
    invokedFrom: 'picker',
  };
  return deliverInvoke(request, api, options);
};
```

NOTE on the `deliverInvoke(request, api, options)` call: `deliverInvoke` declares `api: InvokeBridgeApi = defaultApi`, and TypeScript permits passing `undefined` explicitly to a defaulted parameter (the default kicks in at runtime), so forwarding the optional `api` compiles without casts. If the compiler still complains, it means `invoke.ts` changed — fix the signature there, do not cast.

Export from `packages/apps/composer-crx/src/page-actions/index.ts` following the file's existing export style.

- [ ] **Step 4: Run to verify pass**

Run: `moon run composer-crx:test -- src/page-actions/deliver.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the background handler**

In `packages/apps/composer-crx/src/background.ts`, add to the imports from `'./page-actions'`: `PAGE_ACTION_DELIVER_MESSAGE_TYPE`, `deliverPickedSnapshot`. Then add a listener next to the existing `PAGE_ACTION_RUN_MESSAGE_TYPE` listener:

```ts
browser.runtime.onMessage.addListener((msg: any): undefined | Promise<unknown> => {
  if (!msg || msg.type !== PAGE_ACTION_DELIVER_MESSAGE_TYPE) {
    return undefined;
  }
  if (typeof msg.actionId !== 'string' || typeof msg.snapshot !== 'object' || msg.snapshot === null) {
    return Promise.resolve({ version: 1, id: '', ok: false, error: 'badRequest' });
  }
  // Notify on failure: the popup has already closed by pick time, so a
  // browser notification is the only feedback channel (mirrors the run flow).
  return deliverPickedSnapshot({ actionId: msg.actionId, snapshot: msg.snapshot }).then((ack) => {
    if (!ack.ok) {
      notify('Action failed', ack.error);
    }
    return ack;
  });
});
```

`msg.snapshot` crosses the runtime-messaging boundary untyped; if assigning it to the `Snapshot` parameter errors, validate/narrow with a small structural check in `deliver.ts` (a `decodeSnapshotPayload` helper following the `isRecord` conventions in `types.ts`) rather than casting.

- [ ] **Step 6: Build + test the package**

Run: `moon run composer-crx:build && moon run composer-crx:test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/apps/composer-crx
git commit -m "feat(composer-crx): background delivery for picker snapshots"
```

---

### Task 7: composer-crx — registry-driven picker

**Files:**

- Modify: `packages/apps/composer-crx/src/picker/picker.ts`
- Modify: `packages/apps/composer-crx/src/picker/index.ts`
- Modify: `packages/apps/composer-crx/src/picker/harvest.ts`
- Modify: `packages/apps/composer-crx/src/picker/debug-preview.ts`
- Delete: `packages/apps/composer-crx/src/picker/kinds.ts`
- Modify: `packages/apps/composer-crx/src/content.ts`
- Modify: `packages/apps/composer-crx/src/typings.d.ts`

- [ ] **Step 1: Retype harvest to the Snapshot shapes**

In `packages/apps/composer-crx/src/picker/harvest.ts`, change the import:

```ts
import { type SnapshotHints, type SnapshotSelection } from '../page-actions/types';
```

and the return types: `harvestSelection(element: Element): SnapshotSelection`, `harvestHints(doc: Document): SnapshotHints`. Bodies unchanged.

Run: `moon run composer-crx:test -- src/picker/harvest.test.ts`
Expected: PASS (shapes are structurally identical).

- [ ] **Step 2: Parameterize the picker toolbar**

In `packages/apps/composer-crx/src/picker/picker.ts`:

- Remove `import { type ClipKind } from '../clip';` and `import { CLIP_KINDS, type ClipKindDef } from './kinds';`.
- Add:

```ts
/**
 * A toolbar entry offered after the user freezes an element. Mirrors the
 * page-action descriptor fields the picker needs (id for invocation, label +
 * phosphor icon for rendering).
 */
export type PickerAction = {
  id: string;
  label: string;
  icon: string;
};
```

- Change `PickerResult`:

```ts
export type PickerResult = { status: 'picked'; element: Element; actionId: string } | { status: 'cancelled' };
```

- Change the signature to `export const startPicker = (actions: readonly PickerAction[]): Promise<PickerResult> => {` (the `active` idempotency guard is unchanged — a second call while one is active returns the in-flight promise and ignores the new list).
- `populateToolbar`:

```ts
const populateToolbar = (entries: readonly PickerAction[], el: Element) => {
  toolbar.root.replaceChildren();
  for (const entry of entries) {
    toolbar.append(
      createButton(entry.label, entry.icon, () => finish({ status: 'picked', element: el, actionId: entry.id })),
    );
  }
  toolbar.append(createButton('Cancel', null, () => finish({ status: 'cancelled' })));
};
```

- `freeze(el)` calls `populateToolbar(actions, el)`.

- [ ] **Step 3: Replace pickAndHarvest with pickSnapshot**

Replace the body of `packages/apps/composer-crx/src/picker/index.ts` with:

```ts
//
// Copyright 2026 DXOS.org
//

import { getActionsForUrl } from '../page-actions/registry';
import { type Snapshot } from '../page-actions/types';
import { harvestFavicon, harvestHints, harvestSelection } from './harvest';
import { startPicker } from './picker';

export * from './picker';
export * from './harvest';

export type PickedSnapshot = {
  actionId: string;
  snapshot: Snapshot;
};

/**
 * Run the picker → harvest flow in the active tab. The toolbar offers the
 * cached picker-context page actions for this URL; the chosen action id and
 * the harvested snapshot are returned for delivery. Returns `null` when the
 * user cancels or no picker actions are registered yet.
 */
export const pickSnapshot = async (): Promise<PickedSnapshot | null> => {
  const actions = await getActionsForUrl(window.location.href, 'picker');
  if (actions.length === 0) {
    return null;
  }

  const result = await startPicker(actions.map(({ id, label, icon }) => ({ id, label, icon })));
  if (result.status !== 'picked') {
    return null;
  }

  return {
    actionId: result.actionId,
    snapshot: {
      source: {
        url: window.location.href,
        title: document.title,
        favicon: harvestFavicon(document),
        clippedAt: new Date().toISOString(),
      },
      selection: harvestSelection(result.element),
      hints: harvestHints(document),
    },
  };
};
```

Delete `packages/apps/composer-crx/src/picker/kinds.ts` (`git rm`).

NOTE: `registry.ts` reads `browser.storage.local` — available to content scripts (the extension has the `storage` permission; verify in `packages/apps/composer-crx/manifest*` config and report if absent). Its module-level `defaultRegistryApi` references `browser.tabs` only inside lazy closures, so importing it from the content script is safe.

- [ ] **Step 4: Generalize the debug preview**

In `packages/apps/composer-crx/src/picker/debug-preview.ts`:

- Remove the Clip import; change the signature to:

```ts
export const showDebugPreview = (title: string, payload: unknown): Promise<boolean> => {
```

- Replace `title.textContent = \`Debug: Clip preview (${clip.kind})\`;`with`title.textContent = \`Debug: ${title}\`;`— rename the inner`title`DOM element variable to`heading` to avoid shadowing the new parameter.
- Replace `JSON.stringify(clip, null, 2)` with `JSON.stringify(payload, null, 2)`.
- Update the doc comment (payload preview, not Clip preview).

- [ ] **Step 5: Rewire the content script's start-picker handler**

In `packages/apps/composer-crx/src/content.ts`:

- Replace the `pickAndHarvest` import with `pickSnapshot`, and add `PAGE_ACTION_DELIVER_MESSAGE_TYPE` to the `./page-actions` import.
- Replace the `onMessage('start-picker', ...)` handler with:

```ts
onMessage('start-picker', async () => {
  const picked = await pickSnapshot();
  if (!picked) {
    log.info('picker cancelled or no picker actions available');
    return { picked: false };
  }

  log.info('snapshot picked', { actionId: picked.actionId, url: picked.snapshot.source.url });

  // When `developer-mode` is on, show the serialized JSON before delivery so
  // the user can inspect (and copy) the payload independently of Composer.
  const debug = Boolean(await getProp(DEVELOPER_MODE_PROP));
  if (debug) {
    const confirmed = await showDebugPreview(picked.actionId, picked);
    if (!confirmed) {
      log.info('delivery cancelled by user (debug)');
      return { picked: true };
    }
  }

  try {
    const response = await browser.runtime.sendMessage({
      type: PAGE_ACTION_DELIVER_MESSAGE_TYPE,
      actionId: picked.actionId,
      snapshot: picked.snapshot,
    });
    log.info('snapshot delivered to background', { response });
  } catch (err) {
    log.catch(err);
  }
  return { picked: true };
});
```

- Delete the now-unused `deliverToBackground` function and `BACKGROUND_CLIP_MSG_TYPE` constant. (The clip bridge `installBridge` and its imports are removed in Task 8 — leave them this task ONLY if removing them here would break compilation; they are independent, so remove `deliverToBackground` now.)

- [ ] **Step 6: Update the webext-bridge protocol typing**

In `packages/apps/composer-crx/src/typings.d.ts` (read the whole file first): change the `'start-picker'` entry to:

```ts
'start-picker': ProtocolWithReturn<Record<string, never>, { picked: boolean }>;
```

Remove the `Clip`/`ClipAck` imports and re-exports if nothing else in the file needs them; if `DeliverResult` is re-exported, remove that too (its source is deleted in Task 8 — verify with `grep -rn "from './typings'" packages/apps/composer-crx/src`).

- [ ] **Step 7: Build + test**

Run: `moon run composer-crx:build && moon run composer-crx:test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A packages/apps/composer-crx
git commit -m "feat(composer-crx): registry-driven picker delivering page-action snapshots"
```

---

### Task 8: composer-crx — delete clip machinery

**Files:**

- Delete: `packages/apps/composer-crx/src/clip/` (whole directory: `index.ts`, `pipeline.ts`, `types.ts`)
- Modify: `packages/apps/composer-crx/src/bridge/sender.ts`
- Modify: `packages/apps/composer-crx/src/content.ts`
- Modify: `packages/apps/composer-crx/src/background.ts`
- Modify: `packages/apps/composer-crx/src/proxy/handler.test.ts`

- [ ] **Step 1: Delete the clip directory**

```bash
git rm -r packages/apps/composer-crx/src/clip
```

- [ ] **Step 2: Strip the clip path from sender.ts**

In `packages/apps/composer-crx/src/bridge/sender.ts`, remove: the `Clip`/`ClipAck` import, `DeliverResult`, `BRIDGE_MSG_TYPE`, `DEFAULT_TIMEOUT_MS`, `isClipAck`, and `deliverClip`. KEEP `lastUsedTabId` and its `scoreTab` branch — `focusOrOpenComposerTab` (added on this branch) sets it, so it is live. Keep `findComposerTab`, `pickBestTab`, `scoreTab`, `matchPatternToUrl`, `focusOrOpenComposerTab`, `openComposerTab`, and the `log` import (`openComposerTab` uses `log.warn`).

- [ ] **Step 3: Remove the clip bridge from content.ts**

In `packages/apps/composer-crx/src/content.ts`: delete `installBridge` and its call in `main()`, the `CLIP_ACK_EVENT, CLIP_EVENT, type Clip, type ClipAck` import, and the `BRIDGE_MSG_TYPE` constant. Update the file-top doc comment: the content script hosts the DOM picker and the page-actions/search-proxy relays (drop the clip-bridge sentences).

- [ ] **Step 4: Remove the clip handler from background.ts**

In `packages/apps/composer-crx/src/background.ts`: delete `handleIncomingClip`, the `BACKGROUND_CLIP_MSG_TYPE` constant and its `onMessage` listener, the `deliverClip` import (keep `focusOrOpenComposerTab`, which the `open-composer` handler uses), and the `type Clip` import.

- [ ] **Step 5: Fix the proxy test's foreign-message fixture**

In `packages/apps/composer-crx/src/proxy/handler.test.ts` (~line 93), the test sends `{ type: 'composer-crx:deliver-clip' }` as an example of a message the proxy must ignore. Replace the string with `'composer-crx:unrelated-message'` (the literal is only a foreign discriminator; keep the test).

- [ ] **Step 6: Sweep for stragglers, build, test, lint**

Run: `grep -rn "clip" packages/apps/composer-crx/src --include="*.ts*" -i | grep -v "clippedAt\|clipboard\|clip.button\|Clipped from"`
Expected: no hits referencing the deleted machinery (the popup's `clip.button` label and `Chat.tsx` `onClip` prop stay — the button still starts the picker).

Run: `moon run composer-crx:build && moon run composer-crx:test && moon run composer-crx:lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A packages/apps/composer-crx
git commit -m "refactor(composer-crx): remove legacy clip channel"
```

---

### Task 9: Full verification

- [ ] **Step 1: Repo-wide checks**

```bash
grep -rn "composer:clip\|deliver-clip\|deliverClip\|CLIP_KINDS\|ClipKind\|installClipListener\|runClipPipeline" packages --include="*.ts*"
```

Expected: no output.

- [ ] **Step 2: Cast audit (required by project CLAUDE.md)**

```bash
git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'
```

Expected: no NEW casts introduced by this branch (pre-existing moved lines excepted — justify each remaining hit in the summary).

- [ ] **Step 3: Build, test, lint the three packages + dependents**

```bash
moon run plugin-crx:build plugin-bookmarks:build composer-crx:build
moon run plugin-crx:test plugin-bookmarks:test composer-crx:test
moon run plugin-crx:lint plugin-bookmarks:lint composer-crx:lint
```

Expected: PASS. Then check nothing else in the repo imported the deleted symbols:

```bash
moon exec --on-failure continue --quiet :build
```

Expected: PASS (filter out DEPOT_TOKEN warnings).

- [ ] **Step 4: Run prettier**

```bash
pnpm format
```

- [ ] **Step 5: Final commit (if format/lint touched files)**

```bash
git status
git add -A
git commit -m "chore: format"
```

- [ ] **Step 6: Manual verification handoff**

The only step requiring a human: load the unpacked extension in Chrome against a running Composer dev server, open a Composer tab (so the registry populates), click Clip on an article, pick an element, choose **Bookmark**, and confirm the bookmark (title, favicon, picked-text excerpt) appears in the active space. Also verify Person/Organization/Note picker buttons still create their objects. Report this as a single batched ask at the end.
