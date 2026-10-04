---
'@dxos/echo': minor
'@dxos/plugin-markdown': minor
---

The selection companion stacks the selected objects as plain cards in one scroll area with a small gutter, and its "No objects selected" banner sits in the same column, where the first card would. A form's nested object shows its label and disclosure above the bordered group of its fields rather than inside it. `Banner.Root` takes `inset` to override its own gutter, for a host that already pads it.

**Breaking:** `Instructions` no longer has a `description` field (nothing read it), and `Instructions.make` no longer accepts one.
