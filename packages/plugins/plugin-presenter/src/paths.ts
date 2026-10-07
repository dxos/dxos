//
// Copyright 2025 DXOS.org
//

import { type Obj } from '@dxos/echo';
import { Attention } from '@dxos/react-ui-attention/types';

const VARIANT = 'presenter';

/** Qualified path to the presentation companion of a plank. */
export const getPresentationPath = (plankPath: string): string => `${plankPath}/${Attention.linkedSegment(VARIANT)}`;

/**
 * Whether the object is currently being presented: the fullscreen plank is the presenter companion of a
 * plank for this object. An object can be open under more than one path (a collection, its type section),
 * so the match is on the object id rather than on one canonical path.
 */
export const isPresenting = (ephemeral: { fullscreen?: string }, object: Obj.Unknown): boolean => {
  const { fullscreen } = ephemeral;
  const plankPath = Attention.getParentId(fullscreen);
  return (
    !!fullscreen &&
    Attention.isLinkedSegment(fullscreen) &&
    Attention.getLinkedVariant(fullscreen) === VARIANT &&
    Attention.getSegmentId(plankPath ?? '') === object.id
  );
};
