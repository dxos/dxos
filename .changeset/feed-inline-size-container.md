---
'@dxos/react-ui-feed': patch
'@dxos/react-ui-assistant': patch
---

Suggestion chips are capped by the chat's width again. The feed's per-message editor registered no inline-size query container, so a widget's `max-w-[calc(100cqi-8px)]` resolved `cqi` against the viewport and a long suggestion overflowed the thread. Chips that wrap onto a second row now also carry vertical padding, which an inline-level box contributes to the line box.
