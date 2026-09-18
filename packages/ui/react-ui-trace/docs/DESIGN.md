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
- Changes to `@dxos/react-ui-virtual` or `MessageList`; see [Follow-ups](#follow-ups).

## Design

### Component map

| Need                                     | Framework part                                                                         | Package                                    |
| ---------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------ |
| Scroller with thin overlay scrollbars    | `ScrollContainer.Content` (a `ScrollArea.Root`)                                        | `@dxos/react-ui`                           |
| Follow the tail; stop following on wheel | `ScrollContainer.Root pin`                                                             | `@dxos/react-ui`                           |
| Scroll-to-bottom button                  | `ScrollContainer.ScrollDownButton`                                                     | `@dxos/react-ui`                           |
| Top fade                                 | `ScrollContainer.Fade`                                                                 | `@dxos/react-ui`                           |
| Windowed rows (sizer, positioned rows)   | `Mosaic.VirtualStack` with `draggable={false}`                                         | `@dxos/react-ui-mosaic`                    |
| Current row, hover                       | `Mosaic.Container currentId`, `Mosaic.Tile` with the `dx-current` / `dx-hover` classes | `@dxos/react-ui-mosaic`, `@dxos/ui-theme`  |
| Read-only JSON with folding and search   | `Editor.View` with `json()`, `folding()` and search                                    | `@dxos/react-ui-editor`, `@dxos/ui-editor` |
| Oversized payload in the details pane    | `SyntaxHighlighter`'s own pipeline, as plain text                                      | `@dxos/react-ui-syntax-highlighter`        |

The repo already builds long lists this way in `SearchStack`, `EventStack` and `InboxStack`. The host owns a `ScrollArea` viewport, and a `Mosaic.VirtualStack` binds to it through `getScrollElement`.

### Timeline

`Timeline` stays a single component with the same props. It gains one prop, `getScrollElement`, which it passes to the stack; every `VirtualStack` host already supplies this. It no longer renders every commit:

- **Layout.** `layoutTimeline(commits, branches)` is a pure, linear-time function in `timeline-layout.ts`. It replaces `find`/`findIndex` with index maps and releases lanes by merge row. It returns the visible rows, and each row carries the lanes and spans of its layout pass. Commits on branches outside the whitelist get no row, so every row is exactly `lineHeight` tall.
- **Rows.** The rows are rendered by a `Mosaic.VirtualStack`:
  - `items` is the rows and `getId` is `row.commit.id`.
  - `estimateSize` is `() => lineHeight`, which is exact because rows have a fixed height.
  - `Tile` is `TimelineTile`, which renders the existing row content (lane SVG, icon, message, timestamp) inside `Mosaic.Tile`.

  Positioned rows cannot share one grid, so each row gets the column template that the shared subgrid used to provide. The columns still line up: every row in a layout pass has the same lane width, and the icon and timestamp columns have fixed widths.

- **Current row and selection.** These map to `Mosaic.Container currentId` / `onCurrentChange`. The tile sets `aria-current`, styled by the shared `dx-current` class, which replaces the row's own `aria-current:bg-*` classes.
- **Keyboard.** The keymap does not change: ArrowUp/Down, Shift for the same branch, Meta for the ends, Enter to toggle selection. To reach rows that are not mounted, keyboard moves call `scrollToIndex(index, { align: 'auto' })` on the stack's virtualizer, which the Timeline captures from `onChange`. `align: 'auto'` scrolls to the nearest edge, matching the `scrollIntoView({ block: 'nearest' })` it replaces. The stack's own `scrollIntoView` is turned off, because it aligns the row to the top and would move the view on every arrow press.
- **Empty state.** Unchanged (`no-commits.message`).

### Trace panel

`TracePanel` keeps its current composition: `ScrollContainer.Root pin` › `Content thin` › `Fade` › `Viewport` › `Timeline`, plus `ScrollDownButton`. The viewport element becomes the Timeline's `getScrollElement`. Pinning needs no change: `ScrollContainer` observes the viewport's children, the stack grows by one row height per commit, and it scrolls to the bottom.

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

1. **`@dxos/react-ui-virtual`'s `Window`.** This is the engine behind `MessageList`, with exact extents, a follow and a controller. But `Window` renders its own native scroller instead of a `ScrollArea`, and it has no scroll-to-bottom part. Using it would mean losing the thin overlay scrollbar and the button, or first extending the framework: a `ScrollArea` viewport and a follow button in `react-ui-virtual`, shared with `MessageList`.
2. **A Timeline-local composite on `useWindow`, like `MessageList.Viewport`.** This was prototyped. It needs its own sizer and window markup and its own scroll-to-bottom button, which means new styles in a feature component. Rejected on that principle.
3. **Calling `useVirtualizer` directly.** This has the same drawback as option 2.

## Dependencies

- `@dxos/react-ui-trace` gains a dependency on `@dxos/react-ui-mosaic`. The mosaic package's dependency closure does not include the trace package, so this creates no cycle.
- `Mosaic.Container` requires a DnD root. In Composer, `DeckLayout` provides `Dnd.Root` around the deck. Stories use `withMosaic()`. Hosts outside Composer (devtools, storybook-testing) must add one if they do not already have it.

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
3. Timeline on `Mosaic.VirtualStack`, and the host updates.
4. Debug view on `Editor.View`, and the `Editor.View` minimal-change sync.
5. The `SyntaxHighlighter` guard.
6. The recovery page's Repair line reworded to match its button, which was requested for this PR.

## Follow-ups

- `@dxos/react-ui-virtual` has three problems, fixed on a side branch:
  - `Placement.#range` is O(d²) on a far jump: about 28 ms at 4k rows and 0.7 s at 20k;
  - the count is not clamped when it shrinks;
  - a follow does not re-arm after its scroller is hidden.

  They affect `MessageList`, not the trace, so they get their own PR.

- The remaining graph-building cost: `doctor()` is O(C²).

## Open questions

1. Is `Mosaic.VirtualStack` the right engine, given that every Timeline host then needs a DnD root? The alternative is to first give `@dxos/react-ui-virtual` a `ScrollArea`-based viewport (alternative 1).
2. Should the `Editor.View` line-diff sync apply everywhere, or be opt-in?
