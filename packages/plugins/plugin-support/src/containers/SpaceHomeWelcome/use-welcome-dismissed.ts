//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { memo, useCallback, useMemo } from 'react';

import { HomeSection, usePluginManager } from '@dxos/app-framework/ui';
import { AppSpace } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { type Space } from '@dxos/react-client/echo';
import { Carousel, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { WelcomeDismissedAnnotation } from '../../annotations';

// Kept out of `SpaceHomeWelcome.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

/**
 * Reactively read the per-space "welcome dismissed" annotation (synced via space properties) and a
 * setter that persists it. `useObject` subscribes to the properties object, so the Hide button, the
 * Settings "Show welcome page" action, and other devices all re-render live.
 */
export const useWelcomeDismissed = (space?: Space): [boolean, (value: boolean) => void] => {
  const spaceProperties = useMemo(() => space?.properties, [space]);
  const [properties, updateProperties] = useObject(spaceProperties);
  const dismissed = properties
    ? Annotation.get(properties, WelcomeDismissedAnnotation).pipe(Option.getOrElse(() => false))
    : false;
  const setDismissed = useCallback(
    (value: boolean) => updateProperties((current) => Annotation.set(current, WelcomeDismissedAnnotation, value)),
    [updateProperties],
  );

  return [dismissed, setDismissed];
};
