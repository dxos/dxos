---
name: code-style
description: >-
  Apply when writing or editing TypeScript. Fix a type at its source rather than
  asserting past it, keep class members in a consistent order, prefer options
  objects over positional parameters, and say why in a comment once. Read this
  before writing code in an existing module, not after.
---

# Code style

## Types: fix at the source, never assert past

**Never widen or bypass a type to make code compile.** `as any`, `as unknown as
T`, a widened `any` in a signature, and the non-null `!` are not fixes. Each one
moves a compile-time failure to runtime.

- **Wrong parameter type?** Widen or correct the helper's signature. One edit in
  one place, and every other call site is fixed with it.
- **Value genuinely unknown?** Narrow it with a `typeof`/`instanceof` check, a
  `value is T` guard, or a parse function at the boundary.
- **Generic will not resolve?** The constraint is usually wrong. Constrain to
  what the function actually needs from `T`.
- **Possibly undefined?** Handle the undefined case. `!` claims a fact the
  compiler could not prove and nothing else checks.

**The surrounding file is not a licence.** Extending a module whose existing
functions already assert past their types is the strongest pull toward doing it
again, and it is why cast counts only grow. Write the new function correctly even
when its neighbours are not.

## Class members

Order: static fields, instance fields, constructor, public methods, private
methods. Prefer ES `#private` over the TypeScript `private` keyword in new code.

## Signatures

Prefer an options object over three or more positional parameters. Name the
options type and export it alongside the function.

## Comments

State why the code is necessary, in one load-bearing clause, ending with a
period. Delete a comment the code already makes obvious.
