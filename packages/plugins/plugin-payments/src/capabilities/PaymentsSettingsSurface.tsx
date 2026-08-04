//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useSettingsState } from '@dxos/app-framework/ui';
import { type AppCapabilities } from '@dxos/app-toolkit';

import { PaymentsSettings } from '#containers';
import { type Settings } from '#types';

export type PaymentsSettingsSurfaceProps = {
  subject: AppCapabilities.Settings;
};

/** Binds the contributed settings atom to the panel; the hook keeps this out of the surface's `props` mapper. */
export const PaymentsSettingsSurface = ({ subject }: PaymentsSettingsSurfaceProps) => {
  const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);

  return <PaymentsSettings settings={settings} onSettingsChange={updateSettings} />;
};
