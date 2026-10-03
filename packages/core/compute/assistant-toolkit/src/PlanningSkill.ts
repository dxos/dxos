//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import skill from './skills/planning/skill.ts';

export const key = skill.key;
export const make = skill.make;

export { PlanningHandlers as Handlers } from './skills/planning/operations/index.ts';
export * as Operations from './skills/planning/operations/definitions.ts';
