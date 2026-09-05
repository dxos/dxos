# @dxos/react-ui

## 0.12.0

### Minor Changes

- 96f94c2: `Carousel`, `Editable`, `Splitter` and `Stepper` are now built on `@ark-ui/react`'s zag state machines rather than hand-written interaction and a11y logic. The namespaced APIs (`Carousel.Root`, `Editable.Preview`, `Splitter.Panel`, …) and their props are unchanged apart from the two noted below, and every part still takes `classNames`.

  Breaking: `Carousel.Root` no longer takes `transition` — the machine has one way to move between slides, so a carousel that previously hard-swapped now slides — and `useCarousel` is removed. `Editable`'s `useEditableContext` is now the machine's own context hook and takes no consumer name; `useEditable` keeps its options and return shape, with `onBlur` dropped (an interaction outside the field is the machine's to handle) and `activation` widened to also accept `'focus'` and `'none'`.

  `Escape` on an `Editable` that was empty when it opened now discards the typed text rather than keeping it, and a field held open through `editing` commits at all — a controlled editing state made the machine treat a submit as a request to its host, so a pane editor driven that way wrote nothing.

  `Stepper` no longer eases its progress line back to nothing when a run is reset or wound back; only the line leaving the stage in flight animates, and everything else lands at once. A run that fails now draws every stage it started in the error hue rather than only the stage it stopped on.

  An article surface is told which graph node it renders (`nodeId`), separate from which node holds attention (`attendableId`). The two are the same for a primary plank and differ for a companion, which shares its host's attention — so a surface reading its own contributed actions from `attendableId` was rendering the host's toolbar. Actions can also say which surface they suit: `disposition` already accepted an array, and `'prompt'` joins `'toolbar'` for actions that belong beside a text input rather than on an object.

  An editor's placeholder no longer shows behind streamed pending text, which is a decoration rather than document content.

- d194929: Add `Collapsible`, a section that folds under its own heading — it pairs the trigger to the section for assistive technology, animates the section's height, and can mount it only while open. A stack of them under one caller-owned expansion set is an accordion, which is how a mail conversation now renders its messages. Dialogs focus the control marked `data-dx-autofocus` on open, so one offering a Cancel action no longer commits on a reflexive Enter, and a dialog body scrolls with its header and actions pinned. Fixes a popover crash on any surface whose theme context carries no safe-area padding, a task list description running under the trailing controls, and an outliner menu button that stayed put when an ancestor scrolled.
- 557e243: `Column.Root` (and `Card.Root`) gain a `gap` prop (`sm` | `md` | `lg`) controlling the vertical gap between all rows of the grid. The card's default spacing is unchanged (`sm` equals the previous `gap-1`).
- 813069c: Add `gap`, `align`, `justify`, `wrap`, and `center` props to the `Flex` primitive. `gap` accepts only named steps of the theme spacing ramp (`xs`–`2xl`, plus `form` and `form-section`), so the prop uses named spacing tokens instead of arbitrary Tailwind literals; `classNames` remains an unrestricted escape hatch. The `Gap`, `Align`, and `Justify` unions are exported for reuse.
- 098a0bb: Inbox surface: virtual folders, archive, and sender enrichment.

  **Inbox and Starred folders** join All Mail / Sent / Drafts / Subscriptions as mailbox child nodes, reusing the existing `properties.filter` + `systemTag` path — no new query machinery.

  **Archive** is available from both the conversation menu and the mailbox tile menu, grouped with Delete since both take a message out of the reading flow. Archiving from a dedicated message view closes the plank; restoring does not.

  Archive is modelled as the `inbox` system tag coming **off**, never a separate `archived` tag: Gmail models INBOX as a label and JMAP as a mailbox role, both already mapped by the providers, so one toggle serves both directions and no filter-complement operator is needed. Note that tag changes are not yet pushed back to the provider, so **a Gmail sync will restore an archived message** — pushing them is tracked separately.

  **Conversation menu** gains "Create Project" (the `CreateProjectFromMessage` operation previously had no UI) and sender enrichment. The latter arrives through a new `InboxCapabilities.SenderAction` capability rather than a direct import, because plugin-crm already depends on plugin-inbox; `createInvocations` returns a list so a contributor can express a composite (research, then image) without fusing it into one operation.

  **Pipeline actions are hidden until a connection is configured** — previously Enrich was offered on a mailbox with nothing to enrich.

  **`RecordArticle` gains a toolbar** sourced from the subject's own app-graph node, so any plugin can contribute type-specific actions to it; plugin-crm contributes Enrich for `Person` and `Organization`. `Card.Action` gains a `leading` slot so a row standing for a person can show their avatar instead of a generic glyph.

  **Removed:** `InboxOperation.ProcessMailbox` and its routine template. Its cursor helpers were shared with `ClassifyMailbox` and survive at `operations/cursor.ts` with a now-required consumer id; `ResetProcessCursor` becomes the generic `ResetFeedCursor`, also with a required `cursorId`. `CrmOperation.ProcessMailbox` is unrelated and unaffected.

- 557e243: `Message.Root` is now headless — it renders no DOM element, only the shared message context (ids, valence, icon). The message's element moved to `Message.Content`, which is now required inside every `Message.Root`: a `Column` grid carrying the alert/paragraph role, the aria wiring, the valence CSS variables and the valence surface. Hosts that rendered `Message.Title`/`Message.Body` directly under `Message.Root` must wrap them in `Message.Content`, and any `classNames`/`data-*`/`ref` previously on `Message.Root` moves to `Message.Content`.
- 29543ca: MOSAIC ui-template groundwork across the UI packages.

  - `Grid` layout primitive: track lists (`cols={['min-content', '1fr']}`), `subgrid`, `gap` from the spacing ramp, `align`/`center`, `contents`, and `asChild`.
  - `Show`/`Switch` conditional-rendering primitives: `<Show when fallback>` renders its children (or a render prop receiving the narrowed value) while `when` is present — anything except `undefined`/`null`/`false` — and `<Switch.Root on fallback>` renders the first `<Switch.Match when>` whose `when` strictly equals (or, as a predicate, matches) `on`. Both are DOM-free and mirror the ui-template `show`/`fallback`/`switch`/`match` grammar.
  - `Combobox`: the popover aligns exactly with its trigger (trigger-width content, zero collision padding), the trigger reuses the `Select` trigger slot and the placeholder role, and single-select lists emit one selection per press.
  - `Listbox`: visible row focus ring, `onDeselect` (Escape clears only a non-empty selection), and a `multiselectable` mode for externally-managed selection with option navigation.
  - `TaskList.Root`'s `onTaskCreate` now receives a `TaskDraft` (`{ title, ...optional patch fields }`) instead of a bare title, so a description (or priority/assignee) can be supplied when available.

- 0a3e9dd: Consolidate the progress components. `Progress` is the fill bar (renamed from `Status`, with its `status.*` theme keys now `progress.*`), `Stepper` draws a fixed plan as circles joined by flexing lines, and `TextCrawl` moves here from `@dxos/react-ui-components`, which gains `ProgressMeter` — the readout that assembles the three. **Breaking:** `Status` is gone; use `Progress`. `ProgressBar` and `ProgressMeter` move out of `@dxos/react-ui-components` and `@dxos/react-ui` respectively.
- 306f50d: Mail and calendar providers now own their own operations. `GoogleMailSync`, `GmailSend`,
  `MaterializeGmailTarget`, `GetGoogleCalendars`, `GoogleCalendarSync`, `MaterializeGoogleCalendarTarget`
  (was `MaterializeCalendarTarget`), `CreateGoogleCalendarEvent`, `GetGoogleContactGroups` and
  `GoogleContactsSync` move from `@dxos/plugin-inbox/InboxOperation` to
  `@dxos/plugin-google/GoogleOperation`; `JmapSync`, `MaterializeJmapTarget` and `JmapSend` move to
  `@dxos/plugin-jmap/JmapOperation`. Their operation DXNs change accordingly.

  The Inbox, Inbox (Send) and Calendar skills no longer name a provider: their tools are resolved from
  the connectors and send providers a deployment actually installs. A JMAP-only deployment previously
  advertised Gmail tools it could not run and had no sync tool of its own.

  A draft calendar event is now one carrying no foreign key from any provider, rather than none from
  Google — events synced by any other calendar connector were reported as perpetual drafts.

  `ScanMailbox` is now `AnalyzeMailbox`, and its progress meters name their phase as well as their
  mailbox ("Syncing Inbox", "Analyzing Inbox") — two meters run over one mailbox, so the bare name left
  the user unable to tell which was moving.

  A card header's leading depiction is now contributable per type via the `AppSurface.CardIcon` role.
  Hosts wrap their existing default in `CardIconSlot`, which renders a contributed surface when one
  matches and the default otherwise — `Surface`'s own `fallback` is the error boundary, and unlike
  `CardContent` a miss here cannot render nothing. Scoped to cards deliberately: a 6-unit card block
  affords initials or a photograph where a 16px navtree row does not, so non-card surfaces keep
  resolving `IconAnnotation` through `Obj.getIcon`. `ObjectAvatar` now derives its initials' hue from the
  object's label rather than its type, since a type declaring a single hue put every instance on the same
  disc; it is no longer a card's default depiction, only what a type opts into.

  **`@dxos/react-ui` breaking:** `Message` is renamed to `Banner` — `Message.Root`/`Content`/`Title` are
  now `Banner.*`, the `message.*` theme keys are `banner.*`, and the `Callout` alias is removed. A new
  `Deferred` holds a fallback back until a pending state has lasted `delay`, then keeps it for at least
  `minDuration`, so a momentary empty state is never rendered as the answer.

- 1d6f730: Replace `@fluentui/react-tabster` with `useFocusGroup` in `@dxos/react-ui`, which provides arrow-key navigation and `Tab` boundaries for composite widgets in a fraction of the size — 68 KB left the eager boot graph. `Focus.Group`, `Main`'s landmarks, `Carousel`, `Tabs`, `Masonry` and the `react-ui-list` components keep their keyboard behaviour; consumers calling tabster's hooks directly should move to `useFocusGroup` and `findFirstFocusable`.
- fc83abd: ScrollArea now overlays the scrollbar thumb on the content instead of reserving layout width for a
  native scrollbar. Native scrolling is retained, so scroll chaining and nested scrollers are
  unchanged. Pass `native` to restore the classic native scrollbar, which consumes layout width.

  The `padding` option reserves the strip the overlay thumb occupies, so content clears it.

- a805212: Split the sizing utilities and remove `dx-container`.

  `dx-expander` is renamed `dx-expand` and decomposes into `dx-fill` (`h-full w-full`) and `dx-grow` (`flex-1 min-h-0 min-w-0`), so a class names how the parent sizes the element rather than bundling five properties. `dx-container` is removed: its `overflow-hidden` duplicated the `min-*-0` it already carried — any non-visible overflow zeroes a flex/grid item's automatic minimum size — and clipped everything as a side effect. Call sites that genuinely clip now say `overflow-hidden` explicitly. `dx-fullscreen` loses its `overflow-hidden` for the same reason.

  `withColumn.propagate()` selected on `.dx-container` to keep a ScrollArea's scrollbar in the gutter; that marker is now an explicit `dx-scroll-boundary` on `ScrollArea.Root`.

  Adds a `prefer-sizing-utilities` lint rule for the hand-rolled equivalents.

- f9816c0: Toasts that close on a timer now draw a bar that empties as their time runs out, and hold it while
  the pointer is over them. `Progress` gains the `countdown` and `paused` props behind it.

### Patch Changes

- d4b4919: `dx-anchor` preview cards now open on hover by default (`trigger='click'` opts out) with a
  shadcn-style fade+zoom animation; hosts close on `state: false`. Editor block widgets survive
  replacement (root-keyed unmount) and suspending portals; `#`/`@` link chips resolve the linked
  object's label.
- 8904184: Restore `role="toolbar"` on `Toolbar.Root`, which was erased when no role was passed, forward an explicit `role=''` instead of falling back to the default, and lay out simple-layout navigation tiles as a single row instead of stacking the icon, label, and caret.
- Updated dependencies [8cb5553]
- Updated dependencies [d4b4919]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [32584c9]
- Updated dependencies [e8088ea]
- Updated dependencies [928e0b2]
- Updated dependencies [77d0026]
  - @dxos/react-focus@0.12.0
  - @dxos/lit-ui@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/util@0.12.0
  - @dxos/react-hooks@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/react-input@0.12.0
  - @dxos/react-error-boundary@0.12.0
  - @dxos/i18n@0.12.0
  - @dxos/invariant@0.12.0

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
