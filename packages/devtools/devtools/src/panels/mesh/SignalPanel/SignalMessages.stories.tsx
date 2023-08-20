//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { SignalMessages } from './SignalMessages';

export default {
  component: SignalMessages,
  actions: { argTypesRegex: '^on.*' },
};

export const Normal = (props: any) => {
  return <SignalMessages {...props} />;
};
