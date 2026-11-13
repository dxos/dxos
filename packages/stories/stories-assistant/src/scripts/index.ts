//
// Copyright 2026 DXOS.org
//

import { type ScriptedScene } from '@dxos/ai/testing';

import { buildPlugin } from './build-plugin.ts';
import { hello } from './hello.ts';
import { launchKit } from './launch-kit.ts';
import { savingsPlans } from './savings-plans.ts';

export * from './build-plugin.ts';
export * from './launch-kit.ts';
export * from './savings-plans.ts';

/**
 * The scenes a story can play, by name; each is served as the model `org.dxos.model.scripted.<name>`, so a name is
 * camelCase, as a model id needs.
 */
export type ScriptName = 'buildPlugin' | 'hello' | 'launchKit' | 'savingsPlans';

// Annotated, since the declaration emit cannot name `Scene` through the inferred type.
export const Scripts: Readonly<Record<ScriptName, ScriptedScene.Scene>> = {
  buildPlugin,
  hello,
  launchKit,
  savingsPlans,
};
