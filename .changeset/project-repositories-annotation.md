---
'@dxos/compute': minor
'@dxos/plugin-claude': minor
'@dxos/plugin-code': patch
'@dxos/plugin-debug': patch
'@dxos/plugin-github': patch
'@dxos/plugin-projects': minor
'@dxos/types': minor
---

A project's repositories are one ordered list, the `Repo.RepositoriesAnnotation` on the project, read with `Repo.getRepositories` and written with `Repo.setRepositories`. The first repository is the one bare issue numbers resolve against and the one a cloud coding agent starts in. plugin-claude edits the list in the overview's Software group, above the code folder. A cloud session checks out the project's repositories in their order, then the repositories bound to the chat, each once. Agents edit the list with `ClaudeAgentOperation.UpdateProjectRepositories` (tool `claude-update-project-repositories`), the one tool of the new Project Repositories skill (`org.dxos.skill.claude.repositories`).

Breaking:

- `Project` 0.8.0 drops `repo`, `repositories` and `session`. plugin-projects' migration moves `repo` and then `repositories` into the annotation, each repository once, and drops `session`. Migrated projects cannot be read by an older build.
- Delegating a task no longer seeds the chat's session config from its project, since `Project.session` is gone.
- `Project`'s schema no longer has a Repositories field. The overview shows the list, in its Software group, only while plugin-claude is enabled.
- A generic object update no longer reaches a project's repositories. The GitHub skill points an agent at the Project Repositories skill instead.
