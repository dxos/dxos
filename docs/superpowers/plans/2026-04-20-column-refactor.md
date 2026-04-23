# Column Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all core UI components (Dialog, Form, Card, SearchList) automatically column-aware via CSS custom properties and theme utilities, eliminating manual Column wrapper wiring.

**Architecture:** Column.Root sets `--dx-col: 2 / span 1` alongside `--gutter`. Non-viewport components consume `--dx-col` for grid placement. ScrollArea.Viewport resets `--dx-col` after consuming `--gutter`. Theme provides `withColumn` utilities so components are column-aware without importing Column. Intermediate containers propagate the grid via CSS subgrid.

**Tech Stack:** CSS custom properties, CSS subgrid, Tailwind arbitrary values, DXOS ui-theme system.

**Spec:** `docs/superpowers/specs/2026-04-20-column-refactor-design.md`

---

### Task 1: Add `withColumn` theme utilities

**Files:**

- Modify: `packages/ui/ui-theme/src/theme/primitives/column.ts`

- [ ] **Step 1: Add withColumn utility object**

Add the `withColumn` export before the `columnTheme` export:

```ts
/**
 * Column-aware theme utilities.
 * Components apply these in their theme functions to participate in the Column grid
 * without importing Column React components.
 *
 * CSS custom property cascade:
 * - Column.Root sets `--dx-col: 2 / span 1` (center column placement).
 * - ScrollArea.Viewport resets `--dx-col: auto` after consuming `--gutter`.
 * - Components apply `grid-column: var(--dx-col, auto)` to auto-center in Column
 *   or do nothing outside Column / inside ScrollArea.
 */
export const withColumn = {
  /** Centers element in the Column grid via --dx-col. No-op outside Column or inside ScrollArea. */
  center: () => '[grid-column:var(--dx-col,auto)]',

  /** Propagates the Column grid to children via subgrid. No-op outside Column. */
  propagate: () => '[.dx-column_&]:col-span-full [.dx-column_&]:grid [.dx-column_&]:grid-cols-subgrid',

  /** Resets --dx-col after consuming --gutter. Applied by ScrollArea.Viewport. */
  consumed: () => '[--dx-col:auto]',
};
```

- [ ] **Step 2: Update columnRow — remove center/fullWidth**

Change the `ColumnStyleProps` type and `columnRow` function:

```ts
export type ColumnStyleProps = {};

const columnRow: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx('col-span-3 grid grid-cols-subgrid', ...etc);
};
```

- [ ] **Step 3: Update columnBleed — add subgrid propagation**

```ts
const columnBleed: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx('col-span-full grid grid-cols-subgrid min-h-0', ...etc);
};
```

- [ ] **Step 4: Update columnCenter — use withColumn.center()**

```ts
const columnCenter: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx(withColumn.center(), 'min-h-0', ...etc);
};
```

- [ ] **Step 5: Build to verify**

Run: `moon run ui-theme:build`
Expected: PASS (no consumers changed yet)

- [ ] **Step 6: Commit**

```bash
git add packages/ui/ui-theme/src/theme/primitives/column.ts
git commit -m "feat(ui-theme): add withColumn utilities and simplify Column theme"
```

---

### Task 2: Update Column React components

**Files:**

- Modify: `packages/ui/react-ui/src/primitives/Column/Column.tsx`

- [ ] **Step 1: Update ColumnRoot — set --dx-col**

Add `'--dx-col': '2 / span 1'` to the inline style object in ColumnRoot (line 54):

```ts
const ColumnRoot = slottable<HTMLDivElement, ColumnRootProps>(
  ({ children, asChild, role, gutter = 'md', ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    const { tx } = useThemeContext();
    const gutterSize = gutterSizes[gutter];
    return (
      <Comp
        {...rest}
        role={role ?? 'none'}
        style={
          {
            '--gutter': gutterSize,
            '--dx-col': '2 / span 1',
            gridTemplateColumns: [gutterSize, 'minmax(0,1fr)', gutterSize].join(' '),
          } as CSSProperties
        }
        className={tx('column.root', { gutter }, className)}
        ref={forwardedRef}
      >
        {children}
      </Comp>
    );
  },
);
```

- [ ] **Step 2: Update ColumnRow — remove center/fullWidth props**

Remove `fullWidth` and `center` from the destructure and the `tx` call:

