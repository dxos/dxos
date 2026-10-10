---
'@dxos/react-focus': patch
---

`findFirstFocusable` finds its candidates with a selector query instead of descending the subtree in
JavaScript. The walk cost a handful of DOM calls per element and a panel holding a few hundred rows is
tens of thousands of them, which the focus-restoring layout effects pay on every mount. Behaviour is
unchanged, including which subtrees are skipped; `findLastFocusable` keeps its walk, whose
subtree-root-before-contents order a limited groupper depends on and a query cannot express.
