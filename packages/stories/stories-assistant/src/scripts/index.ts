//
// Copyright 2026 DXOS.org
//

import { hello } from './hello.ts';
import { launchKit } from './launch-kit.ts';

export * from './launch-kit.ts';

/**
 * The scenes a story can play, by name; each is served as the model `org.dxos.model.scripted.<name>`, so a name is
 * camelCase, as a model id needs.
 */
export const Scripts = { hello, launchKit } as const;

export type ScriptName = keyof typeof Scripts;
