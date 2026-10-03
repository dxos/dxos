---
'@dxos/echo': patch
'@dxos/plugin-markdown': patch
---

Layout and contrast fixes for the new `@dxos/react-ui` components:

- Forms in a dialog or popover now line up with the host's columns, and a form in a popover takes the popover's surface.
- Combobox and select triggers placed directly in a form span the form's content column.
- A panel no longer shifts its body under the header when focus scrolls it.
- List rows with a description keep their icon and actions on the title's line.
- A scrolling block in a settings row (such as the debug port log) spans the row instead of collapsing to zero width.
- The log list scrolls inside its panel, an expanded entry opens beneath its row, a clicked row is ringed as current, rows' checkboxes are optional (`Logger.List checkable`), and the drawer's focus ring is no longer hidden by its panes.
- Row hover and selection are lower-contrast, and a fieldset's collapse button is a ghost button.
- The `description` of Project, Task, TaskSet, Milestone, Organization, Issue, PullRequest, Event, Pipeline, Skill, Routine and Script is `Format.Text`, so forms edit it as multi-line text; `Format.Text` is also on the `Format` namespace from `@dxos/echo/Format`.
- The task set's add-task editor stays at the bottom, below the list.
