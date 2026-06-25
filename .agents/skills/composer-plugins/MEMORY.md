# Composer Plugins — Session Memory

Session-logged rules for agents. Append a dated section per session (newest first): `## YYYY-MM-DD — <plugin(s)>` + terse bullets. One rule per bullet; name the file/symbol/idiom. Promote durable rules into `SKILL.md`.

---

## 2026-06-25 — plugin-markdown / react-ui-editor / plugin-search / plugin-spacetime (preview embeds, slash links, search dialog, section surfaces)

- Markdown transclusion block (`![label](echo://…)`) mounts via `MarkdownEditor.Blocks` → `PreviewBlock` (`plugin-markdown/.../MarkdownEditor.tsx`) which portals a `<Surface type={AppSurface.Section}>`. It MUST pass `attendableId` in the surface `data` — `AppSurface.Section` is in `ATTENDABLE_ROLES`, so `AppSurface.object(Section, T)` guards reject data lacking a string `attendableId` and the type-specific section surface (e.g. sketch) loses to plugin-preview's generic `section` card (`Position.last`, only needs `Obj.isObject`). Thread `attendableId ?? id` from `MarkdownEditorContext`.
- A story rendering embeds needs `<MarkdownEditor.Blocks />` inside `Editor.Root` (the Default story omitted it) AND `withPluginManager({ setupEvents: [AppActivationEvents.SetupSettings] })` so SketchPlugin's `SketchCapabilities.Settings` atom is contributed (its section surface reads it via `useAtomCapability`); without SetupSettings the surface throws `No capability found …sketch.capability.settings`. `SetupReactSurface` fires by default.
- plugin-markdown:build typechecks `*.stories.tsx` (no tsconfig exclude). Adding `@dxos/plugin-sketch` (workspace:\*) needs a tsconfig project reference — the postinstall sync that adds it is SKIPPED under `CI=true`; run `HUSKY=0 pnpm vite-node tools/toolbox/src/main.ts` (no CI=true) to regenerate references.
- Slash-menu "Inline link"/"Block embed" (`react-ui-editor/.../menu-presets.ts` `linkSlashCommands`) open the picker by re-triggering `@`-mode: insert `@`/`@@` + `popoverRangeEffect.of({trigger:'@', range})`. This MUST be deferred via `requestAnimationFrame` inside the item's `onSelect` — `useEditorMenu.handleSelect` deletes the `/` range synchronously, which closes the popover; opening in the same tick makes `EditorMenuProvider`'s `onActivate` read a stale `open===true` and skip reopening. Popover `trigger` is the single `@`; a second `@` lives in the query range → `useLinkQuery` block mode (`![label](…)`).
- Hosting `SearchList` (`react-ui-search`) inside `Dialog.Content` requires wrapping in `Dialog.Body` (the `withColumn.propagate()` column propagator). `SearchList.Root`/`Picker.Root` render NO DOM, so `SearchList.Input`/`Viewport` are direct children of `Dialog.Content`'s `Column.Root` grid; once a `Dialog.Header` claims the center column the input auto-places into a gutter (misplaced searchbox). Fixed `plugin-search/.../SearchDialog.tsx`.
- `Panel.Toolbar asChild` (and any `slottable` with `asChild`) ONLY works if the single child was created with `composable()`/`slottable()` (carries the `dxos.composable` symbol). A plain arrow component (e.g. `MarkdownEditor.Toolbar` = `MarkdownEditorToolbar`) makes `slottable` (`react-ui/.../util/slots.ts`) wrap the result in a `<div class="dx-slot-warning">`, which becomes the grid child WITHOUT `[grid-area:toolbar]` → `Panel.Root`'s `grid-template-rows: auto 1fr auto` collapses the toolbar row to 0px and the toolbar overlaps the content. Mirror `MarkdownArticle`: non-`asChild` `Panel.Toolbar`/`Panel.Content` (`<Panel.Toolbar classNames='bg-toolbar-surface'><MarkdownEditor.Toolbar/></Panel.Toolbar>`, `Blocks` inside `Panel.Content`). Inspect via `getComputedStyle(panelRoot).gridTemplateRows` (broken = `0px …`) and `document.querySelector('.dx-slot-warning')`.
- Markdown transclusion blocks should be INDEPENDENTLY attendable: wrap each `PreviewBlock`'s `<Surface type=Section>` in its own `<AttendableContainer id={link.dxn}>` and pass `attendableId: link.dxn` in the surface data (NOT the editor's id). `getAttendables` (`react-ui-attention/.../AttentionProvider.tsx`) walks ALL ancestor `[data-attendable-id]` nodes, so nesting is hierarchical: focus inside the embed ⇒ both doc and embed attended; focus in text ⇒ only doc. This makes a sketch's `useAttention(attendableId).hasAttention` per-embed, so it enters edit mode only when itself focused. (Supersedes the earlier "use editor's attendableId" — per-embed is required for per-surface focus.)
- `SketchComponent` (`plugin-sketch/.../Sketch/Sketch.tsx`) ties `hideUi` to BOTH grid and readonly: `isGridMode: settings?.showGrid !== false && !hideUi`, `isReadonly: readonly || hideUi`. So `hideUi=true` IS the clean read-only preview (no controls, no grid, not editable) — no separate readonly wiring needed. For Section embeds use `hideUi={section ? !hasAttention : !hasAttention && !isTauri()}` so read-only-on-blur holds on every platform (the isTauri always-on-UI allowance is for the full article/slide roles only).
- Frame a Section-embed surface with `border border-separator rounded-md overflow-hidden` on its container (e.g. SketchArticle's `Container` Flex). `--color-separator` is a real token; the border is subtle on neutral story backgrounds but reads on the app's lighter document surface.
- tldraw paint timing: a Playwright screenshot taken immediately after `browser_navigate` can show a BLANK canvas (shape is in the DOM at a visible rect, just not painted yet). Re-screenshot after the page settles before concluding "content missing". Also, clicking `.cm-content` to "blur" an embed often lands ON the embed (it fills the content area) — click the heading/paragraph text above it instead.
- Adding a Section surface mirrors plugin-sketch: `AppSurface.oneOf(AppSurface.object(Article, T), AppSurface.object(Section, T))` in `react-surface.tsx` + branch the container on `role === AppSurface.Section.role` (constrained `Flex aspect-square` for the embed vs full `Panel` for the article). Done for plugin-spacetime `SpacetimeArticle`.

## 2026-06-21 — Routine.objects context (moved off Automation)

- Context objects live on `Routine.Routine.objects` (`@dxos/compute`, `Schema.Array(Ref.Ref(Obj.Unknown))`, optional — sibling of `blueprints`), NOT on `Automation`. The agent prompt handler (`assistant-toolkit/.../agent/prompt.ts`) binds them: `session.context.bind({ blueprints, objects })`, resolving `prompt.objects` with the same `Effect.filter`/`catchTag('EntityNotFoundError')` drop as blueprints. So EVERY run path that executes a routine through `AgentPrompt` honors context — triggered automations, the assistant, and direct `Operation.invoke(AgentPrompt, { prompt: routine })` (e.g. plugin-magazine curation). Reason objects belong on Routine: a routine can run without an Automation; putting context on Automation stranded those paths.
- `run-automation.ts` forwards NO objects — the parented routine self-describes (`AgentPrompt` binds `routine.objects`). The `objects` param on `RunPromptInNewChat` remains for ad-hoc chat additions only.
- A `Schema.Array(Ref.Ref(Obj.Unknown))` field needs NO custom `fieldMap`: the default `RefField` resolves `Obj.Unknown` to `ANY_OBJECT_TYPENAME` and renders an any-space-object picker per slot (`react-ui-form/.../RefField.tsx` `defaultUseResults` → `Filter.everything()`). Render via a `Form.Root` sub-form with `db` set + `Form.FieldSet` (mirrors `RoutineEditor`).
- Customize the any-object picker via a `getOptions` passed to `Form.Root`: sort by label, set `description` to `Entity.getTypename(obj)` (the secondary line), fall back to the type placeholder then URI for unlabelled objects (mirror `defaultGetOptions`'s `getTypePlaceholder`). Filter system objects with `HiddenAnnotation.get(Type.getSchema(Obj.getType(obj)))` (`@dxos/echo/Annotation`) — SpaceProperties etc. carry it; pattern from plugin-space `useRelatedObjects`.
- `ObjectsEditor` edits the owned/draft `routine.objects` (takes the routine, not the automation), rendered inside `ActionEditor`'s routine branch after `RoutineEditor` (no section label). `AutomationCompanion.handleCreate` seeds the anchor on `Routine.make({ blueprints, objects: [Ref.make(object)] })`, not on the Automation.

## 2026-06-21 — plugin-automation (AutomationCompanion rewrite: relation-anchored master-detail)

- Per-object companions associate via an ECHO **Relation**, not a data field: define `Automation.AppliesTo` (`Type.makeRelation({ dxn, source: Automation, target: Obj.Unknown })`, mirror `Chat.CompanionTo`), register it in `addSchemaModule`, create with `Relation.make(AppliesTo, { [Relation.Source]: a, [Relation.Target]: o })` + `db.add`, list with `useQuery(db, Query.select(Filter.id(object.id)).targetOf(AppliesTo))` then `Relation.getSource(r)`. Delete = remove the relation AND the source object.
- A type's required blueprints come from `AppAnnotation.BlueprintsAnnotation.get(Type.getSchema(Obj.getType(object)))` (Option<string[]>); attach as registry refs `Ref.fromURI(Blueprint.registryURI(key))` (NOT space objects). Same source the Chat companion uses (`plugin-assistant/.../ChatCompanion.tsx`).
- **A pure in-memory draft for an Automation form is INFEASIBLE**: the routine's `instructions` (`Ref<Text>` + Markdown) renders via `RefMarkdownEditor`→`createDocAccessor`, which throws `object is not an EchoObjectSchema` for an unattached object. Workable "draft" = `db.add` the automation+routine on create (form works), defer the **AppliesTo relation** to Save (relation-driven list hides un-saved drafts), Cancel `db.remove`s the draft (owned routine cascade-deletes). Storybook only verifies the FIXED module after a full reload — stale HMR shows `ReferenceError`/old errors that aren't real.
- `OrderedList` (`@dxos/react-ui-list`) is the master-detail primitive: `Root`/`Content`/`Item`(+`hover`,`selected`,`onClick`,`canDrag=false`)/`DeleteButton`(`autoHide`); `DetailItem` is the inline-expand row variant. For a separate detail pane below the list, compose `Item` + your own detail slot (prototyped as `components/MasterDetail`).
- `AutomationOperation.RunPromptInNewChat` accepts `objects: Schema.optional(Schema.Array(Obj.Unknown))` (actual objects, not refs — handler does `Ref.make(obj)`) and binds them to the new chat via `AiContext.Binder`. As of the Routine.objects move (see top section) `run-automation.ts` no longer forwards context — the routine carries its own `objects` and `AgentPrompt` binds them; the param is for ad-hoc additions only.

## 2026-06-19 — plugin-automation / plugin-assistant (move Routine/Blueprint/Template UI down)

- Moving UI DOWN the dep graph: plugin-assistant already deps plugin-automation, so Routine/Blueprint/Template containers+components moved INTO automation; assistant re-imports nothing (surfaces moved too). Check the existing edge direction first (`node -e` on package.json) before deciding which way code can move.
- An operation's DEFINITION and its HANDLER can live in different plugins. `RunPromptInNewChat` def moved to `automation/types` (AutomationOperation), handler stays in plugin-assistant importing it via `@dxos/plugin-automation/types`. This is the only non-cyclic way for a lower plugin's UI (RoutineList) to dispatch a higher plugin's chat op. The op KEY namespace changes (`automation.operation.*`) — acceptable in a restructure.
- **plugin-automation `tsconfig.json` does NOT exclude `*.stories.tsx`** (unlike plugin-assistant which does) → `plugin-automation:build` TYPECHECKS stories. Moved stories must only import packages automation deps; had to add `@dxos/assistant` devDep (story used `createSystemPrompt`) and strip `AssistantPlugin`/`TracePanel` (assistant-only, can't move down) from RoutineArticle/RoutineList stories.
- When moving a publicly-imported component, add the matching subpath EXPORT to the destination (`./components`, `./types`) AND repoint every external consumer in the same change (plugin-script, plugin-feed, stories-assistant imported `TemplateEditor` from `@dxos/plugin-assistant/components`; plugin-trip imported `AssistantOperation` from `@dxos/plugin-assistant` root). Add the new `@dxos/plugin-automation` dep to consumers that lacked it (plugin-feed, plugin-trip).
- `createSystemPrompt` lives only in `@dxos/assistant`, not re-exported by `@dxos/assistant-toolkit`.
- moon `compile` entryPoints for `src/components/index.ts` / `src/containers/index.ts` / `src/types/index.ts` were already present in automation's moon.yml — only package.json `exports` needed the new `./components` + `./types` subpaths.

## 2026-06-18 — plugin-assistant (chat failure / error-toast story)

- To DEMO an error toast, prefer a PRESENTATIONAL story: render `Toast.Provider`/`Toast.Viewport`/`Toast.Root` directly and feed `Toast.Description` from the real `parseError(rawError)`, title via `useTranslation(meta.id)('ai-service-error.label')`. Deterministic + screenshotable + zero console noise.
- AVOID the full-harness route for an error-toast demo (ChatArticle-style `withPluginManager` + `useChatProcessor`, then seed `registry.set(processor.error, Option.some(parseError(...)))` via `useContext(RegistryContext)`): it renders, but the toast is transient (20s auto-dismiss), StrictMode resets `toastError` state, it is portal-positioned at the clipped viewport bottom → flaky to view, plus REMOTE-edge 401/favicon console errors.
- `Toast.Root` needs `Toast.Provider` + `Toast.Viewport` wrappers in a story (testing decorators don't supply them). Mirror `ui/react-ui/.../Toast.stories.tsx`.
- Toast `duration` must be a 32-bit-safe ms int to stay open for review; `Number.MAX_SAFE_INTEGER`/`Infinity` overflow `setTimeout` → the toast auto-dismisses IMMEDIATELY. Use e.g. `24 * 60 * 60 * 1000`.
- plugin-assistant `tsconfig.json` EXCLUDES `*.stories.tsx` → `compile` does NOT typecheck stories. Stories are exercised by `test-storybook` (vitest browser, smoke-mounts each story); scope it: `moon run plugin-assistant:test-storybook -- Chat.stories`.

## 2026-06-16 — plugin-presenter (presenter mode UX)

- Toggle/exit deck-layout flows must run sequentially in ONE operation handler (`yield*` Adjust then Open). Firing `Adjust` + `Open` as two concurrent `invokePromise` calls (the old `useExitPresenter`) races: `Open` reads stale deck state and clobbers `Adjust`'s `fullscreen:false` back to true → stuck fullscreen. Route exit through the op (`TogglePresentation` with `state:false`).
- NEVER put side effects (`setTimeout`, sibling `setState`) inside a `setState(updater)` callback in plugin components. React dev StrictMode double-invokes updaters, so a fade-then-exit scheduled inside the updater fires twice → double exit/toggle. Guard one-shot transitions with a `useRef` boolean and keep side effects outside the updater (see `PresentationShell.handleExit`).
- An operation that reads deck state (`Capabilities.getAtomValue(DeckCapabilities.State)`) or invokes deck ops must declare `services: [Capability.Service]` in `Operation.make` (handler context is `OperationService` only otherwise). Mirror `DeckOperation.Adjust`.
- To make a keyboard shortcut work inside the markdown editor, contribute a `MarkdownCapabilities.ExtensionProvider` returning `Prec.highest(keymap.of([{ key:'Shift-Mod-p', preventDefault:true, stopPropagation:true, run }]))` (register via `Plugin.addModule({ activatesOn: MarkdownEvents.SetupExtensions })`). The global navtree `Keyboard` context (attention id) does not match the editor, so action `keyBinding` alone never fires while editing.
- A fullscreen presenter must own ESC itself: a document **capture-phase** listener that `stopImmediatePropagation()` + exits, so the deck's `DeckSoloMode` bubble ESC handler never runs (that handler only drops fullscreen → caused the "second ESC" bug). Don't also wire `onExit` into a child (RevealPlayer/Pager) — single owner only.

## 2026-06-15 — plugin-calls (component/container stories, CallManager harness)

### Story harness for capability-backed components (CallsCapabilities.Manager)

- Components reading `useCapability(CallsCapabilities.Manager)` (Call, Toolbar, Lobby, Participant, CallArticle, CallSidebar) need a real `CallManager`. Build a `src/testing/` decorator `withCallManager()` = `withPluginManager({ setupEvents: [AppActivationEvents.SetupSettings], plugins: [...corePlugins(), ClientPlugin({ config, onClientInitialized: initializeIdentity }), CallsPlugin()] })`. `CallManager` reads `runtime.services.edge.url` on construct (throws without it) — supply a dummy edge Config; it is never dialed, only the WS `open()` 401s harmlessly.
- Seed deterministic state without a swarm: add a testing-only `_setState(state: GlobalState)` seam on `CallManager` (sets `_stateAtom` via the registry — the participant list/tracks normally come from network peers). Stories call `useSeedCallManager(state)` (a `useLayoutEffect` that `_setState`s) to render participants/mute/raised-hand from a mock `GlobalState`.
- `corePlugins()` (plugin-testing) already provides `ThemePlugin`; CallsPlugin registers its own translations — Manager stories need neither `withTheme()` nor explicit `translations`.

### Gotchas

- Plugin entrypoints (`CallsPlugin` from `@dxos/plugin-calls/plugin`, MeetingPlugin, etc.) are `PluginFactory` — CALL them in the `plugins` array (`CallsPlugin()`); a bare reference widens the array to `Plugin | PluginFactory` and every element fails assignment to `Plugin[]`.
- Mock protobuf `UserState`: do NOT spread `Partial<UserState>` into a `: UserState` literal — the optional spread yields a union that won't assign to `MessageInit<UserState>` (and spreading over required `id`/`name` makes them `string | undefined`). Take an explicit `{ raisedHand?; tracks? }` options object and build one concrete literal.
- Storybook required-prop friction: when a `render`/`DefaultStory` injects data internally, type it with an all-optional `StoryProps` (then `satisfies Meta<typeof DefaultStory>` + bare `export const X: Story = {}` works). For args-driven generic components, annotate `const meta: Meta<Props>` / `StoryObj<Props>` explicitly — avoids the `component: X as any` cast the old stories used.
- ALWAYS run `moon`/storybook/tsc from the assigned WORKTREE, never `cd` to the main checkout. Each worktree builds its own dep `dist`; running from main verifies main's files (without your changes) and the storybook globs main's packages — your new stories won't appear. Start storybook on a non-9009 port.

## 2026-06-11 — TS2883 codemod (fake imports → annotations), RefEditor

### TS2883 (d.ts can't name @dxos/compute types): annotate the export, no fake imports

- PREFERRED fix (supersedes the fake-import trick below): drop `Capability.makeModule(...)` and annotate the export — `const activate: () => Effect.Effect<Capability.Capability<typeof AppCapabilities.X>, never, Capability.Service> = Effect.fnUntraced(...); export default activate;` with the comment `// NOTE: Explicit annotation required: d.ts emit cannot portably name the inferred @dxos/compute types (TS2883).` Annotations are copied verbatim into the d.ts; inferred types are expanded (which is what drags in unnameable compute types). Explicit type args on `makeModule<...>()` do NOT help.
- Barrels: annotate the lazy export `Capability.LazyCapability<void, Capability.Capability<typeof AppCapabilities.BlueprintDefinition>[]>` (array when the module contributes several). `makeModule` is an inference-only identity helper — safe to drop when annotating.
- Name the module activation fn `activate` (it is consumed as `Plugin.addModule({ activate })`), or `blueprintDefinition` for blueprint modules.
- Fake imports remain ONLY where annotation is impractical: huge inferred schema types (`types/*.ts` with echo `View`/`QueryAST`), deep Effect pipelines (plugin-inbox Google `Credential` files, functions-runtime), and ambient-augmentation imports (plugin-support Tooltip react-floater/type-fest — different mechanism).
- For hard cases, transcribe the exact type from the previously emitted `dist/types/**/*.d.ts` instead of guessing.

### RefEditor (react-ui-form) is the generic reference token input

- `RefEditor` (`react-ui-form/components/RefEditor/`) generalizes the former ActorList: pluggable `type` (ECHO type for `@<id>` refs), `match` RegExp for raw tokens (e.g. `EMAIL_REGEX`), `getLabel`/`getValues`, `mode: 'ref' | 'email'` (email mode = RFC 5322 mailbox list, commas hidden inside atomic tags). EventEditor/stories configure it for `Person`.
- Storybook: never pass a proxied ECHO schema (e.g. `Person.Person`) via story `args` — Storybook's arg traversal mutates it and crashes ("Cannot modify object property 'id' outside of Obj.update()"). Supply it in `render`.

## 2026-06-11 — plugin-inbox (calendar fixes), react-ui-components (ActorList)

### UI-invoked space ops MUST pass `spaceId` in InvokeOptions

- Any op whose `services` include space-affinity tags (`Database.Service`, `Feed.FeedService`, `Credential.CredentialsService`) fails with `ServiceNotAvailable` when invoked from a container without `{ spaceId: Obj.getDatabase(subject)?.spaceId }` — the spawn environment has no `space`, so the space slice never initializes. There is NO inference from ECHO objects in the input. Reference: `plugin-video` `SummarySection.tsx`.

### Editor menu (`Editor.Root`) props must be referentially stable

- `placeholder` (and `getMenu`) feed `useEditorMenu`'s extension `useMemo`; an inline object literal recreates the extension each render → `useTextEditor` destroys/recreates the editor per keystroke. Symptom: typed text vanishes, only a stray char survives. Memoize the `placeholder` object.
- `trigger='@'` menus own their own filtering (`useEditorMenu` skips label filtering for '@'): filter inside `getMenu` using `text.slice(1)` (text includes the trigger char). Empty groups auto-hide the popover.

### ActorList (react-ui-components) is the person/email token input

- `ActorList` (`components/ActorList/`) mirrors `QueryEditor`: `Editor.Root` + trigger '@' typeahead against `Person` name/emails; content is whitespace-separated tokens `@<personId>` or emails; `actor-extension.ts` renders resolved refs/emails as Domino tag widgets (raw while cursor inside token); `actorListRedecorate` StateEffect re-resolves decorations when people load. EventEditor commits completed tokens into `event.attendees` (Actor with `contact: Ref.make(person)`) and clears the input via the controller.

### Reactivity in shared row components

- Shared presentational row fragments that read an ECHO object (e.g. `EventDetails`) must subscribe via `useObject(event)` and read from the snapshot — Mosaic tiles don't re-render on proxy mutation otherwise (stale title until click).

### Zombie storybook ports from deleted worktrees

- A storybook from a since-deleted worktree can still hold a port (responds 200 with `{"entries":{}}` and 500 ENOENT on iframe). `lsof -nP -iTCP:<port>` to identify; pick another port rather than killing other sessions' processes.

## 2026-06-10 — plugin-comments (Thread→Comment rename), plugin-bookmarks/plugin-video (comment-config)

### plugin-comments namespaces are Comment\*, not Thread\*

- plugin-comments exports `CommentCapabilities`/`CommentOperation` (`src/types/CommentCapabilities.ts`, `CommentOperation.ts`), `CommentBlueprint`, and the `CommentState` type — never reintroduce `ThreadCapabilities`/`ThreadOperation` there. plugin-thread keeps its OWN channel-scoped `ThreadCapabilities` (`ChannelBackend`) / `ThreadOperation` (`CreateChannel`) — distinct namespaces, do not merge.
- The `Thread.Thread` ECHO schema (`@dxos/types`) is unchanged — comment threads are still Thread objects; only plugin-comments' namespace/wording changed.

### CommentConfig contributions hit TS2883 — annotate the barrel export

- (Superseded by the 2026-06-11 annotation rule above — module files now use the explicit `const activate` annotation instead of fake imports.) `Capability.lazy('CommentConfig', () => import('./comment-config'))` fails `tsc` (TS2883, `Operation.Definition.Any` in the config type) in plugins that don't already deep-import compute types. The barrel still needs `Capability.LazyCapability<void, Capability.Capability<typeof AppCapabilities.CommentConfig>>` (see plugin-bookmarks/plugin-video `capabilities/index.ts`).
- `comments: 'unanchored'` works for any typename with zero extra plumbing; `'anchored'` needs selection publishing keyed by `Obj.getURI(subject)` + the comment-sync editor extension, which is `Markdown.Document`-only today (see SKILL.md worked example).

## 2026-06-10 — plugin-crx (CrxSettings, page actions)

### Prefer `IconButton` over `Button` + `Icon`

- For an icon-plus-label button use `IconButton` (`@dxos/react-ui`) with `icon`/`label` props, not `<Button><Icon …/>{label}</Button>` with manual `mie-2` spacing (user corrected `CrxSettings.tsx`; same applies to the composer-crx popup `PageActions.tsx`).

### TS2883 cross-package `Capability.lazy` fix that preserves code-splitting

- When a `Capability.lazy(...)` module contributes a type declared in ANOTHER package (TS2883 "inferred type cannot be named / not portable"), annotate the barrel export as `Capability.LazyCapability<void, Capability.Capability<typeof OtherPlugin.TheCapability>>` — the `LazyCapability<Props, Value>` annotation on the barrel export is what fixes portability while keeping the module boundary intact (no eager import). This is the precedent in plugin-osrm, plugin-trip, and plugin-bookmarks (`PageActionProvider`). Prefer this over the eager re-export fallback already documented below.

### Page-action icons must be literals in `capabilities/page-action*.ts`

- The composer-crx popup renders descriptor icons from its own sprite; the extension build eager-scans `packages/plugins/*/src/capabilities/page-action*.ts` (IconsPlugin `scanPaths` in `composer-crx/vite.config.ts`) because plugin sources are outside its module graph. Write the `ph--…` icon name as a string literal in that file (no indirection through meta/constants from other files) or the icon renders blank in the popup.

### No `createdAt`/`updatedAt` data fields on schemas — ECHO meta provides them

- Do not add a `createdAt` (or `updatedAt`) field to an ECHO type's data schema; the object's built-in meta carries creation/update timestamps (user corrected `Bookmark.ts` — field removed from schema, `fromSnapshot`, PLUGIN.mdl). Only model a timestamp as data when it differs semantically from object creation (e.g. an external event time).

### Stories that exercise an extension/relay round-trip install a fake relay

- A component calling `pingExtension` (or any page↔extension CustomEvent contract) always fails in storybook ("Extension not detected") — add a story `Decorator` that sets the readiness dataset marker and acks the request events (see `CrxSettings.stories.tsx` `withFakeExtension`), plus an explicit `NotDetected` story. Export the event-name constants from the util module so test + story don't re-declare them.

## 2026-06-08 — plugin-video (new plugin: Video type, EDGE transcribe op, embed player)

### `Format.URL` rejects query strings — don't use it for URL fields

- `Format.URL` (`@dxos/echo/internal`) applies a regex (`Format/string.ts`) that rejects `?query=` — so `Obj.make` throws on any real video/watch URL (`...?v=...`). Symptom: a storybook "Fatal Error / ParseError … Predicate refinement failure" at object creation. Use `Schema.String.pipe(Schema.annotations({...}), FormatAnnotation.set(TypeFormat.URL), Schema.optional)` to keep the URL form-input hint without the broken pattern. (Both exported from `@dxos/echo/internal`.) Matches the existing `// TODO: Format.URL breaks validation` notes in `@dxos/types` Organization/Person.

### New-plugin skeleton checklist (things `moon run :build`/`:test` need beyond src)

- `tsconfig.json` (extends `../../../tsconfig.base.json`, `references` per dep) — without it `:build` fails "No tsconfig.json found". References are auto-extended into `composer-app/tsconfig.json` + `release-please-config.json` by the postinstall sync.
- `src/vite-env.d.ts` declaring `*.mdl?raw` (copy from plugin-chess) — needed for `import pluginSpec from '../PLUGIN.mdl?raw'`.
- `vitest.config.ts` (`createConfig({ node: true, storybook: true })`) + a `.storybook/` dir (`main.mts`, `preview.mts`, and symlinks `manager-head.html`/`preview-head.html` → `tools/storybook/.storybook/*`) — without these `:test` fails "No projects matched filter 'node'" then storybook `MainFileMissingError`.
- Register in `composer-app/src/plugin-defs.tsx`: import from `@dxos/plugin-foo/plugin`, add `FooPlugin()` to the instance list and `FooPlugin.meta.id` to a `getDefaults` list (Labs for experimental); add `@dxos/plugin-foo: workspace:*` to composer-app `package.json`.

### Operations import from `@dxos/compute`, not `@dxos/operation`

- In plugins, `Operation`/`OperationHandlerSet` come from `@dxos/compute` (the operations SKILL says `@dxos/operation` — wrong for plugin code). Handler reads input directly via `Effect.fn(function* ({ video, lang }) {...})`; resolve refs with `Database.load(ref)`, create with `Database.add(obj)`, mutate with `Obj.update`. Op needs `services: [Database.Service]`; the invoker scopes the space from the input ref (pass `Ref.make(liveObj)`), same as `plugin-assistant/operations/update-chat-name.ts`.
- A client-side EDGE call with no auth is just `Effect.tryPromise(() => fetch(url))` in the handler — no EdgeHttpClient needed for a public worker on a distinct host.

### create→navigate crash `Open` / `Database.Service space=<missing>` is a STALE-BRANCH symptom, not a plugin bug

- Symptom: creating ANY object (reproduced with Sketch too) throws `ServiceNotAvailable: @dxos/echo/Database/Service (affinity=process) space=<missing>` from `LayoutOperation.Open` (deck `operations/open.ts`), crashing the create dialog + app boot (deck url-handler reopens the active subject). Root cause: an older `Open` declared `services: [Capability.Service, Database.Service]`; the create dialog/url-handler invoke it without `spaceId`, so the spawned process can't materialise the space-affinity `Database.Service`. Fixed on main by #11725 (dropped `Database.Service` from `Open`). **If a new-plugin branch hits this, it's behind main — merge `origin/main`.** Confirm with `git show origin/main:packages/sdk/app-toolkit/src/operations.ts | sed -n '/const Open/,/services/p'`.

### Reuse `Text.Text` from `@dxos/schema` for text-body refs

- A "transcript/notes text object" ref is `Ref.Ref(Text.Text)` (`@dxos/schema`), created with `Text.make({ name, content })`. Schema registration is deduped by URI across plugins (`plugin-client/capabilities/schema-defs.ts`), so registering `Text.Text` in your `addSchemaModule` alongside markdown is safe (idempotent).

### `Schema.optional` must be LAST in a `.pipe()` after `FormatAnnotation.set`

- Order is `Schema.String.pipe(Schema.annotations({...}), FormatAnnotation.set(TypeFormat.X), Schema.optional)`. Putting `Schema.optional(Schema.String)` first then piping `FormatAnnotation.set` fails build with TS2684 `'this' context of type 'optional<...>' is not assignable` — `FormatAnnotation.set` needs the bare (non-optional) schema. There is no `TypeFormat.Multiline`; use `TypeFormat.Text` for multiline plain text.

### CRX render-proxy is re-declared per-consumer, not shared

- To load a full cross-origin page (incl. anti-bot/consent-gated like a YouTube watch page) use the Composer extension render-proxy: dispatch `composer:proxy:render` window event, await `:render:ack`, probe availability via `document.documentElement.dataset.composerProxy === '1'`. Fall back to `proxyFetchLegacy(url)` from `@dxos/edge-client` (EDGE CORS proxy) when the extension is absent. Contract source of truth is `composer-crx/src/proxy/types.ts`; plugins MUST NOT depend on the extension app package, so each consumer re-declares the wire shapes locally (precedent: `plugin-commerce/src/util/renderViaCrx.ts`; copied into `plugin-video/src/util/fetch-page.ts`). YouTube's full description is in `ytInitialPlayerResponse.videoDetails.shortDescription` in the raw server HTML (no JS exec needed) — `og:description` is the truncated fallback. NOTE: YouTube `timedtext` caption URLs from the watch page are `pot`-token gated (return empty); fetch caption tracks via the InnerTube `player` endpoint (ANDROID client) through the CORS proxy with an `x-cors-proxy-origin: https://www.youtube.com` override (the browser's localhost `Origin` triggers a 403) — see `plugin-video/src/util/fetch-page.ts` `fetchYouTubePlayer`.

## 2026-06-05 — plugin-comments (factored from plugin-thread), react-ui-thread

### No plugin → plugin deps when factoring a feature out

- When splitting a feature into a new plugin, the new plugin MUST NOT import the donor plugin. Push shared UI down into a `react-ui-*` package and shared schema into `@dxos/types`; both plugins depend only on those. plugin-comments was carved out of plugin-thread with zero dep on it.
- Cross-plugin runtime sharing (operations, state atoms) does NOT cross the plugin boundary — each plugin owns its own ops/state. The comment ops + `State`/`ViewState` + agent stack moved wholesale into plugin-comments; chat ops stayed in plugin-thread.

### Story sample data: real schema + @dxos/schema/testing generator

- Stories use the real `@dxos/types` schema (`Message.Message`) generated via `@dxos/schema/testing` (`createGenerator(random as ValueGenerator, Message.Message).createObjects(n)`), NOT bespoke `*Entity` testing types. The generator leaves union-array fields (e.g. `blocks`) empty — enrich after generation with `Obj.update(m, …)` to set a `{ _tag: 'text', text }` block. `Obj.update` returns void; return the object from `.map`.

### react-ui-thread is a pure presentational layer

- `Message.*` / `Thread.*` are radix-composite namespaces; `Thread.Messages` renders message tiles via `react-ui-mosaic` `Mosaic.VirtualStack` (`draggable={false}`, inside `Mosaic.Container` + `ScrollArea`). `Thread.Root` provides a `ThreadContextValue` (getMetadata / components.Object / callbacks) via `@radix-ui/react-context`; tiles read it (a Mosaic `Tile` only receives `{id,data,location}`, so per-tile config must come from context).
- Object/`reference` message blocks need `Surface` (app-framework) which CANNOT live in a `react-ui-*` package — inject it via `Thread.Root` `components={{ Object }}`; each plugin supplies a one-line Surface tile.
- A message tile must be self-contained (`grid grid-cols-[var(--dx-rail-size)_1fr]`), NOT `grid-cols-subgrid col-span-2` — subgrid breaks inside a virtual stack where each tile is in its own positioned wrapper.

## 2026-06-03 — plugin-feed (Magazine routine + inline form), react-ui-form, compute

### Inline a referenced object in a Form

- `FormInlineAnnotation` (`@dxos/echo` `Annotation.FormInlineAnnotation`, id from `@dxos/echo/internal`): set `.set(true)` on a single `Ref` property to render the referenced object's own fields inline (nested form) instead of the `RefField` picker. `FormField` checks it via `findAnnotation(refProps.ast, FormInlineAnnotationId)` and dispatches to `InlineRefField` (`react-ui-form/.../fields/InlineRefField.tsx`). Array refs are unaffected.
- `InlineRefField` resolves the target via `AtomRef.make(reference)` in an inner component (hook can't be conditional), then renders `<Form.Root schema={Type.getSchema(targetType)} defaultValues={{...target}} db onValuesChanged={writeBack}>`; write-back mirrors `ObjectProperties` (per changed path: `Obj.setValue(target, splitJsonPath(path), Obj.getValue(values, parts))` inside `Obj.update`), minus the meta-tags row. Empty ref → create button (via `onCreate`).

### RefField ref-matching across URI schemes (bug)

- `Ref.make(obj)` yields a LOCAL EID `echo:/<id>`; `Entity.getURI(obj)` yields the qualified EID `echo://<spaceId>/<id>`; encoded snapshots use DXN `dxn:echo:<space|@>:<id>`. To match a form-value Ref against picker options, extract the bare entity id with `uri.split(/[:/]/).filter(Boolean).pop()` — splitting on `:` alone leaves `/`-delimited EIDs intact, so a just-created object's slot renders empty even though the array IS updated. Fixed in `RefField.handleGetValue`.

### Routine.instructions is `Ref<Text>` (like Agent), not `Template`

- `Routine.instructions` is now `Ref.Ref(Text.Text)` with `Format.Markdown` (mirrors `Agent.instructions`); `Routine.make({ instructions: string })` wraps via `Ref.make(Text.make({ content }))`. Agent-execution consumers load it directly (`Database.load(prompt.instructions)` then `Template.process(text.content, input)` — Handlebars preserved). `Blueprint.instructions` stays a `Template`.
- `TemplateEditor` (`plugin-assistant/components`) now takes `source: Ref<Text>` (it only ever used `template.source`). Routine callers pass `routine.instructions`; Blueprint callers pass `blueprint.instructions.source`. `TemplateForm` still owns the `Template` (manages `inputs`) and passes `template.source` down.

### Owned child objects

- Seed an owned child via `Obj.setParent(child, parent)` (cascade-deletes with parent), then `Operation.invoke(SpaceOperation.AddObject, { object: child, hidden: true, target, targetNodeId })`, then set the parent's ref field in `Obj.update`. See `plugin-feed/capabilities/create-object.ts` (Magazine → Routine).

## 2026-06-02 — plugin-inbox (Header + view-mode factoring)

### Shared header chrome via borderless Card

- Build object-article header chrome as a borderless Card: `Card.Root border={false} fullWidth` + `Card.Body`, with `mx('p-1 border-b border-subdued-separator', classNames)` on the root for the bottom rule. Rows are `Card.Row` (icon col 1 · content centre track). This replaces hand-rolled `grid grid-cols-[2rem_1fr]` headers and aligns Message/Event headers to one `Header.*` namespace (`components/Header/Header.tsx`: `Root`/`Title`/`Date`/`Row`).
- `Card.Row` `icon` prop takes `string | JSX.Element` — pass interactive elements (e.g. `UserIconButton`, `AnchorIconButton`) straight into the icon column; a bare string renders a `CardIcon size={4} text-subdued`. Add `items-center` via `classNames` for single-line rows.
- Preserve `data-testid`s when refactoring DOM: Card.Root/Card.Row forward `data-testid` (and `classNames`) through `composableProps`, so move `message-header`/`extracted-tags`/`extracted-tag-*` onto the new `Header.*` nodes — the stories-inbox `MessageArticle` play test queries them.

### Reuse one presentational rows component across tile/card/header

- When a tile (`EventStack` Mosaic tile), preview card (`EventCard` container) and article header all render the same object as `Card.Row`s, extract ONE presentational component that returns a fragment of rows (`components/Event/EventDetails.tsx`) and let each caller supply its own Card chrome (`Card.Root`, `Card.Body`, or `Header.Root`). Parameterize the divergences: `title: 'heading'|'text'|false`, `description?`, `maxAttendees?`, `interactiveAttendees?` (+ `db`/`onContactCreate`).
- Make attendee interactivity EXPLICIT (`interactiveAttendees` flag), not inferred from `db`/`onContactCreate` presence — the article header must render interactive `UserIconButton` rows even in a storybook with no db; a list tile stays static text (avoids a `useActorContact` hook per row in a 100-item VirtualStack).

### Shared toolbar group across plugins

- Factor a reusable toolbar dropdown as a function returning `ActionGroupBuilderFn` and compose via `MenuBuilder.make()….subgraph(viewModeGroup({...}))` (matches the documented `.subgraph(cond && (b=>…))` partial-application pattern). See `components/ViewMode/viewMode.ts` (`viewModeGroup`, `ViewMode`, `VIEW_MODE_ICONS`) shared by Message + Event toolbars; pass `modes` to vary options (Event omits `enriched`).
- A `Foo.Root` that needs a toolbar-driven mode holds `useState` for it in the Root context (`viewMode`/`setViewMode`), the toolbar group reads/sets it, and the body component branches on it (`Event.Body` markdown vs plain).

## 2026-06-01 — plugin-integration (SyncTargetsChecklist story)

### Storybook for a container that calls capability hooks

- A container calling `useOperationInvoker` (any capability hook) needs `withPluginManager({ plugins: corePlugins() })` — `corePlugins()` from `@dxos/plugin-testing` includes `ProcessManagerPlugin`, which contributes the `operation-invoker` capability. Bare `withPluginManager()` (no plugins) throws `InvariantViolation: No capability found for …operation-invoker`.
- Keep `withTheme()` even when `corePlugins()` already pulls in `ThemePlugin` — `withTheme()` is what reads `parameters.translations` and injects them via `resourceExtensions`. Drop it and plugin-namespace keys render raw (`sync-targets-dialog.title`) while os keys (Cancel/Save) still resolve. Decorator order: `[withTheme(), withLayout(...), withPluginManager({ plugins: corePlugins() })]`.
- A component that renders `Dialog.Content` is mounted in a story by wrapping it in `<Dialog.Root open><Dialog.Overlay>…</Dialog.Overlay></Dialog.Root>`.
- Build the ECHO subject inside the render fn via `useMemo`, not module-level args (see [[feedback_echo_ownership_stories]]). `Integration.make({ accessToken: Ref.make(AccessToken.make({ source, token })), targets })` works standalone (no space) for rendering; `Ref.make` on the live object only matters on submit.

## 2026-05-31 — plugin-map, plugin-trip, react-ui-geo, schema (marker providers)

### Cross-plugin capability extension

- To let one plugin plot another's objects, define a capability that is `{ match(subject): boolean; useMarkers/use…(subject, opts) }` — `match` is a sync, hook-free type predicate; the reactive part is a hook. Contribute many; consumers pick the first whose `match` passes.
- Calling a capability-contributed HOOK conditionally breaks rules-of-hooks. Resolve the provider in the parent (`useCapabilities(...).find(match)`), then render an inner component keyed by `provider.id` that calls `provider.useX(...)` UNCONDITIONALLY. Switching providers remounts via the key.
- Keep plugin-context hooks (`useCapabilities`/`useOperationInvoker`/`useAtomCapability`) in the SURFACE component; resolve provider/url/callbacks there and pass them as props to the container. The container then needs only a `ClientProvider` in storybook (pass the provider as a prop), not a full `withPluginManager`.

### `Capability.lazy` cross-package

- `Capability.lazy('X', () => import('./x'))` whose module contributes a type declared in ANOTHER package fails `tsc` with TS2883 ("inferred type cannot be named… not portable"). Fix: eager re-export `export { default as X } from './x';` (like `BlueprintDefinition`) instead of lazy. The `<T>` param of `lazy` is the module PROPS, not the contributed value — don't annotate with the value type.

### Companion surfaces

- A companion surface created with a raw type-guard `filter` MUST also set `role: 'article'` (the `AppSurface.object(...)` helper supplies role bindings; a bare predicate does not → build error "Property 'role' is missing").
- Gate "offer companion only when X" in the app-graph-builder CONNECTOR (capability-aware: `yield* Capability.getAll(Cap)` inside `Effect.gen`), not the surface filter (filters are sync and can't read capabilities). Companion node `data: 'sentinel'`; surface filter matches `data.subject === 'sentinel' && Obj.isObject(data.companionTo)`; render with subject = `companionTo`.

### Attention selection

- `LayoutOperation.Select` `subject` is a discriminated union: single → `{ mode: 'single', id }`, multi → `{ mode: 'multi', ids: [...] }`. Branch on mode; a generic `{ mode, id }` won't typecheck. `useSelected(id,'single')` returns `string|undefined`; `'multi'` returns `string[]`.

### Toolchain

- Use `~/.proto/shims/moon` (proto resolves the repo-pinned moon 2.2.6); a stale `~/.proto/tools/moon/1.41.2` may sit earlier on PATH and rejects `.moon/workspace.yml` (`unknown field 'remote'`). Adding a workspace dep needs `HUSKY=0 CI=true pnpm install --no-frozen-lockfile`.

## 2026-05-31 — plugin-settings, plugin-trip, plugin-duffel, plugin-crx, plugin-meeting, app-toolkit

### Settings

- Plain schema-driven settings need NO per-plugin surface. The generic surface in `plugin-settings/src/capabilities/react-surface.tsx` renders `SettingsForm.FieldSet` (`@dxos/react-ui-form`) from any `AppCapabilities.Settings` subject (`{ prefix, schema, atom }`). Only add a plugin-specific settings surface for custom field rendering (e.g. assistant `fieldMap`).
- `AppSurface.settings(token, prefix?)` — `prefix` optional; omit = match any settings subject.
- Override mechanism: settings article dispatches `limit={1}`, sorted by `byPosition` (`'first' < undefined < 'last'`). Register generic fallback `position: 'last'`; plugin-specific (default position) wins.
- Generic surface renders no `Settings.Section` title (plank heading already shows `meta.name`).
- Keep the settings store (`addSettingsModule` → `contributes(AppCapabilities.Settings, …)`); only the form surface is redundant. Watch the name collision: `*Settings` capability (`./settings`, store) ≠ `*Settings` component (form).

### Module / barrel removal

- If a `ReactSurface` module held only the settings form, remove the whole module (the `capabilities/index.ts` export + the `addSurfaceModule` call), not just the body.
- Dropping a `containers`/`components` barrel ⇒ also drop the `#containers`/`#components` `imports` entry in `package.json` AND the `--entryPoint=…` in `moon.yml`. A dangling entrypoint breaks the build.

### Translations

- `plugin.name` is a convention (~64 plugins) — keep it. `settings.title` was per-component — delete when its component is removed and unreferenced.

### Layout / scrolling

- `<div overflow-y-auto>` inside `Panel.Content` does NOT scroll. `Panel.Content` = `[grid-area:content] min-h-0` (bounded block). Root must fill it: `flex flex-col dx-container`.
- `dx-container` = `flex-1 min-h-0 min-w-0 h-full w-full overflow-hidden`; no flex-direction, so keep `flex flex-col`.
- `ScrollArea.Root` theme already includes `dx-container` — do NOT add `min-h-0 grow`/`h-full`.
- Pattern: pinned region (`shrink-0`, `border-b border-separator`) + scrolling region (stack or `ScrollArea`).
- No `role='none'` on plain layout divs.
- No arbitrary spacing (`p-3`, `gap-2`). Use design-token utilities (`p-form-gap`, `gap-form-gap`, `pb-form-gap` — backed by `--spacing-form-gap`) or embed in `Form.Viewport`/`Form.Content` and let the form supply spacing.

### Forms

- Drive forms from an Effect Schema, not hand-rolled `Input`/`Select`: `<Form.Root schema values onValuesChanged><Form.Content><Form.FieldSet/></Form.Content></Form.Root>`. Reuse the operation-input schema (e.g. `BookingSearch.FlightSearchFields`).
- Labels come from schema `title`. `Format.DateTime` → datetime picker, stored ISO 8601.
- For multi-field forms, lay out with `Form.Layout template={…}` (grid DSL: `<grid cols="2"><field name="x" span="2"/></grid>`) instead of `Form.FieldSet` — same approach as `SegmentCard`'s `FLIGHT_LAYOUT`. Template controls which fields render (unreferenced fields are hidden). Define the template as a module-level `trim\`…\`` const (`@dxos/util`).
- Form structure (Radix `ScrollArea`-nominal: Viewport=viewing window outside, Content=viewed body inside). Uniform: `Form.Root > Form.Viewport > Form.Content`.
  - **`Form.Viewport`** owns the gutter `Column` (default `gutter='xs'` = chrome side-padding). Content-height by default; **`scroll`** prop makes it fill its parent + scroll (the gutter then hosts the scrollbar). The scroll/grow lives here, not on Content; there is no `grow` prop.
  - **`Form.Content`** is the pure viewed body (centered, `gap-form-gap`, `role=form`). No Column.
  - Content-height: `<Form.Root><Form.Viewport><Form.Content>…</Form.Content></Form.Viewport></Form.Root>`. Fill+scroll: add `scroll` to `Form.Viewport`.
  - Gotcha: `Card.Root` is itself a `.dx-column-root` and `Card.Body` is `display:contents`, so `Form.Viewport`'s Column must carry `[.dx-column-root_&]:col-span-full` to span the card instead of landing in the narrow icon track. (Built into `Form.Viewport`.)
  - `Settings.*` (from `@dxos/react-ui-form`) is a separate namespace from `Form.*` — settings panels use `Settings.Viewport`/`FieldSet`, unaffected.
- Submit via `Form.Submit` (full-width primary, calls the form's `onSave`), not a standalone `Button`. Wire `onSave` on `Form.Root`; pass `Form.Submit` `label`/`icon`/`disabled` as needed (`disabled` defaults to `!canSave`).
- Form-level error/validation text → `<Form.Error>{msg}</Form.Error>` (`react-ui-form`; wraps `Input.Root validationValence='error'` + `Input.Validation`), not a bare `text-error` div.

### Lists

- Reuse the mosaic stack, not `<button>` rows. Mirror `plugin-trip` `SegmentStack`/`SegmentTile`: `Focus.Group asChild` → `Mosaic.Container asChild withFocus currentId` → `ScrollArea.Root` → `ScrollArea.Viewport` → `Mosaic.Stack` (`Tile`, `items`, `getId`, `draggable={false}`). Stack bundles its own `ScrollArea.Root`.
- Tile = `forwardRef` + `Mosaic.Tile asChild` + `Focus.Item asChild current onCurrentChange` → `Card.Root`. Activate via `useMosaicContainer().setCurrentId` + `onCurrentChange`.
- `Card.Header` = 3-slot subgrid (icon · content `1fr` · trailing action). A wide value as the 3rd child clips in the narrow action slot — put title + value in one flex row as the single slot-2 child.

### Naming

- Alias an imported types namespace descriptively, not with a terse abbreviation: `import { type BookingSearch as BookingSearchType }`, not `as BS`.

### Booking / provider boundary (plugin-trip)

- The `BookingSearch` query/offer types are the normalized boundary — they use the canonical `Segment` vocabulary (`serviceClass` not `cabinClass`, `operator` not `carrier`, `number` not `flightNumber`, `departAt`/`arriveAt`/`origin`/`destination`). Provider implementations (e.g. plugin-duffel) map their API fields (`cabin_class`, `owner`, `marketing_carrier`, …) **to/from** these standard types in their `*-mapping.ts`; never leak provider-specific names past the `BookingService` boundary.

### Reactivity (Ref arrays)

- A `Schema.Array(Ref.Ref(...))` field renders **empty on first mount** and goes **stale after add/remove** if you read `ref.target` synchronously and memoize over it. Use `useObjects(obj.refs)` (`@dxos/echo-react`, re-exported from `@dxos/react-client/echo`) to reactively load + subscribe to each target (fixes empty-on-load and re-renders on target edits), and `useObject(obj, 'arrayProp')` to subscribe to the array property for add/remove. Key derived lists on `[refs?.length, loaded]` — not on `.target` reads or proxy-array identity (those don't change on splice).
- Display order and keyboard-nav order must come from **one canonical sort** (e.g. `Trip.getSegments`); don't re-sort inside the list component, or focus (`useArticleKeyboardNavigation`) and rendering diverge. Keep tie-breaks (e.g. undated-last) identical across both.

### Data types

- Model operation/persistence enums & structs as Effect Schema (`Schema.Literal`/`Schema.Struct`) with `type X = Schema.Schema.Type<typeof X>`, not bare TS. Bare TS is fine only for external wire shapes at an adapter boundary.
- In `Obj.update`, mutate a sub-struct via `Object.assign(target, { … })`, not field-by-field (whole-object assignment fights readonly schema-Type vs mutable instance-Type).
