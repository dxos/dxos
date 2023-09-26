//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { SignalMessageTable } from './SignalMessageTable';

export default {
  component: SignalMessageTable,
  actions: { argTypesRegex: '^on.*' },
};

export const Normal = (props: any) => {
  return <SignalMessageTable {...props} />;
};
