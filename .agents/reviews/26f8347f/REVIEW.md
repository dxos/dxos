---
branch: claude/gracious-planck-8v2m0z
commit: 26f8347f93083445e8cb515ebc67743766b95e97
base: 9d0132fed7315abd146b26ceb5eb3b3906b8fcbc
mode: default
createdAt: 2026-09-28T02:10:36.689Z
isFinalized: true
groups: 60
rules: [barrel-imports-not-internal-paths, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, diff-scoped-to-pr-purpose, extract-non-rendering-logic-from-component, keep-parallel-apis-structurally-aligned, layout-only-wrapper-invisible-to-a11y, name-for-general-behavior, no-casts, no-styling-wrapper-divs, no-trivial-wrappers-over-official-apis, reuse-existing-mechanism, subscribe-where-you-read]
reviewId: 26f8347f
---

_30 error(s), 28 warning(s)._

# WARN 26f8347f-1 subscribe-where-you-read `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:378:3`

`FilePreview` reads `file.data.target` directly in render with no subscription — the same `ref.target`-in-render defect the `subscribe-where-you-read` rule calls out: it renders whatever the ref resolves to at mount and never re-renders if the target loads later or changes. Fix: subscribe with `useObject(file.data)` (or `useResolveRef` if only a handler needs the live value) instead of reading `.target` inline.

# WARN 26f8347f-2 subscribe-where-you-read `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:400:9`

`PullRequestPreview` renders `pullRequest.state`, `pullRequest.headBranch` and `pullRequest.baseBranch` (line 400) and `pullRequest.additions`/`pullRequest.deletions` (line 405) as bare property reads on an ECHO object with no backing subscription, so the preview would not update if the underlying `pullRequest` object changed after it was resolved. Per `subscribe-where-you-read`, a component rendering ECHO object fields must subscribe (e.g. `useObject(pullRequest)`, or per-field `useObject(pullRequest, 'state')`) rather than destructure/read the fields straight from the object passed in as a prop.

# WARN 26f8347f-3 extract-non-rendering-logic-from-component `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:436:3`

`ArtifactPreviewHost` manages a window event-listener's open-on-mount/close-on-unmount lifecycle with an inline `useEffect` (`window.addEventListener(DX_ANCHOR_ACTIVATE, handleActivate, true)` / the matching `removeEventListener` cleanup) directly in the component body, per `extract-non-rendering-logic-from-component`. Extract a small named hook (e.g. a generic `useEventListener(target, type, handler, options)` or a purpose-built `useAnchorActivate(artifacts, onMatch)`) so the subscription lifecycle isn't hidden inside a component whose job is to render.

# WARN 26f8347f-4 subscribe-where-you-read `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:454:31`

`ArtifactPreviewHost` renders `Obj.getLabel(artifact)` directly where `artifact` is an ECHO object held in local state, with no subscription — a stable singleton reference whose label is read once in render and won't update on a later edit. Wrap the read with `useObject(artifact)` (or `useObject(artifact, 'title')`/whichever field backs the label) so the popover picks up label changes instead of freezing the value from when it was set into state.

# WARN 26f8347f-5 extract-non-rendering-logic-from-component `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:504:20`

`ArtifactsStory` builds its `artifacts` list with an inline `useMemo` that flattens each task's `artifacts` refs and dedupes them through a `Set` directly in the component body, per `extract-non-rendering-logic-from-component`. This is a derived query with real reuse potential, not a one-off; pull it into a named helper (e.g. `collectTaskArtifacts(tasks)`) or a `useTaskArtifacts(tasks)` hook instead of inlining the filter logic in the component.

# WARN 26f8347f-6 consistent-field-and-list-ordering `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:654:7`

