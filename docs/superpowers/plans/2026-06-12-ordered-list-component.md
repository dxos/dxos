# OrderedList Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a reusable Radix-style `OrderedList` compound component (draggable, reorderable, single-expandable master-detail) into `@dxos/react-ui-list`, and migrate the two hand-rolled `List`-based implementations (`ViewEditor`'s `FieldList`, `PipelineProperties`) onto it.

**Architecture:** `OrderedList` wraps the deprecated `@dxos/react-ui-list` `List` 1:1 (zero UX risk; becomes the single seam for the future `List`→`Mosaic.Stack` migration). It owns the chrome — drag handle, expand caret, delete button, flex row layout, expanded-panel wrapper — and the single-expand state (controllable). Consumers compose `OrderedList.Root/.Content/.Item/.Row/.DragHandle/.Title/.Action/.DeleteButton/.ExpandCaret/.Expanded` and keep their own model-backed add/delete/move/hide handlers.

**Tech Stack:** React + TypeScript, `@radix-ui/react-context`, `@radix-ui/react-use-controllable-state`, TailwindCSS, `@dxos/react-ui` (`IconButton`, `ThemedClassName`, `useTranslation`), Storybook + Vitest + `@testing-library/react`, moon tasks.

**Reference spec:** `docs/superpowers/specs/2026-06-12-ordered-list-component-design.md`

---

## File Structure

**Create (in `packages/ui/react-ui-list/src/components/OrderedList/`):**
- `OrderedListRoot.tsx` — `OrderedListRoot`, `OrderedListContent`, `OrderedListContext` (+ `useOrderedListContext`).
- `OrderedListItem.tsx` — `OrderedListItem`, `OrderedListRow`, `OrderedListDragHandle`, `OrderedListTitle`, `OrderedListAction`, `OrderedListDeleteButton`, `OrderedListExpandCaret`, `OrderedListExpanded`, `OrderedListItemContext` (+ `useOrderedListItemContext`).
- `OrderedList.tsx` — assembles the `OrderedList` namespace object + re-exports prop types.
- `index.ts` — `export * from './OrderedList';`.
- `OrderedList.stories.tsx` — standalone story used by tests + storybook.
- `OrderedList.test.tsx` — behavior tests (composeStories).

**Modify:**
- `packages/ui/react-ui-list/src/components/index.ts` — add `export * from './OrderedList';`.
- `packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.tsx` — migrate `FieldList`.
- `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx` — migrate columns list.

**Notes on conventions (from CLAUDE.md):**
- Single quotes, arrow functions, no default exports, `#private`/`_` is fine for internal, barrel imports.
- React named imports (`useCallback`, `type ReactNode`), not `React.useCallback`.
- No casts to silence the checker. `as const` is fine.
- Leave NO compatibility re-exports; update all call sites in the same change.

---

## Task 1: Create `OrderedListRoot` + `OrderedListContent` + context

**Files:**
- Create: `packages/ui/react-ui-list/src/components/OrderedList/OrderedListRoot.tsx`

- [ ] **Step 1: Write `OrderedListRoot.tsx`**

```tsx
//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type PropsWithChildren, type ReactNode } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { List, type ListItemRecord } from '../List';

const ORDERED_LIST_NAME = 'OrderedList';

type OrderedListContextValue = {
  expandedId?: string;
  setExpanded: (id: string | undefined) => void;
  readonly?: boolean;
};

const [OrderedListProvider, useOrderedListContext] = createContext<OrderedListContextValue>(ORDERED_LIST_NAME);

export { useOrderedListContext };

export type OrderedListRootProps<T extends ListItemRecord> = ThemedClassName<{
  items: readonly T[];
  /** DnD type guard forwarded to the underlying `List.Root`. */
  isItem: (item: any) => boolean;
  /**
   * Stable id accessor. Optional: falls back to `List`'s reference equality.
   * Synthetic-id reconciliation for plain-value arrays lands with the ordered ArrayField.
   */
  getId?: (item: T) => string;
  onMove?: (fromIndex: number, toIndex: number) => void;
  readonly?: boolean;
  /** Controlled expanded item id (single-expand). */
  expandedId?: string;
  defaultExpandedId?: string;
  onExpandedChange?: (id: string | undefined) => void;
  children: (props: { items: readonly T[] }) => ReactNode;
}>;

/**
 * Reorderable, single-expandable master-detail list. Wraps the deprecated `List`
 * primitive and owns the drag-handle / delete / expand-caret chrome plus expand state.
 */
export const OrderedListRoot = <T extends ListItemRecord>({
  items,
  isItem,
  getId,
  onMove,
  readonly,
  expandedId: expandedIdProp,
  defaultExpandedId,
  onExpandedChange,
  children,
}: OrderedListRootProps<T>) => {
  const [expandedId, setExpanded] = useControllableState<string | undefined>({
    prop: expandedIdProp,
    defaultProp: defaultExpandedId,
    onChange: onExpandedChange,
  });

  return (
    <OrderedListProvider expandedId={expandedId} setExpanded={setExpanded} readonly={readonly}>
      <List.Root<T> items={items} isItem={isItem} getId={getId} onMove={onMove} readonly={readonly}>
        {({ items: resolved }) => children({ items: resolved })}
      </List.Root>
    </OrderedListProvider>
  );
};

/** `role='list'` flex-column layout container. */
export const OrderedListContent = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => (
  <div role='list' className={mx('flex flex-col', classNames)}>
    {children}
  </div>
);
```

