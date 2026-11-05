---
'@dxos/react-ui-form': minor
'@dxos/plugin-projects': patch
---

A project's editors show the other peers' carets: the project's name and description, a spec's text and its embedded feature sections, the overview's Notes and the agent's instructions. Breaking: `@dxos/react-ui-form` removes `CollaborativeTextEditor` (now `InputEditor`, which takes `extensions` or a `value` and `onChange`), `useCollaborativeText`, `Form.Root`'s `object` and `CollaborativeAnnotation`, so a host binds a collaborative field by setting `fieldOverrides.collaborative` and passing `createDataExtensions` through the form's `extensions`; `@dxos/ui-types` removes `CollaborativeAnnotationId`.
