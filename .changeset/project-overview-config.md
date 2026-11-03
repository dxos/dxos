---
'@dxos/compute': patch
'@dxos/plugin-claude': minor
'@dxos/plugin-projects': minor
'@dxos/react-ui': minor
'@dxos/react-ui-form': minor
---

The project overview puts the most-used parts first. The name and description are edited in place, with the status as a pill in the top right corner, and both line up with the section headings. `Project`'s status carries an option table (title, hue and icon), so the pill reads Active, Paused, Blocked or Ended in its colour. Then come Notes, Artifacts (six at most until Show all), Milestones (each with its tasks' progress) and Specs, then a Config section of folded groups, each with a summary of what it holds. The project's own Agent group holds the instructions, skills and context. Other plugins declare groups with `ProjectCapabilities.ConfigGroup`: each field is a schema plus a function from the project to a writable atom, and the overview's form renders and writes it with no UI of the plugin's own. plugin-claude declares Software, holding the project's repositories and its code folder on this device.

react-ui-form's field override takes `appearance`: `title` or `plain` renders a text field as a page's title or as body text, and `section` renders an array as a section of its own, its add button on the heading's row. react-ui's Input has `title` and `plain` variants for it, and Textarea a `plain` one: no well and no inset, and a plain Textarea is as tall as its text. A form's sections leave a wider gap between each other than between their rows, and a form's array rows start on the form's edge. An array field whose label is hidden keeps the label as its list's accessible name.

Breaking:

- `ProjectSurface.Settings` is gone. Declare a `ProjectCapabilities.ConfigGroup` instead.
- The project's code folder is a typed path. The desktop app's folder picker is gone.