- [ ] **Step 2: Verify imports resolve**

Run: `cd packages/ui/react-ui-list && node -e "0"` (no-op; real check is the build in Task 4).
Confirm by inspection that `List` and `ListItemRecord` are exported from `../List` (they are — see `src/components/List/List.tsx`), and `useControllableState` is already a dependency (used in `RowList.tsx`, `Combobox.tsx`).

- [ ] **Step 3: Commit**

```bash
git add packages/ui/react-ui-list/src/components/OrderedList/OrderedListRoot.tsx
git commit -m "feat(react-ui-list): add OrderedList Root + Content"
```

---

## Task 2: Create `OrderedListItem` + sub-components + item context

**Files:**
- Create: `packages/ui/react-ui-list/src/components/OrderedList/OrderedListItem.tsx`

- [ ] **Step 1: Write `OrderedListItem.tsx`**

```tsx
//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type ComponentProps, type PropsWithChildren, useCallback } from 'react';

import { type IconButtonProps, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx, osTranslations } from '@dxos/ui-theme';

import { List, type ListItemRecord } from '../List';
import { useOrderedListContext } from './OrderedListRoot';

const ORDERED_LIST_ITEM_NAME = 'OrderedListItem';

type OrderedListItemContextValue = {
  id: string;
  expanded: boolean;
  toggle: () => void;
  canDrag: boolean;
};

const [OrderedListItemProvider, useOrderedListItemContext] =
  createContext<OrderedListItemContextValue>(ORDERED_LIST_ITEM_NAME);

export type OrderedListItemProps<T extends ListItemRecord> = ThemedClassName<
  PropsWithChildren<{
    id: string;
    /** The record handed to the underlying `List.Item` for DnD. */
    item: T;
    /** Defaults to true; false disables the drag handle. */
    canDrag?: boolean;
  }>
>;

/** A single reorderable item. Wraps `List.Item` and provides per-item expand context. */
export const OrderedListItem = <T extends ListItemRecord>({
  id,
  item,
  canDrag = true,
  classNames,
  children,
}: OrderedListItemProps<T>) => {
  const { expandedId, setExpanded } = useOrderedListContext(ORDERED_LIST_ITEM_NAME);
  const expanded = expandedId === id;
  const toggle = useCallback(() => setExpanded(expanded ? undefined : id), [expanded, id, setExpanded]);

  return (
    <OrderedListItemProvider id={id} expanded={expanded} toggle={toggle} canDrag={canDrag}>
      <List.Item<T> item={item} aria-expanded={expanded} classNames={mx('flex flex-col', classNames)}>
        {children}
      </List.Item>
    </OrderedListItemProvider>
  );
};

/** Flex row holding the handle / title / actions / caret. `Expanded` is its sibling. */
export const OrderedListRow = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => (
  <div className={mx('flex items-center gap-1 dx-hover rounded-xs cursor-pointer min-h-10', classNames)}>
    {children}
  </div>
);

/** Drag handle. Disabled when the list is readonly or the item opts out via `canDrag={false}`. */
export const OrderedListDragHandle = () => {
  const { readonly } = useOrderedListContext('OrderedListDragHandle');
  const { canDrag } = useOrderedListItemContext('OrderedListDragHandle');
  return <List.ItemDragHandle disabled={readonly || !canDrag} />;
};

/** Clickable title; clicking toggles the item's expanded state. */
export const OrderedListTitle = ({
  classNames,
  children,
  ...props
}: ThemedClassName<PropsWithChildren<ComponentProps<'div'>>>) => {
  const { toggle } = useOrderedListItemContext('OrderedListTitle');
  return (
    <List.ItemTitle classNames={classNames} onClick={toggle} {...props}>
      {children}
    </List.ItemTitle>
  );
};

/** Generic per-row action icon button (e.g. hide/show eye). */
export const OrderedListAction = ({ autoHide = false, ...props }: IconButtonProps & { autoHide?: boolean }) => (
  <List.ItemIconButton autoHide={autoHide} {...props} />
);

/** Delete icon button. */
export const OrderedListDeleteButton = ({
  autoHide = false,
  ...props
}: Partial<Pick<IconButtonProps, 'icon'>> &
  Omit<IconButtonProps, 'icon' | 'label'> & { autoHide?: boolean; label?: string }) => (
  <List.ItemDeleteButton autoHide={autoHide} {...props} />
);

/** Expand/collapse caret; reflects and toggles the item's expanded state. */
export const OrderedListExpandCaret = (props: Partial<IconButtonProps>) => {
  const { t } = useTranslation(osTranslations);
  const { expanded, toggle } = useOrderedListItemContext('OrderedListExpandCaret');
  return (
    <List.ItemIconButton
      iconOnly
      variant='ghost'
      autoHide={false}
      label={t('toggle-expand.label')}
      icon={expanded ? 'ph--caret-down--regular' : 'ph--caret-right--regular'}
      onClick={toggle}
      {...props}
    />
  );
};

/** Expanded detail panel. Renders inside a bordered wrapper only when the item is expanded. */
export const OrderedListExpanded = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => {
  const { expanded } = useOrderedListItemContext('OrderedListExpanded');
  if (!expanded) {
    return null;
  }
  return <div className={mx('border border-separator rounded-md', classNames)}>{children}</div>;
};
```

