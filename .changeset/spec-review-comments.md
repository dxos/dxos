---
'@dxos/plugin-review': minor
'@dxos/react-ui-form': minor
'@dxos/types': minor
'@dxos/ui-types': minor
---

You can comment on the text of a Composer spec's features (name, description, each requirement) and on a project's name, description and notes, as well as on the whole object. A comment anchors to a span of one string field, written as an Automerge ref path such as `requirements/<key>/text/[a-b]` by the new `PathAnchor` helpers in `@dxos/types`. A plugin declares which objects a comments companion covers with `AppCapabilities.CommentScope`. `Form.Root` takes `object`, a live ECHO object: a field carrying the `CollaborativeAnnotation` (or `fieldOverrides.collaborative`) edits that object's string in place through Automerge, while other fields report through `onValuesChanged`. `Form.Root`'s `markdownExtensions` is now `extensions`, which also takes a function of the field's path, and a `MarkdownCapabilities.ExtensionProvider` receives the field as `binding`, which is how comment marks reach form fields. `Feature` 0.5.0 stores requirements by key, and the `featureRequirements` migration upgrades 0.4.0 features.
