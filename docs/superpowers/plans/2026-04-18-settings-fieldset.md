# Settings FieldSet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Settings.FieldSet` component that auto-generates settings UI from Effect Schema, and convert the markdown plugin as a proof-of-concept.

**Architecture:** Extract field type detection from `FormField.tsx` into a shared utility. Build `SettingsFieldSet` that iterates schema properties, detects types, and renders appropriate controls inside `Settings.Item` wrappers. Labels and descriptions come from Effect Schema annotations (`title`, `description`). Custom fields supported via `fieldMap`. Visibility controlled via a `visible` callback.

**Tech Stack:** Effect Schema, React, `@dxos/react-ui` (Input, Select), `@dxos/react-ui-form` (Settings), `@dxos/effect` (getFormProperties, getAnnotation, isLiteralUnion)

---

### Task 1: Extract shared field-type detection utility

The `FormField.tsx` contains inline logic to detect schema types (boolean, string, number, literal union). Extract the type-detection into a standalone utility so both `FormField` and the new `SettingsFieldSet` can reuse it.

**Files:**
- Create: `packages/ui/react-ui-form/src/util/field-type.ts`
- Modify: `packages/ui/react-ui-form/src/util/index.ts`

- [ ] **Step 1: Create the field type detection utility**

```typescript
// packages/ui/react-ui-form/src/util/field-type.ts

import * as SchemaAST from 'effect/SchemaAST';

import { isLiteralUnion } from '@dxos/effect';

/**
 * Detected field type for a schema property.
 */
export type SettingsFieldType = 'boolean' | 'string' | 'number' | 'select';

export type SelectOption = {
  value: string | number;
  label?: string;
};

/**
 * Detect the field type from an Effect Schema AST node.
 */
export const detectFieldType = (ast: SchemaAST.AST): SettingsFieldType | undefined => {
  if (isLiteralUnion(ast)) {
    return 'select';
  }

  switch (ast._tag) {
    case 'BooleanKeyword':
      return 'boolean';
    case 'StringKeyword':
      return 'string';
    case 'NumberKeyword':
      return 'number';
  }

  return undefined;
};

/**
 * Extract select options from a literal union AST node.
 */
export const getSelectOptionsFromAst = (ast: SchemaAST.AST): SelectOption[] | undefined => {
  if (!isLiteralUnion(ast)) {
    return undefined;
  }

  return (ast as SchemaAST.Union<SchemaAST.Literal>).types
    .map((type) => type.literal)
    .filter((v): v is string | number => v !== null)
    .map((value) => {
      const label = typeof value === 'string' ? value.charAt(0).toUpperCase() + value.slice(1) : String(value);
      return { value, label };
    });
};
```

- [ ] **Step 2: Export from util/index.ts**

Add to `packages/ui/react-ui-form/src/util/index.ts`:

```typescript
export * from './field-type';
```

- [ ] **Step 3: Verify build**

Run: `moon run react-ui-form:build`
Expected: BUILD PASS

- [ ] **Step 4: Commit**

```bash
git add packages/ui/react-ui-form/src/util/field-type.ts packages/ui/react-ui-form/src/util/index.ts
git commit -m "feat(react-ui-form): extract shared field-type detection utility"
```

---

### Task 2: Build `Settings.FieldSet` component

Create the core component that iterates schema properties and renders typed controls inside `Settings.Item` wrappers.

**Files:**
- Create: `packages/ui/react-ui-form/src/components/Settings/SettingsFieldSet.tsx`
- Modify: `packages/ui/react-ui-form/src/components/Settings/Settings.tsx` (add FieldSet to exports)

- [ ] **Step 1: Create `SettingsFieldSet` component**

