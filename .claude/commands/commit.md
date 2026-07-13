---
description: Commit uncommitted changes (excl lockfile & conversations); split if unrelated
allowed-tools: Bash
model: haiku
---

Commit uncommitted work. **Do not** run lint/tests/build, **do not** edit or fix code.

## 1. Collect scope (run this one-liner)

```bash
FILES=$( { git diff --name-only; git diff --cached --name-only; git ls-files --others --exclude-standard; } | sort -u | grep -Ev 'pnpm-lock\.yaml$|\.conversations\.json$' ); echo "FILES:"; printf '%s\n' $FILES; echo; git diff -- $FILES; git diff --cached -- $FILES; git ls-files --others --exclude-standard | grep -Ev 'pnpm-lock\.yaml$|\.conversations\.json$' | while IFS= read -r f; do echo "=== $f (new) ==="; cat "$f"; echo; done
```

Exclude always: `pnpm-lock.yaml`, `*.conversations.json`.

If `FILES` is empty, report clean and stop.

## 2. Commit

- Group changes into **one or more** logical commits when unrelated (e.g. separate features, separate packages).
- Write a clear, descriptive message for each commit — no required format.
- Stage **only** in-scope files; never stage excluded paths.
- Create commits immediately — no review pass, no code changes.
- **Do not push.**

## 3. Report

List each commit hash, message, and files included. Note anything left unstaged (excluded paths or intentionally skipped).
