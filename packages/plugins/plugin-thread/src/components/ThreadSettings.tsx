//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { ControlPage } from '@dxos/react-ui-form';

import { meta } from '../meta';
import type { ThreadSettingsProps } from '../types';

export type ThreadSettingsComponentProps = {
  settings: ThreadSettingsProps;
  onSettingsChange: (fn: (current: ThreadSettingsProps) => ThreadSettingsProps) => void;
};

export const ThreadSettings = ({ settings: _settings }: ThreadSettingsComponentProps) => {
  const { t: _t } = useTranslation(meta.id);
  return <ControlPage></ControlPage>;
};