```typescript
// packages/ui/react-ui-form/src/components/Settings/SettingsFieldSet.tsx

import * as SchemaAST from 'effect/SchemaAST';
import * as String from 'effect/String';
import React, { useCallback, useMemo } from 'react';

import { getAnnotation, type SchemaProperty } from '@dxos/effect';
import { Input, Select } from '@dxos/react-ui';

import { getFormProperties } from '../../util';
import { type SelectOption, detectFieldType, getSelectOptionsFromAst } from '../../util/field-type';
import { Settings } from './Settings';

//
// Types
//

/**
 * Props for a custom field renderer.
 * The renderer provides the control only; Settings.Item wrapper is handled by FieldSet.
 */
export type SettingsFieldProps<T = any> = {
  value: T;
  onChange: (value: T) => void;
  readonly?: boolean;
};

/**
 * Map of property paths to custom field renderers.
 */
export type SettingsFieldMap = Record<string, React.FC<SettingsFieldProps>>;

export type SettingsFieldSetProps<T extends Record<string, any> = Record<string, any>> = {
  /** Effect Schema for the settings object. */
  schema: { ast: SchemaAST.AST };

  /** Current settings values. */
  values: T;

  /** Callback when any value changes. Receives a new complete object. */
  onValuesChanged?: (values: T) => void;

  /** When true, all controls are disabled. */
  readonly?: boolean;

  /** Map of property names to custom field renderers. */
  fieldMap?: SettingsFieldMap;

  /** Control field visibility. Return false to hide a field. */
  visible?: (path: string, values: T) => boolean;

  /** Override the order of fields. Fields not listed are appended in schema order. */
  sort?: string[];
};

//
// Component
//

export const SettingsFieldSet = <T extends Record<string, any>>({
  schema,
  values,
  onValuesChanged,
  readonly,
  fieldMap,
  visible,
  sort,
}: SettingsFieldSetProps<T>) => {
  const properties = useMemo(() => {
    const props = getFormProperties(schema.ast);
    if (!sort) {
      return props;
    }
    return [...props].sort(
      ({ name: a }, { name: b }) => (sort.indexOf(a.toString()) ?? Infinity) - (sort.indexOf(b.toString()) ?? Infinity),
    );
  }, [schema, sort]);

  const handleChange = useCallback(
    (name: string, value: unknown) => {
      onValuesChanged?.({ ...values, [name]: value } as T);
    },
    [values, onValuesChanged],
  );

  return (
    <>
      {properties.map((property) => {
        const name = property.name.toString();
        if (visible && !visible(name, values)) {
          return null;
        }

        return (
          <SettingsFieldItem
            key={name}
            property={property}
            value={values[name]}
            onChange={(value) => handleChange(name, value)}
            readonly={readonly}
            customField={fieldMap?.[name]}
          />
        );
      })}
    </>
  );
};

SettingsFieldSet.displayName = 'Settings.FieldSet';

//
// Internal: render a single settings field
//

type SettingsFieldItemProps = {
  property: SchemaProperty;
  value: any;
  onChange: (value: any) => void;
  readonly?: boolean;
  customField?: React.FC<SettingsFieldProps>;
};

const SettingsFieldItem = ({ property, value, onChange, readonly, customField }: SettingsFieldItemProps) => {
  const { type } = property;
  const name = property.name.toString();
  const title = getAnnotation<string>(SchemaAST.TitleAnnotationId)(type) ?? String.capitalize(name);
  const description = getAnnotation<string>(SchemaAST.DescriptionAnnotationId)(type);

  // Custom field renderer.
  if (customField) {
    const CustomField = customField;
    return (
      <Settings.Item title={title} description={description}>
        <CustomField value={value} onChange={onChange} readonly={readonly} />
      </Settings.Item>
    );
  }

  const fieldType = detectFieldType(type);

  switch (fieldType) {
    case 'boolean':
      return (
        <Settings.Item title={title} description={description}>
          <Input.Switch disabled={readonly} checked={!!value} onCheckedChange={(checked) => onChange(!!checked)} />
        </Settings.Item>
      );

    case 'select': {
      const options = getSelectOptionsFromAst(type) ?? [];
      return (
        <Settings.Item title={title} description={description}>
          <Select.Root disabled={readonly} value={value ?? ''} onValueChange={onChange}>
            <Select.TriggerButton disabled={readonly} />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {options.map((option: SelectOption) => (
                    <Select.Option key={globalThis.String(option.value)} value={globalThis.String(option.value)}>
                      {option.label ?? globalThis.String(option.value)}
                    </Select.Option>
                  ))}
                </Select.Viewport>
                <Select.Arrow />
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </Settings.Item>
      );
    }

    case 'string':
      return (
        <Settings.Item title={title} description={description}>
          <Input.TextInput disabled={readonly} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
        </Settings.Item>
      );

    case 'number':
      return (
        <Settings.Item title={title} description={description}>
          <Input.TextInput
            disabled={readonly}
            type='number'
            value={value ?? ''}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              onChange(Number.isNaN(parsed) ? undefined : parsed);
            }}
          />
        </Settings.Item>
      );

    default:
      return null;
  }
};
```

