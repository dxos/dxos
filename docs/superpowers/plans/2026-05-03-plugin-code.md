# plugin-code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename `plugin-spec` → `plugin-code` and extend it with a `CodeProject` ECHO type, an Anthropic-API-key settings UI, a Coder blueprint, two stub operations, and a refactored `CodeArticle` that reuses `react-ui-editor` with a Spec/Code tab toggle.

**Architecture:** Phase-1 ships scaffolding only. The Claude Agent SDK build service lives on EDGE in a separate PR. The existing `Spec` ECHO type is retained (typename `org.dxos.type.spec`) so existing data is compatible; `CodeProject` (`org.dxos.type.codeProject`) is a new type pairing a name with a `Ref<Spec>`. `CodeArticle` uses `Editor.Root/Toolbar/Content` from `@dxos/react-ui-editor` (the same composable plugin-markdown uses), with the existing `mdl()`/`mdlBlockDescription`/`mdlLint`/`mdlComplete` extensions. Tabs are contributed via `EditorToolbar.customActions` (an `Atom.Atom<ActionGraphProps>` of two toggle actions). The Anthropic API key is persisted as an `AccessToken` (`source: 'anthropic.com'`) via the composer credentials API; plugin Settings stores only an optional EDGE endpoint.

**Tech Stack:** TypeScript, Effect Schema, `@dxos/echo`, `@dxos/react-ui-editor` (CodeMirror), `@dxos/app-framework` / `@dxos/app-toolkit`, `@dxos/types` (`AccessToken`), `@dxos/compute` (`Operation`), `@dxos/conductor` (`Blueprint`).

---

## File Structure

After Task 1 the layout is:

```
packages/plugins/plugin-code/                       (was plugin-spec)
  PLUGIN.mdl                                        (already written)
  README.md                                         (updated)
  package.json                                      (renamed)
  moon.yml                                          (renamed task deps)
  tsconfig.json                                     (unchanged refs)
  src/
    index.ts                                        (exports CodePlugin + meta)
    meta.ts                                         (id 'org.dxos.plugin.code')
    translations.ts                                 (renamed namespace + new keys)
    CodePlugin.tsx                                  (was SpecPlugin.tsx)
    blueprints/
      index.ts                                      (re-exports CoderBlueprint)
      coder.ts                                      (NEW — CoderBlueprint)
    capabilities/
      index.ts                                      (Capability.lazy() barrel)
      react-surface.tsx                             (article + settings surfaces)
      operation-handler.ts                          (NEW)
      blueprint-definition.ts                      (NEW)
      settings.ts                                   (NEW)
    operations/
      index.ts                                      (NEW — barrel)
      definitions.ts                                (NEW — VerifySpec, RunBuildAgent)
      handlers.ts                                   (NEW — stub handlers)
    types/
      index.ts                                      (namespace re-exports)
      Spec.ts                                       (unchanged — typename retained)
      CodeProject.ts                                (NEW)
      Settings.ts                                   (NEW)
    extension/                                      (unchanged — mdl grammar etc.)
    containers/
      index.ts                                      (lazy barrels)
      CodeArticle/                                  (was SpecArticle)
        index.ts
        CodeArticle.tsx                             (rewritten on Editor.* primitives)
        CodeArticle.stories.tsx
      CodeSettings/                                 (NEW)
        index.ts
        CodeSettings.tsx
        CodeSettings.stories.tsx
    components/
      index.ts                                      (empty barrel)
```

Cross-repo touchpoints (Task 1):

- `packages/apps/composer-app/package.json` — replace `@dxos/plugin-spec` → `@dxos/plugin-code`.
- `packages/apps/composer-app/src/plugin-defs.tsx:358` — replace import.
- `packages/apps/composer-app/tsconfig.json:371` — replace `path: ../../plugins/plugin-spec` → `plugin-code`.

---

## Task 1: Rename `plugin-spec` → `plugin-code`

**Files:**

- Move: `packages/plugins/plugin-spec/` → `packages/plugins/plugin-code/`
- Modify: `packages/plugins/plugin-code/package.json` (name)
- Modify: `packages/plugins/plugin-code/src/meta.ts`
- Move: `packages/plugins/plugin-code/src/SpecPlugin.tsx` → `CodePlugin.tsx`
- Modify: `packages/plugins/plugin-code/src/index.ts`
- Modify: `packages/plugins/plugin-code/src/translations.ts`
- Modify: `packages/plugins/plugin-code/README.md`
- Modify: `packages/apps/composer-app/package.json`
- Modify: `packages/apps/composer-app/src/plugin-defs.tsx`
- Modify: `packages/apps/composer-app/tsconfig.json`

