//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useSettingsState } from '@dxos/app-framework/ui';
import { type AppCapabilities } from '@dxos/app-toolkit';

import { CodeSettings } from '#containers';
import { type Settings } from '#types';

export type CodeSettingsSurfaceProps = {
  subject: AppCapabilities.Settings;
};

/** Binds the contributed settings atom to the panel; the hook keeps this out of the surface's `props` mapper. */
export const CodeSettingsSurface = ({ subject }: CodeSettingsSurfaceProps) => {
  const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);

  return (
    <CodeSettings settings={settings} onSettingsChange={(next: Settings.Settings) => updateSettings(() => next)} />
  );
};
