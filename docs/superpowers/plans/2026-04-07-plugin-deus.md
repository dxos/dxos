# plugin-deus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `@dxos/plugin-deus` — a DXOS plugin with a `Spec` type (containing a `Text` object) and a `SpecArticle` container that renders a `react-ui-editor` `Editor`.

**Architecture:** The plugin follows the standard DXOS plugin pattern (`plugin-template` / `plugin-sketch` baseline). A `Spec` ECHO object holds a `Ref<Text.Text>` for its content. `SpecArticle` subscribes to that ref via `useObject` and renders a read-write `Editor.Root` / `Editor.Content` from `@dxos/react-ui-editor`.

**Tech Stack:** Effect Schema, `@dxos/echo`, `@dxos/react-client/echo`, `@dxos/react-ui-editor`, `@dxos/app-framework`, `@dxos/app-toolkit`, `@dxos/plugin-space`, TailwindCSS / `@dxos/react-ui`.

---

## File Map

| File | Purpose |
|------|---------|
| `package.json` | Package manifest with deps and subpath imports |
| `moon.yml` | Moon build config |
| `tsconfig.json` | TypeScript project references |
| `src/meta.ts` | Plugin metadata (id, name, icon) |
| `src/translations.ts` | i18n strings for Spec typename |
| `src/types/Spec.ts` | `Spec` Effect Schema type + `make` factory + `isSpec` guard |
| `src/types/index.ts` | Re-exports from `types/` |
| `src/capabilities/react-surface.tsx` | `ReactSurface` capability — registers `SpecArticle` surface |
| `src/capabilities/index.ts` | Re-exports capabilities |
| `src/containers/SpecArticle/SpecArticle.tsx` | Container component |
| `src/containers/SpecArticle/index.ts` | Re-export |
| `src/containers/index.ts` | Re-exports from `containers/` |
| `src/DeusPlugin.tsx` | Plugin definition |
| `src/index.ts` | Public exports |

---

### Task 1: Package scaffold (package.json, moon.yml, tsconfig.json)

**Files:**
- Create: `packages/plugins/plugin-deus/package.json`
- Create: `packages/plugins/plugin-deus/moon.yml`
- Create: `packages/plugins/plugin-deus/tsconfig.json`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@dxos/plugin-deus",
  "version": "0.1.0",
  "description": "Deus plugin",
  "homepage": "https://dxos.org",
  "bugs": "https://github.com/dxos/dxos/issues",
  "repository": {
    "type": "git",
    "url": "https://github.com/dxos/dxos"
  },
  "license": "MIT",
  "author": "DXOS.org",
  "private": true,
  "sideEffects": true,
  "type": "module",
  "imports": {
    "#capabilities": "./src/capabilities/index.ts",
    "#containers": "./src/containers/index.ts",
    "#meta": "./src/meta.ts",
    "#types": "./src/types/index.ts"
  },
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/types/src/index.d.ts",
      "browser": "./dist/lib/browser/index.mjs"
    },
    "./types": {
      "source": "./src/types/index.ts",
      "types": "./dist/types/src/types/index.d.ts",
      "browser": "./dist/lib/browser/types/index.mjs"
    }
  },
  "types": "dist/types/src/index.d.ts",
  "typesVersions": {
    "*": {
      "types": [
        "dist/types/src/types/index.d.ts"
      ]
    }
  },
  "files": [
    "dist",
    "src"
  ],
  "dependencies": {
    "@dxos/app-framework": "workspace:*",
    "@dxos/app-toolkit": "workspace:*",
    "@dxos/echo": "workspace:*",
    "@dxos/operation": "workspace:*",
    "@dxos/plugin-space": "workspace:*",
    "@dxos/react-client": "workspace:*",
    "@dxos/react-ui": "workspace:*",
    "@dxos/react-ui-editor": "workspace:*",
    "@dxos/schema": "workspace:*",
    "@dxos/util": "workspace:*",
    "effect": "catalog:"
  },
  "devDependencies": {
    "@dxos/storybook-utils": "workspace:*",
    "@dxos/ui-theme": "workspace:*",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:",
    "vite": "catalog:"
  },
  "peerDependencies": {
    "@dxos/react-ui": "workspace:*",
    "@dxos/ui-theme": "workspace:*",
    "effect": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:"
  }
}
```

- [ ] **Step 2: Create `moon.yml`**

```yaml
layer: library
language: typescript
tags:
  - ts-build
  - pack
