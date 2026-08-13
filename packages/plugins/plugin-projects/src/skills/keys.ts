//
// Copyright 2026 DXOS.org
//

/**
 * Skills for the artifact types a project produces, bound into every project chat.
 *
 * Held as plain keys (not skill imports) so plugin-projects does not depend on the plugin that owns
 * each artifact type — the same idiom `SkillsAnnotation` consumers use. Pre-binding these is what
 * keeps a chat from spending a `query-skills`/`enable-skills` round trip before it can create the
 * thing the user asked for; extend the list as further artifact skills land (outline, sheet, …).
 *
 * Must be dotted reverse-DNS keys (NOT `/`-paths): `Skill.registryURI` resolves a key as
 * `dxn:<key>`, and slashes make the DXN invalid, yielding an unresolvable Ref URI at bind time.
 */
export const ARTIFACT_SKILL_KEYS = ['org.dxos.skill.markdown', 'org.dxos.skill.table', 'org.dxos.skill.sheet'] as const;

/**
 * Typed reference to the space-backed project-management skill, for `Operation.mcpTool({ skill })`
 * at operation definition sites (see `Operation.SkillRef`). The key's final segment doubles as the
 * skill's MCP prompt name (`/codeProject`) and its `skillLoad` name. `projects-skill.ts` builds the
 * definition from this same constant, so an annotation passing this reference always names the
 * skill that actually ships.
 */
export const CodeProjectSkill = { key: 'org.dxos.plugin.projects.skill.codeProject' } as const;
