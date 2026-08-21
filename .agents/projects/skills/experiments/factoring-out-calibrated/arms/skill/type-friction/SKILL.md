---
name: type-friction
description: >-
  Adding or editing a function whose types do not line up: a parameter that will
  not accept the value you have, a return value the signature rejects, a
  generic that will not narrow, or a helper whose signature is close but not
  quite right. Use whenever the compiler objects to a value's type and you are
  deciding how to get it to compile, and whenever you are extending a file whose
  existing functions already work around their own types.
---

# When the types do not line up

The compiler objecting is information. Getting it to stop objecting is not the
same as fixing the problem.

**Never widen or bypass a type to make code compile.** `as any`, `as unknown as
T`, a widened `any` in a signature, and the non-null `!` are not fixes. Each one
moves a compile-time failure to runtime.

Fix it at the source instead:

- **Wrong parameter type?** Widen or correct the helper's signature. It is one
  edit in one place, and it fixes every other call site at the same time.
- **Value genuinely unknown?** Narrow it: a `typeof`/`instanceof` check, a
  `value is T` type guard, or a parse function at the boundary. A guard removes
  the assertion entirely rather than hiding it.
- **Generic will not resolve?** The constraint is usually wrong. Look at what the
  function actually needs from `T` and constrain to that.
- **Possibly undefined?** Handle the undefined case. `!` claims a fact the
  compiler could not prove and nothing else checks.

**The surrounding file is not a licence.** Extending a module whose existing
functions already cast is the single strongest pull toward casting again, and it
is the reason cast counts only ever grow. Matching local style is not a reason.
Write the new function correctly even when its neighbours are not, and say so if
the mismatch looks deliberate.
