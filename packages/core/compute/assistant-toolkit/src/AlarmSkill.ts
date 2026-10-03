//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import skill from './skills/alarm/skill.ts';

export const key = skill.key;
export const make = skill.make;

export { AlarmHandlers as Handlers } from './skills/alarm/operations/index.ts';
export * as Operations from './skills/alarm/operations/definitions.ts';