- [ ] **Step 2: Sanity-check the `List` sub-component prop shapes**

Confirm by inspection of `src/components/List/ListItem.tsx`:
- `ListItemIconButton` accepts `IconButtonProps & { autoHide?: boolean }`.
- `ListItemDeleteButton` accepts `Partial<Pick<IconButtonProps,'icon'>> & Omit<IconButtonProps,'icon'|'label'> & { autoHide?; label? }`.
- `ListItemDragHandle` accepts `Pick<IconButtonProps,'disabled'>`.
- `ListItemTitle` spreads `ComponentProps<'div'>` (so `onClick` + `data-testid` pass through).
These match the wrappers above. `IconButtonProps` is exported from `@dxos/react-ui`.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/react-ui-list/src/components/OrderedList/OrderedListItem.tsx
git commit -m "feat(react-ui-list): add OrderedList Item + row chrome"
```

---

## Task 3: Assemble namespace + barrel exports

**Files:**
- Create: `packages/ui/react-ui-list/src/components/OrderedList/OrderedList.tsx`
- Create: `packages/ui/react-ui-list/src/components/OrderedList/index.ts`
- Modify: `packages/ui/react-ui-list/src/components/index.ts`

- [ ] **Step 1: Write `OrderedList.tsx`**

```tsx
//
// Copyright 2026 DXOS.org
//

import { OrderedListContent, OrderedListRoot, type OrderedListRootProps } from './OrderedListRoot';
import {
  OrderedListAction,
  OrderedListDeleteButton,
  OrderedListDragHandle,
  OrderedListExpandCaret,
  OrderedListExpanded,
  OrderedListItem,
  type OrderedListItemProps,
  OrderedListRow,
  OrderedListTitle,
} from './OrderedListItem';

/**
 * Reorderable, single-expandable master-detail list.
 *
 * @example
 *   <OrderedList.Root items={…} isItem={…} getId={…} onMove={…} expandedId={…} onExpandedChange={…}>
 *     {({ items }) => (
 *       <OrderedList.Content>
 *         {items.map((item) => (
 *           <OrderedList.Item key={item.id} id={item.id} item={item}>
 *             <OrderedList.Row>
 *               <OrderedList.DragHandle />
 *               <OrderedList.Title>{item.label}</OrderedList.Title>
 *               <OrderedList.DeleteButton onClick={…} />
 *               <OrderedList.ExpandCaret />
 *             </OrderedList.Row>
 *             <OrderedList.Expanded>…</OrderedList.Expanded>
 *           </OrderedList.Item>
 *         ))}
 *       </OrderedList.Content>
 *     )}
 *   </OrderedList.Root>
 */
