# Form theming via tailwind-variants — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-theme `Form` with a `tailwind-variants` recipe + behavior map, making the Settings look a `variant='settings'`, and ship a `bridgeTv` adapter for retrofitting the existing `tx` registry.

**Architecture:** A shared `tv` instance in `@dxos/ui-theme` bound to the same tailwind-merge config as `mx`. `Form.theme.ts` exports `{ styles: tv({ slots, variants }), behavior: Record<variant, flags> }`. Form parts read `variant` from form context and render slots; `bridgeTv` (explicit slot enumeration) adapts a recipe into `Theme<P>` for `tx`. The old `FieldPresentationConfig`/`presets.ts` prop-bag layer is removed.

**Tech Stack:** TypeScript, React, tailwind-variants, tailwind-merge, vitest, moon.

**Spec:** `docs/superpowers/specs/2026-06-21-form-tailwind-variants-theming-design.md`

**Conventions for every task:** run builds/tests with proto's moon:
`export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH"` (prefix once per shell). Filter out the `DEPOT_TOKEN` warning. Commit messages end with the Co-Authored-By trailer.

---

## File Structure

- `packages/ui/ui-theme/src/util/tw-merge-config.ts` — **new.** Shared `twMergeConfig` constant (extracted from `mx.ts`).
- `packages/ui/ui-theme/src/util/mx.ts` — **modify.** Build `mx` from the shared config.
- `packages/ui/ui-theme/src/util/tv.ts` — **new.** Shared `tv` instance + `bridgeTv` adapter.
- `packages/ui/ui-theme/src/util/tv.test.ts` — **new.** Tests for `tv` merge parity + `bridgeTv`.
- `packages/ui/ui-theme/src/util/index.ts` — **modify.** Export `tv`, `bridgeTv`, `twMergeConfig`.
- `packages/ui/react-ui-form/src/components/Form/Form.theme.ts` — **new.** `formTheme` recipe + behavior.
- `packages/ui/react-ui-form/src/components/Form/Form.theme.test.ts` — **new.** Recipe slot/variant assertions.
- `packages/ui/react-ui-form/src/components/Form/FormControls.tsx` — **modify.** `variant` on `FormRoot`; `FormSection` + `FormFieldSetController` use theme.
- `packages/ui/react-ui-form/src/hooks/useFormContext.ts` — **modify.** Add `variant` to `FormContextValue`.
- `packages/ui/react-ui-form/src/components/Form/FormField/presentation.tsx` — **modify.** Revert to class-free `FieldPresentation`; remove `FieldRow`.
- `packages/ui/react-ui-form/src/components/Form/FormField/FormFieldWrapper.tsx` — **modify.** Use `formTheme`; keep `FormFieldLabel.labelClassName`.
- `packages/ui/react-ui-form/src/components/Form/FormField/FormField.tsx` — **modify.** Drop `fieldPresentation`; revert placeholder.
- `packages/ui/react-ui-form/src/types.ts` — **modify.** Remove `FieldPresentationConfig` + `fieldPresentation`.
- `packages/ui/react-ui-form/src/components/Form/presets.ts` — **delete.**
- `packages/ui/react-ui-form/src/components/Form/index.ts` — **modify.** Drop `presets` export.
- `packages/ui/react-ui-form/src/components/Form/Form.stories.tsx` — **modify.** `SettingsPresentation` uses `variant`.
- `packages/plugins/plugin-markdown/src/components/MarkdownSettings/MarkdownSettings.tsx` — **modify.** `variant='settings'`.

---

## Task 1: Shared `tv` instance with mx-parity merge config

**Files:**

- Create: `packages/ui/ui-theme/src/util/tw-merge-config.ts`
- Modify: `packages/ui/ui-theme/src/util/mx.ts`
- Create: `packages/ui/ui-theme/src/util/tv.ts`
- Create: `packages/ui/ui-theme/src/util/tv.test.ts`
- Modify: `packages/ui/ui-theme/src/util/index.ts`
- Modify: `pnpm-workspace.yaml` (catalog), `packages/ui/ui-theme/package.json`

- [ ] **Step 1: Add the dependency**

Run:

