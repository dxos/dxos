//
// Copyright 2026 DXOS.org
//

/**
 * Key of the trip skill. Lives here (not in the skill module) so the Trip schema can
 * reference it via {@link SkillsAnnotation} without importing the skill (which would create
 * a cycle through the operation definitions).
 *
 * Must be a dotted reverse-DNS key (NOT a `/`-path): `Skill.registryURI` resolves it as
 * `dxn:<key>`, and slashes make the DXN invalid, yielding an unresolvable Ref URI at bind time.
 */
export const TRIP_SKILL_KEY = 'org.dxos.skill.trip';