```ts
type ColumnRowProps = {};

/**
 * Spans all 3 columns of the parent Column.Root and uses CSS subgrid to inherit their sizing.
 * Children map to: [col-1: icon/slot] [col-2: content] [col-3: icon/action].
 * Must be a direct child of Column.Root or a subgrid propagator.
 */
const ColumnRow = slottable<HTMLDivElement, ColumnRowProps>(
  ({ children, asChild, role, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    const { tx } = useThemeContext();
    return (
      <Comp
        {...rest}
        role={role ?? 'none'}
        className={tx('column.row', {}, className)}
        ref={forwardedRef}
      >
        {children}
      </Comp>
    );
  },
);
```

- [ ] **Step 3: Update ColumnRoot JSDoc**

```ts
/**
 * Creates a 3-column CSS grid with left/right gutter columns and a center content column.
 * Sets the `--gutter` and `--dx-col` CSS variables for nested components.
 *
 * Direct children participate in the grid in one of several ways:
 * - **Column.Center** — places element in the center column (col 2) via `--dx-col`.
 * - **Column.Bleed** — spans all 3 columns with subgrid propagation for nested grid children.
 * - **Column.Row** — 3-col subgrid row (icons in gutters, content in center).
 *
 * Components can also be column-aware via `withColumn` theme utilities without using
 * these wrapper components.
 *
 * Gutter sizes: `'sm'` for compact layouts (Dialog); `'md'` (default); `'lg'` for wider spacing.
 */
```

- [ ] **Step 4: Update ColumnBleed JSDoc**

```ts
/**
 * Spans all 3 columns of the parent Column.Root and propagates the grid via CSS subgrid.
 * Children become grid items and can use `--dx-col` for placement.
 * Use for intermediate containers (Dialog.Body) that need to pass the Column grid through.
 */
```

- [ ] **Step 5: Remove ColumnStyleProps import from Column.tsx**

Update the `ColumnRowProps` type. Since `ColumnStyleProps` is now empty, `ColumnRowProps` should use `SlottableProps` or an empty object:

```ts
import { type SlottableProps } from '@dxos/ui-types';

// ...

type ColumnRowProps = SlottableProps;
```

Wait — `SlottableProps` is already the base from `slottable`. The second type param is the additional props. Since there are none, use `{}` or omit it. Check the `slottable` signature. The current code has:

```ts
type ColumnRowProps = ColumnStyleProps;
```

Change to:

```ts
type ColumnRowProps = {};
```

- [ ] **Step 6: Update exports — remove ColumnStyleProps from public types**

The current export line:

```ts
export type { ColumnRootProps, ColumnRowProps, ColumnBleedProps, ColumnCenterProps };
```

This stays the same — the types are still exported, they're just simpler now.

- [ ] **Step 7: Build to verify**

Run: `moon run react-ui:build`
Expected: FAIL — Dialog.tsx and Card.tsx still pass `center` to Column.Row. That's expected; we'll fix those in later tasks.

- [ ] **Step 8: Commit**

```bash
git add packages/ui/react-ui/src/primitives/Column/Column.tsx
git commit -m "refactor(react-ui): update Column components for --dx-col cascade"
```

---

### Task 3: Update ScrollArea theme — reset --dx-col

**Files:**

- Modify: `packages/ui/ui-theme/src/theme/components/scroll-area.ts`

- [ ] **Step 1: Import withColumn**

Add import at top of file:

```ts
import { withColumn } from '../primitives/column';
```

- [ ] **Step 2: Add withColumn.consumed() to scrollAreaViewport**

In the `scrollAreaViewport` function, add `withColumn.consumed()` to the `mx()` call. Place it after the existing gutter comment block (after line 78):

