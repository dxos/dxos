//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { useCallback, useMemo } from 'react';

import { Annotation, Obj } from '@dxos/echo';
import { type Space, useObject } from '@dxos/react-client/echo';

import { AppAnnotation } from '../../echo';

export type HomeVisibility = {
  /** Whether the named section is visible; defaults to `true` when unset. */
  visible: boolean;
  /** Persist the section as hidden for this space. */
  hide: () => void;
};

const getVisibility = (properties: Obj.Unknown | Obj.Snapshot | undefined): Record<string, boolean> =>
  properties
    ? Annotation.get(properties, AppAnnotation.HomeVisibilityAnnotation).pipe(Option.getOrElse(() => ({})))
    : {};

/**
 * Reactive per-space visibility of a named Home content section. Reads/writes the
 * {@link AppAnnotation.HomeVisibilityAnnotation} record on the space's properties (replicated across
 * devices), so hiding a section here reflects in the settings reset and on other devices.
 */
export const useHomeVisibility = (space: Space | undefined, name: string): HomeVisibility => {
  const spaceProperties = useMemo(() => space?.properties, [space]);
  const [properties, updateProperties] = useObject(spaceProperties);
  const visible = getVisibility(properties)[name] !== false;

  const hide = useCallback(() => {
    updateProperties((current) => {
      Annotation.set(current, AppAnnotation.HomeVisibilityAnnotation, { ...getVisibility(current), [name]: false });
    });
  }, [updateProperties, name]);

  return { visible, hide };
};
