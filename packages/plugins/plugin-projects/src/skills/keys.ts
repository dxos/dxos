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
export const ARTIFACT_SKILL_KEYS = ['org.dxos.skill.markdown'] as const;
