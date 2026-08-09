---
'@dxos/plugin-connector': patch
---

Fixed the Connect action missing from a bindable object after a page load. Connector modules activate lazily, so the action builder often ran while the registered-connector list was still empty — and it returned early *before* reading that list's atom, registering no dependency, so nothing re-ran the builder once a provider activated. The action then reappeared only when unrelated graph churn (creating another object) happened to rebuild it.

The connector list is now read reactively before any early return, so contributing a connector re-runs the builder and the action appears on its own.
