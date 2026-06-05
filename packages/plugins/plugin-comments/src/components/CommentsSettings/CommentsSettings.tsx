//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { type Settings } from '#types';

export type CommentsSettingsProps = AppSurface.SettingsArticleProps<Settings.Settings>;

export const CommentsSettings = ({ settings: _settings }: CommentsSettingsProps) => {
  const { t: _t } = useTranslation(meta.id);
  return <SettingsForm.Viewport></SettingsForm.Viewport>;
};
