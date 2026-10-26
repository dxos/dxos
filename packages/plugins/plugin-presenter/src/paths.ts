//
// Copyright 2025 DXOS.org
//

import { Obj } from '@dxos/echo';
import { Attention } from '@dxos/react-ui-attention/types';

import { Presentation } from '#types';

const VARIANT = 'presenter';

/** Qualified path to the presentation companion of a plank. */
export const getPresentationPath = (plankPath: string): string => `${plankPath}/${Attention.linkedSegment(VARIANT)}`;

/**
 * The path to fullscreen when presenting the object shown by the plank: a Presentation's own article is the deck,
 * so it goes fullscreen in place; anything else is presented through its presenter companion.
 */
export const getPresentingPath = (plankPath: string, object: Obj.Unknown): string =>
  Obj.instanceOf(Presentation.Presentation, object) ? plankPath : getPresentationPath(plankPath);

/**
 * Whether the object is currently being presented: the fullscreen plank is the presenter companion of a
 * plank for this object (or, for a Presentation, that plank itself). An object can be open under more than
 * one path (a collection, its type section), so the match is on the object id rather than on one canonical path.
 */
export const isPresenting = (ephemeral: { fullscreen?: string }, object: Obj.Unknown): boolean => {
  const { fullscreen } = ephemeral;
  if (!fullscreen) {
    return false;
  }
  if (Obj.instanceOf(Presentation.Presentation, object)) {
    return !Attention.isLinkedSegment(fullscreen) && Attention.getSegmentId(fullscreen) === object.id;
  }
  const plankPath = Attention.getParentId(fullscreen);
  return (
    Attention.isLinkedSegment(fullscreen) &&
    Attention.getLinkedVariant(fullscreen) === VARIANT &&
    Attention.getSegmentId(plankPath ?? '') === object.id
  );
};
