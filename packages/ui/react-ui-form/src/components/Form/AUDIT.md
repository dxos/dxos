# `react-ui-form` — Form Audit

Scope: `packages/ui/react-ui-form/src/components/Form/**` plus the cross-cutting `src/types.ts`,
`src/hooks/**`, and `src/util/**` that the Form depends on. This is an architectural audit: it
documents the existing mechanism, then proposes simplifications. Recommendations are labelled
**[R-n]** and collected with a suggested order at the end.

> **Status — landed:** **[R-1]** (`FieldContext` aggregate), the core of **[R-2]** (introduced
> `FieldContext`/`RefThreadedProps`; namespace-style rename deferred), **[R-9]** (required-field
> asterisk), **[R-5]** (presentation strategy via `presentationFor`), **[R-8]** (`FieldRow` seam),
> and the bulk of **[R-4]** (SelectField/GeoPointField/MarkdownField now route through one
> `FormFieldWrapper`; RefField/InlineRefField/LabelField centralize on `presentationFor` but keep
> bespoke bodies — see R-4 note). Remaining items below are still open.

## 1. Mechanism & hierarchy

The Form turns an Effect `Schema` into a recursively-generated, themed, validated editor. It has
three concerns that are deliberately kept separate:

1. **State** — `useFormHandler` (values, validation, dirty/touched, save). Pure logic, no JSX.
2. **Context plumbing** — `FormContextProvider` / `useFormContext` carry the handler plus a bag of
   field options down the tree so deeply-nested fields don't prop-drill.
3. **Rendering** — the `Form.*` compound component (`FormControls.tsx`) and the recursive
   `FormFieldSet → FormField → <Field>` descent.

### 1.1 Compound component surface (`Form.tsx` / `FormControls.tsx`)

`Form` is a namespace object of Radix-style parts:

| Part            | File                          | Role                                                                       |
| --------------- | ----------------------------- | -------------------------------------------------------------------------- |
| `Form.Root`     | `FormControls`                | Builds the handler via `useFormHandler`, provides context. Renders no DOM. |
| `Form.Viewport` | `FormControls`                | Owns the gutter `Column` + optional `ScrollArea` (scroll/padding chrome).  |
| `Form.Content`  | `FormControls`                | Centered body `<div role="form">`; installs the key handler.               |
| `Form.Section`  | `FormControls`                | Optional labelled/description grouping block.                              |
| `Form.FieldSet` | `FormControls`→`FormFieldSet` | Schema-driven field generation (the recursion entry point).                |
| `Form.Layout`   | `FormControls`→`FormLayout`   | DSL-driven layout alternative to `FieldSet`.                               |
| `Form.Label`    | `FormField`                   | Re-export of `FormFieldLabel`.                                             |
| `Form.Actions`  | `FormControls`                | Save/Cancel buttons (hidden in `readonly`/`static`).                       |
| `Form.Submit`   | `FormControls`                | Single full-width Save button (legacy; `Form.Actions` supersedes).         |
| `Form.Error`    | `FormControls`                | Form-level error valence.                                                  |

Note `FormControls.tsx` defines the _thin context-reading wrappers_ (`FormFieldSet`, `FormLayout`)
that pull `form.schema` + context options and delegate to the "natural" implementations in
`FormFieldSet/` and `FormLayout/`. So there are **two** `FormFieldSet` symbols and **two**
`FormLayout` symbols (the context wrapper and the natural component). This is a real source of
confusion — see **[R-3]**.

### 1.2 The recursion

The heart of the system is mutual recursion between `FormFieldSet` and `FormField`:

```
FormFieldSet(schema, path)
  └─ for each property → FormField(type, name, path+[name])
       ├─ custom?      fieldMap[jsonPath] | fieldProvider(...)   → custom component
       ├─ array?       ArrayField → (per item) FormField(elementType, path+[i])   ⟲
       ├─ leaf?        getFormField(format,type) → TextField | NumberField | ...
       ├─ select?      SelectField
       ├─ ref?         FormInlineAnnotation ? InlineRefField : RefField
       │                  InlineRefField → FormRoot → FormFieldSet(targetSchema)   ⟲ (new form)
       └─ nested obj?  FormFieldSet(memberSchema, path)                            ⟲
```

