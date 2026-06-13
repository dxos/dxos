# Reusable `OrderedList` component — design

Date: 2026-06-12
Status: approved (brainstorm)

## Problem

Two components in the repo independently hand-roll the same "draggable, reorderable,
single-expandable master-detail list" by composing `@dxos/react-ui-list`'s deprecated
`List` (`List.Root` / `List.Item` / `List.ItemDragHandle` / `List.ItemTitle` /
`List.ItemIconButton` / `List.ItemDeleteButton`) plus an `onMove` reorder handler and
local single-expand state:

1. `packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.tsx` — the internal
   `FieldList`. Rows = drag handle + clickable `field.path` title + hide/show eye toggle +
   delete + expand caret; expanded panel renders `FieldEditor`. Items are
   `view.projection.fields` (ECHO, stable id `field.id`). Reorder rewrites
   `view.projection.fields` via `Obj.update`.
2. `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx`
   — the columns list. Rows = drag handle + clickable name title + delete + expand caret;
   expanded = a small name `Form` + a `ViewEditor`. Items are `pipeline.columns` (stable id
   `column.view.uri`). Reorder via `arrayMove` inside `updateColumns`.

The two share grid/flex chrome, the drag-handle/delete/expand-caret affordances, the
single-expand state machine, and the expanded-panel border wrapper — duplicated verbatim.

### Scope correction (discovered during brainstorm)

The original task also named a third site — an "ordered branch" of
`packages/ui/react-ui-form/src/components/Form/fields/ArrayField.tsx`, gated by a
`FormOrderedAnnotation`, with a synthetic-id (`DND_ID`/`idsRef`/`nextId`) reconciliation map.
That code did not exist on `main` when this branch started — it lived on the
`affectionate-curie` branch (the `react-ui-form` refactor that moved `ArrayField` to
`Form/FormField/fields/ArrayField/` and added `FormOrderedAnnotation`).

Decision (updated): the first phase built `OrderedList` and migrated the two `List`
consumers present on `main` (`FieldList`, `PipelineProperties`), designing the API to accept
a future ordered `ArrayField`. Once `affectionate-curie` was merged into this branch, the
ordered `ArrayField` became the genuine **third consumer** and was migrated too — it composes
`OrderedList.Root/.Content/.Item/.DragHandle/.DeleteButton` with its own grid row (not
`.Row`, which is master-detail chrome) and passes its synthetic `getOrderedId` straight to
`getId`. The redundant `aria-expanded` on `OrderedList.Item` was dropped at that point so the
row container stays neutral for non-expandable lists (disclosure state is carried by the
expand caret button).

## Decisions

### D1 — Build on the deprecated `List` (not `Mosaic.Stack`)

`react-ui-list`'s `List` is `@deprecated`. Its documented successors are `RowList`
(no drag-and-drop — explicitly out of scope per its docstring) and `Mosaic.Stack` /
`Mosaic.VirtualStack` for reorderable stacks (AUDIT.md §6).

We **wrap `List`** rather than rebuild on `Mosaic.Stack`:

- 1:1 with current behavior → zero UX-regression risk (an acceptance requirement).
- The migration off `List` (AUDIT Phase 6) is per-call-site. Consolidating the two
  consumers into one `OrderedList` wrapper turns two future migration targets into **one
  seam** — when `List` → `Mosaic.Stack` finally happens, only `OrderedList` changes.
- Net effect on debt is negative (fewer direct `List` consumers), even though `OrderedList`
  inherits the `@deprecated` lineage internally.

### D2 — Placement: `@dxos/react-ui-list`

`react-ui-list` has no upward deps (AUDIT.md). Both consumers can reach it:
`react-ui-form` → `react-ui-list`; `plugin-pipeline` → `react-ui-list`. Building on
`Mosaic.Stack` would force the component into `react-ui-mosaic` and add a new
`react-ui-mosaic` dependency to `react-ui-form` — avoided by D1+D2.

### D3 — API shape: Radix-style compound namespace

`OrderedList.Root` / `.Content` / `.Item` / `.Row` / `.DragHandle` / `.Title` / `.Action` /
`.DeleteButton` / `.ExpandCaret` / `.Expanded`.

