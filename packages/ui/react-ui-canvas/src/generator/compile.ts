//
// Copyright 2026 DXOS.org
//

//
// Loading a generator's compiled module (ANIMATION.md §6.6): the effect loader of @dxos/animation, with the motion
// library as the one module a generator may import.
//

import { loadEffectModule } from '@dxos/animation';

import * as motion from './motion.ts';
import { type GeneratorContext, type GeneratorModule, MOTION_MODULE, type Shape } from './types.ts';

/** Loads compiled generator code and checks its default export is a generator. Throws with a reason otherwise. */
export const loadGenerator = (code: string): GeneratorModule =>
  loadEffectModule<GeneratorContext, Shape>(code, { modules: { [MOTION_MODULE]: motion }, define: 'defineGenerator' });
