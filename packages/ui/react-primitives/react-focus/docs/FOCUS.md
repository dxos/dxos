# Focus groups in `@dxos/react-ui`

Design record for [`useFocusGroup`](../src/useFocusGroup.ts) and the DOM primitives it is
built on ([`util/focus.ts`](../src/focus.ts)), which replaced `@fluentui/react-tabster` in
August 2026. The measurement that justified the work is in
[`react-ui-list/docs/TREE.md`](../../../react-ui-list/docs/TREE.md) §7; the task ledger is
[`.agents/projects/ark/TASKS.md`](../../../../../.agents/projects/ark/TASKS.md) Phase 5. This document
covers the mechanism, the alternatives that do not work, and what was deliberately left out.

## 1. What the thing is

Two behaviours, both about _composite widgets_ — a widget the user should reach with one `Tab` and
then move around inside with the arrow keys:

- **Mover** (`axis`) — the arrow keys move focus between the container's items.
- **Groupper** (`tabBehavior`) — `Tab` stops on the container rather than on each of its contents;
  `Enter` moves inside, `Escape` comes back out.

Tabster names them Mover and Groupper and this document keeps those names, because the behaviour is
deliberately the same and the mapping is what makes a regression legible.

A container may be one, the other, or both. `Focus.Group` is both; a listbox `<ul>` is a mover whose
rows are grouppers; a `Main` landmark is a groupper alone.

| tabster                                | replacement                                                        |
| -------------------------------------- | ------------------------------------------------------------------ |
| `useArrowNavigationGroup({ axis })`    | `useFocusGroup({ axis })`                                          |
| `useFocusableGroup({ tabBehavior })`   | `useFocusGroup({ tabBehavior })`                                   |
| `useMergedTabsterAttributes_unstable`  | — one hook takes both, so there is nothing to merge                |
| `useFocusFinders().findFirstFocusable` | `findFirstFocusable` (a plain function, no hook, no runtime)       |
| `TabsterDOMAttribute`                  | `UseFocusGroupResult`                                              |
| `keyborg` → `data-w-keyboard`          | `trackKeyboardModality` ([`util/modality.ts`](../src/modality.ts)) |

## 2. Size

Bundled standalone — esbuild, ESM, minified, React external — the same method TREE.md §7 used to size
tabster's API surface, so the two numbers are directly comparable:

| module                                                                                                                     |                raw |               gzip |             brotli |
| -------------------------------------------------------------------------------------------------------------------------- | -----------------: | -----------------: | -----------------: |
| tabster surface (`useArrowNavigationGroup`, `useFocusableGroup`, `useFocusFinders`, `useMergedTabsterAttributes_unstable`) |             76,623 |             21,736 |             19,392 |
| `useFocusGroup` + `util/focus.ts` + `util/modality.ts`                                                                     |              6,167 |              2,696 |              2,393 |
| **difference**                                                                                                             | **−70,456 (−92%)** | **−19,040 (−88%)** | **−16,999 (−88%)** |

In the eager boot graph — the location that actually mattered — the removal was 68,256 bytes minified
(`tabster` 59,820 + `keyborg` 6,298 + the fluentui wrapper 2,138) against ~6.2 KB added, so the **net
is roughly −62 KB**. `check-boot-budget` measured 4,360,490 bytes over 21 preload entries afterwards,
with zero tabster or keyborg modules in any preload chunk's sourcemap.

Source cost is 645 lines across three files, plus 140 lines of tests:

| file                                                            | lines |
| --------------------------------------------------------------- | ----: |
| [`hooks/useFocusGroup.ts`](../src/useFocusGroup.ts)             |   348 |
| [`util/focus.ts`](../src/focus.ts)                              |   244 |
| [`util/modality.ts`](../src/modality.ts)                        |    53 |
| [`hooks/useFocusGroup.test.tsx`](../src/useFocusGroup.test.tsx) |   140 |

The ratio is the point of the exercise. Tabster is a general focus-management runtime — modalizers,
delosers, restorers, observed elements, an uncontrolled-subtree protocol, a global
`MutationObserver` — and this repo used four hooks from it. The replacement is not a better tabster;
it is the subset this codebase actually calls, which is why it fits in a tenth of the space, and why
§8 matters: anything added back here should be added because a call site needs it.

## 3. The consumer contract, and why it is not tabster's

Tabster's hooks return `data-tabster` **attributes**, inert until a global runtime observes them.
Spreading them anywhere is safe and order does not matter. `useFocusGroup` instead returns **real
React props** — a `ref`, `onKeyDown`, `onFocus` — because that is what removes the runtime.

Two obligations follow, and both have already been got wrong once:

1. **Compose the `ref`.** A call site that writes `ref={forwardedRef}` after spreading the result
   silently drops the group. This is not hypothetical: `Main`'s sidebars did exactly that through
   `useForwardedRef`, which writes the forwarded ref once in an effect and so never delivers the
   node when `Root` swaps between `Primitive.div` and `DialogContent` on a media-query change. The
   landmark grouppers were inert and nothing failed — no type error, no test, no console warning.
   Use `useMergeRefs`.
2. **Chain the handlers.** A call site with its own `onKeyDown` must call the group's, not replace
   it. `Listbox.Item` and `useLandmarkMover` both do this explicitly.

Neither obligation can be enforced by the type system, which is the cost of deleting 68 KB. A group
that does nothing looks exactly like a group that works until someone presses a key, so **any change
to a call site's ref or key handling needs a keyboard check, not a green build.**

## 4. Sentinels

Each group that has to intercept `Tab` gets two zero-size focusable children — `<i tabindex="0"
aria-hidden="true">`, `position: fixed` so they are out of flow and can never become a flex or grid
item — inserted as the first and last child by the hook's `ref`, and kept at the edges by a
`childList` `MutationObserver` (React appends new children _after_ the trailing sentinel, which
would otherwise let `Tab` walk past it).

They exist because the browser's own tab order is the thing being redirected, and the only place to
stand in its way without touching any element's `tabindex` is at the boundary. Every forward `Tab`
into a group's subtree meets the leading sentinel first; every backward one meets the trailing
sentinel first. So the sentinel's `focus` handler is the group's entry and exit hook, and it decides
from `relatedTarget` alone:

| `relatedTarget`      | sentinel | meaning                           | target                                   |
| -------------------- | -------- | --------------------------------- | ---------------------------------------- |
| the container        | start    | `Tab` off the collapsed container | the next tab stop past the exit boundary |
| inside the container | either   | leaving the contents — trap       | wrap to the last/first focusable inside  |
| inside the container | start    | leaving backwards — limited       | the container itself                     |
| inside the container | end      | leaving forwards — limited        | the next tab stop past the exit boundary |
| outside, or null     | either   | entering                          | `getEntryTarget` (below)                 |

A group only gets sentinels when something must be intercepted: a limited groupper's entry, or a
mover's memorized entry point. `unlimited` grouppers and `tabbable` movers get none — they are pure
markers.

**Two caveats, and the second has already bitten.** `<i>` is not a valid child of `<ul>`, and a
listbox gets sentinels — browsers tolerate it, `aria-hidden` keeps it out of the accessibility tree
and `position: fixed` keeps it out of layout, but it deviates from the content model.

More consequentially, **a group container's first and last element children are no longer what the
author wrote.** Layout is safe, because `position: fixed` means a sentinel is never a flex or grid
item — but `firstElementChild`, `children[n]`, `:first-child` and `:nth-child` all see it.
`TaskList.stories.tsx` asserted icon-column alignment via `row.firstElementChild` and started
measuring the sentinel instead: a 1px box at viewport x≈0.5 against a real cell at ≈292, failing by
291.5px. Query a group's children with `:scope > *:not([data-focus-sentinel])`.

## 5. Movers

`getFocusItems` walks the container's children and stops descending at the first thing that is
either tabbable or itself a group. That single rule is what makes a row holding a menu and a delete
button **one** arrow step rather than three, and it is why `Focus.Item` marks itself
`tabBehavior: 'unlimited'` — it needs the boundary, not the `Tab` behaviour.

- **Axis.** `vertical` takes Up/Down, `horizontal` takes Left/Right, and `grid` / `grid-linear` /
  `both` take all four as flat next/previous in DOM order.
- **Home/End** go to the ends; **`cyclic`** wraps instead of stopping.
- **Text entry is never taken.** An `<input>`, `<textarea>`, `<select>` or contenteditable keeps its
  own arrows and Home/End.
- **An entered nested group keeps its keys.** Stepping the outer group's rows while the user is
  inside one of them would move focus out from under them.

**`Tab` out of a mover** is where the design earns its keep. The mover is one tab stop, so `Tab` from
the third of ten rows must leave the whole widget — but the browser is better than we are at
answering _where_ that is, particularly at the end of a document where the answer is its own chrome.
So the handler parks focus on the boundary sentinel and does **not** call `preventDefault`: the
browser then computes its own `Tab` from there. An `inTransit` flag stops the sentinel's handler from
undoing the move. `findNextTabStop` remains as the fallback for a mover with no sentinels.

`getTabExitBoundary` climbs out through enclosing non-`tabbable` movers before that hand-off, which
is why tabbing out of a listbox row leaves the listbox instead of landing on the next row's button.
A groupper stops the climb: its container is the stop focus belongs on.

## 6. Entering, and what "entered" means