Four distinct recursion paths, and they don't share a containment convention:

- **Nested struct**: `FormField` → `FormFieldSet(collapsible)` — bordered, indented, collapse toggle.
- **Array of objects**: `ArrayField` → `FormField(name:null)` per item — no border; per-row grid with
  a delete button; object item recurses as a label-less `FormField` that lands on `FormFieldSet`.
- **Array of scalars/refs**: `ArrayField` → `FormField(layout:'inline')` per item.
- **Inline ref**: spins up a _brand-new_ `FormRoot`/`FormFieldSet` bound to the ref target, with its
  own handler and `onValuesChanged` writing back via `Obj.update`.

This inconsistency is the subject of **[R-6]**.

### 1.3 Field abstraction

Every leaf editor is an `FC<FormFieldRendererProps>` (`FormFieldRenderer`). The contract is split:

- `FormFieldStateProps` — the live wiring: `getStatus`, `getValue`, `onBlur`, `onValueChange`.
- `FormFieldRendererProps` — `FormFieldStateProps` **+** static descriptors: `type`, `format`,
  `readonly`, `label`, `jsonPath`, `placeholder`, `autoFocus`, `layout`, `db`.

`FormField` is the dispatcher: it resolves annotations (title/description/examples), builds
`fieldProps`, then selects a renderer by precedence (custom → array → format/type → select → ref →
nested). Most leaf fields wrap their control in `FormFieldWrapper`, which renders the label row, the
control (via a render-prop), and validation — keyed off `layout: FormPresentation`.

`FormPresentation` (`'full' | 'compact' | 'inline' | 'static'`) is the variant axis but is currently
honoured by ad-hoc `if (layout === …)` checks scattered across `FormFieldWrapper`, `RefField`,
`ArrayField`, `FormFieldSet`, `FormActions`, `FormSubmit`, `LabelField`. See **[R-4]/[R-5]**.

---

## 2. Types: inventory, hierarchy, and organization

### 2.1 Where types live

| Type                                                                           | Location                         | Notes                                  |
| ------------------------------------------------------------------------------ | -------------------------------- | -------------------------------------- |
| `FormFieldStatus`                                                              | `src/types.ts`                   | validation status                      |
| `FormPresentation`                                                             | `src/types.ts`                   | variant enum                           |
| `FormFieldStateProps`                                                          | `src/types.ts`                   | live wiring                            |
| `FormFieldRendererProps`                                                       | `src/types.ts`                   | renderer contract                      |
| `FormFieldRenderer` / `FormFieldMap` / `FormFieldProvider`                     | `src/types.ts`                   | custom-field registration              |
| `CreateOptions`                                                                | `src/types.ts`                   | inline-create affordance               |
| `RefOption` / `RefFieldDataProps`                                              | `src/types.ts`                   | ref data plumbing                      |
| `FormFieldOptions`                                                             | `src/types.ts`                   | form-wide options threaded via context |
| `FormHandlerProps` / `FormHandler` / `FormUpdateMeta`                          | `hooks/useFormHandler.ts`        | state contract                         |
| `FormContextValue`                                                             | `hooks/useFormContext.ts`        | context shape                          |
| `FormFieldProps`                                                               | `FormField/FormField.tsx`        | dispatcher props                       |
| `FormFieldWrapperProps` / `FormFieldLabelProps`                                | `FormField/FormFieldWrapper.tsx` | structural                             |
| `FormFieldSetProps<T>` (natural)                                               | `FormFieldSet/FormFieldSet.tsx`  | recursion entry props                  |
| `FormRootProps`, `FormFieldSetProps` (wrapper), `FormLayoutProps` (wrapper), … | `FormControls.tsx`               | compound part props                    |
| `FormLayoutProps` (natural), `ResolvedLayoutField`                             | `FormLayout/FormLayout.tsx`      | DSL props                              |
| `ArrayFieldProps`, `RefFieldProps`, `FieldHeaderProps`                         | per-field files                  |                                        |

