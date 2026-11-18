---
'@dxos/plugin-canvas': patch
---

The composite card binds the fields where they now live. Its template bound `icon`, `body` and `footer` on the
node; those moved into the kind's own `data` bag so the DSL could carry them, so the template binds
`"data.icon"`, `"data.body"` and `"data.footer"` — quoted, because a bare DSL name cannot contain a dot and an
unquoted `bind=data.icon` does not lex. The editable parts of the card and the feed card address the same paths.

A kind's `data` schema must not redeclare a name its prototype already owns. Adding `icon` to `CardData` while
`extends: 'card'` supplies one left the merged schema invalid, the kind unregistered, and every card in the
Kinds storybook drawn as a plain box — with no error, just an absent `card-node`.
