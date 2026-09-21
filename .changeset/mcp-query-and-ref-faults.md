---
'@dxos/echo': patch
'@dxos/plugin-space': patch
---

Fix how an operation reads its input and reports a bad one.

A multi-word text search now narrows instead of widening: the phrase goes to the index whole, where
the terms are ANDed, rather than being split and OR-ed back together.

An operation input carrying a property its schema does not declare is now rejected rather than
dropped, so a misspelled field is an error instead of a plausible-looking wrong answer. An operation
whose input requires no fields still accepts a no-argument invocation.

A wire reference reaches a handler decoded when its field is both optional and nullable, so a ref
field can be set over the wire and not only cleared.

A rejected reference now names the type expected and the value received, instead of `<Declaration>`,
and every bad field in a payload is reported at once.

Loading an object by its own id no longer hangs when a strong dependency of its type is unreachable.
