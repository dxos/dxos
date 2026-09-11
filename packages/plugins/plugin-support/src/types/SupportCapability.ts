//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import * as SupportCapabilities from './SupportCapabilities.ts';

/**
 * Module contributing guided tours. Inline because a registration is metadata plus a step loader, so
 * the help companion can list what applies to the object in front of it without activating whichever
 * plugin owns the steps.
 */
export const tour = (
  tours: SupportCapabilities.Tour | ReadonlyArray<SupportCapabilities.Tour>,
  options?: { name?: string; environments?: readonly Capability.Environment[] },
) => {
  const values: ReadonlyArray<SupportCapabilities.Tour> = Array.isArray(tours) ? tours : [tours];
  return Capability.inlineModule(
    options?.name ?? 'tour',
    { provides: [SupportCapabilities.Tour], environments: options?.environments ?? [] },
    () => Effect.succeed([Capability.contributeAll(SupportCapabilities.Tour, values)]),
  );
};

/** Module contributing steps into other plugins' tours. Inline for the same reason as {@link tour}. */
export const tourFragment = (
  fragments: SupportCapabilities.TourFragment | ReadonlyArray<SupportCapabilities.TourFragment>,
  options?: { name?: string; environments?: readonly Capability.Environment[] },
) => {
  const values: ReadonlyArray<SupportCapabilities.TourFragment> = Array.isArray(fragments) ? fragments : [fragments];
  return Capability.inlineModule(
    options?.name ?? 'tour-fragment',
    { provides: [SupportCapabilities.TourFragment], environments: options?.environments ?? [] },
    () => Effect.succeed([Capability.contributeAll(SupportCapabilities.TourFragment, values)]),
  );
};
