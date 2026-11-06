---
'@dxos/plugin-code': minor
'@dxos/react-ui-form': patch
---

A feature embedded in a spec is a compact section: a header row of fold toggle, block id, name and status, then its description, requirements and a "Needs" picker. Empty rows and the add and remove actions show only while the section has attention. Folded, a section shows only its header row, with the block ids of the features it needs and its requirement count; which sections are folded is kept on the device. `MarkdownField` draws the `title` and `plain` presentations in place, with no well and one line that grows with its text, as `TextField` does.
