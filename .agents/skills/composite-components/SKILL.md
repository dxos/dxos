---
name: composite-components
description: Use when authoring or refactoring composite React components in `@dxos/react-ui` and sibling UI packages — namespaced primitives like `Foo.Root` / `Foo.Trigger` / `Foo.Content` built around `forwardRef`, the `ark.*` factory's `asChild`, and a `tx()` theme function.
---

# Composite Components

A "composite" is a namespaced React API like `Dialog.Root` / `Dialog.Trigger` / `Dialog.Content`, in the Radix/Ark anatomy style. Scaffolding — `createContext`, `composeRefs`/`useComposedRefs`, `useControllableState`, `composeEventHandlers` — comes from `@dxos/react-hooks`; polymorphic elements come from `ark.<tag>` (`@ark-ui/react/factory`), which takes `asChild` itself. Do not import `@radix-ui/react-context`, `-slot`, `-primitive`, `-compose-refs` or `-use-controllable-state`; the last three exist only inside `react-ui`'s remaining Radix forks.

## Exemplars

- **Pure DXOS composite** (no underlying behavioural primitive): [packages/ui/react-ui/src/components/Panel/Panel.tsx](../../../packages/ui/react-ui/src/components/Panel/Panel.tsx).
- **Ark-wrapping composite** (each part wraps an `@ark-ui/react/<component>` part): [packages/ui/react-ui/src/components/Splitter/Splitter.tsx](../../../packages/ui/react-ui/src/components/Splitter/Splitter.tsx).
- **Radix-wrapping composite** (legacy, being migrated — see `react-ui/docs/MIGRATION.md`): [packages/ui/react-ui/src/components/Dialog/Dialog.tsx](../../../packages/ui/react-ui/src/components/Dialog/Dialog.tsx).

Read both before writing a new one.

## Two construction styles

Pick **one** style per part — never mix forms inside a single part.

### Style A — `slottable()` / `composable()` (pure DXOS)

Use when the part renders a plain DXOS element (a `div`, `span`, etc.) and does not wrap a behavioural primitive.

```tsx
const FooContent = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props);
  const { tx } = useThemeContext();
  return (
    <ark.div asChild={asChild} {...rest} className={tx('foo.content', {}, className)} ref={forwardedRef}>
      {children}
    </ark.div>
  );
});

FooContent.displayName = 'Foo.Content';
```

`slottable()` (from `../util`) auto-`forwardRef`s, validates `asChild` children against the `COMPOSABLE` symbol, and threads `composableProps`. Use `composable()` for leaf parts that don't need an `asChild` branch but should still be valid `asChild` children. `ark.<tag>` merges the part's props into its single child under `asChild` (className joined, style merged, handlers both called); there is no `Slottable` — a part that renders siblings beside the slotted child renders them itself.

### Style B — `forwardRef` wrapping a behavioural primitive

Use when the part wraps an `@ark-ui/react/<component>` (or, in legacy code, `@radix-ui/react-*`) part that already provides `asChild`, ref forwarding, and ARIA wiring.

```tsx
const FooTitle = forwardRef<HTMLHeadingElement, FooTitleProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <FooPrimitive.Title {...props} className={tx('foo.title', {}, classNames)} ref={forwardedRef} />;
});

FooTitle.displayName = 'Foo.Title';
```

For pure pass-through aliases, drop the explicit type — let the alias inherit the primitive's type (preserves `forwardRef`):

```tsx
const FooTrigger = FooPrimitive.Trigger;
const FooPortal = FooPrimitive.Portal;
const FooClose = FooPrimitive.Close;
```

Do **not** annotate aliases as `FunctionComponent<...>` — it strips ref support from the type.

## Rules

1. **Prefix internal names**: `FooRoot`, `FooTrigger`, `FooRootProps`. The unprefixed `Root` / `Trigger` form appears only as keys in the final namespace object (`export const Foo = { Root: FooRoot, ... }`).
2. **`displayName` is dotted and matches the consumer API**: `'Foo.Root'`, `'Foo.Overlay'` — not `'FooRoot'` or `'FooOverlay'`. Set it on every part, including `slottable()`/`composable()` ones (the helper does not set it automatically).
3. **Namespace assembly** is an object literal. No `Object.assign`, no `import * as Foo`:
   ```tsx
   export const Foo = {
     Root: FooRoot,
     Trigger: FooTrigger,
     // ...
   };
   ```
4. **Export every part's Props type**:
   ```tsx
   export type { FooRootProps, FooTriggerProps /* ... */ };
   ```
5. **Section comments** delimit each part:
   ```tsx
   //
   // Root
   //
   ```
   They are cheap structure and make large composite files navigable.
6. **Theme tokens**: classNames flow through `tx('foo.part', variants, classNames)`. For `slottable`/`composable` parts, use `composableProps(props)` to reconcile the consumer's `classNames` with any `className` injected by a parent `Slot`. Theme tokens live in a sibling `Foo.theme.ts` registered with `ui-theme`.
7. **Props convention**: extend `SlottableProps<P>` (or `ComposableProps<P>`) from `@dxos/ui-types` for native parts; extend `ThemedClassName<FooPrimitive.SomeProps>` for primitive-wrapping parts. Use `classNames` (consumer-facing) — never expose `className` directly.
8. **Context**: prefer `createContext` from `@dxos/react-hooks` over React's plain `createContext` (it returns a typed `[Provider, useContext]` tuple whose provider takes the fields as props and whose hook throws a part-named error when unprovided). There is no scoped variant: "which Foo does this part belong to" is answered by nesting providers, or by the Ark machine's `RootProvider` for Ark-backed composites. The `__scope*` props still in `Tooltip`/`Popover`/`Menu` belong to the Radix forks and leave with them.
9. **No `as any` displayNames**. If a part is a plain function component you can't otherwise tag, wrap it in `composable()` so `displayName` is a typed property.
10. **One file per composite family** (`Foo.tsx`). Don't split parts across files.

## Counter-examples to avoid

- `'DialogOverlay'` displayName → should be `'Dialog.Overlay'`.
- `const DialogClose: FunctionComponent<DialogCloseProps> = DialogPrimitive.Close` → drop the annotation.
- `(CardMenu as any).displayName = 'Card.Menu'` → wrap `CardMenu` in `composable()` instead.
- Re-exporting a foreign part inside the namespace (e.g., `Card.ToolbarIconButton: Toolbar.IconButton`) → consumers should import `Toolbar.IconButton` directly.
- A `Foo.tsx` file that mixes `slottable()` parts with bare `forwardRef` parts that render plain divs — pick `slottable()` for both.