```bash
export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH"
pnpm add --filter @dxos/ui-theme --save-catalog tailwind-variants
```

Expected: `tailwind-variants` added to the catalog in `pnpm-workspace.yaml` and to `@dxos/ui-theme` `dependencies` as `catalog:`. (It is compatible with the catalog's `tailwind-merge@^3.5.0`.)

- [ ] **Step 2: Extract the shared merge config**

Create `packages/ui/ui-theme/src/util/tw-merge-config.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

/**
 * Shared tailwind-merge configuration. The single source for both {@link mx} (extendTailwindMerge)
 * and the {@link tv} instance (createTV `twMergeConfig`) so conflict resolution can't drift —
 * notably for dxos custom tokens (`text-base-fg`, density, focus-ring).
 */
export const twMergeConfig = {
  extend: {
    classGroups: {
      'font-family': ['font-body', 'font-mono'],
      'font-weight': [
        'font-thin',
        'font-extralight',
        'font-light',
        'font-normal',
        'font-medium',
        'font-semibold',
        'font-bold',
        'font-extrabold',
        'font-black',
      ],
      density: ['dx-density-sm', 'dx-density-md', 'dx-density-lg'],
      'dx-focus-ring': [
        'dx-focus-ring',
        'dx-focus-ring-inset',
        'dx-focus-ring-always',
        'dx-focus-ring-inset-always',
        'dx-focus-ring-group',
        'dx-focus-ring-group-x',
        'dx-focus-ring-group-y',
        'dx-focus-ring-group-always',
        'dx-focus-ring-group-x-always',
        'dx-focus-ring-group-y-always',
        'dx-focus-ring-inset-over-all',
        'dx-focus-ring-inset-over-all-always',
        'dx-focus-ring-main',
        'dx-focus-ring-main-always',
      ],
    },
  },
} as const;

export type AdditionalClassGroups = 'density' | 'dx-focus-ring';
```

> Note: the `validators.isArbitraryNumber` entry previously in `mx`'s `font-weight` group is dropped from the shared constant only if it cannot be expressed as a plain string. Re-add it in `mx.ts` (Step 3) where `validators` is imported, by spreading the shared list and appending it — see Step 3.

- [ ] **Step 3: Rebuild `mx` from the shared config**

Replace the body of `packages/ui/ui-theme/src/util/mx.ts`:

```ts
//
// Copyright 2022 DXOS.org
//

import { extendTailwindMerge, validators } from 'tailwind-merge';

import { type AdditionalClassGroups, twMergeConfig } from './tw-merge-config';

export const mx = extendTailwindMerge<AdditionalClassGroups>({
  extend: {
    ...twMergeConfig.extend,
    classGroups: {
      ...twMergeConfig.extend.classGroups,
      // Arbitrary numeric font-weights require a validator (not expressible as a plain string token).
      'font-weight': [...twMergeConfig.extend.classGroups['font-weight'], validators.isArbitraryNumber],
    },
  },
});
```

- [ ] **Step 4: Write the failing test for the `tv` instance**

Create `packages/ui/ui-theme/src/util/tv.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { mx } from './mx';
import { bridgeTv, tv } from './tv';

describe('tv', () => {
  test('resolves standard tailwind conflicts like mx', ({ expect }) => {
    const recipe = tv({ base: 'text-sm', variants: { big: { true: 'text-lg' } } });
    expect(recipe({ big: true })).toBe(mx('text-sm', 'text-lg'));
    expect(recipe({ big: true })).toContain('text-lg');
    expect(recipe({ big: true })).not.toContain('text-sm');
  });

  test('keeps dxos custom color tokens (text-base-fg over text-description)', ({ expect }) => {
    const recipe = tv({ base: 'text-description', variants: { strong: { true: 'text-base-fg' } } });
    expect(recipe({ strong: true })).toBe(mx('text-description', 'text-base-fg'));
    expect(recipe({ strong: true })).toContain('text-base-fg');
  });
});

describe('bridgeTv', () => {
  test('adapts a slots recipe into Theme<P> functions with overrides', ({ expect }) => {
    const recipe = tv({
      slots: { root: 'p-1', label: 'text-sm' },
      variants: { variant: { settings: { root: 'p-4', label: 'text-lg' } } },
    });
    const theme = bridgeTv(recipe, ['root', 'label']);
    expect(typeof theme.root).toBe('function');
    expect((theme.root as any)({ variant: 'settings' })).toContain('p-4');
    // consumer override wins via per-slot merge.
    expect((theme.label as any)({ variant: 'settings' }, 'text-xl')).toContain('text-xl');
    expect((theme.label as any)({ variant: 'settings' }, 'text-xl')).not.toContain('text-lg');
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run:

```bash
moon run ui-theme:test -- src/util/tv.test.ts
```

Expected: FAIL — `tv`/`bridgeTv` not found in `./tv`.

- [ ] **Step 6: Implement `tv` and `bridgeTv`**

Create `packages/ui/ui-theme/src/util/tv.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { createTV } from 'tailwind-variants';

import { type ClassNameArray, type ClassNameValue, type Theme } from '@dxos/ui-types';

import { twMergeConfig } from './tw-merge-config';

/**
 * Shared tailwind-variants instance bound to the dxos tailwind-merge config (see {@link twMergeConfig}),
 * so recipes resolve class conflicts identically to {@link mx}. All component theme recipes import this,
 * never the bare `tailwind-variants` package.
 */
export const tv = createTV({ twMerge: true, twMergeConfig });

type SlotsRecipe<P extends Record<string, any>, S extends string> = (
  props?: P,
) => Record<S, (opts?: { class?: ClassNameValue }) => string>;

/**
 * Adapt a tailwind-variants slots recipe into the existing {@link Theme} shape (a map of
 * {@link import('@dxos/ui-types').ComponentFunction}) so it can register in the `tx` theme tree and be
 * consumed via `tx('component.slot', styleProps, ...classNames)`. Slots are enumerated explicitly (not
 * via Proxy) so unknown paths resolve to `undefined` exactly as `getDeep` does today, and the result is
 * a plain, inspectable object. Derive `slots` from `Object.keys(recipe())` at the call site.
 */
export const bridgeTv = <P extends Record<string, any>, S extends string>(
  recipe: SlotsRecipe<P, S>,
  slots: readonly S[],
): Theme<P> =>
  Object.fromEntries(
    slots.map((slot) => [slot, (styleProps: P, ...etc: ClassNameArray) => recipe(styleProps)[slot]({ class: etc })]),
  ) as Theme<P>;
```

- [ ] **Step 7: Export from the util barrel**

In `packages/ui/ui-theme/src/util/index.ts`, add (preserve existing exports):

```ts
export * from './tv';
export * from './tw-merge-config';
```

- [ ] **Step 8: Run the test to verify it passes**

Run:

```bash
moon run ui-theme:test -- src/util/tv.test.ts
moon run ui-theme:build
```

Expected: PASS; build succeeds.

- [ ] **Step 9: Commit**

```bash
git add packages/ui/ui-theme pnpm-workspace.yaml
git commit -m "feat(ui-theme): shared tailwind-variants instance + bridgeTv adapter"
```

---

## Task 2: `Form.theme.ts` recipe + behavior

**Files:**

- Create: `packages/ui/react-ui-form/src/components/Form/Form.theme.ts`
- Create: `packages/ui/react-ui-form/src/components/Form/Form.theme.test.ts`
- Modify: `packages/ui/react-ui-form/package.json` (ensure `@dxos/ui-theme` dep — it already depends on it via `@dxos/react-ui`; add direct dep if `tv` import fails to resolve)

- [ ] **Step 1: Write the failing test**

Create `packages/ui/react-ui-form/src/components/Form/Form.theme.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { formTheme } from './Form.theme';

describe('formTheme', () => {
  test('default variant adds no chrome to the field', ({ expect }) => {
    const s = formTheme.styles({ variant: 'default' });
    expect(s.field()).toBe('');
    expect(formTheme.behavior.default.showDescription).toBe(false);
  });

  test('settings variant frames the field and shows the description', ({ expect }) => {
    const s = formTheme.styles({ variant: 'settings' });
    expect(s.field()).toContain('border-separator');
    expect(s.field()).toContain('md:grid-cols-[1fr_1fr]');
    expect(s.labelText()).toContain('text-lg');
    expect(s.control()).toContain('justify-end');
    expect(formTheme.behavior.settings.showDescription).toBe(true);
  });

  test('per-slot override wins', ({ expect }) => {
    const s = formTheme.styles({ variant: 'settings' });
    expect(s.labelText({ class: 'text-2xl' })).toContain('text-2xl');
    expect(s.labelText({ class: 'text-2xl' })).not.toContain('text-lg');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
moon run react-ui-form:test -- src/components/Form/Form.theme.test.ts
```

Expected: FAIL — `./Form.theme` not found.

- [ ] **Step 3: Implement the recipe + behavior**

Create `packages/ui/react-ui-form/src/components/Form/Form.theme.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type VariantProps, tv } from '@dxos/ui-theme';

/** Visual variants for {@link Form}. `settings` is the bordered two-column settings-panel look. */
export type FormVariant = NonNullable<VariantProps<typeof formStyles>['variant']>;

/** Non-className behavior flags, keyed by {@link FormVariant}. */
export type FormBehavior = { showDescription: boolean };

const formStyles = tv({
  slots: {
    section: 'flex flex-col pt-form-section-gap first:pt-0',
    sectionTitle: 'text-lg',
    sectionDescription: 'text-description',
    fieldSet: '',
    field: '',
    labelContainer: '',
    labelText: '',
    description: 'text-description',
    control: '',
  },
  variants: {
    variant: {
      default: {},
      settings: {
        sectionTitle: 'px-trim-md text-xl',
        sectionDescription: 'px-trim-md',
        fieldSet: 'flex flex-col gap-trim-md pt-trim-md',
        field:
          'grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-x-trim-lg gap-y-0 p-trim-md border border-separator rounded-sm',
        labelContainer: 'md:col-span-full',
        labelText: 'pb-trim-md text-base-fg text-lg',
        description: 'text-base text-description',
        // Right-align the control: full-width inputs fill the column; fixed-width controls hug the end.
        control: 'flex items-center justify-end py-1',
      },
    },
  },
  defaultVariants: { variant: 'default' },
});

/** {@link Form} theme template: a tailwind-variants recipe (`styles`) plus non-class `behavior`. */
export const formTheme = {
  styles: formStyles,
  behavior: {
    default: { showDescription: false },
    settings: { showDescription: true },
  } satisfies Record<FormVariant, FormBehavior>,
};

/** Slot names of {@link formTheme.styles}, for `bridgeTv` registration. */
export const formSlots = Object.keys(formTheme.styles()) as Array<keyof ReturnType<typeof formTheme.styles>>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
moon run react-ui-form:test -- src/components/Form/Form.theme.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/react-ui-form/src/components/Form/Form.theme.ts packages/ui/react-ui-form/src/components/Form/Form.theme.test.ts packages/ui/react-ui-form/package.json
git commit -m "feat(react-ui-form): Form theme recipe + behavior map"
```

---

## Task 3: Add `variant` to form context and `Form.Root`

**Files:**

- Modify: `packages/ui/react-ui-form/src/hooks/useFormContext.ts`
- Modify: `packages/ui/react-ui-form/src/components/Form/FormControls.tsx`

- [ ] **Step 1: Add `variant` to `FormContextValue`**

In `useFormContext.ts`, import the type and extend the context value:

```ts
import { type FormVariant } from '../components/Form/Form.theme';
```

Change the `FormContextValue` type to include `variant`:

```ts
export type FormContextValue<T extends AnyProperties = any> = {
  form: FormHandler<T>;
  testId?: string;
  /** Visual variant applied across the form's parts (see Form.theme). */
  variant?: FormVariant;
} & FieldContext;
```

> If this creates an import cycle (`hooks` → `components/Form`), instead define `FormVariant` in a leaf module. Verify with the build in Step 4; if cyclic, move `export type FormVariant = 'default' | 'settings'` into `useFormContext.ts` and have `Form.theme.ts` import it, asserting recipe parity in the theme test.

- [ ] **Step 2: Add the `variant` prop to `FormRoot`**

In `FormControls.tsx`, extend `FormRootProps`. It already is `PropsWithChildren<{ onSave; onCancel } & Omit<FormContextValue<T>, 'form'> & Pick<...> & Omit<NaturalFormFieldSetProps<T>, 'schema' | 'path'>>`. Since `variant` is now on `FormContextValue`, it is already accepted and forwarded into the context via `<FormContextProvider form={form} {...props}>` (because `FormRoot` spreads `...props`). No code change needed beyond confirming `variant` is not destructured away — it must remain in `...props`. Add a doc line above `FormRoot`:

```ts
// `variant` (from FormContextValue) flows through `...props` into the context for all parts to read.
```

- [ ] **Step 3: Run build to verify wiring/types**

Run:

```bash
moon run react-ui-form:build
```

Expected: builds (no type errors). If an import cycle is reported, apply the fallback in Step 1's note.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/react-ui-form/src/hooks/useFormContext.ts packages/ui/react-ui-form/src/components/Form/FormControls.tsx
git commit -m "feat(react-ui-form): thread Form variant through context"
```

---

## Task 4: Revert `presentation.tsx` to class-free; remove `FieldRow`

**Files:**

- Modify: `packages/ui/react-ui-form/src/components/Form/FormField/presentation.tsx`

- [ ] **Step 1: Replace the file contents**

Replace `presentation.tsx` with the class-free resolved presentation (the chrome now comes from `formTheme`), and remove `FieldRow`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type FormPresentation } from '#types';

/**
 * Resolved presentation strategy for a field — which parts render, derived from {@link FormPresentation}.
 * Visual chrome (borders, grid, spacing) is owned by the Form theme recipe, not here.
 */
export type FieldPresentation = {
  layout?: FormPresentation;
  /** Render the value as read-only plain DOM rather than an editable control. */
  isStatic: boolean;
  /** Render the field's label row. */
  showLabel: boolean;
  /** Render the inline validation/error block beneath the control. */
  showError: boolean;
};

/**
 * Derive the {@link FieldPresentation} for a layout.
 * - `static` renders read-only plain DOM.
 * - `inline` drops the label (the control stands alone, e.g. an array row).
 * - `full` adds the inline error block.
 */
export const presentationFor = (layout?: FormPresentation): FieldPresentation => ({
  layout,
  isStatic: layout === 'static',
  showLabel: layout !== 'inline',
  showError: layout === 'full',
});
```

- [ ] **Step 2: Run build to find FieldRow references**

Run:

```bash
moon run react-ui-form:build 2>&1 | grep -E "FieldRow|presentationFor|fieldClassName" | head
```

Expected: errors only in `FormFieldWrapper.tsx` (FieldRow import + `presentationFor(presentation, fieldPresentation)`); these are fixed in Task 5. No other files reference `FieldRow`.

- [ ] **Step 3: Commit (after Task 5 compiles)**

Defer commit; this file compiles together with Task 5. Proceed to Task 5, then commit both.

---

## Task 5: Rewrite `FormFieldWrapper` to use the theme

**Files:**

- Modify: `packages/ui/react-ui-form/src/components/Form/FormField/FormFieldWrapper.tsx`

- [ ] **Step 1: Replace the `FormFieldWrapper` value-rendering section**

Update imports at the top of `FormFieldWrapper.tsx`:

```ts
import { Format } from '@dxos/echo';
import { inputTextLabel, Icon, Input, ThemedClassName, Tooltip } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type FormFieldRendererProps } from '#types';

import { formTheme } from '../Form.theme';
import { useFormContext } from '../../../hooks';
import { type FieldPresentation, presentationFor } from './presentation';
```

(Remove the `FieldRow` import.)

Keep `FormFieldLabel` and its `labelClassName` prop exactly as-is (the inner-node seam). Update the `FormFieldWrapperProps` `Pick` to drop `fieldPresentation` (keep `description`):

```ts
export type FormFieldWrapperProps<T = any> = Pick<
  FormFieldRendererProps,
  'readonly' | 'label' | 'description' | 'presentation' | 'getStatus' | 'getValue' | 'jsonPath' | 'format' | 'required'
> & {
  children?: (props: { value: T; presentation: FieldPresentation }) => ReactNode;
  standalone?: boolean;
  renderStatic?: (value: T | undefined) => ReactNode;
};
```

Replace the `FormFieldWrapper` function body:

```tsx
const FORM_FIELD_WRAPPER_NAME = 'Form.FieldWrapper';

export const FormFieldWrapper = <T,>(props: FormFieldWrapperProps<T>) => {
  const {
    children,
    readonly,
    presentation,
    label,
    description,
    jsonPath,
    format,
    required,
    standalone,
    renderStatic,
    getStatus,
    getValue,
  } = props;
  const { variant = 'default' } = useFormContext(FORM_FIELD_WRAPPER_NAME);
  const styles = formTheme.styles({ variant });
  const { showDescription } = formTheme.behavior[variant];
  const resolved = presentationFor(presentation);
  const { status, error } = getStatus();
  const value = getValue();
  if (resolved.isStatic && value == null) {
    return null;
  }

  const str = formatStaticValue(value, format);
  const control = resolved.isStatic
    ? (renderStatic?.(value) ?? <p className='truncate min-w-0'>{str}</p>)
    : children
      ? children({ value, presentation: resolved })
      : null;
  const controlClass = styles.control();

  return (
    <div className={styles.field()}>
      <Input.Root validationValence={status}>
        {resolved.showLabel && (
          <FormFieldLabel
            classNames={styles.labelContainer()}
            labelClassName={styles.labelText()}
            error={error}
            readonly={readonly}
            required={required}
            standalone={standalone}
            label={label}
            path={jsonPath}
          />
        )}
        {showDescription && description && (
          <Input.Description classNames={styles.description()}>{description}</Input.Description>
        )}
        {controlClass ? <div className={controlClass}>{control}</div> : control}
        {resolved.showError && error && (
          <Input.DescriptionAndValidation>
            <Input.Validation>{error}</Input.Validation>
          </Input.DescriptionAndValidation>
        )}
      </Input.Root>
    </div>
  );
};
```

(Leave `FormFieldLabel`, `formatStaticValue`, and `FormFieldErrorBoundary` unchanged. `FormFieldLabel` keeps its `labelClassName` prop applied to the inner label node — do not remove it.)

- [ ] **Step 2: Run build**

Run:

```bash
moon run react-ui-form:build 2>&1 | grep -E "error TS" | head
```

Expected: errors now only about `fieldPresentation`/`FieldPresentationConfig` still referenced in `FormField.tsx` and `types.ts` (fixed in Tasks 6–7). `FormFieldWrapper.tsx` and `presentation.tsx` compile.

- [ ] **Step 3: Commit presentation + wrapper**

```bash
git add packages/ui/react-ui-form/src/components/Form/FormField/presentation.tsx packages/ui/react-ui-form/src/components/Form/FormField/FormFieldWrapper.tsx
git commit -m "refactor(react-ui-form): FormFieldWrapper renders theme slots"
```

---

## Task 6: Drop `fieldPresentation` from `FormField` and `types.ts`

**Files:**

- Modify: `packages/ui/react-ui-form/src/components/Form/FormField/FormField.tsx`
- Modify: `packages/ui/react-ui-form/src/types.ts`

- [ ] **Step 1: Remove `fieldPresentation` + revert placeholder in `FormField.tsx`**

In `FormField.tsx`: remove `fieldPresentation` from the destructured props. Revert the placeholder memo to:

```ts
const placeholder = useMemo(
  () => (examples?.length ? `${t('example.placeholder')}: ${examples[0]}` : (description ?? label)),
  [examples, description, label, t],
);
```

Remove the `showDescription` const. In the `fieldProps` object, remove the `fieldPresentation` line; **keep** `description` and `presentation: layout`:

```ts
const fieldProps: FormFieldRendererProps = {
  type,
  format: Format.FormatAnnotation.getFromAst(type).pipe((annotation) => Option.getOrUndefined(annotation)),
  readonly,
  label,
  description,
  jsonPath,
  placeholder,
  presentation: layout,
  required,
  db,
  ...fieldState,
};
```

- [ ] **Step 2: Remove `FieldPresentationConfig` + `fieldPresentation` from `types.ts`**

In `types.ts`:

- Delete the entire `FieldPresentationConfig` type block.
- In `FormFieldRendererProps`, delete the `fieldPresentation?: FieldPresentationConfig;` line. **Keep** the `description?: string;` field.
- In `FormFieldOptions`, delete the `fieldPresentation?: FieldPresentationConfig;` line (and its doc comment).

- [ ] **Step 3: Run build**

Run:

```bash
moon run react-ui-form:build 2>&1 | grep -E "error TS|presets|settingsLayout" | head
```

Expected: errors now only about `./presets` (Form/index.ts) and `presets.ts` itself referencing removed types — fixed in Task 7.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/react-ui-form/src/components/Form/FormField/FormField.tsx packages/ui/react-ui-form/src/types.ts
git commit -m "refactor(react-ui-form): remove FieldPresentationConfig threading"
```

---

## Task 7: Delete `presets.ts`; wire `FormSection` + `FormFieldSetController` to the theme

**Files:**

- Delete: `packages/ui/react-ui-form/src/components/Form/presets.ts`
- Modify: `packages/ui/react-ui-form/src/components/Form/index.ts`
- Modify: `packages/ui/react-ui-form/src/components/Form/FormControls.tsx`

- [ ] **Step 1: Delete the preset file and its export**

Run:

```bash
git rm packages/ui/react-ui-form/src/components/Form/presets.ts
```

In `Form/index.ts`, remove the line `export * from './presets';`.

- [ ] **Step 2: Rewrite `FormSection` to use the theme**

In `FormControls.tsx`, add imports:

```ts
import { formTheme } from './Form.theme';
import { useFormContext } from '../../hooks';
```

Replace the `FormSection` block. Drop `titleClassName`/`descriptionClassName` props; read `variant` from context:

```ts
export type FormSectionProps = ThemedClassName<{ title?: string; description?: string }>;

export const FormSection = composable<HTMLDivElement, FormSectionProps>(
  ({ children, title, description, ...props }, forwardedRef) => {
    const { variant = 'default' } = useFormContext(FORM_SECTION_NAME);
    const styles = formTheme.styles({ variant });
    return (
      <div {...composableProps(props, { classNames: styles.section() })} ref={forwardedRef}>
        {title && <h2 className={styles.sectionTitle()}>{title}</h2>}
        {description && <p className={styles.sectionDescription()}>{description}</p>}
        {children}
      </div>
    );
  },
);

FormSection.displayName = FORM_SECTION_NAME;
```

(`composableProps`'s `classNames` default merges with any user `classNames`; per-call override still works.)

- [ ] **Step 3: Apply the `fieldSet` slot in `FormFieldSetController`**

Replace `FormFieldSetController`:

```ts
export const FormFieldSetController = ({ classNames, ...props }: FormFieldSetControllerProps) => {
  const { form, variant = 'default', ...contextProps } = useFormContext(FORM_FIELDSET_NAME);
  const styles = formTheme.styles({ variant });
  return <FormFieldSet schema={form.schema} classNames={styles.fieldSet({ class: classNames })} {...contextProps} {...props} />;
};
```

> `classNames` is pulled out of `props` so the user override merges through the `fieldSet` slot rather than being overwritten by `{...props}`. `variant` is removed from `contextProps` so it isn't passed twice (it is not a `FormFieldSet` prop).

- [ ] **Step 4: Run build + existing tests**

Run:

```bash
moon run react-ui-form:build
moon run react-ui-form:test
```

Expected: build clean; all existing tests pass (53+ plus the two new theme tests).

- [ ] **Step 5: Commit**

```bash
git add packages/ui/react-ui-form/src/components/Form
git commit -m "refactor(react-ui-form): Section + FieldSet consume Form theme; drop presets"
```

---

## Task 8: Convert `MarkdownSettings` and stories to `variant`

**Files:**

- Modify: `packages/plugins/plugin-markdown/src/components/MarkdownSettings/MarkdownSettings.tsx`
- Modify: `packages/ui/react-ui-form/src/components/Form/Form.stories.tsx`

- [ ] **Step 1: Update `MarkdownSettings`**

Replace the import and the JSX so it uses `variant='settings'` and no presets. Keep the existing `SnippetsField` (custom field via `FormFieldWrapper`) and the user's `Panel`/`dx-document`/`py-8` wrappers:

```tsx
import { Form, FormFieldWrapper, type FormFieldRendererProps } from '@dxos/react-ui-form';
```

```tsx
<Form.Root
  schema={Markdown.Settings}
  values={settings}
  variant='settings'
  readonly={!onSettingsChange}
  onValuesChanged={(values) => onSettingsChange?.((current) => ({ ...current, ...values }))}
>
  <Form.Viewport classNames='py-8' scroll>
    <Form.Content classNames='dx-document'>
      <Form.Section title={meta.profile.name}>
        <Form.FieldSet
          fieldMap={{ snippets: SnippetsField }}
          // The snippets field is a debug-only affordance.
          filter={(properties) =>
            settings.debug ? properties : properties.filter((property) => property.name !== 'snippets')
          }
        />
      </Form.Section>
    </Form.Content>
  </Form.Viewport>
</Form.Root>
```

- [ ] **Step 2: Update the `SettingsPresentation` story**

In `Form.stories.tsx`: remove the `import { settingsLayout } from './presets';` line and set the story to use `variant`:

```ts
export const SettingsPresentation: Story<Schema.Schema.Type<typeof SettingsSchema>> = {
  args: {
    schema: SettingsSchema,
    values: { viewMode: 'preview', toolbar: true, fontSize: 14 },
    variant: 'settings',
  },
};
```

Update its doc comment to reference `variant='settings'` instead of `settingsLayout`.

- [ ] **Step 3: Update the `Settings` deprecation notes**

In `Settings.tsx`, `SettingsFieldSet.tsx`, `SettingsItem.tsx`: change any `settingsLayout`/`settingsFieldPresentation` mentions in `@deprecated` JSDoc to: `Use {@link Form} with \`variant='settings'\` instead.`

- [ ] **Step 4: Build + lint both packages**

Run:

```bash
moon run react-ui-form:build react-ui-form:lint plugin-markdown:build plugin-markdown:lint
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-markdown packages/ui/react-ui-form/src/components/Form/Form.stories.tsx packages/ui/react-ui-form/src/components/Settings
git commit -m "refactor(plugin-markdown): MarkdownSettings uses Form variant='settings'"
```

---

## Task 9: Verify visually + final checks

**Files:** none (verification).

- [ ] **Step 1: Cast audit**

Run:

```bash
git diff origin/main -- '*.ts' '*.tsx' | grep -nE '^\+.*\bas (any|unknown|[A-Z])|as unknown as' | grep -v 'as const'
```

Expected: only the `as Theme<P>` in `bridgeTv` (a deliberate adapter boundary — annotate with a comment) and the `Object.keys(...) as Array<...>` in `Form.theme.ts`. Justify or remove any others.

- [ ] **Step 2: Run the full form test suite**

Run:

```bash
moon run react-ui-form:test
```

Expected: all pass.

- [ ] **Step 3: Visual verification in a worktree storybook**

Start storybook on a free port (do NOT touch the user's 9009):

```bash
moon run storybook-react:serve -- --port 9014 --no-open --ci
```

Drive with Playwright (or the user's preferred tool):

- `plugins-plugin-markdown-components-markdownsettings--default` at width 1000 — confirm bordered 2-col cards, title spanning, description left, controls right-aligned, "Markdown" section header padded.
- `ui-react-ui-form-form--default` — confirm default forms are visually unchanged (no borders/grid).
- `ui-react-ui-form-form--settings-presentation` — confirm the settings look.

Stop the storybook and clean up the port when done.

- [ ] **Step 4: Final commit (if any verification fixes)**

```bash
git add -A && git commit -m "test(react-ui-form): verify Form theme variants"
```

---

## Retrofit follow-up (NOT in this plan)

A separate change migrates `Message.theme.ts` to `tv` + `bridgeTv` (registered as `message:` in `defaultTheme`), with a test asserting output equivalence to the current `messageTheme` across its style props, then proceeds component-by-component. `bridgeTv` shipped in Task 1 makes this mechanical.
