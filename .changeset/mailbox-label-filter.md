---
# multiple-changesets: the mailbox label-filter fix is unrelated to the AiService DecisionModel migration
'@dxos/echo-query': patch
'@dxos/plugin-inbox': patch
---

Clicking a label on a mailbox message now filters the list to that label. Labels containing spaces or punctuation get a `#tag` form (`formatTag`, e.g. `#Needs-reply`), which the query parser and the editor's autocomplete now accept. A tag-only filter selects feed messages by their tag index. The list no longer leaves blank space above a filtered result, and it starts at the top after the filter is cleared.
