//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { useCallback, useMemo } from 'react';

import { Annotation, type Obj } from '@dxos/echo';
import { type Space, useObject } from '@dxos/react-client/echo';

import { AppAnnotation } from '../../echo/index.ts';

export type SpacePlugins = {
  /** The space's decisions, keyed by plugin id. Empty means the space has made none. */
  decisions: Record<string, boolean>;
  /** Whether the space names its own plugin set, rather than deferring to each member's. */
  scoped: boolean;
  setEnabled: (id: string, enabled: boolean) => void;
  /** Drop every decision, so members' own enabled sets apply again. */
  reset: () => void;
};

const getDecisions = (properties: Obj.Unknown | Obj.Snapshot | undefined): Record<string, boolean> =>
  properties
    ? Annotation.get(properties, AppAnnotation.SpacePluginsAnnotation).pipe(
        Option.getOrElse((): Record<string, boolean> => ({})),
      )
    : {};

/**
 * Reactive per-space plugin decisions, read from and written to the
 * {@link AppAnnotation.SpacePluginsAnnotation} record on the space's properties.
 *
 * The record replicates to every member, not across one user's devices: installing a plugin into a
 * shared space is the space's choice. The same reads back on EDGE, which scopes a headless invocation
 * by the space's set in preference to the caller's own (spec D-78).
 */
export const useSpacePlugins = (space: Space | undefined): SpacePlugins => {
  const spaceProperties = useMemo(() => space?.properties, [space]);
  const [properties, updateProperties] = useObject(spaceProperties);
  const decisions = getDecisions(properties);
  const scoped = Object.values(decisions).some((enabled) => enabled);

  const setEnabled = useCallback(
    (id: string, enabled: boolean) => {
      updateProperties((current) => {
        Annotation.set(current, AppAnnotation.SpacePluginsAnnotation, { ...getDecisions(current), [id]: enabled });
      });
    },
    [updateProperties],
  );

  const reset = useCallback(() => {
    updateProperties((current) => {
      Annotation.set(current, AppAnnotation.SpacePluginsAnnotation, {});
    });
  }, [updateProperties]);

  return { decisions, scoped, setEnabled, reset };
};