tasks:
  compile:
    args:
      - '--entryPoint=src/index.ts'
      - '--entryPoint=src/types/index.ts'
      - '--platform=browser'
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "extends": [
    "../../../tsconfig.base.json"
  ],
  "compilerOptions": {
    "types": [
      "node"
    ]
  },
  "exclude": [
    "*.t.ts",
    "vite.config.ts"
  ],
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "src/*.ts"
  ],
  "references": [
    {
      "path": "../../common/util"
    },
    {
      "path": "../../core/echo/echo"
    },
    {
      "path": "../../core/operation"
    },
    {
      "path": "../../sdk/app-framework"
    },
    {
      "path": "../../sdk/app-toolkit"
    },
    {
      "path": "../../sdk/react-client"
    },
    {
      "path": "../../sdk/schema"
    },
    {
      "path": "../../ui/react-ui"
    },
    {
      "path": "../../ui/react-ui-editor"
    },
    {
      "path": "../../ui/ui-theme"
    },
    {
      "path": "../plugin-space"
    }
  ]
}
```

- [ ] **Step 4: Install dependencies**

Run from the repo root:
```bash
pnpm install
```
Expected: no errors (DEPOT_TOKEN warning is normal and can be ignored).

- [ ] **Step 5: Commit**

```bash
cd packages/plugins/plugin-deus
git add package.json moon.yml tsconfig.json
git commit -m "feat(plugin-deus): scaffold package"
```

---

### Task 2: Meta and translations

**Files:**
- Create: `packages/plugins/plugin-deus/src/meta.ts`
- Create: `packages/plugins/plugin-deus/src/translations.ts`

- [ ] **Step 1: Create `src/meta.ts`**

```ts
//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.deus',
  name: 'Deus',
  description: trim`
    Deus plugin for structured specs with rich text content.
  `,
  icon: 'ph--file-text--regular',
  iconHue: 'violet',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-deus',
};
```

- [ ] **Step 2: Create `src/translations.ts`**

```ts
//
// Copyright 2025 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

// NOTE: typename is defined in Task 3 as 'org.dxos.plugin.deus.spec'.
const SPEC_TYPENAME = 'org.dxos.plugin.deus.spec';

export const translations = [
  {
    'en-US': {
      [SPEC_TYPENAME]: {
        'typename.label': 'Spec',
        'typename.label_zero': 'Specs',
        'typename.label_one': 'Spec',
        'typename.label_other': 'Specs',
        'object-name.placeholder': 'New spec',
        'add-object.label': 'Add spec',
        'rename-object.label': 'Rename spec',
        'delete-object.label': 'Delete spec',
        'object-deleted.label': 'Spec deleted',
      },
      [meta.id]: {
        'plugin.name': 'Deus',
      },
    },
  },
] as const satisfies Resource[];
```

- [ ] **Step 3: Commit**

```bash
git add src/meta.ts src/translations.ts
git commit -m "feat(plugin-deus): add meta and translations"
```

---

### Task 3: `Spec` type

**Files:**
- Create: `packages/plugins/plugin-deus/src/types/Spec.ts`
- Create: `packages/plugins/plugin-deus/src/types/index.ts`

- [ ] **Step 1: Create `src/types/Spec.ts`**

```ts
//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
import { Text } from '@dxos/schema';

export const Spec = Schema.Struct({
  name: Schema.optional(Schema.String),
  content: Ref.Ref(Text.Text).pipe(FormInputAnnotation.set(false)),
}).pipe(
  Type.object({
    typename: 'org.dxos.plugin.deus.spec',
    version: '0.1.0',
  }),
  Annotation.IconAnnotation.set({
    icon: 'ph--file-text--regular',
    hue: 'violet',
  }),
);

export interface Spec extends Schema.Schema.Type<typeof Spec> {}

export const isSpec = (object: unknown): object is Spec => Schema.is(Spec)(object);

export const make = ({ content = '', ...props }: Partial<{ name: string; content: string }> = {}) => {
  const spec = Obj.make(Spec, { ...props, content: Ref.make(Text.make({ content })) });
  Obj.setParent(spec.content.target!, spec);
  return spec;
};
```

- [ ] **Step 2: Create `src/types/index.ts`**

```ts
//
// Copyright 2025 DXOS.org
//

export * from './Spec';
```

- [ ] **Step 3: Verify the types compile**

Run from repo root:
```bash
moon run plugin-deus:build 2>&1 | grep -v "DEPOT_TOKEN" | head -40
```
Expected: build succeeds (or type errors only — no import errors).

- [ ] **Step 4: Commit**

```bash
git add src/types/
git commit -m "feat(plugin-deus): add Spec type"
```

---

### Task 4: `SpecArticle` container

**Files:**
- Create: `packages/plugins/plugin-deus/src/containers/SpecArticle/SpecArticle.tsx`
- Create: `packages/plugins/plugin-deus/src/containers/SpecArticle/index.ts`
- Create: `packages/plugins/plugin-deus/src/containers/index.ts`

- [ ] **Step 1: Create `src/containers/SpecArticle/SpecArticle.tsx`**

```tsx
//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback } from 'react';