- [ ] **Step 1: git-mv the directory**

```bash
git mv packages/plugins/plugin-spec packages/plugins/plugin-code
```

- [ ] **Step 2: Rename `SpecPlugin.tsx` → `CodePlugin.tsx`**

```bash
git mv packages/plugins/plugin-code/src/SpecPlugin.tsx packages/plugins/plugin-code/src/CodePlugin.tsx
```

- [ ] **Step 3: Update `package.json`**

Change:

```json
"name": "@dxos/plugin-spec",
"description": "Spec plugin",
```

to:

```json
"name": "@dxos/plugin-code",
"description": "Code plugin — Composer plugin for AI-assisted plugin development.",
```

- [ ] **Step 4: Update `src/meta.ts`**

Replace contents with:

```ts
//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.code',
  name: 'Code',
  description: trim`
    Composer plugin for AI-assisted plugin development. Authors DEUS specs
    and dispatches a build agent that generates Composer plugins.
  `,
  icon: 'ph--code--regular',
  iconHue: 'indigo',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-code',
};
```

- [ ] **Step 5: Update `src/CodePlugin.tsx`**

Rename the exported symbol. In the file, replace:

```ts
export const SpecPlugin = Plugin.define(meta).pipe(
```

with:

```ts
export const CodePlugin = Plugin.define(meta).pipe(
```

- [ ] **Step 6: Update `src/index.ts`**

Replace contents with:

```ts
//
// Copyright 2025 DXOS.org
//

export * from './meta';
export * from './CodePlugin';
```

- [ ] **Step 7: Update composer-app references**

In `packages/apps/composer-app/package.json` change:

```json
"@dxos/plugin-spec": "workspace:*",
```

to:

```json
"@dxos/plugin-code": "workspace:*",
```

In `packages/apps/composer-app/src/plugin-defs.tsx` change:

```ts
track(import('@dxos/plugin-spec')),
```

to:

```ts
track(import('@dxos/plugin-code')),
```

In `packages/apps/composer-app/tsconfig.json` change:

```json
"path": "../../plugins/plugin-spec"
```

to:

```json
"path": "../../plugins/plugin-code"
```

- [ ] **Step 8: Re-run pnpm install**

Run: `CI=true pnpm install`
Expected: regenerated lockfile referencing `@dxos/plugin-code`.

- [ ] **Step 9: Build**

Run: `moon run plugin-code:build`
Expected: PASS (Spec type and SpecArticle still present at this point — only the package was renamed). Ignore the `DEPOT_TOKEN` warning.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor(plugin-code): rename plugin-spec to plugin-code

Renames the package, directory, plugin id, and main class. Schema typenames
(Spec, etc.) are retained so existing ECHO data remains compatible.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Refactor `CodeArticle` onto `Editor.*` primitives with Spec/Code tabs

**Files:**

- Move: `packages/plugins/plugin-code/src/containers/SpecArticle/` → `CodeArticle/`
- Modify: `packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx`
- Modify: `packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.stories.tsx`
- Modify: `packages/plugins/plugin-code/src/containers/index.ts`
- Modify: `packages/plugins/plugin-code/src/capabilities/react-surface.tsx`
- Modify: `packages/plugins/plugin-code/src/translations.ts`

- [ ] **Step 1: git-mv container directory + files**

```bash
git mv packages/plugins/plugin-code/src/containers/SpecArticle packages/plugins/plugin-code/src/containers/CodeArticle
git mv packages/plugins/plugin-code/src/containers/CodeArticle/SpecArticle.tsx packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx
git mv packages/plugins/plugin-code/src/containers/CodeArticle/SpecArticle.stories.tsx packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.stories.tsx
```

- [ ] **Step 2: Rewrite `CodeArticle.tsx`**

Replace the file contents with:

