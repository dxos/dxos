---
'@dxos/echo': minor
'@dxos/plugin-inbox': minor
---

Fix defects found by driving the mailbox against real data.

- `plugin-inbox`: a conversation tile's overflow menu now offers Archive. It never had one — a threaded
  mailbox renders only conversation tiles, so the entry built by the single-message tile was
  unreachable. Both tiles now share one `buildTileMenuItems`, covered by unit tests.
- `plugin-inbox`: a message whose sender carries neither name nor address no longer collapses the date
  to the start of its row, and a sender with no display name falls back to its address.
- `react-ui-card`: `ContactAvatar` centres on the line of text it belongs to. `dx-avatar` is
  `display: contents` and its frame is `inline-flex`, so in a block wrapper the frame sat on the text
  baseline and the line box added descender space beneath it.
- `react-ui-form`: nested groups in a `settings`-variant form regain the gap between their sub-fields;
  `FormFieldSetContainer` resolved its styles once at module scope and so always used the `default`
  variant.
- `echo`: `Query.all` gains a typed overload, so a union of same-typed queries stays assignable where
  its arms were rather than widening to `Query.Any`.
- `plugin-inbox`: a message with no `threadId` (a draft, transcription or assistant-authored message)
  now reaches the mailbox list. The whole-thread semi-join is unioned with the direct matches, since
  `threadId IN (…)` can never admit a threadless row.
- `react-ui-components`: `QueryEditor` gains `onFilterChange`, handing back the parsed query it was
  already building for its own decorations — `plugin-inbox` and `plugin-explorer` each ran a second
  `QueryBuilder` over the same text, so the DSL was parsed twice per keystroke. Supplying the callback
  is what opts into parsing, so a caller that only wants the text pays nothing. A tag decorates from
  the `#` keystroke and only becomes atomic once a space terminates it (it was unconditionally atomic,
  which swallowed keystrokes mid-label), bracket matching is off so an object literal's braces no
  longer take a background wash while focused, and typenames complete as you type rather than only on
  Ctrl-Space.
- `plugin-deck`: the leading breadcrumb label no longer shifts as a trail appears or disappears.