`Row` is the flex row wrapper around a single item's chrome (handle/title/actions/caret);
`Expanded` is its sibling below. There is intentionally no `Footer` component — a list
package shouldn't own form-padding semantics, so consumers render their add affordance as a
plain sibling inside the render-prop child (exactly as today).

Rationale over a single render-prop component:

- It is the house pattern in this exact package (`RowList`, `Listbox`, `Combobox`, `Picker`
  are all compound), with a dedicated `composite-components` skill.
- Migration is close to a rename: today's `List.Item` + `List.ItemDragHandle` +
  `List.ItemTitle` + `List.ItemIconButton` + `List.ItemDeleteButton` map 1:1.
- Consumers keep free ordering/omission of row children (Pipeline has no eye toggle;
  FieldList does) without a per-instance `actionCount`/slot-array prop.

### D4 — Internal layout: flexbox (not grid `subgrid`)

Today both sites use `grid grid-cols-[min-content_1fr_min-content_…]` + `grid-cols-subgrid
col-span-N`. The column count is coupled to the number of trailing buttons (FieldList 5,
Pipeline 4). Switching the internal layout to flex (`Content` = `flex flex-col`; each row =
`flex items-center` with fixed-width icon buttons + `flex-1` title) gives identical
cross-row visual alignment, lets the expanded panel be a natural full-width block below the
row, and removes the column-count coupling entirely.

## API

```ts
// OrderedList.Root
type OrderedListRootProps<T> = ThemedClassName<{
  items: readonly T[];
  isItem: (item: unknown) => boolean; // forwarded to List.Root (DnD type guard)
  getId?: (item: T) => string; // optional; falls back to List's ref-equality.
  //   Synthetic-id reconciliation for plain-value
  //   arrays lands with the ordered ArrayField.
  onMove?: (from: number, to: number) => void;
  readonly?: boolean;

  // Single-expand, controllable (Radix useControllableState).
  expandedId?: string;
  defaultExpandedId?: string;
  onExpandedChange?: (id: string | undefined) => void;

  // Render-function child, mirroring today's `List.Root` ergonomics (keeps `items`
  // reactivity flowing). Returns <OrderedList.Content> + optional <OrderedList.Footer>.
  children: (props: { items: readonly T[] }) => ReactNode;
}>;

// OrderedList.Content — role='list' flex-col layout container.
type OrderedListContentProps = ThemedClassName<PropsWithChildren>;

// OrderedList.Item — wraps List.Item; provides per-item context (id, expanded, toggle, canDrag).
type OrderedListItemProps = ThemedClassName<
  PropsWithChildren<{
    id: string;
    item: unknown; // the record passed to List.Item for DnD
    canDrag?: boolean; // default true; false → drag handle disabled
  }>
>;

// OrderedList.Row — flex row wrapper (handle·title·actions·caret). Expanded is its sibling.
// OrderedList.DragHandle — thin wrapper over List.ItemDragHandle (reads canDrag + readonly).
// OrderedList.Title       — List.ItemTitle + onClick → toggle expand. classNames passthrough.
// OrderedList.Action      — generic List.ItemIconButton (autoHide=false default). Full IconButtonProps.
// OrderedList.DeleteButton — List.ItemDeleteButton (autoHide=false default).
// OrderedList.ExpandCaret — List.ItemIconButton, caret up/down from item context, onClick → toggle.
//                           label defaults to osTranslations 'toggle-expand.label'.
// OrderedList.Expanded    — renders children in `border border-separator rounded-md` wrapper
//                           ONLY when the item is expanded. classNames passthrough for margins.
```

### Contexts

- `OrderedListContext` (from Root): `{ expandedId, setExpanded, readonly }`.
- `OrderedListItemContext` (from Item): `{ id, expanded, toggle }`. `Title`, `ExpandCaret`,
  `Expanded` consume this. `DragHandle` reads `List`'s existing `ListItemContext` for the
  handle ref, so it stays a thin wrapper.