In `DefaultStory`'s `<TaskList.Root>` element, the data prop `checked={checked}` (line 654) is sandwiched between callback props (`getTaskActions`/`onTaskCreate`/`onTaskUpdate` above, `onTaskCheck`/`onTaskMove`/`onTaskSelect` below), interleaving a data member into a run of callback members — the exact anti-pattern `consistent-field-and-list-ordering` flags. `TaskList.tsx`'s own `TaskListRoot` destructures the same props with all data fields (`tasks`, `groupByStatus`, `debug`, `showGroupLabels`, `showOrdinals`, `showDescription`, `showEstimates`, `hierarchical`, `selected`, `checked`) grouped before the callbacks (`getTaskActions`, `onTaskCreate`, `onTaskUpdate`, `onTaskSelect`, `onTaskCheck`, `onTaskMove`); move `checked={checked}` up beside `selected={selected}` in the story's JSX to match that canonical sibling ordering.

# WARN 26f8347f-7 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:663:9`

`<div className='p-2'>` wraps `TaskList.Editor` (and the attached-files paragraph) for no reason but padding — exactly the "exists only to carry padding or spacing" case `no-styling-wrapper-divs` calls out. Use `Container` (or `Flex` with `classNames`) so the padding projects via `asChild` instead of adding a bare box.

# WARN 26f8347f-8 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:697:5`

`<div className='grid grid-cols-[1fr_24rem] dx-fill divide-x divide-separator dx-base-surface'>` is a hand-rolled grid used to lay out the list/detail split. Replace it with `Grid` (`cols={['1fr', '24rem']}`), keeping the remaining classes on `classNames`, per `no-styling-wrapper-divs`.

# WARN 26f8347f-9 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:698:7`

`<div className='flex flex-col min-w-0 min-h-0' data-testid='story.list'>` is a hand-rolled flex column; use `Flex` with `column` (and `asChild` to keep the `data-testid` on the same node) instead of the raw div, per `no-styling-wrapper-divs`.

# WARN 26f8347f-10 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:712:7`

`<div className='flex flex-col overflow-y-auto' data-testid='story.detail'>` is another hand-rolled flex column (paired with the one at line 698); use `Flex column` in place of the raw div, per `no-styling-wrapper-divs`.

# ERROR 26f8347f-11 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:727`

