---
branch: claude/agentic-code-review-3wrnts
commit: f8f2889b28439e14e7697be294f9942778555bdb
base: e8ad2af1144c55b4023a729147c3c40148486a31
mode: default
createdAt: 2026-08-13T05:40:07.514Z
isFinalized: true
groups: 7
rules: [harness-script-hygiene]
reviewId: f8f2889b
---

_0 error(s), 2 warning(s)._

# WARN f8f2889b-1 harness-script-hygiene `.agents/skills/agentic-review/lib/store.mjs:117`

The `catch { return []; }` in `ruleIdsFromReviewDir`'s `GROUPS_MANIFEST` fallback swallows any `readFileSync`/`JSON.parse` failure — including a corrupt `groups.json` — and silently treats it as "no rules covered," with no comment marking this as a deliberate best-effort skip. This is the harness-script-hygiene rule's swallowed-catch case, and it directly contradicts `readReview` a few lines above in the same file, which deliberately *rethrows* on corruption specifically so a bad file is never mistaken for a missing one. Fix by either propagating the error (consistent with `readReview`) or adding a comment explaining why silently discarding manifest-parse failures is safe here.

# WARN f8f2889b-2 harness-script-hygiene `.agents/skills/agentic-review/scripts/finalize.mjs:199`

The `try { priorStatuses = parseResolution(...) } catch { priorStatuses = null; }` block swallows any parse failure on an existing `RESOLUTION.md` with no comment explaining why that's a safe best-effort skip, so a genuinely corrupted resolution file silently loses all prior agent-set statuses (resetting every issue to unresolved) instead of surfacing the failure. Per `harness-script-hygiene`, either log/report the parse error before falling back, or add a comment stating why silently discarding a malformed `RESOLUTION.md` is an intentional, safe default.
