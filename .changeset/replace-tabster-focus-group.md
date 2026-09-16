---
# multiple-changesets: this branch is stacked on the Tree rebuild, whose changeset describes a
# separate PR; a reader looking up the tabster replacement would not look for it under Tree.
'@dxos/react-ui': minor
---

Replace `@fluentui/react-tabster` with `useFocusGroup` in `@dxos/react-ui`, which provides arrow-key navigation and `Tab` boundaries for composite widgets in a fraction of the size — 68 KB left the eager boot graph. `Focus.Group`, `Main`'s landmarks, `Carousel`, `Tabs`, `Masonry` and the `react-ui-list` components keep their keyboard behaviour; consumers calling tabster's hooks directly should move to `useFocusGroup` and `findFirstFocusable`.
