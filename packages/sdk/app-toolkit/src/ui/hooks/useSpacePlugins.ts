//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { type Space, useObject } from '@dxos/react-client/echo';

export type SpacePlugins = {
  /** The plugins the space names, by NSID, each with the semver range it accepts. */
  plugins: Record<string, string>;
  /** Whether the space names any plugin of its own, rather than deferring to each member's set. */
  scoped: boolean;
  /** Name a plugin at `range`, or stop naming it when `range` is `undefined`. */
  setPlugin: (id: string, range: string | undefined) => void;
  /** Stop naming any plugin, so members' own sets apply again. */
  reset: () => void;
};

/**
 * Reactive view of the plugins a space runs, read from and written to `space.properties.plugins`.
 *
 * One subscription: the map is a field of the properties object, not a separate object to resolve,
 * so a space that has never named a plugin needs nothing created before the first write.
 *
 * The map replicates to every member, and EDGE reads the same field off the space it is invoked in
 * (spec D-78), so a plugin named here runs for everyone and in every headless invocation.
 */
export const useSpacePlugins = (space: Space | undefined): SpacePlugins => {
  const [properties, updateProperties] = useObject(space?.properties);
  const plugins = { ...properties?.plugins };
  const scoped = Object.keys(plugins).length > 0;

  const setPlugin = useCallback(
    (id: string, range: string | undefined) => {
      updateProperties((properties) => {
        const next = { ...properties.plugins };
        if (range === undefined) {
          delete next[id];
        } else {
          next[id] = range;
        }
        properties.plugins = next;
      });
    },
    [updateProperties],
  );

  const reset = useCallback(() => {
    updateProperties((properties) => {
      properties.plugins = {};
    });
  }, [updateProperties]);

  return { plugins, scoped, setPlugin, reset };
};
