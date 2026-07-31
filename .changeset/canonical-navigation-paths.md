---
'@dxos/app-toolkit': patch
'@dxos/plugin-client': patch
---

Resolve an object's canonical navigation path through `NavigationOperation.ResolveNavigationTargets`, so opening an object from a generic surface (a card, a search result, an agent following a reference) lands where the nav tree shows it — its collection, or its type's sidebar section — instead of the hidden database path every object falls back to. This also fixes the nav tree showing no selection for objects opened from cards.