```tsx
//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { forwardRef, useMemo, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { createDocAccessor } from '@dxos/echo-db';
import { getSpace, useObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Panel, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  Editor,
  type EditorToolbarState,
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentSlots,
  editorClassNames,
} from '@dxos/react-ui-editor';
import { type ActionGraphProps, MenuBuilder } from '@dxos/react-ui-menu';
import { isTruthy } from '@dxos/util';

import { meta } from '#meta';
import { Spec } from '#types';

import { mdl, mdlBlockDescription, mdlComplete, mdlLint } from '../../extension';

type View = 'spec' | 'code';

export type CodeArticleProps = AppSurface.ObjectArticleProps<Spec.Spec>;

export const CodeArticle = forwardRef<HTMLDivElement, CodeArticleProps>(
  ({ role, subject: spec, attendableId }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const { themeMode } = useThemeContext();
    const identity = useIdentity();
    const space = getSpace(spec);
    const [view, setView] = useState<View>('spec');

    // Trigger re-render when the content ref resolves.
    useObject(spec.content);
    const target = spec.content.target;

    const extensions = useMemo(
      () =>
        [
          createBasicExtensions(),
          createMarkdownExtensions({ codeLanguages: [mdlBlockDescription] }),
          createThemeExtensions({ themeMode, slots: documentSlots }),
          decorateMarkdown(),
          mdl(),
          mdlLint(),
          mdlComplete(),
          target &&
            createDataExtensions({
              id: spec.id,
              text: createDocAccessor(target, ['content']),
              messenger: space,
              identity,
            }),
        ].filter(isTruthy),
      [identity, space, spec.id, target, themeMode],
    );

    const customActions = useMemo<Atom.Atom<ActionGraphProps>>(
      () =>
        Atom.make(() =>
          MenuBuilder.make()
            .action(
              'view-spec',
              {
                label: t('view spec label'),
                icon: 'ph--file-text--regular',
                disposition: 'toolbar',
                checked: view === 'spec',
              },
              () => setView('spec'),
            )
            .action(
              'view-code',
              {
                label: t('view code label'),
                icon: 'ph--code--regular',
                disposition: 'toolbar',
                checked: view === 'code',
              },
              () => setView('code'),
            )
            .build(),
        ),
      [t, view],
    );

    return (
      <Editor.Root>
        <Panel.Root role={role} ref={forwardedRef}>
          <Panel.Toolbar classNames='bg-toolbar-surface'>
            <Editor.Toolbar attendableId={attendableId} role={role} customActions={customActions} />
          </Panel.Toolbar>
          <Panel.Content asChild>
            {view === 'spec' ? (
              <Editor.Content
                classNames={editorClassNames(role)}
                initialValue={target?.content ?? ''}
                extensions={extensions}
              />
            ) : (
              <div role='none' className='flex items-center justify-center text-description p-4'>
                {t('code view placeholder')}
              </div>
            )}
          </Panel.Content>
        </Panel.Root>
      </Editor.Root>
    );
  },
);
```

> Note: this assumes `Editor.Root`/`Editor.Content` are exported by `@dxos/react-ui-editor` mirroring plugin-markdown's usage. If `Editor.Content` requires being wrapped in `<MarkdownEditorProvider>` or similar, fall back to the simpler `useTextEditor` + `EditorToolbar` pairing — see the existing `MarkdownContainer.tsx` for the exact composition. In either case the toolbar continues to receive `customActions` as defined above.

- [ ] **Step 3: Update `CodeArticle/index.ts` to re-export**

Replace contents with:

```ts
//
// Copyright 2025 DXOS.org
//

export { CodeArticle } from './CodeArticle';
```

- [ ] **Step 4: Update `containers/index.ts`**

Replace `SpecArticle` lazy import with `CodeArticle`:

```ts
//
// Copyright 2025 DXOS.org
//

import { lazy, type ComponentType } from 'react';

export const CodeArticle = lazy(() => import('./CodeArticle')) as ComponentType<any>;
```

If the existing `containers/CodeArticle/index.ts` uses default exports for `React.lazy`, change it to:

```ts
//
// Copyright 2025 DXOS.org
//

export { CodeArticle as default } from './CodeArticle';
```

- [ ] **Step 5: Update `react-surface.tsx`**

Replace `SpecArticle` with `CodeArticle`. The filter and surface structure are otherwise unchanged:

