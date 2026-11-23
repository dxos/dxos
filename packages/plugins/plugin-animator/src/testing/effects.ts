//
// Copyright 2026 DXOS.org
//

import { Animation } from '#types';

import { BUILTIN_EFFECTS } from '../effects/builtins/index.ts';

/** A built-in effect by name, as an Effect object a test or story's shots can reference. */
export const makeBuiltinEffect = (name: string): Animation.Effect => {
  const effect = BUILTIN_EFFECTS.find((candidate) => candidate.name === name);
  if (!effect) {
    throw new Error(`No built-in effect ${name}.`);
  }
  return Animation.makeEffect(effect);
};
