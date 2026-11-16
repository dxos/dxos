---
'@dxos/plugin-projects': minor
---

A task delegated to an external coding agent now ends in a draft pull request: the delegation brief asks the agent to commit on a new branch, push it, open one draft PR per repository it changed, attach each PR to its task and move the task to `review`, and never to push to the default branch or merge. Setting a project's repositories moves from plugin-code to plugin-projects as `ProjectOperation.UpdateRepositories` (key `org.dxos.operation.projects.updateRepositories`, previously `org.dxos.operation.code.updateProjectRepositories`), and the project skill now lists it, so MCP clients can give a project its repositories.
