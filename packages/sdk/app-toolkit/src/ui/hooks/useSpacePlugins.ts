//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { useCallback } from 'react';

import { Annotation } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type Space, useObject } from '@dxos/react-client/echo';

import { AppAnnotation, AppSpace } from '../../echo/index.ts';
import { AppSettings } from '../../types/index.ts';

export type SpacePlugins = {
  /** The space's decisions, keyed by plugin id. Empty means the space has made none. */
  decisions: Record<string, boolean>;
  /** Whether the space names its own plugin set, rather than deferring to each member's. */
  scoped: boolean;
  setEnabled: (id: string, enabled: boolean) => void;
  /** Drop every decision, so members' own enabled sets apply again. */
  reset: () => void;
};

/**
 * Reactive per-space plugin decisions, read from and written to the space's own settings object
 * ({@link AppAnnotation.AppSettingsAnnotation}) under {@link AppSettings.PLUGINS_NAMESPACE} — the
 * same object, annotation and namespace the settings space holds the identity's set in.
 *
 * Two subscriptions, because either half can arrive late: the properties, whose annotation names the
 * object, and the object itself, which a space that has never been configured does not have yet. The
 * first write names one.
 *
 * The decisions replicate to every member rather than across one user's devices: installing a plugin
 * into a shared space is the space's choice. The same reads back on EDGE, which scopes a headless
 * invocation by the space's set in preference to the caller's own (spec D-78).
 */
export const useSpacePlugins = (space: Space | undefined): SpacePlugins => {
  const [properties] = useObject(space?.properties);
  const settingsRef = properties
    ? Annotation.get(properties, AppAnnotation.AppSettingsAnnotation).pipe(Option.getOrUndefined)
    : undefined;
  const [settings] = useObject(settingsRef);
  const decisions = settings ? AppSettings.getPluginDecisions(settings) : {};
  const scoped = Object.values(decisions).some((enabled) => enabled);

  const setEnabled = useCallback(
    (id: string, enabled: boolean) => {
      if (space) {
        void EffectEx.runAndForwardErrors(AppSpace.setSpacePluginEnabled(space, id, enabled));
      }
    },
    [space],
  );

  const reset = useCallback(() => {
    if (space) {
      void EffectEx.runAndForwardErrors(AppSpace.clearSpacePlugins(space));
    }
  }, [space]);

  return { decisions, scoped, setEnabled, reset };
};
