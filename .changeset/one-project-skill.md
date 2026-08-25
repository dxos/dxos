---
'@dxos/plugin-projects': minor
'@dxos/plugin-tasks': minor
'@dxos/assistant-toolkit': minor
---

One project skill. The repo carried two: `@dxos/assistant-toolkit`'s `org.dxos.skill.project`, a small skill for filing artifacts into a project chat, and `@dxos/plugin-projects`' `org.dxos.plugin.projects.skill.codeProject`, which held the whole work-stream workflow. They are now one.

The survivor is the toolkit's `org.dxos.skill.project`, which sits below every consumer. It keeps its `artifactAdd`/`artifactList` operations and gains the full workflow instructions, and it now projects as an MCP prompt — `/project`, the name `codeProject` only ever existed to avoid a collision with.

`@dxos/plugin-projects` owns the verbs the skill drives, so it is what contributes the skill to an app, via a `SkillDefinition` capability.

Breaking for out-of-repo consumers: `@dxos/plugin-projects` no longer exports the `./CodeProjectSkill` subpath, and the skill key `org.dxos.plugin.projects.skill.codeProject` is gone. A `Project` object's `SkillsAnnotation` already named `org.dxos.skill.project`, so a project-scoped chat now loads the consolidated skill rather than the artifact-filing subset.

Also: the ten task and project operations that used to serialize their result with `Entity.toJSON` and declare it as `Schema.Unknown` now name the real schema (`Type.getSchema(Task.Task)` and friends) and return the live object. The MCP server already serializes what it returns, so the snapshot round trip only cost the type. An in-app caller that reloaded the result by id can use it directly; an MCP client sees the same JSON as before, now under a declared output schema.
