//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useOperationInvoker, useSettingsState } from '@dxos/app-framework/ui';
import { type AppCapabilities } from '@dxos/app-toolkit';

import { ObservabilitySettings } from '#containers';
import { ObservabilityOperation, type Settings } from '#types';

export type ObservabilitySettingsSurfaceProps = {
  subject: AppCapabilities.Settings;
};

/**
 * Routes settings edits through {@link ObservabilityOperation.Toggle} rather than writing the atom
 * directly, so enabling/disabling observability takes effect on the running services.
 */
export const ObservabilitySettingsSurface = ({ subject }: ObservabilitySettingsSurfaceProps) => {
  const { settings } = useSettingsState<Settings.Settings>(subject.atom);
  const { invokePromise } = useOperationInvoker();
  const handleSettingsChange = (cb: (current: Settings.Settings) => Settings.Settings) => {
    const next = cb(settings);
    void invokePromise(ObservabilityOperation.Toggle, { state: next.enabled });
  };

  return <ObservabilitySettings settings={settings} onSettingsChange={handleSettingsChange} />;
};
