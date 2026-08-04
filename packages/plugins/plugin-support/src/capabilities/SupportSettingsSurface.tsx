//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React from 'react';

import { useOperationInvoker, useSettingsState } from '@dxos/app-framework/ui';
import { type AppCapabilities, AppSpace, GraphPath, LayoutOperation } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useClient } from '@dxos/react-client';

import { SupportSettings } from '#containers';
import { type Settings } from '#types';

import { WelcomeDismissedAnnotation } from '../annotations';

export type SupportSettingsSurfaceProps = {
  subject: AppCapabilities.Settings;
};

/**
 * Offers "show welcome again" only once the welcome has been dismissed, which is recorded as an
 * annotation on the personal space's properties rather than in plugin settings.
 */
export const SupportSettingsSurface = ({ subject }: SupportSettingsSurfaceProps) => {
  const client = useClient();
  const { invokePromise } = useOperationInvoker();
  const personal = AppSpace.getPersonalSpace(client);
  const [properties, updateProperties] = useObject(personal?.properties);
  const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
  const welcomeDismissed = properties
    ? Annotation.get(properties, WelcomeDismissedAnnotation).pipe(Option.getOrElse(() => false))
    : false;

  const handleShowWelcome = () => {
    if (!personal) {
      return;
    }

    updateProperties((props) => Annotation.set(props, WelcomeDismissedAnnotation, false));
    const workspace = GraphPath.getSpacePath(personal.id);
    void invokePromise(LayoutOperation.Open, { subject: [GraphPath.getSpaceHomePath(personal.id)], workspace });
  };

  return (
    <SupportSettings
      settings={settings}
      onSettingsChange={updateSettings}
      onShowWelcome={welcomeDismissed ? handleShowWelcome : undefined}
    />
  );
};
