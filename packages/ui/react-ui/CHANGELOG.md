# @dxos/react-ui

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/debug@0.11.1
- @dxos/i18n@0.11.1
- @dxos/invariant@0.11.1
- @dxos/lit-ui@0.11.1
- @dxos/log@0.11.1
- @dxos/react-error-boundary@0.11.1
- @dxos/react-hooks@0.11.1
- @dxos/react-input@0.11.1
- @dxos/react-list@0.11.1
- @dxos/ui-types@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- ed992c2: Remove `className` from `ComposableProps`, so `classNames` is the only styling prop a consumer may
  pass to a composable or slottable component. Accepting both gave every part two indistinguishable
  props, and a part that destructured one while spreading the other silently dropped the caller's
  classes. Passing `className` to such a component is now a compile error; rename it to `classNames`.
  Radix `Slot` still injects `className` at runtime — implementations receive it through
  `HTMLAttributes` and `composableProps` merges it, so slotted composition is unchanged.
- ed992c2: Put controls on a single three-step scale — 24 / 32 / 40px (`sm` / `md` / `lg`) — replacing 17
  distinct heights. Breaking: the `xs` density is removed (`Density` is now `'lg' | 'md' | 'sm'`) and
  anything previously `sm` (28px) renders at 24px.

  `DensityProvider` supplies density through React context only and renders no DOM; controls read it
  and emit `data-density`, which overrides `--dx-control` for that element alone. It deliberately does
  not emit a `dx-density-*` class — that set the knob for an entire subtree, so a provider intended for
  one region silently resized unrelated descendants. A region that wants subtree-wide density applies
  the class itself at the call site, as `Toolbar.Root` does.

- d958118: Inbox draft composer rebuilt as a compose-style form, plus the shared UI it needs. `@dxos/react-ui` `Input.TextInput` gains MUI-style `start`/`end` adornments rendered inside the input container; `@dxos/ui-theme` adds a shared `.dx-input` box treatment (surface + hairline border + focus-within shift) now used by Input, `MarkdownField`, `RefEditor`, and the inbox editor. `@dxos/react-ui-form` `RefEditor` email mode renders committed mailboxes as atomic tag widgets (trailing delete affordance, no `@` marker) — a raw address stays plain text until committed with comma/Space/Enter, typing before a tag starts a fresh token, and the single line is centered so text and tags align. `@dxos/ui-editor`'s `defaultThemeSlots` is now `fullWidth` (no longer forces `h-full`). `@dxos/plugin-inbox` `EditMessage` gains To/Cc/Bcc recipient pickers with Person autocomplete, arrow-key field navigation, and a layout fix so Send no longer overlaps the editor.
- e65432c: Rework the light-mode surface ladder and control states.

  Surface levels, separators, wells, scrollbar thumbs and rail tones are now
  derived from the enclosing `--surface-bg` and attenuated for light mode through
  a single `--dx-attenuate-*` table, replacing several fixed neutrals that had
  drifted from the ladder. Filled controls derive their hover from their own fill
  (`--color-input-bg-hover`) rather than from the host surface, so hovering a
  default button no longer lightens it into the selected tone. `Panel.Toolbar`
  owns the toolbar bar treatment, so a nested `Toolbar.Root` matches content width
  without floating. Cards now carry their padding unconditionally.

