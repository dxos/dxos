---
'@dxos/app-toolkit': patch
'@dxos/plugin-client': patch
---

Resolve an object's canonical navigation path through `NavigationOperation.ResolveNavigationTargets`, so opening an object from a generic surface (a card, a search result, an agent following a reference) lands where the nav tree shows it — its collection — instead of the hidden database path that every object falls back to.
