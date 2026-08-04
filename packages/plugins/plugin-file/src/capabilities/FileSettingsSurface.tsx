//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useSettingsState } from '@dxos/app-framework/ui';
import { type AppCapabilities } from '@dxos/app-toolkit';

import { FileSettings } from '#containers';
import { type Settings } from '#types';

export type FileSettingsSurfaceProps = {
  subject: AppCapabilities.Settings;
};

/** Binds the contributed settings atom to the panel; the hook keeps this out of the surface's `props` mapper. */
export const FileSettingsSurface = ({ subject }: FileSettingsSurfaceProps) => {
  const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);

  return <FileSettings settings={settings} onSettingsChange={updateSettings} />;
};