**Observations.**

- The split between `src/types.ts` and in-place types is roughly "shared contracts vs component-local
  props", which is reasonable, but it leaks: `FormFieldProps` (in `FormField.tsx`) is effectively a
  shared contract — it's imported by `ArrayField`, `FormLayout`, `FormFieldSet` and re-composed.
- The **type hierarchy is built by composition-by-`Pick`/`&`**, and the same fields are re-Picked in
  many places. Tracing what a field actually receives means unioning 4–5 fragments:

  ```
  FormFieldProps =
      { type, name, path, autoFocus }
    & FormFieldOptions                                   // db, readonly, layout, projection, fieldMap, fieldProvider, createTypename
    & Pick<RefFieldDataProps, 'getOptions'|'onCreate'|'useType'>
    & CreateOptions                                      // createOptionLabel, createOptionIcon, createInitialValuePath, createFieldMap
  ```

  ```
  FormFieldSetProps<T> =
      { label, sort, collapsible, exclude, layoutName }
    & Pick<FormHandlerProps<T>, 'schema'>
    & Pick<FormFieldProps, 'path'|'autoFocus'>
    & FormFieldOptions
    & CreateOptions
    & Pick<RefFieldDataProps, 'useType'|'getOptions'|'onCreate'>
  ```

  `FormFieldOptions`, `CreateOptions`, and the `RefFieldDataProps` subset appear together in
  `FormFieldProps`, `FormFieldSetProps`, `FormContextValue`, and (partly) `FormLayoutProps`.

### 2.2 [R-1] Introduce a single `FieldContext` aggregate

The trio `FormFieldOptions & CreateOptions & Pick<RefFieldDataProps, 'useType'|'getOptions'|'onCreate'>`
is the _de-facto_ "everything threaded down the recursion" bag. It is reconstructed by hand in four
places. Define it once:

```ts
// types.ts
/** Everything threaded unchanged down the field recursion (form-wide, not per-field). */
export type FieldContext = FormFieldOptions & CreateOptions & RefDataProps;
```

Then `FormFieldProps = FieldDescriptor & FieldContext`, `FormFieldSetProps = FieldSetDescriptor &
FieldContext`, and `FormContextValue = { form; testId? } & FieldContext`. This removes the repeated
`Pick<RefFieldDataProps, …>` fragments and makes "what flows down vs what is per-field" explicit.

Naming: the per-field descriptors (`type`, `name`, `path`, `autoFocus`, plus the resolved `label`,
`placeholder`, `jsonPath`) are conceptually a `FieldDescriptor`; keep them distinct from `FieldContext`.

### 2.3 [R-2] Rename for clarity

- `FormFieldOptions` and `FormFieldSetProps` are easy to confuse and neither name says "threaded
  context". Prefer `FieldContext` (R-1) for the shared bag; keep `FormFieldSetProps` for the actual
  `FieldSet` component props (descriptor + context).
- `FormFieldRendererProps` vs `FormFieldStateProps` vs `FormFieldRenderer` — fine, but consider the
  package-convention namespace style (`Field.RendererProps`, `Field.StateProps`) given the rest of the
  repo is moving to namespace exports. Lower priority.

### 2.4 [R-3] Collapse the duplicate `FieldSet`/`Layout` symbols

`FormControls.tsx` defines `FormFieldSet`/`FormLayout` that only read context and forward to the
"natural" `FormFieldSet`/`FormLayout`. Importing the wrong one (the alias dance `NaturalFormFieldSet`)
is a live hazard. Options:

1. Move the context-reading concern _into_ the natural components (accept an optional `form`/context
   prop; default-read from context) and delete the wrappers, or
2. Rename so the distinction is legible: `FieldSetController` (context reader, the `Form.FieldSet`
   binding) vs `FieldSet` (pure, schema-driven). Today both are `FormFieldSet`.

