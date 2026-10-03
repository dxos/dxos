---
'@dxos/echo': patch
'@dxos/plugin-markdown': patch
---

Layout and contrast fixes for the new `@dxos/react-ui` components:

- Forms in a dialog or popover now line up with the host's columns, and a form in a popover takes the popover's surface.
- Combobox and select triggers placed directly in a form span the form's content column.
- A panel no longer shifts its body under the header when focus scrolls it.
- List rows with a description keep their icon and actions on the title's line.
- Row hover and selection are lower-contrast, and a fieldset's collapse button is a ghost button.
- `Project.description` is edited as multi-line text.
- The task set's add-task editor stays at the bottom, below the list.
