---
'@dxos/echo': minor
'@dxos/plugin-markdown': minor
---

UI layout primitives get simpler, typed APIs; heavy components move into their own packages; and the chat bounds what an agent can queue or spend on its own.

**Breaking:**

- `Grid`'s `cols` and `rows` take typed track tokens instead of raw CSS: `'fill'` (a flexible track that may shrink below its content), a number (a share of the free space, also shrinkable), `'min'`/`'max'`/`'auto'` (sized to the content), or a length such as `'18rem'` or `var(--…)`. A count is that many equal `fill` tracks, and `grow` now defaults to `false`.
- `Spinner` is now an interface (`SpinnerProps`, with an `ActivityState` of `'ready' | 'thinking' | 'alert' | 'error'`) with two implementations: `ShapeSpinner`, the morphing square (its states were `pulse`/`spin`/`flash`), and `PulseSpinner`, a dot matrix. Import spinners from the root of `@dxos/react-ui-components`, whose `./Spinner` subpath is removed.
- `QueryEditor`, `QueryForm` and `useQueryBuilder` move to the new `@dxos/react-ui-query` (translations at `@dxos/react-ui-query/translations`), and `Html` with its colour-scheme and email transforms moves to the new `@dxos/react-ui-html`, so `@dxos/react-ui-components` no longer carries CodeMirror, `@dxos/echo-query` or DOMPurify. `Matrix` moves to `@dxos/react-ui-experimental`.
- The `dx-fullscreen` utility is renamed `dx-cover` (`absolute inset-0`): it covers the nearest positioned ancestor, not the screen.
- `ScrollArea.Root` hides its overlay thumbs until the pointer is over the frame (`autoHide` defaults to `true`).
- `Instructions` no longer has a `description` field (nothing read it); `Instructions.make` no longer accepts one.

**Fixes and behaviour:**

- A form's nested object shows its label and disclosure above the bordered group of its fields rather than inside it, and the selection companion stacks plain cards in one scroll area, its empty banner in the same column.
- A popover whose content mounts after it opens (the chat thread outline's card) is positioned beside its anchor instead of the viewport's top-left corner.
- The chat prompt takes at most three prompts queued behind a running turn (`maxQueue`), on every submit path; queued prompts are small, right-aligned rows flush with the status chip.
- An agent may wake itself with alarms at most `Alarm.MAX_SELF_WAKES` (10) times in a row without a user prompt; each wake-up prompt states how many remain, a later alarm is dropped without a turn, and the chat status shows the count beside the next wake time.