> **Landed (option 2):** the context-reading wrappers are now `FormFieldSetController` /
> `FormLayoutController` (in `FormControls.tsx`), and `Form.FieldSet` / `Form.Layout` point at them.
> The pure renderers keep their names (`FormFieldSet` / `FormLayout`), so `FormControls` imports them
> without the `NaturalFormFieldSet` component alias. The public `FormLayoutProps` type name is
> unchanged; the controller's field-set props type is `FormFieldSetControllerProps`.

---

## 3. Hooks as properties (`useType`, `useResults`)

`RefFieldDataProps` carries **React hooks as props**: `useType`, `useResults`. They default to
`@dxos/echo-react`'s `useType`/`useQuery` and are overridable so a host can swap the data source. They
are called unconditionally inside `RefField`/`InlineRefField` render bodies.

### Why this is fragile

- **Rules of Hooks.** A hook passed as a prop must never change identity across renders or the host
  violates the rules-of-hooks invariant (conditional/variable hook). Nothing enforces this; it works
  only by the convention that callers pass a stable function.
- **Type noise.** `useType` appears in `RefFieldDataProps`, `FormFieldProps`, `FormFieldSetProps`,
  `FormContextValue`, threaded by hand at every hop — a large fraction of the prop plumbing exists
  solely to relay these two hooks.
- **Testability.** Swapping data sources for stories/tests means supplying hook implementations rather
  than plain data.

### 3.1 [R-7] Prefer one of

1. **Service/context injection** (recommended): provide an ECHO data accessor through a dedicated
   context (or the existing `db`) and let `RefField` call a single internal hook
   (`useRefData(db, typename)`) that resolves via that service. Hosts override the _service_, not the
   _hook_. Removes `useType`/`useResults` from every prop type.
2. **Async callbacks** (the `// TODO(burdon): Replace hooks with callbacks?` already in `types.ts`):
   `resolveType(db, uri): Promise<…>` / `queryResults(db, typename): Observable<…>`. Loses the
   ergonomics of reactive `useQuery`, so (1) is preferred unless reactivity can be preserved.

Either way the goal is: **field plumbing carries data/config, not hooks.**

---

## 4. Structural elements (`FormField`, `FormFieldWrapper`, `FormFieldLabel`, `FieldHeader`)

### 4.1 Current shape

- `FormFieldWrapper` renders `<div class="contents"><Input.Root>{label}{control|static}{error}</Input.Root></div>`,
  branching on `layout` (no label when `inline`, plain `<p>` when `static`, full error block when
  `full`). Leaf fields (`TextField`, `NumberField`, `BooleanField`, `DateField`, `GeoPointField`,
  `TextAreaField`, `MarkdownField`) pass a render-prop child.
- **But `RefField`, `InlineRefField`, `SelectField`, and `LabelField` bypass `FormFieldWrapper`** and
  re-implement the same `Input.Root` + `FormFieldLabel` + error scaffold inline. So the
  "label/control/error" structure is duplicated in ≥4 places, each subtly different (e.g. `RefField`
  uses `{layout === 'full' && <Input.DescriptionAndValidation>}`, `FormFieldWrapper` uses
  `{layout === 'full' && error && …}`).
- `FormFieldLabel` is a 3-column grid (`label | error-icon | button`) and is reused by `FieldHeader`
  and `FormFieldSet`'s collapse header.
- `FieldHeader` (array/list header) and the `FormFieldSet` collapse header are _almost_ the same widget
  (label + trailing affordance) but separate.

### 4.2 [R-4] Make `FormFieldWrapper` the single field chrome, and let every field use it

Every leaf field — including `RefField`, `SelectField`, `InlineRefField` — should render through one
wrapper so label/error/presentation logic lives in exactly one place. Today those three opt out
because their "control" isn't a simple input. The render-prop already supports arbitrary controls; the
blocker is the error/description variants drifting. Unify on `FormFieldWrapper` and delete the inline
copies. This also fixes the inconsistency where `RefField` shows description-and-validation but
`FormFieldWrapper` shows error-only on `full`.