`getEntryTarget` answers where `Tab` lands when a group is entered from outside: the container itself
for a limited groupper (that is what limiting _is_), otherwise the memorized item, otherwise the
leading or trailing focusable. `contentEntry` answers the different question of where `Enter` goes
_inside_ — the memorized item, else the first — so `Enter` into a group you have used before returns
you to where you were.

`memorizeCurrent` is a single `data-focus-current` attribute maintained on `focusin`, per mover. It
is per-mover rather than global, so a row inside a column inside a board legitimately has three
marked elements on three different containers.

**"Entered" is not `container.contains(activeElement)`.** A container that is not itself a tab stop
has no state to be entered _from_: focus reaching its contents is how an enclosing group steps
**onto** it, not the user stepping **into** it. `isEntered` therefore returns false for a
non-tabbable container. Without that clause, `Listbox` in `list` mode — where rows are `tabIndex=-1`
and the arrow target is each row's first button — reads every row as permanently entered and loses
arrow navigation entirely. This was the second defect found by keyboard verification, and it is the
subtlest invariant in the module.

## 7. Alternatives, and why each fails

1. **Ark / Zag.** Zag's focus management is per-machine, scoped inside a tree or tabs or listbox
   instance. `focus-trap` is a modal trap, not a roving-tabindex groupper, and there is no
   `useArrowNavigationGroup` equivalent. See
   [`react-ui-list/docs/MIGRATION.md`](../../../react-ui-list/docs/MIGRATION.md) §1. **Do not reopen.**
2. **Roving tabindex over the mover's items.** The standard APG technique, and the first thing to
   reach for. It does not compose with grouppers: a non-current row set to `tabindex=-1` still has
   tabbable buttons inside it, so the browser stops there and the widget is not one tab stop after
   all. It also fights React, which rewrites `tabIndex` on re-render, and needs an attribute
   `MutationObserver` to stay correct.
3. **Tabindex mangling for grouppers** — set every tabbable descendant to `-1` while the group is not
   entered, restore on `Enter`. Correct in the small and untenable in the large: a `Main` landmark
   wraps a whole Composer pane, so this is an O(n) rewrite over hundreds of elements on every focus
   change, plus a subtree `MutationObserver` competing with CodeMirror, plus stored originals to
   restore. This is precisely why tabster uses dummy inputs, and why §4 does too.
4. **`focusin` redirect with input-modality detection** — let focus land wherever the browser puts it
   and bounce it to the container when the move came from the keyboard. Needs a reliable
   keyboard-vs-pointer signal (which is what `keyborg` is), and has an entry/exit loop: every
   redirect to the container is followed by a `Tab` that must not redirect again.

## 8. Deliberately not implemented

Tabster features with no call site in this repo. Each is a small addition to §5 if one appears —
none is a hidden dependency.

- **Geometric grid navigation.** Tabster's `Grid` direction moves by `getBoundingClientRect`;
  `grid`/`both` here are flat DOM order. `useListNavigation`'s `grid` mode had no consumer outside
  its own unit test.
- **`visibilityAware`** — skipping items scrolled out of view.
- **`hasDefault` / `findDefault`** — a `data-is-default-tabbable` opt-in for entry.
- **`Modalizer`, `Restorer`, `Deloser`, `Observed`, `uncontrolled`** — never used here.
- **Keyborg's focus/keydown correlation.** `trackKeyboardModality` sets `data-w-keyboard` from
  navigation keys and clears it on `pointerdown`, which is all the two consumers
  (`Main`'s `onOpenAutoFocus`, shell's `Viewport`) read from it.

## 9. Where it is used

Every call site, and what each asks for. The first four are the boot-reachable ones — the whole
reason the removal was worth doing; the rest sit in lazy chunks and attributed no boot bytes.

