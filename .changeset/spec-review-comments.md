---
'@dxos/plugin-review': minor
'@dxos/types': minor
---

You can comment on the text of a Composer spec's features (name, description, each requirement) and on a project's name and description, as well as on the whole object. A comment anchors to a span of one string field, written as an Automerge ref path such as `requirements/<key>/text/[a-b]` by the new `PathAnchor` helpers in `@dxos/types`. A plugin declares which objects a comments companion covers with `AppCapabilities.CommentScope`. Form fields bound with `BoundTextEditor` edit the object's string in place, and `EditorExtensionsProvider` in `@dxos/react-ui-editor` hands them comment marks. `Feature` 0.5.0 stores requirements by key, and the `featureRequirements` migration upgrades 0.4.0 features.
