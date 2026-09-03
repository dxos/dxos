---
'@dxos/plugin-projects': minor
'@dxos/assistant-toolkit': minor
---

One project skill. The repo carried two: `@dxos/assistant-toolkit`'s `org.dxos.skill.project`, a small skill for filing artifacts into a project chat, and `@dxos/plugin-projects`' `org.dxos.plugin.projects.skill.codeProject`, which held the whole work-stream workflow. They are now one.

The survivor is `org.dxos.skill.project`, which keeps its `artifactAdd`/`artifactList` operations, gains the full workflow instructions, and now projects as an MCP prompt — `/project`, the name `codeProject` only ever existed to avoid a collision with.

It lives in `@dxos/plugin-projects`, which owns the verbs it drives. A skill that cannot import its own operations can only name them as strings, and an unresolvable ToolId is dropped from the session toolkit with nothing but a log line — so the tool list is now checked by the compiler. `@dxos/plugin-assistant` no longer contributes the skill or its handlers (it cannot depend on `@dxos/plugin-projects` without a cycle); the plugin that owns the verbs contributes both.

Breaking: `@dxos/assistant-toolkit` no longer exports `ProjectSkill`, `ProjectHandlers` or `ProjectOperations` — import them from `@dxos/plugin-projects/ProjectSkill` and `#skills`. The two artifact operations move to the `projects` domain to match their defining package: `org.dxos.operation.assistantToolkit.{addArtifact,listArtifact}` become `org.dxos.operation.projects.{addArtifact,listArtifact}`, so the tools rename from `assistant-toolkit-{add,list}-artifact` to `projects-{add,list}-artifact`. The Agent skill drops its instruction to file work products, which named a tool it did not declare.

Breaking for out-of-repo consumers: `@dxos/plugin-projects` no longer exports the `./CodeProjectSkill` subpath, and the skill key `org.dxos.plugin.projects.skill.codeProject` is gone. A `Project` object's `SkillsAnnotation` already named `org.dxos.skill.project`, so a project-scoped chat now loads the consolidated skill rather than the artifact-filing subset.

Also: the ten task and project operations that used to serialize their result with `Entity.toJSON` and declare it as `Schema.Unknown` now name the real schema (`Type.getSchema(Task.Task)` and friends) and return the live object. The MCP server already serializes what it returns, so the snapshot round trip only cost the type. An in-app caller that reloaded the result by id can use it directly; an MCP client sees the same JSON as before, now under a declared output schema.

Also: four operations are gone, each folded into a verb that already existed. `tasks-complete` and
`tasks-assign` were `tasks-update` with one field; `tasks-update-milestone` was a plain field patch,
now `space-update-object`; `projects-list` was a type query plus a projection, now
`space-query-objects`. None of the four guarded an invariant — the ones that do (appending to
`TaskSet.tasks`, sweeping it on delete, reordering it, deriving milestone progress) are all still
here, and every operation now carries a JSDoc saying which side of that line it falls on. The
`RunInstructions` routine tool `completeJob` also drops strict mode when the routine declares no
output, since an arbitrary payload cannot be expressed under Anthropic's strict tool validation.

Also: `@dxos/plugin-projects` and `@dxos/plugin-tasks` gain headless `node` variants — `#plugin` and
`#capabilities` now resolve `plugin.node.ts` and `capabilities/node.ts` under the `node` condition,
registering schema, operations and (for projects) the skill without the React surfaces the browser
barrel declares. Both plugins join the CLI's set and its default-enabled list, so `dx mcp serve`
reaches the project and task verbs the way it reaches every other plugin's, rather than through
direct handler-set imports — and the types those verbs write are registered, which is what a project
create needs to store its graph. A profile that has already been configured needs
`dx plugin enable org.dxos.plugin.projects org.dxos.plugin.tasks`; a fresh one gets both.