| #   | call site                                                                                   | configuration                                                | why                                                                                                   |
| --- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| 1   | [`Focus.Group`](../../../react-ui/src/components/Focus/Focus.tsx)                           | `axis: orientation`, `limited-trap-focus`, `memorizeCurrent` | app chrome's focus zones: one `Tab` in, arrows within, `Escape` out                                   |
| 2   | [`Focus.Item`](../../../react-ui/src/components/Focus/Focus.tsx)                            | `unlimited`, `ignoreKeys: ['Enter']`                         | boundary only, so the Group's arrows treat the item as one stop; `Enter` selects rather than entering |
| 3   | [`useLandmarkMover`](../../../react-ui/src/components/Main/MainContext.ts)                  | `limited`, `ignoreKeys: ['Tab']`                             | pane chrome; landmark traversal owns `Tab`                                                            |
| 4   | [`Carousel.Indicators`](../../../react-ui/src/components/Carousel/Carousel.tsx)             | `axis: 'horizontal'`, `memorizeCurrent`                      | the dot strip is one tab stop                                                                         |
| 5   | [`useListNavigation`](../../../react-ui-list/src/hooks/useListNavigation.ts)                | `axis` per mode, `memorizeCurrent`                           | the shared list/listbox/grid keyboard aspect                                                          |
| 6   | [`Listbox.Item`](../../../react-ui-list/src/components/Listbox/Listbox.tsx)                 | `limited`                                                    | a row with its own controls is one arrow step                                                         |
| 7   | [`OrderedList.Item`](../../../react-ui-list/src/components/OrderedList/OrderedListItem.tsx) | `limited`, listbox mode only                                 | same, for reorderable rows                                                                            |
| 8   | [`Masonry`](../../../react-ui-masonry/src/Masonry.tsx)                                      | `axis: 'both'`, `tabbable`, `cyclic`, `memorizeCurrent`      | tiles stay individually tabbable; all four arrows step DOM order                                      |
| 9   | [`Tooltip`](../../../../plugins/plugin-support/src/components/Tooltip/Tooltip.tsx)          | `limited-trap-focus`                                         | the onboarding tooltip holds focus until dismissed                                                    |
| 10  | `Tooltip` actions row                                                                       | `axis: 'horizontal'`                                         | back / next / close                                                                                   |
| 11  | [`Tabs`](../../../react-ui-tabs/src/Tabs.tsx)                                               | `findFirstFocusable` ×2                                      | move focus to the tablist, or into the active panel                                                   |
| 12  | [`Treegrid`](../../../react-ui-list/src/components/Treegrid/Treegrid.tsx)                   | `findFirstFocusable`                                         | focus the target row's first control on Up/Down                                                       |
| 13  | [`Matrix`](../../../../plugins/plugin-deck/src/components/Matrix/Matrix.tsx)                | `findFirstFocusable`                                         | `scrollTo` focuses a tile so attention follows                                                        |
| 14  | [`DeckPlank`](../../../../plugins/plugin-deck/src/containers/Deck/DeckPlank.tsx)            | `findFirstFocusable`                                         | `Enter` into a plank                                                                                  |
| 15  | [`Viewport`](../../../../sdk/shell/src/components/Viewport/Viewport.tsx)                    | `findFirstFocusable`                                         | focus the active view, keyboard navigation only                                                       |

The exemplar at [`exemplars/focus.stories.tsx`](../../../react-ui/src/exemplars/focus.stories.tsx) is a board of
columns of cards — a mover of grouppers of grouppers — and is the fastest way to feel all three
behaviours at once. `useFocusGroup.test.tsx` pins the arrow, `Enter`/`Escape`, nesting and
text-entry rules; the `Tab` paths need a real browser and were verified by hand.

## 10. Test plan

`Tab` cannot be simulated: a synthetic key event carries no default action, so the browser never
performs the traversal. That splits coverage in two, and the split is the reason a green build says
nothing about this module.

**Automated** — [`useFocusGroup.test.tsx`](../src/useFocusGroup.test.tsx), happy-dom, nine
tests: arrow movement on the axis, off-axis keys left alone, `cyclic` wrap, `Home`/`End`, `Enter`
in and `Escape` out of a limited group, `memorizeCurrent` marking and entry resolution, a nested
group as one arrow step, an entered nested group keeping its keys, and a text field keeping its own
arrows.

**Manual** — Storybook (`moon run storybook-react:serve`), the run that found both defects in §3
and §6. Note that the page must be clicked once before keys reach it.

1. `exemplars/focus` — arrows move between cards in a column; `Escape` from a field goes to the
   card, again to the column; `ArrowDown` at the last card stays; `ArrowRight` moves column to
   column; `Enter` enters a column; `Tab`/`Shift+Tab` step column to column.
2. `components/Focus` Default — `ArrowDown` from the group enters the items; arrows move; `Escape`
   returns to the group; from the last item `Tab` wraps to the first and `Shift+Tab` back
   (`limited-trap-focus`).
3. `components/Main` Default — open both sidebars, focus one landmark, `Tab` alternates between
   landmarks. Each landmark must have two `[data-focus-sentinel]` children; **none means the ref
   was dropped**, which is defect §3.
4. `components/Carousel` Default — `ArrowLeft`/`ArrowRight` move between indicator dots and change
   the slide; `Tab` leaves the strip rather than visiting the remaining dots.
5. `react-ui-list/Listbox` Disclosure (`list` mode, rows are `tabIndex=-1`) — arrows move row to
   row, landing on each row's control. **Focus stuck on one row is defect §6.**
6. `react-ui-list/Listbox` Default (`listbox` mode) — arrows move between options; `Tab` leaves the
   listbox entirely; `Shift+Tab` back re-enters on the option you left.

**Not covered.** The running Composer app: the Deck panes' focus zones come from `useLandmarkMover`
and were verified through the `Main` story, not against the app. That is the gap to close first if
a focus regression is reported.