- [ ] **Step 2: Add FieldSet to Settings compound component**

In `packages/ui/react-ui-form/src/components/Settings/Settings.tsx`, add the import and export:

Add import at top:
```typescript
import { SettingsFieldSet } from './SettingsFieldSet';
```

Update the `Settings` export object:
```typescript
export const Settings = {
  Root: SettingsRoot,
  Viewport: SettingsViewport,
  Section: SettingsSection,
  Panel: SettingsPanel,
  Item: SettingsItem,
  FieldSet: SettingsFieldSet,
};
```

- [ ] **Step 3: Export types from Settings barrel**

Ensure `SettingsFieldMap` and `SettingsFieldProps` types are accessible. In `packages/ui/react-ui-form/src/components/Settings/Settings.tsx` (or a separate index), re-export:

```typescript
export { type SettingsFieldMap, type SettingsFieldProps, type SettingsFieldSetProps } from './SettingsFieldSet';
```

- [ ] **Step 4: Verify build**

Run: `moon run react-ui-form:build`
Expected: BUILD PASS

- [ ] **Step 5: Commit**

```bash
git add packages/ui/react-ui-form/src/components/Settings/SettingsFieldSet.tsx packages/ui/react-ui-form/src/components/Settings/Settings.tsx
git commit -m "feat(react-ui-form): add Settings.FieldSet for schema-driven settings UI"
```

---

### Task 3: Add storybook story for Settings.FieldSet

Validate the component visually with a representative test schema.

**Files:**
- Modify: `packages/ui/react-ui-form/src/components/Settings/Settings.stories.tsx`

- [ ] **Step 1: Add a FieldSet story**

Add to `Settings.stories.tsx`:

```typescript
import * as Schema from 'effect/Schema';

const TestViewModes = ['preview', 'readonly', 'source'] as const;
const TestViewMode = Schema.Union(...TestViewModes.map((mode) => Schema.Literal(mode)));

const TestSettings = Schema.mutable(
  Schema.Struct({
    viewMode: TestViewMode.annotations({ title: 'View mode', description: 'Default document view mode.' }),
    toolbar: Schema.optional(Schema.Boolean.annotations({ title: 'Show toolbar', description: 'Display formatting toolbar.' })),
    fontSize: Schema.optional(Schema.Number.annotations({ title: 'Font size', description: 'Editor font size in pixels.' })),
    placeholder: Schema.optional(Schema.String.annotations({ title: 'Placeholder', description: 'Default placeholder text.' })),
    debug: Schema.optional(Schema.Boolean.annotations({ title: 'Debug mode', description: 'Enable debug features.' })),
  }),
);

type TestSettings = Schema.Schema.Type<typeof TestSettings>;

const FieldSetStory = () => {
  const [values, setValues] = React.useState<TestSettings>({
    viewMode: 'preview',
    toolbar: true,
    fontSize: 14,
    debug: false,
  });

  return (
    <Settings.Viewport>
      <Settings.Section title='Plugin Settings (Auto-generated)'>
        <Settings.FieldSet
          schema={TestSettings}
          values={values}
          onValuesChanged={setValues}
          visible={(path, values) => path !== 'placeholder' || !!values.debug}
        />
      </Settings.Section>
    </Settings.Viewport>
  );
};
```

Add the story export:
```typescript
export const FieldSet: Story = {
  render: FieldSetStory,
};
```

- [ ] **Step 2: Verify storybook renders**

Run: `moon run storybook-react:serve`
Navigate to `ui/react-ui-form/Settings` and check the `FieldSet` story renders correctly.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/react-ui-form/src/components/Settings/Settings.stories.tsx
git commit -m "feat(react-ui-form): add Settings.FieldSet storybook story"
```

---

### Task 4: Annotate markdown settings schema

Add `title` and `description` annotations to the markdown plugin's settings schema so `Settings.FieldSet` can auto-generate labels. Also annotate `EditorViewMode` and `EditorInputMode` literal members.

**Files:**
- Modify: `packages/plugins/plugin-markdown/src/types/Settings.ts`
- Modify: `packages/ui/ui-editor/src/types/types.ts`

- [ ] **Step 1: Annotate EditorViewMode and EditorInputMode**

In `packages/ui/ui-editor/src/types/types.ts`, annotate the union schemas and their literal members:

```typescript
export const EditorViewModes = ['preview', 'readonly', 'source'] as const;
export const EditorViewMode = Schema.Union(
  Schema.Literal('preview').annotations({ title: 'Preview' }),
  Schema.Literal('readonly').annotations({ title: 'Read-only' }),
  Schema.Literal('source').annotations({ title: 'Source' }),
);
export type EditorViewMode = Schema.Schema.Type<typeof EditorViewMode>;