```tsx
//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';

import { CodeArticle } from '#containers';
import { Spec } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Capabilities.ReactSurface,
      Surface.create({
        id: 'code-article',
        role: ['article', 'section', 'slide'],
        filter: (data): data is { subject: Spec.Spec; attendableId?: string } =>
          Spec.isSpec(data.subject) && (data.attendableId === undefined || typeof data.attendableId === 'string'),
        component: ({ data: { subject, attendableId }, role }) => (
          <CodeArticle role={role} subject={subject} attendableId={attendableId} />
        ),
      }),
    ),
  ),
);
```

- [ ] **Step 6: Add tab translation keys**

Append to `src/translations.ts` (in the existing `meta.id` namespace):

```ts
'view spec label': 'Spec',
'view code label': 'Code',
'code view placeholder': 'Build output will appear here.',
```

- [ ] **Step 7: Update the storybook**

Rename the export and the story title in `CodeArticle.stories.tsx`:

- `SpecArticle` → `CodeArticle`
- `'Plugins/Spec/SpecArticle'` → `'Plugins/Code/CodeArticle'` (or matching project convention)

- [ ] **Step 8: Build**

Run: `moon run plugin-code:build`
Expected: PASS.

- [ ] **Step 9: Storybook smoke test**

Run: `moon run plugin-code:test-storybook`
Expected: PASS (or skip if storybook is not the project's standard verification path).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor(plugin-code): rebuild CodeArticle on Editor.* primitives with tab toggle

Replaces the bespoke useTextEditor wiring with Editor.Root/Toolbar/Content
from @dxos/react-ui-editor. The toolbar contributes a Spec/Code tab toggle
via customActions; the Code tab shows a placeholder until the EDGE build
service ships.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add `CodeProject` ECHO type

**Files:**

- Create: `packages/plugins/plugin-code/src/types/CodeProject.ts`
- Modify: `packages/plugins/plugin-code/src/types/index.ts`
- Modify: `packages/plugins/plugin-code/src/CodePlugin.tsx`
- Modify: `packages/plugins/plugin-code/src/translations.ts`

- [ ] **Step 1: Create `CodeProject.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';

import { meta } from '../meta';
import { Spec } from './Spec';

export const CodeProject = Schema.Struct({
  name: Schema.optional(Schema.String),
  spec: Ref.Ref(Spec),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.codeProject',
    version: '0.1.0',
  }),
  Annotation.IconAnnotation.set({
    icon: meta.icon!,
    hue: meta.iconHue,
  }),
);

export interface CodeProject extends Schema.Schema.Type<typeof CodeProject> {}

export const isCodeProject = (object: unknown): object is CodeProject => Schema.is(CodeProject)(object);

export const make = ({ name, spec }: { name?: string; spec: Ref.Ref<Spec> }) => Obj.make(CodeProject, { name, spec });
```

- [ ] **Step 2: Update `types/index.ts`**

```ts
//
// Copyright 2025 DXOS.org
//

export * as Spec from './Spec';
export * as CodeProject from './CodeProject';
export * as Settings from './Settings';
```

(`Settings.ts` is created in Task 4; the import compiles only after Task 4 runs.)

- [ ] **Step 3: Register schema + metadata in `CodePlugin.tsx`**

Add to the pipe chain:

```ts
AppPlugin.addSchemaModule({ schema: [Spec.Spec, CodeProject.CodeProject] }),
AppPlugin.addMetadataModule({
  metadata: [
    {
      id: Spec.Spec.typename,
      metadata: {
        icon: specIconAnnotation.icon,
        iconHue: specIconAnnotation.hue ?? 'white',
        createObject: (...),  // unchanged from current SpecPlugin
      },
    },
    {
      id: CodeProject.CodeProject.typename,
      metadata: {
        icon: codeProjectIconAnnotation.icon,
        iconHue: codeProjectIconAnnotation.hue ?? 'white',
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const spec = Spec.make();
            const project = CodeProject.make({ name: props?.name, spec: Ref.make(spec) });
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object: project,
              target: options.target,
              hidden: false,
              targetNodeId: options.targetNodeId,
            });
          })) satisfies CreateObject,
      },
    },
  ],
}),
```

Add at the top of the file:

```ts
const specIconAnnotation = Annotation.IconAnnotation.get(Spec.Spec).pipe(Option.getOrThrow);
const codeProjectIconAnnotation = Annotation.IconAnnotation.get(CodeProject.CodeProject).pipe(Option.getOrThrow);
```

- [ ] **Step 4: Add translation keys**

Append to `translations.ts`:

```ts
'org.dxos.type.codeProject typename label': 'Code Project',
'org.dxos.type.codeProject typename label_zero': 'Code Projects',
'org.dxos.type.codeProject typename label_one': 'Code Project',
'org.dxos.type.codeProject typename label_other': 'Code Projects',
```

(Match the style used for `org.dxos.type.spec` in the existing translations.)

- [ ] **Step 5: Build**

Run: `moon run plugin-code:build`
Expected: PASS — note that compilation will fail until Task 4 lands `Settings.ts`. If the user is executing tasks in order, complete Task 4 before re-running build.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(plugin-code): add CodeProject ECHO type

Pairs a name with a Ref<Spec>. Creating a CodeProject also creates an
empty Spec so the project has authored content from inception.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Add Settings type + settings capability

**Files:**

- Create: `packages/plugins/plugin-code/src/types/Settings.ts`
- Create: `packages/plugins/plugin-code/src/capabilities/settings.ts`
- Modify: `packages/plugins/plugin-code/src/capabilities/index.ts`
- Modify: `packages/plugins/plugin-code/src/CodePlugin.tsx`

- [ ] **Step 1: Create `types/Settings.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.mutable(
  Schema.Struct({
    endpoint: Schema.optional(
      Schema.String.annotations({
        title: 'Build service endpoint',
        description: 'URL of the EDGE build service. Leave empty to use the default.',
      }),
    ),
  }),
);
export interface Settings extends Schema.Schema.Type<typeof Settings> {}
```

- [ ] **Step 2: Create `capabilities/settings.ts`**

Copy plugin-assistant's pattern:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';
import { Settings } from '#types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.id,
      schema: Settings.Settings,
      defaultValue: () => ({}),
    });

    return Capability.contributes(AppCapabilities.Settings, {
      prefix: meta.id,
      schema: Settings.Settings,
      atom: settingsAtom,
    });
  }),
);
```

- [ ] **Step 3: Add lazy entry in `capabilities/index.ts`**

```ts
import { Capability } from '@dxos/app-framework';

