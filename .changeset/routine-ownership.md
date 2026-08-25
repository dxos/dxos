---
'@dxos/echo': minor
---

Routines are standalone unless an object owns them. Being triggered by an object is not ownership, so the per-object routines companion is gone: it listed whatever the four-hop `connectedRoutinesQuery` join reached, which is not the same set as "routines that change this object", and it missed changes made any other way. Auditability moves to history and change attribution.

`Project` (`0.5.0`) regains `routines` — an ordered `Ref(Routine)[]` set alongside the routine's parent edge by the new `Project.addRoutine`, so a project's starter routines cascade-delete with it. Templates in plugin-projects, plugin-crm and plugin-brain now file their starter routine into the array instead of persisting it on its own. Magazine gets the same treatment in follow-up work.

An object with a parent no longer appears in a top-level type section: `TypeSection.sectionQuery` (the new default) filters `Filter.hasParent(false)`, so an owned object is reached through its owner rather than listed beside it. This generalizes the per-section filter the Chats section already carried, and it applies to a project's routines and chats alike.

Routine templates (`RoutineCapabilities.Template`) are all global. `appliesTo` is removed; a template that needs an object declares an `inputSchema` which the create panel collects as a form before scaffolding (Analyze Mailbox and CRM ask for a mailbox, Curate Magazine for a magazine), and a template that cannot stand on its own — the connector's Sync, which only its own flow can supply a subject for — sets `hidden` and is reachable by id alone. The `ProjectArticle` toolbar drops its Routines button along with the companion it opened.

Two fixes fall out of the same area. A type section built without a `sectionUrlKey` used to put a placeholder string in its node's `data`, which made the navtree treat the section header as openable and put up an empty plank; it is now `null`, matching `AppNode.makeSection`. And `Form.Actions` accepts `submitLabel`/`submitIcon`, so a form that is a step rather than the commit can say what it does — the routine create panel's input step now reads "Continue".

`Filter.type` matches the versioned type exactly and no migration is provided, so projects written at `0.4.0` are not carried forward.
