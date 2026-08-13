//
// Copyright 2026 DXOS.org
//

import type * as Operation from '@dxos/compute/Operation';

/**
 * Reference to plugin-projects' space-backed project-management skill, for
 * `Operation.mcpTool({ skill })` on the task and outline verbs — those tools are part of that
 * workflow (tasks file into a project's task set) and their MCP projection points a model at
 * `skillLoad('codeProject')` before first use.
 *
 * Held as a plain key rather than a skill import, so plugin-tasks does not depend on
 * plugin-projects — the idiom of plugin-projects' own `skills/keys.ts` ("plain keys, not skill
 * imports"). The authoritative constant is `CodeProjectSkill` there; the two must agree.
 */
export const CodeProjectSkill: Operation.SkillRef = { key: 'org.dxos.plugin.projects.skill.codeProject' };
