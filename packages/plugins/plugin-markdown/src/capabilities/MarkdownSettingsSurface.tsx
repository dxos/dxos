//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useSettingsState } from '@dxos/app-framework/ui';
import { type AppCapabilities } from '@dxos/app-toolkit';

import { MarkdownSettings } from '#containers';
import { type Markdown } from '#types';

export type MarkdownSettingsSurfaceProps = {
  subject: AppCapabilities.Settings;
};

/** Binds the contributed settings atom to the panel; the hook keeps this out of the surface's `props` mapper. */
export const MarkdownSettingsSurface = ({ subject }: MarkdownSettingsSurfaceProps) => {
  const { settings, updateSettings } = useSettingsState<Markdown.Settings>(subject.atom);

  return <MarkdownSettings settings={settings} onSettingsChange={updateSettings} />;
};