- 51aaffe: Rename `Message.Content` to `Message.Body` and add a new optional `Message.Content` wrapper that carries the message's default padding. `Card.Root` accepts a `gutter` prop so a card whose body is a form insets its fields like a standalone form.
- 848ba1b: Add a `Slider` primitive built on the Radix slider (`Slider.Root`/`Track`/`Range`/`Thumb` composed behind a single themed component), supporting one or more thumbs, horizontal and vertical orientation, and a disabled state. `react-ui-form`'s `Form.Row` gains an additive `labelEnd` slot that renders trailing content at the end of the label row, so a field can show a live value beside its label without nesting it inside `Input.Label` (which would change the input's accessible name).
- 55bb048: Runtime icon resolver: `ThemeProvider` mounts a shared `IconRegistry` that ingests the static `/icons.svg` sprite into an in-DOM defs container and resolves missing icons on demand from a per-icon-set route (Phosphor at `/phosphor/{weight}/{name}.svg` by default, configurable via `IconSource`), so icons referenced only by runtime-loaded plugins render without being present in the build-time sprite. `useIconHref` now returns a same-document `#name` href (or `undefined` while unresolved), and `<dx-icon>` consumes the same registry via a `globalThis.__dxIconRegistry` bridge. Breaking: the unused `noCache` prop is removed from `ThemeProvider`, `withTheme`, and `<dx-icon>` — cross-document sprite URLs are no longer built, so there is nothing to cache-bust.
- ed992c2: Consolidate the theme's elevation ladder onto a single documented definition and remove dead theme
  surface. Breaking: `Column.Bleed` (unused; `ScrollArea` auto-bleeds inside `Column.Root`),
  `ghostHover`/`ghostFocusWithin` (use the `dx-hover` utility), and `densityBlockSize` are removed; the
  `.dx-panel` hue-tinted callout class is renamed `.dx-callout`; the unconsumed `--dx-lacuna-*`,
  `--dx-input-{sm,md,lg}`, `--spacing-icon-button-padding`, and `--spacing-scroll-padding` tokens and
  the `dx-column`, `dx-hover-row`, and `dx-current-row` classes are deleted. Light-mode elevation
  levels 1 and 3 shift one ramp stop so the ladder is monotonic in both themes, and `.dx-density-md`
  is now defined so a nested region can reset density.
- ed992c2: Rework the surface system around six named elevation levels (`sunken`, `chrome`, `base`, `raised`,
  `overlay`, `popup`). Chrome now sits below the document canvas and cards above it, so panels read as
  raised rather than recessed. Toolbars, groups and inputs are no longer fixed levels: they derive
  from whichever surface hosts them, so a toolbar in a card and a toolbar on the canvas each read
  correctly. Enter a surface with `data-surface="<level>"` or the matching `dx-*-surface` class; a bare
  `bg-*-surface` utility paints the colour without publishing the surface, so states inside it will not
  derive. Fixes `selected-surface` silently tracking the root surface instead of its own zone, and the
  app canvas not painting a surface at all.

### Patch Changes

- e0e1a9f: Supporting changes for the new plugin-blogger / plugin-typefully feature:
  - **@dxos/plugin-connector**: expose `Connection` types via a new `./types` export subpath so provider plugins can consume the connection contract without pulling the full package barrel.
  - **@dxos/react-ui**: `Card.Root` now accepts and forwards `onKeyDown`, enabling keyboard-interactive cards (Enter/Space activation) without a cast.

- 2fe5a7a: `useThemeContext` no longer throws when no `ThemeProvider` is mounted; it falls back to the default theme (with a one-time warning) so error-reporting surfaces such as the fatal dialog remain renderable.
- c9651f1: Logger panel review follow-ups:
  - **@dxos/react-ui-debug**: each `Logger.Root` recording session now self-filters via its own parsed filter and registers in a module-level recorder registry that composes the shared `@dxos/log` config (union) and restores it on the last release — concurrent panels with divergent filters no longer clobber each other. The log list gains a per-row checkbox (Copy log then exports only the checked rows), full-line selection styled via `aria-current`/`dx-current`, arrow-key navigation between lines (inner controls opt out of the roving tabindex), Space to toggle expansion, and Enter to toggle the checkbox. Expanded rows render message/context via `JsonHighlighter` and error stacks via the shared `ErrorStack` (clickable `vscode://` frames). Each log record also retains the derived package (from its source path) for display/export.
  - **@dxos/react-ui**: `ErrorStack` now accepts a `classNames` prop so consumers can style the trace container.

- 717edc0: `MediaPlayer` now honors an explicit `kind` prop for native playback of extensionless sources (e.g. `blob:`/`data:` URLs), instead of falling back to an `<img>` when the URL has no recognized media extension.
- 37874ce: Move contexts, hooks, constants and helpers out of React component modules into sibling modules so each component module is a react-refresh boundary. Public package APIs are unchanged; the previously exported names are re-exported from each directory barrel.
- Updated dependencies [aea1e6e]
- Updated dependencies [ed992c2]
- Updated dependencies [3f1fc67]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [4df6cf3]
- Updated dependencies [c58ebb7]
  - @dxos/async@0.11.0
  - @dxos/ui-types@0.11.0
  - @dxos/util@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/react-error-boundary@0.11.0
  - @dxos/react-hooks@0.11.0
  - @dxos/lit-ui@0.11.0
  - @dxos/react-input@0.11.0
  - @dxos/react-list@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/i18n@0.11.0
  - @dxos/invariant@0.11.0
