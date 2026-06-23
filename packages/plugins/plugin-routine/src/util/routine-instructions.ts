//
// Copyright 2026 DXOS.org
//

import { Instructions } from '@dxos/compute';
import { Obj } from '@dxos/echo';

import { Routine } from '#types';

/**
 * Finds the {@link Instructions.Instructions} object parented to a {@link Routine.Routine} within a
 * pre-queried list. Instructions are owned by (parented to) their routine — there is no direct Ref
 * field — so the association is resolved by walking the parent chain.
 */
export const findRoutineInstructions = (
  allInstructions: Instructions.Instructions[],
  routine: Routine.Routine,
): Instructions.Instructions | undefined =>
  allInstructions.find((candidate) => Obj.getParent(candidate)?.id === routine.id);