> **Landed (partial):** `FormFieldWrapper` gained a `renderStatic` override (for non-text static values)
> and a `standalone` flag, and now hosts `SelectField`, `GeoPointField`, and `MarkdownField` — their
> inline `Input.Root` + `FormFieldLabel` + error scaffolds are deleted. `RefField`/`InlineRefField`
> were **not** migrated: their "empty" is a _present-but-unresolved ref_ (not `value == null`), which
> the wrapper's value-based empty model can't express, and they're the most test-covered (create/tag
> flows). They instead consume `presentationFor` (R-5) and keep bespoke bodies — a better fit for the
> R-6 `FieldContainer` than for forcing them through this wrapper.

### 4.3 [R-5] Presentation as a strategy, not scattered conditionals

`FormPresentation` is read by `if (layout === 'static'|'inline'|'full')` in at least seven components.
Centralize it: a `presentation` descriptor (or small lookup) that answers the questions fields ask —
`showLabel`, `showError`, `renderStatic(value)`, `fieldClassName`, `controlWrapperClassName`. The
field-renderer task the user raised ("different variants for `FormPresentation`") becomes: pick the
strategy in `FormFieldWrapper` from `layout`, and have each branch consult it rather than re-deriving.

Concretely, `FormFieldWrapper` becomes:

```
const p = presentationFor(layout);         // { showLabel, showError, static }
return (
  <FieldRow variant={layout}>              // owns the wrapping div / grid track (R-8)
    {p.showLabel && <FormFieldLabel ... required={required} />}   // (R-9)
    {p.static ? <StaticValue .../> : children({ value })}
    {p.showError && error && <FieldError>{error}</FieldError>}
  </FieldRow>
);
```

This makes adding a new presentation (e.g. a `table`/cell variant, or a left-aligned `compact`) a
single new strategy entry rather than touching seven files.

> **Landed:** `presentationFor(layout)` (in `FormField/presentation.tsx`) returns
> `{ layout, showLabel, showError, isStatic, fieldClassName }`. `FormFieldWrapper`, the converted
> fields, `RefField`/`InlineRefField`, and `FormLayout`'s `LabelField` all read it instead of
> open-coding `layout === …` checks.

### 4.4 [R-8] The `div.contents` wrapper is a customization seam

`FormFieldWrapper` hard-codes `<div className='contents'>`. The user wants the field renderer
customizable (per-presentation variants). Extract the outer element into a `FieldRow`
(presentation-aware) component so the wrapping element, grid behaviour, and density can vary by
variant without editing every field. `contents` is correct for the default (let the parent grid own
rows) but `static`/`inline`/a future `table` variant may want a real element.

> **Landed:** `FieldRow` (in `FormField/presentation.tsx`) is the single place the outer row element
> and its class are decided; it reads `fieldClassName` from the presentation. Adding a presentation
> variant with a different wrapper now means one entry in `presentationFor`, not editing each field.
> `fieldClassName` is `contents` for all current variants — the seam is in place for future variants.

### 4.5 [R-9] Required-field asterisk (requested feature)

`FormFieldLabel` should render a trailing `*` for required fields. **Status: not currently possible
without threading new data** — the required/optional flag is dropped early:

- `SchemaEx.SchemaProperty` _does_ carry `isOptional` (`packages/common/effect/src/internal/ast.ts:55`).
- But `FormFieldSet` maps each property to `<FormField type={property.type} name=… />` — it passes only
  `type` and `name`, discarding `isOptional`.
- `FormField` builds `fieldProps` with no `required`, and `FormFieldWrapper`/`FormFieldLabel` never
  receive it.

**Implemented as:**

1. Thread `required: boolean` (i.e. `!isOptional`) from `FormFieldSet`'s property map → `FormField`
   prop → `fieldProps` → `FormFieldWrapper` → `FormFieldLabel`. For `FormLayout`, `resolveLayoutField`
   surfaces `required` (from the resolved `PropertySignature.isOptional`) on `ResolvedLayoutField`.
