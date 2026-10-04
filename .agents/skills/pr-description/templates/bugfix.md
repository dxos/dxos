# Bugfix

Applies when the PR fixes a defect. All four sections are required; the second is the one most often
skipped and the one reviewers check first.

```markdown
## Bug

### Discovery and symptoms

<Who or what found it (user report, Linear issue, CI failure, Sentry/SigNoz alert, while working on X)
and what the user saw: the error text, the wrong value, the hang. Quote the log line or error.>

### Reproduction

<The test that reproduces it: file path and test name. State that it fails on the base branch and
passes with the fix, and how you checked (`moon run <pkg>:test -- <file>` on both). If no automated
test can reproduce it, say why and give the manual steps instead.>

### Root cause

<The mechanism, not the symptom: which code path, under which condition, does what. Point at the
file and line. "Race" or "flake" is not a root cause; name the two things that race.>

### Fix

<What changed and why it removes the cause rather than the symptom. Name any alternative you
rejected and why, in one line each.>
```