export const OrderedList = {
  Root: OrderedListRoot,
  Content: OrderedListContent,
  Item: OrderedListItem,
  Row: OrderedListRow,
  DragHandle: OrderedListDragHandle,
  Title: OrderedListTitle,
  Action: OrderedListAction,
  DeleteButton: OrderedListDeleteButton,
  ExpandCaret: OrderedListExpandCaret,
  Expanded: OrderedListExpanded,
};

export type { OrderedListRootProps, OrderedListItemProps };
```

- [ ] **Step 2: Write `index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

export * from './OrderedList';
```

- [ ] **Step 3: Add the barrel export to `components/index.ts`**

In `packages/ui/react-ui-list/src/components/index.ts`, add the line (keep alphabetical-ish ordering with the others — insert after `List`):

```ts
export * from './OrderedList';
```

Resulting file:

```ts
//
// Copyright 2024 DXOS.org
//

export * from './Accordion';
export * from './Combobox';
export * from './List';
export * from './Listbox';
export * from './OrderedList';
export * from './Picker';
export * from './RowList';
export * from './Tree';
```

- [ ] **Step 4: Commit**

```bash
git add packages/ui/react-ui-list/src/components/OrderedList/OrderedList.tsx \
        packages/ui/react-ui-list/src/components/OrderedList/index.ts \
        packages/ui/react-ui-list/src/components/index.ts
git commit -m "feat(react-ui-list): export OrderedList namespace"
```

---

## Task 4: Story + build the package

**Files:**
- Create: `packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx`

- [ ] **Step 1: Write the story**

```tsx
//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';

import { withTheme } from '@dxos/react-ui/testing';
import { arrayMove } from '@dxos/util';

import { OrderedList } from './OrderedList';

type Item = { id: string; label: string };

const initialItems: Item[] = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Bravo' },
  { id: 'c', label: 'Charlie' },
];

const isItem = (value: any): value is Item =>
  !!value && typeof value === 'object' && typeof value.id === 'string';

const DefaultStory = () => {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [expandedId, setExpandedId] = useState<string>();

  const handleMove = useCallback((fromIndex: number, toIndex: number) => {
    setItems((prev) => {
      const next = [...prev];
      arrayMove(next, fromIndex, toIndex);
      return next;
    });
  }, []);

  const handleDelete = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setExpandedId((current) => (current === id ? undefined : current));
  }, []);

  return (
    <OrderedList.Root<Item>
      items={items}
      isItem={isItem}
      getId={(item) => item.id}
      onMove={handleMove}
      expandedId={expandedId}
      onExpandedChange={setExpandedId}
    >
      {({ items: resolved }) => (
        <OrderedList.Content>
          {resolved.map((item) => (
            <OrderedList.Item<Item> key={item.id} id={item.id} item={item}>
              <OrderedList.Row>
                <OrderedList.DragHandle />
                <OrderedList.Title>{item.label}</OrderedList.Title>
                <OrderedList.DeleteButton
                  label='Delete'
                  onClick={() => handleDelete(item.id)}
                  data-testid={`delete-${item.id}`}
                />
                <OrderedList.ExpandCaret data-testid={`caret-${item.id}`} />
              </OrderedList.Row>
              <OrderedList.Expanded>
                <div data-testid={`panel-${item.id}`} className='p-2'>
                  Details for {item.label}
                </div>
              </OrderedList.Expanded>
            </OrderedList.Item>
          ))}
        </OrderedList.Content>
      )}
    </OrderedList.Root>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-list/OrderedList',
  render: () => <DefaultStory />,
  decorators: [withTheme],
};

export default meta;

export const Default: StoryObj<typeof meta> = {};
```

- [ ] **Step 2: Build the package**

Run: `moon run react-ui-list:build`
Expected: PASS (ignore the `Auth token DEPOT_TOKEN does not exist` warning). If TypeScript errors appear, fix them at the source (no casts) before continuing.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx
git commit -m "feat(react-ui-list): add OrderedList story"
```