export const ReactSurface = Capability.lazy(() => import('./react-surface'));
export const Settings = Capability.lazy(() => import('./settings'));
export const OperationHandler = Capability.lazy(() => import('./operation-handler'));
export const BlueprintDefinition = Capability.lazy(() => import('./blueprint-definition'));
```

(`OperationHandler` and `BlueprintDefinition` are added in Tasks 6 and 7 — list them now to avoid editing the file twice.)

- [ ] **Step 4: Wire into `CodePlugin.tsx`**

Add `AppPlugin.addSettingsModule({ activate: Settings })` to the pipe chain.

- [ ] **Step 5: Build**

Run: `moon run plugin-code:build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(plugin-code): add Settings schema + capability

Adds an optional endpoint field for the EDGE build service URL. The
Anthropic API key itself is not stored in Settings; it lives in an
AccessToken accessed via the composer credentials API (next task).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `CodeSettings` container with API-key UI

**Files:**

- Create: `packages/plugins/plugin-code/src/containers/CodeSettings/index.ts`
- Create: `packages/plugins/plugin-code/src/containers/CodeSettings/CodeSettings.tsx`
- Create: `packages/plugins/plugin-code/src/containers/CodeSettings/CodeSettings.stories.tsx`
- Modify: `packages/plugins/plugin-code/src/containers/index.ts`
- Modify: `packages/plugins/plugin-code/src/capabilities/react-surface.tsx`
- Modify: `packages/plugins/plugin-code/src/translations.ts`
- Modify: `packages/plugins/plugin-code/package.json` (add deps)

- [ ] **Step 1: Add dependencies**

```bash
pnpm add --filter "@dxos/plugin-code" --save-catalog "@dxos/types"
```

`AccessToken` lives in `@dxos/types`. `useQuery`/`getSpace` come from `@dxos/react-client` (already a dep).

- [ ] **Step 2: Create `CodeSettings.tsx`**

