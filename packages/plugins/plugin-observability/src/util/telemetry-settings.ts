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

export type TelemetrySettings = Partial<Settings.Settings>;

/** The settings space once its properties are readable; one still opening counts as absent. */
export const readySettingsSpace = (client: Client): Space | undefined => {
  const space = AppSpace.getSettingsSpace(client);
  return space?.state.get() === SpaceState.SPACE_READY ? space : undefined;
};

/** A field is `undefined` where no device has written it yet. */
export const readTelemetrySettings = (space: Space): TelemetrySettings => ({
  enabled: Annotation.get(space.properties, ObservabilityAnnotation.Enabled).pipe(Option.getOrUndefined),
  aiContentCapture: Annotation.get(space.properties, ObservabilityAnnotation.AiContentCapture).pipe(
    Option.getOrUndefined,
  ),
});

/** Writes only the fields given, in one change. */
export const writeTelemetrySettings = (space: Space, settings: TelemetrySettings): void => {
  Obj.update(space.properties, (properties) => {
    if (settings.enabled !== undefined) {
      Annotation.set(properties, ObservabilityAnnotation.Enabled, settings.enabled);
    }
    if (settings.aiContentCapture !== undefined) {
      Annotation.set(properties, ObservabilityAnnotation.AiContentCapture, settings.aiContentCapture);
    }
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
 * Applies preferences to the running services, the local mirror and the settings atom. Writing
 * the settings space is the caller's decision: an operation writes it, the sync module is reacting
 * to it.
 */
export const applyTelemetrySettings = Effect.fn(function* (
  { observability, namespace, registry, settingsAtom }: ApplyContext,
  settings: TelemetrySettings,
) {
  if (settings.enabled !== undefined) {
    if (settings.enabled) {
      yield* observability.enable();
    } else {
      yield* observability.disable();
    }
    yield* Effect.promise(() => Observability.storeObservabilityDisabled(namespace, !settings.enabled));
  }
  if (settings.aiContentCapture !== undefined) {
    observability.setAiContentCapture(settings.aiContentCapture);
  }
  if (settingsAtom) {
    const current = registry.get(settingsAtom);
    registry.set(settingsAtom, {
      enabled: settings.enabled ?? current.enabled,
      aiContentCapture: settings.aiContentCapture ?? current.aiContentCapture,
    });
  }
});
