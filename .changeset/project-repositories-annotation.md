---
'@dxos/compute': minor
'@dxos/plugin-claude': minor
'@dxos/plugin-code': patch
'@dxos/plugin-debug': patch
'@dxos/plugin-github': patch
'@dxos/plugin-projects': minor
'@dxos/plugin-tasks': minor
'@dxos/react-ui': minor
'@dxos/react-ui-form': minor
'@dxos/types': minor
---

A project's repositories are one ordered list, the `Repo.RepositoriesAnnotation` on the project, read with `Repo.getRepositories` and written with `Repo.setRepositories`. The first repository is the one bare issue numbers resolve against and the one a cloud coding agent starts in. plugin-claude edits the list in the overview's Software group, above the code folder. A cloud session checks out the project's repositories in their order, then the repositories bound to the chat, each once. Agents edit the list with `ClaudeAgentOperation.UpdateProjectRepositories` (tool `claude-update-project-repositories`), the one tool of the new Project Repositories skill (`org.dxos.skill.claude.repositories`).

The project overview puts the most-used parts first. The name and description are edited in place, with the status as a pill in the top right corner, and both line up with the section headings. `Project`'s status carries an option table (title, hue and icon), so the pill reads Active, Paused, Blocked or Ended in its colour. Then come Notes, Artifacts (six at most until Show all), Milestones (each with its tasks' progress, and a button that opens the Tasks tab filtered to that milestone) and Specs, then a Config section of folded groups, each with a summary of what it holds. The project's own Agent group holds the instructions, skills and context. Other plugins declare groups with `ProjectCapabilities.ConfigGroup`: each field is a schema plus a function from the project to a writable atom, and the overview's form renders and writes it with no UI of the plugin's own. plugin-claude declares Software, holding the project's repositories and its code folder on this device.

plugin-tasks' task list has a milestone filter beside its sort and grouping, kept per device with the rest of the list's view state. It keeps the tasks under the milestone, sub-tasks that inherit it included, with the ancestors of each.

react-ui-form's field override takes `appearance`: `title` or `plain` renders a text field as a page's title or as body text, and `section` renders an array as a section of its own, its add button on the heading's row. react-ui's Input has `title` and `plain` variants for it, and Textarea a `plain` one: no well and no inset, and a plain Textarea is as tall as its text. A form's sections leave a wider gap between each other than between their rows, and a form's array rows start on the form's edge. An array field whose label is hidden keeps the label as its list's accessible name.

Breaking:

- `Project` 0.8.0 drops `repo`, `repositories` and `session`. plugin-projects' migration moves `repo` and then `repositories` into the annotation, each repository once, and drops `session`. Migrated projects cannot be read by an older build.
- Delegating a task no longer seeds the chat's session config from its project, since `Project.session` is gone.
- `Project`'s schema no longer has a Repositories field. The overview shows the list, in its Software group, only while plugin-claude is enabled.
- A generic object update no longer reaches a project's repositories. The GitHub skill points an agent at the Project Repositories skill instead.
- `ProjectSurface.Settings` is gone. Declare a `ProjectCapabilities.ConfigGroup` instead.
- The project's code folder is a typed path. The desktop app's folder picker is gone.
