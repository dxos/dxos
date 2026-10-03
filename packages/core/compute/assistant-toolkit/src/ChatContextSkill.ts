//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import skill from './skills/chat-context/skill.ts';

export const key = skill.key;
export const make = skill.make;

export { ChatContextHandlers as Handlers } from './skills/chat-context/operations/index.ts';
export * as Operations from './skills/chat-context/operations/definitions.ts';
