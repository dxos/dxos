# Trace panel virtualization — design

Status: Draft for review
Date: 2026-09-18
Packages: `@dxos/react-ui-trace`, `@dxos/react-ui-editor`, `@dxos/react-ui-syntax-highlighter`
Hosts: plugin-assistant (trace companion), plugin-review (`ObjectHistory`), devtools (`ExecutionGraphPanel`), storybook-testing (`ExecutionGraphModule`)

## Summary

On a long-lived profile, Composer's tab freezes on load. One cause is the assistant's trace companion. It renders its whole history on every update, and it does this even while hidden. This design makes the trace's rendering cost depend on the viewport instead of the history. It is built only from existing framework components and adds no styling of its own.

## Problem

These figures come from a real profile with 4,105 trace messages. Only the numbers were kept; no profile data.

1. **Debug view.** `TracePanel` renders `<JsonHighlighter data={spanTree} />`. The span tree serializes to about 3.1 MB, or 84k lines. react-syntax-highlighter's `processLines` splices every line into one token array, which costs O(lines × tokens), and turns each token into an inline-styled element. Rendering takes about 46 ms for 10 KB, 450 ms for 100 KB and 30 s for 3 MB, all in one synchronous render. Past about 123k lines it throws a `RangeError`.
2. **Timeline.** `Timeline` mounts every commit, 1,510 on this profile. That is about 15k elements and 22k fibers. Each graph rebuild creates new commit objects, so every row re-renders. The layout is also quadratic: `spans` calls `find`/`findIndex` for each parent, and lane release scans every merge on every row.
3. **Mounted while hidden.** The companion is registered with `mount: 'always'` (#13124), and the complementary sidebar uses `Tabs keepMounted`. Everything above therefore runs while the panel is closed.
4. **Graph build.** `buildExecutionGraph` rebuilds from the whole history on every trace message, with no debounce.

## Goals

- Opening, hiding or showing the trace never blocks the main thread for more than 50 ms, however long the history is.
- Rendering cost depends on the viewport: the rows in view plus an overscan margin.
- Existing behaviour is preserved; see [Behaviour to keep](#behaviour-to-keep).
- **Compose from the framework; add no styles.** Every visual part of the trace is an existing component. The trace components provide data, behaviour and the row content they already have. They add no positioning, overlay or scroll styling.

## Non-goals

- Changing `mount: 'always'` or the companion's lifecycle.
- Graph-building cost beyond linear-time construction and a debounce. For example, `doctor()` is still O(C²); that is a follow-up.
- Virtualizing `ProcessTree`, which is already capped by `max-h-[8lh]`.
- Fixes to `@dxos/react-ui-virtual` beyond what the timeline needs; see [Follow-ups](#follow-ups).

## Design

### Component map

| Need                                     | Framework part                                                         | Package                                    |
| ---------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------ |
| Scroller with thin overlay scrollbars    | `ScrollContainer.Content` (a `ScrollArea.Root`)                        | `@dxos/react-ui`                           |
| Follow the tail; stop following on wheel | `ScrollContainer.Root pin`                                             | `@dxos/react-ui`                           |
| Scroll-to-bottom button                  | `ScrollContainer.ScrollDownButton`                                     | `@dxos/react-ui`                           |
| Top fade                                 | `ScrollContainer.Fade`                                                 | `@dxos/react-ui`                           |
| Windowed rows (sizer, translated window) | `useWindow` bound to the host's viewport, `useListModel` over the rows | `@dxos/react-ui-virtual`                   |
| Current row, hover                       | `aria-current` on the row with the `dx-current` / `dx-hover` classes   | `@dxos/ui-theme`                           |
| Read-only JSON with folding and search   | `Editor.View` with `json()`, `folding()` and search                    | `@dxos/react-ui-editor`, `@dxos/ui-editor` |
| Oversized payload in the details pane    | `SyntaxHighlighter`'s own pipeline, as plain text                      | `@dxos/react-ui-syntax-highlighter`        |

This is how `MessageList` in `@dxos/react-ui-feed` is built: the host owns a `ScrollArea` viewport, and `useWindow` binds to that element through a ref. The window renders a sizer that gives the scrollbar the whole history's extent and a translated container holding the rows in view. Nothing in it is about drag and drop, so no `Dnd.Root` is needed and no drag-and-drop package enters the trace's dependency closure.

### Timeline

`Timeline` stays a single component with the same props. It gains one prop, `scroller`: the host's viewport element, which every host already holds because it renders the `ScrollArea`. It no longer renders every commit:

- **Layout.** `layoutTimeline(commits, branches)` is a pure, linear-time function in `timeline-layout.ts`. It replaces `find`/`findIndex` with index maps and releases lanes by merge row. It returns the visible rows, and each row carries the lanes and spans of its layout pass. Commits on branches outside the whitelist get no row, so every row is exactly `lineHeight` tall.
- **Rows.** The rows are rendered by a `TimelineWindow` built on `useWindow`:
  - `useListModel(layout.rows, row => row.commit.id)` is the model; the window keys rows by commit id.
  - The extents are `{ of: () => lineHeight, exact: true }`. Every row is the same fixed height, so offsets are a prefix sum and the window never has to correct a measurement.
  - The rows in the mounted range are rendered from the layout, each with the existing row content (lane SVG, icon, message, timestamp). A row carries `data-index` and `data-object-id`, which is how the window finds it.
  - The window mounts once the host's `scroller` exists, because the placement binds to the element on mount.

  Positioned rows cannot share one grid, so each row gets the column template that the shared subgrid used to provide. The columns still line up: every row in a layout pass has the same lane width, and the icon and timestamp columns have fixed widths.

- **Current row and selection.** The row sets `aria-current="true"` when it is current and leaves the attribute off otherwise, styled by the shared `dx-current` class, which replaces the row's own `aria-current:bg-*` classes.
- **Keyboard.** The keymap does not change: ArrowUp/Down, Shift for the same branch, Meta for the ends, Enter to toggle selection. To reach rows that are not mounted, a change of the current row calls the window controller's `scrollToIndex`, aligned to `start` when the row is above the visible range and to `end` when it is below. A row already in view is left alone, matching the `scrollIntoView({ block: 'nearest' })` it replaces.
- **Empty state.** Unchanged (`no-commits.message`).

### Trace panel

`TracePanel` keeps its current composition: `ScrollContainer.Root pin` › `Content thin` › `Fade` › `Viewport` › `Timeline`, plus `ScrollDownButton`. The viewport element becomes the Timeline's `scroller`. Pinning needs no change: `ScrollContainer` observes the viewport's children, the timeline's sizer grows by one row height per commit, and it scrolls to the bottom. `useFollow` is not used, because the pin already exists in the host.

### Debug view

`<JsonHighlighter data={spanTree} />` becomes a read-only `Editor.View` with `json()` syntax, `folding()`, search, and no line wrapping. CodeMirror only puts the lines in view into the DOM, and it parses the rest incrementally in time-sliced chunks. The view's cost therefore stops growing with the tree.

When its `value` changes, `Editor.View` currently replaces the whole document. On every graph rebuild the reader would lose their folds and their place. The framework change is to sync `value` by dispatching only the changed line ranges. It uses a line diff from `@codemirror/merge`, which `@dxos/ui-editor` already depends on. The diff has a time budget and falls back to a whole-document replacement. Every controlled `Editor.View` benefits, and the resulting document is identical. The execution graph's 500 ms debounce limits how often the view updates.

### SyntaxHighlighter guard

Above `MAX_HIGHLIGHTED_LENGTH` (20,000 characters), `SyntaxHighlighter` passes `language: 'text'` to react-syntax-highlighter. That skips tokenization and keeps the component's own `pre`/`code` theme styles, with no new markup. The guard covers every `JsonHighlighter` and `SyntaxHighlighter` caller, including the trace's details pane.

### Execution graph

`buildExecutionGraph` builds in linear time. `useExecutionGraph` debounces its trace input by 500 ms, as `useSessionTimeline` already does.

## Behaviour to keep

- A non-debug trace opens at its tail and follows new commits while pinned. Moving the wheel away from the bottom unpins it. Scrolling back to the bottom, or clicking the button, pins it again. This is what `ScrollContainer` does today.
- Keyboard: ArrowUp/Down, Shift+Arrow for the same branch, and Meta+Arrow for the ends. With no current row, ArrowUp goes to the first row and ArrowDown to the last. Enter, or a second click on the row, toggles selection.
- A controlled `branch` jumps to that branch's first commit, unless the current commit is already on it. Other branches are dimmed.
- Rows with a link are underlined when `onSelect` is set.
- The details pane shows the selected commit.

## Alternatives considered

1. **`Mosaic.VirtualStack`.** The first revision used it, as `SearchStack` and `InboxStack` do. It works, but it brings `@dxos/react-ui-mosaic` and through it a drag-and-drop package into a component that never drags anything; every host then needs a `Dnd.Root`, and the package needed a separate `headless` entrypoint because the drag-and-drop dependency's CJS build requires a stylesheet that node cannot load. Replaced by `useWindow`, which has none of these costs.
2. **`@dxos/react-ui-virtual`'s `Window` component.** It renders its own native scroller, so it cannot sit inside the host's `ScrollArea`. `useWindow` is the same engine with the scroller handed in, which is what `MessageList` does and what the timeline does now.
3. **Calling `@tanstack/react-virtual` directly.** A second virtualizer in the repo, with its own measurement and anchoring rules, next to the one `react-ui-virtual` already provides.

## Dependencies

- `@dxos/react-ui-trace` gains a dependency on `@dxos/react-ui-virtual`, which depends only on `@dxos/react-ui`, `@dxos/ui-theme` and `effect`. It imports no stylesheet, so the root barrel stays importable from node tests.

## Testing

- `timeline-layout.test.ts` (node). Inline snapshots, recorded from the old algorithm, cover:
  - the default and merge cases, lane reuse and the whitelist;
  - parents that are missing from the list;
  - the sub-agent fixture.

  Before the old code was deleted, the port matched it on 3,000 random histories.

- `Timeline.stories.tsx` play functions, on a deterministic 5,000-commit history:
  - `Large`: the number of mounted rows is at most viewport ÷ `lineHeight` + 2 × overscan, every row is exactly `lineHeight` tall, and the midpoint row sits where the arithmetic puts it.
  - `Keyboard`: Meta, Arrow, Shift and Enter reach unmounted rows, and a second click clears the selection.
  - `BranchJump`: a controlled branch 4,000 rows down becomes current and is in view.
  - `Shrink`: when the history shrinks while the reader is deep in it, rows show without any scroll.
  - `Follow`: the timeline opens at the tail and follows new commits; away from the tail it stays put; the button returns to the tail.
  - `Empty`.
- `TracePanel.stories.tsx`:
  - `Large`: the fixture repeated to about 4.2k messages.
  - `LargeDebug`: for more than 50k lines of JSON, the CodeMirror view mounts fewer than 300 `.cm-line` elements.
- `Editor.View`: a test that a `value` update keeps folds and the scroll position outside the changed lines.
- Manual: the Composer preview on the affected profile. Open, hide and show the companion while an agent runs, and check that no task runs longer than 50 ms.

## Plan (this PR)

1. This design doc.
2. Execution graph: linear-time build and debounce.
3. Timeline on `useWindow`, and the host updates.
4. Debug view on `Editor.View`, and the `Editor.View` minimal-change sync.
5. The `SyntaxHighlighter` guard.
6. The recovery page's Repair line reworded to match its button, which was requested for this PR.

## Follow-ups

- `@dxos/react-ui-virtual` has three problems, fixed on a side branch:
  - `Placement.#range` is O(d²) on a far jump: about 28 ms at 4k rows and 0.7 s at 20k;
  - the count is not clamped when it shrinks;
  - a follow does not re-arm after its scroller is hidden.

  The first now also affects the timeline's Meta+ArrowDown on a long history, at the cost above; the other two do not (the timeline uses no follow, and a trace history only grows). They get their own PR.

- The remaining graph-building cost: `doctor()` is O(C²).

## Open questions

1. Should the `Editor.View` line-diff sync apply everywhere, or be opt-in?