export const EditorInputModes = ['default', 'vim', 'vscode'] as const;
export const EditorInputMode = Schema.Union(
  Schema.Literal('default').annotations({ title: 'Default' }),
  Schema.Literal('vim').annotations({ title: 'Vim' }),
  Schema.Literal('vscode').annotations({ title: 'VS Code' }),
);
export type EditorInputMode = Schema.Schema.Type<typeof EditorInputMode>;
```

- [ ] **Step 2: Annotate markdown settings schema**

In `packages/plugins/plugin-markdown/src/types/Settings.ts`:

```typescript
export const Settings = Schema.mutable(
  Schema.Struct({
    defaultViewMode: EditorViewMode.annotations({
      title: 'Default view mode',
      description: 'Set whether documents open in editing or read-only mode.',
    }),
    editorInputMode: Schema.optional(
      EditorInputMode.annotations({
        title: 'Editor input mode',
        description: 'Choose keyboard bindings for the editor.',
      }),
    ),
    experimental: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Enable experimental features',
        description: 'Turn on features that are still in development.',
      }),
    ),
    debug: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Enable debugging features',
        description: 'Show developer tools and diagnostics for the editor.',
      }),
    ),
    toolbar: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Show toolbar',
        description: 'Display a formatting toolbar above the editor.',
      }),
    ),
    typewriter: Schema.optional(
      Schema.String.annotations({
        title: 'Typewriter script',
        description: 'Script to replay typed input for testing purposes.',
      }),
    ),
    numberedHeadings: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Numbered headings',
        description: 'Automatically number heading levels in the document.',
      }),
    ),
    folding: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Folding',
        description: 'Allow collapsing and expanding sections by heading.',
      }),
    ),
  }),
);
```

- [ ] **Step 3: Verify build**

Run: `moon run plugin-markdown:build`
Expected: BUILD PASS

- [ ] **Step 4: Commit**

```bash
git add packages/ui/ui-editor/src/types/types.ts packages/plugins/plugin-markdown/src/types/Settings.ts
git commit -m "feat(plugin-markdown): annotate settings schema with title and description"
```

---

### Task 5: Convert MarkdownSettings to use Settings.FieldSet

Replace the manual settings component with the auto-generated version.

**Files:**
- Modify: `packages/plugins/plugin-markdown/src/components/MarkdownSettings/MarkdownSettings.tsx`

- [ ] **Step 1: Rewrite MarkdownSettings**

Replace the entire contents of `MarkdownSettings.tsx`:

```typescript
//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Input } from '@dxos/react-ui';
import { Settings as SettingsForm, type SettingsFieldProps } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { type Markdown } from '#types';

export type MarkdownSettingsProps = AppSurface.SettingsArticleProps<Markdown.Settings>;

const TypewriterField = ({ value, onChange, readonly }: SettingsFieldProps<string>) => (
  <Input.TextArea disabled={readonly} rows={5} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
);

