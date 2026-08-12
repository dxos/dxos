---
'@dxos/compute': patch
'@dxos/plugin-projects': patch
---

Projects gain a lifecycle `status` field (`active | paused | blocked | ended`, exported as `Project.ProjectStatus`), surfaced through the MCP-projected verbs: `projectList` and `projectGet` report it and `projectUpdate` patches it.

plugin-projects now ships `ProjectsSkillDefinition` (`org.dxos.plugin.projects.skill.projects`): the space-backed project-management workflow for external agents — space binding, project/task/outline conventions, and the `/project` verb set driving the projected MCP tools. Exported from `@dxos/plugin-projects/plugin` alongside the operation handler set so headless hosts (edge operation-service) can register it; its MCP prompt projection surfaces it as `/projects` in MCP clients.