```ts
export const scrollAreaViewport: ComponentFunction<ScrollAreaStyleProps> = (
  { orientation, centered, padding, snap, thin, autoHide },
  ...etc
) => {
  return mx(
    'h-full w-full',

    orientation === 'vertical' && 'flex flex-col overflow-y-scroll',
    orientation === 'horizontal' && 'flex overflow-x-scroll overscroll-x-contain',
    orientation === 'all' && 'overflow-scroll',

    '[&::-webkit-scrollbar-corner]:bg-transparent',
    '[&::-webkit-scrollbar-track]:bg-transparent',
    '[&::-webkit-scrollbar-thumb]:rounded-none',

    '[&::-webkit-scrollbar]:w-[var(--scroll-width)] [&::-webkit-scrollbar]:h-[var(--scroll-width)]',

    // If contained within Column.Root grid the gutter is set by that component (--gutter CSS variable).
    // If centered, left padding compensates for scrollbar width so content is visually centered.
    (orientation === 'vertical' || orientation === 'all') &&
      (padding
        ? [
            centered ? 'pl-[var(--gutter,calc(var(--scroll-width)+var(--scroll-padding)))]' : 'pl-[var(--gutter,0)]',
            'pr-[calc(var(--gutter,calc(var(--scroll-width)+var(--scroll-padding)))-var(--scroll-width))]',
          ]
        : centered && 'pl-[var(--scroll-width)]'),

    // Reset --dx-col so nested components don't try to grid-position themselves.
    // ScrollArea has already consumed --gutter for padding.
    withColumn.consumed(),

    // ... rest unchanged (horizontal padding, snap, autoHide) ...
```

- [ ] **Step 3: Build to verify**

Run: `moon run ui-theme:build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/ui/ui-theme/src/theme/components/scroll-area.ts
git commit -m "refactor(ui-theme): reset --dx-col in ScrollArea.Viewport"
```

---

### Task 4: Update Dialog — use withColumn in theme and components

**Files:**

- Modify: `packages/ui/ui-theme/src/theme/components/dialog.ts`
- Modify: `packages/ui/react-ui/src/components/Dialog/Dialog.tsx`
- Modify: `packages/ui/react-ui/src/components/Dialog/Dialog.stories.tsx`

- [ ] **Step 1: Update dialog theme — add withColumn to header, body, actionbar**

In `dialog.ts`, import `withColumn` and update the three theme functions:

```ts
import { withColumn } from '../primitives/column';

// ...

export const dialogHeader: ComponentFunction<DialogStyleProps> = (_props, ...etc) =>
  mx('dx-dialog__header flex pb-4 items-center justify-between', withColumn.center(), ...etc);

export const dialogBody: ComponentFunction<DialogStyleProps> = (_props, ...etc) =>
  mx('dx-dialog__body', withColumn.propagate(), ...etc);

export const dialogActionBar: ComponentFunction<DialogStyleProps> = (_props, ...etc) =>
  mx('dx-dialog__actionbar flex items-center pt-4 gap-2 dx-density-coarse', withColumn.center(), ...etc);
```

- [ ] **Step 2: Update DialogHeader — remove Column.Row, use plain div**

In `Dialog.tsx`, change DialogHeader from wrapping in `Column.Row` to a plain div with theme:

```ts
const DialogHeader = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props);
  const Comp = asChild ? Slot : Primitive.div;
  const { tx } = useThemeContext();
  return (
    <Comp {...rest} className={tx('dialog.header', {}, className)} ref={forwardedRef}>
      {children}
    </Comp>
  );
});
```

- [ ] **Step 3: Update DialogBody — remove Column.Center, use plain div**

Change DialogBody from wrapping in `Column.Center` to a plain div with theme:

```ts
const DialogBody = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props);
  const Comp = asChild ? Slot : Primitive.div;
  const { tx } = useThemeContext();
  return (
    <Comp {...rest} className={tx('dialog.body', {}, className)} ref={forwardedRef}>
      {children}
    </Comp>
  );
});
```

- [ ] **Step 4: Update DialogActionBar — remove Column.Row, use plain div**

Change DialogActionBar. Currently it nests a `<div>` inside `<Column.Row center>`. Flatten to just the div with theme:

```ts
const DialogActionBar = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { className: classNames, ...rest } = composableProps(props);
  const Comp = asChild ? Slot : Primitive.div;
  const { tx } = useThemeContext();
  return (
    <Comp {...rest} className={tx('dialog.actionbar', {}, classNames)} ref={forwardedRef}>
      {children}
    </Comp>
  );
});
```

- [ ] **Step 5: Remove Column import from Dialog.tsx if no longer used**

Check if `Column` is still imported for Dialog.Content (it is — `Column.Root`). Keep the import but verify only `Column.Root` is used.

- [ ] **Step 6: Fix Dialog.stories.tsx comment**

Change line 27 from:

```ts
 * Dialog.Body delegates to Column.Center, placing content in the center column between gutters.
```

