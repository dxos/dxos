//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { VersionLabel } from './VersionLabel';

export default {
  component: VersionLabel,
  actions: { argTypesRegex: '^on.*' },
};

export const Normal = (props: any) => {
  return <VersionLabel version='0.1.56' commitHash='cafebabe' />;
};
