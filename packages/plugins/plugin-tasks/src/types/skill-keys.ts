//
// Copyright 2026 DXOS.org
//

/**
 * Key of plugin-projects' project-management skill, for `Operation.mcpTool({ skill })` on the task
 * and outline verbs — those tools belong to that workflow (tasks file into a project's task set),
 * so their MCP projection points a model at the skill before first use.
 *
 * A plain key rather than the skill definition: plugin-projects already devDepends on plugin-tasks
 * (its ProjectArticle story renders the TaskSet section), so importing the definition here would
 * close a dependency cycle. This is the same trade plugin-projects' own `skills/keys.ts` documents
 * for artifact skills — "plain keys, not skill imports" — and the key's final segment is what the
 * annotation persists either way.
 */
export const CODE_PROJECT_SKILL_KEY = 'org.dxos.plugin.projects.skill.codeProject';