To:

```ts
 * Dialog.Body propagates the Column grid via subgrid. Children auto-center via --dx-col.
```

Also fix line 65 if `--gutter-offset` reference exists — change to reference `--gutter`.

- [ ] **Step 7: Build to verify**

Run: `moon run react-ui:build`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add packages/ui/ui-theme/src/theme/components/dialog.ts \
       packages/ui/react-ui/src/components/Dialog/Dialog.tsx \
       packages/ui/react-ui/src/components/Dialog/Dialog.stories.tsx
git commit -m "refactor(react-ui): Dialog uses withColumn theme utilities"
```

---

### Task 5: Update Form — add column awareness

**Files:**

- Modify: `packages/ui/react-ui-form/src/components/Form/Form.tsx`

- [ ] **Step 1: Import withColumn**

Add to the existing `@dxos/ui-theme` import line:

```ts
import { composable, composableProps, mx, withColumn } from '@dxos/ui-theme';
```

- [ ] **Step 2: Update FormContent — add withColumn.center()**

Change the classNames in FormContent (line 197):

```ts
const FormContent = composable<HTMLDivElement, FormContentProps>(({ children, ...props }, forwardedRef) => {
  const { form, testId } = useFormContext(FORM_CONTENT_NAME);
  const localRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergeRefs([forwardedRef, localRef]);
  useKeyHandler(localRef, form);

  return (
    <div
      {...composableProps(props, { role: 'form', classNames: mx(withColumn.center(), 'flex flex-col w-full pb-form-gap') })}
      data-testid={testId}
      ref={mergedRef}
    >
      {children}
    </div>
  );
});
```

- [ ] **Step 3: Update FormActions — add withColumn.center()**

Change the classNames in FormActions (line 248):

```ts
return (
  <div role='none' className={mx(withColumn.center(), 'grid grid-flow-col gap-form-gap auto-cols-fr py-form-padding', classNames)}>
```

- [ ] **Step 4: Build to verify**

Run: `moon run react-ui-form:build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/ui/react-ui-form/src/components/Form/Form.tsx
git commit -m "feat(react-ui-form): make Form.Content and Form.Actions column-aware"
```

---

### Task 6: Update SearchList — add column awareness

**Files:**

- Modify: `packages/ui/react-ui-search/src/components/SearchList/SearchList.tsx`

- [ ] **Step 1: Import withColumn**

Add to the existing `@dxos/ui-theme` import line:

```ts
import { composable, composableProps, mx, withColumn } from '@dxos/ui-theme';
```

- [ ] **Step 2: Update SearchListContent — add withColumn.propagate()**

Change classNames and update JSDoc (lines 236-249):

```ts
/**
 * Optional wrapper that groups `SearchList.Input` and `SearchList.Viewport`.
 * When inside a Column context, propagates the grid via subgrid so children
 * can auto-center (Input) or auto-bleed (Viewport).
 */
const SearchListContent = composable<HTMLDivElement>(({ children, ...props }, forwardedRef) => {
  return (
    <div {...composableProps(props, { role: 'none', classNames: mx('dx-expander', withColumn.propagate()) })} ref={forwardedRef}>
      {children}
    </div>
  );
});
```

- [ ] **Step 3: Update SearchListInput — add withColumn.center()**

SearchListInput renders `<Input.Root>` which is a div. Add a classNames prop to Input.Root to apply withColumn.center(). Change the return statement (lines 353-366):

```ts
return (
  <Input.Root classNames={withColumn.center()}>
    <Input.TextInput
      {...props}
      variant='subdued'
      autoFocus={props.autoFocus && !hasIosKeyboard}
      placeholder={placeholder ?? defaultPlaceholder}
      value={query}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      ref={forwardedRef}
    />
  </Input.Root>
);
```

Verify that `Input.Root` accepts a `classNames` prop. If it uses `composableProps` or `slottable`, it should accept `classNames` via the spread. If not, wrap in a div instead:

```ts
return (
  <div className={withColumn.center()}>
    <Input.Root>
      <Input.TextInput ... />
    </Input.Root>
  </div>
);
```

- [ ] **Step 4: Build to verify**

Run: `moon run react-ui-search:build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/ui/react-ui-search/src/components/SearchList/SearchList.tsx
git commit -m "feat(react-ui-search): make SearchList column-aware"
```

---

### Task 7: Update Card — use own subgrid CSS

**Files:**

- Modify: `packages/ui/react-ui/src/components/Card/Card.tsx`

- [ ] **Step 1: Change CardRow — replace Column.Row with own subgrid**

CardRow currently renders `<Column.Row {...rest} className={tx('card.row', {}, className)}>`. Change it to use a plain div with the subgrid CSS:

```ts
const CardRow = slottable<HTMLDivElement, CardRowProps>(
  ({ children, asChild, icon, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    const { tx } = useThemeContext();

    return (
      <Comp {...rest} className={tx('card.row', {}, className)} ref={forwardedRef}>
        {(icon && <CardIcon classNames='text-subdued' icon={icon} size={4} />) || <div />}
        {children}
      </Comp>
    );
  },
);
```

Check `card.row` theme function to ensure it already includes `col-span-3 grid grid-cols-subgrid` or equivalent. If not, update the card theme:

```ts
// In card.ts theme (find cardRow function)
// Ensure it includes: 'col-span-3 grid grid-cols-subgrid'
```

- [ ] **Step 2: Remove Column import from Card.tsx if no longer needed**

Check if `Column` is still used elsewhere in Card.tsx (it is — `Card.Root` uses `Column.Root`). Keep the import.

Actually, CardRow currently uses `<Column.Row>` which gets `col-span-3 grid grid-cols-subgrid` from the theme. If we switch to `<Comp>` (a plain div), the card.row theme function must include those classes. Check the card theme file to see if `card.row` already has the subgrid classes or if they come from `column.row`.

If `card.row` theme does NOT include the subgrid classes (they come from column.row), add them to the card.row theme function.

- [ ] **Step 3: Build to verify**

Run: `moon run react-ui:build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/ui/react-ui/src/components/Card/Card.tsx
# Also add card theme file if modified
git commit -m "refactor(react-ui): Card.Row uses own subgrid instead of Column.Row"
```

---

### Task 8: Update Column stories

**Files:**

- Modify: `packages/ui/react-ui/src/primitives/Column/Column.stories.tsx`

- [ ] **Step 1: Update DefaultStory**

Replace all `Column.Row center` with `Column.Center`. Replace the raw 3-slot `Column.Row` usage (A|B|C) to keep it as Column.Row:

```tsx
const DefaultStory = () => {
  return (
    <Column.Root classNames='overflow-hidden' gutter='md'>
      <Column.Center>
        <h1 className='p-1 bg-blue-500 text-black'>Header</h1>
      </Column.Center>

      <Column.Row>
        <div className='p-1 bg-blue-500'>A</div>
        <div className='p-1 bg-red-500'>B</div>
        <div className='p-1 bg-blue-500'>C</div>
      </Column.Row>

      <Column.Center classNames='py-2'>
        <Input.Root>
          <Input.TextInput placeholder='Search' />
        </Input.Root>
      </Column.Center>

      <Column.Bleed asChild>
        <ScrollArea.Root orientation='vertical' padding>
          <ScrollArea.Viewport>
            <div className='flex flex-col gap-2'>
              {Array.from({ length: 100 }).map((_, i) => (
                <Input.Root key={i}>
                  <Input.TextInput value={`Item ${i}`} readOnly />
                </Input.Root>
              ))}
            </div>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Column.Bleed>

      <Column.Center>
        <Flex column>
          <h1 className='p-1 bg-red-500 text-black'>Section with overflow</h1>
          <pre className='p-1 text-xs text-subdued overflow-auto'>{new Error().stack}</pre>
        </Flex>
      </Column.Center>

      <Column.Center>
        <div className='p-1 bg-green-500 text-black'>Footer</div>
      </Column.Center>
    </Column.Root>
  );
};
```

- [ ] **Step 2: Update WithScrollArea story**

Replace `Column.Row center` with `Column.Center`:

```tsx
export const WithScrollArea = {
  decorators: [withLayout({ layout: 'column' })],
  render: () => (
    <Column.Root classNames='overflow-hidden' gutter='md'>
      <Column.Center>
        <h2 className='py-3'>Header</h2>
      </Column.Center>
      <ScrollArea.Root padding centered orientation='vertical' classNames='col-span-full'>
        <ScrollArea.Viewport>
          <InputList items={30} />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
      <Column.Center>
        <h2 className='py-3'>Footer</h2>
      </Column.Center>
    </Column.Root>
  ),
};
```

- [ ] **Step 3: Update WithCenter story**

Replace `Column.Row center` headers/footers with `Column.Center`:

```tsx
export const WithCenter: Story = {
  decorators: [withLayout({ layout: 'column', classNames: 'w-[25rem]' })],
  render: () => (
    <Column.Root classNames='overflow-hidden' gutter='md'>
      <Column.Center>
        <h2 className='py-3'>Header (Column.Center)</h2>
      </Column.Center>
      <Column.Center classNames='flex flex-col'>
        <p className='py-2'>This text is inside Column.Center. It sits in the central column between the gutters.</p>
        <Input.Root>
          <Input.Label>Name</Input.Label>
          <Input.TextInput placeholder='Enter name' />
        </Input.Root>
      </Column.Center>
      <Column.Center>
        <h2 className='py-3'>Footer (Column.Center)</h2>
      </Column.Center>
    </Column.Root>
  ),
};
```

- [ ] **Step 4: Update WithBleed story**

Replace `Column.Row center` with `Column.Center`:

```tsx
export const WithBleed: Story = {
  decorators: [withLayout({ layout: 'column', classNames: 'w-[25rem]' })],
  render: () => (
    <Column.Root classNames='overflow-hidden' gutter='md'>
      <Column.Center>
        <h2 className='py-3'>Header (Column.Center)</h2>
      </Column.Center>
      <Column.Bleed asChild>
        <ScrollArea.Root orientation='vertical' padding thin>
          <ScrollArea.Viewport>
            <InputList items={30} />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Column.Bleed>
      <Column.Center>
        <h2 className='py-3'>Footer (Column.Center)</h2>
      </Column.Center>
    </Column.Root>
  ),
};
```

- [ ] **Step 5: Remove the TODO on line 13**

The `List` component at the top of the file renders `ScrollArea.Root centered` directly inside Column.Root. ScrollArea auto-bleeds via `[.dx-column_&]:col-span-full`, so the clipping issue should be resolved. Remove or update the TODO comment.

- [ ] **Step 6: Build to verify**

Run: `moon run react-ui:build`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/ui/react-ui/src/primitives/Column/Column.stories.tsx
git commit -m "refactor(react-ui): update Column stories for simplified API"
```

---

### Task 9: Update AUDIT.md

**Files:**

- Modify: `packages/ui/react-ui/src/primitives/Column/AUDIT.md`

- [ ] **Step 1: Update the document**

Update the AUDIT.md to reflect the new design:

- Document the `withColumn` utilities (center, propagate, consumed)
- Document the `--dx-col` CSS custom property cascade
- Update the Column primitives table
- Update the component integration sections (Dialog, Form, SearchList, Card)
- Remove references to old patterns (Column.Row center, Dialog.Body = Column.Center)

- [ ] **Step 2: Commit**

```bash
git add packages/ui/react-ui/src/primitives/Column/AUDIT.md
git commit -m "docs(react-ui): update Column AUDIT.md for withColumn refactor"
```

---

### Task 10: Full build and search for remaining Column.Row center usages

**Files:**

- Potentially modify: any consumer still using `Column.Row center` or `Column.Row fullWidth`

- [ ] **Step 1: Search for remaining Column.Row center/fullWidth usages**

Run: `grep -r 'Column\.Row.*center\|Column\.Row.*fullWidth\|center.*Column\.Row\|fullWidth.*Column\.Row' packages/ --include='*.tsx' --include='*.ts'`

Fix any remaining usages by replacing with `Column.Center`.

- [ ] **Step 2: Search for any direct ColumnStyleProps usage**

Run: `grep -r 'ColumnStyleProps' packages/ --include='*.tsx' --include='*.ts'`

Update any external references to the now-empty type.

- [ ] **Step 3: Full build**

Run: `moon run :build`
Expected: PASS with no TypeScript errors

- [ ] **Step 4: Run tests**

Run: `moon run react-ui:test && moon run react-ui-form:test && moon run react-ui-search:test`
Expected: PASS

- [ ] **Step 5: Run lint**

Run: `moon run :lint -- --fix`
Expected: PASS or only pre-existing warnings

- [ ] **Step 6: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address remaining Column.Row center usages"
```
