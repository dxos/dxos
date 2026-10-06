# Bugfix

Applies when the PR fixes a defect. Copy this block verbatim and replace every `{{…}}` slot. All four
subsections are required; Reproduction is the one most often skipped and the one reviewers check
first.

````markdown
## Bug

### Discovery and symptoms

**Found by:** {{FOUND_BY}}

{{SYMPTOM}}

```text
{{ERROR_OR_LOG_LINE}}
```

### Reproduction

**Test:** `{{TEST_FILE}}` › `{{TEST_NAME}}`
**Without fix:** fails — `{{FAILURE}}`
**With fix:** passes — `{{COMMAND}}`

### Root cause

{{MECHANISM}}

### Fix

{{CHANGE}}

**Rejected alternatives:** {{REJECTED}}
````

| Slot                    | Fill with                                                                                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{{FOUND_BY}}`          | One of `user report`, `Linear DX-123`, `CI failure (<run link>)`, `SigNoz alert`, `Sentry`, `while working on <X>`.                                                                          |
| `{{SYMPTOM}}`           | One or two sentences: what the user or caller saw.                                                                                                                                           |
| `{{ERROR_OR_LOG_LINE}}` | The exact error text or log line, quoted verbatim. When there is none (a wrong value, a hang), drop the whole fenced block, not just its contents.                                           |
| `{{TEST_FILE}}`         | Repo-relative path of the reproducing test.                                                                                                                                                  |
| `{{TEST_NAME}}`         | The `describe › test` name as vitest prints it.                                                                                                                                              |
| `{{FAILURE}}`           | The assertion or error the test fails with on the base.                                                                                                                                      |
| `{{COMMAND}}`           | The command you ran, e.g. `moon run <pkg>:test -- <file>`.                                                                                                                                   |
| `{{MECHANISM}}`         | Which code path, under which condition, does what, ending with the location in backticks: ``(`path/to/file.ts:123`)``. "Race" or "flake" is not a root cause; name the two things that race. |
| `{{CHANGE}}`            | What changed and why it removes the cause rather than the symptom.                                                                                                                           |
| `{{REJECTED}}`          | `none`, or `<alternative> — <why not>`, several separated by `; `.                                                                                                                           |

## Proving the reproduction

A test this PR adds does not exist on the base, so show the failure by reverse-applying only the
fix's hunks against the PR's base (the same `$BASE` used to pick templates), with the test and every
other edit kept. Run exactly one of these, whichever matches how the fix is isolated; each undoes
the fix, so running both fails:

```bash
git diff "$BASE"...HEAD -- "$FIX_FILE" | git apply -R   # either: the fix has a file to itself
git revert --no-commit "$FIX_COMMIT"                    # or: the fix has a commit to itself
```

An existing test, or manual steps on the base, also count. When no automated test can reproduce it,
replace the three Reproduction lines with exactly:

```markdown
**Test:** none — {{WHY_NO_TEST}}
**Manual steps:** {{STEPS}}
```
