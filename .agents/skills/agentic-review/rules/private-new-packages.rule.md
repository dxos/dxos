---
name: private-new-packages
title: New packages must be private
scope: repo
files:
  - 'packages/**/package.json'
severity: error
---

Every newly-added package must set `"private": true` in its `package.json`; the
flag is removed manually only once a trusted publisher exists.

Flag a `package.json` that is **newly added** in this change and lacks
`"private": true`. Do not flag existing published packages that are merely being
modified — this rule is about packages introduced by the diff. If you cannot tell
whether the package is new, note the uncertainty rather than asserting a
violation.