Both use `@radix-ui/react-context` `createContext`, matching `ListRoot`/`RowList`.

## Usage (FieldList, post-migration)

```tsx
<OrderedList.Root
  items={viewSnapshot.projection.fields}
  isItem={Schema.is(View.FieldSchema)}
  getId={(field) => field.id}
  onMove={readonly ? undefined : handleMove}
  readonly={readonly}
  expandedId={expandedField}
  onExpandedChange={setExpandedField}
>
  {({ items }) => (
    <>
      <OrderedList.Content>
        {items.map((field) => {
          const hidden = field.visible === false;
          return (
            <OrderedList.Item key={field.id} id={field.id} item={field} canDrag={!readonly && !schemaReadonly}>
              <OrderedList.Row>
                <OrderedList.DragHandle />
                <OrderedList.Title classNames={hidden ? 'text-subdued' : undefined}>{field.path}</OrderedList.Title>
                <OrderedList.Action
                  label={t(hidden ? 'show-field.label' : 'hide-field.label')}
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
```

`PipelineProperties` maps identically: no `Action` (no eye toggle), `Expanded classNames='my-2'`
wrapping the name `Form` + `ViewEditor` (still guarded on `column.view.target`), and the add
button kept as an always-visible sibling outside `OrderedList.Root` (as today).

## Files

```
packages/ui/react-ui-list/src/components/OrderedList/
  OrderedList.tsx          # namespace object { Root, Content, Item, Row, DragHandle, Title,
                           #   Action, DeleteButton, ExpandCaret, Expanded } + types
  OrderedListRoot.tsx      # Root + Content + OrderedListContext
  OrderedListItem.tsx      # Item + Row + DragHandle + Title + Action + DeleteButton +
                           #   ExpandCaret + Expanded + OrderedListItemContext
  OrderedList.stories.tsx  # standalone story (plain-value + ECHO-id variants)
  OrderedList.test.tsx     # behavior tests
  index.ts
```

Add `export * from './OrderedList';` to `packages/ui/react-ui-list/src/components/index.ts`.

## Migration

1. Build `OrderedList` + story + tests in `react-ui-list`. Verify `react-ui-list:build`,
   `react-ui-list:test`.
2. Migrate `FieldList` in `ViewEditor.tsx` — replace the `List.*` block; keep all existing
   state/handlers (`handleMove`, `handleDelete`, `handleHide`, `handleShow`, `expandedField`).
   Drop the now-unused `List` import. Verify `react-ui-form:build`, `react-ui-form:test`.
3. Migrate `PipelineProperties.tsx` — replace the `List.*` block; keep `handleMove`,
   `handleDelete`, `handleAdd`, `expandedId`. Drop the `List` import. Verify
   `plugin-pipeline:build`.
4. Per CLAUDE.md: leave no compatibility re-exports/shims; update all call sites in the
   same change.

## Testing & verification

- `OrderedList.test.tsx`: single-expand toggle (expanding one collapses another via
  controlled state), `onMove` invoked with correct `(from,to)` indices, delete button calls
  `onDelete`, `readonly`/`canDrag=false` disables the drag handle, `Expanded` renders only
  when expanded, `getId` fallback path.
- Builds/tests: `moon run react-ui-list:build`, `react-ui-list:test`,
  `moon run react-ui-form:build`, `react-ui-form:test`, `moon run plugin-pipeline:build`.
- Storybook (user runs server on :9009; reuse it): `ViewEditor` story (drag-reorder,
  expand/collapse, add/delete, hide/show), and `PipelineComponent`/`PipelineArticle` stories
  (which render `PipelineProperties`), plus the new `OrderedList` story.
- The `ArrayField` Ordered variant story (`ui/react-ui-form/.../ArrayField` → `Ordered`)
  verifies the third consumer after the `affectionate-curie` merge.

## Non-goals

- `FormOrderedAnnotation` itself (owned by `affectionate-curie`; this branch consumes it).
- Migrating other `List` consumers (AUDIT Phase 6, separate work).
- Replacing `List` with `Mosaic.Stack` (deferred to Phase 6; `OrderedList` is the seam).

```

```
