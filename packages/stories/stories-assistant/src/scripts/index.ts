//
// Copyright 2026 DXOS.org
//

import { hello } from './hello.ts';
import { launchKit } from './launch-kit.ts';

export * from './launch-kit.ts';

/** The scripts a story can play, by name; each is served as the model `org.dxos.model.scripted.<name>`. */
export const Scripts = {
  hello,
  'launch-kit': launchKit,
} as const;

export type ScriptName = keyof typeof Scripts;