export const MarkdownSettings = ({ settings, onSettingsChange }: MarkdownSettingsProps) => {
  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={meta.name ?? 'Editor'}>
        <SettingsForm.FieldSet
          schema={Markdown.Settings}
          values={settings}
          onValuesChanged={(values) => onSettingsChange?.(() => values)}
          readonly={!onSettingsChange}
          visible={(path, values) => path !== 'typewriter' || !!values.debug}
          fieldMap={{ typewriter: TypewriterField }}
        />
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};
```

- [ ] **Step 2: Remove unused translation keys**

In `packages/plugins/plugin-markdown/src/translations.ts`, remove the settings-specific translation keys that are now handled by schema annotations:

Remove these keys from the `[meta.id]` section:
- `'settings.title'`
- `'editor-input-mode.label'`
- `'editor-input-mode.description'`
- `'select-editor-input-mode.placeholder'`
- `'settings.editor-input-mode.default.label'`
- `'settings.editor-input-mode.vim.label'`
- `'settings.editor-input-mode.vscode.label'`
- `'settings.toolbar.label'`
- `'settings.toolbar.description'`
- `'settings.numbered-headings.label'`
- `'settings.numbered-headings.description'`
- `'settings.folding.label'`
- `'settings.folding.description'`
- `'settings.experimental.label'`
- `'settings.experimental.description'`
- `'settings.debug.label'`
- `'settings.debug.description'`
- `'settings.debug-typewriter.label'`
- `'settings.debug-typewriter.description'`
- `'settings.debug-typewriter.placeholder'`
- `'default-view-mode.label'`
- `'default-view-mode.description'`

Keep all non-settings keys (`plugin.name`, `editor.placeholder`, `fallback.title`, etc.).

- [ ] **Step 3: Remove unused imports from MarkdownSettings**

Verify the `useTranslation`, `Select`, and `EditorViewModes`/`EditorInputModes` imports are no longer needed and are removed.

- [ ] **Step 4: Verify build**

Run: `moon run plugin-markdown:build`
Expected: BUILD PASS

- [ ] **Step 5: Verify lint**

Run: `moon run plugin-markdown:lint -- --fix`
Expected: PASS (no lint errors)

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-markdown/src/components/MarkdownSettings/MarkdownSettings.tsx packages/plugins/plugin-markdown/src/translations.ts
git commit -m "refactor(plugin-markdown): replace manual settings UI with Settings.FieldSet"
```

---

### Task 6: Handle select option labels from literal annotations

The `getSelectOptionsFromAst` utility in Task 1 capitalizes the literal value as the label. For annotated literals (like `Schema.Literal('preview').annotations({ title: 'Preview' })`), we should use the annotation instead.

**Files:**
- Modify: `packages/ui/react-ui-form/src/util/field-type.ts`

- [ ] **Step 1: Update getSelectOptionsFromAst to read literal annotations**

```typescript
import * as SchemaAST from 'effect/SchemaAST';

import { getAnnotation, isLiteralUnion } from '@dxos/effect';

export type SelectOption = {
  value: string | number;
  label?: string;
};

export const getSelectOptionsFromAst = (ast: SchemaAST.AST): SelectOption[] | undefined => {
  if (!isLiteralUnion(ast)) {
    return undefined;
  }

  return (ast as SchemaAST.Union<SchemaAST.Literal>).types
    .map((type) => type.literal)
    .filter((v): v is string | number => v !== null)
    .map((value, index) => {
      const literalNode = (ast as SchemaAST.Union<SchemaAST.Literal>).types[index];
      const title = getAnnotation<string>(SchemaAST.TitleAnnotationId, false)(literalNode);
      const label = title ?? (typeof value === 'string' ? value.charAt(0).toUpperCase() + value.slice(1) : String(value));
      return { value, label };
    });
};
```

Note: pass `false` for the `noDefault` parameter of `getAnnotation` since literal annotations are always explicit.

- [ ] **Step 2: Verify build**

Run: `moon run react-ui-form:build`
Expected: BUILD PASS

- [ ] **Step 3: Commit**

```bash
git add packages/ui/react-ui-form/src/util/field-type.ts
git commit -m "feat(react-ui-form): read title annotations from literal union members for select labels"
```

---

### Task 7: Visual verification and cleanup

**Files:**
- All modified files from previous tasks

- [ ] **Step 1: Full build**

Run: `moon run react-ui-form:build && moon run ui-editor:build && moon run plugin-markdown:build`
Expected: All PASS

- [ ] **Step 2: Lint check**

Run: `moon run react-ui-form:lint -- --fix && moon run plugin-markdown:lint -- --fix`
Expected: All PASS

- [ ] **Step 3: Run tests**

Run: `moon run react-ui-form:test && moon run plugin-markdown:test`
Expected: All PASS

- [ ] **Step 4: Verify storybook**

Run storybook and verify Settings.FieldSet story renders correctly with:
- Select dropdown for view mode (with labeled options)
- Boolean toggles for toolbar, debug, etc.
- Conditional visibility of placeholder field
- Number input for font size

- [ ] **Step 5: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "chore: settings fieldset cleanup and verification"
```
