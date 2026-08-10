---
branch: claude/agentic-code-review-3wrnts
commit: 76ce5607cd57027b2f0995775debb5bb84abbef8
base: b217ecc635789558ffd43623e2ef1a215a049e3f
createdAt: 2026-08-10T04:07:28.446Z
isFinalized: true
groups: 1
---

_0 error(s), 2 warning(s)._

# WARN `.agents/skills/agentic-review/lib/discover.mjs:62`

The `catch { return false; }` around `readFileSync` in `matchRuleFiles` swallows every error uniformly — a missing/unreadable file, but also an encoding problem or a path-resolution bug — and silently drops the file from the rule's match set with no signal that anything went wrong. Per `harness-script-hygiene`, this is exactly the "catch that swallows an error so a real failure passes silently" case rather than a deliberate, commented best-effort skip. Fix by adding a one-line comment stating the intended tolerance (e.g. a file can vanish between the changed-set scan and the grep pass) or, better, narrowing the catch to the expected `ENOENT` code and rethrowing anything else, mirroring the documented `allowFail` pattern in `lib/git.mjs`.

# WARN `.agents/skills/agentic-review/lib/git.mjs:72`

`isAncestor`'s bare `catch { return false; }` conflates the expected "not an ancestor" exit code from `git merge-base --is-ancestor` with any other failure (bad ref, corrupt repo, git not found), and unlike `git()`'s documented `allowFail` behavior it carries no comment explaining the tolerance. Under `harness-script-hygiene` this is an uncommented catch-all that can hide a real failure — `prepare.mjs`'s `resolveBase` would silently discard a valid prior review as "not an ancestor" instead of surfacing the underlying error. Fix by documenting the intentional two-outcome contract (git's own semantics: nonzero means not-an-ancestor) or by checking the error's exit code/status before returning `false`, so an unrelated failure still propagates.
