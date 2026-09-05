---
'@dxos/react-ui-syntax-highlighter': minor
'@dxos/react-ui-list': minor
---

`Tree` gains a `density` prop. It stamps the tree root, so the control tokens size every row and
its disclosure toggle — a consumer no longer pairs the prop with a `dx-density-*` class of its own,
and the toggle no longer holds an `md` square inside an `sm` grid. Row spacing moved from a margin
on each row to a gap on the tree, so the first row now sits flush with the tree's top edge.

`Syntax.Code` renders its code as a block and leaves scrolling to `Syntax.Viewport`. Lines
previously advanced by more than their `line-height` — each line box was the union of the `<pre>`'s
strut and an inline `<code>` carrying a different font stack — so a `max-h-[Nlh]` cap showed N-1
lines and a sliver. The wrapper also no longer scrolls on its own, which had put a native scrollbar
inside the viewport's custom one.
