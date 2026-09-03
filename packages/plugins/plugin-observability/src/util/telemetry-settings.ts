//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import type * as Atom from 'effect/unstable/reactivity/Atom';
import type * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type Client } from '@dxos/client';
import { type Space, SpaceState } from '@dxos/client/echo';
import { Annotation, Obj } from '@dxos/echo';
import * as Observability from '@dxos/observability/Observability';

import { ObservabilityAnnotation, type Settings } from '#types';

/** The settings space once its properties are readable; one still opening counts as absent. */
export const readySettingsSpace = (client: Client): Space | undefined => {
  const space = AppSpace.getSettingsSpace(client);
  return space?.state.get() === SpaceState.SPACE_READY ? space : undefined;
};

/** `undefined` until a device has written it. */
export const readTelemetryEnabled = (space: Space): boolean | undefined =>
  Annotation.get(space.properties, ObservabilityAnnotation.Enabled).pipe(Option.getOrUndefined);

export const writeTelemetryEnabled = (space: Space, enabled: boolean): void => {
  Obj.update(space.properties, (properties) => {
    Annotation.set(properties, ObservabilityAnnotation.Enabled, enabled);
  });
};

export type ApplyContext = {
  observability: Observability.Observability;
  /** Where the local mirror of the opt-out lives. */
  namespace: string;
  registry: AtomRegistry.AtomRegistry;
  /** Absent on a host without a settings surface (node, workerd). */
  settingsAtom?: Atom.Writable<Settings.Settings>;
};

/**
 * Applies the opt-in to the running services, the local mirror and the settings atom. Writing the
 * settings space is the caller's decision: the operation writes it, the sync module is reacting
 * to it.
 */
export const applyTelemetryEnabled = Effect.fn(function* (
  { observability, namespace, registry, settingsAtom }: ApplyContext,
  enabled: boolean,
) {
  if (enabled) {
    yield* observability.enable();
  } else {
    yield* observability.disable();
  }
  yield* Effect.promise(() => Observability.storeObservabilityDisabled(namespace, !enabled));
  if (settingsAtom) {
    registry.set(settingsAtom, { ...registry.get(settingsAtom), enabled });
  }
});
