//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import skill from './skills/websearch/skill.ts';

export const key = skill.key;
export const make = skill.make;

export { WebSearchHandlers as Handlers } from './skills/websearch/operations/index.ts';
export * as Operations from './skills/websearch/operations/definitions.ts';
export { WebSearchToolkit as Toolkit, WebSearchToolkitOpaque as ToolkitOpaque } from './skills/websearch/toolkit.ts';