---

## Task 5: Behavior tests

**Files:**
- Create: `packages/ui/react-ui-list/src/components/OrderedList/OrderedList.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
//
// Copyright 2026 DXOS.org
//

import { composeStories } from '@storybook/react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import * as stories from './OrderedList.stories';

const { Default } = composeStories(stories);

describe('OrderedList', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders all items', () => {
    render(<Default />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  test('clicking a title expands and collapses it', () => {
    render(<Default />);
    expect(screen.queryByTestId('panel-a')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Alpha'));
    expect(screen.getByTestId('panel-a')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Alpha'));
    expect(screen.queryByTestId('panel-a')).not.toBeInTheDocument();
  });

  test('expanding one collapses the previously expanded (single-expand)', () => {
    render(<Default />);
    fireEvent.click(screen.getByText('Alpha'));
    expect(screen.getByTestId('panel-a')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Bravo'));
    expect(screen.queryByTestId('panel-a')).not.toBeInTheDocument();
    expect(screen.getByTestId('panel-b')).toBeInTheDocument();
  });

  test('caret toggles expansion', () => {
    render(<Default />);
    fireEvent.click(screen.getByTestId('caret-c'));
    expect(screen.getByTestId('panel-c')).toBeInTheDocument();
  });

  test('delete removes the item', () => {
    render(<Default />);
    fireEvent.click(screen.getByTestId('delete-b'));
    expect(screen.queryByText('Bravo')).not.toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test**

Run: `moon run react-ui-list:test -- src/components/OrderedList/OrderedList.test.tsx`
Expected: PASS (all 5). The component already exists from Tasks 1–4, so this confirms behavior rather than driving it. If any fail, fix the component (not the test) — e.g. if `panel-a` never appears, check that `OrderedListExpanded` reads the item context and that `Title`'s `onClick` calls `toggle`.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/react-ui-list/src/components/OrderedList/OrderedList.test.tsx
git commit -m "test(react-ui-list): OrderedList expand/delete behavior"
```

---

## Task 6: Migrate `ViewEditor`'s `FieldList`

**Files:**
- Modify: `packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.tsx`

This file has existing regression tests (`ViewEditor.test.tsx`) that exercise the field list (expand a field, edit name, etc.) — they are the guard for this migration.

- [ ] **Step 1: Swap the import**

In `ViewEditor.tsx`, replace:
```tsx
import { List } from '@dxos/react-ui-list';
```
with:
```tsx
import { OrderedList } from '@dxos/react-ui-list';
```

- [ ] **Step 2: Replace the `FieldList` return body**

Replace the entire `return (...)` JSX in the `FieldList` component (currently the `<List.Root<View.FieldType>> … </List.Root>` block) with:

```tsx
return (
  <OrderedList.Root<View.FieldType>
    items={viewSnapshot.projection.fields as View.FieldType[]}
    isItem={Schema.is(View.FieldSchema)}
    getId={(field) => field.id}
    onMove={readonly ? undefined : handleMove}
    readonly={readonly}
    expandedId={expandedField}
    onExpandedChange={setExpandedField}
  >
    {({ items: fields }) => (
      <>
        {showHeading && <h3 className='text-sm'>{t('field-path.label')}</h3>}
        <OrderedList.Content>
          {fields.map((field) => {
            const hidden = field.visible === false;
            return (
              <OrderedList.Item<View.FieldType>
                key={field.id}
                id={field.id}
                item={field}
                canDrag={!readonly && !schemaReadonly}
              >
                <OrderedList.Row>
                  <OrderedList.DragHandle />
                  <OrderedList.Title
                    classNames={hidden ? 'text-subdued' : undefined}
                  >
                    {field.path}
                  </OrderedList.Title>
                  <OrderedList.Action
                    label={t(hidden ? 'show-field.label' : 'hide-field.label')}
                    data-testid={hidden ? 'show-field-button' : 'hide-field-button'}
                    icon={hidden ? 'ph--eye-closed--regular' : 'ph--eye--regular'}
                    disabled={readonly || (!hidden && projectionModel.getFields().length <= 1)}
                    onClick={() => (hidden ? handleShow(field.path) : handleHide(field.id))}
                  />
                  {!readonly && (
                    <>
                      <OrderedList.DeleteButton
                        label={t('delete-field.label')}
                        disabled={schemaReadonly || viewSnapshot.projection.fields.length <= 1}
                        onClick={() => handleDelete(field.id)}
                        data-testid='field.delete'
                      />
                      <OrderedList.ExpandCaret data-testid='field.toggle' />
                    </>
                  )}
                </OrderedList.Row>
                {!readonly && (
                  <OrderedList.Expanded classNames='mt-1 mb-1'>
                    <FieldEditor
                      readonly={readonly || schemaReadonly}
                      registry={registry}
                      projection={projectionModel}
                      field={field}
                      onSave={handleClose}
                    />
                  </OrderedList.Expanded>
                )}
              </OrderedList.Item>
            );
          })}
        </OrderedList.Content>
        {!readonly && !expandedField && (
          <div className='my-form-padding'>
            <IconButton
              icon='ph--plus--regular'
              label={t('add-property-button.label')}
              onClick={handleAdd}
              disabled={viewSnapshot.projection.fields.length >= VIEW_FIELD_LIMIT}
              classNames='w-full'
            />
          </div>
        )}
      </>
    )}
  </OrderedList.Root>
);
```

