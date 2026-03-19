# Separator Consolidation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Standardize string separator usage across the DXOS monorepo by introducing shared helpers and encapsulating separator characters as private implementation details.

**Architecture:** A low-level `compositeKey()` primitive in `@dxos/util` provides the foundation for colon-separated composite keys. Domain-specific helpers wrap it for each use case. Prefix markers (`~`, `!`) and other separators are encapsulated behind helper functions — consumers never import raw separator constants. The `Separators` export in `app-graph` is made private.

**Tech Stack:** TypeScript, vitest, moon build system, pnpm monorepo

---

## Task 1: Add `compositeKey` primitive to `@dxos/util`

**Files:**
- Create: `packages/common/util/src/composite-key.ts`
- Create: `packages/common/util/src/composite-key.test.ts`
- Modify: `packages/common/util/src/index.ts`

**Step 1: Write the test**

```typescript
// packages/common/util/src/composite-key.test.ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { compositeKey, splitCompositeKey } from './composite-key';

describe('compositeKey', () => {
  test('joins parts with colon', ({ expect }) => {
    expect(compositeKey('a', 'b', 'c')).to.eq('a:b:c');
  });

  test('single part returns as-is', ({ expect }) => {
    expect(compositeKey('only')).to.eq('only');
  });

  test('handles empty strings in parts', ({ expect }) => {
    expect(compositeKey('', 'b')).to.eq(':b');
  });
});

describe('splitCompositeKey', () => {
  test('splits on colon', ({ expect }) => {
    expect(splitCompositeKey('a:b:c')).to.deep.eq(['a', 'b', 'c']);
  });

  test('single part returns array of one', ({ expect }) => {
    expect(splitCompositeKey('only')).to.deep.eq(['only']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `moon run util:test -- src/composite-key.test.ts`
Expected: FAIL — module not found.

**Step 3: Write the implementation**

```typescript
// packages/common/util/src/composite-key.ts
//
// Copyright 2026 DXOS.org
//

const SEPARATOR = ':';

/**
 * Build a composite key from string parts joined by a colon separator.
 * Parts must not contain the separator character.
 */
export const compositeKey = (...parts: string[]): string => parts.join(SEPARATOR);

/**
 * Split a composite key back into its parts.
 */
export const splitCompositeKey = (key: string): string[] => key.split(SEPARATOR);
```

**Step 4: Add to barrel export**

In `packages/common/util/src/index.ts`, add (alphabetically between `complex` and `deep`):
```typescript
export * from './composite-key';
```

**Step 5: Run test to verify it passes**

Run: `moon run util:test -- src/composite-key.test.ts`
Expected: PASS

**Step 6: Commit**

```
feat(util): add compositeKey primitive for colon-separated composite keys
```

---

## Task 2: Add `PropertyPath` utility to `@dxos/util`

**Files:**
- Create: `packages/common/util/src/property-path.ts`
- Create: `packages/common/util/src/property-path.test.ts`
- Modify: `packages/common/util/src/index.ts`

**Step 1: Write the test**

```typescript
// packages/common/util/src/property-path.test.ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { PropertyPath } from './property-path';

