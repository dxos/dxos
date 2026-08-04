//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useSettingsState } from '@dxos/app-framework/ui';
import { type AppCapabilities } from '@dxos/app-toolkit';

import { DeckSettings } from '#containers';
import { type Settings } from '#types';

export type DeckSettingsSurfaceProps = {
  subject: AppCapabilities.Settings;
};

/** Binds the contributed settings atom to the panel; the hook keeps this out of the surface's `props` mapper. */
export const DeckSettingsSurface = ({ subject }: DeckSettingsSurfaceProps) => {
  const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);

  return <DeckSettings settings={settings} onSettingsChange={updateSettings} />;
};
