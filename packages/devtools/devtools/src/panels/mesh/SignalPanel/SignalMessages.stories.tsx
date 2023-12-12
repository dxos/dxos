//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { SignalMessageTable } from './SignalMessageTable';

export default {
  component: SignalMessageTable,
  decorators: [withTheme],
  actions: { argTypesRegex: '^on.*' },
};

export const Normal = (props: any) => {
  return <SignalMessageTable {...props} />;
};
