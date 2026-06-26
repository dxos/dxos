# EditList — reusable inline-edit list (react-ui-form)

Date: 2026-06-25

## Goal

Replace the flat `MasterDetail` in `RoutineCompanion` with an inline-expandable list like
`FieldList` (in `ViewEditor.tsx`). Extract the shared shell into a reusable `react-ui-form`
component used by **both** `FieldList` and `RoutineCompanion`.

## What the two call sites share

Both are: a labelled list with an add affordance, where each row is collapsed to a **summary**
and expands inline to an **editor form**, with a trailing delete and optional drag-reorder. Both
expanded editors are already `Form.Root` instances:

- `FieldEditor` → `<Form.Root schema={fieldSchema} fieldMap values onSave …>` (schema derived
  per-field from its format).
- `RoutineForm` → `<Form.Root schema={GeneralForm} …>` with composite `Section` children
  (Actions, Triggers) inside `Form.Content`.

So the open view is **always a `Form`** (decision: "Schema only"). The shell owns the list +
expansion + reorder + header + delete; the consumer configures the per-item `Form`.

## Component: `EditList`

Location: `packages/ui/react-ui-form/src/components/EditList/` (exported from the package barrel).

```ts
export type EditListFormConfig = {
  schema: Schema.Schema.AnyNoContext;
  values?: any;
  fieldMap?: FormFieldMap;
  filter?: FormRootProps<any>['filter'];
  sort?: FormRootProps<any>['sort'];
  autoFocus?: boolean;
  readonly?: boolean;
  onValuesChanged?: (values: any) => void;
  onValidate?: FormRootProps<any>['onValidate'];
  onSave?: (values: any) => void;
  onCancel?: () => void;
  /** Form body; defaults to `<Form.Content><Form.FieldSet/><Form.Actions/></Form.Content>`. */
  children?: ReactNode;
};

export type EditListProps<T> = ThemedClassName<{
  items: readonly T[];
  getId?: (item: T) => string;                       // default: (item as { id: string }).id
  /** Closed-row content. `actions` sit outside the clickable title; the expand caret is appended after. */
  renderSummary: (item: T) => { title: ReactNode; actions?: ReactNode };
  /** Open-view Form configuration for an item. */
  getForm: (item: T) => EditListFormConfig;
  // Header (optional).
  label?: string;
  add?: { label: string; disabled?: boolean; onClick: () => void };
  emptyLabel?: string;
  // Row affordances.
  onDelete?: (item: T) => void;
  canDelete?: (item: T) => boolean;
  // Ordering: presence of `onMove` enables drag handles (ordered variant).
  onMove?: (fromIndex: number, toIndex: number) => void;
  readonly?: boolean;
  // Controlled expansion (optional; defaults to internal state).
  expandedId?: string;
  onExpandedChange?: (id?: string) => void;
}>;
```

### Behaviour

- Renders `FormFieldHeader` (label + add) when `label`/`add` provided; `emptyLabel` shown when empty.
- Renders `OrderedList.Root` over `items`. `canDrag` / `onMove` are wired **only when `onMove` is
  supplied** — this is the ordered-vs-unordered switch (no separate component, no `ordered` flag).
- Each row is an `OrderedList.DetailItem`:
  - `title` = `renderSummary(item).title` (the clickable disclosure trigger),
  - `actions` = `renderSummary(item).actions` (inline controls, kept out of the trigger so e.g. a
    toggle button doesn't also toggle expansion — matches today's FieldList),
  - expand caret appended automatically by `DetailItem`,
  - `trailing` = delete button when `onDelete` set (disabled per `canDelete`),
  - children = `<Form.Root {...getForm(item)}>{config.children ?? default body}</Form.Root>`.
- Expansion state defaults to internal `useState`; overridable via `expandedId`/`onExpandedChange`.

## Refactor: `FieldList` (ViewEditor.tsx)

`FieldList` becomes a thin wrapper over `EditList`:
- `items` = `viewSnapshot.projection.fields`; `getId` = `field.id`.
- `onMove` = existing `handleMove` (keeps it ordered).
- `renderSummary(field)` = `{ title: field.path (subdued when hidden), actions: <eye ToggleIconButton> }`.
- `getForm(field)` = the config currently inside `FieldEditor` (schema/fieldMap/values/handlers).
  `FieldEditor` is refactored to expose that config, or its JSX body becomes `getForm`'s output.
- `onDelete`/`canDelete` = existing delete + `fields.length <= 1` / `schemaReadonly` guards.
- Header add = existing `handleAdd` + `VIEW_FIELD_LIMIT` disable.

Net: `FieldList` keeps all current behaviour; the `OrderedList` plumbing moves into `EditList`.

## Refactor: `RoutineCompanion`

Replace `MasterDetail` with `EditList` (unordered — no `onMove`):
- `items` = `automations`; create flow unchanged (draft still appended as a row, expanded on create).
- `renderSummary(routine)` = `{ title: label-or-placeholder, actions: undefined }` (lightning icon
  can live in the title node).
- `getForm(routine)` = `{ schema: GeneralForm, children: <RoutineForm sections…> }`, i.e.
  `RoutineForm` is adapted to render its inner content (general fields + Actions + Triggers) so it
  can sit inside `EditList`'s `Form.Root`. Save/Cancel for the **draft** row render via the form's
  `Form.Actions` / config handlers.
- `onDelete` = existing `handleDelete` (removes relation + routine).
- The old `MasterDetail` component is deleted (no compat shim), per repo policy.

> Open question for review: `RoutineForm` currently owns its own `Form.Root`. To live inside
> `EditList` it must expose just its body. Alternative: `EditList`'s `getForm` returns
> `children` only and we let `RoutineForm` keep owning its `Form.Root` by having `EditList` detect
> a "bring-your-own-form" config. Recommendation: adapt `RoutineForm` to a body component
> (`RoutineFormBody`) so the open view is uniformly one `Form.Root` owned by `EditList`.

## Testing

- Add `EditList.stories.tsx` (ordered + unordered) and a `EditList.test.tsx` covering: expand/
  collapse, add, delete (+ `canDelete` guard), and reorder when `onMove` present.
- Verify `ViewEditor` existing tests still pass (FieldList behaviour unchanged).
- Verify `RoutineCompanion` renders, create/save/cancel/delete still work (storybook + existing tests).

## Out of scope

- No generic non-Form detail escape hatch (open view is always a `Form`).
- No changes to `OrderedList` primitives in `react-ui-list`.
