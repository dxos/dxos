//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useSettingsState } from '@dxos/app-framework/ui';
import { type AppCapabilities } from '@dxos/app-toolkit';

import { CrxSettings } from '#containers';
import { type Settings } from '#types';

export type CrxSettingsSurfaceProps = {
  subject: AppCapabilities.Settings;
};

/** Binds the contributed settings atom to the panel; the hook keeps this out of the surface's `props` mapper. */
export const CrxSettingsSurface = ({ subject }: CrxSettingsSurfaceProps) => {
  const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);

  return <CrxSettings settings={settings} onSettingsChange={updateSettings} />;
};
