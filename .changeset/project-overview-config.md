---
'@dxos/plugin-claude': minor
'@dxos/plugin-projects': minor
'@dxos/react-ui': minor
'@dxos/react-ui-form': minor
---

The project overview puts the most-used parts first. The name and description are edited in place, with the status beside the name. Then come Notes, Artifacts (six at most until Show all), Milestones (each with its tasks' progress) and Specs, then a Config section of folded groups, each with a summary of what it holds. The project's own Agent group holds the instructions, skills and context. Other plugins declare groups with `ProjectCapabilities.ConfigGroup`: each field is a schema plus a function from the project to a writable atom, and the overview's form renders and writes it with no UI of the plugin's own. plugin-claude declares Software, holding the project's repositories and its code folder on this device.

react-ui-form's field override takes `appearance: 'title' | 'plain'`, which renders a text field as a page's title or as body text. react-ui's Input has a `title` variant for it. An array field whose label is hidden keeps the label as its list's accessible name.

Breaking:

- `ProjectSurface.Settings` is gone. Declare a `ProjectCapabilities.ConfigGroup` instead.
- The project's code folder is a typed path. The desktop app's folder picker is gone.
