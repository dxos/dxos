---
'@dxos/echo': patch
---

An ECHO reference now keeps `type: 'object'` and its `{ "/": string }` shape in JSON Schema instead of collapsing to a bare `$ref` sentinel. Consumers that do not know the sentinel — a language model reading an MCP tool schema, most of all — decide whether an argument is structured JSON by looking for `type`, and without it they send the reference envelope as a JSON string, so the call fails to decode. `$ref` siblings are permitted from JSON Schema 2019-09 onward and readers still match on `$ref`, so nothing that understood these nodes before changes.