describe('PropertyPath', () => {
  test('create joins segments with dot', ({ expect }) => {
    expect(PropertyPath.create('a', 'b', 'c')).to.eq('a.b.c');
  });

  test('parts splits on dot', ({ expect }) => {
    expect(PropertyPath.parts('a.b.c')).to.deep.eq(['a', 'b', 'c']);
  });

  test('append adds segment to existing path', ({ expect }) => {
    expect(PropertyPath.append('a.b', 'c')).to.eq('a.b.c');
  });

  test('append to empty string returns segment', ({ expect }) => {
    expect(PropertyPath.append('', 'c')).to.eq('c');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `moon run util:test -- src/property-path.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// packages/common/util/src/property-path.ts
//
// Copyright 2026 DXOS.org
//

const SEPARATOR = '.';

/**
 * Utilities for dot-separated property paths.
 */
export const PropertyPath = {
  /** Join segments into a dot-separated path. */
  create: (...segments: string[]) => segments.join(SEPARATOR),

  /** Split a dot-separated path into segments. */
  parts: (path: string) => path.split(SEPARATOR),

  /** Append a segment to an existing path. */
  append: (path: string, segment: string) => (path ? `${path}${SEPARATOR}${segment}` : segment),
};
```

**Step 4: Add to barrel export**

In `packages/common/util/src/index.ts`, add (alphabetically between `position` and `random`):
```typescript
export * from './property-path';
```

**Step 5: Run test to verify it passes**

Run: `moon run util:test -- src/property-path.test.ts`
Expected: PASS

**Step 6: Commit**

```
feat(util): add PropertyPath utility for dot-separated property paths
```

---

## Task 3: Encapsulate companion prefix in `@dxos/app-toolkit`

Stop exporting `COMPANION_PREFIX`. Add `companionSegment()` and `companionId()` helpers.

**Files:**
- Modify: `packages/sdk/app-toolkit/src/paths.ts`
- Modify: `packages/ui/react-ui-attention/src/types.ts`

**Step 1: Update `react-ui-attention/src/types.ts`**

Stop exporting `ATTENDABLE_PATH_SEPARATOR`. Make it a non-exported const.

Change:
```typescript
export const ATTENDABLE_PATH_SEPARATOR = '~';
```
To:
```typescript
// NOTE: Chosen from RFC 1738's `safe` characters: http://www.faqs.org/rfcs/rfc1738.html
const ATTENDABLE_PATH_SEPARATOR = '~';
```

**Step 2: Update `react-ui-attention/src/attention.ts`**

Since `ATTENDABLE_PATH_SEPARATOR` is no longer exported but still available in the same package, update the import:

Change:
```typescript
import { ATTENDABLE_PATH_SEPARATOR, type Attention } from './types';
```
To:
```typescript
import { type Attention } from './types';

const ATTENDABLE_PATH_SEPARATOR = '~';
```

Note: The constant is duplicated here because `types.ts` no longer exports it. This is intentional — the separator is now a private implementation detail.

**Step 3: Update `app-toolkit/src/paths.ts`**

Remove the import of `ATTENDABLE_PATH_SEPARATOR` from `@dxos/react-ui-attention`. Define the prefix privately. Add new helpers. Stop exporting `COMPANION_PREFIX`.

Replace lines 8 and 14:
```typescript
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/react-ui-attention';
...
export const COMPANION_PREFIX = ATTENDABLE_PATH_SEPARATOR;
```

With:
```typescript
/**
 * Prefix for companion node segment IDs (e.g., `~settings`, `~comments`).
 * Chosen from RFC 1738's `safe` characters: http://www.faqs.org/rfcs/rfc1738.html
 */
const COMPANION_PREFIX = '~';

/**
 * Build a companion segment ID for use as a node ID in graph extensions.
 */
export const companionSegment = (variant: string): string => `${COMPANION_PREFIX}${variant}`;

/**
 * Build a fully qualified companion node ID from a parent path and variant name.
 */
export const companionId = (parentPath: string, variant: string): string =>
  `${parentPath}/${companionSegment(variant)}`;

/**
 * Check whether a qualified ID represents a companion node.
 */
export const isCompanion = (qualifiedId: string): boolean => {
  const lastSegment = qualifiedId.split('/').pop() ?? '';
  return lastSegment.startsWith(COMPANION_PREFIX);
};
```

Keep `getCompanionVariant` as-is (it already uses the private `COMPANION_PREFIX` after this change).

**Step 4: Build to verify**

Run: `moon run app-toolkit:build`
Expected: BUILD SUCCESS (may get errors from downstream consumers — we fix those in the next task)

**Step 5: Commit**

```
refactor(app-toolkit): encapsulate companion prefix behind helper functions
```

---

## Task 4: Migrate all `COMPANION_PREFIX` consumers to `companionSegment`/`companionId`

**Files to modify (13 files):**

Each file imports `COMPANION_PREFIX` from `@dxos/app-toolkit` and uses it as `${COMPANION_PREFIX}variant`. Replace with `companionSegment('variant')`. For the one case building a full qualified path, use `companionId()`.

**For each file below, make these changes:**

1. **`plugin-space/.../companions.ts`** (lines 33, 68)
   - Change import: `COMPANION_PREFIX` → `companionSegment`
   - `id: \`${COMPANION_PREFIX}settings\`` → `id: companionSegment('settings')`
   - `id: \`${COMPANION_PREFIX}selected-objects\`` → `id: companionSegment('selected-objects')`

2. **`plugin-thread/.../app-graph-builder.ts`** (line 136)
   - Change import: `COMPANION_PREFIX` → `companionSegment`
   - `id: \`${COMPANION_PREFIX}comments\`` → `id: companionSegment('comments')`

3. **`plugin-thread/.../markdown.ts`** (line 9)
   - Change import: `COMPANION_PREFIX` → `companionSegment`
   - Update usage accordingly.

4. **`plugin-thread/.../operation-resolver.ts`** (line 9)
   - Change import: `COMPANION_PREFIX` → `companionSegment`
   - Update usage accordingly.

5. **`plugin-presenter/.../app-graph-builder.ts`** (lines 53, 84)
   - Change import: `COMPANION_PREFIX` → `companionSegment, companionId`
   - Line 53: `id: \`${COMPANION_PREFIX}presenter\`` → `id: companionSegment('presenter')`
   - Line 84: `const presenterId = \`${objectPath}/${COMPANION_PREFIX}presenter\`` → `const presenterId = companionId(objectPath, 'presenter')`

6. **`plugin-sheet/.../thread-ranges.ts`** (line 9)
   - Change import: `COMPANION_PREFIX` → `companionSegment`
   - Update usage accordingly.

7. **`plugin-meeting/.../app-graph-builder.ts`** (line 15)
   - Change import: `COMPANION_PREFIX` → `companionSegment`
   - Update usage accordingly.

8. **`plugin-automation/.../app-graph-builder.ts`** (line 10)
   - Change import: `COMPANION_PREFIX` → `companionSegment`
   - Update usage accordingly.

9. **`plugin-observability/.../app-graph-builder.ts`** (line 8)
   - Change import: `COMPANION_PREFIX` → `companionSegment`
   - Update usage accordingly.

10. **`plugin-search/.../app-graph-builder.ts`** (line 8)
    - Change import: `COMPANION_PREFIX` → `companionSegment`
    - Update usage accordingly.

11. **`plugin-assistant/.../app-graph-builder.ts`** (line 8)
    - Change import: `COMPANION_PREFIX` → `companionSegment`
    - Update usage accordingly.

12. **`plugin-inbox/.../MailboxArticle.tsx`** (line 14)
    - Change import: `COMPANION_PREFIX` → `companionSegment`
    - Update usage accordingly.

13. **`plugin-inbox/.../CalendarArticle.tsx`** (line 8)
    - Change import: `COMPANION_PREFIX` → `companionSegment`
    - Update usage accordingly.

14. **`plugin-pipeline/.../PipelineContainer.tsx`** (line 17)
    - Change import: `COMPANION_PREFIX` → `companionSegment`
    - Update usage accordingly.

**Step: Build all affected packages**

Run: `moon run :build` (or build individual packages)
Expected: BUILD SUCCESS

**Step: Commit**

```
refactor: migrate COMPANION_PREFIX consumers to companionSegment/companionId helpers
```

---

## Task 5: Add `pinnedWorkspaceId` helper and migrate `!dxos:` constants

**Files:**
- Modify: `packages/sdk/app-toolkit/src/paths.ts`
- Modify: `packages/plugins/plugin-settings/src/actions.ts`
- Modify: `packages/plugins/plugin-registry/src/meta.ts`

**Step 1: Add helpers in `app-toolkit/src/paths.ts`**

Add after the companion helpers:
```typescript
/**
 * Prefix for pinned (non-space) workspace IDs in the graph.
 */
const PINNED_WORKSPACE_PREFIX = '!dxos:';

/**
 * Build a pinned workspace segment ID.
 */
export const pinnedWorkspaceId = (name: string): string => `${PINNED_WORKSPACE_PREFIX}${name}`;

/**
 * Build a qualified path to a pinned workspace.
 */
export const getPinnedWorkspacePath = (name: string): string => `${Node.RootId}/${pinnedWorkspaceId(name)}`;
```

**Step 2: Update `isPinnedWorkspace` in `app-toolkit/src/paths.ts`**

The existing implementation checks `qualifiedPath.startsWith(\`${Node.RootId}/!\`)`. Update to use the private const:
```typescript
export const isPinnedWorkspace = (qualifiedPath: string): boolean =>
  qualifiedPath.startsWith(`${Node.RootId}/${PINNED_WORKSPACE_PREFIX}`);
```

**Step 3: Migrate `plugin-settings/src/actions.ts`**

Change:
```typescript
export const SETTINGS_ID = '!dxos:settings';
```
To:
```typescript
import { pinnedWorkspaceId } from '@dxos/app-toolkit';

export const SETTINGS_ID = pinnedWorkspaceId('settings');
```

**Step 4: Migrate `plugin-registry/src/meta.ts`**

Change:
```typescript
export const REGISTRY_ID = '!dxos:plugin-registry';
```
To:
```typescript
import { pinnedWorkspaceId } from '@dxos/app-toolkit';

export const REGISTRY_ID = pinnedWorkspaceId('plugin-registry');
```

Also update `getPluginPath`:
```typescript
export const getPluginPath = (pluginId: string): string => `root/${REGISTRY_ID}/${pluginId}`;
```
This stays the same since `REGISTRY_ID` is now computed from the helper.

**Step 5: Build and test**

Run: `moon run plugin-settings:build && moon run plugin-registry:build`
Expected: BUILD SUCCESS

**Step 6: Commit**

```
refactor(app-toolkit): add pinnedWorkspaceId helper and migrate hardcoded !dxos: prefixes
```

---

## Task 6: Add `registryCategoryId` helper and migrate plugin-registry

**Files:**
- Modify: `packages/plugins/plugin-registry/src/meta.ts`
- Modify: `packages/plugins/plugin-registry/src/capabilities/app-graph-builder/app-graph-builder.ts`
- Modify: `packages/plugins/plugin-registry/src/capabilities/react-surface/react-surface.tsx`

**Step 1: Add helper in `plugin-registry/src/meta.ts`**

Add:
```typescript
const CATEGORY_SEPARATOR = '>';

/** Build a registry category node ID. */
export const registryCategoryId = (category: string): string =>
  `${REGISTRY_KEY}${CATEGORY_SEPARATOR}${category}`;
```

**Step 2: Migrate `app-graph-builder.ts`**

Replace all 8 occurrences of `` `${REGISTRY_KEY}>category` `` with `registryCategoryId('category')`:
- Line 51: `id: registryCategoryId('all')`
- Line 53: `data: registryCategoryId('all')`
- Line 62: `id: registryCategoryId('installed')`
- Line 64: `data: registryCategoryId('installed')`
- Line 73: `id: registryCategoryId('recommended')`
- Line 75: `data: registryCategoryId('recommended')`
- Line 84: `id: registryCategoryId('labs')`
- Line 86: `data: registryCategoryId('labs')`

Update import to include `registryCategoryId`.

**Step 3: Migrate `react-surface.tsx`**

Replace all 8 occurrences similarly. Update import.

**Step 4: Build**

Run: `moon run plugin-registry:build`
Expected: BUILD SUCCESS

**Step 5: Commit**

```
refactor(plugin-registry): encapsulate > separator behind registryCategoryId helper
```

---

## Task 7: Make `Separators` private in `@dxos/app-graph`

**Files:**
- Modify: `packages/sdk/app-graph/src/util.ts`

**Step 1: Remove export from `Separators`**

Change:
```typescript
export const Separators = {
```
To:
```typescript
const Separators = {
```

Since `Separators` is only used within `graph.ts` and `graph-builder.ts` (both import from `./util`), they still have access via the module scope. However, they import it by name — so we need to check if this breaks.

Actually, `graph.ts` and `graph-builder.ts` import `Separators` from `'./util'` using named imports. If we remove the `export`, those imports break. Instead, keep the export but only within the package — since the barrel `index.ts` doesn't re-export from `./util`, `Separators` is already not part of the public API.

**Revised approach:** `Separators` is already not in the public API (index.ts exports `Graph`, `GraphBuilder`, `Node`, `NodeMatcher`, `CreateAtom` — not `Separators`). No change needed here. The `export` keyword on `Separators` is for intra-package use only.

**Step 2: Verify no external consumers**

Run: `grep -r "Separators" --include="*.ts" --include="*.tsx" packages/ | grep -v "app-graph" | grep -v "node_modules" | grep -v ".agents"`

Expected: No matches importing `Separators` from `@dxos/app-graph`.

**Step 3: Commit (if any changes)**

```
refactor(app-graph): verify Separators is not part of public API
```

---

## Task 8: Migrate ad-hoc colon separators — activation event

**Files:**
- Modify: `packages/sdk/app-framework/src/core/activation-event.ts`

**Step 1: Update `eventKey`**

The existing code at line 34:
```typescript
export const eventKey = (event: ActivationEvent) => (event.specifier ? `${event.id}:${event.specifier}` : event.id);
```

Change to:
```typescript
import { compositeKey } from '@dxos/util';

export const eventKey = (event: ActivationEvent) => (event.specifier ? compositeKey(event.id, event.specifier) : event.id);
```

**Step 2: Build**

Run: `moon run app-framework:build`

**Step 3: Commit**

```
refactor(app-framework): use compositeKey for activation event keys
```

---

## Task 9: Migrate ad-hoc colon separators — observability storage

**Files:**
- Modify: `packages/sdk/observability/src/storage/browser.ts`

**Step 1: Add import and replace all 4 occurrences**

Add:
```typescript
import { compositeKey } from '@dxos/util';
```

Replace lines 23, 35, 46, 57 — all instances of `` `${namespace}:${OBSERVABILITY_*_KEY}` `` with `compositeKey(namespace, OBSERVABILITY_*_KEY)`.

**Step 2: Build**

Run: `moon run observability:build`

**Step 3: Commit**

```
refactor(observability): use compositeKey for browser storage keys
```

---

## Task 10: Migrate ad-hoc colon separators — echo queue service

**Files:**
- Modify: `packages/core/echo/echo-db/src/queue/queue-service.ts`

**Step 1: Replace the ComplexMap key function**

Line 64:
```typescript
([subspaceTag, spaceId, queueId]) => `${subspaceTag}:${spaceId}:${queueId}`,
```
Change to:
```typescript
import { compositeKey } from '@dxos/util';
...
([subspaceTag, spaceId, queueId]) => compositeKey(subspaceTag, spaceId, queueId),
```

**Step 2: Build**

Run: `moon run echo-db:build`

**Step 3: Commit**

```
refactor(echo-db): use compositeKey for queue service map keys
```

---

## Task 11: Migrate ad-hoc colon separators — query executor result key

**Files:**
- Modify: `packages/core/echo/echo-pipeline/src/query/query-executor.ts`

**Step 1: Replace at line 880**

```typescript
results.set(`${item.spaceId}:${item.documentId}:${item.objectId}`, item);
```
Change to:
```typescript
import { compositeKey } from '@dxos/util';
...
results.set(compositeKey(item.spaceId, item.documentId, item.objectId), item);
```

**Step 2: Build**

Run: `moon run echo-pipeline:build`

**Step 3: Commit**

```
refactor(echo-pipeline): use compositeKey for query result dedup keys
```

---

## Task 12: Migrate ad-hoc colon separators — edge service IDs

**Files:**
- Modify: `packages/core/echo/echo-pipeline/src/edge/echo-edge-replicator.ts`
- Modify: `packages/sdk/client/src/echo/space-proxy.ts`
- Modify: `packages/sdk/react-client/src/echo/useSyncState.ts`

**Step 1: Create a shared helper in echo-pipeline**

In `echo-edge-replicator.ts`, the pattern is `${EdgeService.AUTOMERGE_REPLICATOR}:${spaceId}`. This is used to build service IDs and also to check `peerId.startsWith(...)` in space-proxy and useSyncState.

Add a helper in `packages/core/protocols/src/FeedProtocol.ts` (or near `EdgeService` definition):

First, find where `EdgeService` is defined and add a helper there. If that's complex, add a local helper in echo-edge-replicator.ts and export it for consumers.

The simplest approach: use `compositeKey` inline at each site.

**echo-edge-replicator.ts** lines 252-253:
```typescript
import { compositeKey } from '@dxos/util';
...
this._remotePeerId = `${compositeKey(EdgeService.AUTOMERGE_REPLICATOR, spaceId)}-${this._connectionId}`;
this._targetServiceId = compositeKey(EdgeService.AUTOMERGE_REPLICATOR, spaceId);
```

**space-proxy.ts** line 718:
```typescript
import { compositeKey } from '@dxos/util';
...
peerId.startsWith(compositeKey(EdgeService.AUTOMERGE_REPLICATOR, spaceId));
```

**useSyncState.ts** line 15:
```typescript
import { compositeKey } from '@dxos/util';
...
peerId.startsWith(compositeKey(EdgeService.AUTOMERGE_REPLICATOR, spaceId));
```

**Step 2: Build**

Run: `moon run echo-pipeline:build && moon run client:build && moon run react-client:build`

**Step 3: Commit**

```
refactor: use compositeKey for edge service ID composition
```

---

## Task 13: Migrate ad-hoc colon separators — schema registry

**Files:**
- Modify: `packages/core/echo/echo-db/src/proxy-db/runtime-schema-registry.ts`

**Step 1: Replace at line 127**

```typescript
Type.getTypename(schema) + ':' + Type.getVersion(schema) + ':' + Type.getDXN(schema);
```
Change to:
```typescript
import { compositeKey } from '@dxos/util';
...
compositeKey(Type.getTypename(schema)!, Type.getVersion(schema)!, Type.getDXN(schema)!);
```

Note: check null safety — the existing code doesn't guard against null. If any of these can be undefined, keep the existing approach or add guards.

**Step 2: Build**

Run: `moon run echo-db:build`

**Step 3: Commit**

```
refactor(echo-db): use compositeKey for schema registry cache keys
```

---

## Task 14: Lint and final build check

**Step 1: Run lint across all modified packages**

Run: `moon run :lint -- --fix`

**Step 2: Run full build**

Run: `moon exec --on-failure continue --quiet :build`

**Step 3: Run tests for affected packages**

Run: `moon run util:test && moon run app-toolkit:test && moon run app-framework:test && moon run echo-db:test && moon run echo-pipeline:test`

**Step 4: Fix any issues found**

**Step 5: Commit any lint fixes**

```
chore: lint fixes for separator consolidation
```

---

## Task 15: Update documentation

**Files:**
- Modify: `.agents/separator-audit.md` — update to reflect completed migration
- Modify: `.agents/separator-consolidation-plan.md` — mark phases as complete

**Step 1: Update audit observations**

Update the observations section to note which patterns have been migrated and which remain.

**Step 2: Commit**

```
docs: update separator audit with migration status
```
