//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import skill from './skills/delegation/skill.ts';

export const key = skill.key;
export const make = skill.make;

export { DelegationSkillHandlers as Handlers } from './skills/delegation/operations/index.ts';
export * as Operations from './skills/delegation/operations/definitions.ts';
export { makeDelegationStrategy } from './supervisor/delegation-strategy.ts';
