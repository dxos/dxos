---
'@dxos/plugin-projects': minor
---

Feature map: features nest and carry their requirements, and the map is navigated by zooming.

- `Feature` is now `0.2.0`. Subfeatures are features with a `parent` ref, so each has its own description,
  requirements, status, dependencies and tasks; a feature holds `requirements` (`{ id?, text }[]`) extracted from its
  spec. `in-progress` is no longer a status: whether someone is working on a feature is derived from its linked
  tasks (started or in review), so the status says only how far it has come. A migration turns 0.1.0 subfeature
  records into child features and `in-progress` into `planned`.
- New `ImportSpec` operation (`projects-import-spec-features`) extracts features from an `.mdl` spec's `feat` and
  `req` blocks; importing again updates the requirements. `Create` and `Update` take `parent` and `requirements`;
  `Update` no longer takes `subfeatures`.
- The Features tab drops the masonry cards view. A click on a card shows the feature in the project's new feature
  companion, where it is edited; a double-click zooms into its subfeatures, with a breadcrumb back out. Cards no
  longer edit in place and show only the status, the name, an in-work marker, the top warning, the description and
  a one-line summary.
