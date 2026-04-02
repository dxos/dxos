# Rename SpaceProperties Typename Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename the `SpaceProperties` typename from kebab-case (`org.dxos.type.space-properties`) to camelCase (`org.dxos.type.spaceProperties`) with a migration and backwards-compatible loading.

**Architecture:** Define a legacy `LegacySpaceProperties` schema with the old typename for migration purposes. Use Echo's `defineObjectMigration` + `ClientCapabilities.Migration` capability to automatically migrate objects. Update `findInlineObjectOfType` call sites in `data-space-manager.ts` to check both typenames so spaces load before migration runs.

**Tech Stack:** Effect Schema, ECHO object migrations, app-framework capabilities

---

### Task 1: Add LegacySpaceProperties and rename typename

**Files:**

- Modify: `packages/sdk/client-protocol/src/types/SpaceProperties.ts`

**Step 1: Add `LegacySpaceProperties` schema and update typename**

The legacy schema keeps the old typename for migration. The current `SpaceProperties` gets the new camelCase typename.

```typescript
// After the SpacePropertiesSchema definition and type export (line 36), add:

export const LegacySpaceProperties = SpacePropertiesSchema.pipe(
  Type.object({
    typename: 'org.dxos.type.space-properties',
    version: '0.1.0',
  }),
  Annotation.SystemTypeAnnotation.set(true),
);

export interface LegacySpaceProperties extends Schema.Schema.Type<typeof LegacySpaceProperties> {}
```

Then change the existing `SpaceProperties` typename from `'org.dxos.type.space-properties'` to `'org.dxos.type.spaceProperties'` (line 42).

**Step 2: Export `LegacySpaceProperties` from barrel files**

Add `LegacySpaceProperties` to the re-exports in:

- `packages/sdk/client-protocol/src/types/index.ts` — already exports `*` from `./SpaceProperties`, so no change needed.
- `packages/sdk/client/src/echo/index.ts:6` — add `LegacySpaceProperties` to the named import from `@dxos/client-protocol`.

**Step 3: Build and verify**

Run: `moon run client-protocol:build`
Expected: Build succeeds.

**Step 4: Commit**

```
feat(client-protocol): rename SpaceProperties typename to camelCase
```

---

### Task 2: Update data-space-manager to look up both typenames

**Files:**

- Modify: `packages/sdk/client-services/src/packlets/spaces/data-space-manager.ts`

**Step 1: Import `LegacySpaceProperties`**

Add `LegacySpaceProperties` to the existing import from `@dxos/client-protocol` (line 9).

**Step 2: Update diagnostics lookup (line 192)**

Change:

```typescript
const properties = rootDoc && findInlineObjectOfType(rootDoc, Type.getTypename(SpaceProperties));
```

To:

```typescript
const properties =
  rootDoc &&
  (findInlineObjectOfType(rootDoc, Type.getTypename(SpaceProperties)) ??
    findInlineObjectOfType(rootDoc, Type.getTypename(LegacySpaceProperties)));
```

**Step 3: Update default space detection (line 365)**

Change:

```typescript
const [_, properties] = findInlineObjectOfType(space.databaseRoot.doc()!, Type.getTypename(SpaceProperties)) ?? [];
```

To:

```typescript
const [_, properties] =
  findInlineObjectOfType(space.databaseRoot.doc()!, Type.getTypename(SpaceProperties)) ??
  findInlineObjectOfType(space.databaseRoot.doc()!, Type.getTypename(LegacySpaceProperties)) ??
  [];
```

**Step 4: Build and verify**

Run: `moon run client-services:build`
Expected: Build succeeds.

**Step 5: Commit**

```
fix(client-services): support both legacy and new SpaceProperties typenames during loading
```

---

### Task 3: Create migration capability in plugin-space

**Files:**

- Create: `packages/plugins/plugin-space/src/capabilities/migrations/index.ts`
- Create: `packages/plugins/plugin-space/src/capabilities/migrations/migrations.ts`
- Modify: `packages/plugins/plugin-space/src/capabilities/index.ts`

**Step 1: Create the capability index file**

Create `packages/plugins/plugin-space/src/capabilities/migrations/index.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Migrations = Capability.lazy('SpaceMigrations', () => import('./migrations'));
```

**Step 2: Create the migration module**

Create `packages/plugins/plugin-space/src/capabilities/migrations/migrations.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { LegacySpaceProperties, SpaceProperties } from '@dxos/client-protocol';
import { defineObjectMigration } from '@dxos/client/echo';
import { ClientCapabilities } from '@dxos/plugin-client';

const SpacePropertiesMigration = defineObjectMigration({
  from: LegacySpaceProperties,
  to: SpaceProperties,
  transform: async (from) => {
    const { id, ...rest } = from as any;
    return rest;
  },
  onMigration: async () => {},
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(ClientCapabilities.Migration, [SpacePropertiesMigration]);
  }),
);
```

**Step 3: Register in capabilities index**

Add to `packages/plugins/plugin-space/src/capabilities/index.ts`:

```typescript
export * from './migrations';
```

**Step 4: Build and verify**

Run: `moon run plugin-space:build`
Expected: Build succeeds.

**Step 5: Commit**

```
feat(plugin-space): add migration from legacy SpaceProperties typename
```

---

### Task 4: Fix hardcoded typename string in commentary template

**Files:**

- Modify: `packages/plugins/plugin-script/src/templates/commentary.ts:161`

**Step 1: Add import for SpaceProperties**

Add to imports (around line 17):

```typescript
import { SpaceProperties } from '@dxos/client-protocol';
```

Note: check if `@dxos/client-protocol` is already a dependency of `plugin-script`. If not, add `SpaceProperties` import from `@dxos/client/echo` instead, or check if `Type.getTypename` is available.

**Step 2: Replace hardcoded string**

Change line 161:

```typescript
const [properties] = yield * Database.runQuery(Filter.typename('org.dxos.type.space-properties'));
```

To:

```typescript
const [properties] = yield * Database.runQuery(Filter.typename(Type.getTypename(SpaceProperties)));
```

Note: This template is a string template for code generation. If `Filter.typename` is being used inside a string template literal that gets evaluated at runtime in a different context, we may need to inline the constant differently. Verify the template structure before making this change.

**Step 3: Build and verify**

Run: `moon run plugin-script:build`
Expected: Build succeeds.

**Step 4: Commit**

```
fix(plugin-script): replace hardcoded SpaceProperties typename with constant
```

---

### Task 5: Run tests

**Step 1: Run object migration tests**

Run: `moon run echo-db:test -- src/proxy-db/object-migration.test.ts`
Expected: All tests pass.

**Step 2: Run client-services tests**

Run: `moon run client-services:test`
Expected: Tests pass.

**Step 3: Run plugin-space build**

Run: `moon run plugin-space:build`
Expected: Build succeeds.

**Step 4: Run full lint check**

Run: `moon run :lint -- --fix` (scoped to changed packages)
Expected: No lint errors.

**Step 5: Commit any lint fixes**

```
style: fix lint issues
```

---

### Task 6: Update proto-guard snapshot

**Files:**

- Modify: `packages/e2e/proto-guard/data/snapshots/2026-03-12/expected.json`

The proto-guard snapshot contains hardcoded references to `dxn:type:org.dxos.type.space-properties:0.1.0`. This snapshot may need regeneration or the test may need updating to account for the new typename.

**Step 1: Check proto-guard test**

Run: `moon run proto-guard:test`
If it fails due to typename mismatch, regenerate the snapshot per the package's instructions.

**Step 2: Commit if needed**

```
chore(proto-guard): update snapshot for SpaceProperties typename change
```
