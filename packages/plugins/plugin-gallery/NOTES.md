# Notes for `composer-plugins` skill update

Captured while building `plugin-gallery`. Each item below is a pattern or
correction that should be reflected in `.claude/skills/composer-plugins/SKILL.md`
(and its mirror in `.agents/`).

## Components vs containers

- `src/components/` is presentation-only. Must NOT depend on
  `@dxos/app-framework`, `@dxos/app-toolkit`, or any plugin capabilities.
  Storybooks won't have a PluginManager — calling `useCapability`/
  `useCapabilities`/`useAppGraph`/`useOperationInvoker` under `components/`
  throws.
- If a component needs capability data, take it as a prop (URL, callback, Tile
  component) and move the hook one level up into `containers/`.
- React-only hooks that depend on capabilities (e.g. `useImageUrl`,
  `useFileUpload`) belong in a `src/hooks/` directory, not `components/`.

## Components own structure; containers own layout

- A presentation component should NOT use `Panel.Root` / `Panel.Toolbar` /
  `Panel.Content`. The container composes `Panel.*` around the component
  parts. Example: `Lightbox.Root` provides context, `Lightbox.Viewport` renders
  the masonry; the container wraps with `<Panel.Root><Panel.Toolbar/>
<Panel.Content asChild><Lightbox.Viewport /></Panel.Content></Panel.Root>`.
- Containers use `asChild` on `Panel.Toolbar` and `Panel.Content` so the
  composed primitive (e.g. `Menu.Toolbar`, `Lightbox.Viewport`) is the actual
  rendered DOM node.

## Composable Radix-style components

- Non-trivial components export a namespace: `Foo.Root / Foo.Toolbar /
Foo.Content / Foo.Viewport`. Mirrors `Panel.*`, `Card.*`, `Masonry.*`,
  `ScrollArea.*` in `@dxos/react-ui` and `@dxos/react-ui-masonry`.
- **Inner const names are prefixed** (e.g. `LightboxRoot`, `LightboxViewport`,
  `CardRoot`, `CardToolbar`). The namespace export uses unprefixed keys:
  `export const Lightbox = { Root: LightboxRoot, Viewport: LightboxViewport }`.
- Inner pieces should be **composable** (forward ref + `classNames`) using
  `composable<HTMLElement, ThemedClassName<P>>` and `composableProps(props)`
  from `@dxos/ui-theme`. This lets containers slot them into `Panel.Content
asChild` cleanly.
- The **Root** is typically headless context (`createContext` from
  `@radix-ui/react-context`) — no DOM. The data prop is the domain object
  (e.g. pass the whole `Gallery` ECHO subject; `Viewport` reads `gallery.images`)
  rather than passing extracted arrays.
- Sketch the namespace export first when designing a new component; only
  collapse to a single component if the surface really has no slots.

## Reactivity

- A surface receiving an ECHO subject via `AppSurface.ObjectArticleProps<T>`
  MUST call `useObject(subject)` and read from the snapshot. Without it,
  mutations to nested arrays/structs (e.g. `Obj.change(obj, m => m.images = [...])`)
  do not trigger re-render until you navigate away and back.
- Reads come from the snapshot, but writes still target the original subject
  via `Obj.change(subject, ...)`. Cast inside the change callback:
  `const m = obj as Obj.Mutable<T>; m.images = [...]`.
- For `useMemo` deps over snapshot arrays, depend on both the array and its
  `.length` so mutations trigger recompute even if the snapshot keeps a
  stable array reference.

## Toolbar wiring

- Use `MenuBuilder.make().action(...)` + `useMenuActions(atom)` →
  `<Menu.Root {...menuActions} attendableId={attendableId}><Menu.Toolbar />
</Menu.Root>`.
- Always thread `attendableId` from `AppSurface.ObjectArticleProps` into
  `<Menu.Root>`. Don't underscore it as unused — without it,
  attention-driven toolbar contributions don't target the right surface.
- Place `Menu.Root` _outside_ `Panel.Toolbar asChild`; put `Menu.Toolbar`
  inside.

## Reusable cross-plugin hooks

- `useFileUpload({ subject, accept, onUpload })` — wraps the
  `AppCapabilities.FileUploader` capability + a hidden `<input type="file">`,
  returns `{ open, enabled, input }`. Drop-in for any container offering an
  "Add file" affordance. (Currently lives in `plugin-gallery/src/hooks/`;
  candidate to promote to `app-toolkit` or a new `plugin-files-ui`.)
- `useImageUrl(url, type?)` — resolves `wnfs://` URLs to blob URLs via
  `WnfsCapabilities.Blockstore` / `Instances`; passes `http(s)://` through.
  Depends on `@dxos/plugin-wnfs/helpers` (added as a public export).

## Schema annotations

- Hide internal-only fields from the auto-generated object-properties form
  with `FormInputAnnotation.set(false)`. Example: `images: Schema.Array(Image).pipe(FormInputAnnotation.set(false), Schema.optional)`.

## Aspect-ratio image rendering inside Card.Root

- `Card.Root` is a grid (icon | title | menu). A bare `<img>` lands in a
  single column. Wrap with `<div role='none' className='col-span-full'>`
  to span the full card width — same trick `Card.Poster` uses.
- For aspect-driven masonry tiles, render `<img class="block w-full h-auto"
width={W} height={H} style={{ aspectRatio: W / H }}>`. Set width/height
  attrs and inline `aspect-ratio` so the tile reserves the correct height
  before the image loads (no reflow).
- Capture `naturalWidth/naturalHeight` from a temporary `<img>` in the
  upload onUpload callback and persist them on the Image schema, so
  freshly-uploaded images render at the right aspect on first paint.

## Comment / section style

- Section markers are exactly:
  ```ts
  //
  // SectionName
  //
  ```
  No prose body inside the section marker.
- Descriptive comments go in JSDoc `/** */` blocks immediately above the
  associated component/function — only when the explanation is non-obvious
  (the WHY).

## Imports

- Use the package alias barrels: `import { Gallery } from '#types'` (yields
  the namespace `Gallery.Gallery`, `Gallery.Image`, `Gallery.make`). Avoid
  deep relative paths to specific schema files (e.g. `'../../types/Gallery'`)
  in favour of the barrel.

## Storybook

- Use `https://picsum.photos/seed/{seed}/{w}/{h}` for image mocks — varied
  sizes per seed. Set `width`/`height` on the mock to exercise the
  aspect-ratio code path.
- Pass plain JS objects to schema-typed props via `as unknown as Type`
  rather than constructing real ECHO objects.

## moon.yml

- Components with storybooks need `ts-test-storybook` and `storybook` in
  the `tags` list, plus `@storybook/react-vite` in devDependencies.