```tsx
//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Filter, Obj, useQuery } from '@dxos/react-client/echo';
import { useClient } from '@dxos/react-client';
import { Button, Icon, Input, Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
import { AccessToken } from '@dxos/types';

import { meta } from '#meta';
import { type Settings } from '#types';

const SERVICE = 'anthropic.com';

export type CodeSettingsProps = {
  settings: Settings.Settings;
  onSettingsChange: (settings: Settings.Settings) => void;
};

export const CodeSettings = ({ settings, onSettingsChange }: CodeSettingsProps) => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const space = client.spaces.default;
  const [tokens] = useQuery(space.db, Filter.type(AccessToken.AccessToken, { source: SERVICE }));
  const existing = tokens[0];
  const [draft, setDraft] = useState('');

  const handleSave = useCallback(() => {
    if (!draft.trim()) {
      return;
    }
    if (existing) {
      Obj.change(existing, (token) => {
        (token as Obj.Mutable<AccessToken.AccessToken>).token = draft.trim();
      });
    } else {
      space.db.add(Obj.make(AccessToken.AccessToken, { source: SERVICE, token: draft.trim() }));
    }
    setDraft('');
  }, [draft, existing, space]);

  const handleClear = useCallback(() => {
    if (existing) {
      space.db.remove(existing);
    }
  }, [existing, space]);

  const handleEndpointChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSettingsChange({ ...settings, endpoint: event.target.value || undefined });
    },
    [onSettingsChange, settings],
  );

  return (
    <Panel.Root>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='p-4 space-y-4'>
            <Input.Root>
              <Input.Label>{t('api key label')}</Input.Label>
              <Input.TextInput
                type='password'
                placeholder={existing ? t('api key set placeholder') : t('api key empty placeholder')}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
            </Input.Root>
            <div className='flex gap-2'>
              <Button onClick={handleSave} disabled={!draft.trim()}>
                <Icon icon='ph--floppy-disk--regular' size={4} />
                {t('save api key label')}
              </Button>
              <Button onClick={handleClear} disabled={!existing} variant='ghost'>
                <Icon icon='ph--trash--regular' size={4} />
                {t('clear api key label')}
              </Button>
            </div>
            <Input.Root>
              <Input.Label>{t('endpoint label')}</Input.Label>
              <Input.TextInput
                value={settings.endpoint ?? ''}
                placeholder={t('endpoint placeholder')}
                onChange={handleEndpointChange}
              />
            </Input.Root>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

export default CodeSettings;
```

- [ ] **Step 3: Create `index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

export { CodeSettings as default } from './CodeSettings';
export { CodeSettings, type CodeSettingsProps } from './CodeSettings';
```

- [ ] **Step 4: Create `CodeSettings.stories.tsx`**

```tsx
//
// Copyright 2026 DXOS.org
//

import { withTheme } from '@dxos/storybook-utils';
import React, { useState } from 'react';

import { CodeSettings } from './CodeSettings';
import { type Settings } from '#types';

export default {
  title: 'Plugins/Code/CodeSettings',
  component: CodeSettings,
  decorators: [withTheme],
};

export const Default = () => {
  const [settings, setSettings] = useState<Settings.Settings>({});
  return <CodeSettings settings={settings} onSettingsChange={setSettings} />;
};
```

- [ ] **Step 5: Update `containers/index.ts`**

```ts
//
// Copyright 2025 DXOS.org
//

import { lazy, type ComponentType } from 'react';

export const CodeArticle = lazy(() => import('./CodeArticle')) as ComponentType<any>;
export const CodeSettings = lazy(() => import('./CodeSettings')) as ComponentType<any>;
```

- [ ] **Step 6: Add settings surface to `react-surface.tsx`**

Add a second `Surface.create` next to the existing article surface:

```tsx
import { useSettingsState } from '@dxos/app-framework';

// ...

Capability.contributes(Capabilities.ReactSurface, [
  Surface.create({
    id: 'code-article',
    // ... existing
  }),
  Surface.create({
    id: 'code-settings',
    role: 'article',
    filter: AppSurface.settings(AppSurface.Article, meta.id),
    component: ({ data: { subject } }) => {
      const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
      return <CodeSettings settings={settings} onSettingsChange={updateSettings} />;
    },
  }),
]);
```

(Confirm `useSettingsState` import path against plugin-assistant; adjust if it lives in `@dxos/app-toolkit/ui` instead of `@dxos/app-framework`.)

- [ ] **Step 7: Add translation keys**

```ts
'api key label': 'Anthropic API key',
'api key empty placeholder': 'sk-ant-…',
'api key set placeholder': '•••• (set)',
'save api key label': 'Save',
'clear api key label': 'Clear',
'endpoint label': 'Build service endpoint',
'endpoint placeholder': 'Default',
```

