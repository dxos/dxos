//
// Copyright 2026 DXOS.org
//

import { type ConstrainIntent } from '../model/index.ts';
import { constrainedConstrain } from './constrained.ts';
import { dynamicConstrain } from './dynamic.ts';
import { latticeConstrain } from './lattice.ts';

/**
 * A 2D layout's mode, from its own fields: a layout with `constraints` re-relates a shape it drops and re-places every
 * shape by them, writing the new constraints in the same batch (the solver owns placement, so snapping does not free
 * it); otherwise a lattice snaps every frame onto its cells while snapping is on, and a dynamic layout
 * (`arrange: dynamic`) pins what is moved and re-places the rest when its graph changes.
 */
export const constrain2D: ConstrainIntent = (layout, intent, { snap }) => {
  if (layout.dim !== '2d') {
    return intent;
  }
  if (layout.constraints !== undefined) {
    const constrained = constrainedConstrain(layout, intent);
    return constrained && constrained.intent !== intent
      ? {
          kind: 'batch',
          intents: [constrained.intent, { kind: 'layout', patch: { constraints: constrained.constraints } }],
        }
      : constrained?.intent;
  }
  const snapped = layout.lattice && snap ? latticeConstrain(layout, intent) : intent;
  return snapped && dynamicConstrain(layout, snapped);
};