import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';

import { type Spec } from '#types';

export type SpecArticleProps = ObjectSurfaceProps<Spec>;

export const SpecArticle = forwardRef<HTMLDivElement, SpecArticleProps>(
  ({ role, subject: spec, attendableId }, forwardedRef) => {
    const [content, setContent] = useObject(spec.content, 'content');

    const handleChange = useCallback(
      (value: string) => {
        setContent(value);
      },
      [setContent],
    );

    return (
      <Editor.Root>
        <Panel.Root role={role} ref={forwardedRef}>
          <Panel.Content>
            <Editor.Content value={content ?? ''} onChange={handleChange} />
          </Panel.Content>
        </Panel.Root>
      </Editor.Root>
    );
  },
);
```

- [ ] **Step 2: Create `src/containers/SpecArticle/index.ts`**

```ts
//
// Copyright 2025 DXOS.org
//

export * from './SpecArticle';
```

- [ ] **Step 3: Create `src/containers/index.ts`**

```ts
//
// Copyright 2025 DXOS.org
//

export * from './SpecArticle';
```

- [ ] **Step 4: Commit**

```bash
git add src/containers/
git commit -m "feat(plugin-deus): add SpecArticle container"
```

---

### Task 5: `ReactSurface` capability

**Files:**
- Create: `packages/plugins/plugin-deus/src/capabilities/react-surface.tsx`
- Create: `packages/plugins/plugin-deus/src/capabilities/index.ts`

- [ ] **Step 1: Create `src/capabilities/react-surface.tsx`**

```tsx
//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';

import { SpecArticle } from '#containers';
import { meta } from '#meta';
import { isSpec, type Spec } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Capabilities.ReactSurface,
      Surface.create({
        id: `${meta.id}.spec`,
        role: ['article', 'section', 'slide'],
        filter: (data): data is { subject: Spec; attendableId: string } =>
          typeof data.attendableId === 'string' && isSpec(data.subject),
        component: ({ data: { subject, attendableId }, role }) => (
          <SpecArticle role={role} subject={subject} attendableId={attendableId} />
        ),
      }),
    ),
  ),
);
```

- [ ] **Step 2: Create `src/capabilities/index.ts`**

```ts
//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
```

- [ ] **Step 3: Commit**

```bash
git add src/capabilities/
git commit -m "feat(plugin-deus): add ReactSurface capability"
```

---

### Task 6: `DeusPlugin` + public index

**Files:**
- Create: `packages/plugins/plugin-deus/src/DeusPlugin.tsx`
- Create: `packages/plugins/plugin-deus/src/index.ts`

- [ ] **Step 1: Create `src/DeusPlugin.tsx`**

```tsx
//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { type CreateObject } from '@dxos/plugin-space/types';
import { SpaceOperation } from '@dxos/plugin-space/operations';

import { meta } from '#meta';
import { translations } from './translations';
import { Spec, make } from '#types';
import { ReactSurface } from '#capabilities';

export const DeusPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: Spec.typename,
      metadata: {
        icon: Annotation.IconAnnotation.get(Spec).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Spec).pipe(Option.getOrThrow).hue ?? 'white',
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          })) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addSchemaModule({ schema: [Spec] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
```

- [ ] **Step 2: Create `src/index.ts`**

```ts
//
// Copyright 2025 DXOS.org
//

export * from './meta';
export * from './DeusPlugin';
```

- [ ] **Step 3: Commit**

```bash
git add src/DeusPlugin.tsx src/index.ts
git commit -m "feat(plugin-deus): add DeusPlugin"
```

---

### Task 7: Build and verify

- [ ] **Step 1: Build the plugin**

Run from repo root:
```bash
moon run plugin-deus:build 2>&1 | grep -v "DEPOT_TOKEN"
```
Expected: exits 0, no TypeScript errors.

- [ ] **Step 2: Lint**

```bash
moon run plugin-deus:lint -- --fix 2>&1 | grep -v "DEPOT_TOKEN"
```
Expected: exits 0, no lint errors.

- [ ] **Step 3: Commit any lint fixes**

```bash
git add -p
git commit -m "chore(plugin-deus): lint fixes" || echo "nothing to commit"
```