2. In `FormFieldLabel`, the asterisk is rendered via a **`::after` pseudo-element**
   (`after:content-['*'] after:text-error-text`), _not_ a DOM node. Two constraints forced this:
   - The label's `textContent` must stay exactly `label` — fields are widely located by exact label
     text (`getByLabelText('Name')`), and testing-library matches the label's DOM text. A real `*` /
     sr-only "(required)" node leaks into that text and breaks those queries app-wide. A pseudo-element
     is invisible to `textContent`.
   - `Input.Label` is a themed primitive that reads **`classNames`** (theme-merged via `tx`) and
     **ignores `className`** — so the asterisk classes must be passed as `classNames` to `Input.Label`
     (and `className` only to the plain `span` used for read-only/standalone labels).
3. The flag lives on `FormFieldRendererProps`/`FormFieldLabelProps` (default `false`); covered by the
   `FormFieldWrapper` `Required` story.

A11y note: the asterisk is decorative-only. Conveying required state to assistive tech properly means
`aria-required` on the _input_ (not text on the label) — tracked as a follow-up alongside R-4/R-5.

---

## 5. Normalize `ArrayField` and `RefField` recursion + containment

### 5.1 Current divergence

| Aspect           | Nested struct                  | Array of objects                        | Array of scalars/refs            | Inline ref                                     |
| ---------------- | ------------------------------ | --------------------------------------- | -------------------------------- | ---------------------------------------------- |
| Recurses via     | `FormFieldSet(collapsible)`    | `ArrayField`→`FormField(name:null)`     | `ArrayField`→`FormField(inline)` | new `FormRoot`→`FormFieldSet`                  |
| Visual container | bordered + indented + collapse | per-row grid, delete btn, **no border** | per-row inline grid              | `FormFieldSet collapsible` inside `Input.Root` |
| Header           | `FormFieldLabel` (collapse)    | `FieldHeader` (+add)                    | `FieldHeader` (+add)             | `FormFieldLabel`                               |
| Empty handling   | own check                      | own (`values.length < 1`)               | own                              | `readonly && !reference`                       |
| Item label       | per sub-field                  | suppressed (`name:null`)                | parent name (inline)             | n/a                                            |

So an object **inside an array** has no containing border, but the **same object as a nested field**
gets a bordered/indented/collapsible container. Two array headers (`FieldHeader`) and one struct
header (`FormFieldLabel`+toggle) do the same job differently.

### 5.2 [R-6] Extract a shared `FieldContainer` + normalize item recursion

1. **One container primitive** for "a labelled group that may hold sub-fields": `FieldContainer` with
   props `{ label, required, collapsible, bordered, add?, presentation }`. Nested struct, array, and
   inline-ref all render through it, so a struct looks the same whether reached as a field or an array
   item. This subsumes `FieldHeader` and the `FormFieldSet` collapse header (R-4 territory).
