//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { useCallback } from 'react';

import { useSettingsSpaceProperties } from '@dxos/app-toolkit/ui';
import { Annotation } from '@dxos/echo';

import { WelcomeDismissedAnnotation } from '../../annotations.ts';

// Kept out of `SpaceHomeWelcome.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

/**
 * Reactively read the app-wide "welcome dismissed" annotation from the settings space and a setter
 * that persists it. `useObject` subscribes to the properties object, so the Hide button, the
 * Settings "Show welcome page" action, and other devices all re-render live.
 */
export const useWelcomeDismissed = (): [boolean, (value: boolean) => void] => {
  const [properties, updateProperties] = useSettingsSpaceProperties();
  const dismissed = properties
    ? Annotation.get(properties, WelcomeDismissedAnnotation).pipe(Option.getOrElse(() => false))
    : false;
  const setDismissed = useCallback(
    (value: boolean) => updateProperties((current) => Annotation.set(current, WelcomeDismissedAnnotation, value)),
    [updateProperties],
  );

  return [dismissed, setDismissed];
};
