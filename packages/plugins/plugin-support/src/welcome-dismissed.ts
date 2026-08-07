//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';

import { Annotation, type Entity } from '@dxos/echo';

import { WelcomeDismissedAnnotation } from './annotations';

/**
 * Read the welcome-dismissed flag, preferring the settings space and falling back to the personal
 * space so profiles that dismissed the carousel before the flag moved are not shown it again.
 * Writes always target the settings space, so the fallback stops applying after the first toggle.
 */
export const readWelcomeDismissed = (
  settingsProperties?: Entity.Unknown | Entity.Snapshot,
  personalProperties?: Entity.Unknown | Entity.Snapshot,
): boolean => {
  const fromSettings = settingsProperties
    ? Annotation.get(settingsProperties, WelcomeDismissedAnnotation).pipe(Option.getOrUndefined)
    : undefined;
  if (fromSettings !== undefined) {
    return fromSettings;
  }

  return personalProperties
    ? Annotation.get(personalProperties, WelcomeDismissedAnnotation).pipe(Option.getOrElse(() => false))
    : false;
};
