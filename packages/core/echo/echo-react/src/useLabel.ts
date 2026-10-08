//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo } from 'react';

import { Entity } from '@dxos/echo';

export type UseLabelOptions = {
  /** Fall back to the entity's typename when it has no label. */
  fallback?: 'typename';
};

/**
 * The label of an ECHO entity, re-rendering only when the label string changes.
 * A snapshot is read as is; a live entity subscribes through `Entity.labelAtom`.
 */
export const useLabel = (
  entity: Entity.Unknown | Entity.Snapshot | undefined,
  options?: UseLabelOptions,
): string | undefined => {
  const atom = useMemo(
    () =>
      entity && Entity.isEntity(entity)
        ? Entity.labelAtom(entity)
        : Atom.make<string | undefined>(() => (entity ? Entity.getLabel(entity) : undefined)),
    [entity],
  );
  const label = useAtomValue(atom);
  return label ?? (options?.fallback === 'typename' && entity ? Entity.getTypename(entity) : undefined);
};
