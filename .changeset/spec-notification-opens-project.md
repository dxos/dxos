---
'@dxos/compute': minor
'@dxos/plugin-markdown': patch
---

Comments on a spec work end to end. A comment notification about a spec opens its project on that spec, with Comments beside it: notifications open their object where the plugin that owns it places it. A spec's type names the feature-map skill, so the agent answering a comment on a spec can edit its blocks.

A navigation target can now carry view state. `ViewState.Patch` (from `@dxos/react-ui-attention`) holds fields to merge over one aspect's value, `ViewState.patch` builds one from an aspect, and `Manager.apply` merges it in. `NavigationTarget.viewState`, `ResolveNavigationTargets` and `LayoutOperation.Open` carry these patches, and Open applies them before the planks open.
