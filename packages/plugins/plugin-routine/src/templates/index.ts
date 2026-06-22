//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Routine, type RoutineCapabilities } from '#types';

/**
 * Blank template: mints an empty routine with no runnable and no triggers; the action and trigger are
 * configured in the routine article. This is the no-op template (the create dialog's default), so the
 * create flow has a single resolve→scaffold path with no special-casing.
 */
export const blank: RoutineCapabilities.Template = {
  id: 'org.dxos.automation.blank',
  label: 'Blank',
  icon: 'ph--lightning--regular',
  scaffold: ({ name }) => Effect.succeed(Routine.make({ name, triggers: [] })),
};

/** Templates contributed by plugin-routine itself. */
export const defaultTemplates: RoutineCapabilities.Template[] = [blank];
