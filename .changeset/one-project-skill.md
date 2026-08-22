---
'@dxos/plugin-projects': minor
'@dxos/assistant-toolkit': minor
'@dxos/compute': minor
---

One project skill. `@dxos/assistant-toolkit`'s `org.dxos.skill.project` — the chat-context skill for filing artifacts — is absorbed into plugin-projects' project skill, which now owns the whole surface: work-stream projects, task ledgers, outlines, design documents, and artifacts.

The absorbed operations keep their verbs (`artifactAdd`, `artifactList`) under new keys in the `org.dxos.plugin.projects.operation.*` namespace, and plugin-projects registers their handlers.

The skill is re-keyed `org.dxos.plugin.projects.skill.codeProject` → `org.dxos.plugin.projects.skill.project`, so its projected MCP prompt is now `/project`. `codeProject` only ever existed to avoid a prompt-name collision with the skill this change deletes.

Breaking for out-of-repo consumers: `@dxos/assistant-toolkit` no longer exports `ProjectSkill`/`ProjectHandlers`/`ProjectOperations`, and `@dxos/plugin-projects`'s `./CodeProjectSkill` subpath is now `./ProjectSkill`. A `Project` object's `SkillsAnnotation` names the new key, so a project-scoped chat loads the consolidated skill.
