---
'@dxos/compute': minor
'@dxos/plugin-markdown': patch
---

Comments on a spec work end to end: a comment notification about a spec opens its project on that spec, with Comments beside it, and the agent answering the comment can edit the spec's blocks. A form in a spec shows another person's caret only in the field that caret is in.

A navigation target can now carry view state. `ViewState.Patch` (from `@dxos/react-ui-attention`) holds fields to merge over one aspect's value, and `ViewState.patch` builds one. `NavigationTarget`, `ResolveNavigationTargets` and `LayoutOperation.Open` carry these patches, and Open applies them before its planks open.
