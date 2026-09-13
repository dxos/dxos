---
'@dxos/react-ui-list': patch
'@dxos/ui-theme': patch
---

A tree branch no longer clips its first and last rows at rest. The branch content carried `overflow-y: clip` permanently for the disclose/conceal height animation, which cut the 2px focus ring off any control on a branch's first or last row (visible as a ring with a flat top in the task list). The clip now rides in the `tree-disclose`/`tree-conceal` keyframes, so it applies only while the height is moving.