2. **Decide the containment rule once**: array-of-objects items should reuse the same bordered
   container as nested structs (the user's "visual containment of sub objects"). Today the array path
   sets `name:null` and skips the border; pull that decision into `FieldContainer` so it's a variant,
   not divergent code in `ArrayField`.
3. **Inline ref** is the odd one out (a whole new `FormRoot`). That's inherent — it edits a _different
   object_ — but its body (`FormContent` → `FormFieldSet collapsible`) should still mount the same
   `FieldContainer` chrome so it visually matches a nested struct.
4. The two `ArrayField` rendering branches (ordered DnD list vs static list) share item rendering
   (`renderField`) and delete affordance; the grid templates differ (`min-content_1fr_min-content` vs
   `1fr_min-content`). Fold into one item renderer parameterized by `draggable`.

> **Landed (partial):**
>
> - `FormField` accepts an explicit `label` override; `ArrayField` passes the array's resolved label to
>   inline (scalar/ref) items, fixing ref-array items showing the raw property name (`_tags`) instead of
>   the array's `title` annotation (`Tags`).
> - **`FieldContainer`** (`FormField/FieldContainer.tsx`) extracts the bordered + collapse + indented-body
>   chrome out of `FormFieldSet`. Because nested structs, object-array items, and inline refs all reach
>   it through `FormFieldSet collapsible`, their containment is now genuinely a single primitive (point 1
>   above). The delete affordance top-aligns (`items-start`) on tall rows (objects + owned-ref inline).
> - **`FieldHeader`** is now the single header primitive (label + optional inline add affordance + arbitrary
>   trailing `actions` + header `onClick`). `ArrayField`/`ViewEditor` use it for list headers and
>   `FieldContainer` uses it for the collapse header, so all group/list headers render identically.
> - **Still open:** folding `ArrayField`'s two list branches (point 4). Left intentionally — the ordered
>   (`OrderedList` DnD) and static (plain divs) branches use different list containers and share only ~6
>   lines; folding would add a parameterized helper and risk the drag behavior for negligible gain.

---

## 6. `BooleanField` height hack, `IconBlock` grid sizing, and density

### 6.1 The problem

`BooleanField` wraps the switch:

```tsx
// TODO(burdon) Push down to react-ui components (e.g., Input.Root).
<div className='flex items-center px-0.5 h-8'>
  <Input.Switch ... />
</div>
```

The `h-8` forces the switch row to match the height of a text `Input` so adjacent rows align. This is
a **layout concern leaking into the field**: the `8` is a magic number duplicating `Input`'s height,
and it is **not density-aware** — under `DensityProvider density='sm'|'xs'` the text inputs shrink but
this row stays `h-8`, so a boolean row drifts out of alignment.

Similarly `CompactIconButton`/`IconBlock` (`FormField.tsx`) exist to force a fixed square
(`--dx-rail-item`) so a decorative/interactive icon shares a grid track with inputs "without drifting
by a pixel" — again a fixed size, again density-blind for the form's purposes.

So there are **two parallel "force a control to the form-row height" mechanisms** (`h-8` for switch,
`IconBlock`/rail-item for icons) and neither tracks density.

### 6.2 [R-10] Give `react-ui` a density-aware "form control row height"

The real fix is in `@dxos/react-ui`, not here:

1. Define the input/control row height as a **density-scaled token** (it likely already partly exists
   for `Input`; expose it as a CSS var like `--dx-input-height` driven by `useDensity`). Text `Input`,
   `Switch`, `Checkbox`, `Select`, and `IconBlock` all read the _same_ token.
2. `Input.Switch` / `Input.Checkbox` should center themselves within that row height by default (an
   `Input.Root` "control row" wrapper, or a `row`/`align` prop) so `BooleanField` needs **no** wrapper
   `div` and **no** `h-8`. This is exactly the `TODO(burdon)` in `BooleanField`.
3. `IconBlock`'s square should derive from the same density token (today `--dx-rail-item`), so a form
   row's icon track and input height stay locked together across densities.

Outcome for this package: `BooleanField` collapses to `<FormFieldWrapper>{() => <Input.Switch …/>}</FormFieldWrapper>`,
and Checkbox (if/when added) follows the same path. The grid-sizing for icons becomes a token, not a
component workaround.

This is a **react-ui change with a form follow-up**; it should be scoped/PR'd against react-ui first
(coordinate with the `composite-components` owners) and the form simplification lands after.

---

## 7. Other findings (lower priority)

- **`Form.Submit` is legacy** — `FormControls.tsx` already carries a TODO to deprecate it in favour of
  `Form.Actions` without a cancel callback. Remove once call sites migrate.
- **`onCancel` is a no-op** (`// TODO(burdon): implement "revert values"`). Either implement revert or
  drop the prop to avoid implying behaviour.
- **`useFormFieldSetProperties` recomputes on every value change** (TODO in `FormFieldSet.tsx`):
  `values` is in the `useMemo` deps only to support discriminated-union member selection. Narrow the
  dep to the discriminator value(s) so ordinary edits don't re-derive the property list.
- **`changed` vs `touched`, `isValid` vs `canSave`** carry TODOs in `useFormHandler` questioning the
  distinction. `touched` gates _error visibility_; `changed` gates _autosave_; `canSave` adds the
  `saving` guard + only-touched-errors rule. The distinctions are real but undocumented — add a short
  doc comment rather than collapsing them.
- **Schema rebuilt per render** — `FormField` does `Schema.make(type)` for `fieldProvider` and nested
  structs each render (`// TODO(burdon): Expensive…`). Pass the AST to `fieldProvider` (or memoize).
- **`getDefaultValue` throws** on unsupported AST inside `ArrayField` add — acceptable but should be
  caught by the `FormFieldErrorBoundary` only if it's during render; the add handler runs in an event,
  so an unsupported element type would throw uncaught. Guard it.

---

## 8. Recommendations, ordered

Grouped so each builds on the previous. Items marked ⟂ are independently shippable.

**Type/plumbing foundation**

- **[R-1]** Introduce `FieldContext` (= `FormFieldOptions & CreateOptions & RefDataProps`); collapse the
  repeated `Pick` fragments in `FormFieldProps`/`FormFieldSetProps`/`FormContextValue`.
- **[R-2]** Rename for clarity (`FieldContext`, `FieldDescriptor`); optional namespace alignment.
- **[R-3]** Collapse / rename the duplicate `FormFieldSet`/`FormLayout` (controller vs pure).
- **[R-7]** Replace `useType`/`useResults` hook-props with service/context injection (or async
  callbacks). Removes the largest chunk of prop plumbing.

**Structural unification**

- **[R-4]** Route every field (incl. `RefField`/`SelectField`/`InlineRefField`) through one
  `FormFieldWrapper`; delete the inline label/error copies.
- **[R-5]** Presentation strategy: replace scattered `layout ===` checks with one `presentationFor(layout)`.
- **[R-8]** Extract `FieldRow` (presentation-aware outer element) — the customization seam for the
  `div.contents` wrapper.
- **[R-6]** Extract `FieldContainer`; normalize array/struct/inline-ref containment + item recursion.

**Features / cross-package**

- **[R-9]** ⟂ Required-field asterisk (small; do after R-1 so the `required` flag rides the cleaned-up
  context, or thread it standalone if R-1 isn't scheduled).
- **[R-10]** Density-aware control-row height token in `@dxos/react-ui` (Switch/Checkbox/IconBlock);
  then delete `BooleanField`'s `h-8` hack. **Cross-package — react-ui first.**

**Cleanup (⟂, any time)**

- **Landed:** `fieldProvider`'s schema is memoized (no `Schema.make` per render); `getDefaultValue` is
  guarded in `ArrayField`'s add handler; `changed`/`touched`/`canSave` are documented.
- **Deferred (breaking / cross-package — own PRs):**
  - **Remove `Form.Submit`** — used by 7+ plugins (trip, space, game, inbox, thread, integration);
    removal is a migration, not a cleanup.
  - **[R-7]** hook-props (`useType`/`useResults`/`getOptions`) — passed by `react-ui-table` and
    `plugin-automation`; replacing them with service injection changes a public API.
  - **[R-10]** density control-row token — a `@dxos/react-ui` (Switch/Checkbox/IconBlock) change that
    affects every Switch app-wide; out of scope for the form package.
  - `onCancel` already delegates to the parent (which owns revert, as the stories show) — left as-is.
  - Narrowing `useFormFieldSetProperties`' `values` dep risks discriminated-union rendering for a memo
    micro-opt — left as-is.

### Suggested first PR

R-1 + R-2 + R-9 (types foundation + the requested asterisk) — self-contained, no behaviour change
except the asterisk, and it makes the later structural PRs (R-4/5/6/8) much smaller. R-10 proceeds in
parallel in react-ui.
