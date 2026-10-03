//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import skill from './skills/skill-manager/skill.ts';

export const key = skill.key;
export const make = skill.make;

export { SkillManagerHandlers as Handlers } from './skills/skill-manager/operations/index.ts';
export * as Operations from './skills/skill-manager/operations/definitions.ts';