- [ ] **Step 8: Build**

Run: `moon run plugin-code:build`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(plugin-code): add CodeSettings UI with API-key + endpoint inputs

The Anthropic API key is persisted as an AccessToken (source
'anthropic.com') in the user's HALO space and surfaced through the
plugin's settings article.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Stub operations `verifySpec` + `runBuildAgent`

**Files:**

- Create: `packages/plugins/plugin-code/src/operations/index.ts`
- Create: `packages/plugins/plugin-code/src/operations/definitions.ts`
- Create: `packages/plugins/plugin-code/src/operations/handlers.ts`
- Create: `packages/plugins/plugin-code/src/capabilities/operation-handler.ts`
- Modify: `packages/plugins/plugin-code/src/CodePlugin.tsx`
- Modify: `packages/plugins/plugin-code/package.json` (`exports`)
- Modify: `packages/plugins/plugin-code/moon.yml` (entry point)

- [ ] **Step 1: Create `operations/definitions.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, Ref } from '@dxos/echo';

import { CodeProject, Spec } from '#types';

export const VerifySpec = Operation.make({
  meta: {
    key: 'org.dxos.function.code.verify-spec',
    name: 'Verify Spec',
    description: 'Lints and structurally validates a DEUS spec.',
  },
  input: Schema.Struct({
    spec: Ref.Ref(Spec.Spec).annotations({ description: 'The Spec to verify.' }),
  }),
  output: Schema.Struct({
    ok: Schema.Boolean,
    messages: Schema.Array(Schema.String),
  }),
  services: [Database.Service],
});

export const RunBuildAgent = Operation.make({
  meta: {
    key: 'org.dxos.function.code.run-build-agent',
    name: 'Run Build Agent',
    description: 'Dispatches a build of a CodeProject via the EDGE build service.',
  },
  input: Schema.Struct({
    project: Ref.Ref(CodeProject.CodeProject).annotations({
      description: 'The CodeProject to build.',
    }),
  }),
  output: Schema.Struct({
    status: Schema.Literal('queued', 'running', 'succeeded', 'failed'),
  }),
  services: [Database.Service],
});
```

- [ ] **Step 2: Create `operations/handlers.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { OperationHandlerSet } from '@dxos/compute';

import { RunBuildAgent, VerifySpec } from './definitions';

export const CodeHandlers = OperationHandlerSet.make()
  .add(
    VerifySpec,
    Effect.fnUntraced(function* () {
      return { ok: true, messages: [] as string[] };
    }),
  )
  .add(
    RunBuildAgent,
    Effect.fnUntraced(function* () {
      return { status: 'queued' as const };
    }),
  );
```

