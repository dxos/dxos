//
// Copyright 2026 DXOS.org
//

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
export const Scripts = { buildPlugin, hello, launchKit, savingsPlans } as const;

export type ScriptName = keyof typeof Scripts;
