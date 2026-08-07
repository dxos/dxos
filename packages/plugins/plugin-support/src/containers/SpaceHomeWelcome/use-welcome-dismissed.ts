//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { useCallback, useMemo } from 'react';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { Annotation } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useClient } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';

import { WelcomeDismissedAnnotation } from '../../annotations';

// Kept out of `SpaceHomeWelcome.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

/**
 * Reactively read the app-wide "welcome dismissed" annotation from the settings space and a setter
 * that persists it. `useObject` subscribes to the properties object, so the Hide button, the
 * Settings "Show welcome page" action, and other devices all re-render live.
 */
export const useWelcomeDismissed = (): [boolean, (value: boolean) => void] => {
  const client = useClient();
  // Depend on the space list so the flag resolves once the settings space is created or migrated in.
  const spaces = useSpaces();
  const settingsProperties = useMemo(() => AppSpace.getSettingsSpace(client)?.properties, [client, spaces]);
  const [properties, updateProperties] = useObject(settingsProperties);
  const dismissed = properties
    ? Annotation.get(properties, WelcomeDismissedAnnotation).pipe(Option.getOrElse(() => false))
    : false;
  const setDismissed = useCallback(
    (value: boolean) => updateProperties((current) => Annotation.set(current, WelcomeDismissedAnnotation, value)),
    [updateProperties],
  );

  return [dismissed, setDismissed];
};