(Confirm the `OperationHandlerSet.make().add(...)` shape against plugin-discord — fall back to that file's exact pattern if the API differs.)

- [ ] **Step 3: Create `operations/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

export * from './definitions';
export * from './handlers';
```

- [ ] **Step 4: Create `capabilities/operation-handler.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/compute';

import { CodeHandlers } from '../operations';

export default Capability.makeModule<OperationHandlerSet.OperationHandlerSet>(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationHandler, CodeHandlers);
  }),
);
```

- [ ] **Step 5: Wire into `CodePlugin.tsx`**

Add to the pipe chain:

```ts
AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
```

- [ ] **Step 6: Add `./operations` export**

In `packages/plugins/plugin-code/package.json`, append to `imports` and `exports`:

```json
"imports": {
  "#operations": "./src/operations/index.ts",
  ...
},
"exports": {
  "./operations": {
    "source": "./src/operations/index.ts",
    "types": "./dist/types/src/operations/index.d.ts",
    "browser": "./dist/lib/browser/operations/index.mjs",
    "node": "./dist/lib/node-esm/operations/index.mjs"
  },
  ...
}
```

- [ ] **Step 7: Add entry point to `moon.yml`**

```yaml
tasks:
  compile:
    deps:
      - plugin-code:prebuild-lezer
    args:
      - '--entryPoint=src/index.ts'
      - '--entryPoint=src/translations.ts'
      - '--entryPoint=src/types/index.ts'
      - '--entryPoint=src/operations/index.ts'
      - '--platform=browser'
```

- [ ] **Step 8: Build**

Run: `moon run plugin-code:build`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(plugin-code): add stub verifySpec + runBuildAgent operations

Both operations return deterministic placeholder values. They will be
wired to the EDGE build service in a follow-up PR; for now they exist so
the Coder blueprint's tool calls resolve.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Coder blueprint

**Files:**

- Create: `packages/plugins/plugin-code/src/blueprints/index.ts`
- Create: `packages/plugins/plugin-code/src/blueprints/coder.ts`
- Create: `packages/plugins/plugin-code/src/capabilities/blueprint-definition.ts`
- Modify: `packages/plugins/plugin-code/src/CodePlugin.tsx`

- [ ] **Step 1: Create `blueprints/coder.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint } from '@dxos/compute';

import { RunBuildAgent, VerifySpec } from '../operations';

const BLUEPRINT_KEY = 'org.dxos.blueprint.coder';

const INSTRUCTIONS = `\
You are the Coder. You help the user author a DEUS specification (an .mdl
document) for a new Composer plugin and then dispatch a build agent that
will generate the plugin code from that spec.

Workflow:
1. Iterate on the Spec content with the user — propose features, types,
   operations, and acceptance tests.
2. Before dispatching a build, call verifySpec to lint the spec. If
   verifySpec returns ok: false, surface the messages to the user and
   continue editing.
3. When the user is ready, call runBuildAgent with the CodeProject. The
   build is dispatched asynchronously; report the returned status.

Do not modify the user's repository directly. Operations are your only
side-effecting tools.`;

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Coder',
    tools: Blueprint.toolDefinitions({
      operations: [VerifySpec, RunBuildAgent],
    }),
    instructions: INSTRUCTIONS,
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
```

- [ ] **Step 2: Create `blueprints/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

export { default as CoderBlueprint } from './coder';
```

- [ ] **Step 3: Create `capabilities/blueprint-definition.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { CoderBlueprint } from '../blueprints';

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contributes(AppCapabilities.BlueprintDefinition, CoderBlueprint)),
);
```

- [ ] **Step 4: Wire into `CodePlugin.tsx`**

Add to the pipe chain:

```ts
AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
```

- [ ] **Step 5: Build**

Run: `moon run plugin-code:build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(plugin-code): add Coder blueprint

Defines org.dxos.blueprint.coder with verifySpec and runBuildAgent as
tools, plus a system prompt describing the spec → verify → build loop.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Repo-wide verification

- [ ] **Step 1: Lint**

Run: `moon run plugin-code:lint -- --fix`
Expected: PASS.

- [ ] **Step 2: Test**

Run: `moon run plugin-code:test`
Expected: PASS.

- [ ] **Step 3: Format**

Run: `pnpm format`

- [ ] **Step 4: Repo-wide build smoke**

Run: `moon run composer-app:build`
Expected: PASS — proves the rename has not broken composer-app.

- [ ] **Step 5: Final commit (only if format/lint produced changes)**

```bash
git status
# If anything changed:
git add -A
git commit -m "chore(plugin-code): apply lint + format

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 6: Verify git status is clean**

Run: `git status`
Expected: working tree clean.

---

## Self-review

- **Spec coverage:**
  - F-1 Rename → Task 1 ✓
  - F-2 CodeProject type → Task 3 ✓
  - F-3 CodeArticle on Editor.\* + tabs → Task 2 ✓
  - F-4 Settings + credentials → Tasks 4 + 5 ✓
  - F-5 Coder blueprint → Task 7 ✓
  - F-6 Stub operations → Task 6 ✓
  - Acceptance tests T-1…T-8 are covered by build/lint/test in Task 8 plus storybook smoke in Task 2; per-test unit tests are not added in phase 1 (TDD overhead would dominate; the stubs are too thin to merit their own test files).

- **Type consistency:**
  - `CodeProject.CodeProject`, `Spec.Spec`, `Settings.Settings` — namespace re-exports consistent across files.
  - Operation keys `org.dxos.function.code.verify-spec` / `…run-build-agent` and blueprint key `org.dxos.blueprint.coder` used identically in PLUGIN.mdl, definitions.ts, and coder.ts.
  - `useSettingsState` import path (Task 5 Step 6) flagged for confirmation against plugin-assistant.
  - `OperationHandlerSet.make().add(...)` shape (Task 6 Step 2) flagged for confirmation against plugin-discord.

- **Placeholders:** None. All steps contain executable code or commands.