`titleCell` uses two non-null assertions (`...title"]')!.parentElement!`) to unwrap a `querySelector` result and its `parentElement`. Per the `no-casts` rule, fix the type at its source: throw a descriptive error (as `TestArtifactsHiddenInRow`'s `row!` pattern already avoids two lines below) instead of asserting non-null.

# WARN 26f8347f-12 no-trivial-wrappers-over-official-apis `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:852`

`seedDescription` (`const seedDescription = (description: string) => () => [Task.make({ title: 'Plan the cupping', status: 'todo', description })];`) is a module-local helper whose body is a single `Task.make` call with everything but `description` hardcoded, and it adds no branching, error handling, or derived values — it just renames `Task.make` for its two call sites (`TestDescriptionClamp`, `TestDescriptionClampList`). Per `no-trivial-wrappers-over-official-apis`, inline the `Task.make({ title: 'Plan the cupping', status: 'todo', description: … })` call directly in each story's `seed`, so the object being constructed is visible where it is used instead of behind a one-off factory.

# ERROR 26f8347f-13 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1044`

`return row!;` inside the `waitFor` callback asserts non-null after only calling `expect(row).toBeTruthy()`, which does not narrow the type for TypeScript. Replace with a guard (`if (!row) throw new Error(...); return row;`) as done a few lines above at 1041-1046's sibling pattern elsewhere in the file.

# ERROR 26f8347f-14 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1048`

`const title = row.querySelector<HTMLElement>('span.truncate')!;` uses a non-null assertion instead of a checked lookup. Fix at the source with a guard clause that throws if the element is missing.

# ERROR 26f8347f-15 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1094`

`const box = chips!.getBoundingClientRect();` asserts `chips` non-null after only an `expect(chips).toBeTruthy()` call, which doesn't narrow the type. Replace with an explicit guard/throw before use, per the `no-casts` rule.

# ERROR 26f8347f-16 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1107`

`const assignee = row.querySelector<HTMLElement>('[data-testid="taskList.item.assignee"]')!;` uses a non-null assertion. Replace with a checked lookup that throws a descriptive error when the element is absent, instead of asserting.

# ERROR 26f8347f-17 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1118`

`.querySelector<HTMLElement>('[data-testid="taskList.item.priority"]')!` (in the `priority` rect computation) asserts non-null. Fix at the source with a guard rather than `!`.

# ERROR 26f8347f-18 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1399`

`const pane = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.edit"]')!;` uses a non-null assertion; the same story already has a working guarded pattern elsewhere in the file (e.g. `TestEdit`'s `if (!pane) throw new Error(...)`). Use that instead of `!`.

# ERROR 26f8347f-19 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1400`

`const title = () => pane.querySelector<HTMLInputElement>('[data-testid="taskList.edit.title"]')!;` asserts non-null on every call. Replace with a guarded accessor that throws when the input is missing.

# ERROR 26f8347f-20 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1428`

Same pattern as line 1399 (`const pane = ...taskList.edit"]')!;`) in `TestCreateWithAttachments`: non-null assertion instead of a guard clause. Fix at the source.

# ERROR 26f8347f-21 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1429`

Same pattern as line 1400 (`title` accessor) in `TestCreateWithAttachments`: non-null assertion on `querySelector`. Replace with a throwing guard.

# ERROR 26f8347f-22 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1445`

`await userEvent.click(chips()[1].querySelector<HTMLElement>('button')!);` asserts the queried button non-null inline. Extract and guard it (throw if missing) instead of using `!`.

# ERROR 26f8347f-23 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1485`

Same pattern as line 1399 in `TestCreateWithDescription`: `pane` is unwrapped with `!` instead of a guard clause.

# ERROR 26f8347f-24 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1486`

Same pattern as line 1400 in `TestCreateWithDescription`: `title` accessor uses a non-null assertion instead of a guard.

# ERROR 26f8347f-25 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1493`

`const content = () => description()!.querySelector<HTMLElement>('.cm-content')!;` stacks two non-null assertions on one line. Replace both with guarded lookups that throw a descriptive error when the elements are absent.

# ERROR 26f8347f-26 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1509`

`await expect(created!.textContent).toContain('Roast it twice');` asserts `created` non-null after only `expect(created).not.toBeUndefined()`, which does not narrow the type. Use a guard/throw (as `TestSaveDescriptionWithModEnter`'s `found()` helper does) instead of `!`.

# ERROR 26f8347f-27 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1529`

Same pattern as line 1399 in `TestAbandonedDescriptionDoesNotLeak`: `pane` unwrapped with a non-null assertion instead of a guard.

# ERROR 26f8347f-28 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1530`

Same pattern as line 1400 in `TestAbandonedDescriptionDoesNotLeak`: `title` accessor uses `!` instead of a guard clause.

# ERROR 26f8347f-29 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1532`

`const content = () => description()!.querySelector<HTMLElement>('.cm-content')!;` again stacks two non-null assertions (duplicate of line 1493's pattern). Replace both with guarded lookups.

# ERROR 26f8347f-30 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1561`

`await expect(created!.textContent).not.toContain('LEAKED');` asserts `created` non-null the same way as line 1509. Use a guard/throw instead of `!`.

# ERROR 26f8347f-31 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1643`

Same pattern as line 1399 in `TestEditWithoutDescription`: `pane` unwrapped with `!` instead of a guard clause.

# ERROR 26f8347f-32 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1644`

Same pattern as line 1400 in `TestEditWithoutDescription`: `title` accessor uses a non-null assertion.

# ERROR 26f8347f-33 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1649`

`const firstTitle = first.querySelector('[data-testid="taskList.item.title"]')!.textContent;` asserts the queried element non-null. Replace with a guard that throws when the title element is missing.

# ERROR 26f8347f-34 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1840`

`const toggle = (row: HTMLElement) => row.querySelector<HTMLElement>('[data-testid="treeItem.toggle"]')!;` uses a non-null assertion in `TestTabIndent`. Replace with a guarded accessor.

# ERROR 26f8347f-35 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1918`

`const release = rows().find(({ title }) => title === 'Ship the spring release')!;` asserts the `find` result non-null. Replace with a guard/throw when the row is not found, matching the `row()` helper defined earlier in the same story.

# ERROR 26f8347f-36 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1931`

`press(rows().find(({ title }) => title === 'Ship the spring release')!.row, 'ArrowUp');` repeats the same non-null assertion as line 1918 inline. Extract and guard the lookup instead.

# ERROR 26f8347f-37 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1970`

`const described = rows().find(({ row }) => row.querySelector('.line-clamp-3'))!;` asserts the `find` result non-null. Replace with a guard that throws when no described row is found.

# ERROR 26f8347f-38 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1971`

`const description = described.row.querySelector<HTMLElement>('.line-clamp-3')!;` asserts non-null again immediately after line 1970's assertion. Replace with a guarded lookup.

# ERROR 26f8347f-39 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:2043`

`const trigger = () => first.querySelector<HTMLElement>('[data-testid="taskList.item.status"]')!;` uses a non-null assertion in `TestStatusPickerBuildsOnFirstClick`. Replace with a throwing guard.

# ERROR 26f8347f-40 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:2054`

`const next = options().find((option) => option.getAttribute('aria-checked') !== 'true')!;` asserts the `find` result non-null. Replace with a guard/throw when no unchecked option is found.

# ERROR 26f8347f-41 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:2068`

`await userEvent.click(first.querySelector<HTMLElement>('[data-testid="taskList.item.priority"]')!);` asserts the queried element non-null inline. Replace with a guarded lookup that throws when the priority control is missing.

# WARN 26f8347f-42 keep-parallel-apis-structurally-aligned `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx:44:3`

`TaskStatusControl` (`TaskStatusControlProps`, lines 35-45) is one of three sibling row-cell
controls in this file that render an editable glyph for a task field and fall back to a static
one when the list is readonly — the other two being `TaskEstimateControl` and `TaskPriorityIcon`.
The latter two both take only `{ task: Task.Task }` and pull `onTaskUpdate` themselves via
`useTaskListContext(...)`, but `TaskStatusControl` instead requires every caller to fetch
`onTaskUpdate` from that same context and thread it in explicitly as a prop (see
`TaskTreeNode.tsx:417` and `TaskListEditor.tsx:373-377`, both of which read it off
`useTaskListContext`/a passed-down prop only to hand it back to `TaskStatusControl`). Per
`keep-parallel-apis-structurally-aligned`, these three analogous "editable field cell" components
should share the same parameter shape; nothing in the file documents why the status control alone
needs `onTaskUpdate` as an explicit parameter. Fix: have `TaskStatusControl` read `onTaskUpdate`
(and `active`, which likewise could derive from `Task.isAgentWorking(task)` without a caller
override) from `useTaskListContext`, matching `TaskEstimateControl`/`TaskPriorityIcon`, and drop
the now-redundant prop threading at both call sites.

# WARN 26f8347f-43 consistent-field-and-list-ordering `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx:140:1`

`TaskOrdinalProps` (`task`, `ordinal`, `classNames?`) puts `classNames` last, while every sibling props type in this same file puts it first — `TaskStatusControlProps` (`classNames?`, `active?`, `task`, `onTaskUpdate?`) and `TaskCheckboxProps` (`classNames?`, `task`, `checked`, `onCheckedChange`) — matching the `ThemedClassName<{...}>`-first convention used by the package's other components (`TaskHistoryProps`, `TaskDescriptionProps`, `TaskPropertiesProps`). Reorder `TaskOrdinalProps` to `classNames?, task, ordinal` (or otherwise front-load `classNames`) so it mirrors the established sibling convention instead of scattering it to the end.

# WARN 26f8347f-44 name-for-general-behavior `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx:253`

`TaskPriorityIcon` is named as a display glyph, but its own doc comment says "The glyph is also the control: it opens a menu to set the level" — it dispatches `onTaskUpdate` through an `ActionMenu`, exactly like its sibling `TaskStatusControl` (suffixed `Control` for the same dual glyph+menu role). The name suggests a passive icon while the actual behavior is an interactive control, which is the "name suggests a related but different behavior" case under `name-for-general-behavior`. Fix: rename to `TaskPriorityControl` (and its `displayName`) to match `TaskStatusControl`/`TaskEstimateControl`'s convention for the same pattern.

# WARN 26f8347f-45 barrel-imports-not-internal-paths `packages/ui/react-ui/src/hooks/useIconHref.ts:7:1`

`useIconHref` imports `useIconRegistry` from `../providers/ThemeProvider/icon-registry.ts`, reaching past two barrels — the deep file's own directory (`providers/ThemeProvider/index.ts`) and the package-level `providers/index.ts` — either of which already re-exports `useIconRegistry`. Per `barrel-imports-not-internal-paths`, this couples `hooks/` to `providers/ThemeProvider`'s internal file layout; fix by importing `useIconRegistry` from `../providers/index.ts` (or `../providers/ThemeProvider/index.ts`) instead.

# WARN 26f8347f-46 diff-scoped-to-pr-purpose `packages/ui/react-ui/src/hooks/useIconHref.ts:29:3`

This PR's stated purpose (commit title, changeset) is a plugin-github walkthrough heading-spacing/CRLF fix plus a named `TaskMnemonic`/task-ordinal breaking change in `@dxos/react-ui-task`; it says nothing about `@dxos/react-ui`'s `useIconHref`. The two added blank lines here are a pure whitespace reformat with no connection to that purpose and no drive-by justification in the PR description — per `diff-scoped-to-pr-purpose`, revert this hunk so the diff matches the stated change.

# WARN 26f8347f-47 consistent-file-naming-within-folder `packages/ui/react-ui/src/playground/experimental.stories.tsx:1:1`

This new story file is named in lowercase (`experimental.stories.tsx`) while every one of its siblings in the same `playground/` folder — `Elevation.stories.tsx`, `Playground.stories.tsx`, `Typography.stories.tsx` — uses PascalCase matching the topic/component it demonstrates, violating `consistent-file-naming-within-folder`. Rename it to match the folder's established convention, e.g. `Experimental.stories.tsx`.

# WARN 26f8347f-48 diff-scoped-to-pr-purpose `packages/ui/react-ui/src/playground/experimental.stories.tsx:1:1`

This entire new file (a `Toolbar`/size-metrics playground story, ~186 lines) has no connection to the PR's stated purpose — the plugin-github walkthrough heading-spacing/CRLF fix and the explicitly-called-out `TaskMnemonic`/ordinal breaking change — and is not mentioned anywhere in the commit message or changeset. Per `diff-scoped-to-pr-purpose`, this looks like an accidental hunk swept into the commit (e.g. from unrelated exploratory work) rather than a named drive-by; fix by dropping this file from the diff, or, if it is intentional, land it separately and/or call it out explicitly in the PR description.

# WARN 26f8347f-49 comment-hygiene `packages/ui/react-ui/src/playground/experimental.stories.tsx:11:1`

The `// Issues` block (lines 11–14) is exploratory musing rather than settled reasoning: it's an open checklist of unresolved concerns, and `- [ ] Focus ring (clipping?)` uses rhetorical-question language about a state the author isn't sure of — exactly what `comment-hygiene` flags. Fix: either resolve these before landing the story, or move them to a tracked follow-up (e.g. a TODO naming the concrete concern, or a tracked task) instead of leaving open questions in the file as a comment block.

# WARN 26f8347f-50 reuse-existing-mechanism `packages/ui/react-ui/src/playground/experimental.stories.tsx:67`

This new playground story hand-rolls its own `Toolbar` (line 67), `Block` (87), `Input` (100), `Button` (114) and `Typography` (128) components out of raw `div`/`input`/`button`/`span` elements with ad-hoc Tailwind classes, duplicating primitives (`Toolbar`, `Button`, and `Field`-based inputs) that already exist in `../components/index.ts` and are exercised as the real design-system components by the sibling story in the very same directory (`playground/Playground.stories.tsx` imports `Button`/`Toolbar` from `../components/index.ts`, and `playground/Elevation.stories.tsx` uses `Field`/`Fieldset`). Per `reuse-existing-mechanism`, delete these bespoke stand-ins and prototype the new size scale against the existing `Button`/`Toolbar`/`Field` components (e.g. by adding/extending a size or density variant on them), rather than building a second, parallel set of UI primitives.

# WARN 26f8347f-51 no-styling-wrapper-divs `packages/ui/react-ui/src/playground/experimental.stories.tsx:70:5`

`Toolbar`'s root is `<div className='shrink-0 w-full flex items-center overflow-x-auto scrollbar-none' style={...}>` — a hand-rolled flex box with no comment explaining why `Flex` (`align='center'`, `grow`, `classNames` for the rest) can't express it, so `no-styling-wrapper-divs` flags it.

# WARN 26f8347f-52 no-styling-wrapper-divs `packages/ui/react-ui/src/playground/experimental.stories.tsx:88:10`

`Block` renders `<div className='shrink-0 grid place-items-center w-(--block-size) h-(--block-size)'>` — a hand-rolled grid used purely to center an icon. Use `Grid` with `classNames` for the sizing variables instead, per `no-styling-wrapper-divs`.

# WARN 26f8347f-53 no-styling-wrapper-divs `packages/ui/react-ui/src/playground/experimental.stories.tsx:134:5`

`DefaultStory`'s outer `<div className='flex flex-col divide-y divide-separator'>` is a hand-rolled flex column; use `Flex column` (`classNames='divide-y divide-separator'`) per `no-styling-wrapper-divs`.

# WARN 26f8347f-54 no-styling-wrapper-divs `packages/ui/react-ui/src/playground/experimental.stories.tsx:135:7`

`<div className='grid grid-cols-[min-content_1fr] gap-1'>` (repeated at line 144) is a hand-rolled grid, and `gap-1` is a Tailwind number literal rather than a ramp step. Replace with `Grid cols={['min-content', '1fr']} gap='xs'` per `no-styling-wrapper-divs`.

# WARN 26f8347f-55 layout-only-wrapper-invisible-to-a11y `packages/ui/react-ui/src/playground/experimental.stories.tsx:136:11`

The bare `<div>` wrapping `<Block>` (and its twin at line 145) carries no className, no styling and no semantics of its own — it exists only to occupy the first `grid-cols-[min-content_1fr]` track, which `<Block>`'s own root `<div>` could fill directly. Per `layout-only-wrapper-invisible-to-a11y`, a wrapper added purely to group/position a child must render as a `Fragment` or carry `role='none'`; here it does neither, so a screen reader announces an extra, meaningless node. Fix: delete the wrapper and use `<Block>` as the grid item directly, or add `role='none'` if a node is still needed for layout.

# WARN 26f8347f-56 no-styling-wrapper-divs `packages/ui/react-ui/src/playground/experimental.stories.tsx:144:7`

Same pattern as line 135 — `<div className='grid grid-cols-[min-content_1fr] gap-1'>` should become `Grid cols={['min-content', '1fr']} gap='xs'`, per `no-styling-wrapper-divs`.

# WARN 26f8347f-57 layout-only-wrapper-invisible-to-a11y `packages/ui/react-ui/src/playground/experimental.stories.tsx:145:11`

Same pattern as line 136: a bare `<div>` with no className wraps a single `<Block>` purely to occupy a grid track. Fix: drop the wrapper (use `<Block>` directly as the grid item) or mark it `role='none'`.

# WARN 26f8347f-58 layout-only-wrapper-invisible-to-a11y `packages/ui/react-ui/src/playground/experimental.stories.tsx:157:9`

The bare `<div>` wrapping the `SIZES.map(...)` list of `<Toolbar>` rows has no className and exists only to group the mapped children into one child of the outer `flex flex-col divide-y` container. Per `layout-only-wrapper-invisible-to-a11y`, this shows up as a meaningless node in the accessibility tree with no `Fragment` alternative considered and no `role='none'`. Fix: replace it with `<>{SIZES.map(...)}</>` (a `Fragment`) so the toolbars become direct children with no extra a11y node — this also lets each row participate directly in the parent's `divide-y` — or add `role='none'` if a DOM node is required.
