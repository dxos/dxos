# Resolution — a733eb18

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- a733eb18-1: ignored as out of scope. Lines 122-133 (the `missing` state and its `tryLoad` effect) come from 5b99c470 (#13239), not this PR. This PR's only edits to the file are the `parseObjectUri` call on line 114 and the open button's testid and translated label; hoisting that effect into a hook would widen the diff against `diff-scoped-to-pr-purpose`. -->
- a733eb18-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:122

<!-- a733eb18-2: ignored as out of scope. The section-mode wrapper at 338-349 also comes from 5b99c470 (#13239). It is a `grid` laying out a resizable frame with `sizeStyle`, `frameProps` and `resizeAttributes`, not a styling box a Flex/Grid primitive replaces one-for-one, and it is untouched by this PR. -->
- a733eb18-2 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:338