Leave all the `FieldList` hooks/handlers above the return untouched (`handleMove`, `handleDelete`, `handleHide`, `handleShow`, `handleClose`, `handleAdd`, `expandedField`/`setExpandedField`, `projectionModel`, `viewSnapshot`, `schemaReadonly`).

- [ ] **Step 3: Remove now-unused imports**

`osTranslations` (line ~39) was only used for the caret's `toggle-expand.label` — `OrderedList.ExpandCaret` now owns that. Remove `osTranslations` from the `@dxos/ui-theme` import. Keep `mx`:
```tsx
import { mx } from '@dxos/ui-theme';
```
(If a later lint run flags any other now-unused symbol, remove it too.)

- [ ] **Step 4: Build + test**

Run: `moon run react-ui-form:build`
Expected: PASS.

Run: `moon run react-ui-form:test`
Expected: PASS — including `ViewEditor.test.tsx` (renders, expand field, change property name, delete). If `field.toggle`/`field.delete`/`show-field-button` test ids are asserted anywhere and now missing, re-check they were carried over (they are, above).

- [ ] **Step 5: Commit**

```bash
git add packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.tsx
git commit -m "refactor(react-ui-form): migrate FieldList to OrderedList"
```

---

## Task 7: Migrate `PipelineProperties`

**Files:**
- Modify: `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx`

- [ ] **Step 1: Swap the import**

Replace:
```tsx
import { List } from '@dxos/react-ui-list';
```
with:
```tsx
import { OrderedList } from '@dxos/react-ui-list';
```

- [ ] **Step 2: Remove the now-unused grid constants**

Delete these two lines (the flex layout lives inside `OrderedList` now):
```tsx
const listGrid = 'grid grid-cols-[min-content_1fr_min-content_min-content_min-content]';
const listItemGrid = 'grid grid-cols-subgrid col-span-5';
```

- [ ] **Step 3: Replace the `List.Root` block in the return**

Replace the `<List.Root<Pipeline.Column>> … </List.Root>` block with:

```tsx
<OrderedList.Root<Pipeline.Column>
  items={columns}
  isItem={Schema.is(Pipeline.Column)}
  getId={(column) => column.view.uri}
  onMove={handleMove}
  expandedId={expandedId}
  onExpandedChange={setExpandedId}
>
  {({ items }) => (
    <OrderedList.Content>
      {items.map((column) => (
        <OrderedList.Item<Pipeline.Column> key={column.view.uri} id={column.view.uri} item={column}>
          <OrderedList.Row>
            <OrderedList.DragHandle />
            <OrderedList.Title>{column.name || t('untitled-view.title')}</OrderedList.Title>
            <OrderedList.DeleteButton
              label={t('delete-view.label')}
              onClick={() => handleDelete(column)}
              data-testid='view.delete'
            />
            <OrderedList.ExpandCaret />
          </OrderedList.Row>
          {column.view.target && (
            <OrderedList.Expanded classNames='my-2'>
              <Form.Root
                schema={ColumnFormSchema}
                values={column}
                onValuesChanged={handleColumnValuesChanged(column)}
              >
                <Form.Content>
                  <Form.FieldSet />
                </Form.Content>
              </Form.Root>
              <ViewEditor
                ref={projectionRef}
                mode='tag'
                readonly
                type={type}
                view={column.view.target}
                registry={db?.graph.registry}
                db={db}
                tags={tags}
                types={types}
                onQueryChanged={handleQueryChanged}
              />
            </OrderedList.Expanded>
          )}
        </OrderedList.Item>
      ))}
    </OrderedList.Content>
  )}
</OrderedList.Root>
```

