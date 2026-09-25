---
'@dxos/ui-editor': minor
'@dxos/plugin-projects': patch
---

The outliner shares a document with prose: each top-level list is its own island in the outline tree, headings and paragraphs between lists belong to no item, the caret may rest in them, and Enter on an empty item ends the list with a blank line before the caret (Backspace still deletes the item). Empty rows hint at what they want: an empty item shows an "Enter task" placeholder and a blank line shows an add-task button in the grip gutter; an empty item shows no drag grip. Gutter controls are a control-sized box around a 24px button, and `createBlockDrag` takes a `canDrag` predicate. `Form.FieldSet` accepts `descriptionPlacement='tooltip'`, which replaces the helper text with a question-mark button after the label that carries the description; `FormFieldHeader` gains a `labelEnd` slot. Task status glyphs live on `Task.StatusOptions` beside title and colour, and `@dxos/react-ui-task` exports `statusIcon` in place of the `STATUS_ICONS` record. The Project article's Notes section uses the tooltip placement, and the outliner's first-item seeding is opt-in.
