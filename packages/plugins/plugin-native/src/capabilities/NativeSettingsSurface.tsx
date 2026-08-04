//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useSettingsState } from '@dxos/app-framework/ui';
import { type AppCapabilities } from '@dxos/app-toolkit';

import { NativeSettings } from '#containers';
import { type Settings } from '#types';

export type NativeSettingsSurfaceProps = {
  subject: AppCapabilities.Settings;
};

/** Binds the contributed settings atom to the panel; the hook keeps this out of the surface's `props` mapper. */
export const NativeSettingsSurface = ({ subject }: NativeSettingsSurfaceProps) => {
  const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);

  return <NativeSettings settings={settings} onSettingsChange={updateSettings} />;
};