The add button stays as the existing sibling `<div className='my-form-padding'>…</div>` after `OrderedList.Root` (unchanged — it is always visible here).

- [ ] **Step 4: Remove now-unused imports**

`osTranslations` was only used for `t('toggle-expand.label', { ns: osTranslations })`, now owned by `OrderedList.ExpandCaret`. From the `@dxos/ui-theme` import, drop `osTranslations`, keep `mx`:
```tsx
import { mx } from '@dxos/ui-theme';
```

- [ ] **Step 5: Build**

Run: `moon run plugin-pipeline:build`
Expected: PASS. If a type error appears on `items.map((column) => …)`, confirm `OrderedList.Root<Pipeline.Column>` is parameterized (it is, above) so `column` is `Pipeline.Column`.

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx
git commit -m "refactor(plugin-pipeline): migrate columns list to OrderedList"
```

---

## Task 8: Lint, cast audit, and full verification

- [ ] **Step 1: Lint the touched packages**

Run: `moon run react-ui-list:lint -- --fix && moon run react-ui-form:lint -- --fix && moon run plugin-pipeline:lint -- --fix`
Expected: PASS (warnings about `DEPOT_TOKEN` ignored). Fix any import-order or unused-import findings.

- [ ] **Step 2: Cast audit (CLAUDE.md requirement)**

Run: `git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'`
Expected: the only `as` match is the pre-existing `viewSnapshot.projection.fields as View.FieldType[]` carried over verbatim from the original `FieldList` (it casts an ECHO snapshot array to the field type — a genuine ECHO-proxy boundary, present before this change). Confirm no NEW casts were introduced. If any new cast appears, fix it at the type source.

- [ ] **Step 3: Run all three test/build targets together**

Run: `moon run react-ui-list:build react-ui-list:test react-ui-form:build react-ui-form:test plugin-pipeline:build`
Expected: all PASS.

- [ ] **Step 4: Storybook verification (manual, low-cost)**

The user runs a storybook server on :9009 — reuse it (do not kill it; `curl -s localhost:9009 >/dev/null && echo up`). If not running, start one on a different port: `moon run storybook-react:serve -- --port 9010`.
Verify these stories render and behave with no regression:
- `ui/react-ui-list/OrderedList` — Default: drag-reorder, expand/collapse, single-expand, delete.
- `ViewEditor` (in `ui/react-ui-form`) — drag-reorder fields, expand→`FieldEditor`, add/delete, hide/show eye toggle.
- `plugins/plugin-pipeline` PipelineComponent / PipelineArticle stories (which render `PipelineProperties`) — drag-reorder columns, expand→name `Form` + `ViewEditor`, add/delete.

Note: the originally-listed `ArrayField` "Ordered variant" story does not exist and is out of scope (see spec "Scope correction").

- [ ] **Step 5: Final status check**

Run: `git status`
Expected: clean working tree (all changes committed). If the user has edited any worktree files, include them per CLAUDE.md before declaring done.

---

## Self-Review notes (author)

- **Spec coverage:** Component (Tasks 1–3), story (4), tests (5), FieldList migration (6), PipelineProperties migration (7), build/test/lint/cast/storybook acceptance (8). Decisions D1 (wrap List), D2 (react-ui-list placement), D3 (Radix namespace), D4 (flex) all realized in Tasks 1–2. Non-goals (FormOrderedAnnotation, synthetic-id impl, ArrayField branch, Mosaic) explicitly excluded.
- **Type consistency:** `OrderedListRootProps`/`OrderedListItemProps` names match across Tasks 1–3 and the namespace. `useOrderedListContext`/`useOrderedListItemContext` defined in Tasks 1/2 and consumed in Task 2. `getId` optional everywhere. `canDrag` default `true` consistent.
- **Carried-over cast:** `fields as View.FieldType[]` is pre-existing (original `FieldList` line 346), not new — flagged in Task 8 Step 2.
```

